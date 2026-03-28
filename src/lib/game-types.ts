export interface Player {
  id: string;
  name: string;
  attempts: number;
  guesses: GuessRecord[];
  isHost: boolean;
  score: number;
}

export interface GuessRecord {
  value: number;
  hint: "higher" | "lower" | "correct";
  timestamp: number;
}

export interface GameState {
  roomCode: string;
  status: "waiting" | "playing" | "finished";
  targetNumber: number;
  minRange: number;
  maxRange: number;
  currentTurnIndex: number;
  players: Player[];
  winnerId: string | null;
  round: number;
  turnDeadline?: number;
}

export type BroadcastPayload =
  | { type: "game_start"; state: GameState }
  | { type: "game_state_update"; state: GameState }
  | { type: "player_joined"; player: Player }
  | { type: "player_guess"; playerId: string; guess: number; hint: "higher" | "lower" | "correct" }
  | { type: "game_over"; winnerId: string; winnerName: string; attempts: number }
  | { type: "game_restart"; state: GameState };

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
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
