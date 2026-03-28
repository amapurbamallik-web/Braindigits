import { useState, useEffect, useRef } from "react";
import { ModeSelection } from "@/components/ModeSelection";
import { GameLobby } from "@/components/GameLobby";
import { WaitingRoom } from "@/components/WaitingRoom";
import { GameBoard } from "@/components/GameBoard";
import { GameSettings, DEFAULT_SETTINGS } from "@/lib/game-types";

import { useGameRoom } from "@/hooks/useGameRoom";
import { useAIGame } from "@/hooks/useAIGame";
import { useGameSounds } from "@/hooks/useGameSounds";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAudio } from "@/contexts/AudioContext";
import { GlobalLogo, DeveloperFooter } from "@/components/Branding";

function MultiplayerWrapper({ onExit, settings, onSettingsChange, initialRoomCode }: { onExit: () => void, settings: GameSettings, onSettingsChange: (s: GameSettings) => void, initialRoomCode?: string | null }) {
  const { profile } = useAuth();
  const {
    gameState,
    playerId,
    isMyTurn,
    isHost,
    createRoom,
    joinRoom,
    startGame,
    makeGuess,
    restartGame,
    leaveRoom,
    leaveGameEarly,
    updateRoomSettings,
  } = useGameRoom();

  const handleCreateRoom = (name: string) => {
    createRoom(name, settings);
  };

  useEffect(() => {
    if (initialRoomCode && !gameState) {
      joinRoom(initialRoomCode, profile?.username || "Player");
    }
  }, [initialRoomCode, gameState, joinRoom, profile?.username]);

  useGameSounds(gameState, playerId);

  const handleLeave = () => {
    leaveRoom();
    onExit();
  };

  const handleLeaveEarly = () => {
    leaveGameEarly();
    onExit();
  };

  if (!gameState) {
    return (
      <div className="relative min-h-screen">
        <button 
          onClick={onExit} 
          className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-md border border-border/50 text-foreground hover:bg-game-cyan/10 hover:text-game-cyan hover:border-game-cyan/30 shadow-lg transition-all active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <GameLobby onCreateRoom={handleCreateRoom} onJoinRoom={joinRoom} settings={settings} onSettingsChange={onSettingsChange} />
      </div>
    );
  }

  if (gameState.status === "waiting") {
    return <WaitingRoom gameState={gameState} isHost={isHost} onStart={startGame} onLeave={handleLeave} onUpdateSettings={updateRoomSettings} />;
  }

  return (
    <GameBoard
      gameState={gameState}
      playerId={playerId}
      isMyTurn={isMyTurn}
      onGuess={makeGuess}
      onRestart={restartGame}
      onLeave={handleLeave}
      onLeaveEarly={handleLeaveEarly}
      onUpdateSettings={updateRoomSettings}
      isHost={isHost}
    />
  );
}

function AIWrapper({ onExit, settings }: { onExit: () => void, settings: GameSettings }) {
  const { profile } = useAuth();
  const [playerName, setPlayerName] = useState(profile?.username || "");
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    if (profile?.username) setPlayerName(profile.username);
  }, [profile]);

  const {
    gameState,
    playerId,
    isMyTurn,
    isHost,
    makeGuess,
    restartGame,
    leaveRoom,
    leaveGameEarly,
    updateRoomSettings,
  } = useAIGame(isStarted ? playerName || "Player" : "", settings);

  useGameSounds(gameState, playerId);

  const handleLeave = () => {
    leaveRoom();
    onExit();
  };

  const handleLeaveEarly = () => {
    leaveGameEarly();
    onExit();
  };

  if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-game-dark relative overflow-hidden">
        {/* Animated background matching ModeSelection */}
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-game-purple/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '5s' }} />

        <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center z-20 pointer-events-none">
          <GlobalLogo className="hidden md:flex pointer-events-auto" />
        </div>

        <button 
          onClick={onExit} 
          className="absolute top-20 left-6 md:top-6 md:left-[200px] flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-md border border-game-purple/20 text-foreground hover:bg-game-purple/10 hover:text-game-purple hover:border-game-purple/30 shadow-lg transition-all active:scale-95 z-50 pointer-events-auto"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <div className="max-w-md w-full p-6 md:p-10 rounded-3xl bg-card/60 backdrop-blur-xl border border-game-purple/20 shadow-[0_0_50px_rgba(171,71,188,0.15)] text-center animate-in fade-in zoom-in duration-500 relative z-10">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-3 md:mb-4 tracking-tight text-white drop-shadow-md">Play with AI</h2>
          <p className="text-game-purple/80 text-base md:text-lg mb-6 md:mb-8 font-medium">Enter your name to challenge the bot.</p>
          {profile?.username ? (
            <div className="mb-6 p-4 bg-game-purple/10 border border-game-purple/20 rounded-2xl flex flex-col items-center gap-1">
              <span className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Playing as</span>
              <span className="text-2xl font-extrabold text-white">{profile.username}</span>
            </div>
          ) : (
            <input 
              type="text" 
              placeholder="Your name" 
              className="w-full p-3 md:p-4 rounded-xl bg-background/80 border border-game-purple/30 mb-6 focus:ring-2 focus:ring-game-purple outline-none transition-all text-white text-base md:text-lg placeholder:text-muted-foreground/50 text-center"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setIsStarted(true)}
              autoFocus
            />
          )}
          <button 
            className="w-full p-3 md:p-4 rounded-xl bg-game-purple hover:bg-game-purple/90 active:scale-[0.98] text-white font-bold text-base md:text-lg transition-all shadow-[0_0_20px_rgba(171,71,188,0.4)]"
            onClick={() => setIsStarted(true)}
          >
            Start Match
          </button>
        </div>

        <DeveloperFooter className="absolute bottom-6 left-0 right-0 z-10 opacity-0 animate-fade-in-up" />
      </div>
    );
  }

  if (!gameState) return null;

  return (
    <GameBoard
      gameState={gameState}
      playerId={playerId}
      isMyTurn={isMyTurn}
      onGuess={makeGuess}
      onRestart={restartGame}
      onLeave={handleLeave}
      onLeaveEarly={handleLeaveEarly}
      onUpdateSettings={updateRoomSettings}
      isHost={isHost}
    />
  );
}

export default function Index() {
  const [mode, setMode] = useState<"select" | "friends" | "ai">("select");
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [pendingInvite, setPendingInvite] = useState<{roomCode: string, senderName: string} | null>(null);

  const { user, profile } = useAuth();
  const { playSfx } = useAudio();

  const modeRef = useRef(mode);
  
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    if (!user) return;
    
    const channel = supabase.channel(`player-invites:${user.id}`);
    
    channel.on('broadcast', { event: 'match_invite' }, (payload) => {
      const { roomCode, senderName, senderId } = payload.payload;
      
      // Auto-reject if user is already playing a game
      if (modeRef.current !== "select") {
        if (senderId && profile) {
          const rejectChannel = supabase.channel(`player-invites:${senderId}`);
          rejectChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              rejectChannel.send({
                type: 'broadcast',
                event: 'invite_rejected',
                payload: { reason: "in_game", responderName: profile.username }
              });
              setTimeout(() => supabase.removeChannel(rejectChannel), 1000);
            }
          });
        }
        return; // Ignore the invite entirely
      }

      playSfx('notification');
      // Trigger cinematic modal instead of small toast
      setPendingInvite({ roomCode, senderName });
    });
    
    channel.on('broadcast', { event: 'invite_rejected' }, (payload) => {
      const { reason, responderName } = payload.payload;
      if (reason === "in_game") {
        toast.error(`${responderName} is currently in a match!`, { duration: 4000 });
      }
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  const renderContent = () => {
    if (mode === "friends") {
      return <MultiplayerWrapper onExit={() => { setMode("select"); setInviteCode(null); }} settings={settings} onSettingsChange={setSettings} initialRoomCode={inviteCode} />;
    }

    if (mode === "ai") {
      return <AIWrapper onExit={() => setMode("select")} settings={settings} />;
    }

    return <ModeSelection onSelectMode={setMode} settings={settings} onSettingsChange={setSettings} />;
  };

  return (
    <>
      {renderContent()}

      {/* Cinematic Live Invite Modal */}
      {pendingInvite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-game-dark border border-game-cyan/30 rounded-[2rem] shadow-[0_0_80px_rgba(0,229,255,0.2)] p-8 text-center animate-in zoom-in-95 relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-20%] w-48 h-48 bg-game-cyan/20 rounded-full blur-[80px]" />
            <div className="absolute bottom-[-20%] right-[-20%] w-48 h-48 bg-game-purple/20 rounded-full blur-[80px]" />
            
            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto rounded-full bg-game-cyan/10 border-2 border-game-cyan/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,229,255,0.3)] animate-pulse" style={{ animationDuration: '2s' }}>
                <span className="text-3xl">⚔️</span>
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Match Challenge</h2>
              <p className="text-muted-foreground mb-8 text-sm">
                <strong className="text-white text-lg block mb-1">{pendingInvite.senderName}</strong> has invited you to play BrainDigits!
              </p>
              
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => {
                    playSfx('join');
                    setInviteCode(pendingInvite.roomCode);
                    setMode("friends");
                    setPendingInvite(null);
                  }}
                  className="w-full h-14 bg-game-cyan hover:bg-game-cyan/90 text-game-dark font-black text-lg shadow-[0_0_20px_rgba(0,229,255,0.4)] active:scale-[0.98] transition-all"
                >
                  Accept & Join
                </Button>
                <Button 
                  onClick={() => {
                    playSfx('click');
                    setPendingInvite(null);
                  }}
                  variant="outline"
                  className="w-full h-14 bg-transparent border-white/10 text-muted-foreground hover:bg-white/5 hover:text-white font-bold transition-all active:scale-95"
                >
                  Decline
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
