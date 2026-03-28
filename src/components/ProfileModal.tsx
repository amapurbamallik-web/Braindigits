import { UserProfile } from "@/contexts/AuthContext";
import { X, Trophy, Swords, Zap, LogOut, Star, Award, Shield } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onLogout?: () => void;
}

const RANKS = [
  { max: 5, name: "Rookie", color: "text-sky-300", bg: "bg-sky-400/10", border: "border-sky-400/30", icon: Star },
  { max: 20, name: "Challenger", color: "text-game-cyan", bg: "bg-game-cyan/10", border: "border-game-cyan/30", icon: Swords },
  { max: 50, name: "Pro", color: "text-game-purple", bg: "bg-game-purple/10", border: "border-game-purple/30", icon: Zap },
  { max: 100, name: "Master", color: "text-game-amber", bg: "bg-game-amber/10", border: "border-game-amber/30", icon: Trophy },
  { max: Infinity, name: "Legend", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/40", icon: Shield },
];

function getRankInfo(games: number) {
  return RANKS.find(r => games <= r.max) || RANKS[0];
}

export function ProfileModal({ open, onClose, profile, onLogout }: ProfileModalProps) {
  if (!open) return null;

  const totalGames = profile?.total_games || 0;
  const winRate = profile && totalGames > 0 
    ? Math.round(((profile.total_wins + profile.ai_wins) / totalGames) * 100) 
    : 0;

  const username = profile?.username || "Unknown Gamer";
  const rank = getRankInfo(totalGames);
  const RankIcon = rank.icon;

  // Calculate progress to next rank
  const currentRankIndex = RANKS.findIndex(r => r.name === rank.name);
  const nextRank = RANKS[currentRankIndex + 1] || rank;
  const previousMax = currentRankIndex > 0 ? RANKS[currentRankIndex - 1].max : 0;
  
  const progressToNext = nextRank.name === rank.name 
    ? 100 
    : Math.min(100, Math.max(0, ((totalGames - previousMax) / (nextRank.max - previousMax)) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md fade-in duration-300">
      <div className="w-full max-w-sm bg-[#0a0a0f] rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 animate-in zoom-in-95 duration-300 relative overflow-hidden flex flex-col">
        
        {/* Banner Graphic Header */}
        <div className={`h-24 w-full bg-gradient-to-br ${rank.bg} to-transparent border-b ${rank.border} relative flex items-center justify-center`}>
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/40 text-white/70 hover:text-white backdrop-blur-md active:scale-95 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="absolute -bottom-10 z-10 w-full flex justify-center">
            <div className={`w-20 h-20 rounded-full bg-[#0a0a0f] border-4 ${rank.border} shadow-[0_0_25px_var(--tw-shadow-color)] drop-shadow-2xl flex items-center justify-center`} style={{ '--tw-shadow-color': 'rgba(255,255,255,0.1)' } as React.CSSProperties}>
              <span className={`text-2xl font-black font-mono tracking-tighter ${rank.color}`}>
                {username.substring(0, 2).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Details Body */}
        <div className="pt-12 px-6 pb-5 text-center z-10">
          <h2 className="text-xl font-extrabold text-white mb-1 tracking-tight">{username}</h2>
          
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${rank.border} ${rank.bg} ${rank.color} text-[10px] font-black uppercase tracking-widest mb-5 shadow-lg`}>
            <RankIcon className="w-3.5 h-3.5" />
            {rank.name} Tier
          </div>

          {!profile && (
            <div className="mb-4 text-center bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl font-medium">
              Profile stats unavailable. Check network or setup.
            </div>
          )}

          {/* Rank Progress Bar */}
          <div className="mb-5 bg-white/5 border border-white/5 rounded-2xl p-3.5">
            <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
              <span>{rank.name}</span>
              <span className={nextRank.color}>{nextRank.name === rank.name ? 'MAX' : nextRank.name}</span>
            </div>
            <Progress value={progressToNext} className="h-2 bg-black/40" />
            <div className="mt-2 text-[10px] text-muted-foreground/70 font-medium">
              {nextRank.name === rank.name ? 'Maximum tier reached' : `${totalGames} / ${nextRank.max} matches played`}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <div className="bg-white/5 p-3.5 rounded-3xl border border-white/5 flex flex-col items-center justify-center hover:bg-white/10 hover:-translate-y-1 hover:shadow-xl transition-all cursor-default relative overflow-hidden">
              <div className="absolute inset-0 bg-game-amber/5 opacity-0 hover:opacity-100 transition-opacity" />
              <Trophy className="h-6 w-6 text-game-amber mb-1.5 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] z-10" />
              <p className="text-2xl font-black text-white z-10">{profile?.total_wins || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5 z-10">PVP Wins</p>
            </div>
            
            <div className="bg-white/5 p-3.5 rounded-3xl border border-white/5 flex flex-col items-center justify-center hover:bg-white/10 hover:-translate-y-1 hover:shadow-xl transition-all cursor-default relative overflow-hidden">
              <div className="absolute inset-0 bg-game-purple/5 opacity-0 hover:opacity-100 transition-opacity" />
              <Zap className="h-6 w-6 text-game-purple mb-1.5 drop-shadow-[0_0_8px_rgba(171,71,188,0.6)] z-10" />
              <p className="text-2xl font-black text-white z-10">{profile?.ai_wins || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5 z-10">AI Wins</p>
            </div>

            <div className="bg-white/5 p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center col-span-2 relative overflow-hidden group hover:bg-white/10 hover:-translate-y-1 hover:shadow-2xl transition-all cursor-default">
              <div className="absolute right-[-10%] bottom-[-20%] w-32 h-32 bg-game-cyan/20 rounded-full blur-[40px] group-hover:bg-game-cyan/30 animate-pulse transition-all pointer-events-none" />
              <div className="flex justify-between w-full px-2 items-center z-10">
                <div className="text-left">
                  <p className="text-[10px] text-game-cyan uppercase tracking-widest font-bold mb-0.5 drop-shadow-md">Total Accuracy</p>
                  <p className="text-3xl font-black text-white">{winRate}%</p>
                </div>
                <div className="w-12 h-12 rounded-full border border-white/20 bg-black/40 shadow-inner flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform duration-500">
                  <Swords className="h-5 w-5 text-game-cyan drop-shadow-[0_0_12px_rgba(0,229,255,0.6)]" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {onLogout && (
              <button 
                onClick={onLogout}
                className="w-full h-10 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-500 font-bold text-xs tracking-wide rounded-2xl flex justify-center items-center gap-2 active:scale-[0.98] transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                LOG OUT
              </button>
            )}
            <button 
              onClick={onClose}
              className="w-full h-10 bg-white/5 hover:bg-white/10 border border-white/5 text-white/90 hover:text-white font-bold text-xs tracking-wide rounded-2xl active:scale-[0.98] transition-all"
            >
              CLOSE DASHBOARD
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
