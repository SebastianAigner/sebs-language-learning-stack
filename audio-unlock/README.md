# @sebs/audio-unlock

Shared React library for managing browser autoplay policies and audio playback,
used across the monorepo (`jpdb-vocab-flashcards`, `jpdb-conjugation-trainer`, …).

It is a workspace package resolved from source — consumers import it as
`@sebs/audio-unlock` (wired via a Vite `resolve.alias` and a tsconfig `paths`
entry). There is no build step.

## Providers

Wrap the app, unlock provider outermost:

```tsx
import { AudioUnlockProvider, AudioProvider } from '@sebs/audio-unlock';

<AudioUnlockProvider storageKey="my-app-audio" unlockAudioUrl="/audio/correct.mp3">
  <AudioProvider>
    <App />
  </AudioProvider>
</AudioUnlockProvider>
```

## Hooks

### `useAudioUnlock()`
- `audioUnlocked: boolean`
- `unlockAudio(): void` — call from a user gesture; plays a short/silent clip to
  satisfy autoplay policy and persists the choice to localStorage.
- `showUnlockPrompt: boolean`, `dismissUnlockPrompt(): void`

### `useAudio()`
- `playSound(url, { volume?, debounceMs? })` — fire-and-forget sound effects
  (new element per play, debounced).
- `playStreamingAudio(url, { volume?, awaitEnd? })` — TTS/streaming on a single
  reused element (reassigning `src` avoids competing playback and makes repeats
  replay reliably). By default resolves when playback **starts**; pass
  `awaitEnd: true` to resolve when the clip **finishes** — enabling clips to be
  sequenced back-to-back or repeated. With `awaitEnd`, errors and stalls resolve
  (never reject) so one bad clip can't break a sequence, and a 20s safety cap
  prevents hangs.
- `stopStreamingAudio()` — pause and reset the streaming element.
- `unlockStreamingAudio()` — call from a user gesture to prime the *streaming*
  element specifically. iOS Safari ties playback permission to the element that
  was played during the gesture, so flows that play streaming audio after a
  timer (e.g. auto-advancing review) should call this from the triggering tap.

## iOS Safari notes

- Programmatic `play()` only works during a user gesture, or on an element that
  was already played during one. For timer-driven playback, unlock first
  (`unlockAudio()` and/or `unlockStreamingAudio()`) from the gesture.
- Replaying a finished element by seeking to 0 is unreliable; reassigning `src`
  (as `playStreamingAudio` does) gives a clean state and replays reliably.
