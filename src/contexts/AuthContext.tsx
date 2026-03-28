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
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  logout: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  // Initialize from LocalStorage to kill the visual flicker entirely
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem("braindigits_profile");
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return null;
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const fetchingRef = React.useRef<string | null>(null);

  // Sync profile to localStorage
  useEffect(() => {
    if (profile) {
      localStorage.setItem("braindigits_profile", JSON.stringify(profile));
    } else {
      localStorage.removeItem("braindigits_profile");
    }
  }, [profile]);

  const fetchProfile = async (userId: string) => {
    if (fetchingRef.current === userId) return;
    fetchingRef.current = userId;

    let localProfile = null;
    let success = false;
    let lastErrMessage = "Unknown";

    // Retry loop for potential lock starvation or network blips (8 retries = ~4 seconds)
    for (let i = 0; i < 8; i++) {
      try {
        const { data, error } = await (supabase as any).from("profiles").select("*").eq("id", userId).single();
        
        if (error) {
          if (error.code === 'PGRST116') {
             // 0 rows found. Profile genuinely doesn't exist.
             toast.error("Profile not found in database (PGRST116).", { duration: 5000 });
             success = true;
             localProfile = null;
             break;
          }
          if (error.message?.includes("Lock") || error.message?.includes("stole it")) {
            lastErrMessage = error.message;
            await new Promise(r => setTimeout(r, 500));
            continue;
          }
          throw error;
        }
        
        success = true;
        localProfile = data;
        break;

      } catch (err: any) {
        lastErrMessage = err?.message || JSON.stringify(err);
        if (err?.message?.includes("Lock") || err?.message?.includes("stole it")) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        console.error("fetchProfile error trace:", err);
      }
    }

    if (success) {
      setProfile(localProfile as UserProfile | null);
    } else {
      toast.error(`Fetch profile failed: ${lastErrMessage}`, { duration: 10000 });
      console.error("Fetch profile failed permanently after retries.");
      setProfile(null);
    }
    
    fetchingRef.current = null;
  };

  useEffect(() => {
    // We only rely on onAuthStateChange to prevent lock starvation.
    // Supabase automatically emits an 'INITIAL_SESSION' event on load natively after checking storage.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        
        if (currentUser) {
           setUser(currentUser);
           await fetchProfile(currentUser.id);
        } else {
           setUser(null);
           setProfile(null);
        }
        setIsLoading(false);
      }
    );

    const fallbackTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 4000);

    return () => {
      clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    // Optimistically log out in the UI immediately
    setUser(null);
    setProfile(null);
    try {
      // Race the signOut against a timeout in case the local storage lock hangs
      await Promise.race([
        supabase.auth.signOut(),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      // Force clear the underlying storage token to prevent "Setup Profile" zombie session on refresh
      localStorage.removeItem("braindigits-auth-v4");
      localStorage.removeItem("braindigits_profile");
      // Bulletproof redirect to clean state (Splash Screen) and clear all in-memory ghosts
      window.location.href = "/";
    }
  };

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      await fetchProfile(data.session.user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
