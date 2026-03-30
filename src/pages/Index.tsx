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
import { ArrowLeft, Star, Users, Zap, Bot, UserCircle, Settings2 } from "lucide-react";
import { RoomSettingsModal } from "@/components/RoomSettingsModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAudio } from "@/contexts/AudioContext";
import { GlobalLogo, DeveloperFooter } from "@/components/Branding";

function MultiplayerWrapper({ 
  onExit, 
  settings, 
  onSettingsChange, 
  initialRoomCode,
  onSwitchMode
}: { 
  onExit: () => void, 
  settings: GameSettings, 
  onSettingsChange: (s: GameSettings) => void, 
  initialRoomCode?: string | null,
  onSwitchMode?: (mode: "arcade" | "friends", code: string) => void
}) {
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
    requestRestart,
    restartRequests,
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

  if (!gameState) {
    return (
      <GameLobby 
        onCreateRoom={handleCreateRoom} 
        onJoinRoom={(code, name) => {
          if (code.startsWith("A") && onSwitchMode) {
            toast.info("Arcade code detected! Routing to Arcade Lounge...");
            onSwitchMode("arcade", code);
            return;
          }
          joinRoom(code, name);
        }} 
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
      onRequestRestart={requestRestart}
      restartRequests={restartRequests}
      isHost={isHost}
      mode="friends"
    />
  );
}

function AIWrapper({ 
  onExit, 
  settings, 
  onSettingsChange 
}: { 
  onExit: () => void, 
  settings: GameSettings,
  onSettingsChange: (s: GameSettings) => void
}) {
  const { profile } = useAuth();
  const [playerName] = useState(() => profile?.username || `Guest-${Math.floor(1000 + Math.random() * 9000)}`);
  const [isStarted, setIsStarted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
  } = useAIGame(isStarted ? playerName || "Player" : "", settings, onSettingsChange);

  useGameSounds(gameState, playerId);

  const handleLeave = () => {
    leaveRoom();
    setIsStarted(false);
  };

  const handleLeaveEarly = () => {
    leaveGameEarly();
    setIsStarted(false);
  };

    if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 pt-24 md:pt-4 bg-[#050508] relative overflow-hidden"
        style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(251,191,36,0.02) 0%, transparent 50%), radial-gradient(circle at 0% 100%, rgba(251,191,36,0.01) 0%, transparent 50%)' }}
      >
        <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-game-amber/5 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-game-amber/5 rounded-full blur-[100px] pointer-events-none" style={{ animationDelay: '2s' }} />

        <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center z-20 pointer-events-none">
          <GlobalLogo className="hidden md:flex pointer-events-auto opacity-20" />
        </div>

        <button 
          onClick={onExit} 
          className="absolute top-6 left-6 md:left-[22%] flex items-center gap-2 px-4 py-2 rounded-full bg-white text-game-dark hover:bg-white/90 shadow-[0_5px_20px_rgba(255,255,255,0.3)] transition-all active:scale-95 z-50 pointer-events-auto group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> <span className="text-[10px] uppercase font-black tracking-widest">Back</span>
        </button>

        <button 
          onClick={() => setShowSettings(true)} 
          className="absolute top-6 right-6 md:right-[22%] flex items-center gap-2 px-3 py-1.5 rounded-full bg-game-amber/10 backdrop-blur-3xl border border-game-amber/20 text-game-amber hover:bg-game-amber/20 hover:border-game-amber/40 shadow-lg transition-all active:scale-95 z-50 pointer-events-auto group"
        >
          <Settings2 className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-500" /> <span className="text-[9px] uppercase font-black tracking-widest">Settings</span>
        </button>

        {/* Play with AI Card */}
        <div className="w-full max-w-[280px] xs:max-w-xs relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-300">
           {/* Decorative corner elements */}
           <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-game-amber/20 rounded-tl-lg z-20" />
           <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-game-amber/20 rounded-br-lg z-20" />

           <div className="relative bg-[#0a0a0f]/80 backdrop-blur-3xl rounded-[1.5rem] border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.8)] p-5 md:p-6 text-center overflow-hidden">
              {/* Internal glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[1px] bg-gradient-to-r from-transparent via-game-amber/30 to-transparent blur-sm" />
              
              <div className="relative z-10">
                 {/* Central Bot Intelligence Avatar */}
                 <div className="mb-4 relative inline-block">
                    <div className="absolute inset-0 bg-game-amber/20 blur-xl rounded-full opacity-30 animate-pulse" />
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-black/60 border border-game-amber/20 flex items-center justify-center relative z-10 shadow-[inner_0_0_15px_rgba(251,191,36,0.1)]">
                       <Bot className="w-7 h-7 md:w-8 md:h-8 text-game-amber drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
                       <div className="absolute inset-x-0 top-0 h-[1px] bg-game-amber/30 animate-scanner-vertical pointer-events-none" />
                    </div>
                 </div>

                 <h2 className="text-2xl md:text-3xl font-black text-white mb-0.5 uppercase tracking-tighter drop-shadow-md italic [transform:skewX(-10deg)]">Play with AI</h2>
                 <p className="text-game-amber font-bold text-[8px] uppercase tracking-[0.4em] mb-4 opacity-50 italic">Machine Breached</p>

                 {/* Bio-Sync Player Badge */}
                 <div className="mb-6 p-3 rounded-lg bg-white/[0.02] border border-white/5 flex flex-col items-center gap-0.5 transition-all hover:bg-white/[0.04]">
                    <div className="flex items-center gap-1.5 mb-0.5">
                       <span className="text-[7px] text-muted-foreground uppercase font-black tracking-widest transition-colors line-clamp-1 opacity-40">Neural Sync Status</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <UserCircle className="w-3.5 h-3.5 text-game-amber/40" />
                       <span className="text-base md:text-lg font-black text-white truncate max-w-[120px]">{playerName}</span>
                    </div>
                 </div>

                 <button 
                   className="w-full h-12 md:h-14 rounded-lg bg-game-amber text-game-dark font-black tracking-[0.2em] text-[10px] md:text-xs uppercase transition-all shadow-[0_5px_20px_rgba(251,191,36,0.2)] hover:shadow-[0_8px_30px_rgba(251,191,36,0.3)] hover:scale-[1.02] active:scale-[0.97] relative overflow-hidden group/btn"
                   onClick={() => setIsStarted(true)}
                 >
                    <span className="relative z-10">Launch Battle</span>
                 </button>
              </div>

              {/* Decorative data scan pattern */}
              <div className="absolute inset-0 opacity-[0.02] pointer-events-none select-none z-0" 
                   style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, white 1px, white 2px)', backgroundSize: '100% 4px' }} 
              />
           </div>
        </div>

        <DeveloperFooter className="absolute bottom-6 left-0 right-0 z-10 opacity-30 hover:opacity-100 transition-all duration-700" />

        <RoomSettingsModal 
          open={showSettings} 
          onClose={() => setShowSettings(false)} 
          settings={settings} 
          onSettingsChange={onSettingsChange} 
        />
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

function ArcadeWrapper({ 
  onExit,
  initialRoomCode,
  onSwitchMode
}: { 
  onExit: () => void,
  initialRoomCode?: string | null,
  onSwitchMode?: (mode: "arcade" | "friends", code: string) => void
}) {
  const { profile, updateProfileField } = useAuth();
  const { playSfx } = useAudio();
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

  useEffect(() => {
    if (initialRoomCode && !gameState) {
      if (initialRoomCode.startsWith("A")) {
        joinRoom(initialRoomCode, profile?.username || "Player");
        setShowLobby(true);
        setIsStarted(true);
      }
    }
  }, [initialRoomCode, gameState, joinRoom, profile?.username]);

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
    const levels = Array.from({ length: maxUnlocked }, (_, i) => i + 1).reverse();
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 pt-24 md:pt-4 bg-[#050508] relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-game-purple/5 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '6s' }} />
        <button 
          onClick={() => { playSfx('click'); setShowLevelSelect(false); }} 
          className="absolute top-6 left-6 md:left-[200px] flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-game-dark hover:bg-white/90 shadow-[0_5px_25px_rgba(255,255,255,0.3)] transition-all active:scale-95 z-50 pointer-events-auto font-black text-xs uppercase tracking-widest"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <div className="max-w-md w-full p-6 md:p-8 rounded-3xl bg-[#0a0a0f]/95 backdrop-blur-md border border-game-purple/20 shadow-[0_0_50px_rgba(171,71,188,0.1)] text-center animate-in fade-in slide-in-from-bottom-4 duration-200 relative z-10 max-h-[85vh] flex flex-col">
          <h2 className="text-3xl font-black mb-2 tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-game-purple to-pink-500 uppercase drop-shadow-md">Select Level</h2>
          <p className="text-muted-foreground text-sm mb-6 font-medium">Resume your infinite climb.</p>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 stylish-scrollbar">
            {levels.map((lvl) => {
              const previousStars = profile ? (profile.arcade_stars?.[lvl.toString()] || 0) : (guestData.arcade_stars?.[lvl.toString()] || 0);
              return (
              <button
                key={lvl}
                onClick={() => {
                  playSfx('click');
                  createRoom(playerName, true, lvl);
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
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 bg-[#050508] relative overflow-hidden [perspective:1200px]"
        style={{ backgroundImage: 'radial-gradient(circle at 0% 0%, rgba(171,71,188,0.03) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(0,229,255,0.03) 0%, transparent 50%)' }}
      >
        {/* Global Navigation - Minimalist High Tech */}
        <div className="absolute top-0 left-0 w-full p-6 md:p-10 flex justify-between items-center z-50 pointer-events-none">
          <button 
            onClick={() => { playSfx('click'); onExit(); }} 
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-game-dark shadow-[0_5px_25px_rgba(255,255,255,0.3)] hover:bg-white/90 transition-all duration-200 active:scale-90 pointer-events-auto group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> <span className="font-black text-[10px] uppercase tracking-[0.25em]">Back</span>
          </button>
          <GlobalLogo className="hidden lg:flex pointer-events-auto opacity-10 hover:opacity-50 transition-all duration-700 w-32 justify-end" />
        </div>

        {/* Digital Vanguard Selection Grid */}
        <div className="w-full max-w-lg flex flex-col items-center gap-5 relative z-10 px-4 md:px-6 mt-8">
           
           <div className="w-full flex flex-col items-center gap-4 mb-2 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="w-full flex justify-center scale-[1.1] md:scale-[1.25] -translate-x-1">
                 <GlobalLogo />
              </div>
              <div className="flex flex-col items-center">
                 <h2 className="text-[10px] md:text-[11px] font-black text-white/40 uppercase tracking-[0.6em] mb-1">Mission Protocol</h2>
                 <p className="text-[8px] md:text-[9px] font-bold text-game-purple/60 uppercase tracking-widest text-center">Neural Breach Authorization Required</p>
              </div>
           </div>

           {/* ── Vanguard Button: Infinite Solo ── */}
           <button 
             onClick={() => { playSfx('click'); setShowLevelSelect(true); }}
             className="group relative w-full h-24 md:h-28 rounded-2xl overflow-hidden cursor-pointer border border-white/[0.05] hover:border-game-purple/40 transition-all duration-300 active:scale-[0.98] shadow-[0_20px_50px_rgba(0,0,0,0.6)] bg-[#0a0a0f] flex items-center"
           >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-game-purple shadow-[0_0_15px_rgba(171,71,188,0.8)] z-30" />
              <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-r from-game-purple/10 to-transparent z-10" />
              
              <div className="relative px-5 md:px-8 flex items-center gap-4 md:gap-7 z-20 w-full">
                 <div className="relative shrink-0 group-hover:scale-110 transition-transform duration-500">
                    <div className="absolute inset-0 bg-game-purple/30 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-11 h-11 md:w-14 md:h-14 rounded-xl bg-black/40 border border-game-purple/30 flex items-center justify-center relative z-10 shadow-inner">
                       <Star className="w-5 h-5 md:w-7 md:h-7 text-game-purple fill-game-purple" />
                       <div className="absolute top-0 left-0 w-full h-0.5 bg-game-purple/40 animate-scanner-vertical" />
                    </div>
                 </div>
                 <div className="text-left flex-1 min-w-0">
                    <h3 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter group-hover:translate-x-1 transition-transform italic [transform:skewX(-10deg)] leading-none">Infinite Solo</h3>
                    <div className="flex items-center gap-1.5 md:gap-2 mt-1 md:mt-2">
                       <span className="w-1 h-1 rounded-full bg-game-purple animate-pulse" />
                       <p className="text-[8px] md:text-[9px] text-game-purple/40 font-black uppercase tracking-[0.3em] md:tracking-[0.4em]">Sector: Survival Elite</p>
                    </div>
                 </div>
                 <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 transition-transform">
                    <Zap className="w-4 h-4 md:w-5 md:h-5 text-game-purple animate-pulse" />
                 </div>
              </div>
              
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
                 <div className="absolute top-0 -left-[100%] w-[40%] h-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent animate-shimmer-ultra" />
              </div>
           </button>

           {/* ── Vanguard Button: Arcade Lounge ── */}
           <button 
             onClick={() => { playSfx('click'); setShowLobby(true); }}
             className="group relative w-full h-24 md:h-28 rounded-2xl overflow-hidden cursor-pointer border border-white/[0.05] hover:border-game-cyan/40 transition-all duration-300 active:scale-[0.98] shadow-[0_20px_50px_rgba(0,0,0,0.6)] bg-[#0a0a0f] flex items-center"
           >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-game-cyan shadow-[0_0_15px_rgba(0,229,255,0.8)] z-30" />
              <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-r from-game-cyan/10 to-transparent z-10" />
              
              <div className="relative px-5 md:px-8 flex items-center gap-4 md:gap-7 z-20 w-full">
                 <div className="relative shrink-0 group-hover:scale-110 transition-transform duration-500">
                    <div className="absolute inset-0 bg-game-cyan/30 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-11 h-11 md:w-14 md:h-14 rounded-xl bg-black/40 border border-game-cyan/30 flex items-center justify-center relative z-10 shadow-inner">
                       <Users className="w-5 h-5 md:w-7 md:h-7 text-game-cyan" />
                       <div className="absolute top-0 left-0 w-full h-0.5 bg-game-cyan/40 animate-scanner-vertical" />
                    </div>
                 </div>
                 <div className="text-left flex-1 min-w-0">
                    <h3 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter group-hover:translate-x-1 transition-transform italic [transform:skewX(-10deg)] leading-none">Arcade Lounge</h3>
                    <div className="flex items-center gap-1.5 md:gap-2 mt-1 md:mt-2">
                       <span className="w-1 h-1 rounded-full bg-game-cyan animate-pulse" />
                       <p className="text-[8px] md:text-[9px] text-game-cyan/40 font-black uppercase tracking-[0.3em] md:tracking-[0.4em]">Sector: Multiplayer Clash</p>
                    </div>
                 </div>
                 <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 transition-transform">
                    <Zap className="w-4 h-4 md:w-5 md:h-5 text-game-cyan animate-pulse" />
                 </div>
              </div>

              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
                 <div className="absolute top-0 -left-[100%] w-[40%] h-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent animate-shimmer-ultra" />
              </div>
           </button>
        </div>

        <div className="mt-4 lg:mt-6 flex items-center gap-8 opacity-20 hover:opacity-100 transition-opacity duration-700 select-none">
           <div className="flex flex-col items-start">
              <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.5em] mb-1">Arena Status</span>
              <span className="text-[10px] font-black text-game-success uppercase tracking-widest animate-pulse">Operational</span>
           </div>
           <div className="w-px h-8 bg-white/10" />
           <div className="flex flex-col items-start">
              <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.5em] mb-1">Neural Load</span>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Optimized 0.04ms</span>
           </div>
        </div>
      </div>
    );
  }

  if (showLobby && !gameState) {
    return (
      <GameLobby 
        onCreateRoom={(name) => createRoom(name)} 
        onJoinRoom={(code, name) => {
          if (code.startsWith("F") && onSwitchMode) {
            toast.info("Friends code detected! Routing to Waiting Room...");
            onSwitchMode("friends", code);
            return;
          }
          joinRoom(code, name);
        }} 
        settings={DEFAULT_SETTINGS} 
        onSettingsChange={() => {}} 
        onBack={() => setShowLobby(false)}
        showSettings={false}
        mode="arcade"
      />
    );
  }

  if (gameState?.status === "waiting") {
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

  useEffect(() => {
    if (isLoading) return;
    
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
        return;
      }

      playSfx('notification');
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
      return <MultiplayerWrapper onExit={() => { setMode("select"); setInviteCode(null); }} settings={settings} onSettingsChange={setSettings} initialRoomCode={inviteCode} onSwitchMode={(newMode, code) => { setMode(newMode); setInviteCode(code); }} />;
    }

    if (mode === "ai") {
      return <AIWrapper onExit={() => setMode("select")} settings={settings} onSettingsChange={setSettings} />;
    }

    if (mode === "arcade") {
      return <ArcadeWrapper onExit={() => { setMode("select"); setInviteCode(null); }} initialRoomCode={inviteCode} onSwitchMode={(newMode, code) => { setMode(newMode); setInviteCode(code); }} />;
    }

    return <ModeSelection onSelectMode={setMode} settings={settings} onSettingsChange={setSettings} />;
  };

  return (
    <>
      {renderContent()}

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
