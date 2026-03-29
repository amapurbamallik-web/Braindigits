import { UserProfile, useAuth } from "@/contexts/AuthContext";
import { X, Trophy, Swords, Zap, LogOut, Star, Shield, Camera, Loader2, ImagePlus, Pencil } from "lucide-react";
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

  const totalGames = profile?.total_games || 0;
  const winRate = profile && totalGames > 0
    ? Math.round(((profile.total_wins + profile.ai_wins) / totalGames) * 100)
    : 0;

  const username = profile?.username || "Unknown Gamer";
  const rank = getRankInfo(totalGames);
  const RankIcon = rank.icon;

  const currentRankIndex = RANKS.findIndex(r => r.name === rank.name);
  const nextRank = RANKS[currentRankIndex + 1] || rank;
  const previousMax = currentRankIndex > 0 ? RANKS[currentRankIndex - 1].max : 0;

  const progressToNext = nextRank.name === rank.name
    ? 100
    : Math.min(100, Math.max(0, ((totalGames - previousMax) / (nextRank.max - previousMax)) * 100));

  const updateAvatar = async (val: string) => {
    if (!profile) return;
    playSfx('click');
    updateProfileField({ avatar_url: val });
    setIsEditingAvatar(false);
    try {
      const { error } = await (supabase as any).from("profiles").update({ avatar_url: val }).eq("id", profile.id);
      if (error) throw error;
      toast.success("Avatar saved! 🚀");
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
      const AVATAR_SIZE = 80;
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
      const compressed = canvas.toDataURL("image/webp", 0.5);
      updateAvatar(compressed);
    }).catch(() => {
      setUploading(false);
      toast.error("Could not read image file.");
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-[#0a0a0f] rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 animate-in zoom-in-95 duration-300 relative overflow-hidden flex flex-col max-h-[90vh]">

        {/* ── Header banner ── */}
        <div className={`h-28 w-full bg-gradient-to-br ${rank.bg} to-transparent border-b ${rank.border} relative shrink-0`}>
          {/* Close */}
          <button
            onClick={() => isEditingAvatar ? setIsEditingAvatar(false) : onClose()}
            className="absolute top-4 right-4 z-20 p-1.5 rounded-full hover:bg-black/40 text-white/70 hover:text-white transition-all active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Avatar bubble — overflows the banner into the content */}
          <div className="absolute -bottom-11 left-1/2 -translate-x-1/2 z-30">
            <div className="relative">
              {/* Avatar circle */}
              <div className={`w-[88px] h-[88px] rounded-full bg-[#0a0a0f] border-4 ${rank.border} shadow-[0_0_20px_rgba(0,0,0,0.6)] flex items-center justify-center overflow-hidden`}>
                {profile?.avatar_url && profile.avatar_url.startsWith('data:image') ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : profile?.avatar_url ? (
                  <span className="text-4xl leading-none">{profile.avatar_url}</span>
                ) : (
                  <span className={`text-2xl font-black ${rank.color}`}>{username.substring(0, 2).toUpperCase()}</span>
                )}
              </div>

              {/* Camera hover overlay — covers full circle, separate from overflow:hidden */}
              {!readOnly && (
                <button
                  onClick={() => { playSfx('click'); setIsEditingAvatar(!isEditingAvatar); }}
                  title="Change avatar"
                  aria-label="Change avatar"
                  className="absolute inset-0 rounded-full z-10 hover:bg-black/55 active:bg-black/70 transition-colors duration-150 flex items-center justify-center group"
                >
                  <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}

              {/* Pencil badge — z-20, always on top and clickable */}
              {!readOnly && (
                <button
                  onClick={() => { playSfx('click'); setIsEditingAvatar(!isEditingAvatar); }}
                  title="Change avatar"
                  aria-label="Change avatar"
                  className={`absolute -bottom-0.5 -right-0.5 z-20 w-7 h-7 rounded-full bg-[#0a0a0f] border-2 ${rank.border} flex items-center justify-center shadow-md cursor-pointer hover:scale-125 active:scale-90 transition-transform`}
                >
                  <Pencil className={`w-3.5 h-3.5 ${rank.color}`} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="pt-14 px-6 pb-5 overflow-y-auto custom-scrollbar flex-1">

          {isEditingAvatar ? (
            <div className="animate-in slide-in-from-right-8 duration-300">
              <h3 className="text-lg font-bold text-white text-center mb-1">Choose Your Avatar</h3>
              <p className="text-xs text-muted-foreground text-center mb-4">
                Pick an arcade avatar or upload a custom image.
              </p>

              {/* Arcade grid */}
              <div className="grid grid-cols-6 gap-2 mb-4">
                {ARCADE_AVATARS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => updateAvatar(emoji)}
                    title={emoji}
                    className={`h-11 rounded-xl text-2xl active:scale-90 transition-all flex items-center justify-center border ${
                      profile?.avatar_url === emoji
                        ? 'bg-game-cyan/20 border-game-cyan shadow-[0_0_8px_rgba(0,229,255,0.3)]'
                        : 'bg-white/5 hover:bg-white/15 border-white/5 hover:border-game-cyan/30'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Upload */}
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-11 bg-game-cyan/10 hover:bg-game-cyan/20 text-game-cyan border border-game-cyan/30 font-bold rounded-xl mb-3"
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-2" />}
                {uploading ? "Compressing…" : "Upload Custom Image"}
              </Button>
              <button
                onClick={() => setIsEditingAvatar(false)}
                className="w-full h-10 bg-white/5 hover:bg-white/10 border border-white/5 text-muted-foreground font-bold text-xs tracking-wide rounded-xl transition-all"
              >
                CANCEL
              </button>
            </div>
          ) : (
            <div className="animate-in slide-in-from-left-8 duration-300">
              <h2 className="text-xl font-extrabold text-white mb-1 tracking-tight text-center">{username}</h2>

              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${rank.border} ${rank.bg} ${rank.color} text-[10px] font-black uppercase tracking-widest mb-5 shadow-lg mx-auto flex justify-center`}>
                <RankIcon className="w-3.5 h-3.5" />
                {rank.name} Tier
              </div>

              {!profile && (
                <div className="mb-4 text-center bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl font-medium">
                  Profile stats unavailable. Check network or setup.
                </div>
              )}

              {/* Rank progress */}
              <div className="mb-6 relative rounded-[1.5rem] overflow-hidden p-4 border border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-md shadow-xl group">
                <div className="absolute inset-0 bg-gradient-to-r from-game-cyan/5 via-transparent to-game-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative z-10">
                  <div className="flex justify-between items-end mb-3">
                    <div className="text-left">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-widest mb-0.5 block">Current Rank</span>
                      <span className={`text-sm font-black uppercase tracking-wider flex items-center gap-1.5 ${rank.color}`}>
                        <RankIcon className="w-4 h-4" /> {rank.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-widest mb-0.5 block">Next Tier</span>
                      <span className={`text-sm font-black uppercase tracking-wider ${nextRank.color}`}>
                        {nextRank.name === rank.name ? 'MAX OUT' : nextRank.name}
                      </span>
                    </div>
                  </div>
                  <div className="h-3 w-full bg-[#050508] rounded-full overflow-hidden border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] relative">
                    <div
                      className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-game-cyan via-blue-500 to-game-purple relative overflow-hidden"
                      style={{ width: `${progressToNext}%` }}
                    >
                      <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 rounded-full" />
                    </div>
                  </div>
                  <div className="mt-2.5 text-[10px] text-center text-muted-foreground/80 font-bold tracking-widest uppercase">
                    {nextRank.name === rank.name
                      ? 'MAXIMUM PRESTIGE UNLOCKED'
                      : <span className="text-white/90">{totalGames} <span className="text-muted-foreground/50 mx-0.5">/</span> {nextRank.max} <span className="font-medium text-muted-foreground">matches</span></span>
                    }
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gradient-to-br from-white/10 to-transparent p-5 rounded-[1.5rem] border-t border-t-white/10 border-l border-l-white/10 flex flex-col items-center justify-center hover:bg-white/10 hover:-translate-y-1 shadow-lg hover:shadow-[0_0_20px_rgba(251,191,36,0.15)] transition-all cursor-default relative overflow-hidden group">
                  <div className="absolute -inset-4 bg-game-amber/10 blur-[20px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  <Trophy className="h-7 w-7 text-game-amber mb-2 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)] z-10 transition-transform group-hover:scale-110" />
                  <p className="text-3xl font-black text-white z-10 tracking-tight">{profile?.total_wins || 0}</p>
                  <p className="text-[10px] text-game-amber/80 uppercase tracking-widest font-extrabold mt-1 z-10">PvP Wins</p>
                </div>

                <div className="bg-gradient-to-bl from-white/10 to-transparent p-5 rounded-[1.5rem] border-t border-t-white/10 border-r border-r-white/10 flex flex-col items-center justify-center hover:bg-white/10 hover:-translate-y-1 shadow-lg hover:shadow-[0_0_20px_rgba(171,71,188,0.15)] transition-all cursor-default relative overflow-hidden group">
                  <div className="absolute -inset-4 bg-game-purple/10 blur-[20px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  <Zap className="h-7 w-7 text-game-purple mb-2 drop-shadow-[0_0_10px_rgba(171,71,188,0.8)] z-10 transition-transform group-hover:scale-110" />
                  <p className="text-3xl font-black text-white z-10 tracking-tight">{profile?.ai_wins || 0}</p>
                  <p className="text-[10px] text-game-purple/80 uppercase tracking-widest font-extrabold mt-1 z-10">AI Wins</p>
                </div>

                <div className="bg-gradient-to-b from-white/10 to-black/40 p-5 rounded-[1.5rem] border border-white/10 flex justify-between items-center col-span-2 relative overflow-hidden group hover:bg-white/20 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(0,229,255,0.1)] transition-all cursor-default backdrop-blur-md">
                  <div className="absolute right-[-10%] bottom-[-20%] w-40 h-40 bg-game-cyan/20 rounded-full blur-[50px] group-hover:bg-game-cyan/30 transition-all duration-700 pointer-events-none" />
                  <div className="text-left z-10 relative">
                    <p className="text-[11px] text-game-cyan uppercase tracking-widest font-extrabold mb-1">Global Accuracy</p>
                    <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 tracking-tighter">{winRate}%</p>
                  </div>
                  <div className="w-14 h-14 rounded-full border-2 border-game-cyan/30 bg-game-dark/50 shadow-[inset_0_0_15px_rgba(0,229,255,0.2)] flex items-center justify-center shrink-0 group-hover:rotate-[15deg] group-hover:scale-110 transition-transform duration-500 relative z-10 backdrop-blur-xl">
                    <Swords className="h-6 w-6 text-game-cyan drop-shadow-[0_0_15px_rgba(0,229,255,1)]" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {isConfirmingLogout ? (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
                    <p className="text-sm font-bold text-center text-red-500 tracking-wide">Are you sure you want to log out?</p>
                    <div className="flex gap-2">
                      <button onClick={() => { playSfx('click'); onLogout?.(); setIsConfirmingLogout(false); }} className="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white font-bold text-xs tracking-wide rounded-xl active:scale-[0.98] transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]">YES</button>
                      <button onClick={() => { playSfx('click'); setIsConfirmingLogout(false); }} className="flex-1 h-10 bg-white/10 hover:bg-white/20 text-white font-bold text-xs tracking-wide rounded-xl active:scale-[0.98] transition-all border border-white/10">NO</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {onLogout && (
                      <button onClick={() => { playSfx('click'); setIsConfirmingLogout(true); }} className="w-full h-10 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-500 font-bold text-xs tracking-wide rounded-2xl flex justify-center items-center gap-2 active:scale-[0.98] transition-all">
                        <LogOut className="w-3.5 h-3.5" />
                        LOG OUT
                      </button>
                    )}
                    <button onClick={() => { playSfx('click'); onClose(); }} className="w-full h-10 bg-white/5 hover:bg-white/10 border border-white/5 text-white/90 hover:text-white font-bold text-xs tracking-wide rounded-2xl active:scale-[0.98] transition-all">
                      CLOSE DASHBOARD
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
