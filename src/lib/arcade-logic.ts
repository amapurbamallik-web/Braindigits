export interface ArcadeDifficulty {
  maxRange: number;
  optimalGuesses: number;
  timerDuration: number; // ms
  maxLives: number;
}

export function getArcadeDifficulty(level: number): ArcadeDifficulty {
  // Base range at level 1 is 100
  let maxRange = 100;
  const steps = [100, 200, 500];

  // Calculate cumulative increments
  for (let i = 2; i <= level; i++) {
    const groupIndex = Math.floor((i - 2) / 5);
    const stepValue = steps[groupIndex % 3] * Math.pow(10, Math.floor(groupIndex / 3));
    maxRange += stepValue;
  }
  
  // Formula: floor(log2(range)) * 2 (Double the binary search limit for arcade fun)
  const optimalGuesses = Math.ceil(Math.log2(maxRange)) * 2;

  // Timer: 1.4 seconds per base guess (rounded up)
  const timerDuration = Math.ceil((optimalGuesses / 2) * 1.4) * 1000;

  // Lives: Fixed 3 for all levels
  const maxLives = 3;

  return {
    maxRange,
    optimalGuesses,
    timerDuration,
    maxLives
  };
}

export function getArcadeEfficiencyScore(level: number, totalGuessesUsed: number, totalOptimalGuessesAllowed: number): number {
  // E.g. A score multiplier based on how well they played.
  // Less guesses = more points per level.
  const basePoints = level * 100;
  
  // Ratio of efficiency. 
  // If they used exactly optimal, ratio is 1. If they used more, ratio decreases.
  // If totalOptimal is 7 and they used 3, ratio is > 1.
  const efficiencyRatio = Math.max(0.1, totalOptimalGuessesAllowed / Math.max(1, totalGuessesUsed));
  
  return Math.round(basePoints * efficiencyRatio);
}

export function getArcadeRankTitle(level: number): string {
  if (level < 3) return "Beginner";
  if (level < 5) return "Novice";
  if (level < 7) return "Skilled";
  if (level < 10) return "Expert";
  if (level < 15) return "Master";
  if (level < 20) return "Grandmaster";
  return "Legend";
}
