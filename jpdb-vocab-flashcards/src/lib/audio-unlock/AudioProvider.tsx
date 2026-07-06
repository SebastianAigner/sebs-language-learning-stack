import { createContext, useRef } from 'react';
import type { AudioContextType, AudioProviderProps, PlaySoundOptions, PlayStreamingOptions } from './types';

export const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: AudioProviderProps) {
  const lastPlayTimes = useRef<Map<string, number>>(new Map());
  const streamingAudioRef = useRef<HTMLAudioElement | null>(null);

  const getStreamingAudio = () => {
    streamingAudioRef.current ??= new Audio();
    return streamingAudioRef.current;
  };

  const playSound = (url: string, options: PlaySoundOptions = {}) => {
    const { volume = 0.5, debounceMs = 100 } = options;

    const now = Date.now();
    const lastPlayTime = lastPlayTimes.current.get(url) ?? 0;

    if (now - lastPlayTime < debounceMs) {
      return;
    }

    lastPlayTimes.current.set(url, now);

    try {
      const audio = new Audio(url);
      audio.volume = volume;
      audio.play().catch((error: Error) => {
        console.warn(`[audio-unlock] Failed to play sound [${error.name}]:`, error.message);
      });
    } catch (error) {
      console.warn('[audio-unlock] Failed to create audio element:', error);
    }
  };

  const playStreamingAudio = async (url: string, options: PlayStreamingOptions = {}) => {
    const { volume = 0.7 } = options;
    const audio = getStreamingAudio();

    audio.pause();
    audio.currentTime = 0;
    audio.src = url;
    audio.volume = volume;
    audio.load();

    try {
      await audio.play();
    } catch (error) {
      const err = error as Error;
      console.warn(
        `[audio-unlock] Failed to play streaming audio [${err.name !== '' ? err.name : 'Unknown'}]:`,
        err.message !== '' ? err.message : err
      );
      throw error;
    }
  };

  const stopStreamingAudio = () => {
    const audio = streamingAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  };

  return (
    <AudioContext.Provider value={{ playSound, playStreamingAudio, stopStreamingAudio }}>
      {children}
    </AudioContext.Provider>
  );
}
