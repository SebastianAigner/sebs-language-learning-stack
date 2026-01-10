/**
 * Audio Unlock Library - Types
 *
 * A self-contained library for managing browser autoplay policies and audio playback.
 */

export interface AudioUnlockContextType {
  /** Whether audio has been unlocked for this session */
  audioUnlocked: boolean;
  /** Function to unlock audio (should be called from user gesture) */
  unlockAudio: () => void;
  /** Whether to show the unlock prompt to the user */
  showUnlockPrompt: boolean;
  /** Function to dismiss the unlock prompt */
  dismissUnlockPrompt: () => void;
}

export interface AudioContextType {
  /**
   * Play a sound effect from a URL
   * @param url - URL to the audio file
   * @param options - Playback options
   */
  playSound: (url: string, options?: PlaySoundOptions) => void;

  /**
   * Play streaming audio (e.g., TTS) from a URL
   * @param url - URL to the audio stream
   * @param options - Playback options
   */
  playStreamingAudio: (url: string, options?: PlayStreamingOptions) => Promise<void>;

  /**
   * Stop currently playing streaming audio
   */
  stopStreamingAudio: () => void;
}

export interface PlaySoundOptions {
  /** Volume level (0-1), defaults to 0.5 */
  volume?: number;
  /** Minimum time between duplicate plays in ms, defaults to 100 */
  debounceMs?: number;
}

export interface PlayStreamingOptions {
  /** Volume level (0-1), defaults to 0.7 */
  volume?: number;
}

export interface AudioUnlockProviderProps {
  children: React.ReactNode;
  /**
   * localStorage key for persisting unlock state
   * @default 'audio-unlocked'
   */
  storageKey?: string;
  /**
   * URL to audio file used for unlocking (should be very short/silent)
   * @default undefined (creates silent blob)
   */
  unlockAudioUrl?: string;
}

export interface AudioProviderProps {
  children: React.ReactNode;
}
