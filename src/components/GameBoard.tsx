import { useState, useEffect, useRef } from "react";
import { GameState } from "@/lib/game-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUp, ArrowDown, Trophy, RotateCcw, LogOut, Settings2, ArrowLeft } from "lucide-react";
import { useAudio } from "@/contexts/AudioContext";
import confetti from "canvas-confetti";
import { RoomSettingsModal } from "./RoomSettingsModal";
import { GlobalLogo, DeveloperFooter } from "./Branding";
import { LeaveConfirmModal } from "./LeaveConfirmModal";
import { getThemeClasses, GameMode } from "@/lib/theme-logic";
import { ProfileModal } from "./ProfileModal";
import { UserProfile } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// Hearts display component
const HeartsDisplay = ({ hearts, maxHearts, size = 'sm' }: { hearts: number; maxHearts: number; size?: 'sm' | 'lg' }) => {
  const isCritical = hearts === 1;
  const iconSize = size === 'lg' ? 'text-xl' : 'text-sm';
  return (
    <div className={`flex gap-0.5 items-center ${size === 'lg' ? 'gap-1' : ''}`}>
      {Array.from({ length: maxHearts }).map((_, i) => (
        <span
          key={i}
          className={`${iconSize} leading-none transition-all duration-300 ${
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

interface GameBoardProps {
  gameState: GameState;
  playerId: string;
  isMyTurn: boolean;
  onGuess: (guess: number) => void;
  onRestart: () => void;
  onLeave: () => void;
  onLeaveEarly?: () => void;
  onUpdateSettings: (s: import("@/lib/game-types").GameSettings) => void;
  onRequestRestart?: () => void;
  restartRequests?: Record<string, boolean>;
  isHost: boolean;
  mode?: GameMode;
}

const TurnTimer = ({ deadline, isActive, duration, mode = 'friends' }: { deadline?: number, isActive: boolean, duration: number, mode?: GameMode }) => {
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
        // Play tick when 5s or less remain
        if (remaining <= 5000 && seconds !== lastTickRef.current) {
          playSfx('tick');
          lastTickRef.current = seconds;
        }
        animationFrameId = requestAnimationFrame(updateTime);
      } else if (!hasPlayedTimeoutRef.current) {
        // Time expired! Play harsh timeout buzzer
        playSfx('timeout');
        hasPlayedTimeoutRef.current = true;
      }
    };
    
    animationFrameId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(animationFrameId);
  }, [deadline, isActive, playSfx]);

  const percentage = Math.max(0, Math.min(100, (timeLeft / duration) * 100));
  const isCritical = timeLeft < 5000 && isActive && timeLeft > 0;
  const secondsLeft = Math.ceil(timeLeft / 1000);

  return (
    <div className="w-full mt-3 relative">
      <div className="flex justify-between items-center mb-1.5 px-0.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Time Remaining</span>
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
export function GameBoard({
  gameState,
  playerId,
  isMyTurn,
  onGuess,
  onRestart,
  onLeave,
  onLeaveEarly,
  onUpdateSettings,
  onRequestRestart,
  restartRequests = {},
  isHost,
  mode = 'friends'
}: GameBoardProps & { mode?: GameMode }) {
  const [guessInput, setGuessInput] = useState("");
  const theme = getThemeClasses(mode);
  const [inputError, setInputError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [requestRestartSent, setRequestRestartSent] = useState(false);
  const [showLeaveConfirmEarly, setShowLeaveConfirmEarly] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const fetchAndShowProfile = async (targetId: string) => {
    if (loadingProfile) return;
    setLoadingProfile(true);
    const { data, error } = await (supabase as any).from('profiles').select('*').eq('id', targetId).single();
    setLoadingProfile(false);
    
    if (error || !data) {
      toast.error("Could not reach player profile.");
      return;
    }
    
    setSelectedProfile(data as UserProfile);
  };

  const myPlayer = gameState.players.find((p) => p.id === playerId);
  const currentTurnPlayer = gameState.players[gameState.currentTurnIndex];
  const winner = gameState.winnerId
    ? gameState.players.find((p) => p.id === gameState.winnerId)
    : null;

  useEffect(() => {
    if (gameState.status === 'playing') {
      setRequestRestartSent(false);
    }
  }, [gameState.status]);

  useEffect(() => {
    let isActive = true;
    let timeoutId: NodeJS.Timeout;
    let animationFrameId: number;

    if (gameState.status === "finished" && winner && winner.id === playerId) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        if (!isActive) return;

        confetti({
          particleCount: 6,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors: mode === 'ai' ? ['#FBBF24', '#F59E0B', '#D97706'] : mode === 'arcade' ? ['#AB47BC', '#D946EF', '#EC4899'] : ['#00E5FF', '#00B8D4', '#00838F'],
          zIndex: 0
        });
        confetti({
          particleCount: 6,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: mode === 'ai' ? ['#FBBF24', '#F59E0B', '#D97706'] : mode === 'arcade' ? ['#AB47BC', '#D946EF', '#EC4899'] : ['#00E5FF', '#00B8D4', '#00838F'],
          zIndex: 0
        });

        if (Date.now() < end) {
          animationFrameId = requestAnimationFrame(frame);
        }
      };
      
      timeoutId = setTimeout(frame, 200);
    }

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      confetti.reset();
    };
  }, [gameState.status, winner?.id, playerId, mode]);

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

  const maxHearts = gameState.maxHearts ?? 3;
  const playerHearts = myPlayer?.hearts ?? maxHearts;

  // Winner screen
  if (gameState.status === "finished" && winner) {
    const isMe = winner.id === playerId;
    const losingPlayers = gameState.players.filter(p => p.id !== winner.id);
    const wonByElimination = losingPlayers.some(p => p.isEliminated && (p.hearts ?? 1) <= 0);
    const wonByDisconnect = losingPlayers.some(p => p.isEliminated && (p.hearts ?? 1) > 0);
    const wonByGuess = !wonByElimination && !wonByDisconnect && winner.guesses.length > 0 && winner.guesses[winner.guesses.length - 1]?.hint === 'correct';
    
    return (
      <div className="flex flex-col justify-between items-center min-h-[100dvh] p-4 md:p-6 bg-game-dark overflow-y-auto overflow-x-hidden relative">
        <div className={`absolute top-[-10%] left-[-10%] w-96 h-96 ${theme.bgMuted} rounded-full blur-[100px] pointer-events-none animate-pulse`} />
        
        <div className="w-full flex justify-end md:justify-between items-center z-20 pointer-events-none shrink-0 mb-4 px-2 md:px-0">
          <GlobalLogo className="hidden md:flex pointer-events-auto" />
        </div>

        <div className="w-full max-w-md text-center shrink-0 opacity-0 animate-fade-in-up relative z-10 my-auto py-6" style={{ animationDelay: "0.1s" }}>
          <div className="mb-6 text-center">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${theme.bgMuted} mb-4 animate-bounce-subtle border ${theme.border} ${theme.glow}`}>
              {isMe ? (
                <Trophy className={`h-10 w-10 ${theme.text}`} />
              ) : wonByDisconnect ? (
                <span className="text-4xl">🔌</span>
              ) : wonByElimination ? (
                <span className="text-4xl">💀</span>
              ) : (
                <Trophy className={`h-10 w-10 ${theme.text}`} />
              )}
            </div>
            <h2 className="text-4xl font-black tracking-tight text-white mb-2 uppercase drop-shadow-md">
              {isMe ? "Victory!" : "Game Over"}
            </h2>
            {wonByDisconnect ? (
              <p className={`${theme.text} font-bold text-lg`}>
                {isMe ? "Opponent disconnected! 🔌" : `${winner.name} won by default — someone left!`}
              </p>
            ) : wonByElimination ? (
              <p className={`${theme.text} font-bold text-lg`}>
                {isMe ? "Opponent ran out of lives! ❤️" : `${winner.name} survived — you ran out of lives!`}
              </p>
            ) : wonByGuess ? (
              <p className={`${theme.text} font-bold text-lg`}>
                Guessed correctly in {winner.attempts} attempts!
              </p>
            ) : (
              <p className={`${theme.text} font-bold text-lg`}>Round complete!</p>
            )}
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              The number was <span className={`font-mono font-bold ${theme.text} text-xl`}>{gameState.targetNumber}</span>
            </p>
          </div>

          <div className="bg-card/50 backdrop-blur-xl rounded-2xl p-5 shadow-lg mb-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4">Final Leaderboard</h3>
            <div className="space-y-2">
              {[...gameState.players].sort((a,b) => b.score - a.score).map((player, i) => (
                <div key={player.id} className={`flex justify-between items-center bg-black/40 p-3 rounded-lg border ${player.id === playerId ? theme.border : 'border-white/5'}`}>
                  <span className="font-medium text-white/90 truncate mr-2">
                    <span className="text-muted-foreground mr-2 font-mono">#{i+1}</span>
                    {player.name} {player.id === playerId ? "(You)" : ""}
                  </span>
                  <span className={`font-bold ${theme.text}`}>{player.score} pts</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="h-14 flex items-center justify-center gap-2 rounded-xl bg-white text-game-dark hover:bg-white/90 hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] font-black transition-all active:scale-[0.97] shadow-xl"
            >
              <ArrowLeft className="h-5 w-5" />
              Back
            </button>
            {isHost && (
              <Button 
                onClick={onRestart} 
                disabled={mode !== 'ai' && gameState.players.filter(p => p.isOnline !== false).length < 2}
                title={(mode !== 'ai' && gameState.players.filter(p => p.isOnline !== false).length < 2) ? "Not enough players to start a new match" : ""}
                className={`h-14 font-black active:scale-[0.97] transition-all ${theme.primary} ${theme.hover} ${theme.textDark} ${theme.glow} disabled:opacity-50 disabled:grayscale`}
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Play Again
              </Button>
            )}
            {isHost && (
              <Button
                onClick={() => setShowSettings(true)}
                variant="outline"
                className={`col-span-2 h-12 flex items-center justify-center gap-2 rounded-xl border-dashed ${theme.border} ${theme.text} hover:${theme.bgMuted} font-bold transition-all active:scale-[0.97]`}
              >
                <Settings2 className="h-4 w-4" />
                Match Settings
              </Button>
            )}
          </div>
          {!isHost && (
            <div className="mt-4 flex flex-col items-center gap-3">
              <Button
                onClick={() => {
                  onRequestRestart?.();
                  setRequestRestartSent(true);
                }}
                disabled={requestRestartSent}
                variant="outline"
                className={`w-full h-14 font-black active:scale-[0.97] transition-all border-game-cyan/30 text-game-cyan hover:bg-game-cyan/10 ${requestRestartSent ? 'opacity-70' : 'animate-pulse shadow-[0_0_15px_rgba(34,211,238,0.15)]'}`}
              >
                <RotateCcw className={`h-5 w-5 mr-2 ${requestRestartSent ? '' : 'animate-spin-slow'}`} />
                {requestRestartSent ? "Request Sent" : "Request Restart"}
              </Button>
              <p className="text-xs text-muted-foreground/60">Waiting for host to restart…</p>
            </div>
          )}
        </div>
        
        <DeveloperFooter className="shrink-0 mt-8 mb-2 z-10 opacity-100" />

        <LeaveConfirmModal
          open={showLeaveConfirm}
          onCancel={() => setShowLeaveConfirm(false)}
          onConfirm={() => { setShowLeaveConfirm(false); onLeave(); }}
        />

        <LeaveConfirmModal
          open={showLeaveConfirmEarly}
          title="Abort Battle?"
          message="Are you sure you want to exit? Your synaptic progress in this match will be lost."
          confirmLabel="Abort Mission"
          onCancel={() => setShowLeaveConfirmEarly(false)}
          onConfirm={() => { 
            setShowLeaveConfirmEarly(false); 
            if (onLeaveEarly) onLeaveEarly(); 
            else onLeave(); 
          }}
        />

        <RoomSettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          settings={{
            maxRange: gameState.maxRange,
            timerEnabled: gameState.timerEnabled ?? true,
            timerDuration: gameState.timerDuration ?? 15000,
            maxHearts: gameState.maxHearts ?? 3,
            autoIncreaseRange: gameState.autoIncreaseRange,
            guessLimitEnabled: gameState.guessLimitEnabled,
            guessLimitDifficulty: gameState.guessLimitDifficulty,
          }}
          onSettingsChange={onUpdateSettings}
        />
      </div>
    );
  }

  // Game in progress
  return (
    <div className="flex flex-col justify-between items-center min-h-[100dvh] p-4 md:p-6 bg-game-dark overflow-y-auto overflow-x-hidden relative">
      <div className="w-full flex justify-end md:justify-between items-center z-20 pointer-events-none shrink-0 mb-4 px-2 md:px-0">
        <GlobalLogo className="hidden md:flex pointer-events-auto opacity-50 hover:opacity-100 transition-opacity" />
        
        <div className="flex items-center gap-2 md:gap-3 pointer-events-auto">
          {isHost && gameState.status !== 'playing' && (
            <Button
              onClick={() => setShowSettings(true)}
              variant="outline"
              size="icon"
              className={`rounded-full w-10 h-10 md:w-11 md:h-11 bg-card/50 backdrop-blur-md border ${theme.border} ${theme.text} hover:${theme.primary} hover:${theme.textDark} transition-all active:scale-95 shadow-lg active:shadow-none`}
              title="Match Settings"
            >
              <Settings2 className="h-5 w-5" />
            </Button>
          )}
          <button
            onClick={() => setShowLeaveConfirmEarly(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-md border border-white/10 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all active:scale-95 z-50 pointer-events-auto shadow-lg"
          >
            <LogOut className="w-5 h-5 md:w-4 md:h-4" /> <span className="text-sm font-bold">Leave</span>
          </button>
        </div>
      </div>

      <div className={`absolute top-[-10%] right-[-10%] w-[500px] h-[500px] ${theme.bgMuted} rounded-full blur-[120px] pointer-events-none opacity-40 animate-pulse`} />

      <div className="w-full max-w-md shrink-0 z-10 my-auto py-2 relative">
        <div className="text-center mb-6 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
            Round {gameState.round} <span className="mx-1 opacity-30">•</span> Room {gameState.roomCode}
          </p>
          <h2 className="text-2xl md:text-3xl font-black text-white flex items-center justify-center gap-2 drop-shadow-md">
            Guess between <span className={`font-mono ${theme.text} text-3xl md:text-4xl`}>{gameState.minRange} – {gameState.maxRange}</span>
          </h2>
        </div>

        <div className={`rounded-2xl p-4 md:p-5 mb-4 text-center transition-all duration-200 border relative overflow-hidden ${
            isMyTurn
              ? `${theme.bgMuted} ${theme.border} ${theme.glow}`
              : "bg-muted/30 border-border/50"
          }`}
        >
          <div className={`absolute inset-0 bg-gradient-to-r from-transparent ${isMyTurn ? (mode === 'ai' ? 'via-game-amber/5' : 'via-game-cyan/5') : 'via-transparent'} to-transparent animate-shimmer scale-[2] pointer-events-none`} />
          <p className={`text-sm font-black tracking-widest uppercase mb-1 relative z-10 ${isMyTurn ? theme.text : "text-muted-foreground"}`}>
            {isMyTurn ? "⚡ YOUR TURN!" : `${currentTurnPlayer?.name.toUpperCase()}'S TURN`}
          </p>
          <TurnTimer deadline={gameState.turnDeadline} isActive={gameState.status === 'playing'} duration={gameState.timerDuration ?? 15000} mode={mode} />
        </div>

        <div className="bg-card/40 backdrop-blur-xl rounded-2xl p-4 md:p-6 mb-6 border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-white/5 to-transparent" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 mb-4 px-1">Active Players</h3>
          <div className="space-y-2.5">
            {gameState.players.map((player) => {
              const playerHearts = player.hearts ?? maxHearts;
              return (
                <div key={player.id} className={`relative flex items-center justify-between rounded-xl px-4 py-2.5 text-sm transition-all ${
                    player.id === currentTurnPlayer?.id && !player.isEliminated ? `ring-2 ${theme.ring} shadow-[0_0_15px_currentColor] bg-card/60` :
                    player.id === playerId ? `${theme.bgMuted} ring-1 ${theme.ring}` : player.isEliminated ? "bg-black/30 opacity-50 grayscale" : "bg-muted/40"
                  }`}
                >
                  {/* Restart Request Chat Bubble */}
                  {restartRequests[player.id] && (
                    <div className="absolute -top-11 left-8 z-[100] animate-in slide-in-from-bottom-2 fade-in duration-300 pointer-events-none">
                      <div className="relative bg-white text-game-dark px-3 py-1.5 rounded-2xl rounded-bl-sm text-[10px] font-black uppercase tracking-wider shadow-[0_4px_15px_rgba(255,255,255,0.3)] flex items-center gap-1.5 whitespace-nowrap border border-white/50 animate-float">
                        <RotateCcw className="w-3 h-3 animate-spin-slow" />
                        Play again!
                        {/* Triangle pointer */}
                        <div className="absolute bottom-[-6px] left-[2px] w-0 h-0 border-l-[6px] border-l-transparent border-t-[8px] border-t-white border-r-[6px] border-r-transparent" />
                      </div>
                    </div>
                  )}
                    <div 
                      className={`relative flex items-center gap-3 min-w-0 flex-1 cursor-pointer group/name`}
                      onClick={() => fetchAndShowProfile(player.id)}
                    >
                      <div 
                        className={`w-2 h-2 rounded-full shrink-0 ${player.isOnline !== false ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" : "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)] animate-pulse"}`} 
                        title={player.isOnline !== false ? "Online" : "Offline"}
                      />
                      <span className={`font-medium truncate transition-colors ${player.id === playerId ? theme.text : "text-white/80 group-hover/name:text-white"}`}>
                        {player.name} {player.id === playerId && "(you)"}
                      </span>
                    </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {gameState.guessLimitEnabled && !player.isEliminated && (
                       <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${((gameState.maxGuesses || Math.ceil(Math.log2(gameState.maxRange) * (gameState.guessLimitDifficulty === 'hard' ? 1 : gameState.guessLimitDifficulty === 'medium' ? 1.5 : 2))) - player.attempts) <= 3 ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse' : 'bg-white/5 border-white/10 text-muted-foreground'}`}>
                         {(gameState.maxGuesses || Math.ceil(Math.log2(gameState.maxRange) * (gameState.guessLimitDifficulty === 'hard' ? 1 : gameState.guessLimitDifficulty === 'medium' ? 1.5 : 2))) - player.attempts} Lf
                       </span>
                    )}
                    {!player.isEliminated ? <HeartsDisplay hearts={playerHearts} maxHearts={maxHearts} size="sm" /> : <span className="text-[10px] uppercase font-bold text-red-500/70 tracking-tighter uppercase line-through">Out</span>}
                    <span className={`font-mono font-bold ${theme.text}`}>{player.score}pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {myPlayer && myPlayer.guesses.length > 0 && (
          <div className="bg-card/50 backdrop-blur-md rounded-2xl p-4 mb-6 border border-white/5 opacity-0 animate-fade-in-up shadow-inner relative overflow-hidden" style={{ animationDelay: "0.1s" }}>
            <div className="flex flex-col-reverse gap-2 max-h-40 overflow-y-auto stylish-scrollbar pr-1 relative z-10">
              {[...myPlayer.guesses].reverse().map((g, idx) => (
                <div key={g.timestamp || idx} className="flex items-center justify-between rounded-xl bg-black/40 px-4 py-3 text-sm border border-white/5 group hover:bg-black/60 transition-colors">
                  <span className="font-mono font-black text-white group-hover:scale-110 transition-transform">{g.value}</span>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 font-black text-[10px] uppercase tracking-widest ${g.hint === 'higher' ? 'text-red-400' : 'text-blue-400'}`}>
                      {g.hint === "higher" ? (
                        <><ArrowUp className="h-3.5 w-3.5" /> Higher</>
                      ) : (
                        <><ArrowDown className="h-3.5 w-3.5" /> Lower</>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          <div className="flex gap-2 group relative">
            <div className={`absolute -inset-1 bg-gradient-to-r ${isMyTurn ? (mode === 'ai' ? 'from-game-amber/40 to-game-amber/5' : 'from-game-cyan/40 to-game-cyan/5') : 'from-transparent to-transparent'} rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500`} />
            <div className="relative flex-1 flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="number"
                  min={gameState.minRange}
                  max={gameState.maxRange}
                  placeholder={`Your guess (${gameState.minRange}-${gameState.maxRange})`}
                  value={guessInput}
                  onChange={(e) => {
                    setGuessInput(e.target.value);
                    setInputError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmitGuess()}
                  className={`h-14 text-xl font-black bg-card/50 ${theme.border} text-white placeholder:text-white/20 rounded-xl focus-visible:ring-offset-0 focus-visible:${theme.ring} transition-all`}
                  autoFocus={isMyTurn}
                  disabled={!isMyTurn}
                />
                {inputError && (
                  <p className="absolute -bottom-6 left-1 text-[10px] font-bold text-red-400 uppercase tracking-wider animate-in slide-in-from-top-1">
                    {inputError}
                  </p>
                )}
              </div>
              <Button
                onClick={handleSubmitGuess}
                disabled={!isMyTurn || !guessInput}
                className={`h-14 px-8 text-lg font-black active:scale-[0.97] transition-all rounded-xl ${theme.primary} ${theme.hover} ${theme.textDark} ${theme.accentGlow}`}
              >
                Guess
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2 justify-center pt-2">
            <div className="px-5 py-2.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex flex-col items-center min-w-[100px] shadow-lg">
               <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5 opacity-60">Status</span>
               <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-green-400 animate-pulse' : 'bg-muted-foreground/30'} shadow-[0_0_8px_rgba(74,222,128,0.4)]`} />
                  <span className="text-[11px] font-black text-white uppercase tracking-tighter">{isMyTurn ? "Your Turn" : "Waiting"}</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      <DeveloperFooter className="shrink-0 mt-8 mb-2 z-10 opacity-70" />

      <RoomSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={{
          maxRange: gameState.maxRange,
          timerEnabled: gameState.timerEnabled ?? true,
          timerDuration: gameState.timerDuration ?? 15000,
          maxHearts: gameState.maxHearts ?? 3,
          autoIncreaseRange: gameState.autoIncreaseRange,
          guessLimitEnabled: gameState.guessLimitEnabled,
          guessLimitDifficulty: gameState.guessLimitDifficulty,
        }}
        onSettingsChange={onUpdateSettings}
      />

      <ProfileModal
        open={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        profile={selectedProfile}
        readOnly
      />
    </div>
  );
}

