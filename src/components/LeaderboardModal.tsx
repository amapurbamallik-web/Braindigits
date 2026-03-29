import { useState } from "react";
import { X, Trophy, Bot, Swords, UserPlus, Check, Clock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { UserProfile, useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface LeaderboardModalProps {
  open: boolean;
  onClose: () => void;
}

export function LeaderboardModal({ open, onClose }: LeaderboardModalProps) {
  const [tab, setTab] = useState<"pvp" | "ai">("pvp");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Lightweight friendships fetch to check statuses
  const { data: friendships = [] } = useQuery({
    queryKey: ["friendships", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("friendships")
        .select("id, user_id_1, user_id_2, status")
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);
      return data || [];
    },
    enabled: open && !!user,
  });

  const getFriendStatus = (playerId: string) => {
    if (!user || user.id === playerId) return "self";
    const existing = friendships.find(f => f.user_id_1 === playerId || f.user_id_2 === playerId);
    if (!existing) return "none";
    if (existing.status === "accepted") return "friends";
    return "pending";
  };

  const handleSendRequest = async (friendId: string, friendName: string) => {
    if (!user) return;
    const previous = queryClient.getQueryData(["friendships", user.id]);
    try {
      queryClient.setQueryData(["friendships", user.id], (old: any) => [
        ...(old || []),
        { id: `temp-${Date.now()}`, user_id_1: user.id, user_id_2: friendId, status: "pending" }
      ]);
      toast.success(`Friend request sent to ${friendName}`);

      const { error: insertError } = await (supabase as any)
        .from("friendships")
        .insert({ user_id_1: user.id, user_id_2: friendId, status: "pending" });

      if (insertError) {
        if (insertError.code === '23505') {
          toast.error(`Already friends or request pending with ${friendName}`);
        } else {
          throw insertError;
        }
      }
      queryClient.invalidateQueries({ queryKey: ["pending-friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["friendships", user.id] });
    } catch (err) {
      queryClient.setQueryData(["friendships", user.id], previous);
      toast.error("Failed to process request.");
    }
  };



  const { data: leaders = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ["leaderboard", tab],
    queryFn: async () => {
      const orderColumn = tab === "pvp" ? "total_wins" : "ai_wins";
      
      const { data, error: fetchError } = await (supabase as any)
        .from("profiles")
        .select("id, username, total_wins, ai_wins, total_games")
        .gt(orderColumn, 0)
        .order(orderColumn, { ascending: false })
        .limit(50);

      if (fetchError) throw new Error("Could not load leaderboard. Please try again.");
      return (data || []) as UserProfile[];
    },
    enabled: true,              // Always load — data is public, no auth needed
    staleTime: 120000,          // Cache for 2 minutes
    gcTime: 600000,             // Keep in cache 10 minutes so modal opens instantly
    retry: 2,
    retryDelay: 1000,
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md fade-in duration-200">
      <div className="w-full max-w-lg bg-card rounded-3xl p-6 shadow-2xl border border-border/20 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-game-amber" /> Hall of Fame
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-muted-foreground active:scale-95 transition-all"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-black/30 rounded-full p-1 mb-6 border border-white/5">
          <button
            onClick={() => setTab("pvp")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === "pvp" 
                ? "bg-game-cyan/20 text-game-cyan shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            <Swords className="w-4 h-4" /> PvP Masters
          </button>
          <button
            onClick={() => setTab("ai")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === "ai" 
                ? "bg-game-purple/20 text-game-purple shadow-[0_0_15px_rgba(171,71,188,0.2)]"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            <Bot className="w-4 h-4" /> AI Slayers
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-game-cyan"></div>
              <p className="text-xs text-muted-foreground animate-pulse">Fetching champions...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-40 gap-4 text-center">
              <p className="text-red-400 text-sm font-medium">{error instanceof Error ? error.message : "Failed to load"}</p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 rounded-xl bg-game-cyan/10 hover:bg-game-cyan/20 border border-game-cyan/30 text-game-cyan text-sm font-bold transition-all active:scale-95"
              >
                Retry
              </button>
            </div>
          ) : leaders.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              No champions yet. Be the first!
            </div>
          ) : (
            leaders.map((player, idx) => (
              <div 
                key={player.id} 
                className="flex items-center justify-between p-3 rounded-2xl bg-black/20 border border-white/5 hover:border-white/10 transition-colors group"
                style={{ animation: `fade-in-up 0.3s ease-out ${idx * 0.05}s both` }}
              >
                <div className="flex items-center gap-4">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                    ${idx === 0 ? "bg-amber-400 text-amber-900 shadow-[0_0_15px_rgba(251,191,36,0.5)]" : 
                      idx === 1 ? "bg-slate-300 text-slate-800" : 
                      idx === 2 ? "bg-amber-700 text-amber-100" : 
                      "bg-white/10 text-muted-foreground"}
                  `}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-white font-semibold group-hover:text-game-cyan transition-colors">{player.username}</p>
                    <p className="text-xs text-muted-foreground">{player.total_games} Matches</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-right shrink-0">
                  <div className="flex flex-col items-end">
                    <p className={`text-xl font-bold ${tab === "pvp" ? "text-game-cyan" : "text-game-purple"}`}>
                      {tab === "pvp" ? player.total_wins : player.ai_wins}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Wins</p>
                  </div>
                  
                  {user && user.id !== player.id && (
                    <div className="w-12 flex justify-end pr-1 border-l border-white/5 pl-3 ml-1">
                      {getFriendStatus(player.id) === "friends" ? (
                         <div className="w-7 h-7 rounded bg-game-cyan/10 flex items-center justify-center border border-game-cyan/30" title="Connected">
                           <Check className="w-4 h-4 text-game-cyan" />
                         </div>
                      ) : getFriendStatus(player.id) === "pending" ? (
                         <div className="w-7 h-7 rounded bg-game-amber/10 flex items-center justify-center border border-game-amber/30" title="Pending">
                           <Clock className="w-4 h-4 text-game-amber" />
                         </div>
                      ) : (
                         <button onClick={() => handleSendRequest(player.id, player.username)} className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white text-white hover:text-black rounded-lg transition-all active:scale-95 border border-white/10 shadow-md" title="Add Friend">
                           <UserPlus className="w-4 h-4" />
                         </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
