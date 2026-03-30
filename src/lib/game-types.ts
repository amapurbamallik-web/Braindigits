export interface Player {
  id: string;
  name: string;
  attempts: number;
  guesses: GuessRecord[];
  isHost: boolean;
  score: number;
  isEliminated?: boolean;
  missedTurns?: number;
  hearts?: number;  // current lives remaining
  isOnline?: boolean;
}

export interface GuessRecord {
  value: number;
  hint: "higher" | "lower" | "correct";
  timestamp: number;
}

export interface GameState {
  roomCode: string;
  status: "waiting" | "playing" | "finished" | "level_complete";
  targetNumber: number;
  minRange: number;
  maxRange: number;
  currentTurnIndex: number;
  players: Player[];
  winnerId: string | null;
  round: number;
  turnDeadline?: number;
  timerEnabled?: boolean;
  timerDuration?: number;
  maxHearts?: number;   // configured starting lives (default 3)
  guessLimitEnabled?: boolean;
  maxGuesses?: number;
  guessLimitDifficulty?: 'easy' | 'medium' | 'hard';
  autoIncreaseRange?: boolean;
  
  // Arcade Mode Additions
  isArcade?: boolean;
  level?: number;
  optimalGuesses?: number;
  doubleRangeOnLevelUp?: boolean;
}

export interface GameSettings {
  maxRange: number;
  timerEnabled: boolean;
  timerDuration: number;
  maxHearts: number;
  guessLimitEnabled?: boolean;
  guessLimitDifficulty?: 'easy' | 'medium' | 'hard';
  autoIncreaseRange?: boolean;
  isArcade?: boolean; 
  doubleRangeOnLevelUp?: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  maxRange: 100,
  timerEnabled: true,
  timerDuration: 15000,
  maxHearts: 3,
  guessLimitEnabled: true,
  guessLimitDifficulty: 'easy',
  autoIncreaseRange: false,
  isArcade: false,
};

export type BroadcastPayload =
  | { type: "game_start"; state: GameState }
  | { type: "game_state_update"; state: GameState }
  | { type: "player_joined"; player: Player }
  | { type: "player_guess"; playerId: string; guess: number; hint: "higher" | "lower" | "correct" }
  | { type: "game_over"; winnerId: string; winnerName: string; attempts: number }
  | { type: "game_restart"; state: GameState };

export function generateRoomCode(prefix?: "A" | "F"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = prefix ? prefix : "";
  const length = 5 - code.length;
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generateTargetNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generatePlayerId(): string {
  return crypto.randomUUID();
}
