import { GameState } from "@/lib/game-types";
import { Button } from "@/components/ui/button";
import { Copy, Check, Users, Settings2 } from "lucide-react";
import { useState } from "react";
import { RoomSettingsModal } from "./RoomSettingsModal";
import { FriendsListModal } from "./FriendsListModal";
import { GlobalLogo, DeveloperFooter } from "./Branding";

interface WaitingRoomProps {
  gameState: GameState;
  isHost: boolean;
  onStart: () => void;
  onLeave: () => void;
  onUpdateSettings: (s: import("@/lib/game-types").GameSettings) => void;
}

export function WaitingRoom({ gameState, isHost, onStart, onLeave, onUpdateSettings }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFriends, setShowFriends] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(gameState.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[100dvh] p-4 md:p-6 bg-game-dark overflow-y-auto overflow-x-hidden relative">
      <div className="w-full flex justify-end md:justify-between items-center z-20 pointer-events-none shrink-0 mb-4">
        <GlobalLogo className="hidden md:flex pointer-events-auto" />
      </div>

      <div className="w-full max-w-md my-auto py-6 shrink-0 relative z-10 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <div className="absolute top-0 right-0 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
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

        <div className="inline-flex items-center gap-2 rounded-full bg-game-cyan/10 px-4 py-1.5 mb-6">
          <Users className="h-4 w-4 text-game-cyan" />
          <span className="text-sm font-medium text-game-cyan">Waiting for players</span>
        </div>

        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-2">Share this code</p>
          <button
            onClick={copyCode}
            className="inline-flex items-center gap-3 rounded-xl bg-card px-6 py-4 shadow-md hover:shadow-lg transition-shadow active:scale-[0.97] border border-border/50"
          >
            <span className="font-mono text-3xl font-bold tracking-[0.25em] text-game-cyan">
              {gameState.roomCode}
            </span>
            {copied ? (
              <Check className="h-5 w-5 text-game-success" />
            ) : (
              <Copy className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </div>

        <Button
          onClick={() => setShowFriends(true)}
          variant="outline"
          className="w-full mb-6 h-12 border-game-purple/30 text-game-purple hover:bg-game-purple/10 font-bold active:scale-[0.97]"
        >
          <Users className="w-5 h-5 mr-2" />
          Invite Friends
        </Button>

        <div className="bg-card rounded-xl p-5 shadow-sm mb-6 border border-border/50">
          <p className="text-sm font-medium text-muted-foreground mb-3">
            Players ({gameState.players.length})
          </p>
          <div className="space-y-2">
            {gameState.players.map((player, i) => (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5 opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${0.2 + i * 0.1}s` }}
              >
                <span className="font-medium">{player.name}</span>
                {player.isHost && (
                  <span className="text-xs font-medium text-game-amber bg-game-amber/10 rounded-full px-2 py-0.5">
                    Host
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onLeave} className="flex-1 h-12 active:scale-[0.97] transition-transform border-border/50">
            Leave
          </Button>
          {isHost && (
            <Button
              onClick={onStart}
              disabled={gameState.players.length < 2}
              className="flex-1 h-12 font-semibold active:scale-[0.97] transition-transform bg-game-cyan hover:bg-game-cyan/90 text-game-dark"
            >
              {gameState.players.length < 2 ? "Need 2+ players" : "Start Game"}
            </Button>
          )}
        </div>
        {!isHost && (
          <p className="text-sm text-muted-foreground mt-4">Waiting for host to start…</p>
        )}

        <RoomSettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          settings={{
            maxRange: gameState.maxRange,
            timerEnabled: gameState.timerEnabled ?? false,
            timerDuration: gameState.timerDuration ?? 15000,
          }}
          onSettingsChange={onUpdateSettings}
          readOnly={!isHost}
        />

        <FriendsListModal
          open={showFriends}
          onClose={() => setShowFriends(false)}
          roomCode={gameState.roomCode}
        />
      </div>
      <DeveloperFooter className="shrink-0 mt-8 mb-2 z-10 opacity-100" />
    </div>
  );
}
