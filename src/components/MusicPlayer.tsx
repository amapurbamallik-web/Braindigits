import React, { useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAudio } from '@/contexts/AudioContext';

interface MusicPlayerProps {
  className?: string;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({ className }) => {
  const { isSoundEnabled, toggleSound } = useAudio();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      if (isSoundEnabled) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isSoundEnabled]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.15;
    }
  }, []);

  return (
    <div className={cn("fixed bottom-4 right-4 z-50", className)}>
      <audio
        ref={audioRef}
        loop
        src="https://upload.wikimedia.org/wikipedia/commons/e/eb/The_Entertainer_-_1902_-_Scott_Joplin.ogg"
      />
      <Button
        variant="secondary"
        size="icon"
        className="rounded-full shadow-lg border border-border/50 bg-background/80 backdrop-blur-sm hover:bg-background h-12 w-12 transition-all duration-300 hover:scale-110"
        onClick={(e) => {
          // Prevent the button's standard click sound from playing if we just disabled sound
          e.stopPropagation();
          toggleSound();
        }}
        title={isSoundEnabled ? "Mute All Sounds" : "Play Sounds & Music"}
      >
        {isSoundEnabled ? (
          <Volume2 className="h-6 w-6 text-primary" />
        ) : (
          <VolumeX className="h-6 w-6 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
};
