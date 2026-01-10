// Debug utilities for displaying queue and review information

import { getVocabId } from './utils.js';

// Get queue for debug display (from current position onwards)
export function getQueueForDebug(queue, currentIndex) {
  return queue.slice(currentIndex);
}

// Get reviewed correctly list for debug display
export function getReviewedCorrectlyForDebug(reviewedCorrectly) {
  return reviewedCorrectly;
}

// Get most repeated items sorted by repetition count
export function getMostRepeatedForDebug(queue, reviewedCorrectly, repetitionCounts) {
  // Find the actual item data for each vocabId
  const allItems = [...queue, ...reviewedCorrectly];
  const itemMap = new Map();

  // Build map of vocabId to item
  allItems.forEach(item => {
    const vocabId = getVocabId(item);
    if (!itemMap.has(vocabId)) {
      itemMap.set(vocabId, item);
    }
  });

  // Convert repetitionCounts to array with item data
  const items = Object.entries(repetitionCounts)
    .map(([vocabId, count]) => ({
      item: itemMap.get(vocabId),
      count: count
    }))
    .filter(entry => entry.item && entry.count > 1) // Filter out items without data or count <= 1
    .sort((a, b) => b.count - a.count); // Sort by count descending

  return items;
}
