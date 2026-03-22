import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hash, Users, Zap, HelpCircle, X } from "lucide-react";
import logoImg from "@/assets/brain-digits-logo.png";

interface GameLobbyProps {
  onCreateRoom: (name: string) => void;
  onJoinRoom: (code: string, name: string) => void;
}

export function GameLobby({ onCreateRoom, onJoinRoom }: GameLobbyProps) {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [nameError, setNameError] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);

  const validateName = () => {
    const trimmed = playerName.trim();
    if (!trimmed) {
      setNameError("Enter your name");
      return false;
    }
    if (trimmed.length > 20) {
      setNameError("Name too long (max 20 chars)");
      return false;
    }
    setNameError("");
    return true;
  };

  const handleCreate = () => {
    if (!validateName()) return;
    onCreateRoom(playerName.trim());
  };

  const handleJoin = () => {
    if (!validateName()) return;
    if (!roomCode.trim() || roomCode.trim().length !== 5) {
      setNameError("Enter a valid 5-character room code");
      return;
    }
    onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim());
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-game-dark">
      <div
        className="w-full max-w-md opacity-0 animate-fade-in-up"
        style={{ animationDelay: "0.1s" }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src={logoImg}
            alt="BrainDigits - Multiplayer Number Guessing Arena"
            className="w-56 h-56 mx-auto mb-4 drop-shadow-2xl"
          />
          <p className="text-muted-foreground text-sm" style={{ textWrap: "pretty" }}>
            Compete with friends to guess the hidden number. Fastest mind wins.
          </p>
        </div>

        {/* Actions */}
        {mode === "menu" && (
          <div className="space-y-3 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <Button
              onClick={() => setMode("create")}
              className="w-full h-14 text-base font-semibold active:scale-[0.97] transition-transform bg-game-cyan hover:bg-game-cyan/90 text-game-dark"
              size="lg"
            >
              <Zap className="h-5 w-5 mr-2" />
              Create Room
            </Button>
            <Button
              onClick={() => setMode("join")}
              variant="outline"
              className="w-full h-14 text-base font-semibold active:scale-[0.97] transition-transform border-game-cyan/30 text-game-cyan hover:bg-game-cyan/10"
              size="lg"
            >
              <Users className="h-5 w-5 mr-2" />
              Join Room
            </Button>
            <Button
              onClick={() => setShowInstructions(true)}
              variant="ghost"
              className="w-full h-12 text-sm text-muted-foreground hover:text-game-amber hover:bg-game-amber/10"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              How to Play
            </Button>
          </div>
        )}

        {(mode === "create" || mode === "join") && (
          <div className="space-y-4 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <Input
              placeholder="Your name"
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                setNameError("");
              }}
              maxLength={20}
              className="h-12 text-base bg-card/50 border-border/50"
              autoFocus
            />
            {mode === "join" && (
              <Input
                placeholder="Room code (e.g. ABC12)"
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase());
                  setNameError("");
                }}
                maxLength={5}
                className="h-12 text-base font-mono tracking-widest uppercase bg-card/50 border-border/50"
              />
            )}
            {nameError && (
              <p className="text-sm text-destructive">{nameError}</p>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setMode("menu");
                  setNameError("");
                }}
                className="flex-1 h-12 active:scale-[0.97] transition-transform border-border/50"
              >
                Back
              </Button>
              <Button
                onClick={mode === "create" ? handleCreate : handleJoin}
                className="flex-1 h-12 font-semibold active:scale-[0.97] transition-transform bg-game-cyan hover:bg-game-cyan/90 text-game-dark"
              >
                {mode === "create" ? "Create" : "Join"}
              </Button>
            </div>
          </div>
        )}

        {/* Instructions Modal */}
        {showInstructions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl border border-border/30 opacity-0 animate-scale-in">
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
                  <p><strong className="text-foreground">Create or Join</strong> — One player creates a room and shares the 5-letter code. Others join with the code.</p>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-game-amber/15 text-game-amber font-bold flex items-center justify-center text-xs">2</span>
                  <p><strong className="text-foreground">Guess the Number</strong> — A secret number between 1–100 is generated. Players take turns guessing.</p>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-game-purple/15 text-game-purple font-bold flex items-center justify-center text-xs">3</span>
                  <p><strong className="text-foreground">Get Hints</strong> — After each guess you'll see "Higher" or "Lower". Only you see your hints — opponents can't!</p>
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
