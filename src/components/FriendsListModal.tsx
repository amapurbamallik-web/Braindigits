import { useState, useEffect, useRef } from "react";
import { Users, X, UserPlus, Check, X as Reject, Search, Clock, Loader2, Copy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth, UserProfile } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAudio } from "@/contexts/AudioContext";
import { useQueryClient, useQuery } from "@tanstack/react-query";

interface FriendsListProps {
  open: boolean;
  onClose: () => void;
  roomCode?: string;
}

type FriendshipData = {
  id: string;
  status: "pending" | "accepted";
  friend: { id: string, username: string, total_wins?: number, total_games?: number, ai_wins?: number };
  isIncoming: boolean;
};

export function FriendsListModal({ open, onClose, roomCode }: FriendsListProps) {
  const { user, profile } = useAuth();
  const { playSfx } = useAudio();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{id: string, username: string}[]>([]);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const withTimeout = <T,>(promise: Promise<T>, ms: number = 12000): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Request timed out.")), ms))
    ]);
  };

  const { data: friendships = [], isLoading: loading, error: fetchErrorRaw, refetch } = useQuery({
    queryKey: ["friendships", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: rels, error: relsError } = (await withTimeout((supabase as any)
        .from("friendships")
        .select("*")
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`), 12000)) as any;
        
      if (relsError) throw new Error("Failed to load friends");
      if (!rels || rels.length === 0) return [];

      const friendIds = rels.map((r: any) => r.user_id_1 === user.id ? r.user_id_2 : r.user_id_1);
      
      const { data: profiles, error: profError } = (await withTimeout((supabase as any)
        .from("profiles")
        .select("id, username, total_wins, total_games, ai_wins")
        .in("id", friendIds), 12000)) as any;

      if (profError) throw new Error("Failed to load generic profiles");

      const profileMap = new Map(profiles.map((p: any) => [p.id, p]));

      return rels.map((r: any) => ({
        id: r.id,
        status: r.status,
        friend: profileMap.get(r.user_id_1 === user.id ? r.user_id_2 : r.user_id_1),
        isIncoming: r.user_id_2 === user.id && r.status === "pending"
      })).filter((f: any) => f.friend) as FriendshipData[];
    },
    enabled: open && !!user,
    staleTime: 30000,
    retry: false, // Stop React Query from silently retrying timeouts
  });

  const fetchError = fetchErrorRaw ? fetchErrorRaw.message : null;

  useEffect(() => {
    // Clean up search on close
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
      setExpandedId(null);
    }
  }, [open]);

  // Handle Debounced Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("profiles")
          .select("id, username")
          .ilike("username", `${searchQuery.trim()}%`)
          .neq("id", user?.id)
          .limit(5);
        
        if (error) throw error;
        setSearchResults(data || []);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, user]);

  const handleSendRequest = async (targetId: string, targetUsername: string) => {
    if (!user) return;

    // Optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const newRequest: FriendshipData = {
      id: tempId,
      status: "pending",
      friend: { id: targetId, username: targetUsername },
      isIncoming: false
    };

    queryClient.setQueryData(["friendships", user.id], (prev: FriendshipData[] = []) => [newRequest, ...prev]);
    setSearchQuery(""); // Clear search to show the lists

    try {
      // Very Important: Check if a relationship ALREADY exists in EITHER direction before sending!
      // This protects against duplicate or crossed wires without relying on strict DB check constraints.
      const { data: existing, error: checkError } = await (supabase as any)
        .from("friendships")
        .select("id, status")
        .or(`and(user_id_1.eq.${user.id},user_id_2.eq.${targetId}),and(user_id_1.eq.${targetId},user_id_2.eq.${user.id})`);

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
         toast.error("You are already friends or have a pending request overlapping!");
         // Revert optimistic update
         queryClient.setQueryData(["friendships", user.id], (prev: FriendshipData[] = []) => prev.filter(f => f.id !== tempId));
         queryClient.invalidateQueries({ queryKey: ["friendships", user.id] });
         return;
      }

      const { error } = await (supabase as any)
        .from("friendships")
        .insert({
          user_id_1: user.id,
          user_id_2: targetId,
          status: "pending"
        });

      if (error) {
        throw error;
      } else {
        toast.success(`Friend request sent to ${targetUsername}!`);
      }
      
      // Quietly resync to get the real DB ID
      queryClient.invalidateQueries({ queryKey: ["friendships", user.id] });
      queryClient.invalidateQueries({ queryKey: ["pending-friend-requests"] });
    } catch (err: any) {
      // Revert optimistic update on hard error
      queryClient.setQueryData(["friendships", user.id], (prev: FriendshipData[] = []) => prev.filter(f => f.id !== tempId));
      toast.error(err.message || "Failed to send request.");
    }
  };

  const respondToRequest = async (id: string, action: "accept" | "reject" | "cancel") => {
    playSfx('click');
    if (!user) return;
    
    // Optimistic update
    const previous = queryClient.getQueryData<FriendshipData[]>(["friendships", user.id]) || [];
    
    if (action === "accept") {
      queryClient.setQueryData(["friendships", user.id], (prev: FriendshipData[] = []) => prev.map(f => f.id === id ? { ...f, status: "accepted" } : f));
    } else {
      queryClient.setQueryData(["friendships", user.id], (prev: FriendshipData[] = []) => prev.filter(f => f.id !== id));
    }

    try {
      if (action === "accept") {
        await (supabase as any).from("friendships").update({ status: "accepted" }).eq("id", id);
        toast.success("Friend request accepted!");
      } else {
        await (supabase as any).from("friendships").delete().eq("id", id);
        if (action === "cancel") toast.success("Request canceled.");
      }
      queryClient.invalidateQueries({ queryKey: ["pending-friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["friendships", user.id] });
    } catch (err) {
      // Revert
      queryClient.setQueryData(["friendships", user.id], previous);
      toast.error("Failed to process request.");
    }
  };

  const handleInvite = async (friendId: string) => {
    if (!user || !profile || !roomCode) return;
    
    // Broadcast via supabase channel
    const channel = supabase.channel(`player-invites:${friendId}`);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'match_invite',
          payload: { roomCode, senderName: profile.username, senderId: user.id }
        });
        toast.success(`Live in-game invite sent!`);
        setTimeout(() => supabase.removeChannel(channel), 1000);
      }
    });

    // Fallback clipboard copy
    navigator.clipboard.writeText(`Join my BrainDigits match! Code: ${roomCode}`);
    toast("Room code copied to clipboard.", {
      description: "If they are offline, you can paste this link to them."
    });
  };

  if (!open) return null;

  const friends = friendships.filter(f => f.status === "accepted");
  const incomingReqs = friendships.filter(f => f.status === "pending" && f.isIncoming);
  const outgoingReqs = friendships.filter(f => f.status === "pending" && !f.isIncoming);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl fade-in duration-300">
      <div className="w-full max-w-md bg-game-dark/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-[0_0_80px_rgba(0,229,255,0.15)] animate-in zoom-in-95 duration-300 focus:outline-none max-h-[90vh] flex flex-col relative overflow-hidden">
        
        {/* Dynamic ambient background glows */}
        <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-game-cyan/20 rounded-full blur-[80px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-10%] left-[-20%] w-48 h-48 bg-game-purple/10 rounded-full blur-[60px] pointer-events-none" />

        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-game-cyan/10 border border-game-cyan/20 flex items-center justify-center shadow-[inset_0_0_15px_rgba(0,229,255,0.2)]">
              <Users className="w-5 h-5 text-game-cyan shadow-game-cyan drop-shadow-md" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Social Network</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white active:scale-95 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative z-20 mb-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-game-cyan transition-colors" />
            <Input
              placeholder="Search challengers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-black/50 border-white/10 pl-12 h-14 text-white placeholder:text-muted-foreground/50 rounded-2xl focus-visible:ring-2 focus-visible:ring-game-cyan focus-visible:border-transparent transition-all shadow-inner"
            />
            {searching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 className="h-5 w-5 animate-spin text-game-cyan" />
              </div>
            )}
          </div>
          
          {/* Floating Search Results */}
          {searchQuery && (
             <div className="mt-3 bg-[#0a0a0f] border border-white/10 rounded-2xl p-2 max-h-56 overflow-y-auto w-full absolute z-40 shadow-[0_20px_50px_rgba(0,0,0,0.8)] custom-scrollbar animate-in slide-in-from-top-2">
               {searching ? (
                 <p className="text-xs text-muted-foreground text-center py-4 font-medium uppercase tracking-widest">Scanning network...</p>
               ) : searchResults.length === 0 ? (
                 <p className="text-xs text-muted-foreground text-center py-4 font-medium uppercase tracking-widest">No signals found.</p>
               ) : (
                 <div className="space-y-1">
                   {searchResults.map(res => {
                     const existing = friendships.find(f => f.friend.id === res.id);
                     return (
                       <div key={res.id} className="flex items-center justify-between p-3 hover:bg-white/10 rounded-xl transition-all group">
                         <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0 mr-3">
                           <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                             <span className="text-[10px] font-bold text-white/70 uppercase">{res.username.substring(0,2)}</span>
                           </div>
                           <span className="text-sm font-bold text-white truncate">{res.username}</span>
                         </div>
                         
                         <div className="shrink-0 flex items-center">
                           {existing ? (
                             <span className={`text-[10px] uppercase tracking-widest font-black px-2 py-1 rounded-md ${existing.status === 'accepted' ? 'bg-game-cyan/10 text-game-cyan border border-game-cyan/20' : 'bg-game-amber/10 text-game-amber border border-game-amber/20'}`}>
                               {existing.status === "accepted" ? "Friends" : "Pending"}
                             </span>
                           ) : (
                            <button 
                               onClick={() => {
                                 playSfx('click');
                                 handleSendRequest(res.id, res.username);
                               }}
                               className="text-xs bg-white text-black px-4 py-1.5 rounded-lg font-bold hover:bg-gray-200 active:scale-95 transition-transform flex items-center gap-1 shadow-md"
                             >
                               <UserPlus className="w-3 h-3" /> Add
                             </button>
                           )}
                         </div>
                       </div>
                     )
                   })}
                 </div>
               )}
             </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-8 pr-2 relative z-10 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-game-cyan drop-shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-game-cyan/60 animate-pulse">Syncing Network...</p>
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center bg-red-500/5 rounded-2xl border border-red-500/10 p-6">
              <p className="text-red-400 text-sm font-medium">{fetchError}</p>
              <button
                onClick={() => refetch()}
                className="px-5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 text-xs font-black uppercase tracking-widest transition-all active:scale-95"
              >
                Reconnect
              </button>
            </div>
          ) : (
            <>
              {incomingReqs.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Clock className="w-4 h-4 text-game-amber drop-shadow-[0_0_5px_rgba(251,191,36,0.8)]" />
                    <p className="text-xs font-black text-white uppercase tracking-widest">Incoming Requests</p>
                  </div>
                  <div className="space-y-2">
                    {incomingReqs.map(req => (
                      <div key={req.id} className="flex items-center justify-between bg-gradient-to-r from-game-amber/10 to-transparent p-3 sm:p-4 rounded-2xl border border-game-amber/20 group">
                        <div className="flex flex-col min-w-0 flex-1 mr-3">
                           <span className="text-white text-sm font-bold truncate">{req.friend.username}</span>
                           <span className="text-[10px] text-game-amber/80 font-medium">wants to connect</span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => respondToRequest(req.id, "accept")} className="p-2 sm:p-2.5 bg-game-success/20 text-game-success rounded-xl border border-game-success/30 hover:bg-game-success hover:text-white active:scale-95 transition-all shadow-[0_0_15px_rgba(34,197,94,0)] hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => respondToRequest(req.id, "reject")} className="p-2 sm:p-2.5 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white active:scale-95 transition-all shadow-[0_0_15px_rgba(239,68,68,0)] hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                            <Reject className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {friends.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Active Connections</p>
                    <span className="text-[10px] font-bold text-muted-foreground/50 bg-white/5 px-2 py-0.5 rounded-full">{friends.length}</span>
                  </div>
                  <div className="space-y-3">
                    {friends.map(friend => (
                      <div key={friend.id} className="flex flex-col bg-black/40 rounded-[1.5rem] border border-white/5 group overflow-hidden transition-all hover:bg-black/60 hover:border-white/10">
                        
                        <div 
                          className="flex items-center justify-between p-3 sm:p-4 cursor-pointer"
                          onClick={() => {
                            if (expandedId !== friend.id) playSfx('expand');
                            setExpandedId(expandedId === friend.id ? null : friend.id);
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-game-cyan/20 to-game-purple/20 border border-white/10 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300">
                              <span className="text-xs font-black text-white/90 drop-shadow-md">
                                {friend.friend.username.substring(0,2).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-white text-base font-bold truncate">{friend.friend.username}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            {roomCode && (
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  playSfx('click');
                                  handleInvite(friend.friend.id); 
                                }} 
                                className="px-4 py-2 bg-game-cyan hover:bg-white text-game-dark text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:shadow-[0_0_20px_rgba(255,255,255,0.5)]"
                                title="Send Match Invite"
                              >
                                Invite
                              </button>
                            )}
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                playSfx('click');
                                respondToRequest(friend.id, "reject"); 
                              }} 
                              className="p-2 opacity-0 group-hover:opacity-100 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all active:scale-95"
                              title="Remove Connection"
                            >
                              <Reject className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Premium Expanded Stats Panel */}
                        <div className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${expandedId === friend.id ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                          <div className="mx-4 mb-4 mt-1 bg-white/5 rounded-2xl border border-white/5 p-3 flex justify-evenly items-center shadow-inner relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-game-cyan/5 via-transparent to-game-purple/5 opacity-50 pointer-events-none" />
                            
                            <div className="flex flex-col items-center relative z-10 w-1/3">
                              <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Matches</span>
                              <span className="text-white font-black text-lg">{friend.friend.total_games || 0}</span>
                            </div>
                            <div className="w-px h-8 bg-white/10 relative z-10" />
                            <div className="flex flex-col items-center relative z-10 w-1/3">
                              <span className="text-[9px] text-game-cyan uppercase font-black tracking-widest drop-shadow-md">Accuracy</span>
                              <span className="text-game-cyan font-black text-lg drop-shadow-[0_0_5px_rgba(0,229,255,0.6)]">
                                {friend.friend.total_games && friend.friend.total_games > 0 
                                  ? `${Math.round(((friend.friend.total_wins || 0) / friend.friend.total_games) * 100)}%`
                                  : '0%'}
                              </span>
                            </div>
                            <div className="w-px h-8 bg-white/10 relative z-10" />
                            <div className="flex flex-col items-center relative z-10 w-1/3">
                              <span className="text-[9px] text-game-purple uppercase font-black tracking-widest drop-shadow-md">AI Defeated</span>
                              <span className="text-white font-black text-lg">{friend.friend.ai_wins || 0}</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              )}

               {outgoingReqs.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2 px-1">Awaiting Response</p>
                  <div className="space-y-2">
                    {outgoingReqs.map(req => (
                      <div key={req.id} className="flex items-center justify-between px-4 py-3 bg-white/5 border border-white/5 rounded-2xl animate-in fade-in group">
                        <span className="text-muted-foreground text-sm font-semibold truncate flex-1 min-w-0 mr-3">{req.friend.username}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] uppercase font-bold text-game-cyan/50 tracking-widest">Pending</span>
                          <button onClick={() => respondToRequest(req.id, "cancel")} className="p-1.5 bg-black/40 text-muted-foreground hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors active:scale-95" title="Revoke Request">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {friends.length === 0 && incomingReqs.length === 0 && outgoingReqs.length === 0 && !searchQuery && (
                <div className="flex flex-col items-center justify-center py-16 opacity-60 animate-in zoom-in-95 duration-700">
                  <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 inner-shadow">
                    <UserPlus className="h-8 w-8 text-muted-foreground drop-shadow-md" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-1 tracking-tight">Expand Your Network</h3>
                  <p className="text-xs text-center text-muted-foreground font-medium max-w-[220px]">
                    Use the search bar above to find rivals and recruit allies.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
