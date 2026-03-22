import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  GameState,
  Player,
  generateRoomCode,
  generateTargetNumber,
  generatePlayerId,
} from "@/lib/game-types";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useGameRoom() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId] = useState(() => generatePlayerId());
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const gameStateRef = useRef<GameState | null>(null);

  // Keep ref in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const subscribeToChannel = useCallback(
    (roomCode: string, isHost: boolean) => {
      cleanup();
      const channel = supabase.channel(`game-${roomCode}`, {
        config: { broadcast: { self: true } },
      });

      channel
        .on("broadcast", { event: "game_update" }, ({ payload }) => {
          if (payload?.state) {
            setGameState(payload.state as GameState);
          }
        })
        .on("broadcast", { event: "player_join" }, ({ payload }) => {
          if (!isHost) return;
          const current = gameStateRef.current;
          if (!current) return;
          const newPlayer = payload.player as Player;
          if (current.players.find((p) => p.id === newPlayer.id)) return;
          const updated = {
            ...current,
            players: [...current.players, newPlayer],
          };
          setGameState(updated);
          channel.send({
            type: "broadcast",
            event: "game_update",
            payload: { state: updated },
          });
        })
        .subscribe();

      channelRef.current = channel;
      return channel;
    },
    [cleanup]
  );

  const createRoom = useCallback(
    (playerName: string) => {
      const roomCode = generateRoomCode();
      const host: Player = {
        id: playerId,
        name: playerName,
        attempts: 0,
        guesses: [],
        isHost: true,
        score: 0,
      };
      const state: GameState = {
        roomCode,
        status: "waiting",
        targetNumber: generateTargetNumber(1, 100),
        minRange: 1,
        maxRange: 100,
        currentTurnIndex: 0,
        players: [host],
        winnerId: null,
        round: 1,
      };
      setGameState(state);
      const channel = subscribeToChannel(roomCode, true);
      // Broadcast initial state after a small delay to ensure subscription
      setTimeout(() => {
        channel.send({
          type: "broadcast",
          event: "game_update",
          payload: { state },
        });
      }, 500);
    },
    [playerId, subscribeToChannel]
  );

  const joinRoom = useCallback(
    (roomCode: string, playerName: string) => {
      setError(null);
      const player: Player = {
        id: playerId,
        name: playerName,
        attempts: 0,
        guesses: [],
        isHost: false,
        score: 0,
      };
      const channel = subscribeToChannel(roomCode.toUpperCase(), false);
      // Send join request after subscription is ready
      setTimeout(() => {
        channel.send({
          type: "broadcast",
          event: "player_join",
          payload: { player },
        });
      }, 1000);
    },
    [playerId, subscribeToChannel]
  );

  const startGame = useCallback(() => {
    if (!gameState || !channelRef.current) return;
    const updated: GameState = {
      ...gameState,
      status: "playing",
      currentTurnIndex: 0,
      targetNumber: generateTargetNumber(1, 100),
      players: gameState.players.map((p) => ({
        ...p,
        attempts: 0,
        guesses: [],
      })),
      winnerId: null,
    };
    setGameState(updated);
    channelRef.current.send({
      type: "broadcast",
      event: "game_update",
      payload: { state: updated },
    });
  }, [gameState]);

  const makeGuess = useCallback(
    (guess: number) => {
      if (!gameState || !channelRef.current) return;
      const currentPlayer = gameState.players[gameState.currentTurnIndex];
      if (currentPlayer.id !== playerId) return;

      let hint: "higher" | "lower" | "correct";
      if (guess < gameState.targetNumber) hint = "higher";
      else if (guess > gameState.targetNumber) hint = "lower";
      else hint = "correct";

      const updatedPlayers = gameState.players.map((p) =>
        p.id === playerId
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
        ? gameState.currentTurnIndex
        : (gameState.currentTurnIndex + 1) % gameState.players.length;

      const updated: GameState = {
        ...gameState,
        players: isWinner
          ? updatedPlayers.map((p) =>
              p.id === playerId ? { ...p, score: p.score + 1 } : p
            )
          : updatedPlayers,
        currentTurnIndex: nextTurnIndex,
        status: isWinner ? "finished" : "playing",
        winnerId: isWinner ? playerId : null,
      };

      setGameState(updated);
      channelRef.current.send({
        type: "broadcast",
        event: "game_update",
        payload: { state: updated },
      });
    },
    [gameState, playerId]
  );

  const restartGame = useCallback(() => {
    if (!gameState || !channelRef.current) return;
    const updated: GameState = {
      ...gameState,
      status: "playing",
      targetNumber: generateTargetNumber(1, 100),
      currentTurnIndex: 0,
      players: gameState.players.map((p) => ({
        ...p,
        attempts: 0,
        guesses: [],
      })),
      winnerId: null,
      round: gameState.round + 1,
    };
    setGameState(updated);
    channelRef.current.send({
      type: "broadcast",
      event: "game_update",
      payload: { state: updated },
    });
  }, [gameState]);

  const leaveRoom = useCallback(() => {
    cleanup();
    setGameState(null);
    setError(null);
  }, [cleanup]);

  const currentPlayer = gameState?.players.find((p) => p.id === playerId);
  const isMyTurn =
    gameState?.status === "playing" &&
    gameState.players[gameState.currentTurnIndex]?.id === playerId;
  const isHost = currentPlayer?.isHost ?? false;

  return {
    gameState,
    playerId,
    currentPlayer,
    isMyTurn,
    isHost,
    error,
    createRoom,
    joinRoom,
    startGame,
    makeGuess,
    restartGame,
    leaveRoom,
  };
}
