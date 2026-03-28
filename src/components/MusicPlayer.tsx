import React, { useRef, useEffect } from 'react';
import { Volume2, VolumeX, Music, Music2, Music3, Music4, Volume1 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAudio } from '@/contexts/AudioContext';

interface MusicPlayerProps {
  className?: string;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({ className }) => {
  const { isSoundEnabled, toggleSound, isMusicEnabled, toggleMusic } = useAudio();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      if (isMusicEnabled) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isMusicEnabled]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.25;
    }
  }, []);

  return (
    <div className={cn("fixed bottom-4 right-4 z-50 flex gap-3", className)}>
      <audio
        ref={audioRef}
        loop
        src="https://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/soundtrack.mp3"
      />
      <Button
        variant="secondary"
        size="icon"
        className="rounded-full shadow-[0_0_15px_rgba(0,229,255,0.2)] border border-border/50 bg-background/80 backdrop-blur-sm hover:border-game-cyan/50 hover:bg-background h-12 w-12 transition-all duration-300 hover:scale-105"
        onClick={(e) => {
          e.stopPropagation();
          toggleMusic();
        }}
        title={isMusicEnabled ? "Mute Music" : "Play Music"}
      >
        {isMusicEnabled ? (
          <Music className="h-5 w-5 text-game-cyan animate-pulse" style={{ animationDuration: '2s' }} />
        ) : (
          <div className="relative">
             <Music className="h-5 w-5 text-muted-foreground/50" />
             <div className="absolute top-1/2 left-1/2 w-6 h-[2px] bg-destructive/80 -translate-x-1/2 -translate-y-1/2 -rotate-45 block" />
          </div>
        )}
      </Button>

      <Button
        variant="secondary"
        size="icon"
        className="rounded-full shadow-[0_0_15px_rgba(171,71,188,0.2)] border border-border/50 bg-background/80 backdrop-blur-sm hover:border-game-purple/50 hover:bg-background h-12 w-12 transition-all duration-300 hover:scale-105"
        onClick={(e) => {
          e.stopPropagation();
          toggleSound();
        }}
        title={isSoundEnabled ? "Mute SFX" : "Play SFX"}
      >
        {isSoundEnabled ? (
          <Volume2 className="h-5 w-5 text-game-purple" />
        ) : (
          <VolumeX className="h-5 w-5 text-muted-foreground/50" />
        )}
      </Button>
    </div>
  );
};
