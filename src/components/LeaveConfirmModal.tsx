import { useState } from "react";
import { LogOut, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeaveConfirmModalProps {
  open: boolean;
  /** Title shown in the modal header */
  title?: string;
  /** Body message */
  message?: string;
  /** Label for the danger confirm button */
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function LeaveConfirmModal({
  open,
  title = "Leave the Room?",
  message = "Are you sure you want to leave? You will lose your progress in this round.",
  confirmLabel = "Yes, Leave",
  onCancel,
  onConfirm,
}: LeaveConfirmModalProps) {
  const [leaving, setLeaving] = useState(false);

  if (!open) return null;

  const handleConfirm = () => {
    setLeaving(true);
    // Give modals and Supabase channels 200ms to clean up before navigating
    setTimeout(() => {
      onConfirm();
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-lg animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#0f0f18]/98 backdrop-blur-2xl border border-red-500/20 rounded-3xl p-6 shadow-[0_0_60px_rgba(239,68,68,0.15)] animate-in zoom-in-95 duration-200 relative overflow-hidden">
        {/* Red glow orb */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-red-500/10 rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-red-500/5 rounded-full blur-[50px] pointer-events-none" />

        <div className="relative z-10">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </div>

          {/* Text */}
          <h3 className="text-xl font-black text-white text-center mb-2 tracking-tight">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-7 leading-relaxed">
            {message}
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleConfirm}
              disabled={leaving}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-red-500 hover:bg-red-600 active:scale-[0.97] text-white font-black text-sm uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(239,68,68,0.35)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {leaving ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              {leaving ? "Leaving..." : confirmLabel}
            </button>
            <button
              onClick={onCancel}
              disabled={leaving}
              className="w-full h-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white border border-white/10 font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
            >
              Stay in Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
