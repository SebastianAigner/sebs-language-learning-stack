/**
 * Audio Unlock Library - Unlock Provider
 *
 * Manages audio unlock state to satisfy browser autoplay policies.
 * Requires user interaction before audio can play.
 */

import { createContext, useState, useCallback } from 'react';
import type { AudioUnlockContextType, AudioUnlockProviderProps } from './types';

export const AudioUnlockContext = createContext<AudioUnlockContextType | null>(null);

const DEFAULT_STORAGE_KEY = 'audio-unlocked';

export function AudioUnlockProvider({
  children,
  storageKey = DEFAULT_STORAGE_KEY,
  unlockAudioUrl
}: AudioUnlockProviderProps) {
  // Check if audio was previously unlocked
  const [audioUnlocked, setAudioUnlocked] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  });

  const [showUnlockPrompt, setShowUnlockPrompt] = useState(!audioUnlocked);

  const unlockAudio = useCallback(() => {
    // Play audio to unlock audio playback for the session
    // This satisfies browser autoplay policies and allows subsequent audio to play
    try {
      let audio: HTMLAudioElement;

      if (unlockAudioUrl !== undefined && unlockAudioUrl !== '') {
        // Use provided unlock audio file
        audio = new Audio(unlockAudioUrl);
        audio.volume = 0.01; // Very quiet
      } else {
        // Create silent audio blob
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.001; // Nearly silent
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start(0);
        oscillator.stop(0.001);

        // Use a data URL for silent audio
        audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
        audio.volume = 0.01;
      }

      audio.play().then(() => {
        console.log('[audio-unlock] Audio unlocked successfully');
        setAudioUnlocked(true);
        setShowUnlockPrompt(false);
        // Remember this choice
        try {
          localStorage.setItem(storageKey, 'true');
        } catch (e) {
          console.warn('[audio-unlock] Failed to save unlock state:', e);
        }
      }).catch(error => {
        console.warn('[audio-unlock] Failed to unlock audio:', error);
        // Still hide the prompt even if unlock failed - user tried
        setShowUnlockPrompt(false);
      });
    } catch (error) {
      console.warn('[audio-unlock] Failed to create unlock audio:', error);
      setShowUnlockPrompt(false);
    }
  }, [storageKey, unlockAudioUrl]);

  const dismissUnlockPrompt = useCallback(() => {
    setShowUnlockPrompt(false);
  }, []);

  return (
    <AudioUnlockContext.Provider value={{ audioUnlocked, unlockAudio, showUnlockPrompt, dismissUnlockPrompt }}>
      {children}
    </AudioUnlockContext.Provider>
  );
}
