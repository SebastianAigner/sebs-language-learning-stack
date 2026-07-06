import { createContext, useState, useCallback } from 'react';
import type { AudioUnlockContextType, AudioUnlockProviderProps } from './types';

export const AudioUnlockContext = createContext<AudioUnlockContextType | null>(null);

const DEFAULT_STORAGE_KEY = 'audio-unlocked';

export function AudioUnlockProvider({
  children,
  storageKey = DEFAULT_STORAGE_KEY,
  unlockAudioUrl
}: AudioUnlockProviderProps) {
  const [audioUnlocked, setAudioUnlocked] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  });

  const [showUnlockPrompt, setShowUnlockPrompt] = useState(!audioUnlocked);

  const unlockAudio = useCallback(() => {
    try {
      let audio: HTMLAudioElement;

      if (unlockAudioUrl !== undefined && unlockAudioUrl !== '') {
        audio = new Audio(unlockAudioUrl);
        audio.volume = 0.01;
      } else {
        audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
        audio.volume = 0.01;
      }

      audio.play().then(() => {
        setAudioUnlocked(true);
        setShowUnlockPrompt(false);
        try {
          localStorage.setItem(storageKey, 'true');
        } catch (e) {
          console.warn('[audio-unlock] Failed to save unlock state:', e);
        }
      }).catch(error => {
        console.warn('[audio-unlock] Failed to unlock audio:', error);
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
