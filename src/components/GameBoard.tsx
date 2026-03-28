import { useState, useEffect, useRef } from "react";
import { GameState } from "@/lib/game-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUp, ArrowDown, Trophy, RotateCcw, LogOut } from "lucide-react";
import { useAudio } from "@/contexts/AudioContext";
import confetti from "canvas-confetti";

interface GameBoardProps {
  gameState: GameState;
  playerId: string;
  isMyTurn: boolean;
  onGuess: (guess: number) => void;
  onRestart: () => void;
  onLeave: () => void;
  isHost: boolean;
}

const TurnTimer = ({ deadline, isActive, duration }: { deadline?: number, isActive: boolean, duration: number }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
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
        <span className={`text-xs font-mono font-bold ${isActive ? (isCritical ? "text-red-400 animate-pulse" : "text-game-cyan") : "text-muted-foreground"}`}>
          {secondsLeft.toString().padStart(2, '0')}s
        </span>
      </div>
      <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
        <div 
          className={`h-full rounded-full ${
            isActive 
              ? isCritical ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" : "bg-game-cyan shadow-[0_0_10px_rgba(0,229,255,0.5)]" 
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
  isHost,
}: GameBoardProps) {
  const [guessInput, setGuessInput] = useState("");
  const [inputError, setInputError] = useState("");

  const myPlayer = gameState.players.find((p) => p.id === playerId);
  const currentTurnPlayer = gameState.players[gameState.currentTurnIndex];
  const winner = gameState.winnerId
    ? gameState.players.find((p) => p.id === gameState.winnerId)
    : null;

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
          colors: ['#00E5FF', '#FFB300', '#AB47BC'],
          zIndex: 1000
        });
        confetti({
          particleCount: 6,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: ['#00E5FF', '#FFB300', '#AB47BC'],
          zIndex: 1000
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
      // Immediately clear particles from screen on state change
      confetti.reset();
    };
  }, [gameState.status, winner?.id, playerId]);

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

  // Winner screen
  if (gameState.status === "finished" && winner) {
    const isMe = winner.id === playerId;
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-game-dark">
        <div className="w-full max-w-md text-center opacity-0 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-game-amber/15 mb-4 animate-bounce-subtle">
              <Trophy className="h-10 w-10 text-game-amber" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">
              {isMe ? "You won!" : `${winner.name} wins!`}
            </h2>
            <p className="text-muted-foreground mt-2">
              Guessed correctly in {winner.attempts} attempt{winner.attempts !== 1 ? "s" : ""}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              The number was{" "}
              <span className="font-mono font-bold text-game-cyan">{gameState.targetNumber}</span>
            </p>
          </div>

          <div className="bg-card rounded-xl p-5 shadow-sm mb-6 border border-border/50">
            <p className="text-sm font-medium text-muted-foreground mb-3">Leaderboard</p>
            <div className="space-y-2">
              {[...gameState.players]
                .sort((a, b) => b.score - a.score)
                .map((player, i) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between rounded-lg px-4 py-2.5 ${
                      player.id === winner.id ? "bg-game-cyan/10 border border-game-cyan/20" : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-muted-foreground w-5">#{i + 1}</span>
                      <span className="font-medium">{player.name}</span>
                    </div>
                    <span className="font-mono font-bold text-game-amber">{player.score} pts</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onLeave} className="flex-1 h-12 active:scale-[0.97] transition-transform border-border/50">
              <LogOut className="h-4 w-4 mr-2" />
              Leave
            </Button>
            {isHost && (
              <Button onClick={onRestart} className="flex-1 h-12 font-semibold active:scale-[0.97] transition-transform bg-game-cyan hover:bg-game-cyan/90 text-game-dark">
                <RotateCcw className="h-4 w-4 mr-2" />
                Play Again
              </Button>
            )}
          </div>
          {!isHost && (
            <p className="text-sm text-muted-foreground mt-4">Waiting for host to restart…</p>
          )}
        </div>
      </div>
    );
  }

  // Game in progress
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-game-dark">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Round {gameState.round} · Room {gameState.roomCode}
          </p>
          <p className="text-lg font-semibold">
            Guess between{" "}
            <span className="font-mono text-game-cyan">{gameState.minRange}</span>
            {" – "}
            <span className="font-mono text-game-cyan">{gameState.maxRange}</span>
          </p>
        </div>

        {/* Turn indicator */}
        <div
          className={`rounded-xl p-4 mb-6 text-center transition-colors border relative overflow-hidden ${
            isMyTurn
              ? "bg-game-cyan/10 border-game-cyan/30 shadow-[0_0_15px_rgba(0,229,255,0.1)]"
              : "bg-muted/30 border-border/50"
          }`}
        >
          <p className={`text-sm font-bold tracking-wide ${isMyTurn ? "text-game-cyan" : "text-muted-foreground"}`}>
            {isMyTurn ? "⚡ YOUR TURN!" : `${currentTurnPlayer?.name.toUpperCase()}'S TURN`}
          </p>
          {gameState.timerEnabled !== false && (
            <TurnTimer deadline={gameState.turnDeadline} isActive={gameState.status === 'playing'} duration={gameState.timerDuration ?? 15000} />
          )}
        </div>

        {/* My guesses (private) */}
        {myPlayer && myPlayer.guesses.length > 0 && (
          <div className="bg-card rounded-xl p-4 shadow-sm mb-4 border border-border/50 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Your guesses
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {myPlayer.guesses.map((g, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
                >
                  <span className="font-mono font-medium">{g.value}</span>
                  <span className="flex items-center gap-1 font-medium">
                    {g.hint === "higher" && (
                      <>
                        <ArrowUp className="h-3.5 w-3.5 hint-higher" />
                        <span className="hint-higher">Higher</span>
                      </>
                    )}
                    {g.hint === "lower" && (
                      <>
                        <ArrowDown className="h-3.5 w-3.5 hint-lower" />
                        <span className="hint-lower">Lower</span>
                      </>
                    )}
                    {g.hint === "correct" && (
                      <span className="hint-correct">✓ Correct!</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Player scores */}
        <div className="bg-card rounded-xl p-4 shadow-sm mb-6 border border-border/50">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Players
          </p>
          <div className="space-y-1.5">
            {gameState.players.map((player, i) => (
              <div
                key={player.id}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  i === gameState.currentTurnIndex
                    ? "bg-game-cyan/10 ring-1 ring-game-cyan/20"
                    : "bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  {i === gameState.currentTurnIndex && (
                    <div className="w-1.5 h-1.5 rounded-full bg-game-cyan animate-pulse-glow" />
                  )}
                  <span className={`font-medium ${player.id === playerId ? "text-game-cyan" : ""}`}>
                    {player.name}
                    {player.id === playerId && " (you)"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="text-xs">{player.attempts} guesses</span>
                  <span className="font-mono font-bold text-game-amber text-xs">
                    {player.score}pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Input */}
        {isMyTurn && (
          <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="flex gap-2">
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
                className="h-12 text-base font-mono bg-card/50 border-border/50"
                autoFocus
              />
              <Button
                onClick={handleSubmitGuess}
                className="h-12 px-6 font-semibold active:scale-[0.97] transition-transform bg-game-cyan hover:bg-game-cyan/90 text-game-dark"
              >
                Guess
              </Button>
            </div>
            {inputError && (
              <p className="text-sm text-destructive mt-2">{inputError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
