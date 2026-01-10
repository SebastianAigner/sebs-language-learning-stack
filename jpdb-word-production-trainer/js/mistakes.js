// Mistakes management - persistent storage of vocabulary with errors

import { CONFIG } from './config.js';
import { getVocabId } from './utils.js';

// Save mistakes to separate localStorage
export function saveMistakes(queue, reviewedCorrectly, repetitionCounts) {
  try {
    // Get items with repetition count > 1 (meaning they were answered multiple times)
    const mistakes = [];
    const allItems = [...queue, ...reviewedCorrectly];
    const seenIds = new Set();

    allItems.forEach(item => {
      const vocabId = getVocabId(item);
      if (seenIds.has(vocabId)) return;
      seenIds.add(vocabId);

      const repetitionCount = repetitionCounts[vocabId] || 0;
      if (repetitionCount > 1) {
        mistakes.push({
          ...item,
          mistakeCount: repetitionCount,
          savedAt: Date.now()
        });
      }
    });

    if (mistakes.length > 0) {
      localStorage.setItem(CONFIG.MISTAKES_STORAGE_KEY, JSON.stringify(mistakes));
      console.log(`Saved ${mistakes.length} mistakes to localStorage`);
      return mistakes.length;
    }
    return 0;
  } catch (error) {
    console.error('Failed to save mistakes:', error);
    return 0;
  }
}

// Load mistakes from localStorage
export function loadMistakes() {
  try {
    const saved = localStorage.getItem(CONFIG.MISTAKES_STORAGE_KEY);
    if (saved) {
      const mistakes = JSON.parse(saved);
      console.log(`Loaded ${mistakes.length} mistakes from localStorage`);
      return mistakes;
    }
  } catch (error) {
    console.error('Failed to load mistakes:', error);
  }
  return [];
}

// Clear mistakes from localStorage
export function clearMistakes() {
  try {
    localStorage.removeItem(CONFIG.MISTAKES_STORAGE_KEY);
    console.log('Cleared mistakes from localStorage');
  } catch (error) {
    console.error('Failed to clear mistakes:', error);
  }
}

// Get count of saved mistakes
export function getMistakesCount() {
  const mistakes = loadMistakes();
  return mistakes.length;
}

// Check if there are any saved mistakes
export function hasSavedMistakes() {
  return getMistakesCount() > 0;
}
