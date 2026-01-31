'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

export default function useCyberSounds() {
  const audioContext = useRef<AudioContext | null>(null);
  const ambientOscillator = useRef<OscillatorNode | null>(null);
  const ambientGain = useRef<GainNode | null>(null);
  const masterGain = useRef<GainNode | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);

  useEffect(() => {
    if (!audioContext.current) {
      // @ts-ignore - Handle webkit prefix for Safari
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioContext.current = new AudioCtx();
        // Create master gain node
        masterGain.current = audioContext.current.createGain();
        masterGain.current.connect(audioContext.current.destination);
        masterGain.current.gain.value = volume;
      }
    }
    return () => {
      stopAmbient();
    };
  }, []);

  // Update master volume
  useEffect(() => {
    if (masterGain.current) {
      masterGain.current.gain.value = volume;
    }
  }, [volume]);

  const playPing = useCallback(() => {
    if (!audioContext.current || !masterGain.current) return;
    const ctx = audioContext.current;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(masterGain.current);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.15);
  }, []);

  const playAlarm = useCallback(() => {
    if (!audioContext.current || !masterGain.current) return;
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
    gainNode.connect(masterGain.current);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 2.0);
  }, []);

  const startAmbient = useCallback(() => {
    if (!audioContext.current || !masterGain.current || isAmbientPlaying) return;
    const ctx = audioContext.current;

    // Resume context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Create low-frequency hum
    ambientOscillator.current = ctx.createOscillator();
    ambientGain.current = ctx.createGain();

    // Very low hum (sub-bass frequency)
    ambientOscillator.current.type = 'sine';
    ambientOscillator.current.frequency.value = 45; // Low hum

    // Very quiet - subtle background
    ambientGain.current.gain.value = 0.03;

    ambientOscillator.current.connect(ambientGain.current);
    ambientGain.current.connect(masterGain.current);

    // Add slight frequency wobble for organic feel
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.1; // Very slow modulation
    lfoGain.gain.value = 2; // Subtle pitch variation
    lfo.connect(lfoGain);
    lfoGain.connect(ambientOscillator.current.frequency);
    lfo.start();

    ambientOscillator.current.start();
    setIsAmbientPlaying(true);
  }, [isAmbientPlaying]);

  const stopAmbient = useCallback(() => {
    if (ambientOscillator.current) {
      ambientOscillator.current.stop();
      ambientOscillator.current.disconnect();
      ambientOscillator.current = null;
    }
    if (ambientGain.current) {
      ambientGain.current.disconnect();
      ambientGain.current = null;
    }
    setIsAmbientPlaying(false);
  }, []);

  const toggleAmbient = useCallback(() => {
    if (isAmbientPlaying) {
      stopAmbient();
    } else {
      startAmbient();
    }
  }, [isAmbientPlaying, startAmbient, stopAmbient]);

  return {
    playPing,
    playAlarm,
    startAmbient,
    stopAmbient,
    toggleAmbient,
    isAmbientPlaying,
    volume,
    setVolume
  };
}
