import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadGrammarCards, addGrammarCard } from './grammarCards';
import { STORAGE_KEYS } from './types';

describe('grammarCards', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  it('should add a card with createdAt timestamp', () => {
    const now = 1600000000000;
    vi.setSystemTime(now);
    
    const card = addGrammarCard('Test Description', 'Test Instructions', ['v1']);
    
    expect(card.createdAt).toBe(now);
    expect(card.id).toBeDefined();
    expect(card.description).toBe('Test Description');
  });

  it('should load cards sorted by createdAt newest-to-oldest', () => {
    vi.setSystemTime(1000);
    addGrammarCard('Old card');
    
    vi.setSystemTime(2000);
    addGrammarCard('Newer card');
    
    vi.setSystemTime(3000);
    addGrammarCard('Newest card');
    
    const cards = loadGrammarCards();
    expect(cards).toHaveLength(3);
    expect(cards[0].description).toBe('Newest card');
    expect(cards[1].description).toBe('Newer card');
    expect(cards[2].description).toBe('Old card');
  });

  it('should handle multiple legacy cards and maintain their order using index offset', () => {
    const legacyCards = [
      { id: '1', description: 'First Legacy' },
      { id: '2', description: 'Second Legacy' },
      { id: '3', description: 'Third Legacy' },
    ];
    localStorage.setItem(STORAGE_KEYS.GRAMMAR_CARDS, JSON.stringify(legacyCards));
    
    const cards = loadGrammarCards();
    expect(cards).toHaveLength(3);
    expect(cards[0].description).toBe('First Legacy');
    expect(cards[1].description).toBe('Second Legacy');
    expect(cards[2].description).toBe('Third Legacy');
    
    // Verify offsets were applied (newest to oldest sort means first should have largest timestamp)
    expect(cards[0].createdAt).toBeGreaterThan(cards[1].createdAt);
    expect(cards[1].createdAt).toBeGreaterThan(cards[2].createdAt);
  });
});
