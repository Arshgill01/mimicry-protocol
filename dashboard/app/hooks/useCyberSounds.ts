'use client';

import { useRef, useEffect } from 'react';

export default function useCyberSounds() {
  const audioContext = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize AudioContext on user interaction/mount (browser policy usually requires interaction first, but we init here)
    if (!audioContext.current) {
        // @ts-ignore - Handle webkit prefix for Safari
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            audioContext.current = new AudioCtx();
        }
    }
  }, []);

  const playPing = () => {
    if (!audioContext.current) return;
    const ctx = audioContext.current;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.15);
  };

  const playAlarm = () => {
    if (!audioContext.current) return;
    const ctx = audioContext.current;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(100, ctx.currentTime);

    // Throbbing effect
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.5);
    gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 1.0);
    gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 1.5);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 2.0);
  };

  return { playPing, playAlarm };
}
