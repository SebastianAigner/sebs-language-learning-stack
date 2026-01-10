// Utility functions used across the application

// Strip Japanese characters (hiragana, katakana, kanji) from text and replace with ?
export function stripKana(text) {
  if (!text) return text;
  // Replace sequences of hiragana (U+3040-U+309F), katakana (U+30A0-U+30FF), and kanji (U+4E00-U+9FFF) with ?
  return text.replace(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g, '?').trim();
}

// Check if user input exactly matches correct answer
export function isExactMatch(userInput, correctAnswer) {
  // Normalize whitespace but preserve all other characters
  const normalize = (str) => str.trim().replace(/\s+/g, ' ');
  return normalize(userInput) === normalize(correctAnswer);
}

// Get vocabulary ID from item (for deduplication and tracking)
export function getVocabId(item) {
  return item.word || item.vocabularyId || item.vid || item.japaneseText || item.japanese;
}
