import { GameState } from "@/lib/game-types";
import { Button } from "@/components/ui/button";
import { Copy, Check, Users, Settings2, Share2, UserPlus, LogOut } from "lucide-react";
import { useState, useCallback } from "react";
import { RoomSettingsModal } from "./RoomSettingsModal";
import { FriendsListModal } from "./FriendsListModal";
import { InviteModal } from "./InviteModal";
import { GlobalLogo, DeveloperFooter } from "./Branding";
import { getThemeClasses, GameMode } from "@/lib/theme-logic";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { LeaveConfirmModal } from "./LeaveConfirmModal";

interface WaitingRoomProps {
  gameState: GameState;
  isHost: boolean;
  onStart: () => void;
  onLeave: () => void;
  onUpdateSettings: (s: import("@/lib/game-types").GameSettings) => void;
  onKick?: (playerId: string) => void;
  mode?: GameMode;
}

export function WaitingRoom({ gameState, isHost, onStart, onLeave, onUpdateSettings, onKick, mode = 'friends' }: WaitingRoomProps) {
  const { user, profile } = useAuth();
  const theme = getThemeClasses(mode);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  // Track which player names we've already sent a request to
  const [addedFriends, setAddedFriends] = useState<Set<string>>(new Set());
  const [addingFriend, setAddingFriend] = useState<string | null>(null);

  const copyCode = async () => {
    await navigator.clipboard.writeText(gameState.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFriend = async (playerName: string) => {
    if (!user) { toast.error("Sign in to add friends!"); return; }
    if (addedFriends.has(playerName)) return;
    setAddingFriend(playerName);
    try {
      // Find the profile by username
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("id")
        .eq("username", playerName)
        .limit(1);

      if (!profiles || profiles.length === 0) {
        toast.error(`${playerName} doesn't have a registered profile.`);
        return;
      }
      const friendId = profiles[0].id;
      if (friendId === user.id) return;

      // Check if already connected
      const { data: existing } = await (supabase as any)
        .from("friendships")
        .select("id")
        .or(`and(user_id_1.eq.${user.id},user_id_2.eq.${friendId}),and(user_id_1.eq.${friendId},user_id_2.eq.${user.id})`);

      if (existing && existing.length > 0) {
        toast.info(`Already connected with ${playerName}!`);
        setAddedFriends(prev => new Set(prev).add(playerName));
        return;
      }

      const { error } = await (supabase as any)
        .from("friendships")
        .insert({ user_id_1: user.id, user_id_2: friendId, status: "pending" });

      if (error) throw error;
      setAddedFriends(prev => new Set(prev).add(playerName));
      toast.success(`Friend request sent to ${playerName}! 🤝`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to send friend request.");
    } finally {
      setAddingFriend(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[100dvh] p-4 md:p-6 bg-game-dark overflow-y-auto overflow-x-hidden relative">
      <div className="w-full flex justify-end md:justify-between items-center z-20 pointer-events-none shrink-0 mb-4">
        <GlobalLogo className="hidden md:flex pointer-events-auto" />
      </div>

      <div className="w-full max-w-md my-auto py-6 shrink-0 relative z-10 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <div className="absolute top-0 right-0 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          {!gameState.isArcade && (
            <Button
              onClick={() => setShowSettings(true)}
              variant="ghost"
              size="icon"
              className={`rounded-full bg-card/50 backdrop-blur-md border ${theme.border} text-foreground hover:${theme.bgMuted} hover:${theme.text} hover:${theme.border} shadow-lg active:scale-95`}
              title="Room Settings"
            >
              <Settings2 className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className={`inline-flex items-center gap-2 rounded-full ${theme.bgMuted} px-4 py-1.5 mb-6`}>
          <Users className={`h-4 w-4 ${theme.text}`} />
          <span className={`text-sm font-medium ${theme.text}`}>Waiting for players</span>
        </div>

        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-2">Share this code</p>
          <button
            onClick={copyCode}
            className="inline-flex items-center gap-3 rounded-xl bg-card px-6 py-4 shadow-md hover:shadow-lg transition-shadow active:scale-[0.97] border border-border/50"
          >
            <span className={`font-mono text-3xl font-bold tracking-[0.25em] ${theme.text}`}>
              {gameState.roomCode}
            </span>
            {copied ? (
              <Check className="h-5 w-5 text-green-400" />
            ) : (
              <Copy className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </div>

        <div className="flex gap-3 mb-6">
          <Button
            onClick={() => setShowFriends(true)}
            variant="outline"
            className={`flex-1 h-12 border-game-purple/30 text-game-purple hover:bg-game-purple/10 font-bold active:scale-[0.97]`}
          >
            <Users className="w-5 h-5 mr-2" />
            Friends
          </Button>
          <Button
            onClick={() => setShowInvite(true)}
            variant="outline"
            className={`flex-1 h-12 ${theme.border} ${theme.text} hover:${theme.bgMuted} font-bold active:scale-[0.97]`}
          >
            <Share2 className="w-5 h-5 mr-2" />
            Share
          </Button>
        </div>

        <div className="bg-card rounded-xl p-5 shadow-sm mb-6 border border-border/50">
          <p className="text-sm font-medium text-muted-foreground mb-3">
            Players ({gameState.players.length})
          </p>
          <div className="space-y-2">
            {gameState.players.map((player, i) => (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3 opacity-0 animate-fade-in-up border border-white/5 hover:border-white/10 transition-all"
                style={{ animationDelay: `${0.2 + i * 0.1}s` }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${mode === 'ai' ? 'from-game-amber/20 to-game-amber/40' : 'from-game-cyan/20 to-game-purple/20'} border border-white/10 flex items-center justify-center shrink-0`}>
                    <span className="text-[10px] font-black text-white/80">{player.name?.substring(0,2).toUpperCase() || "??"}</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0 mr-2">
                    <span className={`font-semibold text-sm truncate ${player.id === user?.id ? theme.text : ''}`}>{player.name}</span>
                    <div 
                      className={`w-2 h-2 rounded-full shrink-0 ${player.isOnline !== false ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" : "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]"}`} 
                      title={player.isOnline !== false ? "Online" : "Offline"}
                    />
                  </div>
                  {player.isHost && (
                    <span className="text-[10px] font-bold text-white bg-white/10 rounded-full px-2 py-0.5 shrink-0 border border-white/10">
                      Host
                    </span>
                  )}
                </div>
                {/* Kick Button — only visible to Host */}
                {isHost && !player.isHost && onKick && (
                  <button
                    onClick={() => {
                        toast(`Kicked ${player.name}`);
                        onKick(player.id);
                    }}
                    className="ml-2 shrink-0 flex items-center px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95 border border-red-500/20 hover:border-red-500/40"
                    title="Kick Player"
                  >
                    Kick
                  </button>
                )}

                {/* Add Friend button — only for other players who are logged in users */}
                {user && !player.isHost && player.name !== profile?.username && player.name !== user.email && (
                  <button
                    onClick={() => handleAddFriend(player.name)}
                    disabled={addingFriend === player.name}
                    className={`ml-2 shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all active:scale-90 ${
                      addedFriends.has(player.name)
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20 cursor-default'
                        : `${theme.bgMuted} hover:${theme.primary}/20 ${theme.text} border ${theme.border} hover:border-${theme.text}/40`
                    }`}
                    title={addedFriends.has(player.name) ? 'Request sent!' : 'Add as Friend'}
                  >
                    {addingFriend === player.name ? (
                      <span className={`animate-spin w-3 h-3 border border-current border-t-transparent rounded-full`} />
                    ) : addedFriends.has(player.name) ? (
                      <><Check className="w-3 h-3" /> Sent</>  
                    ) : (
                      <><UserPlus className="w-3 h-3" /> Add</>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 font-bold text-sm transition-all active:scale-[0.97]"
          >
            <LogOut className="h-4 w-4" />
            Leave Room
          </button>
          {isHost && (
            <Button
              onClick={onStart}
              disabled={gameState.players.length < (mode === 'ai' ? 1 : 2)}
              className={`flex-1 h-12 font-black uppercase tracking-wider active:scale-[0.97] transition-all ${theme.primary} ${theme.hover} ${theme.textDark} ${theme.glow}`}
            >
              {gameState.players.length < (mode === 'ai' ? 1 : 2) ? (mode === 'ai' ? "Ready?" : "Waiting...") : "Start Game"}
            </Button>
          )}
        </div>
        {!isHost && (
          <p className="text-sm text-muted-foreground mt-4">Waiting for host to start…</p>
        )}
      </div>
      <DeveloperFooter className="shrink-0 mt-8 mb-2 z-10 opacity-100" />

      {/* Modals rendered at root level */}
      <LeaveConfirmModal
        open={showLeaveConfirm}
        title="Leave the Room?"
        message="Are you sure you want to leave the waiting room? You will lose your spot."
        confirmLabel="Yes, Leave Room"
        onCancel={() => setShowLeaveConfirm(false)}
        onConfirm={() => {
          onLeave();
        }}
      />
      <RoomSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={{
          maxRange: gameState.maxRange,
          timerEnabled: gameState.timerEnabled ?? false,
          timerDuration: gameState.timerDuration ?? 15000,
          maxHearts: gameState.maxHearts ?? 3,
        }}
        onSettingsChange={onUpdateSettings}
        readOnly={!isHost}
      />

      <FriendsListModal
        open={showFriends}
        onClose={() => setShowFriends(false)}
        roomCode={gameState.roomCode}
      />

      <InviteModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        roomCode={gameState.roomCode}
      />
    </div>
  );
}
