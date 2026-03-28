import { useState } from "react";
import { Users, Bot, HelpCircle, X, Settings2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/brain-digits-logo.png";
import { GameSettings } from "@/lib/game-types";
import { useAudio } from "@/contexts/AudioContext";

interface ModeSelectionProps {
  onSelectMode: (mode: "friends" | "ai") => void;
  settings: GameSettings;
  onSettingsChange: (s: GameSettings) => void;
}

export function ModeSelection({ onSelectMode, settings, onSettingsChange }: ModeSelectionProps) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { isSoundEnabled, toggleSound } = useAudio();

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-game-dark">
      <div 
        className="w-full max-w-md opacity-0 animate-fade-in-up"
        style={{ animationDelay: "0.1s" }}
      >
        {/* Logo Section */}
        <div className="text-center mb-8">
          <img
            src={logoImg}
            alt="BrainDigits Logo"
            className="w-56 h-56 mx-auto mb-4 drop-shadow-[0_0_30px_rgba(0,229,255,0.15)] hover:scale-105 transition-transform duration-500"
          />
          <p className="text-muted-foreground font-medium" style={{ textWrap: "pretty" }}>
            Compete with friends or challenge the AI offline. The fastest mind wins!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={() => onSelectMode("friends")}
            className="w-full h-14 text-base font-semibold active:scale-[0.97] transition-all bg-game-cyan hover:bg-game-cyan/90 text-game-dark shadow-[0_0_15px_rgba(0,229,255,0.2)]"
            size="lg"
          >
            <Users className="h-5 w-5 mr-2" />
            Play with Friends
          </Button>
          
          <Button
            onClick={() => onSelectMode("ai")}
            className="w-full h-14 text-base font-semibold active:scale-[0.97] transition-all bg-game-purple hover:bg-game-purple/90 text-white shadow-[0_0_15px_rgba(171,71,188,0.2)]"
            size="lg"
          >
            <Bot className="h-5 w-5 mr-2" />
            Play with AI
          </Button>

          <div className="pt-2 flex gap-3">
            <Button
              onClick={() => setShowInstructions(true)}
              variant="ghost"
              className="flex-1 h-12 text-sm text-muted-foreground hover:text-game-amber hover:bg-game-amber/10"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              How to Play
            </Button>
            
            <Button
              onClick={() => setShowSettings(true)}
              variant="ghost"
              className="flex-1 h-12 text-sm text-muted-foreground hover:text-white hover:bg-white/10"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Existing Instructions Modal */}
        {showInstructions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm fade-in duration-200">
            <div className="w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl border border-border/30 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-foreground">How to Play</h2>
                <button
                  onClick={() => setShowInstructions(false)}
                  className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground active:scale-95 transition-transform"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-game-cyan/15 text-game-cyan font-bold flex items-center justify-center text-xs">1</span>
                  <p><strong className="text-foreground">Choose Mode</strong> — Play multiplayer with friends via a room code, or play offline against the AI Bot!</p>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-game-amber/15 text-game-amber font-bold flex items-center justify-center text-xs">2</span>
                  <p><strong className="text-foreground">Guess the Number</strong> — A secret number between 1–100 is generated. Players take turns guessing.</p>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-game-purple/15 text-game-purple font-bold flex items-center justify-center text-xs">3</span>
                  <p><strong className="text-foreground">Get Hints</strong> — After each guess you'll see "Higher" or "Lower". Use these hints to narrow down the target.</p>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-game-success/15 text-game-success font-bold flex items-center justify-center text-xs">4</span>
                  <p><strong className="text-foreground">Win!</strong> — First player to guess correctly wins the round and earns a point. Play multiple rounds!</p>
                </div>
              </div>
              <Button
                onClick={() => setShowInstructions(false)}
                className="w-full mt-6 h-11 bg-game-cyan hover:bg-game-cyan/90 text-game-dark font-semibold active:scale-[0.97] transition-transform"
              >
                Got it!
              </Button>
            </div>
          </div>
        )}

        {/* New Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm fade-in duration-200">
            <div className="w-full max-w-sm bg-card rounded-3xl p-6 shadow-2xl border border-border/20 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-game-cyan" /> Game Settings
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-muted-foreground active:scale-95 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Max Range Toggle Group */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Number Range</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[100, 200, 500, 1000].map(val => (
                      <button
                        key={val}
                        role="radio"
                        aria-checked={settings.maxRange === val}
                        onClick={() => onSettingsChange({ ...settings, maxRange: val })}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                          settings.maxRange === val 
                            ? 'bg-game-cyan/20 border-game-cyan text-game-cyan shadow-[0_0_10px_rgba(0,229,255,0.2)]'
                            : 'bg-black/30 border-transparent text-muted-foreground hover:bg-black/50'
                        }`}
                      >
                        1-{val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timer Toggle & Duration */}
                <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">Turn Timer</p>
                      <p className="text-xs text-muted-foreground">Add a time limit per guess</p>
                    </div>
                    <button 
                      onClick={() => onSettingsChange({ ...settings, timerEnabled: !settings.timerEnabled })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${settings.timerEnabled ? 'bg-game-cyan' : 'bg-muted'}`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.timerEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  
                  {settings.timerEnabled && (
                    <div className="pt-2 flex gap-2">
                      {[10000, 15000, 30000].map(duration => (
                        <button
                          key={duration}
                          onClick={() => onSettingsChange({ ...settings, timerDuration: duration })}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                            settings.timerDuration === duration 
                              ? 'bg-game-purple/20 border-game-purple text-game-purple' 
                              : 'bg-black/40 border-transparent text-muted-foreground hover:bg-black/60'
                          }`}
                        >
                          {duration / 1000}s
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Game Audio */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5">
                  <div className="flex items-center gap-3">
                    {isSoundEnabled ? <Volume2 className="w-5 h-5 text-game-amber" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
                    <div>
                      <p className="text-sm font-medium text-white">Sound Effects</p>
                      <p className="text-xs text-muted-foreground">Ticks, clicks & buzzers</p>
                    </div>
                  </div>
                  <button 
                    onClick={toggleSound}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${isSoundEnabled ? 'bg-game-amber/20 text-game-amber' : 'bg-muted/30 text-muted-foreground'}`}
                  >
                    {isSoundEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              <Button
                onClick={() => setShowSettings(false)}
                className="w-full mt-8 h-12 bg-white hover:bg-gray-200 text-black font-bold text-base rounded-xl active:scale-[0.98] transition-transform"
              >
                Save & Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
