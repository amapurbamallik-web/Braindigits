import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ModeSelection } from "@/components/ModeSelection";
import { GameLobby } from "@/components/GameLobby";
import { WaitingRoom } from "@/components/WaitingRoom";
import { GameBoard } from "@/components/GameBoard";
import { ArcadeBoard } from "@/components/ArcadeBoard";
import { GameSettings, DEFAULT_SETTINGS } from "@/lib/game-types";

import { useGameRoom } from "@/hooks/useGameRoom";
import { useAIGame } from "@/hooks/useAIGame";
import { useArcadeGame } from "@/hooks/useArcadeGame";
import { useGameSounds } from "@/hooks/useGameSounds";
import { ArrowLeft, Star, Users, Zap } from "lucide-react";
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
    kickPlayer,
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
  };

  const handleLeaveEarly = () => {
    leaveGameEarly();
  };

  // Transition out handled purely by parent component's mode change

  if (!gameState) {
    return (
      <GameLobby 
        onCreateRoom={handleCreateRoom} 
        onJoinRoom={joinRoom} 
        settings={settings} 
        onSettingsChange={onSettingsChange} 
        onBack={onExit}
        mode="friends"
      />
    );
  }

  if (gameState.status === "waiting") {
    return <WaitingRoom gameState={gameState} isHost={isHost} onStart={startGame} onLeave={handleLeave} onUpdateSettings={updateRoomSettings} onKick={kickPlayer} mode="friends" />;
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
      mode="friends"
    />
  );
}

function AIWrapper({ onExit, settings }: { onExit: () => void, settings: GameSettings }) {
  const { profile } = useAuth();
  const [playerName] = useState(() => profile?.username || `Guest-${Math.floor(1000 + Math.random() * 9000)}`);
  const [isStarted, setIsStarted] = useState(false);

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
    setIsStarted(false);
  };

  const handleLeaveEarly = () => {
    leaveGameEarly();
    setIsStarted(false);
  };

  // Transition done via Index state

    if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-game-dark relative overflow-hidden">
        {/* Animated background matching ModeSelection */}
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-game-amber/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '5s' }} />

        <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center z-20 pointer-events-none">
          <GlobalLogo className="hidden md:flex pointer-events-auto" />
        </div>

        <button 
          onClick={onExit} 
          className="absolute top-20 left-6 md:top-6 md:left-[200px] flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-md border border-game-amber/20 text-foreground hover:bg-game-amber/10 hover:text-game-amber hover:border-game-amber/30 shadow-lg transition-all active:scale-95 z-50 pointer-events-auto"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <div className="max-w-md w-full p-6 md:p-10 rounded-3xl bg-card/60 backdrop-blur-xl border border-game-amber/20 shadow-[0_0_50px_rgba(251,191,36,0.15)] text-center animate-in fade-in zoom-in duration-500 relative z-10">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-3 md:mb-4 tracking-tight text-white drop-shadow-md">Play with AI</h2>
          <p className="text-game-amber font-bold text-base md:text-lg mb-6 md:mb-8 font-medium italic opacity-80">"Challenge the mind of a machine."</p>
          <div className="mb-6 p-4 bg-game-amber/10 border border-game-amber/20 rounded-2xl flex flex-col items-center gap-1">
            <span className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Playing as</span>
            <span className="text-2xl font-extrabold text-white">{playerName}</span>
          </div>
          <button 
            className="w-full p-3 md:p-4 rounded-xl bg-game-amber hover:bg-game-amber/90 active:scale-[0.98] text-game-dark font-black uppercase tracking-widest text-base md:text-lg transition-all shadow-[0_0_30px_rgba(251,191,36,0.3)]"
            onClick={() => setIsStarted(true)}
          >
            Launch Battle
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
      mode="ai"
    />
  );
}

const GUEST_ARCADE_KEY = "braindigits_guest_arcade";

function getGuestArcadeData() {
  try {
    const data = localStorage.getItem(GUEST_ARCADE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {}
  return { arcade_max_level: 0, arcade_score: 0, arcade_stars: {} };
}

function ArcadeWrapper({ onExit }: { onExit: () => void }) {
  const { profile, updateProfileField } = useAuth();
  const [guestData, setGuestData] = useState(() => getGuestArcadeData());
  const [playerName] = useState(() => profile?.username || `Guest-${Math.floor(1000 + Math.random() * 9000)}`);
  const [isStarted, setIsStarted] = useState(false);
  const [showLobby, setShowLobby] = useState(false);
  const [showLevelSelect, setShowLevelSelect] = useState(false);

  const {
    gameState,
    playerId,
    isMyTurn,
    isHost,
    makeGuess,
    restartGame,
    leaveRoom,
    leaveGameEarly,
    createRoom,
    joinRoom,
    startGame,
    kickPlayer,
    nextLevel,
  } = useArcadeGame();

  useGameSounds(gameState, playerId);

  // Background hook to persist Arcade High Scores & Max Level!
  useEffect(() => {
    if (!gameState?.isArcade) return;
    
    // Only verify and push updates if at a checkpoint
    if (gameState.status === "level_complete" || gameState.status === "finished") {
      const myPlayer = gameState.players.find(p => p.id === playerId);
      if (!myPlayer) return;
      
      const currentLevel = gameState.level || 1;
      const currentScore = myPlayer.score || 0;
      
      const baseMaxLevel = profile ? (profile.arcade_max_level || 0) : guestData.arcade_max_level;
      const baseMaxScore = profile ? (profile.arcade_score || 0) : guestData.arcade_score;
      const baseStarsTarget = profile ? (profile.arcade_stars || {}) : guestData.arcade_stars;

      const newMaxLevel = gameState.status === "level_complete" ? Math.max(baseMaxLevel, currentLevel) : baseMaxLevel;
      const newMaxScore = Math.max(baseMaxScore, currentScore);

      let needsUpdate = false;
      const updates: any = {};

      if (newMaxLevel > baseMaxLevel) {
        updates.arcade_max_level = newMaxLevel;
        needsUpdate = true;
      }
      if (newMaxScore > baseMaxScore) {
        updates.arcade_score = newMaxScore;
        needsUpdate = true;
      }

      // Calculate star rating for the strictly completed level
      if (gameState.status === "level_complete") {
        const opt = gameState.optimalGuesses || 7;
        let earnedStars = 1;
        if (myPlayer.attempts <= opt) earnedStars = 3;
        else if (myPlayer.attempts <= opt + 2) earnedStars = 2;

        const levelKey = currentLevel.toString();
        const previousStars = baseStarsTarget[levelKey] || 0;

        if (earnedStars > previousStars) {
          updates.arcade_stars = { ...baseStarsTarget, [levelKey]: earnedStars };
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        if (profile) {
          updateProfileField(updates);
          (supabase as any).from("profiles").update(updates).eq("id", profile.id).then(({ error }: any) => {
            if (error) console.error("Could not save arcade score or stars:", error);
          });
        } else {
          const newGuestData = { ...guestData, ...updates };
          setGuestData(newGuestData);
          localStorage.setItem(GUEST_ARCADE_KEY, JSON.stringify(newGuestData));
        }
      }
    }
  }, [gameState?.status, gameState?.level, profile?.arcade_max_level, profile?.arcade_score, profile?.id, playerId, updateProfileField, guestData]);

  const handleLeave = () => {
    leaveRoom();
    setIsStarted(false);
    setShowLobby(false);
  };

  const handleLeaveEarly = () => {
    leaveGameEarly();
    setIsStarted(false);
    setShowLobby(false);
  };

  if (showLevelSelect && !isStarted) {
    const maxUnlocked = (profile ? (profile.arcade_max_level || 0) : guestData.arcade_max_level) + 1;
    const levels = Array.from({ length: maxUnlocked }, (_, i) => i + 1).reverse(); // High levels on top!
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 bg-game-dark relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-game-purple/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '6s' }} />
        <button 
          onClick={() => setShowLevelSelect(false)} 
          className="absolute top-20 left-6 md:top-6 md:left-[200px] flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-md border border-game-purple/20 text-foreground hover:bg-game-purple/10 hover:text-game-purple shadow-lg transition-all active:scale-95 z-50 pointer-events-auto"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <div className="max-w-md w-full p-6 md:p-8 rounded-3xl bg-card/60 backdrop-blur-xl border border-game-purple/20 shadow-[0_0_50px_rgba(171,71,188,0.15)] text-center animate-in fade-in zoom-in duration-500 relative z-10 max-h-[85vh] flex flex-col">
          <h2 className="text-3xl font-black mb-2 tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-game-purple to-pink-500 uppercase drop-shadow-md">Select Level</h2>
          <p className="text-muted-foreground text-sm mb-6 font-medium">Resume your infinite climb.</p>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 stylish-scrollbar">
            {levels.map((lvl) => {
              const previousStars = profile ? (profile.arcade_stars?.[lvl.toString()] || 0) : (guestData.arcade_stars?.[lvl.toString()] || 0);
              return (
              <button
                key={lvl}
                onClick={() => {
                  createRoom(playerName, true, lvl); // Start at explicitly selected level
                  setIsStarted(true);
                }}
                className={`w-full p-4 rounded-xl flex justify-between items-center transition-all active:scale-[0.98] border ${
                  lvl === maxUnlocked 
                    ? "bg-game-purple border-game-purple/50 hover:bg-game-purple/90 text-white font-black shadow-[0_0_20px_rgba(171,71,188,0.4)]"
                    : "bg-black/40 border-white/5 hover:bg-white/10 text-white/80 font-bold"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">Level {lvl}</span>
                  {previousStars > 0 && (
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= previousStars ? 'fill-game-amber text-game-amber' : 'text-white/10 fill-white/10'}`} />
                      ))}
                    </div>
                  )}
                </div>
                {lvl === maxUnlocked ? <span className="text-xs uppercase bg-black/30 px-2 py-1 rounded-md tracking-wider">Newest</span> : <span className="text-xs uppercase text-white/40">Cleared</span>}
              </button>
            )})}
          </div>
        </div>
      </div>
    );
  }

  if (!isStarted && !showLobby) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-game-dark relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-game-purple/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '5s' }} />
        
        <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center z-50 pointer-events-none">
          <button 
            onClick={onExit} 
            className="flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-full bg-card/60 backdrop-blur-xl border border-game-purple/20 text-foreground hover:bg-game-purple/15 hover:text-fuchsia-400 hover:border-game-purple/40 shadow-2xl transition-all active:scale-95 pointer-events-auto group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> <span className="font-bold text-sm md:text-base">Exit Mode</span>
          </button>
          <GlobalLogo className="hidden md:flex pointer-events-auto" />
        </div>

        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 relative z-10 animate-fade-in-up mt-20 md:mt-0">
           {/* Solo Discovery Card */}
           <div 
             onClick={() => setShowLevelSelect(true)}
             className="group relative h-[320px] md:h-[500px] rounded-[2rem] md:rounded-[2.5rem] overflow-hidden cursor-pointer border border-white/5 hover:border-game-purple/40 transition-all duration-500 shadow-2xl hover:shadow-game-purple/20"
           >
              <div className="absolute inset-0 bg-gradient-to-t from-game-dark via-game-dark/40 to-transparent z-10" />
              <div className="absolute inset-0 bg-game-purple/10 group-hover:bg-game-purple/20 transition-colors duration-500" />
              
              {/* Card Content */}
              <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end z-20">
                 <div className="mb-3 md:mb-4 w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-game-purple/20 border border-game-purple/30 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                    <Star className="w-6 h-6 md:w-8 md:h-8 text-game-purple fill-game-purple" />
                 </div>
                 <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-1 md:mb-2 group-hover:translate-x-2 transition-transform duration-500">Infinite Solo</h3>
                 <p className="text-fuchsia-200/60 text-sm md:text-lg leading-relaxed mb-4 md:mb-6 group-hover:translate-x-2 transition-transform duration-500 delay-[50ms]">
                   Master the climb. Reach new levels and earn stars in the ultimate survival mode.
                 </p>
                 <div className="w-full h-12 md:h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-white group-hover:bg-game-purple group-hover:text-game-dark transition-all duration-500 uppercase tracking-widest text-xs md:text-sm">
                   Begin Journey
                 </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-10 md:-top-20 -right-10 md:-right-20 w-48 h-48 md:w-64 md:h-64 bg-game-purple/20 rounded-full blur-[60px] md:blur-[80px] group-hover:bg-game-purple/30 transition-all" />
              <div className="absolute bottom-6 right-6 md:bottom-10 md:right-10 opacity-5 md:opacity-10 group-hover:opacity-20 transition-opacity">
                 <span className="text-7xl md:text-9xl font-black italic text-game-purple tracking-tighter">SURVIVE</span>
              </div>
           </div>

           {/* Lounge Discovery Card */}
           <div 
             onClick={() => setShowLobby(true)}
             className="group relative h-[320px] md:h-[500px] rounded-[2rem] md:rounded-[2.5rem] overflow-hidden cursor-pointer border border-white/5 hover:border-game-cyan/40 transition-all duration-500 shadow-2xl hover:shadow-game-cyan/20"
           >
              <div className="absolute inset-0 bg-gradient-to-t from-game-dark via-game-dark/40 to-transparent z-10" />
              <div className="absolute inset-0 bg-game-cyan/10 group-hover:bg-game-cyan/20 transition-colors duration-500" />
              
              {/* Card Content */}
              <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end z-20">
                 <div className="mb-3 md:mb-4 w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-game-cyan/20 border border-game-cyan/30 flex items-center justify-center group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500">
                    <Users className="w-6 h-6 md:w-8 md:h-8 text-game-cyan" />
                 </div>
                 <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-1 md:mb-2 group-hover:translate-x-2 transition-transform duration-500">Arcade Lounge</h3>
                 <p className="text-cyan-200/60 text-sm md:text-lg leading-relaxed mb-4 md:mb-6 group-hover:translate-x-2 transition-transform duration-500 delay-[50ms]">
                   Compete with up to 8 friends in a high-stakes, fast-paced guessing arena.
                 </p>
                 <div className="w-full h-12 md:h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-white group-hover:bg-game-cyan group-hover:text-game-dark transition-all duration-500 uppercase tracking-widest text-xs md:text-sm">
                   Enter Lounge
                 </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-game-cyan/20 rounded-full blur-[80px] group-hover:bg-game-cyan/30 transition-all" />
              <div className="absolute bottom-10 right-10 opacity-10 group-hover:opacity-30 transition-opacity">
                 <span className="text-9xl font-black italic text-game-cyan tracking-tighter">CLASH</span>
              </div>
           </div>
        </div>

        <div className="mt-12 text-center text-muted-foreground/40 font-black uppercase tracking-[0.4em] text-xs">
           BrainDigits Premium Arcade Arena
        </div>
      </div>
    );
  }

  if (showLobby && !gameState) {
    return (
      <GameLobby 
        onCreateRoom={(name) => createRoom(name)} 
        onJoinRoom={(code, name) => joinRoom(code, name)} 
        settings={DEFAULT_SETTINGS} 
        onSettingsChange={() => {}} 
        onBack={() => setShowLobby(false)}
        showSettings={false}
        mode="arcade"
      />
    );
  }

  if (gameState?.status === "waiting") {
    // Waiting room handles starting the game for multiplayer
    return <WaitingRoom gameState={gameState} isHost={isHost} onStart={startGame} onLeave={handleLeave} onUpdateSettings={() => {}} onKick={kickPlayer} mode="arcade" />;
  }

  if (!gameState) return null;

  return (
    <ArcadeBoard
      gameState={gameState}
      playerId={playerId}
      isMyTurn={isMyTurn}
      onGuess={makeGuess}
      onRestart={restartGame}
      onLeave={handleLeave}
      onLeaveEarly={handleLeaveEarly}
      onNextLevel={nextLevel}
    />
  );
}

export default function Index() {
  const [mode, setMode] = useState<"select" | "friends" | "ai" | "arcade">("select");
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [pendingInvite, setPendingInvite] = useState<{roomCode: string, senderName: string} | null>(null);

  const { user, profile, isLoading } = useAuth();
  const { playSfx } = useAudio();
  const navigate = useNavigate();
  const location = useLocation();

  const modeRef = useRef(mode);
  
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Synchronize URL with logged-in username
  useEffect(() => {
    if (isLoading) return; // Wait for Supabase to finish checking session against localStorage
    
    if (profile?.username) {
      if (location.pathname === '/' || location.pathname === '') {
        navigate(`/${profile.username}`, { replace: true });
      }
    } else if (user === null) {
      if (location.pathname !== '/' && location.pathname !== '') {
        navigate('/', { replace: true });
      }
    }
  }, [profile?.username, user, isLoading, location.pathname, navigate]);

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

    if (mode === "arcade") {
      return <ArcadeWrapper onExit={() => setMode("select")} />;
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
                  className="w-full h-14 bg-game-cyan hover:bg-game-cyan/90 text-game-dark font-black text-lg shadow-[0_0_40px_rgba(0,229,255,0.4)] active:scale-[0.98] transition-all uppercase tracking-widest"
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
