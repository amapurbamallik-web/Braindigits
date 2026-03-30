import { useState, useCallback, useEffect, useRef } from "react";
import { GameState, Player, generateTargetNumber, generatePlayerId } from "@/lib/game-types";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const AI_NAMES = ["HAL 9000", "GLaDOS", "DeepBlue", "AlphaGo", "ChatGPT", "Skynet"];
const getAiName = () => AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
const TURN_DURATION_MS = 15000;

export function useAIGame(playerName: string, settings: import("@/lib/game-types").GameSettings) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId] = useState(() => generatePlayerId());
  
  // AI tracking properties
  const aiStateRef = useRef({ min: 1, max: 100 });
  const aiId = "ai-bot-id";
  const { user, profile, refreshProfile } = useAuth();
  const lastFinishedMatchId = useRef<string | null>(null);

  const initGame = useCallback(() => {
    const maxHearts = settings.maxHearts ?? 3;
    const player: Player = {
      id: playerId,
      name: playerName || "Player",
      attempts: 0,
      guesses: [],
      isHost: true,
      score: 0,
      isEliminated: false,
      missedTurns: 0,
      hearts: maxHearts,
    };
    
    const aiPlayer: Player = {
      id: aiId,
      name: getAiName(),
      attempts: 0,
      guesses: [],
      isHost: false,
      score: 0,
      isEliminated: false,
      missedTurns: 0,
      hearts: maxHearts,
    };

    const state: GameState = {
      roomCode: "LOCAL-AI",
      status: "playing",
      targetNumber: generateTargetNumber(1, settings.maxRange),
      minRange: 1,
      maxRange: settings.maxRange,
      currentTurnIndex: 0, // Player goes first
      players: [player, aiPlayer],
      winnerId: null,
      round: 1,
      turnDeadline: settings.timerEnabled ? Date.now() + settings.timerDuration : undefined,
      timerEnabled: settings.timerEnabled,
      timerDuration: settings.timerDuration,
      maxHearts,
      guessLimitEnabled: settings.guessLimitEnabled,
      guessLimitDifficulty: settings.guessLimitDifficulty || 'easy',
      maxGuesses: Math.ceil(Math.log2(settings.maxRange) * (settings.guessLimitDifficulty === 'hard' ? 1 : settings.guessLimitDifficulty === 'medium' ? 1.5 : 2)),
    };
    
    aiStateRef.current = { min: 1, max: settings.maxRange };
    setGameState(state);
  }, [playerId, playerName, settings]);
  
  // Start the game immediately when the hook initializes with a player name
  useEffect(() => {
    if (playerName && !gameState) {
      initGame();
    }
  }, [playerName, gameState, initGame]);

  const makeGuess = useCallback(
    (guess: number) => {
      setGameState((prevState) => {
        if (!prevState || prevState.status !== "playing") return prevState;
        
        const currentPlayer = prevState.players[prevState.currentTurnIndex];
        
        // Ensure valid guess bounds for auto-guess or user error
        const validGuess = Math.max(prevState.minRange, Math.min(prevState.maxRange, guess));
        
        let hint: "higher" | "lower" | "correct";
        if (validGuess < prevState.targetNumber) hint = "higher";
        else if (validGuess > prevState.targetNumber) hint = "lower";
        else hint = "correct";

        const updatedPlayers = prevState.players.map((p) =>
          p.id === currentPlayer.id
            ? {
                ...p,
                attempts: p.attempts + 1,
                missedTurns: 0,
                guesses: [
                  ...p.guesses,
                  { value: validGuess, hint, timestamp: Date.now() },
                ],
              }
            : p
        );

        const isWinner = hint === "correct";
        let nextTurnIndex = isWinner
          ? prevState.currentTurnIndex
          : (prevState.currentTurnIndex + 1) % prevState.players.length;

        let finalPlayers = updatedPlayers;
        let status: GameState["status"] = isWinner ? "finished" : "playing";
        let winnerId = isWinner ? currentPlayer.id : null;

        // Handle Guess Limit Elimination
        if (!isWinner && prevState.guessLimitEnabled) {
          const m = prevState.guessLimitDifficulty === 'hard' ? 1 : prevState.guessLimitDifficulty === 'medium' ? 1.5 : 2;
          const pLimit = prevState.maxGuesses || Math.ceil(Math.log2(prevState.maxRange) * m);
          const pAfter = updatedPlayers.find(p => p.id === currentPlayer.id);
          if (pAfter && pAfter.attempts >= pLimit) {
             finalPlayers = updatedPlayers.map(p => p.id === currentPlayer.id ? { ...p, isEliminated: true } : p);
             const activePlayers = finalPlayers.filter(p => !p.isEliminated);
             
             if (activePlayers.length === 1) {
                status = "finished";
                winnerId = activePlayers[0].id;
             } else if (activePlayers.length === 0) {
                status = "finished";
                winnerId = null;
             } else {
                nextTurnIndex = (prevState.currentTurnIndex + 1) % prevState.players.length;
             }
          }
        }

        if (isWinner) {
           finalPlayers = updatedPlayers.map((p) =>
              p.id === currentPlayer.id ? { ...p, score: p.score + 1 } : p
           );
        } else if (winnerId && status === "finished") {
           finalPlayers = finalPlayers.map(p => p.id === winnerId ? { ...p, score: p.score + 1 } : p);
        }

        return {
          ...prevState,
          players: finalPlayers,
          currentTurnIndex: nextTurnIndex,
          status,
          winnerId,
          turnDeadline: status === "playing" && settings.timerEnabled ? Date.now() + settings.timerDuration : undefined,
        };
      });
    },
    []
  );
  
  // AI Turn Logic & Auto-guess Enforcement
  useEffect(() => {
    if (gameState && gameState.status === "playing") {
      const currentPlayer = gameState.players[gameState.currentTurnIndex];
      const isAI = currentPlayer.id === aiId;
      
      let timer: number | null = null;
      let interval: number | null = null;

      if (isAI) {
        // AI makes its standard intentional move
        timer = window.setTimeout(() => {
          const min = aiStateRef.current.min;
          const max = aiStateRef.current.max;
          const safeMin = Math.min(min, 100);
          const safeMax = Math.max(max, safeMin);
          const aiGuess = Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
          makeGuess(aiGuess);
        }, 1200 + Math.random() * 800) as unknown as number; // 1.2 to 2.0s
      }

      // Enforce the deadline for EVERYONE
      interval = window.setInterval(() => {
        setGameState((prev) => {
          if (prev && prev.status === 'playing' && prev.turnDeadline && Date.now() >= prev.turnDeadline) {
            const currentPlayer = prev.players[prev.currentTurnIndex];
            const maxHearts = prev.maxHearts ?? 3;
            const heartsEnabled = maxHearts > 0;

            let updatedPlayers = prev.players;
            if (heartsEnabled) {
              const currentHearts = currentPlayer.hearts ?? maxHearts;
              const newHearts = Math.max(0, currentHearts - 1);
              const isEliminated = newHearts <= 0;
              updatedPlayers = prev.players.map((p) =>
                p.id === currentPlayer.id
                  ? { ...p, hearts: newHearts, isEliminated, missedTurns: (p.missedTurns || 0) + 1 }
                  : p
              );
            } else {
              updatedPlayers = prev.players.map((p) =>
                p.id === currentPlayer.id
                  ? { ...p, missedTurns: (p.missedTurns || 0) + 1 }
                  : p
              );
            }

            const activePlayers = updatedPlayers.filter(p => !p.isEliminated);
            let status: GameState["status"] = prev.status;
            let winnerId = prev.winnerId;

            if (heartsEnabled && activePlayers.length === 1) {
              status = "finished";
              winnerId = activePlayers[0].id;
              if (winnerId) {
                updatedPlayers = updatedPlayers.map(p => p.id === winnerId ? { ...p, score: p.score + 1 } : p);
              }
            }

            return {
              ...prev,
              players: updatedPlayers,
              currentTurnIndex: (prev.currentTurnIndex + 1) % prev.players.length,
              status,
              winnerId,
              turnDeadline: settings.timerEnabled ? Date.now() + settings.timerDuration : undefined,
            };
          }
          return prev;
        });
      }, 500);
      
      return () => {
        if (timer) clearTimeout(timer);
        if (interval) clearInterval(interval);
      };
    }
  }, [gameState?.currentTurnIndex, gameState?.status, makeGuess]);
  // Sync AI wins to profile on game end
  useEffect(() => {
    if (gameState?.status === "finished" && user && profile) {
      const matchId = `ai-${gameState.targetNumber}`;
      if (lastFinishedMatchId.current !== matchId) {
        lastFinishedMatchId.current = matchId;
        
        const isWinner = gameState.winnerId === playerId;
        const newWins = isWinner ? profile.ai_wins + 1 : profile.ai_wins;
        // Total games also goes up
        const newTotalGames = profile.total_games + 1;
        
        (supabase as any).from("profiles").update({
          ai_wins: newWins,
          total_games: newTotalGames
        }).eq("id", user.id).then(() => refreshProfile());
      }
    }
  }, [gameState?.status, gameState?.winnerId, playerId, user, profile, refreshProfile]);

  const restartGame = useCallback(() => {
    setGameState((prevState) => {
      if (!prevState) return prevState;
      const maxHearts = prevState.maxHearts ?? 3;
      aiStateRef.current = { min: 1, max: 100 };
      
      const currentMax = prevState.maxRange;
      const newMax = prevState.autoIncreaseRange ? currentMax * 2 : currentMax;

      return {
        ...prevState,
        status: "playing",
        targetNumber: generateTargetNumber(1, newMax),
        currentTurnIndex: 0,
        minRange: 1,
        maxRange: newMax,
        players: prevState.players.map((p) => ({
          ...p,
          attempts: 0,
          guesses: [],
          isEliminated: false,
          missedTurns: 0,
          hearts: maxHearts,
        })),
        winnerId: null,
        round: prevState.round + 1,
        guessLimitEnabled: settings.guessLimitEnabled,
        guessLimitDifficulty: settings.guessLimitDifficulty || 'easy',
        maxGuesses: Math.ceil(Math.log2(settings.maxRange) * (settings.guessLimitDifficulty === 'hard' ? 1 : settings.guessLimitDifficulty === 'medium' ? 1.5 : 2)),
        turnDeadline: settings.timerEnabled ? Date.now() + settings.timerDuration : undefined,
      };
    });
  }, []);

  const leaveRoom = useCallback(() => {
    // nothing needed
  }, []);

  const updateRoomSettings = useCallback((newSettings: import("@/lib/game-types").GameSettings) => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        maxRange: newSettings.maxRange,
        timerEnabled: newSettings.timerEnabled,
        timerDuration: newSettings.timerDuration,
        maxHearts: newSettings.maxHearts ?? 3,
        guessLimitEnabled: newSettings.guessLimitEnabled,
        guessLimitDifficulty: newSettings.guessLimitDifficulty || 'easy',
      };
    });
  }, []);

  const currentPlayer = gameState?.players.find((p) => p.id === playerId);
  const isMyTurn =
    gameState?.status === "playing" &&
    gameState.players[gameState.currentTurnIndex]?.id === playerId;

  return {
    gameState,
    playerId,
    currentPlayer,
    isMyTurn,
    isHost: true,
    error: null,
    // Mocks for unused multiplayer functions
    createRoom: () => {},
    joinRoom: () => {},
    startGame: () => {}, 
    makeGuess,
    restartGame,
    leaveRoom,
    leaveGameEarly: leaveRoom,
    updateRoomSettings,
  };
}
