import { useState, useEffect } from "react";
import { X, Trophy, Bot, Swords } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { UserProfile } from "@/contexts/AuthContext";

interface LeaderboardModalProps {
  open: boolean;
  onClose: () => void;
}

export function LeaderboardModal({ open, onClose }: LeaderboardModalProps) {
  const [tab, setTab] = useState<"pvp" | "ai">("pvp");
  const [leaders, setLeaders] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;

    const fetchLeaders = async () => {
      setLoading(true);
      try {
        const orderColumn = tab === "pvp" ? "total_wins" : "ai_wins";
        
        // Use any cast to avoid type errors since 'profiles' isn't explicitly typed yet
        const { data, error } = await (supabase as any)
          .from("profiles")
          .select("id, username, total_wins, ai_wins, total_games")
          .order(orderColumn, { ascending: false })
          .limit(50);

        if (error) {
          console.error("Error fetching leaderboard:", error);
        } else {
          setLeaders(data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaders();
  }, [open, tab]);

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
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-game-cyan"></div>
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
                <div className="text-right">
                  <p className={`text-xl font-bold ${tab === "pvp" ? "text-game-cyan" : "text-game-purple"}`}>
                    {tab === "pvp" ? player.total_wins : player.ai_wins}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Wins</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
