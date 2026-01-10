import { describe, it, expect } from 'vitest';
import type { VocabContent, VocabItem } from './types';
import { filterVocabularyByMode } from './api';

describe('API', () => {
  describe('VocabContent parsing', () => {
    it('should identify ichidan verbs', () => {
      const content: VocabContent = {
        url: 'https://jpdb.io/test',
        word: '食べる',
        reading: 'たべる',
        meanings: {
          'Verb (1-dan, other-move)': ['to eat']
        }
      };

      const meaningKeys = Object.keys(content.meanings);
      const hasIchidan = meaningKeys.some(key => key.includes('Verb (1-dan'));

      expect(hasIchidan).toBe(true);
    });

    it('should identify godan verbs', () => {
      const content: VocabContent = {
        url: 'https://jpdb.io/test',
        word: '行く',
        reading: 'いく',
        meanings: {
          'Verb (5-dan, く, self-move)': ['to go']
        }
      };

      const meaningKeys = Object.keys(content.meanings);
      const hasGodan = meaningKeys.some(key => key.includes('Verb (5-dan'));

      expect(hasGodan).toBe(true);
    });

    it('should identify i-adjectives', () => {
      const content: VocabContent = {
        url: 'https://jpdb.io/test',
        word: '高い',
        reading: 'たかい',
        meanings: {
          'Adjective (い)': ['high', 'expensive']
        }
      };

      const meaningKeys = Object.keys(content.meanings);
      const hasAdjective = meaningKeys.some(key => key.includes('Adjective (い)'));

      expect(hasAdjective).toBe(true);
    });

    it('should identify suru-verbs', () => {
      const content: VocabContent = {
        url: 'https://jpdb.io/test',
        word: '掃除',
        reading: 'そうじ',
        meanings: {
          'Noun, Verb (する)': ['cleaning']
        }
      };

      const meaningKeys = Object.keys(content.meanings);
      const hasSuru = meaningKeys.some(key => key.includes('Verb (する)'));

      expect(hasSuru).toBe(true);
    });

    it('should identify irregular verbs', () => {
      const content: VocabContent = {
        url: 'https://jpdb.io/test',
        word: '来る',
        reading: 'くる',
        meanings: {
          'Verb (irregular)': ['to come']
        }
      };

      const meaningKeys = Object.keys(content.meanings);
      const hasIrregular = meaningKeys.some(key => key.includes('Verb (irregular)'));

      expect(hasIrregular).toBe(true);
    });

    it('should not identify non-verbs and non-adjectives', () => {
      const content: VocabContent = {
        url: 'https://jpdb.io/test',
        word: '本',
        reading: 'ほん',
        meanings: {
          'Noun': ['book']
        }
      };

      const meaningKeys = Object.keys(content.meanings);
      const hasVerbOrAdj = meaningKeys.some(key =>
        key.includes('Verb (1-dan') || 
        key.includes('Verb (5-dan') || 
        key.includes('Verb (する)') || 
        key.includes('Verb (irregular)') || 
        key.includes('Adjective (い)')
      );

      expect(hasVerbOrAdj).toBe(false);
    });
  });

  describe('filterVocabularyByMode', () => {
    const items: Partial<VocabItem>[] = [
      { word: '食べる', type: 'verb' },
      { word: '飲む', type: 'verb' },
      { word: '高い', type: 'adjective' },
      { word: '寒い', type: 'adjective' },
    ];

    it('should return all items when mode is "both"', () => {
      const result = filterVocabularyByMode(items as VocabItem[], 'both');
      expect(result.length).toBe(4);
    });

    it('should return only verbs when mode is "verbs"', () => {
      const result = filterVocabularyByMode(items as VocabItem[], 'verbs');
      expect(result.length).toBe(2);
      expect(result.every((i) => i.type === 'verb')).toBe(true);
    });

    it('should return only adjectives when mode is "adjectives"', () => {
      const result = filterVocabularyByMode(items as VocabItem[], 'adjectives');
      expect(result.length).toBe(2);
      expect(result.every((i) => i.type === 'adjective')).toBe(true);
    });
  });
});
