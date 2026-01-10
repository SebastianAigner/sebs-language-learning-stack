# Audio Unlock Library

A self-contained, reusable React library for managing browser autoplay policies and audio playback.

## Features

- ✅ **Autoplay Policy Compliance**: Handles browser autoplay restrictions properly
- ✅ **Persistent Unlock State**: Remembers audio unlock preference in localStorage
- ✅ **Resource Management**: Reuses Audio elements to prevent competing playback
- ✅ **Debouncing**: Prevents duplicate sound effects from spamming
- ✅ **Error Logging**: Detailed error messages for debugging
- ✅ **TypeScript Support**: Full type definitions included
- ✅ **Zero Dependencies**: Only requires React
- ✅ **Framework Agnostic**: Works with any React-based project

## Installation

This library is self-contained within your project. Simply copy the `audio-unlock` directory to your codebase.

```bash
# If extracting to another project:
cp -r src/lib/audio-unlock /path/to/your/project/src/lib/
```

## Quick Start

### 1. Wrap your app with providers

```tsx
import { AudioUnlockProvider, AudioProvider } from './lib/audio-unlock';

function App() {
  return (
    <AudioUnlockProvider storageKey="my-app-audio-unlocked">
      <AudioProvider>
        <MyApp />
      </AudioProvider>
    </AudioUnlockProvider>
  );
}
```

### 2. Add an "Enable Audio" button

```tsx
import { useAudioUnlock } from './lib/audio-unlock';

function Header() {
  const { audioUnlocked, unlockAudio } = useAudioUnlock();

  if (!audioUnlocked) {
    return (
      <button onClick={unlockAudio}>
        🔊 Enable Audio
      </button>
    );
  }

  return null; // Audio already unlocked
}
```

### 3. Play audio in your components

```tsx
import { useAudio } from './lib/audio-unlock';

function MyComponent() {
  const { playSound, playStreamingAudio } = useAudio();

  const handleSuccess = () => {
    playSound('/audio/success.mp3', { volume: 0.5 });
  };

  const handleTTS = async () => {
    try {
      await playStreamingAudio('https://tts.example.com/speak?text=hello', {
        volume: 0.7
      });
    } catch (error) {
      console.error('TTS failed:', error);
    }
  };

  return (
    <div>
      <button onClick={handleSuccess}>Play Sound</button>
      <button onClick={handleTTS}>Play TTS</button>
    </div>
  );
}
```

## API Reference

### `<AudioUnlockProvider>`

Manages audio unlock state and localStorage persistence.

**Props:**
- `storageKey?: string` - localStorage key (default: `'audio-unlocked'`)
- `unlockAudioUrl?: string` - Optional audio file to play for unlock (default: silent blob)
- `children: ReactNode` - Child components

**Example:**
```tsx
<AudioUnlockProvider
  storageKey="my-app-audio"
  unlockAudioUrl="/audio/silent.mp3"
>
  {children}
</AudioUnlockProvider>
```

### `<AudioProvider>`

Manages audio playback with proper resource management.

**Props:**
- `children: ReactNode` - Child components

**Example:**
```tsx
<AudioProvider>
  {children}
</AudioProvider>
```

### `useAudioUnlock()`

Hook for accessing audio unlock state and functions.

**Returns:**
- `audioUnlocked: boolean` - Whether audio is unlocked
- `unlockAudio: () => void` - Function to unlock audio (call from user gesture)
- `showUnlockPrompt: boolean` - Whether to show unlock UI to user
- `dismissUnlockPrompt: () => void` - Dismiss the unlock prompt

**Example:**
```tsx
const { audioUnlocked, unlockAudio, showUnlockPrompt } = useAudioUnlock();

if (showUnlockPrompt) {
  return <button onClick={unlockAudio}>Enable Audio</button>;
}
```

### `useAudio()`

Hook for playing audio.

**Returns:**
- `playSound(url, options?)` - Play a sound effect
- `playStreamingAudio(url, options?)` - Play streaming audio (async)
- `stopStreamingAudio()` - Stop currently playing stream

**Example:**
```tsx
const { playSound, playStreamingAudio, stopStreamingAudio } = useAudio();

// Play sound effect
playSound('/audio/click.mp3', {
  volume: 0.5,      // 0-1, default: 0.5
  debounceMs: 100   // Min ms between plays, default: 100
});

// Play streaming audio (e.g., TTS)
await playStreamingAudio('https://tts.example.com/audio', {
  volume: 0.7       // 0-1, default: 0.7
});

// Stop streaming audio
stopStreamingAudio();
```

## How It Works

### Browser Autoplay Policies

Modern browsers block audio playback unless:
1. User has interacted with the page (click, tap, keypress)
2. Audio is played directly in the event handler (not in async callbacks)

This library solves this by:
1. Requiring explicit unlock via user gesture (`unlockAudio()`)
2. Playing a short audio clip during unlock to satisfy browser policies
3. Persisting unlock state so users don't need to unlock every session

### Resource Management

**Sound Effects:**
- Creates new Audio element for each play
- Debounces to prevent duplicate plays within configurable window
- Tracks last play time per URL

**Streaming Audio:**
- Reuses single Audio element to prevent competing playback
- Automatically stops previous stream when playing new one
- Prevents resource exhaustion from creating many Audio elements

### Error Handling

All playback failures are logged with specific error types:
- `NotAllowedError`: Audio not unlocked / autoplay blocked
- `NotSupportedError`: Media format or CORS issue
- `AbortError`: Playback interrupted (e.g., source changed)

## Use Cases

### 1. Sound Effects (Game, Quiz App)

```tsx
const { playSound } = useAudio();

const handleCorrectAnswer = () => {
  playSound('/audio/correct.mp3', { volume: 0.5 });
};

const handleWrongAnswer = () => {
  playSound('/audio/wrong.mp3', { volume: 0.5 });
};
```

### 2. Text-to-Speech

```tsx
const { playStreamingAudio } = useAudio();

const speak = async (text: string) => {
  const url = `https://tts-service.com/speak?text=${encodeURIComponent(text)}`;
  try {
    await playStreamingAudio(url);
  } catch (error) {
    console.error('TTS failed:', error);
  }
};
```

### 3. Notification Sounds

```tsx
const { playSound } = useAudio();

useEffect(() => {
  if (newMessage) {
    playSound('/audio/notification.mp3', {
      volume: 0.3,
      debounceMs: 500 // Don't spam notifications
    });
  }
}, [newMessage]);
```

### 4. Audio Player

```tsx
const { playStreamingAudio, stopStreamingAudio } = useAudio();

const handlePlay = async () => {
  await playStreamingAudio(audioUrl);
};

const handleStop = () => {
  stopStreamingAudio();
};
```

## Migration Guide

If you're migrating from the old context-based approach:

### Old Code
```tsx
// Old AudioContext
const { playCorrectSound, playWrongSound, playTTS } = useAudio();
playCorrectSound();
playWrongSound();
await playTTS('こんにちは');
```

### New Code
```tsx
// New audio-unlock library
const { playSound, playStreamingAudio } = useAudio();
playSound('/audio/correct.mp3', { volume: 0.5 });
playSound('/audio/wrong.mp3', { volume: 0.5 });
await playStreamingAudio(`${ttsServiceUrl}/tts?text=こんにちは`);
```

## Best Practices

1. **Always wrap providers in correct order:**
   ```tsx
   <AudioUnlockProvider>
     <AudioProvider>
       {/* Your app */}
     </AudioProvider>
   </AudioUnlockProvider>
   ```

2. **Show unlock button prominently** when `audioUnlocked === false`

3. **Use appropriate volumes:**
   - Sound effects: 0.3-0.5
   - TTS/speech: 0.7-0.8
   - Background music: 0.2-0.3

4. **Configure debouncing** for frequently triggered sounds:
   ```tsx
   playSound('/audio/click.mp3', { debounceMs: 200 });
   ```

5. **Handle playback errors gracefully:**
   ```tsx
   try {
     await playStreamingAudio(url);
   } catch (error) {
     // Show error message to user
     showNotification('Audio playback failed');
   }
   ```

## Troubleshooting

### Audio still not playing?

1. Check if `audioUnlocked === true`
2. Verify `unlockAudio()` is called from a user gesture
3. Check browser console for error messages
4. Ensure audio URLs are accessible (no CORS issues)

### Audio cutting out?

- For TTS/streaming, use `playStreamingAudio()` not `playSound()`
- `playStreamingAudio()` stops previous audio before playing new

### Sounds playing multiple times?

- Increase `debounceMs` option in `playSound()`
- Default is 100ms, try 200-500ms

## License

This library is part of the jpdb-conjugation-trainer project and can be freely reused in other projects.

## Credits

Developed as part of the JPDB Conjugation Trainer application, extracted into a reusable library for use in other React projects.
