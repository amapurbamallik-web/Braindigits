import { useEffect, useRef } from 'react';
import { GameState } from '@/lib/game-types';
import { useAudio } from '@/contexts/AudioContext';

export function useGameSounds(gameState: GameState | null, playerId: string) {
  const previousState = useRef<GameState | null>(null);
  const { playSfx } = useAudio();

  useEffect(() => {
    if (!gameState) {
      previousState.current = null;
      return;
    }

    const prev = previousState.current;
    if (prev) {
      // 1. Join Sound
      if (gameState.players.length > prev.players.length) {
        playSfx('join');
      }

      // 2. Guess Sounds
      let myGuessIncreased = false;
      let opponentGuessIncreased = false;

      gameState.players.forEach((p) => {
        const prevPlayer = prev.players.find((oldP) => oldP.id === p.id);
        const oldGuesses = prevPlayer ? prevPlayer.guesses.length : 0;
        if (p.guesses.length > oldGuesses) {
          if (p.id === playerId) {
            myGuessIncreased = true;
          } else {
            opponentGuessIncreased = true;
          }
        }
      });

      if (gameState.status !== 'finished') {
        if (myGuessIncreased) {
          playSfx('guess_local');
        } else if (opponentGuessIncreased) {
          playSfx('guess_opponent');
        }
      }

      // 3. Win/Lose Sound
      if (gameState.status === 'finished' && prev.status !== 'finished') {
        if (gameState.winnerId === playerId) {
          playSfx('win');
        } else {
          playSfx('timeout');
        }
      }
    }

    previousState.current = gameState;
  }, [gameState, playSfx]);
}
