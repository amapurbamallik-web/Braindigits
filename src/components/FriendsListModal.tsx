import { useState, useEffect, useRef } from "react";
import { Users, X, UserPlus, Check, X as Reject, Search, Clock, Loader2, Copy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth, UserProfile } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAudio } from "@/contexts/AudioContext";
import { useQueryClient } from "@tanstack/react-query";

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
  const [friendships, setFriendships] = useState<FriendshipData[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{id: string, username: string}[]>([]);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const fetchFriends = async () => {
    if (!user) return;
    setLoading(true);
    setFetchError(null);

    const timeoutId = setTimeout(() => {
      setLoading(false);
      setFetchError("Request timed out. Check your connection.");
    }, 10000);

    try {
      const { data: rels, error: relsError } = await (supabase as any)
        .from("friendships")
        .select("*")
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

      clearTimeout(timeoutId);
      if (relsError) throw relsError;

      if (!rels || rels.length === 0) {
        setFriendships([]);
        return;
      }

      const friendIds = rels.map((r: any) => r.user_id_1 === user.id ? r.user_id_2 : r.user_id_1);
      
      const { data: profiles, error: profError } = await (supabase as any)
        .from("profiles")
        .select("id, username, total_wins, total_games, ai_wins")
        .in("id", friendIds);

      if (profError) throw profError;

      const profileMap = new Map(profiles.map((p: any) => [p.id, p]));

      const merged: FriendshipData[] = rels.map((r: any) => ({
        id: r.id,
        status: r.status,
        friend: profileMap.get(r.user_id_1 === user.id ? r.user_id_2 : r.user_id_1),
        isIncoming: r.user_id_2 === user.id && r.status === "pending"
      })).filter((f: any) => f.friend);

      setFriendships(merged);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("Error fetching friends:", err);
      setFetchError("Failed to load friends. Tap to retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && user) {
      fetchFriends();
    } else {
      setLoading(false);
      setFetchError(null);
      setSearchQuery("");
      setSearchResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

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

    setFriendships(prev => [newRequest, ...prev]);
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
         setFriendships(prev => prev.filter(f => f.id !== tempId));
         fetchFriends();
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
      fetchFriends();
      queryClient.invalidateQueries({ queryKey: ["pending-friend-requests"] });
    } catch (err: any) {
      // Revert optimistic update on hard error
      setFriendships(prev => prev.filter(f => f.id !== tempId));
      toast.error(err.message || "Failed to send request.");
    }
  };

  const respondToRequest = async (id: string, action: "accept" | "reject" | "cancel") => {
    playSfx('click');
    // Optimistic update
    const previous = [...friendships];
    if (action === "accept") {
      setFriendships(prev => prev.map(f => f.id === id ? { ...f, status: "accepted" } : f));
    } else {
      setFriendships(prev => prev.filter(f => f.id !== id));
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
    } catch (err) {
      // Revert
      setFriendships(previous);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md fade-in duration-200">
      <div className="w-full max-w-md bg-game-dark border border-white/10 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 focus:outline-none max-h-[85vh] flex flex-col relative overflow-hidden">
        
        {/* Subtle glow */}
        <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-game-cyan/10 rounded-full blur-[50px] pointer-events-none" />

        <div className="flex items-center justify-between mb-6 relative z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-game-cyan" /> Friends List
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-muted-foreground active:scale-95 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative z-10 mb-6">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-game-cyan transition-colors" />
            <Input
              placeholder="Search by username..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-black/40 border-white/10 pl-10 h-11 text-white placeholder:text-muted-foreground/50 rounded-xl focus-visible:ring-1 focus-visible:ring-game-cyan transition-all"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-game-cyan" />
              </div>
            )}
          </div>
          
          {/* Search Dropdown or Results inline */}
          {searchQuery && (
             <div className="mt-2 bg-black/60 border border-white/10 rounded-xl p-2 max-h-48 overflow-y-auto w-full absolute z-20 backdrop-blur-xl shadow-xl">
               {searching ? (
                 <p className="text-xs text-muted-foreground text-center py-2">Searching...</p>
               ) : searchResults.length === 0 ? (
                 <p className="text-xs text-muted-foreground text-center py-2">No players found.</p>
               ) : (
                 <div className="space-y-1">
                   {searchResults.map(res => {
                     // Check if already friends or pending
                     const existing = friendships.find(f => f.friend.id === res.id);
                     return (
                       <div key={res.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors">
                         <span className="text-sm font-medium text-white">{res.username}</span>
                         {existing ? (
                           <span className="text-xs text-muted-foreground px-2">
                             {existing.status === "accepted" ? "Friends" : "Pending"}
                           </span>
                         ) : (
                          <button 
                             onClick={() => {
                               playSfx('click');
                               handleSendRequest(res.id, res.username);
                             }}
                             className="text-xs bg-game-cyan text-game-dark px-3 py-1.5 rounded-md font-bold hover:bg-game-cyan/80 active:scale-95 transition-transform"
                           >
                             Add
                           </button>
                         )}
                       </div>
                     )
                   })}
                 </div>
               )}
             </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1 relative z-10 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-10 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-game-cyan" />
              <p className="text-xs text-muted-foreground animate-pulse">Loading friends...</p>
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <p className="text-red-400 text-sm font-medium">{fetchError}</p>
              <button
                onClick={fetchFriends}
                className="px-4 py-2 rounded-xl bg-game-cyan/10 hover:bg-game-cyan/20 border border-game-cyan/30 text-game-cyan text-sm font-bold transition-all active:scale-95"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {incomingReqs.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-game-amber uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Incoming Requests
                  </p>
                  <div className="space-y-2">
                    {incomingReqs.map(req => (
                      <div key={req.id} className="flex items-center justify-between bg-game-amber/5 p-3 rounded-xl border border-game-amber/10 animate-in fade-in zoom-in-95">
                        <span className="text-white text-sm font-medium">{req.friend.username}</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => respondToRequest(req.id, "accept")} className="p-1.5 bg-game-success/20 text-game-success rounded-lg hover:bg-game-success hover:text-white active:scale-95 transition-all">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => respondToRequest(req.id, "reject")} className="p-1.5 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500 hover:text-white active:scale-95 transition-all">
                            <Reject className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {friends.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Your Friends</p>
                  <div className="space-y-2">
                    {friends.map(friend => (
                      <div key={friend.id} className="flex flex-col bg-black/30 rounded-xl border border-white/5 animate-in fade-in zoom-in-95 group overflow-hidden">
                        
                        <div 
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-colors"
                          onClick={() => {
                            if (expandedId !== friend.id) playSfx('expand');
                            setExpandedId(expandedId === friend.id ? null : friend.id);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-game-cyan/10 text-game-cyan border border-game-cyan/20 flex items-center justify-center text-xs font-bold uppercase transition-transform group-hover:scale-110 group-active:scale-95 text-shadow-sm shadow-inner group-hover:shadow-[0_0_10px_rgba(0,229,255,0.4)]">
                              {friend.friend.username.substring(0,2)}
                            </div>
                            <span className="text-white text-sm font-medium">{friend.friend.username}</span>
                          </div>
                          <div className="flex gap-1">
                            {roomCode && (
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  playSfx('click');
                                  handleInvite(friend.friend.id); 
                                }} 
                                className="px-3 py-1.5 bg-game-cyan/10 text-game-cyan text-xs font-bold rounded-lg hover:bg-game-cyan hover:text-game-dark transition-colors border border-game-cyan/20 active:scale-95"
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
                              className="p-1.5 opacity-0 group-hover:opacity-100 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all active:scale-95"
                              title="Remove Friend"
                            >
                              <Reject className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Stats View */}
                        <div className={`transition-all duration-300 ease-in-out ${expandedId === friend.id ? 'max-h-32 opacity-100 border-t border-white/5' : 'max-h-0 opacity-0 border-transparent'} overflow-hidden bg-black/40`}>
                          <div className="flex justify-around items-center p-3 text-center">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Total Games</span>
                              <span className="text-white font-extrabold text-sm">{friend.friend.total_games || 0}</span>
                            </div>
                            <div className="w-px h-6 bg-white/10" />
                            <div className="flex flex-col">
                              <span className="text-[10px] text-game-cyan uppercase font-bold tracking-widest">Win Rate</span>
                              <span className="text-game-cyan font-extrabold text-sm text-shadow-sm drop-shadow-[0_0_3px_rgba(0,229,255,0.5)]">
                                {friend.friend.total_games && friend.friend.total_games > 0 
                                  ? `${Math.round(((friend.friend.total_wins || 0) / friend.friend.total_games) * 100)}%`
                                  : '0%'}
                              </span>
                            </div>
                            <div className="w-px h-6 bg-white/10" />
                            <div className="flex flex-col">
                              <span className="text-[10px] text-game-purple uppercase font-bold tracking-widest">Bot Wins</span>
                              <span className="text-white font-extrabold text-sm">{friend.friend.ai_wins || 0}</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              )}

               {outgoingReqs.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-2 px-1">Sent Requests</p>
                  <div className="space-y-2">
                    {outgoingReqs.map(req => (
                      <div key={req.id} className="flex items-center justify-between px-3 py-2 animate-in fade-in">
                        <span className="text-muted-foreground text-sm font-medium">{req.friend.username}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-game-cyan/50 tracking-wider">Pending</span>
                          <button onClick={() => respondToRequest(req.id, "cancel")} className="p-1.5 text-muted-foreground/50 hover:text-red-400 rounded-lg transition-colors active:scale-95" title="Cancel Request">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {friends.length === 0 && incomingReqs.length === 0 && outgoingReqs.length === 0 && !searchQuery && (
                <div className="flex flex-col items-center justify-center py-10 opacity-50">
                  <UserPlus className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-center text-muted-foreground max-w-[200px]">
                    Search for usernames above to add friends to your network.
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
