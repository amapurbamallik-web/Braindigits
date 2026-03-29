import { useState } from "react";
import { X, Settings2, Volume2, VolumeX, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameSettings } from "@/lib/game-types";
import { useAudio } from "@/contexts/AudioContext";

interface RoomSettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: GameSettings;
  onSettingsChange?: (s: GameSettings) => void;
  readOnly?: boolean;
}

// Compact toggle switch
const Toggle = ({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) => (
  <button
    onClick={onToggle}
    disabled={disabled}
    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${disabled ? 'cursor-default' : 'cursor-pointer'} ${on ? 'bg-game-cyan' : 'bg-muted/60'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${on ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

export function RoomSettingsModal({
  open,
  onClose,
  settings,
  onSettingsChange,
  readOnly = false,
}: RoomSettingsModalProps) {
  const [customRangeInput, setCustomRangeInput] = useState("");
  const [customTimerInput, setCustomTimerInput] = useState("");
  const [customHeartsInput, setCustomHeartsInput] = useState("");
  const { isSoundEnabled, toggleSound } = useAudio();

  if (!open) return null;

  const heartsEnabled = (settings.maxHearts ?? 3) > 0;

  const change = (partial: Partial<GameSettings>) => {
    if (!readOnly && onSettingsChange) {
      onSettingsChange({ ...settings, ...partial });
    }
  };

  const handleCustomRangeSubmit = () => {
    if (readOnly) return;
    const val = parseInt(customRangeInput);
    if (!isNaN(val) && val > 1 && onSettingsChange) {
      change({ maxRange: val });
      setCustomRangeInput("");
    }
  };

  const handleCustomTimerSubmit = () => {
    if (readOnly) return;
    const val = parseInt(customTimerInput);
    if (!isNaN(val) && val >= 5 && onSettingsChange) {
      change({ timerDuration: val * 1000 });
      setCustomTimerInput("");
    }
  };

  const handleCustomHeartsSubmit = () => {
    if (readOnly) return;
    const val = parseInt(customHeartsInput);
    if (!isNaN(val) && val >= 1 && val <= 10 && onSettingsChange) {
      change({ maxHearts: val });
      setCustomHeartsInput("");
    }
  };

  return (
    // z-[200] ensures it renders above all other page elements
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#0d0d16]/98 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">

        {/* Header — sticky */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5 shrink-0">
          <h2 className="text-base font-black text-white flex items-center gap-2 tracking-tight">
            <Settings2 className="w-4 h-4 text-game-cyan" />
            {readOnly ? "Room Settings" : "Game Settings"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground active:scale-95 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto custom-scrollbar flex-1 px-5 py-4 space-y-5">

          {/* ── Number Range ── */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Number Range</p>
              {![100, 200, 500, 1000].includes(settings.maxRange) && (
                <span className="text-[10px] font-bold text-game-cyan bg-game-cyan/10 px-2 py-0.5 rounded-full border border-game-cyan/20">
                  1–{settings.maxRange}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[100, 200, 500, 1000].map(val => (
                <button
                  key={val}
                  disabled={readOnly}
                  onClick={() => change({ maxRange: val })}
                  className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                    settings.maxRange === val
                      ? 'bg-game-cyan/20 border-game-cyan text-game-cyan'
                      : `bg-black/30 border-transparent text-muted-foreground ${readOnly ? '' : 'hover:bg-white/5 cursor-pointer'}`
                  } ${readOnly ? 'cursor-default' : ''}`}
                >
                  1-{val}
                </button>
              ))}
            </div>
            {!readOnly && (
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Custom max…"
                  value={customRangeInput}
                  onChange={e => setCustomRangeInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCustomRangeSubmit()}
                  className="bg-black/20 border-white/10 text-xs h-9 flex-1 text-white placeholder:text-muted-foreground/40"
                />
                <Button onClick={handleCustomRangeSubmit} className="h-9 px-3 bg-game-cyan hover:bg-game-cyan/90 text-game-dark text-xs font-bold active:scale-95">
                  Set
                </Button>
              </div>
            )}
          </section>

          {/* ── Turn Timer ── */}
          <section className="bg-black/20 border border-white/5 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white leading-tight">Turn Timer</p>
                <p className="text-[11px] text-muted-foreground">Time limit per guess</p>
              </div>
              <Toggle on={settings.timerEnabled} onToggle={() => change({ timerEnabled: !settings.timerEnabled })} disabled={readOnly} />
            </div>
            {settings.timerEnabled && (
              <>
                <div className="grid grid-cols-3 gap-1.5">
                  {[10000, 15000, 30000].map(d => (
                    <button
                      key={d}
                      disabled={readOnly}
                      onClick={() => change({ timerDuration: d })}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        settings.timerDuration === d
                          ? 'bg-game-purple/20 border-game-purple text-game-purple'
                          : `bg-black/30 border-transparent text-muted-foreground ${readOnly ? '' : 'hover:bg-white/5 cursor-pointer'}`
                      } ${readOnly ? 'cursor-default' : ''}`}
                    >
                      {d / 1000}s
                    </button>
                  ))}
                </div>
                {!readOnly && (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Custom secs…"
                      value={customTimerInput}
                      onChange={e => setCustomTimerInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleCustomTimerSubmit()}
                      className="bg-black/20 border-white/10 text-xs h-9 flex-1 text-white placeholder:text-muted-foreground/40"
                    />
                    <Button onClick={handleCustomTimerSubmit} className="h-9 px-3 bg-game-purple hover:bg-game-purple/90 text-white text-xs font-bold active:scale-95">
                      Set
                    </Button>
                  </div>
                )}
                {![10000, 15000, 30000].includes(settings.timerDuration ?? 15000) && (
                  <p className="text-[10px] text-game-purple text-right">Custom: {(settings.timerDuration ?? 15000) / 1000}s</p>
                )}
              </>
            )}
          </section>

          {/* ── Hearts / Lives ── */}
          <section className="bg-black/20 border border-white/5 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white leading-tight">Lives System</p>
                  <p className="text-[11px] text-muted-foreground">Lose a heart when time runs out</p>
                </div>
              </div>
              {/* Hearts ON/OFF toggle — 0 means off */}
              <Toggle
                on={heartsEnabled}
                onToggle={() => change({ maxHearts: heartsEnabled ? 0 : 3 })}
                disabled={readOnly}
              />
            </div>

            {heartsEnabled && (
              <>
                {/* Quick-select 1-5 */}
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map(val => (
                    <button
                      key={val}
                      disabled={readOnly}
                      onClick={() => change({ maxHearts: val })}
                      className={`py-2 rounded-lg text-xs font-bold transition-all border flex flex-col items-center gap-0.5 ${
                        (settings.maxHearts ?? 3) === val
                          ? 'bg-red-500/20 border-red-400 text-red-400'
                          : `bg-black/30 border-transparent text-muted-foreground ${readOnly ? '' : 'hover:bg-white/5 cursor-pointer'}`
                      } ${readOnly ? 'cursor-default' : ''}`}
                    >
                      <span className="text-sm leading-none">{'❤️'.repeat(Math.min(val, 3))}</span>
                      <span className="text-[9px] font-black">{val}</span>
                    </button>
                  ))}
                </div>



                {!readOnly && (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Custom (max 10)"
                      value={customHeartsInput}
                      min={1} max={10}
                      onChange={e => setCustomHeartsInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleCustomHeartsSubmit()}
                      className="bg-black/20 border-white/10 text-xs h-9 flex-1 text-white placeholder:text-muted-foreground/40"
                    />
                    <Button onClick={handleCustomHeartsSubmit} className="h-9 px-3 bg-red-500 hover:bg-red-600 text-white text-xs font-bold active:scale-95">
                      Set
                    </Button>
                  </div>
                )}
              </>
            )}

            {!heartsEnabled && (
              <p className="text-[11px] text-muted-foreground text-center py-1">
                Hearts disabled — timer expiry skips turn only
              </p>
            )}
          </section>

          {/* ── Sound Effects ── */}
          <section className="flex items-center justify-between bg-black/20 border border-white/5 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              {isSoundEnabled ? <Volume2 className="w-4 h-4 text-game-amber" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
              <div>
                <p className="text-sm font-semibold text-white leading-tight">Sound Effects</p>
                <p className="text-[11px] text-muted-foreground">Personal device audio</p>
              </div>
            </div>
            <Toggle on={isSoundEnabled} onToggle={toggleSound} />
          </section>
        </div>

        {/* Footer — sticky */}
        <div className="px-5 pb-4 pt-3 border-t border-white/5 shrink-0">
          <Button
            onClick={onClose}
            className="w-full h-10 bg-white hover:bg-gray-100 text-black font-bold text-sm rounded-xl active:scale-[0.98] transition-transform"
          >
            {readOnly ? 'Close' : 'Save & Close'}
          </Button>
        </div>
      </div>
    </div>
  );
}
