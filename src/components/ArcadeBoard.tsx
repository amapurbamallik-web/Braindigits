import { useState, useEffect, useRef } from "react";
import { GameState } from "@/lib/game-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUp, ArrowDown, LogOut, Skull, Trophy, Star, ArrowLeft } from "lucide-react";
import React from "react";
import { useAudio } from "@/contexts/AudioContext";
import confetti from "canvas-confetti";
import { GlobalLogo, DeveloperFooter } from "./Branding";
import { LeaveConfirmModal } from "./LeaveConfirmModal";
import { getArcadeEfficiencyScore, getArcadeRankTitle } from "@/lib/arcade-logic";
import { getThemeClasses, GameMode } from "@/lib/theme-logic";

const HeartsDisplay = ({ hearts, maxHearts, size = 'sm' }: { hearts: number; maxHearts: number; size?: 'sm' | 'lg' }) => {
  const isCritical = hearts === 1;
  const iconSize = size === 'lg' ? 'text-xl' : 'text-sm';
  return (
    <div className={`flex gap-0.5 items-center ${size === 'lg' ? 'gap-1' : ''}`}>
      {Array.from({ length: maxHearts }).map((_, i) => (
        <span
          key={i}
          className={`${iconSize} leading-none transition-all duration-150 ${
            i < hearts
              ? isCritical ? 'animate-pulse' : ''
              : 'opacity-20 grayscale'
          }`}
          style={i < hearts ? { filter: `drop-shadow(0 0 3px rgba(248,113,113,${isCritical ? '1' : '0.6'}))` } : {}}
        >
          {i < hearts ? '❤️' : '🤍'}
        </span>
      ))}
    </div>
  );
};

const TurnTimer = ({ deadline, isActive, duration, mode = 'arcade' }: { deadline?: number, isActive: boolean, duration: number, mode?: GameMode }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const theme = getThemeClasses(mode);
  const { playSfx } = useAudio();
  const lastTickRef = useRef<number>(-1);
  const hasPlayedTimeoutRef = useRef(false);
  
  useEffect(() => {
    if (!deadline || !isActive) {
      setTimeLeft(duration);
      lastTickRef.current = -1;
      hasPlayedTimeoutRef.current = false;
      return;
    }

    let animationFrameId: number;
    const updateTime = () => {
      const remaining = Math.max(0, deadline - Date.now());
      setTimeLeft(remaining);
      
      if (remaining > 0) {
        const seconds = Math.ceil(remaining / 1000);
        if (remaining <= 5000 && seconds !== lastTickRef.current) {
          playSfx('tick');
          lastTickRef.current = seconds;
        }
        animationFrameId = requestAnimationFrame(updateTime);
      } else if (!hasPlayedTimeoutRef.current) {
        playSfx('timeout');
        hasPlayedTimeoutRef.current = true;
      }
    };
    
    animationFrameId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(animationFrameId);
  }, [deadline, isActive, playSfx, duration]);

  const percentage = Math.max(0, Math.min(100, (timeLeft / duration) * 100));
  const isCritical = timeLeft < 5000 && isActive && timeLeft > 0;
  const secondsLeft = Math.ceil(timeLeft / 1000);

  return (
    <div className="w-full mt-3 relative">
      <div className="flex justify-between items-center mb-1.5 px-0.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Arcade Time Limit</span>
        <span className={`text-xs font-mono font-bold ${isActive ? (isCritical ? "text-red-400 animate-pulse" : theme.text) : "text-muted-foreground"}`}>
          {secondsLeft.toString().padStart(2, '0')}s
        </span>
      </div>
      <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
        <div 
          className={`h-full rounded-full ${
            isActive 
              ? isCritical ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" : `${theme.primary} ${theme.accentGlow}` 
              : "bg-muted-foreground/30"
          }`}
          style={{ width: `${isActive ? percentage : 100}%` }}
        />
      </div>
    </div>
  );
};

interface ArcadeBoardProps {
  gameState: GameState;
  playerId: string;
  isMyTurn: boolean;
  onGuess: (guess: number) => void;
  onRestart: () => void;
  onLeave: () => void;
  onLeaveEarly?: () => void;
  onNextLevel?: () => void;
}

export function ArcadeBoard({
  gameState,
  playerId,
  isMyTurn,
  onGuess,
  onRestart,
  onLeave,
  onLeaveEarly,
  onNextLevel,
}: ArcadeBoardProps) {
  const [guessInput, setGuessInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showLeaveConfirmEarly, setShowLeaveConfirmEarly] = useState(false);
  const { playSfx } = useAudio();
  const theme = getThemeClasses('arcade');

  const myPlayer = gameState.players.find((p) => p.id === playerId);
  const currentTurnPlayer = gameState.players[gameState.currentTurnIndex];
  
  const currentLevel = gameState.level || 1;
  const rankTitle = getArcadeRankTitle(currentLevel);

  const lastLevelRef = useRef<number>(gameState.level || 1);
  const lastStatusRef = useRef<string>(gameState.status);

  useEffect(() => {
    // Only trigger if status or level actually changed since we last handled it
    if (gameState.status === lastStatusRef.current && gameState.level === lastLevelRef.current) {
      return;
    }

    let timeoutId: NodeJS.Timeout;
    if (gameState.status === "finished") {
      timeoutId = setTimeout(() => {
        playSfx('timeout'); 
      }, 300);
    } else if (gameState.status === "level_complete") {
      timeoutId = setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 120,
          origin: { y: 0.5 },
          colors: ['#22c55e', '#3b82f6', '#f59e0b'] // Level complete colors
        });
        playSfx('notification');
      }, 300);
    }

    lastStatusRef.current = gameState.status;
    lastLevelRef.current = gameState.level || 1;

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [gameState.status, gameState.level, playSfx]);

  const handleSubmitGuess = () => {
    const num = parseInt(guessInput, 10);
    if (isNaN(num) || num < gameState.minRange || num > gameState.maxRange) {
      setInputError(`Enter a number between ${gameState.minRange} and ${gameState.maxRange}`);
      return;
    }
    setInputError("");
    onGuess(num);
    setGuessInput("");
  };

  if (gameState.status === "finished") {
    const myFinalScore = myPlayer?.score || 0;
    const teamEfficiency = getArcadeEfficiencyScore(currentLevel, gameState.players.reduce((sum, p) => sum + p.attempts, 0), gameState.optimalGuesses || 7);
    const isMultiplayer = gameState.roomCode !== "LOCAL";
    const connectedCount = gameState.players.filter(p => p.isOnline !== false).length;
    const disabledButton = isMultiplayer && connectedCount < 2;
    
    return (
      <div className="flex flex-col justify-between items-center min-h-[100dvh] p-4 md:p-6 bg-game-dark overflow-y-auto overflow-x-hidden relative">
        <div className="absolute top-[10%] left-[-10%] w-96 h-96 bg-red-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        <div className="w-full flex justify-end md:justify-between items-center z-20 pointer-events-none shrink-0 mb-4">
          <GlobalLogo className="hidden md:flex pointer-events-auto" />
        </div>
        
        <div className="w-full max-w-md text-center shrink-0 opacity-0 animate-fade-in-up relative z-10 my-auto py-6" style={{ animationDelay: "0.1s" }}>
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/15 mb-4 animate-bounce-subtle border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              <Skull className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-4xl font-black tracking-tight text-white mb-2 uppercase drop-shadow-md">
              Game Over
            </h2>
            <p className="text-game-amber font-bold text-lg">
              Reached Level {currentLevel} • {rankTitle}
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              The number was <span className="font-mono font-bold text-game-cyan">{gameState.targetNumber}</span>
            </p>
          </div>

          <div className="bg-card/50 backdrop-blur-xl rounded-2xl p-5 shadow-lg mb-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4 flex justify-between items-center">
              <span>Final Stats</span>
              <span className="text-game-purple text-sm">Efficiency: {teamEfficiency}</span>
            </h3>
            <div className="space-y-2">
              {[...gameState.players].sort((a,b) => b.score - a.score).map((player, i) => (
                <div key={player.id} className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-white/5">
                  <span className="font-medium text-white/90">
                    <span className="text-muted-foreground mr-2 font-mono">#{i+1}</span>
                    {player.name} {player.id === playerId ? "(You)" : ""}
                  </span>
                  <span className="font-bold text-game-cyan">{player.score} pts</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { playSfx('click'); setShowLeaveConfirm(true); }}
              className="flex-1 h-14 flex items-center justify-center gap-2 rounded-xl bg-white text-game-dark hover:bg-white/90 hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] font-black transition-all active:scale-[0.97] shadow-xl"
            >
              <ArrowLeft className="h-5 w-5" />
              Back
            </button>
            <Button 
               onClick={() => { playSfx('click'); onRestart(); }} 
               disabled={disabledButton}
               title={disabledButton ? "Not enough players to restart" : ""}
               className="flex-1 h-14 font-black active:scale-[0.97] transition-all bg-game-purple hover:bg-game-purple/90 text-white shadow-[0_0_20px_rgba(171,71,188,0.3)] disabled:opacity-50 disabled:grayscale"
            >
              <Trophy className="h-5 w-5 mr-2" />
              Play Again
            </Button>
          </div>
        </div>
        
        <DeveloperFooter className="shrink-0 mt-8 mb-2 z-10 opacity-100" />

        <LeaveConfirmModal
          open={showLeaveConfirm}
          title="Return to Menu?"
          message="Are you sure you want to stop playing Arcade mode?"
          confirmLabel="Yes, Leave"
          onCancel={() => setShowLeaveConfirm(false)}
          onConfirm={() => { onLeave(); }}
        />
      </div>
    );
  }

  if (gameState.status === "level_complete") {
    const nextLevelNum = (gameState.level || 1) + 1;
    const isMultiplayer = gameState.roomCode !== "LOCAL";
    const connectedCount = gameState.players.filter(p => p.isOnline !== false).length;
    const disabledButton = isMultiplayer && connectedCount < 2;
    return (
      <div className="flex flex-col justify-between items-center min-h-[100dvh] p-4 md:p-6 bg-game-dark overflow-y-auto overflow-x-hidden relative">
        <div className="absolute top-[10%] right-[-10%] w-96 h-96 bg-green-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        <div className="w-full flex justify-end md:justify-between items-center z-20 pointer-events-none shrink-0 mb-4">
          <GlobalLogo className="hidden md:flex pointer-events-auto" />
        </div>
        
        <div className="w-full max-w-md text-center shrink-0 opacity-0 animate-fade-in-up relative z-10 my-auto py-6" style={{ animationDelay: "0.1s" }}>
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500/15 mb-6 animate-bounce border border-green-500/30 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
              <span className="text-5xl">🎯</span>
            </div>
            <h2 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-green-400 to-emerald-600 mb-3 uppercase drop-shadow-md">
              Level Cleared!
            </h2>
            <div className="flex justify-center gap-4 mb-8 mt-6">
              {[1, 2, 3].map(star => {
                const activePlayer = gameState.players.find(p => p.id === playerId) || gameState.players[0];
                const opt = gameState.optimalGuesses || 7;
                const earnedStars = activePlayer.attempts <= opt ? 3 : activePlayer.attempts <= opt + 2 ? 2 : 1;
                const isEarned = star <= earnedStars;
                return (
                  <div key={star} className={`relative flex items-center justify-center w-20 h-20 rounded-2xl transition-all duration-700 ${isEarned ? 'bg-gradient-to-br from-game-amber/30 to-game-amber/5 border border-game-amber/40 shadow-[0_0_30px_rgba(251,191,36,0.4)] animate-fade-in-up' : 'bg-black/40 border border-white/5 opacity-50'}`} style={{ animationDelay: `${star * 0.15}s` }}>
                    <div className={`absolute inset-0 bg-game-amber/20 blur-xl rounded-full transition-opacity ${isEarned ? 'opacity-100' : 'opacity-0'}`} />
                    <Star 
                      className={`w-12 h-12 relative z-10 transition-transform ${isEarned ? 'fill-game-amber text-game-amber drop-shadow-[0_0_15px_rgba(251,191,36,0.8)] scale-110' : 'text-white/20 stroke-[1.5px] scale-90'}`} 
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-white/80 font-bold text-lg mb-2">
              Number was <span className="font-mono text-game-cyan text-xl">{gameState.targetNumber}</span>
            </p>
            <div className="inline-block bg-game-amber/10 border border-game-amber/30 px-4 py-2 rounded-xl mt-2">
              <span className="text-game-amber font-bold flex items-center gap-2">
                <Trophy className="w-4 h-4" /> Next up: Level {nextLevelNum}
              </span>
            </div>
          </div>

          <Button 
            onClick={() => { playSfx('click'); onNextLevel?.(); }} 
            disabled={disabledButton}
            title={disabledButton ? "Not enough players to continue" : ""}
            className="w-full h-16 text-lg font-black active:scale-[0.97] transition-all bg-green-500 hover:bg-green-400 text-game-dark shadow-[0_0_30px_rgba(34,197,94,0.4)] animate-pulse-glow disabled:opacity-50 disabled:grayscale disabled:animate-none"
          >
            START NEXT LEVEL
          </Button>
        </div>
        
        <DeveloperFooter className="shrink-0 mt-8 mb-2 z-10 opacity-100" />
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between items-center min-h-[100dvh] p-4 md:p-6 bg-game-dark overflow-y-auto overflow-x-hidden relative">
      <div className="w-full flex justify-end md:justify-between items-center z-20 pointer-events-none shrink-0 mb-4">
        <GlobalLogo className="hidden md:flex pointer-events-auto opacity-50 hover:opacity-100 transition-opacity" />
      </div>
      
      <div className="w-full max-w-md shrink-0 z-10 my-auto py-2 relative">
        <div className="text-center mb-6 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
          <div className="inline-flex items-center justify-center bg-game-purple/20 text-game-purple font-black text-xs px-3 py-1 rounded-full uppercase tracking-widest border border-game-purple/30 mb-3 shadow-[0_0_15px_rgba(171,71,188,0.2)]">
            Level {currentLevel} • {rankTitle}
          </div>
          <p className="text-xl md:text-2xl font-black text-white flex items-center justify-center gap-2 drop-shadow-md">
            <span>Range:{" "}
              <span className={`font-mono ${theme.text}`}>1</span>
              {" – "}
              <span className={`font-mono ${theme.text} text-2xl lg:text-3xl`}>{gameState.maxRange}</span>
            </span>
            {onLeaveEarly && (
              <button 
                onClick={() => { playSfx('click'); setShowLeaveConfirmEarly(true); }}
                className="ml-2 p-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30 transition-all active:scale-90"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </p>
        </div>

        <div className={`rounded-xl p-4 mb-4 text-center transition-colors duration-200 border relative overflow-hidden ${
            isMyTurn
              ? `${theme.bgMuted} ${theme.border} ${theme.accentGlow}`
              : "bg-muted/30 border-border/50"
          }`}
        >
          <p className={`text-sm font-black tracking-wide uppercase ${isMyTurn ? theme.text : "text-muted-foreground"}`}>
            {isMyTurn ? "⚡ HURRY! YOUR TURN" : `${currentTurnPlayer?.name}'s turn`}
          </p>
          <TurnTimer deadline={gameState.turnDeadline} isActive={gameState.status === 'playing'} duration={gameState.timerDuration ?? 15000} />
          
          {myPlayer && (
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                <div className="flex flex-col items-start w-full">
                  <div className="flex justify-between w-full items-end mb-1">
                    <span className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em]">Neural Capacity</span>
                    <span className={`font-mono font-black text-xs ${((gameState.optimalGuesses || 14) - (myPlayer?.attempts || 0)) <= 3 ? 'text-red-500 animate-pulse' : theme.text}`}>
                      {Math.max(0, (gameState.optimalGuesses || 14) - (myPlayer?.attempts || 0))} GUESSES LEFT
                    </span>
                  </div>
                  <div className="flex gap-0.5 w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10 p-[1px]">
                    {Array.from({ length: 20 }).map((_, i) => {
                      const total = gameState.optimalGuesses || 14;
                      const used = myPlayer?.attempts || 0;
                      const segmentValue = total / 20;
                      const threshold = (i + 1) * segmentValue;
                      const isActive = used < threshold;
                      const isCritical = (total - used) <= 3;

                      return (
                        <div 
                          key={i} 
                          className={`h-full flex-1 transition-all duration-200 rounded-[1px] ${
                            isActive 
                              ? isCritical ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]' : theme.primary 
                              : 'bg-transparent opacity-10'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl p-4 shadow-sm mb-4 border border-border/50">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Players Alive</p>
          <div className="space-y-1.5">
            {gameState.players.map((player) => {
              const maxHearts = gameState.maxHearts ?? 3;
              const playerHearts = player.hearts ?? maxHearts;
              return (
                <div key={player.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
                    player.id === currentTurnPlayer?.id && !player.isEliminated ? `ring-2 ${theme.ring} shadow-[0_0_15px_currentColor] bg-card/60` : 
                    player.id === playerId ? "bg-white/5 ring-1 ring-white/10" : player.isEliminated ? "bg-black/30 opacity-50 grayscale" : "bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 mr-2 flex-1">
                    <span className="font-medium truncate text-white">
                      {player.name} {player.id === playerId && "(You)"}
                    </span>
                    <div 
                      className={`w-2 h-2 rounded-full shrink-0 ${player.isOnline !== false ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" : "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)] animate-pulse"}`} 
                      title={player.isOnline !== false ? "Online" : "Offline / Disconnected"}
                    />
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {!player.isEliminated ? <HeartsDisplay hearts={playerHearts} maxHearts={maxHearts} size="sm" /> : <span>💀</span>}
                    <span className="font-mono font-bold text-game-purple text-xs">{player.score} pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {myPlayer && myPlayer.guesses.length > 0 && (
          <div className="bg-card/50 rounded-xl p-4 mb-4 border border-white/5 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex flex-col-reverse gap-1.5 max-h-40 overflow-y-auto stylish-scrollbar">
              {[...myPlayer.guesses].reverse().map((g) => (
                <div key={g.timestamp} className="flex items-center justify-between rounded-lg bg-black/40 px-3 py-2 text-sm">
                  <span className="font-mono font-medium text-white/80">{g.value}</span>
                  <span className="flex items-center gap-1 font-bold text-xs uppercase">
                    {g.hint === "higher" && <><ArrowUp className="h-3 w-3 text-red-400" /><span className="text-red-400">Higher</span></>}
                    {g.hint === "lower" && <><ArrowDown className="h-3 w-3 text-blue-400" /><span className="text-blue-400">Lower</span></>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isMyTurn && (
          <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="flex gap-2">
              <Input
                type="number"
                min={gameState.minRange}
                max={gameState.maxRange}
                placeholder={`Guess (${gameState.minRange}-${gameState.maxRange})`}
                value={guessInput}
                onChange={(e) => {
                  setGuessInput(e.target.value);
                  setInputError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmitGuess()}
                className={`h-14 text-lg font-mono bg-card/50 border-white/10 text-white placeholder:text-white/20 focus-visible:${theme.ring} focus-visible:ring-offset-0`}
                autoFocus
              />
              <Button
                onClick={() => { playSfx('click'); handleSubmitGuess(); }}
                className={`h-14 px-8 text-lg font-black active:scale-[0.97] transition-all ${theme.primary} ${theme.hover} ${theme.textDark} ${theme.glow}`}
              >
                GO
              </Button>
            </div>
            {inputError && <p className="text-sm text-red-400 mt-2 font-bold">{inputError}</p>}
          </div>
        )}
      </div>
      
      <DeveloperFooter className="shrink-0 mt-4 mb-2 z-10 opacity-40 hover:opacity-100 transition-opacity" />

      <LeaveConfirmModal
        open={showLeaveConfirmEarly}
        title="Quit Arcade?"
        message="Your progress will be lost and you will return to the main menu. Are you sure?"
        confirmLabel="Yes, Quit"
        onCancel={() => setShowLeaveConfirmEarly(false)}
        onConfirm={() => { if (onLeaveEarly) onLeaveEarly(); }}
      />
    </div>
  );
}
