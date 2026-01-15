import type { GradingResult } from './grader';

const CACHE_KEY = 'jpdb-conjugation-trainer-llm-cache';
const CACHE_VERSION = 1;

interface CacheEntry {
  result: GradingResult;
  timestamp: number;
}

interface Cache {
  version: number;
  entries: Record<string, CacheEntry>;
}

function getCacheKey(word: string, conjugationType: string, userAnswer: string): string {
  return `${word}:${conjugationType}:${userAnswer}`;
}

function loadCache(): Cache {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached === null || cached === '') {
      return { version: CACHE_VERSION, entries: {} };
    }

    const cache = JSON.parse(cached) as Cache;

    // Reset cache if version mismatch
    if (cache.version !== CACHE_VERSION) {
      return { version: CACHE_VERSION, entries: {} };
    }

    return cache;
  } catch (error) {
    console.error('Failed to load LLM cache:', error);
    return { version: CACHE_VERSION, entries: {} };
  }
}

function saveCache(cache: Cache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Failed to save LLM cache:', error);
  }
}

export function getCachedResult(
  word: string,
  conjugationType: string,
  userAnswer: string
): GradingResult | null {
  const cache = loadCache();
  const key = getCacheKey(word, conjugationType, userAnswer);

  if (!(key in cache.entries)) {
    return null;
  }

  const entry = cache.entries[key];
  // Cache hit
  console.log('LLM cache hit:', key);
  return entry.result;
}

export function setCachedResult(
  word: string,
  conjugationType: string,
  userAnswer: string,
  result: GradingResult
): void {
  const cache = loadCache();
  const key = getCacheKey(word, conjugationType, userAnswer);

  cache.entries[key] = {
    result,
    timestamp: Date.now()
  };

  saveCache(cache);
  console.log('LLM cache set:', key);
}

export function clearCache(): void {
  localStorage.removeItem(CACHE_KEY);
  console.log('LLM cache cleared');
}

export function getCacheStats(): { entryCount: number; sizeKB: number } {
  const cache = loadCache();
  const entryCount = Object.keys(cache.entries).length;

  // Estimate size in KB
  const cacheString = JSON.stringify(cache);
  const sizeKB = Math.round((cacheString.length * 2) / 1024); // UTF-16 = 2 bytes per char

  return { entryCount, sizeKB };
}

export interface CacheEntryDisplay {
  key: string;
  word: string;
  conjugationType: string;
  userAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
  timestamp: number;
}

export function getRecentCacheEntries(limit: number = 5): CacheEntryDisplay[] {
  const cache = loadCache();

  // Convert entries to array and sort by timestamp (most recent first)
  const entries = Object.entries(cache.entries)
    .map(([key, entry]) => {
      // Parse the key: "word:conjugationType:userAnswer"
      const parts = key.split(':');
      const word = parts[0] ?? '';
      const conjugationType = parts[1] ?? '';
      const userAnswer = parts[2] ?? '';
      return {
        key,
        word,
        conjugationType,
        userAnswer,
        isCorrect: entry.result.isCorrect,
        correctAnswer: entry.result.correctAnswer,
        timestamp: entry.timestamp
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);

  return entries;
}
