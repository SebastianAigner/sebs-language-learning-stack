# Architecture Guide

This document explains the architectural patterns and organization of the Japanese Conjugation Trainer codebase.

## Table of Contents

1. [Overview](#overview)
2. [Layered Architecture](#layered-architecture)
3. [Context Providers](#context-providers)
4. [Component Guidelines](#component-guidelines)
5. [Hook Guidelines](#hook-guidelines)
6. [Common Patterns](#common-patterns)
7. [File Organization](#file-organization)
8. [Adding New Features](#adding-new-features)

---

## Overview

This application uses a **layered context-based architecture** to separate concerns and enable testability, reusability, and maintainability.

### Core Principles

1. **Separation of Concerns**: Business logic, UI state, and configuration are managed in separate contexts
2. **Dependency Injection**: Contexts provide services and state through React Context API
3. **Immutability**: All state updates use Immer.js for immutable updates
4. **Thin Components**: Components are presentation-only, delegating logic to hooks
5. **Side Effect Isolation**: Side effects (audio, timers, API calls) live in dedicated hooks

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                              │
│  (Root - Provides all context providers)                    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
│ SessionContext │  │  ConfigContext  │  │   UIContext     │
│ (Business)     │  │ (Configuration) │  │ (Presentation)  │
└───────┬────────┘  └────────┬────────┘  └────────┬────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │      Router       │
                    │   (Containers)    │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Custom Hooks    │
                    │  (Side Effects)   │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │    Components     │
                    │  (Presentation)   │
                    └───────────────────┘
```

---

## Layered Architecture

### Layer 1: Business Logic (SessionContext)

**Location**: `src/contexts/SessionContext.tsx`

**Purpose**: Manages the core domain logic of the quiz session.

**Responsibilities**:
- Session state (queue, current index, stats)
- Domain actions (grading, navigation, session lifecycle)
- SRS scheduling logic
- Auto-persistence to localStorage

**What goes here**:
- Session queue management
- Grading logic (good/bad grades)
- Streak tracking
- Queue navigation (next item, jump to index)
- Session initialization and reset

**Example usage**:
```typescript
import { useSession } from '../contexts/SessionContext';

function MyComponent() {
  const {
    session,           // Current session state
    currentItem,       // Current review item (or undefined if complete)
    isComplete,        // Boolean: is session finished?
    applyGoodGrade,    // Mark current item correct
    applyBadGrade,     // Mark current item incorrect
    advanceToNext,     // Move to next item
    startNewSession    // Initialize new session with queue
  } = useSession();
}
```

### Layer 2: Configuration (ConfigContext)

**Location**: `src/contexts/ConfigContext.tsx`

**Purpose**: Manages application configuration and settings.

**Responsibilities**:
- Model selection (Grok, Claude, etc.)
- API endpoints (backend URL, TTS service URL)
- User preferences (auto-advance, API key)
- Auto-detection of backend URL in production
- Auto-persistence to localStorage

**What goes here**:
- Model configuration
- Service URLs
- Feature flags
- User preferences

**Example usage**:
```typescript
import { useConfig } from '../contexts/ConfigContext';

function MyComponent() {
  const {
    config,                  // Current configuration state
    updateModel,            // Change LLM model
    updateAutoAdvance,      // Toggle auto-advance
    updateApiBaseUrl,       // Change backend URL
    updateTtsServiceUrl,    // Change TTS service URL
    updateApiKey            // Update API key
  } = useConfig();
}
```

### Layer 3: Presentation (UIContext)

**Location**: `src/contexts/UIContext.tsx`

**Purpose**: Manages UI state and view navigation.

**Responsibilities**:
- Current view state (loading, prompt, grading, result, completion)
- Grading result with immutable snapshot
- UI preferences (tutorial mode, debug mode)
- View transitions

**What goes here**:
- Current view/screen
- Grading results to display
- UI-only toggles (modals, panels, debug info)
- Navigation between views

**Example usage**:
```typescript
import { useUI } from '../contexts/UIContext';

function MyComponent() {
  const {
    ui,                      // Current UI state
    navigateToPrompt,       // Show prompt view
    navigateToResult,       // Show result view with data
    navigateToGrading,      // Show grading/loading view
    setTutorialMode,        // Toggle tutorial mode
    setShowDebug            // Toggle debug panel
  } = useUI();

  // Access current view
  if (ui.currentView === 'prompt') { /* ... */ }

  // Access grading result (when in result view)
  const gradingResult = ui.gradingResult;
}
```

### Layer 4: Side Effects (Custom Hooks)

**Location**: `src/hooks/`

**Purpose**: Isolate side effects from components.

**What goes here**:
- Audio playback
- Timers and intervals
- API calls
- External service interactions
- Complex stateful logic

**Examples**:
- `useTTS.ts` - Text-to-speech audio playback
- `useAutoAdvance.ts` - Auto-advance timer logic
- `useTypingPractice.ts` - Input handling and validation
- `useFetchVocabulary.ts` - Vocabulary fetching from API

### Layer 5: Presentation (Components)

**Location**: `src/components/`

**Purpose**: Pure presentation - rendering UI based on props and context.

**What goes here**:
- JSX/markup
- Event handlers that call hook functions
- Local UI state (accordion open/closed, etc.)
- Styling and layout

**What does NOT go here**:
- Business logic
- API calls
- Complex state management
- Side effects (except when using dedicated hooks)

---

## Context Providers

### How Contexts Work Together

Contexts are layered in `App.tsx` and can depend on each other:

```typescript
function App() {
  return (
    <AudioUnlockProvider>
      <AudioProvider>
        <NotificationProvider>
          <ConfigProvider>
            <SessionProvider>
              <UIProvider>
                <AppContent />
              </UIProvider>
            </SessionProvider>
          </ConfigProvider>
        </NotificationProvider>
      </AudioProvider>
    </AudioUnlockProvider>
  );
}
```

**Dependency order** (innermost can use outermost):
1. AudioUnlockProvider - Audio permission management
2. AudioProvider - Sound effect playback
3. NotificationProvider - Toast notifications
4. ConfigProvider - Configuration (no dependencies)
5. SessionProvider - Business logic (uses ConfigProvider)
6. UIProvider - Presentation (uses SessionProvider, ConfigProvider)

### SessionContext API

```typescript
interface SessionContextValue {
  // State
  session: SessionState;              // Full session state
  isComplete: boolean;                 // Is session finished?
  currentItem: ReviewItem | undefined; // Current quiz item
  upcomingItems: ReviewItem[];         // Remaining items in queue

  // Session Lifecycle
  startNewSession: (queue: ReviewItem[]) => void;  // Start with new queue
  clearSession: () => void;                        // Clear all data

  // Navigation
  advanceToNext: () => void;           // Move to next item
  jumpToIndex: (index: number) => void; // Jump to specific item

  // Grading
  applyGoodGrade: () => void;          // Mark current correct
  applyBadGrade: () => void;           // Mark current incorrect
}
```

**SessionState structure**:
```typescript
interface SessionState {
  queue: ReviewItem[];      // All items to review
  currentIndex: number;     // Current position in queue
  totalUniqueItems: number; // Original queue size
  stats: {
    totalReviewed: number;
    currentStreak: number;
  };
}
```

### ConfigContext API

```typescript
interface ConfigContextValue {
  // State
  config: ConfigState;  // Full configuration

  // Updates
  updateModel: (model: string) => void;
  updateAutoAdvance: (enabled: boolean) => void;
  updateApiBaseUrl: (url: string) => void;
  updateTtsServiceUrl: (url: string) => void;
  updateApiKey: (key: string) => void;
}
```

**ConfigState structure**:
```typescript
interface ConfigState {
  model: string;           // LLM model selection
  apiKey: string;          // User's API key
  autoAdvance: boolean;    // Auto-advance on correct
  apiBaseUrl: string;      // Backend/JPDB API URL
  ttsServiceUrl: string;   // TTS microservice URL
}
```

### UIContext API

```typescript
interface UIContextValue {
  // State
  ui: UIState;  // Current UI state

  // Navigation
  navigateToLoading: () => void;
  navigateToPrompt: () => void;
  navigateToGrading: () => void;
  navigateToResult: (result: GradingResult) => void;
  navigateToCompletion: () => void;

  // UI Preferences
  setTutorialMode: (enabled: boolean) => void;
  setShowDebug: (show: boolean) => void;
  setRawOutput: (output: string) => void;  // For debug
}
```

**UIState structure**:
```typescript
interface UIState {
  tutorialMode: boolean;
  showDebug: boolean;
  rawOutput?: string;
}

interface GradingResult {
  isCorrect: boolean;
  correctAnswer: string;
  reading?: string;
  explanation?: string;
  freeText?: string;
  rawOutput?: string;
  reviewItem: ReviewItem;  // Immutable snapshot!
  itemId: string;          // Guard for history navigation
}
```

---

## Component Guidelines

### Container and Presentational Pattern

Major screens (Views) should be split into **Container** logic (connecting to contexts) and **Presentational** components (rendering UI).

1. **Containers (Router Layer)**:
   - Location: `src/routes.tsx` (using route component functions)
   - Responsibility: Consume contexts (`useSession`, `useConfig`, etc.), initialize side-effect hooks, and pass data/callbacks to views.
   - Benefit: Decouples views from global state, making them easier to test and preview.

2. **Presentational Components (Views)**:
   - Location: `src/components/PromptView.tsx`, `src/components/ResultView.tsx`, etc.
   - Responsibility: Purely presentation and local UI state. Receive all necessary data and actions via props.
   - Benefit: Highly reusable, easy to unit test, and predictable.

### Component Structure

Every component should follow this pattern:

```typescript
import type { ReviewItem } from '../types';

interface MyComponentProps {
  item: ReviewItem;
  onAction: () => void;
  // ONLY UI-specific props
}

export function MyComponent({ item, onAction }: MyComponentProps) {
  // 1. Local UI state only (e.g., accordion open/closed)
  const [isExpanded, setIsExpanded] = useState(false);

  // 2. Specialized hooks for UI-only side effects (e.g., TTS, sound)
  // These hooks should receive their configuration from props
  const { playTTS } = useTTS({ ttsServiceUrl: props.ttsUrl });

  // 3. Render
  return (
    <div>
      <p>{item.vocab.word}</p>
      <button onClick={onAction}>Submit</button>
    </div>
  );
}
```

### Component Do's and Don'ts

**DO**:
- ✅ Receive data and actions via props for major views
- ✅ Use specialized hooks for UI-only concerns
- ✅ Keep components focused on presentation
- ✅ Use local state for UI-only concerns (accordion, modal open, etc.)

**DON'T**:
- ❌ Use `useSession` or `useConfig` directly in major views (prefer props)
- ❌ Put business logic in components
- ❌ Make API calls directly in components
- ❌ Call `saveSession()` or `saveConfig()` manually (auto-save handles it)

### Example: Good Presentational Component

```typescript
// ✅ GOOD: Receives data and callbacks via props
interface PromptProps {
  item: ReviewItem;
  onGrade: (answer: string) => Promise<void>;
}

export function PromptView({ item, onGrade }: PromptProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const userAnswer = inputRef.current?.value.trim();
    if (!userAnswer) return;
    await onGrade(userAnswer);
  };

  return (
    <div>
      <div>{item.vocab.word}</div>
      <input ref={inputRef} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
    </div>
  );
}
```

### Example: Route Container

```typescript
// ✅ GOOD: Router acts as the container
const promptRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/practice',
  component: () => {
    const { currentItem } = useSession();
    const { handleGrade } = useGrading();

    if (!currentItem) return null;

    return (
      <PromptView 
        item={currentItem}
        onGrade={handleGrade}
      />
    );
  }
});
```

### Example: Bad Component

```typescript
// ❌ BAD: Receives state as prop, manages logic internally
export function PromptView({ state, setState, apiKey }: BadProps) {
  const handleSubmit = async () => {
    // ❌ Directly manipulating state
    setState(prev => ({ ...prev, ui: { ...prev.ui, currentView: 'grading' } }));

    const result = await gradeAnswer(state.session.queue[state.session.currentIndex], userAnswer, apiKey);

    // ❌ Complex business logic in component
    if (result.isCorrect) {
      setState(prev => ({
        ...prev,
        session: {
          ...prev.session,
          stats: {
            ...prev.session.stats,
            currentStreak: prev.session.stats.currentStreak + 1
          }
        }
      }));
    }

    // ❌ Manually calling save
    saveSession(state.session);
  };
}
```

---

## Hook Guidelines

### When to Create a Hook

Create a custom hook when you need to:

1. **Isolate side effects**: Audio, timers, subscriptions, API calls
2. **Encapsulate complex logic**: Multi-step processes, stateful algorithms
3. **Reuse logic**: Same pattern needed in multiple components
4. **Separate concerns**: Extract business logic from components

### Hook Structure

```typescript
// src/hooks/useMyFeature.ts

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '../contexts/SessionContext';
import { useUI } from '../contexts/UIContext';
import { useConfig } from '../contexts/ConfigContext';

interface UseMyFeatureOptions {
  // Configuration options
}

interface UseMyFeatureResult {
  // Return values and functions
}

export function useMyFeature({
  /* options */
}: UseMyFeatureOptions): UseMyFeatureResult {
  // 1. Get context data
  const { session } = useSession();
  const { ui } = useUI();
  const { config } = useConfig();

  // 2. Local state
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 3. Side effects
  useEffect(() => {
    // Setup
    return () => {
      // Cleanup
    };
  }, [/* dependencies */]);

  // 4. Exposed functions
  const doSomething = useCallback(async () => {
    setIsLoading(true);
    try {
      // Logic here
    } finally {
      setIsLoading(false);
    }
  }, [/* dependencies */]);

  // 5. Return API
  return {
    isLoading,
    doSomething
  };
}
```

### Example: Side Effect Hook

```typescript
// useTTS.ts - Handles text-to-speech audio playback

export function useTTS({ ttsServiceUrl }: UseTTSOptions) {
  const [ttsError, setTtsError] = useState<TTSError | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { playStreamingAudio } = useAudio();

  const playTTS = useCallback(async (text: string) => {
    try {
      const url = `${ttsServiceUrl}/tts?text=${encodeURIComponent(text)}`;
      await playStreamingAudio(url, { volume: 0.7 });
    } catch (error) {
      setTtsError({ message: 'Failed to play audio', canRetry: true });
      throw error;
    }
  }, [ttsServiceUrl, playStreamingAudio]);

  const regenerateTTS = useCallback(async (text: string) => {
    setIsRegenerating(true);
    try {
      // POST request to regenerate cache
      await fetch(`${ttsServiceUrl}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      await playTTS(text);
    } finally {
      setIsRegenerating(false);
    }
  }, [ttsServiceUrl, playTTS]);

  return { ttsError, isRegenerating, playTTS, regenerateTTS };
}
```

### Hook Categories

**1. Context Hooks** (`src/contexts/`)
- Provide access to context state and actions
- Named like `useSession`, `useConfig`, `useUI`
- Should NOT contain business logic, only state management

**2. Feature Hooks** (`src/hooks/`)
- Encapsulate specific features or side effects
- Named like `useTTS`, `useAutoAdvance`, `useTypingPractice`
- CAN use context hooks internally
- Handle side effects (audio, timers, API calls)

**3. Data Fetching Hooks** (`src/hooks/`)
- Handle API calls and data transformation
- Named like `useFetchVocabulary`, `usePracticeEvergreens`
- Use context hooks to trigger navigation and state updates

---

## Common Patterns

### Pattern 1: Immutable Snapshot

**Problem**: When viewing results, the session may have already advanced to the next item.

**Solution**: Capture an immutable snapshot BEFORE state changes and pass it to the result view.

```typescript
// In Container/Router - capture current item BEFORE any mutations
const result = await gradeAnswer(currentItem, userAnswer);

// Pass snapshot to result view via router state or props
navigate({
  to: '/result',
  state: {
    result: {
      ...result,
      reviewItem: currentItem  // Use snapshot, not current state
    }
  }
});
```

**In ResultView**:
```typescript
// ResultView receives gradingResult as a prop
export function ResultView({ gradingResult }: ResultViewProps) {
  // Always use gradingResult.reviewItem, NEVER currentItem from useSession
  return <div>{gradingResult.reviewItem.vocab.word}</div>;
}
```

### Pattern 2: Auto-Save

**Problem**: Forgetting to call `saveSession()` or `saveConfig()` leads to data loss.

**Solution**: Contexts automatically persist on every change.

```typescript
// In SessionContext
const updateSession = useCallback((updater: (draft: SessionState) => void) => {
  setSession(prev => {
    const next = produce(prev, updater);
    persistSession(next);  // Auto-save
    return next;
  });
}, [persistSession]);

// In ConfigContext
useEffect(() => {
  saveConfig(config);  // Auto-save on any config change
}, [config]);
```

**Developers don't need to remember to save**:
```typescript
// ✅ This automatically saves
const { applyGoodGrade } = useSession();
applyGoodGrade();  // Saved automatically

// ✅ This also automatically saves
const { updateModel } = useConfig();
updateModel('claude-3-5-sonnet-20241022');  // Saved automatically
```

### Pattern 3: Semantic Navigation

**Problem**: Manual history manipulation or hardcoded paths are error-prone. Forward-only navigation prevents users from reviewing explanations.

**Solution**: Use TanStack Router's `navigate` or semantic action wrappers. Allow back-navigation to results but guard side effects.

1. **Push for Results**: Use default `push` navigation when advancing from a result to the next practice item.
2. **Guarded Actions**: In `useResultActions.ts`, check if `currentItem.id === gradingResult.itemId` before applying grades. This prevents historical result views from re-triggering session state changes if the user clicks "Next" again.
3. **Transient States**: Still use `replace: true` for purely transient states like `/grading` to keep the history clean.

```typescript
// ✅ GOOD: Guarded action in useResultActions
const isCurrentItem = currentItem?.id === gradingResult.itemId;

const advanceToNext = useCallback(() => {
  if (isCurrentItem) {
    applyGoodGrade(); // Only affects state if viewing CURRENT result
  }
  navigate({ to: '/practice' }); // Always push to history
}, [isCurrentItem, ...]);
```

**Benefits**:
- Users can use browser "Back" to see previous explanations.
- Session state remains consistent even with back/forward navigation.
- Type-safe routes.

### Pattern 4: Computed Values

**Problem**: Recalculating derived state in every component.

**Solution**: Context provides computed values.

```typescript
// In SessionContext
const isComplete = session.currentIndex >= session.queue.length;
const currentItem = isComplete ? undefined : session.queue[session.currentIndex];
const upcomingItems = session.queue.slice(session.currentIndex + 1);

return {
  session,
  isComplete,     // ✅ Computed once
  currentItem,    // ✅ Computed once
  upcomingItems,  // ✅ Computed once
  // ...
};
```

**Components just use the values**:
```typescript
const { isComplete, currentItem, upcomingItems } = useSession();

if (isComplete) {
  return <CompletionView />;
}

return <div>{currentItem.vocab.word}</div>;
```

### Pattern 5: Side Effect Cleanup

**Problem**: Memory leaks from timers, subscriptions, audio playback.

**Solution**: Always return cleanup function from `useEffect`.

```typescript
// In useAutoAdvance hook
useEffect(() => {
  if (currentView === 'result' && isCorrect && enabled) {
    timerRef.current = setTimeout(() => {
      onAdvance();
    }, delayMs);
  }

  // ✅ Cleanup timer on unmount or dependency change
  return () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
}, [enabled, isCorrect, currentView, delayMs, onAdvance]);
```

---

## File Organization

```
src/
├── components/          # Presentation components
│   ├── CompletionView.tsx
│   ├── Controls.tsx
│   ├── Header.tsx
│   ├── LoadingView.tsx
│   ├── PromptView.tsx
│   ├── ResultView.tsx
│   ├── QueuePanel.tsx
│   ├── SettingsPanel.tsx
│   └── ...
│
├── contexts/            # Context providers (state management)
│   ├── SessionContext.tsx    # Business logic
│   ├── ConfigContext.tsx     # Configuration
│   ├── UIContext.tsx         # Presentation state
│   ├── AudioContext.tsx      # Audio system
│   └── NotificationContext.tsx
│
├── hooks/               # Custom hooks (side effects, features)
│   ├── useTTS.ts
│   ├── useAutoAdvance.ts
│   ├── useTypingPractice.ts
│   ├── useResultActions.ts
│   ├── useFetchVocabulary.ts
│   └── ...
│
├── api.ts              # API client functions
├── grader.ts           # LLM grading logic
├── scheduler.ts        # SRS scheduling algorithm
├── persistence.ts      # localStorage utilities
├── types.ts            # TypeScript type definitions
├── conjugationInstructions.ts
└── App.tsx             # Root component with providers
```

### Where Does X Go?

| What | Where | Example |
|------|-------|---------|
| Session state | `SessionContext` | Current queue, grading, stats |
| Configuration | `ConfigContext` | Model selection, URLs, preferences |
| UI navigation | `UIContext` | Current view, grading results |
| Business logic | `SessionContext` or `scheduler.ts` | SRS algorithm, grading logic |
| Side effects | `hooks/` | Audio, timers, API calls |
| Presentation | `components/` | JSX, event handlers, layout |
| API calls | `api.ts` or `hooks/useX.ts` | Fetch vocabulary, grade answer |
| Type definitions | `types.ts` | Interfaces, enums |
| Utilities | `persistence.ts`, `llmCache.ts` | localStorage, caching |

---

## Adding New Features

### Example: Adding a "Hint" System

**Step 1: Define the feature**
- User clicks "Show Hint" button
- Display first character of correct answer
- Track hint usage in stats

**Step 2: Identify affected layers**

1. **SessionContext** (Business Logic)
   - Add `hintsUsed` to session stats
   - Add `useHint()` action to increment counter

2. **UIContext** (Presentation)
   - Add `showHint: boolean` to UIState
   - Add `toggleHint()` action

3. **Component** (Presentation)
   - Add "Show Hint" button in PromptView
   - Display hint text when `ui.showHint === true`

**Step 3: Implementation**

**Update SessionContext**:
```typescript
// types.ts
interface SessionStats {
  totalReviewed: number;
  currentStreak: number;
  hintsUsed: number;  // ← Add this
}

// SessionContext.tsx
const useHint = useCallback(() => {
  updateSession(draft => {
    draft.stats.hintsUsed += 1;
  });
}, [updateSession]);

return {
  // ... existing
  useHint
};
```

**Update UIContext**:
```typescript
// UIContext.tsx
interface UIState {
  currentView: ViewType;
  gradingResult: GradingResult | null;
  tutorialMode: boolean;
  showDebug: boolean;
  showHint: boolean;  // ← Add this
}

const toggleHint = useCallback(() => {
  updateUI(draft => {
    draft.showHint = !draft.showHint;
  });
}, [updateUI]);

return {
  // ... existing
  toggleHint
};
```

**Update PromptView**:
```typescript
// PromptView.tsx
export function PromptView() {
  const { currentItem, useHint } = useSession();
  const { ui, toggleHint } = useUI();

  const handleShowHint = () => {
    useHint();
    toggleHint();
  };

  return (
    <div>
      <div>{currentItem.vocab.word}</div>
      <input ref={inputRef} />

      <button onClick={handleShowHint}>Show Hint</button>

      {ui.showHint && (
        <div className="hint">
          Hint: {currentItem.correctAnswer[0]}...
        </div>
      )}
    </div>
  );
}
```

**Step 4: Test**
- Verify hint displays correctly
- Verify hint count increments
- Verify auto-save persists hint count
- Verify hint resets on next question

---

## Best Practices Summary

### State Management
- ✅ Use contexts for cross-cutting concerns
- ✅ Use local state for UI-only concerns
- ✅ Let contexts auto-save, don't do it manually
- ✅ Use Immer for all state updates (`produce()`)

### Component Design
- ✅ Keep components thin (presentation only)
- ✅ Use context hooks, not props for global state
- ✅ Delegate logic to hooks
- ✅ Use semantic event handler names (`handleSubmit`, `handleReset`)

### Hook Design
- ✅ One hook per feature/concern
- ✅ Return clear, typed API
- ✅ Clean up side effects properly
- ✅ Use `useCallback` for functions that might be dependencies

### Navigation
- ✅ Use semantic navigation methods (`navigateToResult`)
- ✅ Pass immutable snapshots when navigating
- ✅ Don't manipulate `currentView` directly

### Testing
- ✅ Test hooks in isolation
- ✅ Test contexts with mock providers
- ✅ Test components with mock contexts
- ✅ Test business logic separately from UI

### Performance
- ✅ Use `memo()` for expensive components
- ✅ Use `useCallback` for event handlers passed as props
- ✅ Use `useMemo` for expensive computations
- ✅ Keep computed values in contexts, not components

---

## Anti-Patterns to Avoid

### ❌ Prop Drilling
```typescript
// BAD
<Header state={state} setState={setState} />
<Main state={state} setState={setState} />
<Footer state={state} setState={setState} />
```

**Use contexts instead**:
```typescript
// GOOD
<Header />
<Main />
<Footer />
// Each uses useSession(), useUI(), useConfig() as needed
```

### ❌ Mixed Concerns
```typescript
// BAD: Business logic in component
function PromptView() {
  const [session, setSession] = useState({ /* ... */ });

  const handleCorrect = () => {
    setSession(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        currentStreak: prev.stats.currentStreak + 1
      }
    }));
  };
}
```

**Use contexts for business logic**:
```typescript
// GOOD
function PromptView() {
  const { applyGoodGrade } = useSession();

  const handleCorrect = () => {
    applyGoodGrade();  // Business logic in context
  };
}
```

### ❌ Manual Persistence
```typescript
// BAD
const handleUpdate = () => {
  setSession(newSession);
  saveSession(newSession);  // Easy to forget!
};
```

**Let contexts auto-save**:
```typescript
// GOOD
const handleUpdate = () => {
  updateSession(draft => {
    draft.currentIndex += 1;
  });
  // Automatically saved!
};
```

### ❌ Direct State Mutation
```typescript
// BAD
const handleGrade = () => {
  session.stats.currentStreak += 1;  // Direct mutation!
  setSession(session);
};
```

**Use Immer for immutable updates**:
```typescript
// GOOD
const handleGrade = () => {
  updateSession(draft => {
    draft.stats.currentStreak += 1;  // Immer handles immutability
  });
};
```

---

## Further Reading

- **React Context API**: https://react.dev/reference/react/useContext
- **Immer.js**: https://immerjs.github.io/immer/
- **Custom Hooks**: https://react.dev/learn/reusing-logic-with-custom-hooks
- **Separation of Concerns**: https://en.wikipedia.org/wiki/Separation_of_concerns

---

## Questions?

If you're unsure where something goes:

1. **Is it business logic?** → SessionContext or scheduler.ts
2. **Is it configuration?** → ConfigContext
3. **Is it UI state/navigation?** → UIContext
4. **Is it a side effect?** → Custom hook in hooks/
5. **Is it presentation?** → Component in components/
6. **Is it an API call?** → api.ts or custom hook
7. **Is it a utility?** → Dedicated utility file

When in doubt, follow the existing patterns and ask yourself: "Can this be tested without React?" If yes, it probably belongs in a context or utility function, not a component.
