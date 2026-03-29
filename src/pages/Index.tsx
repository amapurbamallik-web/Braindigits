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

    if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-game-dark relative overflow-hidden">
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
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 bg-[#050508] relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-game-purple/5 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '6s' }} />
        <button 
          onClick={() => { playSfx('click'); setShowLevelSelect(false); }} 
          className="absolute top-20 left-6 md:top-6 md:left-[200px] flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-md border border-game-purple/20 text-foreground hover:bg-game-purple/10 hover:text-game-purple shadow-lg transition-all active:scale-95 z-50 pointer-events-auto"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <div className="max-w-md w-full p-6 md:p-8 rounded-3xl bg-[#0a0a0f] backdrop-blur-xl border border-game-purple/20 shadow-[0_0_50px_rgba(171,71,188,0.1)] text-center animate-in fade-in zoom-in duration-200 relative z-10 max-h-[85vh] flex flex-col">
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
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 bg-[#050508] relative overflow-hidden [perspective:1200px]">
        {/* Vanguard Backdrop Glows */}
        <div className="absolute top-[-30%] left-[-20%] w-[1000px] h-[1000px] bg-game-purple/5 rounded-full blur-[180px] animate-pulse pointer-events-none" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-[-30%] right-[-20%] w-[1000px] h-[1000px] bg-game-cyan/5 rounded-full blur-[180px] animate-pulse pointer-events-none" style={{ animationDuration: '12s' }} />

        {/* Global Navigation - Minimalist High Tech */}
        <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-50 pointer-events-none">
          <button 
            onClick={() => { playSfx('click'); onExit(); }} 
            className="flex items-center gap-3 px-8 py-3 rounded-sm bg-red-500/[0.03] backdrop-blur-3xl border border-red-500/20 text-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.1)] hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all duration-300 active:scale-90 pointer-events-auto group relative overflow-hidden"
          >
            <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-red-400 group-hover:w-full transition-all duration-500" />
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> <span className="font-black text-[10px] uppercase tracking-[0.4em]">Abort Arena</span>
          </button>
          <GlobalLogo className="hidden lg:flex pointer-events-auto opacity-20 hover:opacity-100 transition-all duration-700" />
        </div>

        {/* Digital Vanguard Selection Grid */}
        <div className="w-full max-w-6xl flex flex-col gap-4 relative z-10 px-4 md:px-12 mt-16 lg:mt-0">
           
           {/* ── Vanguard Header: Infinite Solo ── */}
           <div 
             onClick={() => { playSfx('click'); setShowLevelSelect(true); }}
             className="group relative h-36 md:h-48 rounded-sm md:rounded-md overflow-hidden cursor-pointer border border-white/[0.05] hover:border-game-purple/40 transition-all duration-300 active:scale-[0.98] shadow-[0_45px_100px_rgba(0,0,0,0.8)] [transform-style:preserve-3d] [transform:rotateY(1.2deg)] hover:[transform:rotateY(-4deg)] bg-[#0a0a0f]"
           >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-game-purple shadow-[0_0_15px_rgba(171,71,188,0.8)] z-30 animate-pulse duration-[3000ms]" />
              
              <div 
                className="absolute inset-0 opacity-[0.03] select-none pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }}
              />

              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none overflow-hidden">
                 <div className="absolute top-0 -left-[100%] w-[40%] h-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent animate-shimmer-ultra" />
              </div>

              <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-r from-game-purple/15 via-[#0a0a0f]/80 to-[#0a0a0f] z-10" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_50%,rgba(171,71,188,0.2),transparent_70%)] group-hover:bg-[radial-gradient(circle_at_10%_50%,rgba(171,71,188,0.3),transparent_70%)] transition-all duration-1000" />
              
              <div className="absolute inset-0 px-6 md:px-10 flex items-center justify-between z-20">
                 <div className="flex items-center gap-6 md:gap-8">
                    <div className="relative group-hover:scale-110 group-hover:rotate-6 transition-all duration-700">
                       <div className="absolute inset-0 bg-game-purple/40 blur-2xl rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
                       <div className="w-12 h-12 md:w-20 md:h-20 rounded-sm bg-[#050508] border border-game-purple/30 flex items-center justify-center relative z-10 shadow-[inner_0_0_20px_rgba(171,71,188,0.2)]">
                          <Star className="w-6 h-6 md:w-10 md:h-10 text-game-purple fill-game-purple drop-shadow-[0_0_20px_rgba(171,71,188,1)]" />
                          <div className="absolute top-0 left-0 w-full h-[2px] bg-game-purple/50 animate-scanner-vertical pointer-events-none" />
                       </div>
                    </div>
                    <div>
                       <h3 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-1 [transform:skewX(-10deg)] group-hover:translate-x-4 transition-transform duration-700 drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]">Infinite Solo</h3>
                       <div className="flex items-center gap-2 group-hover:translate-x-4 transition-transform duration-700 delay-75">
                          <span className="w-1.5 h-1.5 rounded-full bg-game-purple animate-pulse" />
                          <p className="text-fuchsia-200/40 text-[9px] md:text-xs font-black uppercase tracking-[0.5em]">Sector: Survival Elite</p>
                       </div>
                    </div>
                 </div>
                 
                 <div className="hidden lg:flex flex-col items-end gap-3 group-hover:translate-x-[-20px] transition-transform duration-700">
                    <div className="text-[10px] font-black text-game-purple uppercase tracking-[0.6em] opacity-30 group-hover:opacity-60 transition-opacity">Neural Sync Ready</div>
                    <div className="h-12 md:h-16 px-12 rounded-sm bg-[#0a0a0f] border border-white/10 flex items-center justify-center font-black text-white group-hover:bg-game-purple group-hover:text-game-dark group-hover:border-game-purple group-hover:shadow-[0_0_30px_rgba(171,71,188,0.5)] transition-all duration-500 uppercase tracking-[0.3em] text-[10px]">
                       Initiate Breach
                    </div>
                 </div>
              </div>

              <div className="absolute bottom-[-10%] right-[-5%] opacity-[0.03] group-hover:opacity-10 transition-all duration-1000 select-none pointer-events-none group-hover:translate-y-[-10%]">
                 <span className="text-9xl md:text-[18rem] font-black italic text-game-purple tracking-tighter">VANGUARD</span>
              </div>
           </div>

           {/* ── Vanguard Header: Arcade Lounge ── */}
           <div 
             onClick={() => { playSfx('click'); setShowLobby(true); }}
             className="group relative h-36 md:h-48 rounded-sm md:rounded-md overflow-hidden cursor-pointer border border-white/[0.05] hover:border-game-cyan/40 transition-all duration-300 active:scale-[0.98] shadow-[0_45px_100px_rgba(0,0,0,0.8)] [transform-style:preserve-3d] [transform:rotateY(1.2deg)] hover:[transform:rotateY(-4deg)] bg-[#0a0a0f]"
           >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-game-cyan shadow-[0_0_15px_rgba(0,229,255,0.8)] z-30 animate-pulse duration-[3500ms]" />
              
              <div 
                className="absolute inset-0 opacity-[0.03] select-none pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }}
              />

              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none overflow-hidden">
                 <div className="absolute top-0 -left-[100%] w-[40%] h-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent animate-shimmer-ultra" />
              </div>

              <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-r from-game-cyan/15 via-[#0a0a0f]/80 to-[#0a0a0f] z-10" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_50%,rgba(0,229,255,0.15),transparent_70%)] group-hover:bg-[radial-gradient(circle_at_10%_50%,rgba(0,229,255,0.25),transparent_70%)] transition-all duration-1000" />
              
              <div className="absolute inset-0 px-6 md:px-10 flex items-center justify-between z-20">
                 <div className="flex items-center gap-6 md:gap-8">
                    <div className="relative group-hover:scale-110 group-hover:-rotate-6 transition-all duration-700">
                       <div className="absolute inset-0 bg-game-cyan/40 blur-2xl rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
                       <div className="w-12 h-12 md:w-20 md:h-20 rounded-sm bg-[#050508] border border-game-cyan/30 flex items-center justify-center relative z-10 shadow-[inner_0_0_20px_rgba(0,229,255,0.2)]">
                          <Users className="w-6 h-6 md:w-10 md:h-10 text-game-cyan drop-shadow-[0_0_20px_rgba(0,229,255,1)]" />
                          <div className="absolute top-0 left-0 w-full h-[2px] bg-game-cyan/40 animate-scanner-vertical pointer-events-none" />
                       </div>
                    </div>
                    <div>
                       <h3 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-1 [transform:skewX(-10deg)] group-hover:translate-x-4 transition-transform duration-700 drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]">Arcade Lounge</h3>
                       <div className="flex items-center gap-2 group-hover:translate-x-4 transition-transform duration-700 delay-75">
                          <span className="w-1.5 h-1.5 rounded-full bg-game-cyan animate-pulse" />
                          <p className="text-cyan-200/40 text-[9px] md:text-xs font-black uppercase tracking-[0.5em]">Sector: Multiplayer Clash</p>
                       </div>
                    </div>
                 </div>
                 
                 <div className="hidden lg:flex flex-col items-end gap-3 group-hover:translate-x-[-20px] transition-transform duration-700">
                    <div className="text-[10px] font-black text-game-cyan uppercase tracking-[0.6em] opacity-30 group-hover:opacity-60 transition-opacity">Protocol: Comms Link Synced</div>
                    <div className="h-12 md:h-16 px-12 rounded-sm bg-[#0a0a0f] border border-white/10 flex items-center justify-center font-black text-white group-hover:bg-game-cyan group-hover:text-game-dark group-hover:border-game-cyan group-hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] transition-all duration-500 uppercase tracking-[0.3em] text-[10px]">
                       Initiate Clash
                    </div>
                 </div>
              </div>

              <div className="absolute bottom-[-10%] right-[-5%] opacity-[0.03] group-hover:opacity-10 transition-all duration-1000 select-none pointer-events-none group-hover:translate-y-[-10%]">
                 <span className="text-9xl md:text-[18rem] font-black italic text-game-cyan tracking-tighter">PROTOCOL</span>
              </div>
           </div>
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
