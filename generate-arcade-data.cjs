function getArcadeDifficulty(level) {
  let maxRange = 100;
  const steps = [100, 200, 500];

  for (let i = 2; i <= level; i++) {
    const groupIndex = Math.floor((i - 2) / 5);
    const stepValue = steps[groupIndex % 3] * Math.pow(10, Math.floor(groupIndex / 3));
    maxRange += stepValue;
  }
  
  const optimalGuesses = Math.ceil(Math.log2(maxRange));
  const timerDuration = Math.ceil(optimalGuesses * 1.2);

  return { level, maxRange, optimalGuesses, timerDuration, maxLives: 3 };
}

console.log("Level | Range | Optimal Guesses | Timer (seconds)");
console.log("---|---|---|---");
for (let i = 1; i <= 30; i++) {
  const diff = getArcadeDifficulty(i);
  console.log(\`\${i} | 1-\${diff.maxRange.toLocaleString()} | \${diff.optimalGuesses} | \${diff.timerDuration.toFixed(1)}s\`);
}
