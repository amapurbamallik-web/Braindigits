export type GameMode = 'ai' | 'friends' | 'arcade';

export interface ThemeColors {
  primary: string; // e.g. "game-amber"
  primaryMuted: string; // e.g. "game-amber/10"
  primaryBorder: string; // e.g. "border-game-amber/30"
  secondary: string;
  glow: string; // e.g. "shadow-[0_0_20px_rgba(251,191,36,0.3)]"
  text: string; // e.g. "text-game-amber"
  textMuted: string;
  accent: string;
}

export function getThemeClasses(mode: GameMode) {
  switch (mode) {
    case 'ai':
      return {
        primary: 'bg-game-amber',
        hover: 'hover:bg-game-amber/90',
        text: 'text-game-amber',
        textDark: 'text-game-dark',
        border: 'border-game-amber/30',
        glow: 'shadow-[0_0_20px_rgba(251,191,36,0.3)]',
        accentGlow: 'shadow-[0_0_15px_rgba(251,191,36,0.4)]',
        bgMuted: 'bg-game-amber/10',
        borderMuted: 'border-game-amber/20',
        ring: 'ring-game-amber/30'
      };
    case 'friends':
      return {
        primary: 'bg-game-cyan',
        hover: 'hover:bg-game-cyan/90',
        text: 'text-game-cyan',
        textDark: 'text-game-dark',
        border: 'border-game-cyan/30',
        glow: 'shadow-[0_0_20px_rgba(0,229,255,0.3)]',
        accentGlow: 'shadow-[0_0_15px_rgba(0,229,255,0.4)]',
        bgMuted: 'bg-game-cyan/10',
        borderMuted: 'border-game-cyan/20',
        ring: 'ring-game-cyan/30'
      };
    case 'arcade':
    default:
      return {
        primary: 'bg-game-purple',
        hover: 'hover:bg-game-purple/90',
        text: 'text-game-purple',
        textDark: 'text-white', // Purple stays white for clarity
        border: 'border-game-purple/30',
        glow: 'shadow-[0_0_20px_rgba(171,71,188,0.3)]',
        accentGlow: 'shadow-[0_0_15px_rgba(171,71,188,0.4)]',
        bgMuted: 'bg-game-purple/10',
        borderMuted: 'border-game-purple/20',
        ring: 'ring-game-purple/30'
      };
  }
}
