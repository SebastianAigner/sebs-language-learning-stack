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

  /**
   * Prime the shared streaming element from within a user gesture so that iOS
   * Safari will permit later programmatic playback on it (e.g. clips that play
   * after a timer, in an auto-advancing flow). Safe to call repeatedly.
   */
  unlockStreamingAudio: () => void;
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
  /**
   * Resolve the returned promise when the clip finishes playing (the `ended`
   * event) instead of when playback starts. Enables sequencing clips
   * back-to-back and repeating them. Errors/stalls resolve too (never reject)
   * so one bad clip can't break a longer sequence. Defaults to false.
   */
  awaitEnd?: boolean;
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
