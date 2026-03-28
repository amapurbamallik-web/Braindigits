import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hash, Users, Zap, Settings2 } from "lucide-react";
import logoImg from "@/assets/brain-digits-logo.png";
import { GameSettings } from "@/lib/game-types";
import { toast } from "sonner";
import { RoomSettingsModal } from "./RoomSettingsModal";
import { GlobalLogo, DeveloperFooter } from "./Branding";
import { useAuth } from "@/contexts/AuthContext";
import React from "react";

interface GameLobbyProps {
  onCreateRoom: (name: string) => void;
  onJoinRoom: (code: string, name: string) => void;
  settings: GameSettings;
  onSettingsChange: (s: GameSettings) => void;
}

export function GameLobby({ onCreateRoom, onJoinRoom, settings, onSettingsChange }: GameLobbyProps) {
  const { profile } = useAuth();
  const [playerName, setPlayerName] = useState(profile?.username || "");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [nameError, setNameError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  React.useEffect(() => {
    if (profile?.username) {
      setPlayerName(profile.username);
    }
  }, [profile]);

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
    if (isConnecting) return;
    if (!validateName()) return;
    setIsConnecting(true);
    onCreateRoom(playerName.trim());
    setTimeout(() => setIsConnecting(false), 5000); // Unlock if connection drops
  };

  const handleJoin = () => {
    if (isConnecting) return;
    if (!validateName()) return;
    if (!roomCode.trim() || roomCode.trim().length !== 5) {
      setNameError("Enter a valid 5-character room code");
      return;
    }
    setIsConnecting(true);
    onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim());
    setTimeout(() => setIsConnecting(false), 5000); // Unlock if connection drops
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[100dvh] p-4 md:p-6 bg-game-dark overflow-y-auto overflow-x-hidden relative">
      <div className="w-full flex justify-end md:justify-between items-center z-20 pointer-events-none shrink-0 mb-4">
        <GlobalLogo className="hidden md:flex pointer-events-auto" />
      </div>

      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-game-cyan/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />

      <div
        className="w-full max-w-md opacity-0 animate-fade-in-up shrink-0 my-auto py-6 relative"
        style={{ animationDelay: "0.1s" }}
      >
        {/* Logo and Settings Button */}
        <div className="absolute top-0 right-0 opacity-0 animate-fade-in-up z-20" style={{ animationDelay: "0.2s" }}>
          <Button
            onClick={() => setShowSettings(true)}
            variant="ghost"
            size="icon"
            className="rounded-full bg-card/50 backdrop-blur-md border border-border/50 text-foreground hover:bg-game-cyan/10 hover:text-game-cyan hover:border-game-cyan/30 shadow-lg active:scale-95"
            title="Room Settings"
          >
            <Settings2 className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="text-center mb-8">
          <img
            src={logoImg}
            alt="BrainDigits - Multiplayer Number Guessing Arena"
            className="w-56 h-56 mx-auto mb-4 object-contain object-center -translate-x-3 md:-translate-x-4 drop-shadow-2xl"
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
            {profile?.username ? (
              <div className="p-3 bg-game-cyan/10 border border-game-cyan/20 rounded-xl flex items-center justify-between">
                <span className="text-muted-foreground text-sm font-semibold">Playing as:</span>
                <span className="text-white font-bold">{profile.username}</span>
              </div>
            ) : (
              <Input
                placeholder="Your name"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  setNameError("");
                }}
                maxLength={20}
                className="h-12 text-base bg-card/50 border-border/50"
                autoFocus={mode === "create"}
              />
            )}
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
                disabled={isConnecting}
                onClick={() => {
                  setMode("menu");
                  setNameError("");
                }}
                className="flex-1 h-12 active:scale-[0.97] transition-transform border-border/50 disabled:opacity-50"
              >
                Back
              </Button>
              <Button
                disabled={isConnecting}
                onClick={mode === "create" ? handleCreate : handleJoin}
                className="flex-1 h-12 font-semibold active:scale-[0.97] transition-transform bg-game-cyan hover:bg-game-cyan/90 text-game-dark disabled:opacity-90"
              >
                {isConnecting ? "Connecting..." : mode === "create" ? "Create" : "Join"}
              </Button>
            </div>
          </div>
        )}

        <RoomSettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onSettingsChange={onSettingsChange}
          readOnly={false}
        />
      </div>

      <DeveloperFooter className="shrink-0 mt-8 mb-2 z-10 opacity-100 animate-fade-in-up" />
    </div>
  );
}
