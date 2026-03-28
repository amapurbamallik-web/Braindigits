import { useState } from "react";
import { Users, Bot, HelpCircle, X, Settings2, Instagram, Linkedin, Facebook, Twitter, Github, Mail, UserCircle, Trophy, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logoImg from "@/assets/brain-digits-logo.png";
import { GameSettings } from "@/lib/game-types";
import { RoomSettingsModal } from "./RoomSettingsModal";
import { AuthModal } from "./AuthModal";
import { ProfileModal } from "./ProfileModal";
import { LeaderboardModal } from "./LeaderboardModal";
import { FriendsListModal } from "./FriendsListModal";
import { useAuth } from "@/contexts/AuthContext";
import { useAudio } from "@/contexts/AudioContext";
import { useEffect, useRef } from "react";
import { GlobalLogo, DeveloperFooter } from "./Branding";

interface ModeSelectionProps {
  onSelectMode: (mode: "friends" | "ai") => void;
  settings: GameSettings;
  onSettingsChange: (s: GameSettings) => void;
}

export function ModeSelection({ onSelectMode, settings, onSettingsChange }: ModeSelectionProps) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  // Track if user clicked 'Play as Guest'
  const [isGuest, setIsGuest] = useState(false);
  const prevCountRef = useRef<number>(0);
  
  const { user, profile, logout, isLoading } = useAuth();
  const { playSfx } = useAudio();
  
  const { data: pendingRequestsCount } = useQuery({
    queryKey: ["pending-friend-requests", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await (supabase as any)
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .eq("user_id_2", user.id)
        .eq("status", "pending");
      return count || 0;
    },
    refetchInterval: 15000,
    enabled: !!user,
  });

  useEffect(() => {
    if (pendingRequestsCount && pendingRequestsCount > prevCountRef.current) {
      // Meaning we received a new friend request!
      playSfx('notification');
    }
    prevCountRef.current = pendingRequestsCount || 0;
  }, [pendingRequestsCount, playSfx]);

  const shouldShowMenu = user || isGuest;

  if (!shouldShowMenu) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-between p-4 md:p-6 bg-game-dark overflow-y-auto relative">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-game-cyan/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-game-purple/10 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Placeholder for top spacing */}
        <div className="w-full flex justify-end md:justify-between z-20 shrink-0 mb-4">
           <GlobalLogo className="hidden md:flex opacity-0" />
        </div>

        <div className="w-full max-w-md flex flex-col items-center z-10 animate-fade-in-up shrink-0 my-auto py-8">
          <img
            src={logoImg}
            alt="BrainDigits Logo"
            className="w-48 h-48 md:w-64 md:h-64 mb-6 object-contain object-center -translate-x-3 md:-translate-x-4 drop-shadow-[0_0_30px_rgba(0,229,255,0.2)]"
          />
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2 tracking-tight">BrainDigits</h1>
          <p className="text-sm md:text-base text-muted-foreground mb-8 text-center px-4">Login to track your stats or play instantly.</p>

          <div className="w-full space-y-4 px-4 md:px-6 relative">
            <Button
              onClick={() => setShowAuth(true)}
              className="w-full h-14 text-lg font-bold bg-game-cyan hover:bg-game-cyan/90 text-game-dark shadow-[0_0_20px_rgba(0,229,255,0.3)] rounded-2xl transition-all active:scale-[0.98]"
            >
              <UserCircle className="mr-2 h-6 w-6" />
              Sign In / Register
            </Button>
            
            <Button
              onClick={() => setIsGuest(true)}
              variant="outline"
              className="w-full h-14 text-lg font-bold bg-black/30 backdrop-blur-md border border-white/10 hover:bg-white/10 text-white rounded-2xl transition-all active:scale-[0.98]"
            >
              Play as Guest
            </Button>
          </div>
        </div>
        
        <AuthModal 
          open={showAuth}
          onClose={() => setShowAuth(false)}
        />

        <DeveloperFooter className="shrink-0 mt-8 mb-2 z-10 opacity-100 animate-fade-in-up" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-between p-4 md:p-6 bg-game-dark relative overflow-y-auto overflow-x-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-game-amber/5 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Top Navbar */}
      <div className="w-full flex justify-end md:justify-between items-center z-20 pointer-events-none shrink-0 mb-4">
        <GlobalLogo className="hidden md:flex pointer-events-auto" />
        
        <div className="flex items-center gap-2 md:gap-4 ml-auto pointer-events-auto">
          {user && (
            <div className="relative">
              <Button
                onClick={() => setShowFriends(true)}
                variant="outline"
                size="icon"
                className="rounded-full w-10 h-10 md:w-11 md:h-11 bg-card/50 backdrop-blur-md border border-game-purple/30 text-game-purple hover:bg-game-purple hover:text-white shadow-[0_0_15px_rgba(171,71,188,0.2)] transition-all active:scale-95"
                title="Friends"
              >
                <Users className="h-5 w-5 md:h-5 md:w-5" />
              </Button>
              {pendingRequestsCount && pendingRequestsCount > 0 ? (
                <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md animate-in zoom-in border-2 border-game-dark">
                  {pendingRequestsCount > 9 ? "9+" : pendingRequestsCount}
                </div>
              ) : null}
            </div>
          )}

          <Button
            onClick={() => setShowLeaderboard(true)}
            variant="outline"
            size="icon"
            className="rounded-full w-10 h-10 md:w-11 md:h-11 bg-card/50 backdrop-blur-md border border-game-amber/30 text-game-amber hover:bg-game-amber hover:text-game-dark shadow-[0_0_15px_rgba(251,191,36,0.2)] transition-all active:scale-95"
            title="Leaderboard"
          >
            <Trophy className="h-5 w-5 md:h-5 md:w-5" />
          </Button>

          {user ? (
            <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-3 md:px-5 py-2 rounded-full border border-game-cyan/20 shadow-[0_0_15px_rgba(0,229,255,0.1)]">
              <button 
                onClick={() => {
                  if (profile) setShowProfile(true);
                  else setShowAuth(true); // Prompts them to set username
                }}
                className="text-xs md:text-sm lg:text-base font-bold text-game-cyan hover:underline decoration-game-cyan underline-offset-4 max-w-[80px] xs:max-w-[120px] sm:max-w-[150px] truncate block text-left"
              >
                {profile?.username || (isLoading ? "..." : "Setup Profile")}
              </button>
              <div className="w-px h-3 md:h-4 bg-white/20 mx-0.5 md:mx-1 shrink-0"></div>
              <button 
                onClick={async () => {
                  await logout();
                  setIsGuest(false);
                }} 
                className="text-muted-foreground hover:text-game-amber transition-colors" 
                title="Logout"
              >
                <LogOut className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          ) : (
            <Button
              onClick={() => setShowAuth(true)}
              variant="outline"
              className="rounded-full bg-game-cyan/10 backdrop-blur-md border border-game-cyan/30 text-game-cyan hover:bg-game-cyan hover:text-game-dark shadow-[0_0_15px_rgba(0,229,255,0.2)] font-bold transition-all active:scale-95 px-4 md:px-6 h-10 md:h-11"
            >
              <UserCircle className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              Sign In
            </Button>
          )}
        </div>
      </div>
      <div 
        className="w-full max-w-md opacity-0 animate-fade-in-up shrink-0 my-auto py-6"
        style={{ animationDelay: "0.1s" }}
      >
        {/* Logo Section */}
        <div className="text-center mb-6 md:mb-8">
          <img
            src={logoImg}
            alt="BrainDigits Logo"
            className="w-56 h-56 mx-auto mb-4 object-contain object-center -translate-x-3 md:-translate-x-4 drop-shadow-[0_0_30px_rgba(0,229,255,0.15)] hover:scale-105 transition-transform duration-500"
          />
          <p className="text-muted-foreground font-medium" style={{ textWrap: "pretty" }}>
            Compete with friends or challenge the AI offline. The fastest mind wins!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={() => onSelectMode("friends")}
            className="w-full h-14 text-base font-semibold active:scale-[0.97] transition-all bg-game-cyan hover:bg-game-cyan/90 text-game-dark shadow-[0_0_15px_rgba(0,229,255,0.2)]"
            size="lg"
          >
            <Users className="h-5 w-5 mr-2" />
            Play with Friends
          </Button>
          
          <Button
            onClick={() => onSelectMode("ai")}
            className="w-full h-14 text-base font-semibold active:scale-[0.97] transition-all bg-game-purple hover:bg-game-purple/90 text-white shadow-[0_0_15px_rgba(171,71,188,0.2)]"
            size="lg"
          >
            <Bot className="h-5 w-5 mr-2" />
            Play with AI
          </Button>

          <div className="pt-1 flex gap-2 md:gap-3">
            <Button
              onClick={() => setShowInstructions(true)}
              variant="ghost"
              className="flex-1 h-11 md:h-12 text-xs md:text-sm text-muted-foreground hover:text-game-amber hover:bg-game-amber/10 px-2"
            >
              <HelpCircle className="h-4 w-4 mr-1.5 md:mr-2 shrink-0" />
              How to Play
            </Button>
            
            <Button
              onClick={() => setShowSettings(true)}
              variant="ghost"
              className="flex-1 h-11 md:h-12 text-xs md:text-sm text-muted-foreground hover:text-white hover:bg-white/10 px-2"
            >
              <Settings2 className="h-4 w-4 mr-1.5 md:mr-2 shrink-0" />
              Settings
            </Button>
          </div>
        </div>

        {/* Existing Instructions Modal */}
        {showInstructions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm fade-in duration-200">
            <div className="w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl border border-border/30 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-foreground">How to Play</h2>
                <button
                  onClick={() => setShowInstructions(false)}
                  className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground active:scale-95 transition-transform"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-game-cyan/15 text-game-cyan font-bold flex items-center justify-center text-xs">1</span>
                  <p><strong className="text-foreground">Choose Mode</strong> — Play multiplayer with friends via a room code, or play offline against the AI Bot!</p>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-game-amber/15 text-game-amber font-bold flex items-center justify-center text-xs">2</span>
                  <p><strong className="text-foreground">Guess the Number</strong> — A secret number within the chosen range is generated. Players take turns guessing.</p>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-game-purple/15 text-game-purple font-bold flex items-center justify-center text-xs">3</span>
                  <p><strong className="text-foreground">Get Hints</strong> — After each guess you'll see "Higher" or "Lower". Use these hints to narrow down the target.</p>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-game-success/15 text-game-success font-bold flex items-center justify-center text-xs">4</span>
                  <p><strong className="text-foreground">Win!</strong> — First player to guess correctly wins the round and earns a point. Play multiple rounds!</p>
                </div>
              </div>
              <Button
                onClick={() => setShowInstructions(false)}
                className="w-full mt-6 h-11 bg-game-cyan hover:bg-game-cyan/90 text-game-dark font-semibold active:scale-[0.97] transition-transform"
              >
                Got it!
              </Button>
            </div>
          </div>
        )}

        {/* New Settings Modal */}
        <RoomSettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onSettingsChange={onSettingsChange}
          readOnly={false}
        />

      </div>

      <DeveloperFooter className="shrink-0 mt-4 mb-2 z-10 opacity-70 hover:opacity-100 transition-opacity animate-fade-in-up" />

      {/* ALL MODALS MUST BE AT ROOT LEVEL TO AVOID Z-INDEX TRAPS */}
      <AuthModal 
        open={showAuth}
        onClose={() => setShowAuth(false)}
      />

      <ProfileModal
        open={showProfile}
        onClose={() => setShowProfile(false)}
        profile={profile}
        onLogout={async () => {
          await logout();
          setIsGuest(false);
          setShowProfile(false);
        }}
      />

      <LeaderboardModal
        open={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
      />

      <FriendsListModal
        open={showFriends}
        onClose={() => setShowFriends(false)}
      />

    </div>
  );
}
