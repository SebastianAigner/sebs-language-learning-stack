export interface AudioUnlockContextType {
  audioUnlocked: boolean;
  unlockAudio: () => void;
  showUnlockPrompt: boolean;
  dismissUnlockPrompt: () => void;
}

export interface AudioContextType {
  playSound: (url: string, options?: PlaySoundOptions) => void;
  playStreamingAudio: (url: string, options?: PlayStreamingOptions) => Promise<void>;
  stopStreamingAudio: () => void;
}

export interface PlaySoundOptions {
  volume?: number;
  debounceMs?: number;
}

export interface PlayStreamingOptions {
  volume?: number;
}

export interface AudioUnlockProviderProps {
  children: React.ReactNode;
  storageKey?: string;
  unlockAudioUrl?: string;
}

export interface AudioProviderProps {
  children: React.ReactNode;
}
