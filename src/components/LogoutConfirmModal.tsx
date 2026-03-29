import { LogOut, X } from "lucide-react";
import { useAudio } from "@/contexts/AudioContext";

interface LogoutConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LogoutConfirmModal({ open, onConfirm, onCancel }: LogoutConfirmModalProps) {
  const { playSfx } = useAudio();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 overflow-hidden">
      <div className="w-full max-w-sm bg-[#0a0a0f] rounded-[2rem] p-6 shadow-2xl border border-red-500/20 animate-in zoom-in-95 duration-300 relative overflow-hidden group">
        
        {/* Abstract background elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/10 rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-orange-600/10 rounded-full blur-[60px] pointer-events-none" />

        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <LogOut className="w-7 h-7 text-red-500 translate-x-[-2px] relative z-10" />
          </div>
          <button
            onClick={() => {
              playSfx('click');
              onCancel();
            }}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all active:scale-90 border border-transparent hover:border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative z-10 mb-8">
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Secure Sign Out</h2>
          <p className="text-sm text-neutral-400 font-medium leading-relaxed">
            Are you sure you want to log out? You will need to reconnect your profile to play ranked matches.
          </p>
        </div>

        <div className="flex gap-3 relative z-10">
          <button
            onClick={() => {
              playSfx('click');
              onCancel();
            }}
            className="flex-1 py-3.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 hover:text-white font-bold text-sm tracking-wide transition-all active:scale-95"
          >
            STAY
          </button>
          <button
            onClick={() => {
              playSfx('click');
              onConfirm();
            }}
            className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white font-black text-sm tracking-wide shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all active:scale-95 hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]"
          >
            LOG OUT
          </button>
        </div>
      </div>
    </div>
  );
}
