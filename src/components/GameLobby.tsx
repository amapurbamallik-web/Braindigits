import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hash, Users, Zap, Settings2, ArrowLeft } from "lucide-react";
import logoImg from "@/assets/brain-digits-logo.png";
import { GameSettings } from "@/lib/game-types";
import { toast } from "sonner";
import { RoomSettingsModal } from "./RoomSettingsModal";
import { GlobalLogo, DeveloperFooter } from "./Branding";
import { getThemeClasses, GameMode } from "@/lib/theme-logic";
import { useAuth } from "@/contexts/AuthContext";
import React from "react";

interface GameLobbyProps {
  onCreateRoom: (name: string) => void;
  onJoinRoom: (code: string, name: string) => void;
  settings: GameSettings;
  onSettingsChange: (s: GameSettings) => void;
  onBack?: () => void;
  showSettings?: boolean;
  mode?: GameMode;
}

export function GameLobby({ onCreateRoom, onJoinRoom, settings, onSettingsChange, onBack, showSettings = true, mode = 'friends' }: GameLobbyProps) {
  const { profile } = useAuth();
  const theme = getThemeClasses(mode);
  const [playerName] = useState(() => profile?.username || `Guest-${Math.floor(1000 + Math.random() * 9000)}`);
  const [roomCode, setRoomCode] = useState("");
  const [lobbyMode, setLobbyMode] = useState<"menu" | "create" | "join">("menu");
  const [nameError, setNameError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  React.useEffect(() => {
    // Kept for structure but we auto-generate it now on mount
  }, [profile]);

  const validateName = () => {
    // Name is now auto-generated or pulled from profile, so it's always valid
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
      <div className="w-full flex justify-between items-center z-20 shrink-0 mb-4 px-2">
        <div className="flex items-center gap-4">
          {onBack && (
            <button 
              onClick={onBack} 
              className={`flex flex-shrink-0 items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 hover:border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all active:scale-95 z-50 pointer-events-auto group`}
            >
              <ArrowLeft className="w-5 h-5 md:w-4 md:h-4 shrink-0 group-hover:-translate-x-1 transition-transform" /> 
              <span className="text-sm font-bold tracking-tight">Back</span>
            </button>
          )}
          <GlobalLogo className="hidden md:flex pointer-events-auto" />
        </div>
        {/* Empty space to balance or future buttons on the right */}
      </div>

      <div className={`absolute top-[-10%] right-[-10%] w-96 h-96 ${theme.bgMuted} rounded-full blur-[100px] pointer-events-none animate-pulse`} style={{ animationDuration: '4s' }} />

      <div
        className="w-full max-w-md opacity-0 animate-fade-in-up shrink-0 my-auto py-6 relative"
        style={{ animationDelay: "0.1s" }}
      >
        {/* Logo and Settings Button */}
        {showSettings && (
          <div className="absolute top-0 right-0 opacity-0 animate-fade-in-up z-20" style={{ animationDelay: "0.2s" }}>
            <Button
              onClick={() => setShowSettingsModal(true)}
              variant="ghost"
              size="icon"
              className={`rounded-full bg-card/50 backdrop-blur-md border border-border/50 text-foreground hover:${theme.bgMuted} hover:${theme.text} hover:${theme.border} shadow-lg active:scale-95`}
              title="Room Settings"
            >
              <Settings2 className="h-5 w-5" />
            </Button>
          </div>
        )}
        
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
        {lobbyMode === "menu" && (
          <div className="space-y-3 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <Button
              onClick={() => setLobbyMode("create")}
              className={`w-full h-14 text-base font-black uppercase tracking-widest active:scale-[0.97] transition-all ${theme.primary} ${theme.hover} ${theme.textDark} ${theme.glow}`}
              size="lg"
            >
              <Zap className="h-5 w-5 mr-2" />
              {mode === 'ai' ? 'Challenge AI' : 'Create Room'}
            </Button>
            {mode !== 'ai' && (
              <Button
                onClick={() => setLobbyMode("join")}
                variant="outline"
                className={`w-full h-14 text-base font-black uppercase tracking-widest active:scale-[0.97] transition-all ${theme.border} ${theme.text} hover:${theme.bgMuted}`}
                size="lg"
              >
                <Users className="h-5 w-5 mr-2" />
                Join Room
              </Button>
            )}
          </div>
        )}

        {(lobbyMode === "create" || lobbyMode === "join") && (
          <div className="space-y-4 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className={`p-3 ${theme.bgMuted} border ${theme.border} rounded-xl flex items-center justify-between`}>
              <span className="text-muted-foreground text-sm font-semibold">Playing as:</span>
              <span className={`text-white font-black ${theme.text}`}>{playerName}</span>
            </div>
            {lobbyMode === "join" && (
              <Input
                placeholder="Room code (e.g. ABC12)"
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase());
                  setNameError("");
                }}
                maxLength={5}
                className={`h-12 text-base font-mono tracking-widest uppercase bg-card/50 border-border/50 focus-visible:${theme.ring} focus-visible:ring-offset-0`}
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
                  setLobbyMode("menu");
                  setNameError("");
                }}
                className="flex-1 h-12 active:scale-[0.97] transition-transform border-border/50 disabled:opacity-50"
              >
                Back
              </Button>
              <Button
                disabled={isConnecting}
                onClick={lobbyMode === "create" ? handleCreate : handleJoin}
                className={`flex-1 h-12 font-black uppercase tracking-widest active:scale-[0.97] transition-all ${theme.primary} ${theme.hover} ${theme.textDark} ${theme.glow} disabled:opacity-90`}
              >
                {isConnecting ? "Connecting..." : lobbyMode === "create" ? (mode === 'ai' ? "Launch" : "Create") : "Join"}
              </Button>
            </div>
          </div>
        )}

        {showSettings && (
          <RoomSettingsModal
            open={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            settings={settings}
            onSettingsChange={onSettingsChange}
            readOnly={false}
          />
        )}
      </div>

      <DeveloperFooter className="shrink-0 mt-8 mb-2 z-10 opacity-100 animate-fade-in-up" />
    </div>
  );
}
