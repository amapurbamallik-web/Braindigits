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
import { useAuth } from "@/contexts/AuthContext";

const TURN_DURATION_MS = 15000;

function getNextTurnIndex(currentIndex: number, players: Player[]): number {
  let nextIndex = (currentIndex + 1) % players.length;
  let loopCount = 0;
  while (players[nextIndex].isEliminated && loopCount < players.length) {
    nextIndex = (nextIndex + 1) % players.length;
    loopCount++;
  }
  return nextIndex;
}

export function useGameRoom() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId] = useState(() => generatePlayerId());
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const { user, profile, refreshProfile } = useAuth();
  const lastFinishedMatchId = useRef<string | null>(null);

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
        // Listen for being kicked by the host
        .on("broadcast", { event: "kick_player" }, ({ payload }) => {
          // Only react if YOU are the target
          if (payload?.targetPlayerId && payload.targetPlayerId === playerId) {
            cleanup();
            setGameState(null);
            setError("You were removed from the room by the host.");
          }
        })
        .subscribe();

      channelRef.current = channel;
      return channel;
    },
    [cleanup]
  );

  const createRoom = useCallback(
    (playerName: string, settings: import("@/lib/game-types").GameSettings) => {
      const roomCode = generateRoomCode();
      const maxHearts = settings.maxHearts ?? 3;
      const host: Player = {
        id: playerId,
        name: playerName,
        attempts: 0,
        guesses: [],
        isHost: true,
        score: 0,
        isEliminated: false,
        missedTurns: 0,
        hearts: maxHearts,
      };
      const state: GameState = {
        roomCode,
        status: "waiting",
        targetNumber: generateTargetNumber(1, settings.maxRange),
        minRange: 1,
        maxRange: settings.maxRange,
        currentTurnIndex: 0,
        players: [host],
        winnerId: null,
        round: 1,
        timerEnabled: settings.timerEnabled,
        timerDuration: settings.timerDuration,
        maxHearts,
      };
      setGameState(state);
      const channel = subscribeToChannel(roomCode, true);
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
        isEliminated: false,
        missedTurns: 0,
        hearts: undefined, // will be set by host when game starts
      };
      const channel = subscribeToChannel(roomCode.toUpperCase(), false);
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
    const maxHearts = gameState.maxHearts ?? 3;
    const updated: GameState = {
      ...gameState,
      status: "playing",
      currentTurnIndex: 0,
      targetNumber: generateTargetNumber(1, gameState.maxRange),
      minRange: 1,
      maxRange: gameState.maxRange,
      players: gameState.players.map((p) => ({
        ...p,
        attempts: 0,
        guesses: [],
        isEliminated: false,
        missedTurns: 0,
        hearts: maxHearts,
      })),
      winnerId: null,
      turnDeadline: gameState.timerEnabled ? Date.now() + (gameState.timerDuration ?? 15000) : undefined,
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
      if (!gameState || !channelRef.current || gameState.status !== "playing") return;
      
      const currentPlayer = gameState.players[gameState.currentTurnIndex];
      // Only the active player can make a guess to advance the state
      if (currentPlayer.id !== playerId) return;

      const validGuess = Math.max(gameState.minRange, Math.min(gameState.maxRange, guess));

      let hint: "higher" | "lower" | "correct";
      if (validGuess < gameState.targetNumber) hint = "higher";
      else if (validGuess > gameState.targetNumber) hint = "lower";
      else hint = "correct";

      const updatedPlayers = gameState.players.map((p) =>
        p.id === playerId
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
        ? gameState.currentTurnIndex
        : getNextTurnIndex(gameState.currentTurnIndex, updatedPlayers);

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
        turnDeadline: gameState.timerEnabled ? Date.now() + (gameState.timerDuration ?? 15000) : undefined,
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

  const skipTurn = useCallback(() => {
    if (!gameState || !channelRef.current || gameState.status !== "playing") return;
    
    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    if (currentPlayer.id !== playerId) return;

    const maxHearts = gameState.maxHearts ?? 3;
    const heartsEnabled = maxHearts > 0;

    let updatedPlayers = gameState.players;
    let isEliminated = false;

    if (heartsEnabled) {
      const currentHearts = currentPlayer.hearts ?? maxHearts;
      const newHearts = Math.max(0, currentHearts - 1);
      isEliminated = newHearts <= 0;
      updatedPlayers = gameState.players.map(p =>
        p.id === playerId ? { ...p, hearts: newHearts, isEliminated, missedTurns: (p.missedTurns || 0) + 1 } : p
      );
    } else {
      // Hearts disabled — just track missed turns, no elimination
      updatedPlayers = gameState.players.map(p =>
        p.id === playerId ? { ...p, missedTurns: (p.missedTurns || 0) + 1 } : p
      );
    }

    const activePlayers = updatedPlayers.filter(p => !p.isEliminated);
    
    let status: GameState["status"] = gameState.status;
    let winnerId = gameState.winnerId;
    let nextTurnIndex = gameState.currentTurnIndex;

    if (heartsEnabled && activePlayers.length <= 1 && gameState.players.length > 1) {
      status = "finished";
      winnerId = activePlayers.length === 1 ? activePlayers[0].id : null;
      if (winnerId) {
        updatedPlayers = updatedPlayers.map(p => p.id === winnerId ? { ...p, score: p.score + 1 } : p);
      }
    } else {
      nextTurnIndex = getNextTurnIndex(gameState.currentTurnIndex, updatedPlayers);
    }

    const updated: GameState = {
      ...gameState,
      players: updatedPlayers,
      status,
      winnerId,
      currentTurnIndex: nextTurnIndex,
      turnDeadline: status === "playing" && gameState.timerEnabled ? Date.now() + (gameState.timerDuration ?? 15000) : undefined,
    };

    setGameState(updated);
    channelRef.current.send({
      type: "broadcast",
      event: "game_update",
      payload: { state: updated },
    });
  }, [gameState, playerId]);

  const restartGame = useCallback(() => {
    if (!gameState || !channelRef.current) return;
    const maxHearts = gameState.maxHearts ?? 3;
    const updated: GameState = {
      ...gameState,
      status: "playing",
      targetNumber: generateTargetNumber(1, gameState.maxRange),
      currentTurnIndex: 0,
      minRange: 1,
      maxRange: gameState.maxRange,
      players: gameState.players.map((p) => ({
        ...p,
        attempts: 0,
        guesses: [],
        isEliminated: false,
        missedTurns: 0,
        hearts: maxHearts,
      })),
      winnerId: null,
      round: gameState.round + 1,
      turnDeadline: gameState.timerEnabled ? Date.now() + (gameState.timerDuration ?? 15000) : undefined,
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

  const kickPlayer = useCallback((targetPlayerId: string) => {
    if (!gameState || !channelRef.current) return;
    const amHost = gameState.players.find(p => p.id === playerId)?.isHost ?? false;
    if (!amHost) return;
    // Broadcast kick — the target player will auto-leave on receiving this
    channelRef.current.send({
      type: "broadcast",
      event: "kick_player",
      payload: { targetPlayerId },
    });
    // Remove from host's own state immediately
    const updated = {
      ...gameState,
      players: gameState.players.filter(p => p.id !== targetPlayerId),
    };
    setGameState(updated);
    channelRef.current.send({
      type: "broadcast",
      event: "game_update",
      payload: { state: updated },
    });
  }, [gameState, playerId]);

  const leaveGameEarly = useCallback(() => {
    if (!gameState || !channelRef.current || gameState.status !== "playing") return;

    const updatedPlayers = gameState.players.map(p => 
      p.id === playerId ? { ...p, isEliminated: true } : p
    );

    const activePlayers = updatedPlayers.filter(p => !p.isEliminated);
    
    let status: GameState["status"] = gameState.status;
    let winnerId = gameState.winnerId;
    let nextTurnIndex = gameState.currentTurnIndex;

    if (activePlayers.length <= 1 && gameState.players.length > 1) {
      status = "finished";
      winnerId = activePlayers.length === 1 ? activePlayers[0].id : null;
    } else if (gameState.players[gameState.currentTurnIndex].id === playerId) {
      nextTurnIndex = getNextTurnIndex(gameState.currentTurnIndex, updatedPlayers);
    }

    const updated: GameState = {
      ...gameState,
      players: updatedPlayers,
      status,
      winnerId,
      currentTurnIndex: nextTurnIndex,
      turnDeadline: (status === "playing" && nextTurnIndex !== gameState.currentTurnIndex && gameState.timerEnabled) 
        ? Date.now() + (gameState.timerDuration ?? 15000) 
        : gameState.turnDeadline,
    };

    channelRef.current.send({
      type: "broadcast",
      event: "game_update",
      payload: { state: updated },
    });

    leaveRoom();
  }, [gameState, playerId, leaveRoom]);

  const currentPlayer = gameState?.players.find((p) => p.id === playerId);
  const isMyTurn =
    gameState?.status === "playing" &&
    gameState.players[gameState.currentTurnIndex]?.id === playerId &&
    !gameState.players[gameState.currentTurnIndex]?.isEliminated;
  const isHost = currentPlayer?.isHost ?? false;

  // Timed auto-guess enforcer for Multiplayer
  useEffect(() => {
    if (gameState?.status !== "playing") return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      if (isMyTurn && gameState.turnDeadline && now >= gameState.turnDeadline) {
        // Time expired! Skip turn internally without penalties
        skipTurn();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [gameState, isMyTurn, skipTurn]);

  // Sync wins to profile on game end
  useEffect(() => {
    if (gameState?.status === "finished" && user && profile) {
      // Create a pseudo-match-id since we don't have a real UUID per match
      const matchId = `${gameState.roomCode}-${gameState.targetNumber}`;
      if (lastFinishedMatchId.current !== matchId) {
        lastFinishedMatchId.current = matchId;
        
        const isWinner = gameState.winnerId === playerId;
        const newWins = isWinner ? profile.total_wins + 1 : profile.total_wins;
        const newTotalGames = profile.total_games + 1;
        
        (supabase as any).from("profiles").update({
          total_wins: newWins,
          total_games: newTotalGames
        }).eq("id", user.id).then(() => refreshProfile());
      }
    }
  }, [gameState?.status, gameState?.winnerId, playerId, user, profile, refreshProfile]);

  const updateRoomSettings = useCallback(
    (newSettings: import("@/lib/game-types").GameSettings) => {
      if (!gameState || !channelRef.current) return;
      const updated: GameState = {
        ...gameState,
        maxRange: newSettings.maxRange,
        timerEnabled: newSettings.timerEnabled,
        timerDuration: newSettings.timerDuration,
        maxHearts: newSettings.maxHearts ?? 3,
      };
      setGameState(updated);
      channelRef.current.send({
        type: "broadcast",
        event: "game_update",
        payload: { state: updated },
      });
    },
    [gameState]
  );

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
    leaveGameEarly,
    kickPlayer,
    updateRoomSettings,
  };
}
