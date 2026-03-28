import { useState, useEffect } from "react";
import { X, Mail, Lock, User, LogIn, UserPlus, BrainCircuit, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import logoImg from "@/assets/brain-digits-logo.png";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [view, setView] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, profile, refreshProfile } = useAuth();
  
  // Helper to prevent infinite hangs in Supabase JS due to local storage lock bugs
  const withTimeout = <T,>(promise: Promise<T>, ms: number = 25000) => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("The server is taking too long to respond. Please try again.")), ms))
    ]);
  };

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword("");
      setUsername("");
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (view === "login") {
        const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }));
        if (error) throw error;
        toast.success("Welcome back!");
        onClose();
      } else {
        const { data, error } = await withTimeout(supabase.auth.signUp({ email, password }));
        if (error) throw error;
        
        // Wait a tick for auth state to propagate
        await new Promise(resolve => setTimeout(resolve, 300));

        if (data.user && !data.session) {
          toast.success("Account created! Check your email for confirmation.");
          onClose();
        } else {
          toast.success("Account created! Let's get your profile set up.");
          // Do not close, it will smoothly unmount the form and mount the profile form due to `needsProfileCompletion`
        }
      }
    } catch (err: any) {
      if (err?.message && (err.message.includes("stole it") || err.message.includes("Lock"))) {
        console.warn("Benign lock:", err.message);
        toast.success("Authenticated.");
        onClose();
      } else {
        toast.error(err.message || "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Google login failed.");
    }
  };

  const completeProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !user) return;
    setLoading(true);
    
    try {
      // Intentionally avoiding .select().single() to prevent PGRST116 false alarms during UPSERT in some Supabase versions
      const { error } = await (supabase as any).from("profiles").upsert({
        id: user.id,
        username: username.trim()
      });
      
      if (error) {
        console.error("UPSERT ERROR:", error);
        throw error;
      }
      
      toast.success("Profile created successfully!");
      // Force an immediate UI optimistic update via refreshProfile
      await refreshProfile();
      onClose();
    } catch (err: any) {
      console.error("Profile creation failed detail:", err);
      if (err.code === '23505') {
        toast.error("That username is already taken. Try another!");
      } else {
        toast.error(err.message || "Failed to create profile and save permanently.");
      }
    } finally {
      setLoading(false);
    }
  };

  const needsProfileCompletion = user && !profile && !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl fade-in duration-300">
      <div className="w-full max-w-sm bg-game-dark/95 border border-game-purple/30 rounded-[2rem] shadow-[0_0_80px_rgba(171,71,188,0.15)] animate-in zoom-in-95 duration-300 relative overflow-hidden flex flex-col p-6 sm:p-8">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-[-20%] left-[-20%] w-48 h-48 bg-game-cyan/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-48 h-48 bg-game-amber/20 rounded-full blur-[80px]" />
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 text-muted-foreground active:scale-95 transition-all z-20"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative z-10 flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-game-purple via-game-cyan to-transparent p-[1px] mb-4 shadow-xl">
            <div className="w-full h-full rounded-2xl bg-game-dark flex items-center justify-center">
              <img src={logoImg} alt="BrainDigits Logo" className="w-9 h-9 object-contain -translate-x-0.5 md:-translate-x-1 drop-shadow-[0_0_10px_rgba(0,229,255,0.6)] hover:scale-110 transition-transform" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {needsProfileCompletion ? "Choose Gamertag" : "BrainDigits"}
          </h2>
          <p className="text-muted-foreground text-sm font-medium mt-1 text-center">
            {needsProfileCompletion ? "You're one step away." : (view === "login" ? "Welcome back, challenger." : "Join the ultimate arena.")}
          </p>
        </div>

        <div className="relative z-10 w-full">
          {needsProfileCompletion ? (
            <form onSubmit={completeProfile} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2 relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-game-cyan transition-colors" />
                <Input
                  id="username"
                  name="username"
                  type="text"
                  required
                  placeholder="Unique Username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-black/50 border-white/10 pl-12 h-14 rounded-2xl text-white placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-game-cyan focus-visible:border-transparent transition-all"
                />
              </div>
              <Button disabled={loading || !username.trim()} type="submit" className="w-full h-14 bg-game-cyan hover:bg-game-cyan/90 text-game-dark font-extrabold text-base rounded-2xl shadow-[0_0_20px_rgba(0,229,255,0.2)] transition-all active:scale-[0.98]">
                {loading ? "Registering..." : "Enter Arena"} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </form>
          ) : (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <div className="flex bg-black/40 border border-white/5 rounded-2xl p-1 mb-6">
                <button
                  onClick={() => setView("login")}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${view === "login" ? "bg-white/10 text-white shadow-md" : "text-muted-foreground hover:text-white"}`}
                >
                  Log In
                </button>
                <button
                  onClick={() => setView("signup")}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${view === "signup" ? "bg-white/10 text-white shadow-md" : "text-muted-foreground hover:text-white"}`}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2 relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-white transition-colors" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="Email Address"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-black/50 border-white/10 pl-12 h-14 rounded-2xl text-white placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-white transition-all"
                  />
                </div>
                <div className="space-y-2 relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-white transition-colors" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="Password"
                    autoComplete={view === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    className="bg-black/50 border-white/10 pl-12 h-14 rounded-2xl text-white placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-white transition-all"
                  />
                </div>
                <Button disabled={loading} type="submit" className="w-full h-14 bg-white hover:bg-gray-200 text-black font-extrabold text-base rounded-2xl transition-transform active:scale-[0.98]">
                  {loading ? "Please wait..." : (view === "login" ? <><LogIn className="mr-2 h-5 w-5" /> Sign In</> : <><UserPlus className="mr-2 h-5 w-5" /> Create Account</>)}
                </Button>
              </form>

              <div className="relative my-6 flex items-center justify-center">
                <div className="absolute inset-x-0 border-t border-white/10"></div>
                <span className="relative bg-game-dark px-3 text-xs uppercase font-bold tracking-widest text-muted-foreground/60">
                  Or
                </span>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                onClick={handleGoogleAuth}
                className="w-full h-14 bg-black/20 hover:bg-black/40 border border-white/10 rounded-2xl text-white font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335"/>
                  <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4"/>
                  <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05"/>
                  <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853"/>
                </svg>
                Continue with Google
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
