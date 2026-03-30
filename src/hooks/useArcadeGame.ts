import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  GameState,
  Player,
  generateRoomCode,
  generateTargetNumber,
  generatePlayerId,
  GameSettings
} from "@/lib/game-types";
import { getArcadeDifficulty, getArcadeEfficiencyScore } from "@/lib/arcade-logic";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/AuthContext";

function getNextTurnIndex(currentIndex: number, players: Player[]): number {
  let nextIndex = (currentIndex + 1) % players.length;
  let loopCount = 0;
  while (players[nextIndex].isEliminated && loopCount < players.length) {
    nextIndex = (nextIndex + 1) % players.length;
    loopCount++;
  }
  return nextIndex;
}

export function useArcadeGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId] = useState(() => generatePlayerId());
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const { user, profile, refreshProfile } = useAuth();
  const lastFinishedMatchId = useRef<string | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch (err) {}
      channelRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const subscribeToChannel = useCallback((roomCode: string, isHost: boolean) => {
    cleanup();
    const channel = supabase.channel(`arcade-${roomCode}`, {
      config: { 
        broadcast: { self: true },
        presence: { key: playerId },
      },
    });

    channel.on("broadcast", { event: "game_update" }, ({ payload }) => {
        if (payload?.state) setGameState(payload.state as GameState);
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
        safeSend(channel, { type: "broadcast", event: "game_update", payload: { state: updated } });
      })
      .on("broadcast", { event: "kick_player" }, ({ payload }) => {
        if (payload?.targetPlayerId && payload.targetPlayerId === playerId) {
          cleanup();
          setGameState(null);
          setError("You were removed from the room by the host.");
        }
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        const current = gameStateRef.current;
        if (!current || !key) return;

        const disconnectedPlayer = current.players.find(p => p.id === key);
        if (!disconnectedPlayer) return;

        let responsiblePlayerId = current.players.find(p => p.isHost && !p.isEliminated && p.id !== key)?.id;

        if (!responsiblePlayerId) {
           const remainingPlayers = current.players.filter(p => p.id !== key && !p.isEliminated);
           if (remainingPlayers.length > 0) {
             responsiblePlayerId = remainingPlayers[0].id;
           }
        }

        if (playerId !== responsiblePlayerId) return;

        if (current.status === "waiting") {
          const updated = {
            ...current,
            players: current.players.filter(p => p.id !== key).map(p => 
              p.id === responsiblePlayerId ? { ...p, isHost: true } : p
            ),
          };
          setGameState(updated);
          safeSend(channel, { type: "broadcast", event: "game_update", payload: { state: updated } });
        } else if (current.status === "playing" || current.status === "level_complete" || current.status === "finished") {
          const updatedPlayers = current.players.map(p => {
            if (p.id === key) return { ...p, isEliminated: true, isHost: false, isOnline: false };
            if (p.id === responsiblePlayerId) return { ...p, isHost: true };
            return p;
          });

          const activePlayers = updatedPlayers.filter(p => !p.isEliminated);
          
          let status: GameState["status"] = current.status;
          let nextTurnIndex = current.currentTurnIndex;

          if (activePlayers.length === 0 && current.status === "playing") {
            status = "finished";
          } else if (current.players[current.currentTurnIndex]?.id === key && current.status === "playing") {
            nextTurnIndex = getNextTurnIndex(current.currentTurnIndex, updatedPlayers);
          }

          const updated: GameState = {
            ...current,
            players: updatedPlayers,
            status,
            currentTurnIndex: nextTurnIndex,
            turnDeadline: (status === "playing" && current.turnDeadline) ? Date.now() + (current.timerDuration ?? 15000) : undefined,
          };

          setGameState(updated);
          safeSend(channel, { type: "broadcast", event: "game_update", payload: { state: updated } });
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({});
        }
      });

    channelRef.current = channel;
    return channel;
  }, [cleanup, playerId]);

  const safeSend = useCallback((channel: ReturnType<typeof supabase.channel> | null, payload: any) => {
    if (!channel) return;
    try { channel.send(payload); } catch (e) {}
  }, []);

  const createRoom = useCallback((playerName: string, isOffline = false, startingLevel = 1) => {
    const roomCode = isOffline ? "LOCAL" : generateRoomCode("A");
    
    // Scale immediately from the chosen level
    const diff = getArcadeDifficulty(startingLevel);
    const host: Player = {
      id: playerId,
      name: playerName,
      attempts: 0,
      guesses: [],
      isHost: true,
      score: 0,
      isEliminated: false,
      missedTurns: 0,
      hearts: diff.maxLives,
      isOnline: true,
    };
    const state: GameState = {
      roomCode,
      status: isOffline ? "playing" : "waiting",
      targetNumber: generateTargetNumber(1, diff.maxRange),
      minRange: 1,
      maxRange: diff.maxRange,
      currentTurnIndex: 0,
      players: [host],
      winnerId: null,
      round: 1,
      timerEnabled: true,
      timerDuration: diff.timerDuration,
      maxHearts: diff.maxLives,
      isArcade: true,
      level: startingLevel,
      optimalGuesses: diff.optimalGuesses,
      turnDeadline: isOffline ? Date.now() + diff.timerDuration : undefined,
    };
    setGameState(state);
    
    if (!isOffline) {
      const channel = subscribeToChannel(roomCode, true);
      setTimeout(() => {
        safeSend(channel, { type: "broadcast", event: "game_update", payload: { state } });
      }, 500);
    }
  }, [playerId, subscribeToChannel, safeSend]);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
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
      hearts: undefined, // Wait for sync
      isOnline: true,
    };
    const channel = subscribeToChannel(roomCode.toUpperCase(), false);
    setTimeout(() => {
      safeSend(channel, { type: "broadcast", event: "player_join", payload: { player } });
    }, 1000);
  }, [playerId, subscribeToChannel, safeSend]);

  const startGame = useCallback(() => {
    if (!gameState) return;
    const diff = getArcadeDifficulty(1);
    const updated: GameState = {
      ...gameState,
      status: "playing",
      currentTurnIndex: 0,
      targetNumber: generateTargetNumber(1, diff.maxRange),
      minRange: 1,
      maxRange: diff.maxRange,
      players: gameState.players.map((p) => ({
        ...p,
        attempts: 0,
        guesses: [],
        isEliminated: false,
        missedTurns: 0,
        hearts: diff.maxLives,
        score: 0
      })),
      winnerId: null,
      turnDeadline: Date.now() + diff.timerDuration,
      level: 1,
      optimalGuesses: diff.optimalGuesses,
      timerDuration: diff.timerDuration,
      maxHearts: diff.maxLives
    };
    setGameState(updated);
    safeSend(channelRef.current, { type: "broadcast", event: "game_update", payload: { state: updated } });
  }, [gameState, safeSend]);

  const skipTurn = useCallback(() => {
    if (!gameState || gameState.status !== "playing") return;
    
    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    if (currentPlayer.id !== playerId) return;

    const maxHearts = gameState.maxHearts ?? 3;
    const currentHearts = currentPlayer.hearts ?? maxHearts;
    const newHearts = Math.max(0, currentHearts - 1);
    const isEliminated = newHearts <= 0;

    const updatedPlayers = gameState.players.map(p =>
      p.id === playerId ? { ...p, hearts: newHearts, isEliminated, missedTurns: (p.missedTurns || 0) + 1 } : p
    );

    const activePlayers = updatedPlayers.filter(p => !p.isEliminated);
    
    let status: GameState["status"] = gameState.status;
    let winnerId = gameState.winnerId;
    let nextTurnIndex = gameState.currentTurnIndex;

    // In arcade, if you're the last one and you die -> Game Over
    if (activePlayers.length === 0) {
      status = "finished";
      winnerId = null; // Everyone lost
    } else {
      nextTurnIndex = getNextTurnIndex(gameState.currentTurnIndex, updatedPlayers);
    }

    const updated: GameState = {
      ...gameState,
      players: updatedPlayers,
      status,
      winnerId,
      currentTurnIndex: nextTurnIndex,
      turnDeadline: status === "playing" ? Date.now() + (gameState.timerDuration ?? 15000) : undefined,
    };

    setGameState(updated);
    safeSend(channelRef.current, { type: "broadcast", event: "game_update", payload: { state: updated } });
  }, [gameState, playerId, safeSend]);

  const makeGuess = useCallback((guess: number) => {
    if (!gameState || gameState.status !== "playing") return;
    
    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    if (currentPlayer.id !== playerId) return;

    const validGuess = Math.max(gameState.minRange, Math.min(gameState.maxRange, guess));
    let hint: "higher" | "lower" | "correct";
    if (validGuess < gameState.targetNumber) hint = "higher";
    else if (validGuess > gameState.targetNumber) hint = "lower";
    else hint = "correct";

    const isWinner = hint === "correct";

    let updatedPlayers = gameState.players.map((p) =>
      p.id === playerId ? { ...p, attempts: p.attempts + 1, missedTurns: 0, guesses: [...p.guesses, { value: validGuess, hint, timestamp: Date.now() }] } : p
    );

    let updated: GameState;

    if (isWinner) {
      // ARCADE LEVEL UP RULES
      updated = {
        ...gameState,
        status: "level_complete",
        players: updatedPlayers.map(p => ({
          ...p,
          score: p.id === playerId ? p.score + 1 : p.score,
        }))
      };
    } else {
      // Check if player reaches guess limit
      const pAfterGuess = updatedPlayers.find(p => p.id === playerId);
      const limitReached = pAfterGuess && pAfterGuess.attempts >= (gameState.optimalGuesses || 999);
      
      if (limitReached) {
        updatedPlayers = updatedPlayers.map(p => p.id === playerId ? { ...p, isEliminated: true } : p);
      }

      const activePlayers = updatedPlayers.filter(p => !p.isEliminated);
      const newStatus = activePlayers.length === 0 ? "finished" : gameState.status;

      updated = {
        ...gameState,
        players: updatedPlayers,
        status: newStatus,
        currentTurnIndex: newStatus === "playing" ? getNextTurnIndex(gameState.currentTurnIndex, updatedPlayers) : gameState.currentTurnIndex,
        turnDeadline: newStatus === "playing" ? Date.now() + (gameState.timerDuration ?? 15000) : undefined
      };
    }
    setGameState(updated);
    safeSend(channelRef.current, { type: "broadcast", event: "game_update", payload: { state: updated } });
  }, [gameState, playerId, safeSend]);

  const nextLevel = useCallback(() => {
    if (!gameState || (!channelRef.current && channelRef.current !== null) || gameState.status !== "level_complete") return;
    const nextLvl = (gameState.level || 1) + 1;
    const diff = getArcadeDifficulty(nextLvl);
    const updated: GameState = {
      ...gameState,
      level: nextLvl,
      targetNumber: generateTargetNumber(1, diff.maxRange),
      minRange: 1,
      maxRange: diff.maxRange,
      optimalGuesses: diff.optimalGuesses,
      timerDuration: diff.timerDuration,
      maxHearts: diff.maxLives, 
      currentTurnIndex: getNextTurnIndex(gameState.currentTurnIndex, gameState.players),
      status: "playing",
      turnDeadline: Date.now() + diff.timerDuration,
      players: gameState.players.filter(p => p.isOnline !== false).map(p => ({
        ...p,
        guesses: [],
        attempts: 0,
        hearts: diff.maxLives 
      }))
    };
    setGameState(updated);
    safeSend(channelRef.current, { type: "broadcast", event: "game_update", payload: { state: updated } });
  }, [gameState, safeSend]);

  const restartGame = useCallback(() => {
    if (!gameState) return;
    const diff = getArcadeDifficulty(1);
    const updated: GameState = {
      ...gameState,
      status: "playing",
      targetNumber: generateTargetNumber(1, diff.maxRange),
      currentTurnIndex: 0,
      minRange: 1,
      maxRange: diff.maxRange,
      players: gameState.players.filter(p => p.isOnline !== false).map((p) => ({
        ...p,
        attempts: 0,
        guesses: [],
        isEliminated: false,
        missedTurns: 0,
        hearts: diff.maxLives,
        score: 0
      })),
      winnerId: null,
      level: 1,
      optimalGuesses: diff.optimalGuesses,
      timerDuration: diff.timerDuration,
      maxHearts: diff.maxLives,
      turnDeadline: Date.now() + diff.timerDuration,
    };
    setGameState(updated);
    safeSend(channelRef.current, { type: "broadcast", event: "game_update", payload: { state: updated } });
  }, [gameState, safeSend]);

  const kickPlayer = useCallback((targetPlayerId: string) => {
    if (!gameState) return;
    const amHost = gameState.players.find(p => p.id === playerId)?.isHost ?? false;
    if (!amHost) return;
    safeSend(channelRef.current, { type: "broadcast", event: "kick_player", payload: { targetPlayerId } });
    const updated = { ...gameState, players: gameState.players.filter(p => p.id !== targetPlayerId) };
    setGameState(updated);
    safeSend(channelRef.current, { type: "broadcast", event: "game_update", payload: { state: updated } });
  }, [gameState, playerId, safeSend]);

  const leaveRoom = useCallback(() => {
    cleanup();
    setError(null);
    setGameState(null);
  }, [cleanup]);

  const leaveGameEarly = useCallback(() => {
    if (!gameState || gameState.status !== "playing") return;
    const updatedPlayers = gameState.players.map(p => p.id === playerId ? { ...p, isEliminated: true } : p);
    const activePlayers = updatedPlayers.filter(p => !p.isEliminated);
    
    let status: GameState["status"] = gameState.status;
    let nextTurnIndex = gameState.currentTurnIndex;

    if (activePlayers.length === 0) {
      status = "finished";
    } else if (gameState.players[gameState.currentTurnIndex].id === playerId) {
      nextTurnIndex = getNextTurnIndex(gameState.currentTurnIndex, updatedPlayers);
    }

    const updated: GameState = {
      ...gameState,
      players: updatedPlayers,
      status,
      currentTurnIndex: nextTurnIndex,
    };

    safeSend(channelRef.current, { type: "broadcast", event: "game_update", payload: { state: updated } });
    leaveRoom();
  }, [gameState, playerId, leaveRoom, safeSend]);

  // Timed auto-guess enforcer (cascaded)
  useEffect(() => {
    if (gameState?.status !== "playing") return;
    const interval = setInterval(() => {
      const current = gameStateRef.current;
      if (!current || current.status !== "playing" || !current.turnDeadline) return;
      const now = Date.now();
      
      const currentTurnPlayer = current.players[current.currentTurnIndex];
      const isMyTurnInner = currentTurnPlayer?.id === playerId && !currentTurnPlayer?.isEliminated;
      
      if (isMyTurnInner && now >= current.turnDeadline) {
         skipTurn();
         return;
      }
      
      const enforcerDelay = current.players.find(p => p.isHost && !p.isEliminated && p.isOnline !== false)?.id === playerId ? 3000 : 6000;
      if (!isMyTurnInner && now >= current.turnDeadline + enforcerDelay) {
         skipTurn();
      }
    }, 500);
    return () => clearInterval(interval);
  }, [gameState?.status, playerId, skipTurn]);

  // Sync high scores / logic to profile
  useEffect(() => {
    if (gameState?.status === "finished" && user && profile) {
      const matchId = `${gameState.roomCode}-arcade-end`;
      // We could store highest level in DB if we added an arcade_level field to profiles.
    }
  }, [gameState?.status, user, profile, refreshProfile, gameState?.roomCode]);

  // We mock settings update to avoid breaking Lobby dependency
  const updateRoomSettings = useCallback((newSettings: GameSettings) => {
    // Cannot change settings in arcade mode
  }, []);

  const currentPlayer = gameState?.players.find((p) => p.id === playerId);
  const isMyTurn = gameState?.status === "playing" && gameState.players[gameState.currentTurnIndex]?.id === playerId && !gameState.players[gameState.currentTurnIndex]?.isEliminated;
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
    nextLevel,
    makeGuess,
    restartGame,
    leaveRoom,
    leaveGameEarly,
    kickPlayer,
    updateRoomSettings,
  };
}
