import React, { createContext, useContext, useState } from 'react';

export type SoundType = 'click' | 'join' | 'guess_local' | 'guess_opponent' | 'win' | 'tick' | 'timeout';

type AudioContextType = {
  isSoundEnabled: boolean;
  toggleSound: () => void;
  playSfx: (type: SoundType) => void;
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

let sharedAudioCtx: any = null;

const getAudioContext = () => {
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      sharedAudioCtx = new (AudioCtx as any)();
    }
  }
  return sharedAudioCtx;
};

// A bulletproof internal synthesizer that requires NO external downloads or network
const playTone = (freq: number, type: OscillatorType, dur: number, vol = 0.1) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    // Envelope to prevent clipping/clicking
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + dur);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch(e) {
    console.warn("Audio Context failed", e);
  }
};

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  const toggleSound = () => setIsSoundEnabled(!isSoundEnabled);

  const playSfx = (type: SoundType) => {
    if (!isSoundEnabled) return;
    
    switch(type) {
      case 'click':
        // Mild pop
        playTone(600, 'sine', 0.05, 0.7);
        break;
      case 'join':
        // Two-tone pop
        playTone(440, 'sine', 0.1, 0.8);
        setTimeout(() => playTone(660, 'sine', 0.15, 1.0), 100);
        break;
      case 'guess_local':
        // Minimal tick
        playTone(800, 'triangle', 0.05, 0.5);
        break;
      case 'guess_opponent':
        // Arcade blip
        playTone(400, 'square', 0.1, 0.6);
        setTimeout(() => playTone(600, 'square', 0.1, 0.6), 80);
        break;
      case 'win':
        // Success arpeggio
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          setTimeout(() => playTone(freq, 'square', 0.25, i === 3 ? 1.0 : 0.6), i * 120);
        });
        break;
      case 'tick':
        // Fast, high-pitch rhythmic tick
        playTone(800, 'square', 0.05, 0.8);
        break;
      case 'timeout':
        // Low harsh buzzer
        playTone(150, 'sawtooth', 0.4, 1.5);
        break;
    }
  };

  return (
    <AudioContext.Provider value={{ isSoundEnabled, toggleSound, playSfx }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    return { isSoundEnabled: false, toggleSound: () => {}, playSfx: () => {} };
  }
  return context;
}
