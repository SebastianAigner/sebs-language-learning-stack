import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback } from 'react';
import { produce } from 'immer';
import type { SessionState, ReviewItem } from '../types';
import { CONJUGATION_LABELS } from '../types';
import { createInitialState, handleGoodGrade, handleNotGoodGrade } from '../scheduler';
import { saveSession, loadSession, clearSession as clearStoredSession } from '../persistence';
import { useNotification } from './NotificationContext';

interface SessionContextValue {
  session: SessionState;

  // Session lifecycle
  startNewSession: (queue: ReviewItem[]) => void;
  addToSession: (items: ReviewItem[]) => void;
  clearSession: () => void;

  // Navigation
  advanceToNext: () => void;
  jumpToIndex: (index: number) => void;
  postponeCurrentItem: () => void;
  removeCurrentItem: () => void;
  removeItemAtIndex: (index: number) => void;

  // Grading
  applyGoodGrade: () => void;
  applyBadGrade: () => void;

  // Blacklist
  removeWordFromQueue: (word: string, conjugationType?: string) => void;

  // Queries
  isComplete: boolean;
  currentItem: ReviewItem | undefined;
  upcomingItems: ReviewItem[];
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { showNotification } = useNotification();
  const [session, setSession] = useState<SessionState>(() => {
    const savedSession = loadSession();
    return savedSession && savedSession.queue.length > 0
      ? savedSession
      : createInitialState();
  });

  // Auto-save session whenever it changes
  const persistSession = useCallback((newSession: SessionState) => {
    if (newSession.queue.length > 0) {
      saveSession(newSession);
    }
  }, []);

  const updateSession = useCallback((updater: (draft: SessionState) => void) => {
    setSession(prev => {
      const next = produce(prev, updater);
      persistSession(next);
      return next;
    });
  }, [persistSession]);

  const startNewSession = useCallback((queue: ReviewItem[]) => {
    const newSession = createInitialState();
    newSession.queue = queue;
    newSession.totalUniqueItems = queue.length;
    setSession(newSession);
    persistSession(newSession);
  }, [persistSession]);

  const addToSession = useCallback((items: ReviewItem[]) => {
    updateSession(draft => {
      draft.queue.push(...items);
      draft.totalUniqueItems = draft.queue.length;
    });
  }, [updateSession]);

  const clearSession = useCallback(() => {
    clearStoredSession();
    setSession(createInitialState());
  }, []);

  const advanceToNext = useCallback(() => {
    updateSession(draft => {
      draft.currentIndex += 1;
    });
  }, [updateSession]);

  const jumpToIndex = useCallback((index: number) => {
    updateSession(draft => {
      draft.currentIndex = index;
    });
  }, [updateSession]);

  const postponeCurrentItem = useCallback(() => {
    updateSession(draft => {
      if (draft.currentIndex < draft.queue.length) {
        const item = draft.queue.splice(draft.currentIndex, 1)[0];
        draft.queue.push(item);
        // currentIndex remains the same, effectively pointing to the next item
        // which now has the index that the postponed item previously had.
      }
    });
  }, [updateSession]);

  const removeCurrentItem = useCallback(() => {
    updateSession(draft => {
      if (draft.currentIndex < draft.queue.length) {
        draft.queue.splice(draft.currentIndex, 1);
        draft.totalUniqueItems = Math.max(0, draft.totalUniqueItems - 1);
        // currentIndex remains the same, effectively pointing to the next item.
      }
    });
  }, [updateSession]);

  const removeItemAtIndex = useCallback((index: number) => {
    updateSession(draft => {
      if (index >= 0 && index < draft.queue.length) {
        draft.queue.splice(index, 1);
        draft.totalUniqueItems = Math.max(0, draft.totalUniqueItems - 1);
        if (index < draft.currentIndex) {
          draft.currentIndex -= 1;
        }
      }
    });
  }, [updateSession]);

  const applyGoodGrade = useCallback(() => {
    setSession(prev => {
      const getItemName = (item: ReviewItem) => item.type === 'grammar'
        ? item.grammarCard?.description
        : item.vocab?.word;

      const next = handleGoodGrade(
        prev,
        (count, item) => {
          const itemName = getItemName(item);
          showNotification('success', `Mastered "${itemName}"! Removing ${count} excess review${count > 1 ? 's' : ''}.`);
        },
        (item) => {
          const itemName = getItemName(item);
          showNotification('info', `Correct twice in a row! One more to go for "${itemName}".`);
        }
      );
      persistSession(next);
      return next;
    });
  }, [persistSession, showNotification]);

  const applyBadGrade = useCallback(() => {
    setSession(prev => {
      const next = handleNotGoodGrade(prev);
      persistSession(next);

      // Show notification if smart rescheduling occurred
      if (next.lastSmartReschedule) {
        const { count, endingKana, conjugationType } = next.lastSmartReschedule;
        const verbText = `${count} similar verb${count > 1 ? 's' : ''}`;
        let message: string;

        if (conjugationType !== undefined) {
          const conjugationLabel = CONJUGATION_LABELS[conjugationType];
          message = `Moved ${verbText} (${conjugationLabel}) up in the queue`;
        } else if (endingKana === 'no-kana-ending') {
          message = `Moved ${verbText} (ending with kanji) up in the queue`;
        } else if (endingKana === 'する-group') {
          message = `Moved ${verbText} (ending with する) up in the queue`;
        } else if (endingKana === 'くる-group') {
          message = `Moved ${verbText} (ending with くる/来る) up in the queue`;
        } else if (endingKana === 'いく-group') {
          message = `Moved ${verbText} (ending with いく/行く) up in the queue`;
        } else {
          message = `Moved ${verbText} (ending with「${endingKana}」) up in the queue`;
        }

        showNotification('info', message);
      }

      return next;
    });
  }, [persistSession, showNotification]);

  const removeWordFromQueue = useCallback((word: string, conjugationType?: string) => {
    updateSession(draft => {
      // Remove all items from queue that match this word
      // Start from currentIndex + 1 to preserve the current item display
      const indicesToRemove: number[] = [];

      for (let i = draft.currentIndex + 1; i < draft.queue.length; i++) {
        const item = draft.queue[i];
        if (item.type !== 'grammar' && item.vocab?.word === word) {
          if (conjugationType === undefined || conjugationType === '' || item.conjugationType === conjugationType) {
            indicesToRemove.push(i);
          }
        }
      }

      // Remove in reverse order to avoid index shifting issues
      for (let i = indicesToRemove.length - 1; i >= 0; i--) {
        draft.queue.splice(indicesToRemove[i], 1);
      }
    });
  }, [updateSession]);

  // Computed values
  const isComplete = session.currentIndex >= session.queue.length;
  const currentItem = isComplete ? undefined : session.queue[session.currentIndex];
  const upcomingItems = session.queue.slice(session.currentIndex + 1);

  const value: SessionContextValue = {
    session,
    startNewSession,
    addToSession,
    clearSession,
    advanceToNext,
    jumpToIndex,
    postponeCurrentItem,
    removeCurrentItem,
    removeItemAtIndex,
    applyGoodGrade,
    applyBadGrade,
    removeWordFromQueue,
    isComplete,
    currentItem,
    upcomingItems
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}
