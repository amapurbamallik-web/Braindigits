import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

export interface UserProfile {
  id: string;
  username: string;
  total_wins: number;
  total_games: number;
  ai_wins: number;
  avatar_url?: string;
  arcade_max_level?: number;
  arcade_score?: number;
  arcade_stars?: Record<string, number>;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfileField: (fields: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  logout: async () => {},
  refreshProfile: async () => {},
  updateProfileField: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  // Initialize profile immediately from cache so UI shows instantly
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem("braindigits_profile");
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return null;
  });
  
  // Start as false if we already have a cached profile — no need to show loading
  const [isLoading, setIsLoading] = useState(() => {
    try {
      return !localStorage.getItem("braindigits_profile");
    } catch {
      return true;
    }
  });

  const fetchingRef = React.useRef<string | null>(null);

  // Sync profile to localStorage on every change
  useEffect(() => {
    if (profile) {
      localStorage.setItem("braindigits_profile", JSON.stringify(profile));
    } else {
      localStorage.removeItem("braindigits_profile");
    }
  }, [profile]);

  // Single fast fetch — no retry loops that block the UI thread
  const fetchProfile = async (userId: string) => {
    if (fetchingRef.current === userId) return;
    fetchingRef.current = userId;

    try {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, username, total_wins, total_games, ai_wins, avatar_url, arcade_max_level, arcade_score, arcade_stars, created_at")
        .eq("id", userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Profile genuinely doesn't exist yet (new user before setup)
          setProfile(null);
        } else {
          console.error("fetchProfile error:", error);
          // Don't wipe the cached profile on network hiccups
          // Only clear if we have no cached data
        }
      } else {
        setProfile(data as UserProfile);
      }
    } catch (err: any) {
      console.error("fetchProfile exception:", err);
      // Network error — keep cached profile visible, don't lock the user out
    } finally {
      fetchingRef.current = null;
    }
  };

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION immediately from localStorage
    // This means it's synchronous for cached sessions — no delay
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        
        if (currentUser) {
          setUser(currentUser);
          // Don't await — fetch profile in background so isLoading clears immediately
          fetchProfile(currentUser.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        
        // Unlock loading state right away after we know session status
        setIsLoading(false);
      }
    );

    // Hard safety net — if Supabase never fires, unblock after 3s
    const fallbackTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => {
      clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    // Optimistically clear UI immediately
    setUser(null);
    setProfile(null);
    localStorage.removeItem("braindigits-auth-v4");
    localStorage.removeItem("braindigits_profile");
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);
      toast.success("Logged out successfully! 👋", { duration: 4000 });
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      await fetchProfile(data.session.user.id);
    }
  };

  const updateProfileField = (fields: Partial<UserProfile>) => {
    setProfile(prev => prev ? { ...prev, ...fields } : prev);
  };

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, logout, refreshProfile, updateProfileField }}>
      {children}
    </AuthContext.Provider>
  );
}
