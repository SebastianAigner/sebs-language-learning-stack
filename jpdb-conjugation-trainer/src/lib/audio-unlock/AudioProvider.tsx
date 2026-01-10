/**
 * Audio Unlock Library - Audio Provider
 *
 * Manages audio playback with proper resource management:
 * - Reuses Audio elements to avoid competing playback
 * - Debounces sound effects to prevent spam
 * - Provides detailed error logging
 */

import { createContext, useRef } from 'react';
import type { AudioContextType, AudioProviderProps, PlaySoundOptions, PlayStreamingOptions } from './types';

export const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: AudioProviderProps) {
  // Track last play times for debouncing
  const lastPlayTimes = useRef<Map<string, number>>(new Map());

  // Reuse a single Audio element for streaming audio to avoid competing playback
  const streamingAudioRef = useRef<HTMLAudioElement | null>(null);

  const getStreamingAudio = () => {
    if (streamingAudioRef.current === null) {
      streamingAudioRef.current = new Audio();
    }
    return streamingAudioRef.current;
  };

  const playSound = (url: string, options: PlaySoundOptions = {}) => {
    const {
      volume = 0.5,
      debounceMs = 100
    } = options;

    const now = Date.now();
    const lastPlayTime = lastPlayTimes.current.get(url) || 0;

    // Prevent duplicate sounds within debounce window
    if (now - lastPlayTime < debounceMs) {
      return;
    }

    lastPlayTimes.current.set(url, now);

    try {
      const audio = new Audio(url);
      audio.volume = volume;
      audio.play().catch(error => {
        // Log specific error type to diagnose issues:
        // - NotAllowedError: autoplay blocked / audio not unlocked
        // - NotSupportedError: media format/headers issue
        // - AbortError: source changed or competing playback
        console.warn(`[audio-unlock] Failed to play sound [${error.name}]:`, error.message);
      });
    } catch (error) {
      console.warn('[audio-unlock] Failed to create audio element:', error);
    }
  };

  const playStreamingAudio = async (url: string, options: PlayStreamingOptions = {}) => {
    const { volume = 0.7 } = options;
    const audio = getStreamingAudio();

    // Stop any currently playing streaming audio
    audio.pause();
    audio.currentTime = 0;

    // Set new source
    audio.src = url;
    audio.volume = volume;
    audio.load();

    try {
      await audio.play();
    } catch (error) {
      const err = error as Error;
      // Log specific error type to diagnose issues:
      // - NotAllowedError: autoplay blocked / audio not unlocked
      // - NotSupportedError: media format/headers issue
      // - AbortError: source changed or competing playback
      console.warn(
        `[audio-unlock] Failed to play streaming audio [${err?.name || 'Unknown'}]:`,
        err?.message || err
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
