import { useState } from "react";
import { X, Settings2, Heart, Timer, Hash, Zap, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameSettings } from "@/lib/game-types";

interface RoomSettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: GameSettings;
  onSettingsChange?: (s: GameSettings) => void;
  readOnly?: boolean;
}

const Toggle = ({ on, onToggle, disabled, color = "bg-game-cyan" }: { on: boolean; onToggle: () => void; disabled?: boolean; color?: string }) => (
  <button
    onClick={onToggle}
    disabled={disabled}
    className={`relative w-8 h-4 rounded-full transition-all shrink-0 ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'} ${on ? color : 'bg-white/10'}`}
  >
    <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow-sm ${on ? 'translate-x-4' : 'translate-x-0'}`} />
  </button>
);

export function RoomSettingsModal({
  open,
  onClose,
  settings,
  onSettingsChange,
  readOnly = false,
}: RoomSettingsModalProps) {
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [showCustomTimer, setShowCustomTimer] = useState(false);
  const [showCustomHearts, setShowCustomHearts] = useState(false);
  
  const [customRange, setCustomRange] = useState("");
  const [customTimer, setCustomTimer] = useState("");
  const [customHearts, setCustomHearts] = useState("");

  if (!open) return null;

  const change = (partial: Partial<GameSettings>) => {
    if (!readOnly && onSettingsChange) {
      onSettingsChange({ ...settings, ...partial });
    }
  };

  const heartsEnabled = (settings.maxHearts ?? 3) > 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-[360px] bg-[#09090e] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        
        {/* Compact Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-game-cyan/10 border border-game-cyan/20">
              <SlidersHorizontal className="w-4 h-4 text-game-cyan" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">{readOnly ? "Arena Info" : "Match Control"}</h2>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-50">Sector: Lobby Config</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-muted-foreground transition-colors active:scale-90">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          
          {/* Section: Environment (Range) */}
          <div className="space-y-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 relative overflow-hidden group/range">
            {settings.autoIncreaseRange && (
               <div className="absolute top-0 right-0 w-24 h-24 bg-game-cyan/5 blur-3xl -mr-12 -mt-12 pointer-events-none animate-pulse" />
            )}
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-game-cyan opacity-70" />
                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Number Range</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[8px] font-black uppercase tracking-widest transition-all ${settings.autoIncreaseRange ? 'text-game-cyan opacity-100' : 'text-muted-foreground opacity-30 italic'}`}>
                  {settings.autoIncreaseRange ? 'Dynamic Range' : 'Fixed Range'}
                </span>
                <Toggle 
                  on={settings.autoIncreaseRange || false} 
                  onToggle={() => change({ autoIncreaseRange: !settings.autoIncreaseRange })} 
                  disabled={readOnly}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[100, 500, 1000].map(val => (
                <button
                  key={val}
                  onClick={() => { change({ maxRange: val }); setShowCustomRange(false); }}
                  disabled={readOnly}
                  className={`py-2 rounded-xl text-[10px] font-black transition-all border ${
                    settings.maxRange === val && !showCustomRange
                    ? 'bg-game-cyan/20 border-game-cyan text-game-cyan'
                    : 'bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/[0.05]'
                  }`}
                >
                  {val}
                </button>
              ))}
              <button
                onClick={() => setShowCustomRange(prev => !prev)}
                className={`py-2 rounded-xl text-[10px] font-black transition-all border ${
                  showCustomRange || (![100, 500, 1000].includes(settings.maxRange))
                  ? 'bg-game-cyan/20 border-game-cyan text-game-cyan'
                  : 'bg-white/[0.02] border-white/5 text-muted-foreground'
                }`}
              >
                Custom
              </button>
            </div>

            {showCustomRange && !readOnly && (
              <div className="flex gap-1.5 animate-in slide-in-from-top-1 duration-200">
                <Input
                  type="number"
                  placeholder="Max..."
                  value={customRange}
                  onChange={(e) => setCustomRange(e.target.value)}
                  className="h-8 bg-black/40 border-white/10 text-[10px] font-black rounded-lg text-white"
                />
                <Button 
                  onClick={() => { if(customRange) { change({ maxRange: parseInt(customRange) }); setShowCustomRange(false); setCustomRange(""); }}} 
                  className="h-8 px-3 bg-game-cyan text-game-dark text-[10px] font-black rounded-lg"
                >
                  SET
                </Button>
              </div>
            )}
          </div>

          {/* Section: Engagement (Timer & Hearts) */}
          <div className="space-y-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-3.5 h-3.5 text-game-purple opacity-70" />
                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Turn Dynamics</span>
              </div>
              <Toggle 
                on={settings.timerEnabled} 
                onToggle={() => change({ timerEnabled: !settings.timerEnabled, maxHearts: !settings.timerEnabled ? 3 : 0 })} 
                disabled={readOnly}
                color="bg-game-purple"
              />
            </div>

            {settings.timerEnabled && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 15, 30].map(s => (
                    <button
                      key={s}
                      onClick={() => { change({ timerDuration: s * 1000 }); setShowCustomTimer(false); }}
                      className={`py-2 rounded-xl text-[10px] font-black border transition-all ${
                        settings.timerDuration === s * 1000 && !showCustomTimer
                        ? 'bg-game-purple/20 border-game-purple text-game-purple'
                        : 'bg-white/[0.02] border-white/5 text-muted-foreground'
                      }`}
                    >
                      {s}s
                    </button>
                  ))}
                  <button 
                    onClick={() => setShowCustomTimer(prev => !prev)}
                    className={`py-2 rounded-xl text-[10px] font-black border transition-all ${
                      showCustomTimer ? 'bg-game-purple/20 border-game-purple text-game-purple' : 'bg-white/[0.02] border-white/5 text-muted-foreground'
                    }`}
                  >
                    ...
                  </button>
                </div>

                {showCustomTimer && (
                  <div className="flex gap-1.5">
                    <Input
                      type="number"
                      placeholder="Seconds..."
                      value={customTimer}
                      onChange={e => setCustomTimer(e.target.value)}
                      className="h-8 bg-black/40 border-white/10 text-[10px] font-black rounded-lg text-white"
                    />
                    <Button 
                      onClick={() => { if(customTimer) { change({ timerDuration: parseInt(customTimer) * 1000 }); setShowCustomTimer(false); setCustomTimer(""); }}}
                      className="h-8 px-3 bg-game-purple text-white text-[10px] font-black rounded-lg"
                    >
                      SET
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <Heart className="w-3 h-3 text-red-500" />
                    <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Lives System</span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 3, 5].map(v => (
                      <button
                        key={v}
                        onClick={() => { change({ maxHearts: v }); setShowCustomHearts(false); }}
                        className={`w-6 h-6 rounded-lg text-[9px] font-black border transition-all flex items-center justify-center ${
                          settings.maxHearts === v && !showCustomHearts ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-white/5 border-white/5 text-muted-foreground'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                    <button 
                       onClick={() => setShowCustomHearts(prev => !prev)}
                       className={`w-6 h-6 rounded-lg text-[9px] font-black border flex items-center justify-center ${showCustomHearts ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-white/5 border-white/5 text-muted-foreground'}`}
                    >
                      +
                    </button>
                  </div>
                </div>
                
                {showCustomHearts && (
                  <div className="flex gap-1.5">
                    <Input
                      type="number"
                      placeholder="Lives..."
                      value={customHearts}
                      onChange={e => setCustomHearts(e.target.value)}
                      className="h-8 bg-black/40 border-white/10 text-[10px] font-black rounded-lg text-white"
                    />
                    <Button 
                      onClick={() => { if(customHearts) { change({ maxHearts: parseInt(customHearts) }); setShowCustomHearts(false); setCustomHearts(""); }}}
                      className="h-8 px-3 bg-red-500 text-white text-[10px] font-black rounded-lg"
                    >
                      SET
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Constraints (Guess Limit) */}
          <div className="space-y-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400 opacity-70" />
                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Neural Capacity</span>
              </div>
              <Toggle 
                on={settings.guessLimitEnabled || false} 
                onToggle={() => change({ guessLimitEnabled: !settings.guessLimitEnabled })} 
                disabled={readOnly}
                color="bg-red-500"
              />
            </div>

            {settings.guessLimitEnabled && (
              <div className="space-y-2 animate-in slide-in-from-bottom-1 duration-200">
                <div className="grid grid-cols-3 gap-1.5">
                  {(['easy', 'medium', 'hard'] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => change({ guessLimitDifficulty: d })}
                      className={`py-1.5 rounded-xl text-[9px] font-black uppercase border transition-all ${
                        (settings.guessLimitDifficulty || 'easy') === d
                        ? 'bg-red-500/10 border-red-500/40 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                        : 'bg-white/[0.02] border-white/5 text-muted-foreground'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-black/40 border border-white/5">
                  <span className="text-[8px] font-bold text-muted-foreground uppercase">Calculated Cap</span>
                  <span className="text-[10px] font-black text-white tracking-widest">
                    {Math.ceil(Math.log2(settings.maxRange) * (settings.guessLimitDifficulty === 'hard' ? 1 : settings.guessLimitDifficulty === 'medium' ? 1.5 : 2))} GUESSES
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Action Footer */}
        <div className="p-5 border-t border-white/5 bg-white/[0.02]">
          <button
            onClick={onClose}
            className="w-full h-12 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest transition-all active:scale-[0.97] hover:bg-gray-200 shadow-xl"
          >
            {readOnly ? "Close" : "Update Protocol"}
          </button>
        </div>
      </div>
    </div>
  );
}
