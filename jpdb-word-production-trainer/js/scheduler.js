// Queue management and rescheduling algorithm (pure business logic)

import { CONFIG } from './config.js';
import { state, saveState } from './state.js';
import { getVocabId } from './utils.js';
import { showToast } from './ui/views.js';

// Initialize queue from vocabulary items
export function initializeQueue(items) {
  state.session.queue = items.map(item => ({
    ...item,
    isRescheduled: false,
    rescheduleIteration: 0,
    originalAttempts: 0
  }));
  state.session.currentIndex = 0;
  state.session.reviewedCorrectly = [];
  state.session.attemptHistory = {};
  state.session.repetitionCounts = {};
  state.session.consecutiveCorrect = {};
  state.session.stats.totalReviewed = 0;
  state.session.stats.currentStreak = 0;

  // Initialize repetition counts and consecutive correct for all items (start at 0, will increment on answer)
  items.forEach(item => {
    const vocabId = getVocabId(item);
    state.session.repetitionCounts[vocabId] = 0;
    state.session.consecutiveCorrect[vocabId] = 0;
  });

  console.log(`Queue initialized with ${items.length} items`);

  // Spread out any consecutive duplicates in the initial queue
  spreadConsecutiveDuplicates();

  saveState();
}

// Handle "Good" grade
export function handleGoodGrade() {
  const currentItem = state.session.queue[state.session.currentIndex];
  if (!currentItem) {
    console.error('No current item to grade');
    return;
  }

  const vocabId = getVocabId(currentItem);
  const attemptHistory = state.session.attemptHistory[vocabId];
  const isFirstTry = !attemptHistory || attemptHistory.attempts === 0;

  // Increment answer count
  state.session.repetitionCounts[vocabId] = (state.session.repetitionCounts[vocabId] || 0) + 1;

  // Increment consecutive correct count
  state.session.consecutiveCorrect[vocabId] = (state.session.consecutiveCorrect[vocabId] || 0) + 1;
  const consecutiveCount = state.session.consecutiveCorrect[vocabId];

  console.log(`Good grade for ${vocabId}, first try: ${isFirstTry}, consecutive correct: ${consecutiveCount}`);

  if (isFirstTry) {
    // First try success - add to reviewed correctly list and increment stats
    state.session.reviewedCorrectly.push({
      ...currentItem,
      completedAt: Date.now()
    });
    state.session.stats.totalReviewed++;
    state.session.stats.currentStreak++;
    console.log(`Added to reviewed correctly. Total: ${state.session.stats.totalReviewed}, Streak: ${state.session.stats.currentStreak}`);
  } else {
    // Success on retry - just remove from queue
    console.log('Success on retry, removing from queue');
  }

  // Update attempt history to mark as completed
  state.session.attemptHistory[vocabId] = {
    attempts: attemptHistory ? attemptHistory.attempts : 0,
    lastWasCorrect: true,
    completed: true
  };

  // If user got this word correct 3 times in a row, remove all future occurrences except the last one
  if (consecutiveCount >= 3) {
    removeExcessQueueItems(vocabId);
  }

  // Move to next item
  state.session.currentIndex++;
}

// Remove all occurrences of a word from the remaining queue except the last one
function removeExcessQueueItems(vocabId) {
  const queue = state.session.queue;
  const startIndex = state.session.currentIndex + 1; // Start from the next item

  // Find all positions of this word in the remaining queue
  const positions = [];
  for (let i = startIndex; i < queue.length; i++) {
    if (getVocabId(queue[i]) === vocabId) {
      positions.push(i);
    }
  }

  // If there are multiple occurrences, remove all except the last one
  if (positions.length > 1) {
    // Keep the last position, remove all others (in reverse to maintain indices)
    const toRemove = positions.slice(0, -1).reverse();
    const removedCount = toRemove.length;
    console.log(`Removing ${removedCount} excess occurrences of ${vocabId} from queue, keeping the last one`);

    for (const pos of toRemove) {
      queue.splice(pos, 1);
    }

    // Show toast notification
    showToast(`${vocabId}: Removed ${removedCount} review${removedCount > 1 ? 's' : ''} (3 correct in a row!)`, 'success', 3000);
  } else if (positions.length === 1) {
    console.log(`Found 1 remaining occurrence of ${vocabId} in queue, keeping it`);
  } else {
    console.log(`No more occurrences of ${vocabId} in remaining queue`);
  }
}

// Handle "Not Good" grade - reschedule with multiple spaced re-prompts
export function handleNotGoodGrade() {
  const currentItem = state.session.queue[state.session.currentIndex];
  if (!currentItem) {
    console.error('No current item to grade');
    return;
  }

  const vocabId = getVocabId(currentItem);
  const attemptHistory = state.session.attemptHistory[vocabId];
  const currentAttempts = attemptHistory ? attemptHistory.attempts : 0;
  const newAttempts = currentAttempts + 1;

  // Increment answer count
  state.session.repetitionCounts[vocabId] = (state.session.repetitionCounts[vocabId] || 0) + 1;

  // Reset consecutive correct count for this word
  state.session.consecutiveCorrect[vocabId] = 0;

  // Reset streak
  state.session.stats.currentStreak = 0;

  console.log(`Not good grade for ${vocabId}, attempt ${newAttempts}, streak reset, consecutive correct reset`);

  // Update attempt history
  state.session.attemptHistory[vocabId] = {
    attempts: newAttempts,
    lastWasCorrect: false,
    completed: false
  };

  // Remove current item from queue
  state.session.queue.splice(state.session.currentIndex, 1);

  // Schedule multiple future appearances with increasing spacing
  const intervals = CONFIG.RESCHEDULE_INTERVALS;
  // Add 1 to ensure at least 2 reviews on first wrong attempt
  const scheduleCount = Math.min(newAttempts + 1, intervals.length);

  console.log(`Scheduling ${scheduleCount} re-prompts`);

  for (let i = 0; i < scheduleCount; i++) {
    const offset = intervals[i];
    // Spread them out by adding additional spacing between iterations
    const additionalSpacing = i * 5;
    const insertPosition = Math.min(
      state.session.currentIndex + offset + additionalSpacing,
      state.session.queue.length
    );

    // Clone item with scheduling metadata
    const scheduledItem = {
      ...currentItem,
      isRescheduled: true,
      rescheduleIteration: i + 1,
      originalAttempts: newAttempts,
      scheduledAt: Date.now()
    };

    state.session.queue.splice(insertPosition, 0, scheduledItem);
    console.log(`Scheduled re-prompt ${i + 1} at position ${insertPosition}`);
  }

  // Don't increment currentIndex since we removed an item
  // The next item is now at the current index

  // Spread out any consecutive duplicates
  spreadConsecutiveDuplicates();
}

// Get the next item without advancing
export function peekNextItem() {
  if (state.session.currentIndex < state.session.queue.length) {
    return state.session.queue[state.session.currentIndex];
  }
  return null;
}

// Check if this is the first attempt for an item
export function isFirstAttempt(vocabId) {
  const attemptHistory = state.session.attemptHistory[vocabId];
  return !attemptHistory || attemptHistory.attempts === 0;
}

// Get remaining items in queue
export function getRemainingCount() {
  return state.session.queue.length - state.session.currentIndex;
}

// Check if a string contains only katakana characters (and common punctuation/spaces)
function isKatakanaOnly(text) {
  if (!text) return false;
  // Match katakana (U+30A0-U+30FF), katakana phonetic extensions (U+31F0-U+31FF),
  // halfwidth katakana (U+FF65-U+FF9F), and common punctuation/spaces
  const katakanaRegex = /^[\u30A0-\u30FF\u31F0-\u31FF\uFF65-\uFF9F\s・ー]+$/;
  return katakanaRegex.test(text);
}

// Remove all katakana-only words from the remaining queue
export function removeKatakanaWords() {
  const queue = state.session.queue;
  const startIndex = state.session.currentIndex;

  if (startIndex >= queue.length) {
    console.log('Queue is empty, nothing to remove');
    return 0;
  }

  // Filter remaining items, keeping only non-katakana words
  const remaining = queue.slice(startIndex);
  const filtered = remaining.filter(item => {
    const japaneseText = item.japaneseText || item.japanese || item.spelling || '';
    return !isKatakanaOnly(japaneseText);
  });

  const removedCount = remaining.length - filtered.length;

  // Replace remaining queue with filtered items
  queue.splice(startIndex, remaining.length, ...filtered);

  console.log(`Removed ${removedCount} katakana-only words from queue`);
  saveState();
  return removedCount;
}

// Reverse the remaining queue (from currentIndex onwards)
export function reverseQueue() {
  const queue = state.session.queue;
  const startIndex = state.session.currentIndex;

  if (startIndex >= queue.length) {
    console.log('Queue is empty, nothing to reverse');
    return;
  }

  // Get the remaining items and reverse them
  const remaining = queue.slice(startIndex);
  remaining.reverse();

  // Put reversed items back into queue
  queue.splice(startIndex, remaining.length, ...remaining);

  console.log('Queue reversed');
  saveState();
}

// Shuffle the remaining queue (from currentIndex onwards)
export function shuffleQueue() {
  const queue = state.session.queue;
  const startIndex = state.session.currentIndex;

  if (startIndex >= queue.length) {
    console.log('Queue is empty, nothing to shuffle');
    return;
  }

  // Get the remaining items
  const remaining = queue.slice(startIndex);

  // Fisher-Yates shuffle
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }

  // Put shuffled items back into queue
  queue.splice(startIndex, remaining.length, ...remaining);

  console.log('Queue shuffled');

  // Spread out any consecutive duplicates created by shuffle
  spreadConsecutiveDuplicates();

  saveState();
}

// Spread out consecutive duplicates of the same word in the queue
export function spreadConsecutiveDuplicates() {
  const queue = state.session.queue;
  const startIndex = state.session.currentIndex;

  // Look for consecutive duplicates starting from current position
  for (let i = startIndex; i < queue.length - 1; i++) {
    const currentVocabId = getVocabId(queue[i]);
    const nextVocabId = getVocabId(queue[i + 1]);

    // If the next item is the same word
    if (currentVocabId === nextVocabId) {
      // Try to move it at least 3 positions forward
      const minSeparation = 3;
      const targetPosition = Math.min(i + 1 + minSeparation, queue.length);

      // Find the best position that doesn't create another consecutive duplicate
      let bestPosition = targetPosition;
      for (let j = i + 2; j <= targetPosition && j < queue.length; j++) {
        const prevVocabId = getVocabId(queue[j - 1]);
        const currVocabId = getVocabId(queue[j]);

        // If this position doesn't create a duplicate with neighbors
        if (prevVocabId !== currentVocabId && (j >= queue.length - 1 || currVocabId !== currentVocabId)) {
          bestPosition = j;
          break;
        }
      }

      // Move the duplicate item to the best position
      if (bestPosition !== i + 1) {
        const [item] = queue.splice(i + 1, 1);
        queue.splice(bestPosition, 0, item);
        console.log(`Moved duplicate ${currentVocabId} from position ${i + 1} to ${bestPosition}`);
      }
    }
  }
}
