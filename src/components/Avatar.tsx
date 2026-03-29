/**
 * Shared avatar component and arcade preset list.
 * Used by: ProfileModal, Leaderboard, Friends, GameBoard leaderboard, WaitingRoom
 */

export const ARCADE_AVATARS = [
  // Gaming heroes
  "🤖", "👾", "👽", "👻", "💀", "🦾",
  // Animals (arcade style)
  "🦊", "🐺", "🦁", "🐯", "🦅", "🐲",
  // Faces  
  "😎", "🤩", "😈", "🥷", "🧙", "⚡",
  // Objects / symbols
  "🎮", "🕹️", "🏆", "💎", "🔥", "☄️",
  // Space / sci-fi
  "🚀", "🛸", "🌌", "⚔️", "🎯", "🧬",
];

interface AvatarProps {
  /** avatar_url from profile: emoji string, data: URL, or null */
  src?: string | null;
  /** Fallback initials (1-2 chars) */
  initials?: string;
  /** Pixel size class e.g. "w-10 h-10" */
  size?: string;
  /** Extra classNames */
  className?: string;
  /** Font size for emoji avatars */
  emojiSize?: string;
}

/** Renders an avatar badge — emoji, image, or initials fallback */
export function Avatar({
  src,
  initials = "?",
  size = "w-10 h-10",
  className = "",
  emojiSize = "text-xl",
}: AvatarProps) {
  const isImage = src && src.startsWith("data:image");
  const isEmoji = src && !isImage;

  return (
    <div
      className={`${size} rounded-full bg-game-dark flex items-center justify-center overflow-hidden shrink-0 ${className}`}
    >
      {isImage ? (
        <img src={src} alt="avatar" className="w-full h-full object-cover" />
      ) : isEmoji ? (
        <span className={`${emojiSize} leading-none`}>{src}</span>
      ) : (
        <span className="text-xs font-black text-muted-foreground">
          {initials ? initials.substring(0, 2).toUpperCase() : "?"}
        </span>
      )}
    </div>
  );
}
