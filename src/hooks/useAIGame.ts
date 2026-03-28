import { useState, useCallback, useEffect, useRef } from "react";
import { GameState, Player, generateTargetNumber, generatePlayerId } from "@/lib/game-types";

const AI_NAMES = ["HAL 9000", "GLaDOS", "DeepBlue", "AlphaGo", "ChatGPT", "Skynet"];
const getAiName = () => AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];

export function useAIGame(playerName: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId] = useState(() => generatePlayerId());
  
  // AI tracking properties
  const aiStateRef = useRef({ min: 1, max: 100 });
  const aiId = "ai-bot-id";

  const initGame = useCallback(() => {
    const player: Player = {
      id: playerId,
      name: playerName || "Player",
      attempts: 0,
      guesses: [],
      isHost: true,
      score: 0,
    };
    
    const aiPlayer: Player = {
      id: aiId,
      name: getAiName(),
      attempts: 0,
      guesses: [],
      isHost: false,
      score: 0,
    };

    const state: GameState = {
      roomCode: "LOCAL-AI",
      status: "playing",
      targetNumber: generateTargetNumber(1, 100),
      minRange: 1,
      maxRange: 100,
      currentTurnIndex: 0, // Player goes first
      players: [player, aiPlayer],
      winnerId: null,
      round: 1,
    };
    
    aiStateRef.current = { min: 1, max: 100 };
    setGameState(state);
  }, [playerId, playerName]);
  
  // Start the game immediately when the hook initializes with a player name
  useEffect(() => {
    if (playerName && !gameState) {
      initGame();
    }
  }, [playerName, gameState, initGame]);

  const makeGuess = useCallback(
    (guess: number) => {
      setGameState((prevState) => {
        if (!prevState) return prevState;
        
        const currentPlayer = prevState.players[prevState.currentTurnIndex];
        
        let hint: "higher" | "lower" | "correct";
        if (guess < prevState.targetNumber) hint = "higher";
        else if (guess > prevState.targetNumber) hint = "lower";
        else hint = "correct";

        const updatedPlayers = prevState.players.map((p) =>
          p.id === currentPlayer.id
            ? {
                ...p,
                attempts: p.attempts + 1,
                guesses: [
                  ...p.guesses,
                  { value: guess, hint, timestamp: Date.now() },
                ],
              }
            : p
        );

        const isWinner = hint === "correct";
        const nextTurnIndex = isWinner
          ? prevState.currentTurnIndex
          : (prevState.currentTurnIndex + 1) % prevState.players.length;

        const updated: GameState = {
          ...prevState,
          players: isWinner
            ? updatedPlayers.map((p) =>
                p.id === currentPlayer.id ? { ...p, score: p.score + 1 } : p
              )
            : updatedPlayers,
          currentTurnIndex: nextTurnIndex,
          status: isWinner ? "finished" : "playing",
          winnerId: isWinner ? currentPlayer.id : null,
        };

        // If playing smart AI locally, track bounds across all guesses
        if (hint === "higher") aiStateRef.current.min = Math.max(aiStateRef.current.min, guess + 1);
        if (hint === "lower") aiStateRef.current.max = Math.min(aiStateRef.current.max, guess - 1);

        return updated;
      });
    },
    []
  );
  
  // AI Turn Logic
  useEffect(() => {
    if (gameState && gameState.status === "playing") {
      const currentPlayer = gameState.players[gameState.currentTurnIndex];
      // Check if it's the AI's turn
      if (currentPlayer.id === aiId) {
        const timer = setTimeout(() => {
          const min = aiStateRef.current.min;
          const max = aiStateRef.current.max;
          // Random constrained guess logic: Math.floor(Math.random() * (max - min + 1)) + min
          // Guarantee valid bounds
          const safeMin = Math.min(min, 100);
          const safeMax = Math.max(max, safeMin);
          const aiGuess = Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
          makeGuess(aiGuess);
        }, 1200 + Math.random() * 800); // 1.2 to 2.0 seconds thinking time
        
        return () => clearTimeout(timer);
      }
    }
  }, [gameState, makeGuess]);

  const restartGame = useCallback(() => {
    setGameState((prevState) => {
      if (!prevState) return prevState;
      aiStateRef.current = { min: 1, max: 100 };
      return {
        ...prevState,
        status: "playing",
        targetNumber: generateTargetNumber(1, 100),
        currentTurnIndex: 0,
        players: prevState.players.map((p) => ({
          ...p,
          attempts: 0,
          guesses: [],
        })),
        winnerId: null,
        round: prevState.round + 1,
      };
    });
  }, []);

  const leaveRoom = useCallback(() => {
    setGameState(null);
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
  };
}
