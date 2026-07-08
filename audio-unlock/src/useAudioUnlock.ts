/**
 * Audio Unlock Library - useAudioUnlock Hook
 *
 * Hook for accessing audio unlock state and functions.
 */

import { useContext } from 'react';
import { AudioUnlockContext } from './AudioUnlockProvider';
import type { AudioUnlockContextType } from './types';

/**
 * Access audio unlock state and functions.
 * Must be used within AudioUnlockProvider.
 *
 * @example
 * ```tsx
 * const { audioUnlocked, unlockAudio, showUnlockPrompt } = useAudioUnlock();
 *
 * if (!audioUnlocked) {
 *   return <button onClick={unlockAudio}>Enable Audio</button>;
 * }
 * ```
 */
export function useAudioUnlock(): AudioUnlockContextType {
  const context = useContext(AudioUnlockContext);
  if (!context) {
    throw new Error('useAudioUnlock must be used within AudioUnlockProvider');
  }
  return context;
}
