import { UserProfile, useAuth } from "@/contexts/AuthContext";
import { X, Trophy, Swords, Zap, LogOut, Star, Shield, Camera, Loader2, ImagePlus, Pencil, Bot } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAudio } from "@/contexts/AudioContext";
import { Button } from "./ui/button";
import { ARCADE_AVATARS } from "./Avatar";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onLogout?: () => void;
  readOnly?: boolean;
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

export function ProfileModal({ open, onClose, profile, onLogout, readOnly = false }: ProfileModalProps) {
  const { refreshProfile, updateProfileField } = useAuth();
  const { playSfx } = useAudio();
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const arcadeMaxLevel = profile?.arcade_max_level || 0;
  const arcadeScore = profile?.arcade_score || 0;
  const arcadeStars = profile?.arcade_stars || {};
  const totalStars = arcadeStars ? Object.values(arcadeStars).reduce((sum, s) => sum + (Number(s) || 0), 0) : 0;

  const totalGames = profile?.total_games || 0;
  const winRate = profile && totalGames > 0
    ? Math.round(((profile.total_wins + profile.ai_wins) / totalGames) * 100)
    : 0;

  const username = profile?.username || "GUEST PLAYER";
  const rank = getRankInfo(totalGames);
  const RankIcon = rank.icon;

  const currentRankIndex = RANKS.findIndex(r => r.name === rank.name);
  const nextRank = RANKS[currentRankIndex + 1] || rank;
  const previousMax = currentRankIndex > 0 ? RANKS[currentRankIndex - 1].max : 0;

  const progressToNext = nextRank.name === rank.name
    ? 100
    : Math.min(100, Math.max(0, ((totalGames - previousMax) / (nextRank.max - previousMax)) * 100));

  const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'EST. 2024';

  const updateAvatar = async (val: string) => {
    if (!profile) return;
    playSfx('click');
    updateProfileField({ avatar_url: val });
    setIsEditingAvatar(false);
    try {
      const { error } = await (supabase as any).from("profiles").update({ avatar_url: val }).eq("id", profile.id);
      if (error) throw error;
      toast.success("Identity updated! 🚀");
    } catch (err: any) {
      toast.error(err.message || "Failed to save avatar.");
      updateProfileField({ avatar_url: profile.avatar_url });
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const objectUrl = URL.createObjectURL(file);
    createImageBitmap(file).then((bitmap) => {
      URL.revokeObjectURL(objectUrl);
      const AVATAR_SIZE = 120; // High res for dashboard
      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setUploading(false); return; }
      const srcSize = Math.min(bitmap.width, bitmap.height);
      const sx = (bitmap.width - srcSize) / 2;
      const sy = (bitmap.height - srcSize) / 2;
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
      ctx.drawImage(bitmap, sx, sy, srcSize, srcSize, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
      bitmap.close();
      const compressed = canvas.toDataURL("image/webp", 0.7);
      updateAvatar(compressed);
    }).catch(() => {
      setUploading(false);
      toast.error("Format not supported.");
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 md:p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500 overflow-hidden">
      <div className="w-full max-w-sm bg-[#06060a] rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,1)] border border-white/[0.08] animate-in zoom-in-95 duration-300 relative overflow-hidden flex flex-col max-h-[96vh] md:max-h-[90vh]">
        
        {/* Cinematic Backdrop Glow */}
        <div className={`absolute -top-20 -left-20 w-64 h-64 ${rank.bg} blur-[100px] opacity-30 pointer-events-none`} />
        <div className={`absolute top-40 -right-20 w-64 h-64 bg-game-cyan/10 blur-[100px] opacity-10 pointer-events-none`} />

        {/* ── Dashboard Header ── */}
        <div className="relative pt-6 pb-3 px-6 flex flex-col items-center shrink-0">
          <button
            onClick={() => { playSfx('click'); isEditingAvatar ? setIsEditingAvatar(false) : onClose(); }}
            className="absolute top-5 right-5 z-20 p-2 rounded-full bg-white/[0.03] hover:bg-white/[0.08] text-white/50 hover:text-white transition-all active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Avatar Hero */}
          <div className="relative mb-3">
             <div className={`w-[84px] h-[84px] rounded-full p-0.5 bg-gradient-to-tr from-white/10 to-transparent shadow-[0_10px_20px_rgba(0,0,0,0.6)] relative z-10`}>
                <div className={`w-full h-full rounded-full bg-[#0a0a0f] border-2 ${rank.border} flex items-center justify-center overflow-hidden relative`}>
                  {profile?.avatar_url && profile.avatar_url.startsWith('data:image') ? (
                    <img src={profile.avatar_url} alt="Profile Avatar" className="w-full h-full object-cover transition-transform hover:scale-110 duration-700" />
                  ) : profile?.avatar_url ? (
                    <span className="text-4xl leading-none">{profile.avatar_url}</span>
                  ) : (
                    <span className={`text-2xl font-black ${rank.color}`}>{username.substring(0, 2).toUpperCase()}</span>
                  )}
                  
                  {!readOnly && (
                    <button
                      onClick={() => { playSfx('click'); setIsEditingAvatar(!isEditingAvatar); }}
                      className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 backdrop-blur-[2px]"
                    >
                      <Camera className="w-4 h-4 text-white" />
                      <span className="text-[8px] font-black text-white uppercase tracking-widest">EDIT</span>
                    </button>
                  )}
                </div>
             </div>
             {!isEditingAvatar && (
               <div className={`absolute -bottom-0.5 -right-0.5 z-20 bg-game-dark border-2 ${rank.border} p-1 rounded-full shadow-xl animate-bounce-subtle`}>
                 <RankIcon className={`w-3.5 h-3.5 ${rank.color}`} />
               </div>
             )}
          </div>

          <h1 className="text-xl font-black text-white tracking-tight mb-1">{username}</h1>
          <div className="flex gap-2 mb-1.5 opacity-90">
             <span className={`px-2.5 py-0.5 rounded-full ${rank.bg} ${rank.border} border text-[9px] font-black uppercase tracking-[0.1em] ${rank.color}`}>
               {rank.name} TIER
             </span>
             {profile?.arcade_max_level && profile.arcade_max_level > 20 && (
               <span className={`px-2.5 py-0.5 rounded-full bg-game-purple/10 border border-game-purple/30 text-[9px] font-black uppercase tracking-[0.1em] text-game-purple`}>
                 TOP SURVIVOR
               </span>
             )}
          </div>
          <p className="text-[9px] text-white/30 font-bold uppercase tracking-[0.2em] font-mono">EST. {memberSince}</p>
        </div>

        {/* ── Scrollable Dashboard Content ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 space-y-4">
          
          {isEditingAvatar ? (
             <div className="animate-in slide-in-from-bottom-6 duration-500 py-1">
                <div className="bg-white/[0.03] border border-white/[0.05] rounded-[1.5rem] p-5">
                  <h3 className="text-[10px] font-black text-white uppercase tracking-widest mb-3 text-center opacity-50">Profile Identity</h3>
                  
                  <div className="grid grid-cols-6 gap-1.5 mb-5">
                    {ARCADE_AVATARS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => updateAvatar(emoji)}
                        className={`h-10 rounded-xl text-xl active:scale-90 transition-all flex items-center justify-center border ${
                          profile?.avatar_url === emoji
                            ? 'bg-game-cyan/20 border-game-cyan shadow-[0_0_10px_rgba(0,229,255,0.4)]'
                            : 'bg-white/5 hover:bg-white/10 border-white/5'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} disabled={uploading}/>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-11 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold rounded-xl mb-3"
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Pencil className="w-3.5 h-3.5 mr-2" />}
                    {uploading ? "SYNCING..." : "Flash Media Upload"}
                  </Button>
                  
                  <button onClick={() => { playSfx('click'); setIsEditingAvatar(false); }} className="w-full text-[9px] font-black text-white/40 uppercase tracking-[0.2em] hover:text-white py-1">
                    RETURN TO DASHBOARD
                  </button>
                </div>
             </div>
          ) : (
            <>
              {/* Progression Section */}
              <div className="relative rounded-[1.5rem] p-4 border border-white/[0.08] bg-white/[0.02] group overflow-hidden">
                <div className="flex justify-between items-end mb-3">
                  <div className="text-left">
                    <span className="text-[9px] uppercase font-black text-white/30 tracking-[0.1em] block mb-0.5">Current Progress</span>
                    <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${rank.color}`}>
                      <RankIcon className="w-3.5 h-3.5" /> {rank.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-black text-white/30 tracking-[0.1em] block mb-0.5">Next Tier</span>
                    <span className={`text-[11px] font-black uppercase tracking-wider ${nextRank.color}`}>
                      {nextRank.name === rank.name ? 'ELITE' : nextRank.name}
                    </span>
                  </div>
                </div>

                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 relative mb-2">
                   <div 
                     className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-game-cyan via-blue-500 to-game-purple shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all duration-1000"
                     style={{ width: `${progressToNext}%` }}
                   >
                     <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.05)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.05)_75%,transparent_75%,transparent)] bg-[length:15px_15px] animate-shimmer" />
                   </div>
                </div>

                <p className="text-[9px] text-center text-white/40 font-bold uppercase tracking-widest leading-none">
                  {nextRank.name === rank.name 
                    ? "MAX PRESTIGE" 
                    : <><span className="text-white font-black">{totalGames}</span> / <span className="text-white/60">{nextRank.max}</span> MATCHES</>
                  }
                </p>
              </div>

              {/* Stats Grid Matrix */}
              <div className="grid grid-cols-3 gap-2">
                 <div className="bg-white/[0.03] border border-white/[0.05] p-3 rounded-2xl flex flex-col items-center justify-center hover:bg-white/[0.06] transition-all group overflow-hidden relative">
                    <Trophy className="w-4 h-4 text-game-amber mb-1" />
                    <span className="text-base font-black text-white">{profile?.total_wins || 0}</span>
                    <span className="text-[7px] font-black text-game-amber uppercase tracking-[0.1em] opacity-40">PvP Wins</span>
                 </div>
                 <div className="bg-white/[0.03] border border-white/[0.05] p-3 rounded-2xl flex flex-col items-center justify-center hover:bg-white/[0.06] transition-all group overflow-hidden relative">
                    <Bot className="w-4 h-4 text-game-cyan mb-1" />
                    <span className="text-base font-black text-white">{profile?.ai_wins || 0}</span>
                    <span className="text-[7px] font-black text-game-cyan uppercase tracking-[0.1em] opacity-40">AI Wins</span>
                 </div>
                 <div className="bg-white/[0.03] border border-white/[0.05] p-3 rounded-2xl flex flex-col items-center justify-center hover:bg-white/[0.06] transition-all group overflow-hidden relative">
                    <Zap className="w-4 h-4 text-game-purple mb-1" />
                    <span className="text-base font-black text-white">{profile?.arcade_max_level || 0}</span>
                    <span className="text-[7px] font-black text-game-purple uppercase tracking-[0.1em] opacity-40">Max Lv.</span>
                 </div>
              </div>

              {/* accuracy large card */}
              <div className="bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.08] p-4 rounded-[1.5rem] flex justify-between items-center relative overflow-hidden group">
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-game-cyan/10 blur-[50px] pointer-events-none" />
                <div className="z-10">
                   <p className="text-[8px] text-game-cyan font-black uppercase tracking-[0.1em] mb-0.5 opacity-50">Precision Rating</p>
                   <p className="text-4xl font-black text-white tracking-tighter">{winRate}<span className="text-base text-game-cyan">%</span></p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-game-cyan/10 border border-game-cyan/30 flex items-center justify-center rotate-6 group-hover:rotate-12 transition-transform shadow-[0_0_20px_rgba(0,229,255,0.05)]">
                   <Swords className="w-6 h-6 text-game-cyan drop-shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
                </div>
              </div>

              {/* Action Footer */}
              <div className="space-y-3 pt-2">
                 {isConfirmingLogout ? (
                    <div className="flex gap-2 animate-in slide-in-from-top-2">
                       <button onClick={() => { playSfx('click'); onLogout?.(); }} className="flex-1 h-12 bg-red-500 text-white font-black rounded-xl text-xs tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all">TERMINATE SESSION</button>
                       <button onClick={() => setIsConfirmingLogout(false)} className="flex-1 h-12 bg-white/5 text-white/50 font-black rounded-xl text-xs tracking-widest active:scale-95 transition-all">ABORT</button>
                    </div>
                 ) : (
                   !readOnly && (
                     <button 
                       onClick={() => setIsConfirmingLogout(true)}
                       className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-black text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-[0.98]"
                     >
                       <LogOut className="w-3.5 h-3.5" /> SECURE LOGOUT
                     </button>
                   )
                 )}
                 <button 
                   onClick={() => { playSfx('click'); onClose(); }} 
                   className="w-full h-12 rounded-xl bg-white text-game-dark font-black text-[11px] uppercase tracking-[0.2em] hover:bg-white/90 transition-all shadow-lg active:scale-[0.98]"
                 >
                   Close Profile
                 </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

