import { useState } from "react";
import { ModeSelection } from "@/components/ModeSelection";
import { GameLobby } from "@/components/GameLobby";
import { WaitingRoom } from "@/components/WaitingRoom";
import { GameBoard } from "@/components/GameBoard";

import { useGameRoom } from "@/hooks/useGameRoom";
import { useAIGame } from "@/hooks/useAIGame";
import { useGameSounds } from "@/hooks/useGameSounds";
import { ArrowLeft } from "lucide-react";

function MultiplayerWrapper({ onExit }: { onExit: () => void }) {
  const {
    gameState,
    playerId,
    isMyTurn,
    isHost,
    createRoom,
    joinRoom,
    startGame,
    makeGuess,
    restartGame,
    leaveRoom,
  } = useGameRoom();

  useGameSounds(gameState, playerId);

  const handleLeave = () => {
    leaveRoom();
    onExit();
  };

  if (!gameState) {
    return (
      <div className="relative min-h-screen">
        <button 
          onClick={onExit} 
          className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-md border border-border/50 text-foreground hover:bg-game-cyan/10 hover:text-game-cyan hover:border-game-cyan/30 shadow-lg transition-all active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <GameLobby onCreateRoom={createRoom} onJoinRoom={joinRoom} />
      </div>
    );
  }

  if (gameState.status === "waiting") {
    return <WaitingRoom gameState={gameState} isHost={isHost} onStart={startGame} onLeave={handleLeave} />;
  }

  return (
    <GameBoard
      gameState={gameState}
      playerId={playerId}
      isMyTurn={isMyTurn}
      onGuess={makeGuess}
      onRestart={restartGame}
      onLeave={handleLeave}
      isHost={isHost}
    />
  );
}

function AIWrapper({ onExit }: { onExit: () => void }) {
  const [playerName, setPlayerName] = useState("");
  const [isStarted, setIsStarted] = useState(false);

  const {
    gameState,
    playerId,
    isMyTurn,
    isHost,
    makeGuess,
    restartGame,
    leaveRoom,
  } = useAIGame(isStarted ? playerName || "Player" : "");

  useGameSounds(gameState, playerId);

  const handleLeave = () => {
    leaveRoom();
    onExit();
  };

  if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-game-dark relative overflow-hidden">
        {/* Animated background matching ModeSelection */}
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-game-purple/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '5s' }} />

        <button 
          onClick={onExit} 
          className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-md border border-game-purple/20 text-foreground hover:bg-game-purple/10 hover:text-game-purple hover:border-game-purple/30 shadow-lg transition-all active:scale-95 z-50"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <div className="max-w-md w-full p-10 rounded-3xl bg-card/60 backdrop-blur-xl border border-game-purple/20 shadow-[0_0_50px_rgba(171,71,188,0.15)] text-center animate-in fade-in zoom-in duration-500 relative z-10">
          <h2 className="text-4xl font-extrabold mb-4 tracking-tight text-white drop-shadow-md">Play with AI</h2>
          <p className="text-game-purple/80 text-lg mb-8 font-medium">Enter your name to challenge the bot.</p>
          <input 
            type="text" 
            placeholder="Your name" 
            className="w-full p-4 rounded-xl bg-background/80 border border-game-purple/30 mb-6 focus:ring-2 focus:ring-game-purple outline-none transition-all text-white text-lg placeholder:text-muted-foreground/50 text-center"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setIsStarted(true)}
            autoFocus
          />
          <button 
            className="w-full p-4 rounded-xl bg-game-purple hover:bg-game-purple/90 active:scale-[0.98] text-white font-bold text-lg transition-all shadow-[0_0_20px_rgba(171,71,188,0.4)]"
            onClick={() => setIsStarted(true)}
          >
            Start Match
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) return null;

  return (
    <GameBoard
      gameState={gameState}
      playerId={playerId}
      isMyTurn={isMyTurn}
      onGuess={makeGuess}
      onRestart={restartGame}
      onLeave={handleLeave}
      isHost={isHost}
    />
  );
}

export default function Index() {
  const [mode, setMode] = useState<"select" | "friends" | "ai">("select");

  if (mode === "friends") {
    return <MultiplayerWrapper onExit={() => setMode("select")} />;
  }

  if (mode === "ai") {
    return <AIWrapper onExit={() => setMode("select")} />;
  }

  return <ModeSelection onSelectMode={setMode} />;
}
