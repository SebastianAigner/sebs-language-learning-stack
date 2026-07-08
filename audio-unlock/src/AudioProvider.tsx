/**
 * Audio Unlock Library - Audio Provider
 *
 * Manages audio playback with proper resource management:
 * - Reuses Audio elements to avoid competing playback
 * - Debounces sound effects to prevent spam
 * - Provides detailed error logging
 * - Optionally awaits end-of-clip for sequencing/repeating (see awaitEnd)
 */

import { createContext, useRef } from 'react';
import type { AudioContextType, AudioProviderProps, PlaySoundOptions, PlayStreamingOptions } from './types';

export const AudioContext = createContext<AudioContextType | null>(null);

// A short silent WAV used to prime the streaming element from within a user
// gesture, so iOS Safari will allow later programmatic playback on it.
const SILENT_AUDIO_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

// Safety cap so a stalled clip can never hang a caller awaiting the clip's end.
const STREAMING_END_TIMEOUT_MS = 20000;

function describeAudioError(error: unknown): string {
  if (error instanceof Error) {
    return `[${error.name !== '' ? error.name : 'Error'}] ${error.message}`;
  }
  if (error !== null && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

export function AudioProvider({ children }: AudioProviderProps) {
  // Track last play times for debouncing
  const lastPlayTimes = useRef<Map<string, number>>(new Map());

  // Reuse a single Audio element for streaming audio to avoid competing playback
  const streamingAudioRef = useRef<HTMLAudioElement | null>(null);

  const getStreamingAudio = () => {
    streamingAudioRef.current ??= new Audio();
    return streamingAudioRef.current;
  };

  const playSound = (url: string, options: PlaySoundOptions = {}) => {
    const {
      volume = 0.5,
      debounceMs = 100
    } = options;

    const now = Date.now();
    const lastPlayTime = lastPlayTimes.current.get(url) ?? 0;

    // Prevent duplicate sounds within debounce window
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

  // Prime the streaming element from within a user gesture. iOS Safari only
  // allows programmatic playback on an element that was played during a
  // gesture, so callers that later play streaming audio after a timer (e.g. an
  // auto-advancing review) should call this from the triggering tap/click.
  const unlockStreamingAudio = () => {
    const audio = getStreamingAudio();
    try {
      audio.src = SILENT_AUDIO_DATA_URI;
      audio.volume = 0;
      audio.load();
      // ~10ms of silence; it ends on its own, so there's no need to pause it.
      void audio.play().catch(() => {
        // Not fatal — playback will simply require another gesture to unlock.
      });
    } catch (error) {
      console.warn('[audio-unlock] Failed to prime streaming audio:', error);
    }
  };

  const playStreamingAudio = async (url: string, options: PlayStreamingOptions = {}) => {
    const { volume = 0.7, awaitEnd = false } = options;
    const audio = getStreamingAudio();

    // Stop any currently playing streaming audio and reset to a clean state.
    // Reassigning src + load() is also what makes repeats replay reliably on
    // iOS Safari (instead of re-firing `ended` from the previous playback).
    audio.pause();
    audio.currentTime = 0;
    audio.src = url;
    audio.volume = volume;
    audio.load();

    if (!awaitEnd) {
      try {
        await audio.play();
      } catch (error) {
        // Log specific error type to diagnose issues:
        // - NotAllowedError: autoplay blocked / audio not unlocked
        // - NotSupportedError: media format/headers issue
        // - AbortError: source changed or competing playback
        console.warn('[audio-unlock] Failed to play streaming audio:', describeAudioError(error));
        throw error;
      }
      return;
    }

    // Resolve when the clip finishes so callers can play clips back-to-back or
    // repeat them. Errors/stalls resolve too (they don't reject) so a single
    // bad clip can't break a longer sequence; the failure is still logged.
    await new Promise<void>(resolve => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        resolve();
      };
      const onEnded = () => finish();
      const onError = () => {
        console.warn('[audio-unlock] Streaming audio error:', describeAudioError(audio.error));
        finish();
      };
      const timeout = setTimeout(finish, STREAMING_END_TIMEOUT_MS);
      audio.addEventListener('ended', onEnded, { once: true });
      audio.addEventListener('error', onError, { once: true });
      audio.play().catch(error => {
        console.warn('[audio-unlock] Failed to play streaming audio:', describeAudioError(error));
        finish();
      });
    });
  };

  const stopStreamingAudio = () => {
    const audio = streamingAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  };

  return (
    <AudioContext.Provider value={{ playSound, playStreamingAudio, stopStreamingAudio, unlockStreamingAudio }}>
      {children}
    </AudioContext.Provider>
  );
}
