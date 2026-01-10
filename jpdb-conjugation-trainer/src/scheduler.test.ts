import { describe, it, expect } from 'vitest';
import { initializeQueue, handleGoodGrade, handleNotGoodGrade, createInitialState, shuffleArray } from './scheduler';
import type { VocabItem } from './types';
import { ADJECTIVE_CONJUGATION_TYPES } from './types';

describe('Scheduler', () => {
  const mockVerbs: VocabItem[] = [
    {
      url: 'https://jpdb.io/test1',
      word: '食べる',
      reading: 'たべる',
      meanings: { 'Verb (1-dan, other-move)': ['to eat'] },
      type: 'verb',
      verbType: 'ichidan'
    },
    {
      url: 'https://jpdb.io/test2',
      word: '行く',
      reading: 'いく',
      meanings: { 'Verb (5-dan, く, self-move)': ['to go'] },
      type: 'verb',
      verbType: 'godan'
    }
  ];

  const mockAdjectives: VocabItem[] = [
    {
      url: 'https://jpdb.io/test3',
      word: '高い',
      reading: 'たかい',
      meanings: { 'Adjective (い)': ['expensive', 'high'] },
      type: 'adjective'
    }
  ];

  describe('initializeQueue', () => {
    it('should create a queue item for each verb', () => {
      const queue = initializeQueue(mockVerbs);
      expect(queue.length).toBe(2);
    });

    it('should assign random conjugation types', () => {
      const queue = initializeQueue(mockVerbs);
      queue.forEach(item => {
        expect(item.conjugationType).toBeDefined();
        expect(item.vocab).toBeDefined();
      });
    });

    it('should initialize items as not rescheduled', () => {
      const queue = initializeQueue(mockVerbs);
      queue.forEach(item => {
        expect(item.isRescheduled).toBe(false);
        expect(item.rescheduleIteration).toBe(0);
      });
    });

    it('should only assign valid adjective conjugation types for adjectives', () => {
      const queue = initializeQueue(mockAdjectives);
      queue.forEach(item => {
        expect(ADJECTIVE_CONJUGATION_TYPES).toContain(item.conjugationType);
      });
    });
  });

  describe('handleGoodGrade', () => {
    it('should advance currentIndex', () => {
      const state = createInitialState();
      state.queue = initializeQueue(mockVerbs);
      const initialIndex = state.currentIndex;

      const newState = handleGoodGrade(state);

      expect(newState.currentIndex).toBe(initialIndex + 1);
    });

    it('should increment stats on first success', () => {
      const state = createInitialState();
      state.queue = initializeQueue(mockVerbs);

      const newState = handleGoodGrade(state);

      expect(newState.stats.totalReviewed).toBe(1);
      expect(newState.stats.currentStreak).toBe(1);
    });

    it('should track consecutive correct answers', () => {
      const state = createInitialState();
      state.queue = initializeQueue([mockVerbs[0]]);
      const itemKey = `${state.queue[0]!.vocab!.word}-${state.queue[0]!.conjugationType}`;

      const newState = handleGoodGrade(state);

      expect(newState.consecutiveCorrect[itemKey]).toBe(1);
    });

    it('should remove excess items and call callback when streak threshold reached', () => {
      const state = createInitialState();
      const vocab = mockVerbs[0];
      const item = {
        id: '1',
        vocab,
        conjugationType: 'non-past-affirmative-casual' as const,
        isRescheduled: false,
        rescheduleIteration: 0,
        originalAttempts: 0
      };
      
      // Setup queue with 3 consecutive items + 2 more of same item later
      state.queue = [item, item, item, { ...item, id: '4' }, { ...item, id: '5' }];
      const itemKey = '食べる-non-past-affirmative-casual';
      
      // First two correct answers
      let currentState = handleGoodGrade(state);
      currentState = handleGoodGrade(currentState);
      
      expect(currentState.consecutiveCorrect[itemKey]).toBe(2);
      expect(currentState.queue.length).toBe(5);

      // Third correct answer triggers removal
      let callbackCalled = false;
      let removedCount = 0;
      
      const finalState = handleGoodGrade(currentState, (count) => {
        callbackCalled = true;
        removedCount = count;
      });

      expect(finalState.consecutiveCorrect[itemKey]).toBe(3);
      // It should keep the last occurrence and remove others in between.
      // futureOccurrences for third item (index 2) are [3, 4] (indices in current queue).
      // removeExcessQueueItems keeps only the LAST one (index 4), so it should remove index 3.
      // Wait, let's look at the logic in removeExcessQueueItems again.
      // futureOccurrences: [3, 4]
      // if (futureOccurrences.length > 1) { // 2 > 1 true
      //   for (let i = 2 - 2; i >= 0; i--) { // i = 0
      //     state.queue.splice(futureOccurrences[0], 1); // remove index 3
      //     removedCount++;
      //   }
      // }
      // So it removes 1 item.
      expect(finalState.queue.length).toBe(4); 
      expect(callbackCalled).toBe(true);
      expect(removedCount).toBe(1);
    });

    it('should call onStreakProgress when consecutive correct reaches 2', () => {
      const state = createInitialState();
      const vocab = mockVerbs[0];
      const item = {
        id: '1',
        vocab,
        conjugationType: 'non-past-affirmative-casual' as const,
        isRescheduled: false,
        rescheduleIteration: 0,
        originalAttempts: 0
      };
      
      state.queue = [item, item, item];
      
      // First correct answer
      const currentState = handleGoodGrade(state);
      
      // Second correct answer should trigger onStreakProgress
      let progressCalled = false;
      handleGoodGrade(currentState, undefined, () => {
        progressCalled = true;
      });
      
      expect(progressCalled).toBe(true);
    });
  });

  describe('handleNotGoodGrade', () => {
    it('should reschedule item at multiple positions', () => {
      const state = createInitialState();
      state.queue = initializeQueue(mockVerbs);
      const initialLength = state.queue.length;

      const newState = handleNotGoodGrade(state);

      // Should add 4 reschedules (at positions 10, 15, 20, 30 or end of queue)
      expect(newState.queue.length).toBeGreaterThan(initialLength);
    });

    it('should reset consecutive correct count', () => {
      let state = createInitialState();
      state.queue = initializeQueue([mockVerbs[0]]);
      const itemKey = `${state.queue[0]!.vocab!.word}-${state.queue[0]!.conjugationType}`;

      // First get it right
      state = handleGoodGrade(state);
      expect(state.consecutiveCorrect[itemKey]).toBe(1);

      // Add another item and get it wrong
      state = {
        ...state,
        queue: [...state.queue, state.queue[0]],
        currentIndex: 1
      };
      state = handleNotGoodGrade(state);

      expect(state.consecutiveCorrect[itemKey]).toBe(0);
    });

    it('should reset current streak', () => {
      const state = createInitialState();
      state.queue = initializeQueue(mockVerbs);
      state.stats.currentStreak = 5;

      const newState = handleNotGoodGrade(state);

      expect(newState.stats.currentStreak).toBe(0);
    });

    it('should not throw when handling a grammar card', () => {
      const state = createInitialState();
      state.queue = [{
        id: 'grammar-1',
        type: 'grammar',
        grammarCard: {
          id: 'g1',
          description: 'Test grammar task',
          createdAt: Date.now()
        },
        isRescheduled: false,
        rescheduleIteration: 0,
        originalAttempts: 0
      }];

      expect(() => handleNotGoodGrade(state)).not.toThrow();
    });

    it('should only smart-reschedule items of the same word type', () => {
      const state = createInitialState();
      // Mixed queue: verb, then adjective, then another verb with same ending as first verb
      const verb1: VocabItem = { ...mockVerbs[0], word: '使う' }; // ends in う
      const adj1: VocabItem = { ...mockAdjectives[0], word: '高い' }; // ends in い
      const verb2: VocabItem = { ...mockVerbs[1], word: '買う' }; // ends in う
      
      // Manually construct queue to ensure order and same conjugation type
      state.queue = [
        { id: '1', vocab: verb1, conjugationType: 'non-past-affirmative-casual', isRescheduled: false, rescheduleIteration: 0, originalAttempts: 0 },
        { id: '2', vocab: adj1, conjugationType: 'non-past-affirmative-casual', isRescheduled: false, rescheduleIteration: 0, originalAttempts: 0 },
        { id: '3', vocab: verb2, conjugationType: 'non-past-affirmative-casual', isRescheduled: false, rescheduleIteration: 0, originalAttempts: 0 }
      ];
      
      // Fail on verb1
      const newState = handleNotGoodGrade(state);
      
      // Smart rescheduling should move verb2 to right after current index (which is now 0, but verb1 was removed)
      // Actually handleNotGoodGrade removes the current item and inserts reschedules.
      // The current item was verb1. Remaining queue was [adj1, verb2].
      // verb2 has same type and same ending as verb1. It should be moved to front of the remaining queue.
      // So new queue should start with verb2.
      
      expect(newState.queue[0]!.vocab!.word).toBe('買う');
      expect(newState.queue[1]!.vocab!.word).toBe('高い');
    });
  });

  describe('createInitialState', () => {
    it('should create a valid initial state', () => {
      const state = createInitialState();

      expect(state.queue).toEqual([]);
      expect(state.currentIndex).toBe(0);
      expect(state.reviewedCorrectly).toEqual([]);
      expect(state.attemptHistory).toEqual({});
      expect(state.stats.totalReviewed).toBe(0);
      expect(state.stats.currentStreak).toBe(0);
    });
  });

  describe('shuffleArray', () => {
    it('should shuffle an array', () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const copy = [...input];
      shuffleArray(copy);
      // While it's theoretically possible for shuffle to return the same order,
      // with 10 elements the probability is 1/10! which is tiny.
      expect(copy).not.toEqual(input);
      expect(copy.sort((a, b) => a - b)).toEqual(input);
    });
  });
});
