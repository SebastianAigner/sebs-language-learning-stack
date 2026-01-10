import { describe, it, expect } from 'vitest';
import { parseBlacklistToSet, isBlacklisted } from './persistence';
import { initializeQueue } from './scheduler';
import type { VocabItem, ConjugationType } from './types';

describe('Blacklist functionality', () => {
  describe('persistence.ts', () => {
    it('should parse simple blacklist', () => {
      const text = 'word1\nword2\nword3#conj';
      const set = parseBlacklistToSet(text);
      expect(set.has('word1')).toBe(true);
      expect(set.has('word2')).toBe(true);
      expect(set.has('word3#conj')).toBe(true);
      expect(set.has('word3')).toBe(false);
    });

    it('should check if word is blacklisted', () => {
      const set = new Set(['word1', 'word2#conj1']);
      
      expect(isBlacklisted(set, 'word1')).toBe(true);
      expect(isBlacklisted(set, 'word1', 'any-conj')).toBe(true);
      
      expect(isBlacklisted(set, 'word2')).toBe(false);
      expect(isBlacklisted(set, 'word2', 'conj1')).toBe(true);
      expect(isBlacklisted(set, 'word2', 'conj2')).toBe(false);
      
      expect(isBlacklisted(set, 'word3')).toBe(false);
    });
  });

  describe('scheduler.ts - initializeQueue', () => {
    const mockItems: VocabItem[] = [
      {
        url: 'url1',
        word: 'word1',
        reading: 'reading1',
        meanings: { 'm1': ['meaning1'] },
        type: 'verb'
      },
      {
        url: 'url2',
        word: 'word2',
        reading: 'reading2',
        meanings: { 'm2': ['meaning2'] },
        type: 'verb'
      }
    ];

    it('should filter out entirely blacklisted words', () => {
      const blacklist = new Set(['word1']);
      const queue = initializeQueue(mockItems, undefined, blacklist);
      
      expect(queue.length).toBe(1);
      expect(queue[0]!.vocab!.word).toBe('word2');
    });

    it('should filter out specific word-conjugation combinations', () => {
      const blacklist = new Set(['word1#non-past-affirmative-casual']);
      
      // If we only enable that one conjugation, word1 should be skipped
      const enabledTypes: ConjugationType[] = ['non-past-affirmative-casual'];
      const queue = initializeQueue(mockItems, enabledTypes, blacklist);
      
      expect(queue.length).toBe(1);
      expect(queue[0]!.vocab!.word).toBe('word2');
    });

    it('should pick a non-blacklisted conjugation if available', () => {
      // word1 has all conjugations available by default.
      // We blacklist all but one.
      // Wait, it's easier to enable only two and blacklist one.
      const enabledTypes: ConjugationType[] = ['non-past-affirmative-casual', 'non-past-affirmative-polite'];
      const blacklist = new Set(['word1#non-past-affirmative-casual']);
      
      // Try multiple times to ensure it never picks the blacklisted one
      for (let i = 0; i < 20; i++) {
        const queue = initializeQueue(mockItems, enabledTypes, blacklist);
        const item1 = queue.find(it => it.vocab?.word === 'word1');
        expect(item1).toBeDefined();
        expect(item1?.conjugationType).toBe('non-past-affirmative-polite');
      }
    });

    it('should skip word if all enabled conjugations are blacklisted', () => {
      const enabledTypes: ConjugationType[] = ['non-past-affirmative-casual'];
      const blacklist = new Set(['word1#non-past-affirmative-casual']);
      
      const queue = initializeQueue(mockItems, enabledTypes, blacklist);
      expect(queue.length).toBe(1);
      expect(queue[0]!.vocab!.word).toBe('word2');
    });
  });
});
