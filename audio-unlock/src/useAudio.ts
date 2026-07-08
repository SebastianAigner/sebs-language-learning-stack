/**
 * Audio Unlock Library - useAudio Hook
 *
 * Hook for playing audio (sound effects and streaming audio).
 */

import { useContext } from 'react';
import { AudioContext } from './AudioProvider';
import type { AudioContextType } from './types';

/**
 * Access audio playback functions.
 * Must be used within AudioProvider.
 *
 * @example
 * ```tsx
 * const { playSound, playStreamingAudio } = useAudio();
 *
 * // Play a sound effect
 * playSound('/audio/correct.mp3', { volume: 0.5 });
 *
 * // Play streaming audio (e.g., TTS)
 * await playStreamingAudio('https://tts.example.com/audio?text=hello');
 * ```
 */
export function useAudio(): AudioContextType {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
}
