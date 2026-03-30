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
      try {
        supabase.removeChannel(channelRef.current);
      } catch (err) {
        console.warn("Channel already removed or error during cleanup:", err);
      }
      channelRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const subscribeToChannel = useCallback(
    (roomCode: string, isHost: boolean) => {
      cleanup();
      const channel = supabase.channel(`game-${roomCode}`, {
        config: { 
          broadcast: { self: true },
          presence: { key: playerId },
        },
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
          safeSend(channel, {
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
        .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
          const current = gameStateRef.current;
          if (!current || !key) return; // 'key' is the playerId of the disconnected player

          const disconnectedPlayer = current.players.find(p => p.id === key);
          if (!disconnectedPlayer) return;

          // Determine who is responsible for handling this disconnect event and broadcasting the new state.
          // By default, the current host is responsible.
          let responsiblePlayerId = current.players.find(p => p.isHost && !p.isEliminated && p.id !== key)?.id;

          // If the host just disconnected (or no host found), the next earliest connected active player becomes responsible.
          if (!responsiblePlayerId) {
             const remainingPlayers = current.players.filter(p => p.id !== key && !p.isEliminated);
             if (remainingPlayers.length > 0) {
               responsiblePlayerId = remainingPlayers[0].id;
             }
          }

          // If I am NOT the responsible player, I don't broadcast the update. I just wait for the update from them.
          if (playerId !== responsiblePlayerId) return;

          // Now we are the responsible player. We must eliminate 'key' and broadcast the update.
          // If the disconnected player was the host (or we were chosen as backup), we also promote ourselves to host.
          
          if (current.status === "waiting") {
            const updated = {
              ...current,
              players: current.players.filter(p => p.id !== key).map(p => 
                p.id === responsiblePlayerId ? { ...p, isHost: true } : p
              ),
            };
            setGameState(updated);
            safeSend(channel, {
              type: "broadcast",
              event: "game_update",
              payload: { state: updated },
            });
          } else if (current.status === "playing") {
            const updatedPlayers = current.players.map(p => {
              if (p.id === key) return { ...p, isEliminated: true, isHost: false, isOnline: false };
              if (p.id === responsiblePlayerId) return { ...p, isHost: true };
              return p;
            });

            const activePlayers = updatedPlayers.filter(p => !p.isEliminated);
            
            let status: GameState["status"] = current.status;
            let winnerId = current.winnerId;
            let nextTurnIndex = current.currentTurnIndex;

            if (activePlayers.length <= 1 && current.players.length > 1) {
              status = "finished";
              winnerId = activePlayers.length === 1 ? activePlayers[0].id : null;
              if (winnerId) {
                const winnerIndex = updatedPlayers.findIndex(p => p.id === winnerId);
                if (winnerIndex >= 0) {
                  updatedPlayers[winnerIndex].score += 1;
                }
              }
            } else if (current.players[current.currentTurnIndex]?.id === key) {
              nextTurnIndex = getNextTurnIndex(current.currentTurnIndex, updatedPlayers);
            }

            const updated: GameState = {
              ...current,
              players: updatedPlayers,
              status,
              winnerId,
              currentTurnIndex: nextTurnIndex,
              turnDeadline: (status === "playing" && nextTurnIndex !== current.currentTurnIndex && current.timerEnabled) 
                ? Date.now() + (current.timerDuration ?? 15000) 
                : current.turnDeadline,
            };

            setGameState(updated);
            safeSend(channel, {
              type: "broadcast",
              event: "game_update",
              payload: { state: updated },
            });
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            try {
              await channel.track({ online_at: new Date().toISOString() });
            } catch (err) {
              console.warn("Failed to track presence", err);
            }
          }
        });

      channelRef.current = channel;
      return channel;
    },
    [playerId, cleanup]
  );

  const safeSend = useCallback((channel: ReturnType<typeof supabase.channel> | null, payload: any) => {
    if (!channel) return;
    try {
      channel.send(payload);
    } catch (e) {
      console.warn('Failed to send message via Supabase RT', e);
    }
  }, []);

  const createRoom = useCallback(
    (playerName: string, settings: import("@/lib/game-types").GameSettings) => {
      const roomCode = generateRoomCode("F");
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
        isOnline: true,
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
        safeSend(channel, {
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
        isOnline: true,
      };
      const channel = subscribeToChannel(roomCode.toUpperCase(), false);
      setTimeout(() => {
        safeSend(channel, {
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
      guessLimitEnabled: gameState.guessLimitEnabled,
      guessLimitDifficulty: gameState.guessLimitDifficulty,
      maxGuesses: Math.ceil(Math.log2(gameState.maxRange) * (gameState.guessLimitDifficulty === 'hard' ? 1 : gameState.guessLimitDifficulty === 'medium' ? 1.5 : 2)),
      turnDeadline: gameState.timerEnabled ? Date.now() + (gameState.timerDuration ?? 15000) : undefined,
    };
    setGameState(updated);
    safeSend(channelRef.current, {
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
      
      let nextTurnIndex = isWinner
        ? gameState.currentTurnIndex
        : getNextTurnIndex(gameState.currentTurnIndex, updatedPlayers);

      let finalPlayers = updatedPlayers;
      let status: GameState["status"] = isWinner ? "finished" : "playing";
      let winnerId = isWinner ? playerId : null;

      // Handle Guess Limit Elimination
      if (!isWinner && gameState.guessLimitEnabled) {
        const m = gameState.guessLimitDifficulty === 'hard' ? 1 : gameState.guessLimitDifficulty === 'medium' ? 1.5 : 2;
        const pLimit = gameState.maxGuesses || Math.ceil(Math.log2(gameState.maxRange) * m);
        const currentPlayerAfter = updatedPlayers.find(p => p.id === playerId);
        if (currentPlayerAfter && currentPlayerAfter.attempts >= pLimit) {
          finalPlayers = updatedPlayers.map(p => p.id === playerId ? { ...p, isEliminated: true } : p);
          const activePlayers = finalPlayers.filter(p => !p.isEliminated);
          
          if (activePlayers.length === 1 && gameState.players.length > 1) {
            status = "finished";
            winnerId = activePlayers[0].id;
          } else if (activePlayers.length === 0) {
            status = "finished";
            winnerId = null;
          } else {
            nextTurnIndex = getNextTurnIndex(gameState.currentTurnIndex, finalPlayers);
          }
        }
      }

      if (isWinner) {
        finalPlayers = updatedPlayers.map((p) =>
            p.id === playerId ? { ...p, score: p.score + 1 } : p
        );
      } else if (winnerId && status === "finished") {
        finalPlayers = finalPlayers.map(p => p.id === winnerId ? { ...p, score: p.score + 1 } : p);
      }

      const updated: GameState = {
        ...gameState,
        players: finalPlayers,
        currentTurnIndex: nextTurnIndex,
        status,
        winnerId,
        turnDeadline: status === "playing" && gameState.timerEnabled ? Date.now() + (gameState.timerDuration ?? 15000) : undefined,
      };

      setGameState(updated);
      safeSend(channelRef.current, {
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
    safeSend(channelRef.current, {
      type: "broadcast",
      event: "game_update",
      payload: { state: updated },
    });
  }, [gameState, playerId]);

  const restartGame = useCallback(() => {
    if (!gameState || !channelRef.current) return;
    const maxHearts = gameState.maxHearts ?? 3;
    const currentMaxRange = gameState.maxRange;
    const newMaxRange = gameState.autoIncreaseRange ? currentMaxRange * 2 : currentMaxRange;
    const connectedPlayers = gameState.players.filter(p => p.isOnline !== false);
    
    // Safety check: if only one player remains, resetting might be weird, but let them play 1p if they want
    const updated: GameState = {
      ...gameState,
      status: "playing",
      currentTurnIndex: 0,
      targetNumber: generateTargetNumber(1, newMaxRange),
      minRange: 1,
      maxRange: newMaxRange,
      players: connectedPlayers.map((p) => ({
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
    safeSend(channelRef.current, {
      type: "broadcast",
      event: "game_update",
      payload: { state: updated },
    });
  }, [gameState]);

  const leaveRoom = useCallback(() => {
    cleanup();
    setError(null);
    setGameState(null);
  }, [cleanup]);

  const kickPlayer = useCallback((targetPlayerId: string) => {
    if (!gameState || !channelRef.current) return;
    const amHost = gameState.players.find(p => p.id === playerId)?.isHost ?? false;
    if (!amHost) return;
    // Broadcast kick — the target player will auto-leave on receiving this
    safeSend(channelRef.current, {
      type: "broadcast",
      event: "kick_player",
      payload: { targetPlayerId },
    });
    // Remove from host's own state immediately
    const updated: GameState = {
      ...gameState,
      players: gameState.players.filter(p => p.id !== targetPlayerId),
    };
    setGameState(updated);
    safeSend(channelRef.current, {
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

    safeSend(channelRef.current, {
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

  const forceSkipTurn = useCallback(() => {
    if (!gameState || !channelRef.current || gameState.status !== "playing") return;
    // Removed `if (!isHost) return;` to allow cascaded fallback enforcing

    
    const currentPlayerId = gameState.players[gameState.currentTurnIndex]?.id;
    // Don't force skip our own turn if this is called as a fallback, we already call skipTurn()
    if (!currentPlayerId || currentPlayerId === playerId) return; 

    const maxHearts = gameState.maxHearts ?? 3;
    const heartsEnabled = maxHearts > 0;

    let updatedPlayers = gameState.players;
    let isEliminated = false;

    if (heartsEnabled) {
      const p = gameState.players[gameState.currentTurnIndex];
      const currentHearts = p.hearts ?? maxHearts;
      const newHearts = Math.max(0, currentHearts - 1);
      isEliminated = newHearts <= 0;
      updatedPlayers = gameState.players.map(p =>
        p.id === currentPlayerId ? { ...p, hearts: newHearts, isEliminated, missedTurns: (p.missedTurns || 0) + 1 } : p
      );
    } else {
      updatedPlayers = gameState.players.map(p =>
        p.id === currentPlayerId ? { ...p, missedTurns: (p.missedTurns || 0) + 1 } : p
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
    safeSend(channelRef.current, {
      type: "broadcast",
      event: "game_update",
      payload: { state: updated },
    });
  }, [gameState, isHost, playerId]);

  // Timed auto-guess enforcer for Multiplayer
  useEffect(() => {
    if (gameState?.status !== "playing") return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      if (gameState.turnDeadline && now >= gameState.turnDeadline) {
        if (isMyTurn) {
          // Time expired! Skip turn internally without penalties
          skipTurn();
        } else {
          // Cascaded fallback logic to catch situations where active player or host drops out silently
          let enforcerDelay = 0;
          if (isHost) {
            enforcerDelay = 3000; // Host steps in 3s after deadline
          } else {
            const nextIndex = getNextTurnIndex(gameState.currentTurnIndex, gameState.players);
            if (gameState.players[nextIndex]?.id === playerId) {
              enforcerDelay = 6000; // Next player steps in 6s after deadline if host is also frozen
            }
          }

          if (enforcerDelay > 0 && now >= gameState.turnDeadline + enforcerDelay) {
            forceSkipTurn();
          }
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [gameState, isMyTurn, isHost, skipTurn, forceSkipTurn]);

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
      safeSend(channelRef.current, {
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
