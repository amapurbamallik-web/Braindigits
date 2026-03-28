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
  const [loading, setLoading] = useState(false); // Fix: start false, not true
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state cleanly whenever modal closes
    if (!open) {
      setLoading(false);
      setError(null);
      return;
    }

    const fetchLeaders = async () => {
      setLoading(true);
      setError(null);

      // Safety timeout — prevents infinite spinner if Supabase hangs
      const timeoutId = setTimeout(() => {
        setLoading(false);
        setError("Request timed out. Check your connection and try again.");
      }, 10000);

      try {
        const orderColumn = tab === "pvp" ? "total_wins" : "ai_wins";
        
        const { data, error: fetchError } = await (supabase as any)
          .from("profiles")
          .select("id, username, total_wins, ai_wins, total_games")
          .order(orderColumn, { ascending: false })
          .limit(50);

        clearTimeout(timeoutId);

        if (fetchError) {
          console.error("Error fetching leaderboard:", fetchError);
          setError("Could not load leaderboard. Please try again.");
        } else {
          setLeaders(data || []);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error(err);
        setError("An unexpected error occurred.");
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
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-game-cyan"></div>
              <p className="text-xs text-muted-foreground animate-pulse">Fetching champions...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-40 gap-4 text-center">
              <p className="text-red-400 text-sm font-medium">{error}</p>
              <button
                onClick={() => {
                  // Re-trigger by toggling tab then back (force re-effect)
                  setLeaders([]);
                  const currentTab = tab;
                  setTab(currentTab === "pvp" ? "ai" : "pvp");
                  setTimeout(() => setTab(currentTab), 50);
                }}
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
