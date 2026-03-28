import { useState } from "react";
import { Users, Bot, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/brain-digits-logo.png";

interface ModeSelectionProps {
  onSelectMode: (mode: "friends" | "ai") => void;
}

export function ModeSelection({ onSelectMode }: ModeSelectionProps) {
  const [showInstructions, setShowInstructions] = useState(false);

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

          <div className="pt-2">
            <Button
              onClick={() => setShowInstructions(true)}
              variant="ghost"
              className="w-full h-12 text-sm text-muted-foreground hover:text-game-amber hover:bg-game-amber/10"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              How to Play
            </Button>
          </div>
        </div>

        {/* Instructions Modal */}
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
      </div>
    </div>
  );
}
