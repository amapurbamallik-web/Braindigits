import { useState } from "react";
import { X, Settings2, Volume2, VolumeX } from "lucide-react";
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

export function RoomSettingsModal({
  open,
  onClose,
  settings,
  onSettingsChange,
  readOnly = false,
}: RoomSettingsModalProps) {
  const [customRangeInput, setCustomRangeInput] = useState("");
  const [customTimerInput, setCustomTimerInput] = useState("");
  const { isSoundEnabled, toggleSound } = useAudio();

  if (!open) return null;

  const handleRangeChange = (val: number) => {
    if (!readOnly && onSettingsChange) {
      onSettingsChange({ ...settings, maxRange: val });
    }
  };

  const handleTimerEnabledChange = () => {
    if (!readOnly && onSettingsChange) {
      onSettingsChange({ ...settings, timerEnabled: !settings.timerEnabled });
    }
  };

  const handleTimerDurationChange = (val: number) => {
    if (!readOnly && onSettingsChange) {
      onSettingsChange({ ...settings, timerDuration: val });
    }
  };

  const handleCustomRangeSubmit = () => {
    if (readOnly) return;
    const val = parseInt(customRangeInput);
    if (!isNaN(val) && val > 1 && onSettingsChange) {
      onSettingsChange({ ...settings, maxRange: val });
      setCustomRangeInput("");
    }
  };

  const handleCustomTimerSubmit = () => {
    if (readOnly) return;
    const val = parseInt(customTimerInput);
    if (!isNaN(val) && val >= 5 && onSettingsChange) {
      onSettingsChange({ ...settings, timerDuration: val * 1000 });
      setCustomTimerInput("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm fade-in duration-200">
      <div className="w-full max-w-sm bg-card rounded-3xl p-6 shadow-2xl border border-border/20 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-game-cyan" /> 
            {readOnly ? "Room Settings" : "Game Settings"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-muted-foreground active:scale-95 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Max Range Toggle Group */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Number Range</label>
              {![100, 200, 500, 1000].includes(settings.maxRange) && (
                <span className="text-xs font-bold text-game-cyan bg-game-cyan/10 px-2 py-0.5 rounded-full border border-game-cyan/20">
                  Custom: 1-{settings.maxRange}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[100, 200, 500, 1000].map(val => (
                <button
                  key={val}
                  disabled={readOnly}
                  role="radio"
                  aria-checked={settings.maxRange === val}
                  onClick={() => handleRangeChange(val)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    settings.maxRange === val 
                      ? 'bg-game-cyan/20 border-game-cyan text-game-cyan shadow-[0_0_10px_rgba(0,229,255,0.2)]'
                      : 'bg-black/30 border-transparent text-muted-foreground ' + (readOnly ? '' : 'hover:bg-black/50 cursor-pointer')
                  } ${readOnly ? 'cursor-default opacity-90' : ''}`}
                >
                  1-{val}
                </button>
              ))}
            </div>
            {!readOnly && (
              <div className="flex gap-2 relative mt-2">
                <Input
                  type="number"
                  placeholder="Custom Max (e.g. 999)"
                  value={customRangeInput}
                  onChange={(e) => setCustomRangeInput(e.target.value)}
                  className="bg-black/20 border-white/10 text-sm h-10 flex-1 focus-visible:ring-game-cyan/50 text-white placeholder:text-muted-foreground/50"
                  onKeyDown={(e) => e.key === "Enter" && handleCustomRangeSubmit()}
                />
                <Button 
                  onClick={handleCustomRangeSubmit}
                  className="h-10 px-4 bg-game-cyan hover:bg-game-cyan/90 text-game-dark font-bold transition-transform active:scale-95"
                >
                  Set
                </Button>
              </div>
            )}
          </div>

          {/* Timer Toggle & Duration */}
          <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Turn Timer</p>
                <p className="text-xs text-muted-foreground">Limit time per guess</p>
              </div>
              <button 
                disabled={readOnly}
                onClick={handleTimerEnabledChange}
                className={`relative w-12 h-6 rounded-full transition-colors ${readOnly ? 'cursor-default' : 'cursor-pointer'} ${settings.timerEnabled ? 'bg-game-cyan' : 'bg-muted'}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.timerEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
            
            {settings.timerEnabled && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {![10000, 15000, 30000].includes(settings.timerDuration ?? 15000) && (
                    <span className="text-xs font-bold text-game-purple bg-game-purple/10 px-2 py-0.5 rounded-full border border-game-purple/20 block ml-auto">
                      Custom: {(settings.timerDuration ?? 15000) / 1000}s
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[10000, 15000, 30000].map(duration => (
                    <button
                      key={duration}
                      disabled={readOnly}
                      onClick={() => handleTimerDurationChange(duration)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        settings.timerDuration === duration 
                          ? 'bg-game-purple/20 border-game-purple text-game-purple shadow-[0_0_10px_rgba(171,71,188,0.2)]' 
                          : 'bg-black/30 border-transparent text-muted-foreground ' + (readOnly ? '' : 'hover:bg-black/50 cursor-pointer')
                      } ${readOnly ? 'cursor-default opacity-90' : ''}`}
                    >
                      {duration / 1000}s
                    </button>
                  ))}
                </div>
                {!readOnly && (
                  <div className="flex gap-2 relative mt-2">
                    <Input
                      type="number"
                      placeholder="Custom Time (secs)"
                      value={customTimerInput}
                      onChange={(e) => setCustomTimerInput(e.target.value)}
                      className="bg-black/20 border-white/10 text-sm h-10 flex-1 focus-visible:ring-game-purple/50 text-white placeholder:text-muted-foreground/50"
                      onKeyDown={(e) => e.key === "Enter" && handleCustomTimerSubmit()}
                    />
                    <Button 
                      onClick={handleCustomTimerSubmit}
                      className="h-10 px-4 bg-game-purple hover:bg-game-purple/90 text-white font-bold transition-transform active:scale-95"
                    >
                      Set
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Game Audio */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5">
            <div className="flex items-center gap-3">
              {isSoundEnabled ? <Volume2 className="w-5 h-5 text-game-amber" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
              <div>
                <p className="text-sm font-medium text-white">Sound Effects</p>
                <p className="text-xs text-muted-foreground">Personal device audio</p>
              </div>
            </div>
            <button 
              onClick={toggleSound}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer ${isSoundEnabled ? 'bg-game-amber/20 text-game-amber' : 'bg-muted/30 text-muted-foreground'}`}
            >
              {isSoundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <Button
          onClick={onClose}
          className="w-full mt-8 h-12 bg-white hover:bg-gray-200 text-black font-bold text-base rounded-xl active:scale-[0.98] transition-transform"
        >
          {readOnly ? 'Close Settings' : 'Save & Close'}
        </Button>
      </div>
    </div>
  );
}
