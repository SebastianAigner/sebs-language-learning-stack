/**
 * Audio Unlock Library
 *
 * A self-contained, reusable library for managing browser autoplay policies
 * and audio playback in React applications. Shared across the monorepo as the
 * `@sebs/audio-unlock` workspace package.
 *
 * @example
 * ```tsx
 * import { AudioUnlockProvider, AudioProvider, useAudioUnlock, useAudio } from '@sebs/audio-unlock';
 *
 * function App() {
 *   return (
 *     <AudioUnlockProvider storageKey="my-app-audio">
 *       <AudioProvider>
 *         <MyApp />
 *       </AudioProvider>
 *     </AudioUnlockProvider>
 *   );
 * }
 *
 * function MyComponent() {
 *   const { audioUnlocked, unlockAudio } = useAudioUnlock();
 *   const { playSound, playStreamingAudio } = useAudio();
 *
 *   if (!audioUnlocked) {
 *     return <button onClick={unlockAudio}>🔊 Enable Audio</button>;
 *   }
 *
 *   return (
 *     <button onClick={() => playSound('/sounds/click.mp3')}>
 *       Play Sound
 *     </button>
 *   );
 * }
 * ```
 */

// Providers
export { AudioUnlockProvider } from './AudioUnlockProvider';
export { AudioProvider } from './AudioProvider';

// Hooks
export { useAudioUnlock } from './useAudioUnlock';
export { useAudio } from './useAudio';

// Types
export type {
  AudioUnlockContextType,
  AudioContextType,
  PlaySoundOptions,
  PlayStreamingOptions,
  AudioUnlockProviderProps,
  AudioProviderProps
} from './types';
