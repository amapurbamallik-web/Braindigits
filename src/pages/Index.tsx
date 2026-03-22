import { useGameRoom } from "@/hooks/useGameRoom";
import { GameLobby } from "@/components/GameLobby";
import { WaitingRoom } from "@/components/WaitingRoom";
import { GameBoard } from "@/components/GameBoard";

export default function Index() {
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

  // No game yet → lobby
  if (!gameState) {
    return <GameLobby onCreateRoom={createRoom} onJoinRoom={joinRoom} />;
  }

  // Waiting for players
  if (gameState.status === "waiting") {
    return (
      <WaitingRoom
        gameState={gameState}
        isHost={isHost}
        onStart={startGame}
        onLeave={leaveRoom}
      />
    );
  }

  // Playing or finished
  return (
    <GameBoard
      gameState={gameState}
      playerId={playerId}
      isMyTurn={isMyTurn}
      onGuess={makeGuess}
      onRestart={restartGame}
      onLeave={leaveRoom}
      isHost={isHost}
    />
  );
}
