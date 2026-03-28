import { Instagram, Linkedin, Facebook, Twitter, Github, Mail } from "lucide-react";
import logoImg from "@/assets/brain-digits-logo.png";

export function GlobalLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img src={logoImg} alt="Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(0,229,255,0.2)]" />
      <span className="text-white font-bold tracking-widest text-sm uppercase drop-shadow-[0_0_5px_rgba(0,0,0,0.5)]">BrainDigits</span>
    </div>
  );
}

export function DeveloperFooter({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <p className="text-[10px] md:text-xs text-muted-foreground font-medium tracking-wide bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5">
        Developed by <span className="text-game-cyan font-bold drop-shadow-[0_0_5px_rgba(0,229,255,0.3)]">Apurba Mallik</span>
      </p>
      <div className="flex items-center gap-4 text-muted-foreground/80 bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/5 shadow-lg">
        <a href="https://github.com/apurbamallik" target="_blank" rel="noopener noreferrer" className="hover:text-white hover:scale-110 transition-all" title="GitHub">
          <Github className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </a>
        <a href="https://x.com/_apurbamallik" target="_blank" rel="noopener noreferrer" className="hover:text-white hover:scale-110 transition-all" title="X (Twitter)">
          <Twitter className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </a>
        <a href="https://www.linkedin.com/in/apurbamallik/" target="_blank" rel="noopener noreferrer" className="hover:text-[#0A66C2] hover:scale-110 transition-all" title="LinkedIn">
          <Linkedin className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </a>
        <a href="https://instagram.com/_.amallik" target="_blank" rel="noopener noreferrer" className="hover:text-pink-500 hover:scale-110 transition-all" title="Instagram">
          <Instagram className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </a>
        <a href="https://www.facebook.com/apurbamallikjgm" target="_blank" rel="noopener noreferrer" className="hover:text-[#1877F2] hover:scale-110 transition-all" title="Facebook">
          <Facebook className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </a>
        <a href="mailto:am.apurbamallik@gmail.com" className="hover:text-game-cyan hover:scale-110 transition-all" title="Email">
          <Mail className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </a>
      </div>
    </div>
  );
}
