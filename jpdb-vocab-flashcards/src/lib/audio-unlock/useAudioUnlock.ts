import { useContext } from 'react';
import { AudioUnlockContext } from './AudioUnlockProvider';
import type { AudioUnlockContextType } from './types';

export function useAudioUnlock(): AudioUnlockContextType {
  const context = useContext(AudioUnlockContext);
  if (!context) {
    throw new Error('useAudioUnlock must be used within AudioUnlockProvider');
  }
  return context;
}
