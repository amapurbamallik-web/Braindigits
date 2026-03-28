import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hash, Users, Zap } from "lucide-react";
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

      </div>
    </div>
  );
}
