import { produce } from 'immer';
import { isBlacklisted } from './persistence';
import type { ReviewItem, SessionState, VocabItem, ConjugationType } from './types';
import { VERB_CONJUGATION_TYPES, ADJECTIVE_CONJUGATION_TYPES } from './types';

const CONFIG = {
  RESCHEDULE_INTERVALS: [10, 15, 20, 30],
  STREAK_THRESHOLD: 3
};

export function initializeQueue(items: VocabItem[], enabledTypes?: ConjugationType[], blacklist?: Set<string>, maxPerType?: number): ReviewItem[] {
  const queue: ReviewItem[] = [];

  // For each item, randomly select one conjugation type to practice
  for (const item of items) {
    const wordType = item.type;
    const availableTypesForThisWord = wordType === 'verb'
      ? VERB_CONJUGATION_TYPES
      : ADJECTIVE_CONJUGATION_TYPES;

    // Filter enabled types by what's available for this word type
    let possibleTypes = enabledTypes && enabledTypes.length > 0
      ? enabledTypes.filter(t => availableTypesForThisWord.includes(t))
      : availableTypesForThisWord;

    // Apply blacklist filtering for specific word-conjugation pairs
    if (blacklist) {
      possibleTypes = possibleTypes.filter(t => !isBlacklisted(blacklist, item.word, t));
    }

    // Fallback if no enabled types match the word type
    // If we have a blacklist, we must NOT fall back to types that are blacklisted
    let finalTypes = possibleTypes;
    if (finalTypes.length === 0 && (!enabledTypes || enabledTypes.length === 0)) {
      finalTypes = availableTypesForThisWord;
      if (blacklist) {
        finalTypes = finalTypes.filter(t => !isBlacklisted(blacklist, item.word, t));
      }
    }

    if (finalTypes.length === 0) {
      continue;
    }

    const randomType = finalTypes[
      Math.floor(Math.random() * finalTypes.length)
    ];

    queue.push({
      id: crypto.randomUUID(),
      vocab: item,
      conjugationType: randomType,
      isRescheduled: false,
      rescheduleIteration: 0,
      originalAttempts: 0
    });
  }

  // Shuffle the queue first (so limiting per type is random)
  shuffleArray(queue);

  // Apply maxPerType limit if specified
  if (maxPerType !== undefined && maxPerType > 0) {
    const typeCounts: Record<string, number> = {};
    const limitedQueue: ReviewItem[] = [];

    for (const item of queue) {
      const type = item.conjugationType!;
      typeCounts[type] = (typeCounts[type] ?? 0) + 1;

      if (typeCounts[type] <= maxPerType) {
        limitedQueue.push(item);
      }
    }

    return limitedQueue;
  }

  return queue;
}

export function handleGoodGrade(
  state: SessionState,
  onExcessRemoved?: (count: number, item: ReviewItem) => void,
  onStreakProgress?: (item: ReviewItem) => void
): SessionState {
  return produce(state, draft => {
    if (draft.currentIndex >= draft.queue.length) {
      return;
    }

    const currentItem = draft.queue[draft.currentIndex];
    const itemKey = getItemKey(currentItem);

    // Initialize tracking
    draft.repetitionCounts[itemKey] ??= 0;
    draft.consecutiveCorrect[itemKey] ??= 0;

    // Increment counts
    draft.repetitionCounts[itemKey]++;
    draft.consecutiveCorrect[itemKey]++;

    // Track attempt history
    draft.attemptHistory[itemKey] ??= {
      attempts: 0,
      lastWasCorrect: true,
      completed: false
    };
    draft.attemptHistory[itemKey].lastWasCorrect = true;

    // If this is the first successful attempt (not a reschedule), count it
    if (!currentItem.isRescheduled || currentItem.rescheduleIteration === 0) {
      draft.reviewedCorrectly.push(currentItem);
      draft.stats.totalReviewed++;
      draft.stats.currentStreak++;
    }

    // If 2 consecutive correct, notify about progress (towards the STREAK_THRESHOLD)
    if (draft.consecutiveCorrect[itemKey] === 2 && CONFIG.STREAK_THRESHOLD > 2) {
      if (onStreakProgress) {
        onStreakProgress(currentItem);
      }
    }

    // If 3 consecutive correct, remove excess future occurrences
    if (draft.consecutiveCorrect[itemKey] >= CONFIG.STREAK_THRESHOLD) {
      const removedCount = removeExcessQueueItems(draft, itemKey);
      if (removedCount > 0 && onExcessRemoved) {
        onExcessRemoved(removedCount, currentItem);
      }
      draft.attemptHistory[itemKey].completed = true;
    }

    // Advance to next item
    draft.currentIndex++;
  });
}

export function handleNotGoodGrade(state: SessionState): SessionState {
  return produce(state, draft => {
    if (draft.currentIndex >= draft.queue.length) {
      return;
    }

    const currentItem = draft.queue[draft.currentIndex];
    const itemKey = getItemKey(currentItem);

    // Initialize tracking
    draft.repetitionCounts[itemKey] ??= 0;
    draft.consecutiveCorrect[itemKey] ??= 0;

    // Track attempt
    draft.attemptHistory[itemKey] ??= {
      attempts: 0,
      lastWasCorrect: false,
      completed: false
    };
    draft.attemptHistory[itemKey].attempts++;
    draft.attemptHistory[itemKey].lastWasCorrect = false;

    // Reset streak
    draft.consecutiveCorrect[itemKey] = 0;
    draft.stats.currentStreak = 0;

    // Smart rescheduling: Find items with same conjugation type and/or ending kana
    if (currentItem.type !== 'grammar' && currentItem.vocab) {
      const endingKana = getWordEndingKana(currentItem.vocab.word);
      if (endingKana !== null && endingKana !== '') {
        const relatedItems = findRelatedUpcomingItems(
          draft,
          currentItem.vocab.type,
          currentItem.conjugationType!,
          endingKana,
          draft.currentIndex,
          currentItem.vocab.word  // Exclude rescheduled instances of the same word
        );
        if (relatedItems.length > 0) {
          // Move related items up in the queue (right after current position)
          moveItemsToFront(draft, relatedItems, draft.currentIndex);
          // Track smart rescheduling for notification
          draft.lastSmartReschedule = {
            count: relatedItems.length,
            endingKana,
            conjugationType: currentItem.conjugationType
          };
        } else {
          draft.lastSmartReschedule = undefined;
        }
      } else {
        draft.lastSmartReschedule = undefined;
      }
    } else {
      draft.lastSmartReschedule = undefined;
    }

    // Remove current item from queue
    const removedItem = draft.queue.splice(draft.currentIndex, 1)[0];

    // Reschedule at multiple future positions
    const currentAttempts = draft.attemptHistory[itemKey].attempts;
    const maxReschedules = Math.min(CONFIG.RESCHEDULE_INTERVALS.length, 4);

    for (let i = 0; i < maxReschedules; i++) {
      const baseOffset = CONFIG.RESCHEDULE_INTERVALS[i];
      const iterationOffset = i * 5;
      const offset = baseOffset + iterationOffset;

      const insertPosition = Math.min(
        draft.currentIndex + offset,
        draft.queue.length
      );

      const rescheduledItem: ReviewItem = {
        ...removedItem,
        id: crypto.randomUUID(),
        isRescheduled: true,
        rescheduleIteration: i + 1,
        originalAttempts: currentAttempts,
        scheduledAt: Date.now()
      };

      draft.queue.splice(insertPosition, 0, rescheduledItem);
    }

    // Spread consecutive duplicates
    spreadConsecutiveDuplicates(draft);
  });
}

function removeExcessQueueItems(state: SessionState, itemKey: string): number {
  // Find all future occurrences of this item
  const futureOccurrences: number[] = [];

  for (let i = state.currentIndex + 1; i < state.queue.length; i++) {
    if (getItemKey(state.queue[i]) === itemKey) {
      futureOccurrences.push(i);
    }
  }

  let removedCount = 0;
  // If we have future occurrences, we want to keep only the VERY LAST one,
  // AND we want to make sure it's an "end card" (rescheduled).
  if (futureOccurrences.length > 0) {
    const lastIndex = futureOccurrences[futureOccurrences.length - 1];
    
    // 1. Remove all future occurrences except the last one
    for (let i = futureOccurrences.length - 2; i >= 0; i--) {
      state.queue.splice(futureOccurrences[i], 1);
      removedCount++;
    }

    // 2. Ensure the remaining one is marked as a rescheduled "end card"
    // (If it was already an end card, we keep it as is. If it was a normal card,
    // we effectively promote it to be the end card.)
    const remainingItem = state.queue[lastIndex - removedCount];
    if (!remainingItem.isRescheduled) {
      remainingItem.isRescheduled = true;
      remainingItem.rescheduleIteration = 4; // Use the max iteration for "end"
    }
  }
  
  return removedCount;
}

function spreadConsecutiveDuplicates(state: SessionState): void {
  const minSpacing = 3;

  for (let i = state.currentIndex; i < state.queue.length - 1; i++) {
    const currentKey = getItemKey(state.queue[i]);

    // Look ahead for duplicates within minSpacing
    for (let j = i + 1; j < Math.min(i + minSpacing, state.queue.length); j++) {
      if (getItemKey(state.queue[j]) === currentKey) {
        // Found a duplicate too close, move it forward
        const item = state.queue.splice(j, 1)[0];
        const newPosition = Math.min(i + minSpacing, state.queue.length);
        state.queue.splice(newPosition, 0, item);
        break;
      }
    }
  }
}

function getItemKey(item: ReviewItem): string {
  if (item.type === 'grammar') {
    return `grammar-${item.grammarCard!.id}`;
  }
  return `${item.vocab!.word}-${item.conjugationType}`;
}

export function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function getWordEndingKana(word: string): string | null {
  // Handle irregular verbs with special groupings
  const irregularGroups: Record<string, string> = {
    'する': 'する-group',
    '為る': 'する-group',
    '来る': 'くる-group',
    '來る': 'くる-group',
    '行く': 'いく-group',
    '逝く': 'いく-group',
    '往く': 'いく-group'
  };

  if (word in irregularGroups) {
    return irregularGroups[word];
  }

  // Check if word ends with する or くる (for compound verbs like 勉強する, 帰ってくる)
  if (word.endsWith('する') || word.endsWith('為る')) {
    return 'する-group';
  }
  if (word.endsWith('来る') || word.endsWith('來る') || word.endsWith('くる')) {
    return 'くる-group';
  }

  // Extract the last character
  if (word.length === 0) return null;
  const lastChar = word[word.length - 1];

  // Check if it's hiragana (ぁ-ん range: U+3041-U+3093)
  const isHiragana = lastChar >= '\u3041' && lastChar <= '\u3093';

  // If it ends with hiragana, return that kana
  // Otherwise, group words without kana endings together
  return isHiragana ? lastChar : 'no-kana-ending';
}

function findRelatedUpcomingItems(
  state: SessionState,
  wordType: string,
  currentConjugationType: ConjugationType,
  endingKana: string,
  fromIndex: number,
  excludeWord: string
): number[] {
  const maxItems = 3;
  const perfectMatches: number[] = []; // Same type + Same conjugation + same ending
  const goodMatches: number[] = []; // Same type + Same conjugation only

  // Search upcoming items, prioritizing conjugation type
  for (let i = fromIndex + 1; i < state.queue.length; i++) {
    const item = state.queue[i];

    // Skip if it's a grammar card or doesn't have vocab
    if (item.type === 'grammar' || !item.vocab) continue;

    // Skip if word type doesn't match
    if (item.vocab.type !== wordType) continue;

    // Skip if it's the same word (to avoid moving up rescheduled instances of the current card)
    if (item.vocab.word === excludeWord) continue;

    const itemEnding = getWordEndingKana(item.vocab.word);
    const sameConjugation = item.conjugationType === currentConjugationType;
    const sameEnding = itemEnding === endingKana;

    if (sameConjugation && sameEnding) {
      perfectMatches.push(i);
    } else if (sameConjugation) {
      goodMatches.push(i);
    }

    // Stop searching once we have enough items
    if (perfectMatches.length + goodMatches.length >= maxItems * 2) {
      break;
    }
  }

  // Combine results: perfect matches first, then good matches, up to maxItems
  const relatedIndices = [...perfectMatches, ...goodMatches].slice(0, maxItems);

  return relatedIndices;
}

function moveItemsToFront(
  state: SessionState,
  indices: number[],
  insertAfter: number
): void {
  // Sort indices in descending order to avoid index shifting issues
  const sortedIndices = [...indices].sort((a, b) => b - a);

  // Extract items from their current positions
  const itemsToMove: ReviewItem[] = [];
  for (const idx of sortedIndices) {
    itemsToMove.unshift(state.queue.splice(idx, 1)[0]);
  }

  // Insert items right after the current position
  for (let i = 0; i < itemsToMove.length; i++) {
    state.queue.splice(insertAfter + 1 + i, 0, itemsToMove[i]);
  }
}

export function createInitialState(): SessionState {
  return {
    queue: [],
    currentIndex: 0,
    reviewedCorrectly: [],
    attemptHistory: {},
    repetitionCounts: {},
    consecutiveCorrect: {},
    totalUniqueItems: 0,
    stats: {
      totalReviewed: 0,
      currentStreak: 0
    }
  };
}
