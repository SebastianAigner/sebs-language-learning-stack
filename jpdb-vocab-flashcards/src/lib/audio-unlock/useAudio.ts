import { useContext } from 'react';
import { AudioContext } from './AudioProvider';
import type { AudioContextType } from './types';

export function useAudio(): AudioContextType {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
}
