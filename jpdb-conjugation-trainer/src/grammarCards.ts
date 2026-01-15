import { STORAGE_KEYS } from './types';
import type { GrammarCard } from './types';

// Type for raw data from localStorage that might be missing createdAt
type RawGrammarCard = Omit<GrammarCard, 'createdAt'> & { createdAt?: number };

export function loadGrammarCards(): GrammarCard[] {
  const stored = localStorage.getItem(STORAGE_KEYS.GRAMMAR_CARDS);
  if (stored === null || stored === '') return [];
  try {
    const rawCards = JSON.parse(stored) as RawGrammarCard[];

    // One-off migration: assign createdAt to cards missing it
    const lastWeek = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const needsMigration = rawCards.some((card) => card.createdAt === undefined || card.createdAt === 0);

    const migratedCards: GrammarCard[] = rawCards.map((card, index) => {
      const createdAt = card.createdAt;
      if (createdAt === undefined || createdAt === 0) {
        return { ...card, createdAt: lastWeek - index };
      }
      return { ...card, createdAt };
    });

    if (needsMigration) {
      saveGrammarCards(migratedCards);
    }

    // Sort newest to oldest
    return migratedCards.sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.error('Failed to parse grammar cards', e);
    return [];
  }
}

export function saveGrammarCards(cards: GrammarCard[]): void {
  localStorage.setItem(STORAGE_KEYS.GRAMMAR_CARDS, JSON.stringify(cards));
}

export function loadGrammarCardsInRotation(): string[] {
  const stored = localStorage.getItem(STORAGE_KEYS.GRAMMAR_CARDS_IN_ROTATION);
  if (stored === null || stored === '') {
    // If not set, default to all cards being in rotation
    const cards = loadGrammarCards();
    return cards.map(c => c.id);
  }
  try {
    return JSON.parse(stored) as string[];
  } catch (e) {
    console.error('Failed to parse grammar cards in rotation', e);
    return [];
  }
}

export function saveGrammarCardsInRotation(ids: string[]): void {
  localStorage.setItem(STORAGE_KEYS.GRAMMAR_CARDS_IN_ROTATION, JSON.stringify(ids));
}

export function toggleGrammarCardRotation(id: string, inRotation: boolean): void {
  const ids = loadGrammarCardsInRotation();
  let updatedIds: string[];
  if (inRotation) {
    if (!ids.includes(id)) {
      updatedIds = [...ids, id];
    } else {
      updatedIds = ids;
    }
  } else {
    updatedIds = ids.filter(i => i !== id);
  }
  saveGrammarCardsInRotation(updatedIds);
}

export function addGrammarCard(description: string, instructions?: string, variants?: string[]): GrammarCard {
  const cards = loadGrammarCards();
  const newCard: GrammarCard = {
    id: crypto.randomUUID(),
    description,
    instructions,
    variants,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  cards.push(newCard);
  saveGrammarCards(cards);
  
  // Add to rotation by default
  toggleGrammarCardRotation(newCard.id, true);
  
  return newCard;
}

export function deleteGrammarCard(id: string): void {
  const cards = loadGrammarCards();
  const filtered = cards.filter(c => c.id !== id);
  saveGrammarCards(filtered);
  
  // Remove from rotation list
  toggleGrammarCardRotation(id, false);
}

export function updateGrammarCard(id: string, description: string, instructions?: string, variants?: string[]): void {
  const cards = loadGrammarCards();
  const index = cards.findIndex(c => c.id === id);
  if (index !== -1) {
    cards[index] = { 
      ...cards[index], 
      description, 
      instructions, 
      variants,
      updatedAt: Date.now()
    };
    saveGrammarCards(cards);
  }
}

export function getLastExportTime(): number {
  const stored = localStorage.getItem(STORAGE_KEYS.LAST_EXPORT_TIME);
  return stored !== null && stored !== '' ? parseInt(stored, 10) : 0;
}

export function saveLastExportTime(time: number): void {
  localStorage.setItem(STORAGE_KEYS.LAST_EXPORT_TIME, time.toString());
}
