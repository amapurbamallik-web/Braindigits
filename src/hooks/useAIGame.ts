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
        const nextTurnIndex = isWinner
          ? prevState.currentTurnIndex
          : (prevState.currentTurnIndex + 1) % prevState.players.length;

        // Update active min/max hints for AI ONLY if it's the AI's turn
        if (currentPlayer.id === aiId) {
          if (hint === "higher") {
            aiStateRef.current.min = Math.max(aiStateRef.current.min, validGuess + 1);
          } else if (hint === "lower") {
            aiStateRef.current.max = Math.min(aiStateRef.current.max, validGuess - 1);
          }
        }

        return {
          ...prevState,
          players: isWinner
            ? updatedPlayers.map((p) =>
                p.id === currentPlayer.id ? { ...p, score: p.score + 1 } : p
              )
            : updatedPlayers,
          currentTurnIndex: nextTurnIndex,
          status: isWinner ? "finished" : "playing",
          winnerId: isWinner ? currentPlayer.id : null,
          turnDeadline: settings.timerEnabled ? Date.now() + settings.timerDuration : undefined,
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
      return {
        ...prevState,
        status: "playing",
        targetNumber: generateTargetNumber(1, settings.maxRange),
        currentTurnIndex: 0,
        minRange: 1,
        maxRange: settings.maxRange,
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
        turnDeadline: settings.timerEnabled ? Date.now() + settings.timerDuration : undefined,
      };
    });
  }, []);

  const leaveRoom = useCallback(() => {
    setGameState(null);
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
