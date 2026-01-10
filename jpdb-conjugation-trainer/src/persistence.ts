import type { SessionState, ReviewMode } from './types';
import { STORAGE_KEYS } from './types';

export function saveSession(session: SessionState): void {
  try {
    const serialized = JSON.stringify(session);
    localStorage.setItem(STORAGE_KEYS.SESSION, serialized);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded. Unable to save session.');
    } else {
      console.error('Failed to save session:', error);
    }
  }
}

export function loadSession(): SessionState | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!serialized) {
      return null;
    }

    let session: SessionState;
    try {
      session = JSON.parse(serialized);
    } catch (parseError) {
      console.error('Failed to parse session from localStorage:', parseError);
      clearSession();
      return null;
    }

    // Validate session state to prevent corruption
    if (!session.queue || !Array.isArray(session.queue)) {
      console.warn('Invalid session: queue is missing or not an array');
      clearSession();
      return null;
    }

    if (session.currentIndex < 0 || session.currentIndex > session.queue.length) {
      console.warn('Invalid session: currentIndex out of bounds', {
        currentIndex: session.currentIndex,
        queueLength: session.queue.length
      });
      clearSession();
      return null;
    }

    // Reset if session is effectively complete
    if (session.currentIndex >= session.queue.length && session.queue.length > 0) {
      console.warn('Session already complete, clearing');
      clearSession();
      return null;
    }

    // Validate totalUniqueItems: it should never be larger than queue length
    // (queue can only grow by rescheduling items, never shrink the unique count)
    if (session.totalUniqueItems && session.totalUniqueItems > session.queue.length) {
      console.warn('Invalid session: totalUniqueItems exceeds queue length, recalculating', {
        totalUniqueItems: session.totalUniqueItems,
        queueLength: session.queue.length
      });
      // Count unique items in queue (vocab or grammar)
      const uniqueItems = new Set(session.queue.map(item => 
        item.type === 'grammar' ? `grammar-${item.grammarCard!.id}` : item.vocab!.word
      ));
      session.totalUniqueItems = uniqueItems.size;
    }

    // Validate stats: totalReviewed should never exceed currentIndex
    // and currentStreak should never exceed totalReviewed
    if (!session.stats) {
      session.stats = { totalReviewed: 0, currentStreak: 0 };
    } else {
      if (session.stats.totalReviewed > session.currentIndex) {
        console.warn('Invalid session: totalReviewed exceeds currentIndex, resetting', {
          totalReviewed: session.stats.totalReviewed,
          currentIndex: session.currentIndex
        });
        session.stats.totalReviewed = session.currentIndex;
      }
      if (session.stats.currentStreak > session.stats.totalReviewed) {
        console.warn('Invalid session: currentStreak exceeds totalReviewed, resetting', {
          currentStreak: session.stats.currentStreak,
          totalReviewed: session.stats.totalReviewed
        });
        session.stats.currentStreak = 0;
      }
    }

    return session;
  } catch (error) {
    console.error('Failed to load session:', error);
    clearSession();
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

export interface Config {
  model: string;
  autoAdvance: boolean;
  apiBaseUrl: string;
  ttsServiceUrl: string;
  reviewMode: ReviewMode;
}

export function saveConfig(config: Partial<Config>): void {
  try {
    const existing = loadConfig() || {};
    const updated = { ...existing, ...config };
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

export function loadConfig(): Config | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!serialized) {
      return null;
    }
    return JSON.parse(serialized);
  } catch (error) {
    console.error('Failed to load config:', error);
    return null;
  }
}

// Deprecated: Use saveConfig instead
export function saveAutoAdvance(autoAdvance: boolean): void {
  saveConfig({ autoAdvance });
}

// Deprecated: Use loadConfig instead
export function loadAutoAdvance(): boolean {
  const config = loadConfig();
  return config?.autoAdvance ?? false;
}

// Always-add cards management
export function saveAlwaysAddCards(cards: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ALWAYS_ADD_CARDS, cards);
  } catch (error) {
    console.error('Failed to save always-add cards:', error);
  }
}

export function loadAlwaysAddCards(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.ALWAYS_ADD_CARDS) || '';
  } catch (error) {
    console.error('Failed to load always-add cards:', error);
    return '';
  }
}

export function saveAlwaysAddAdjectives(cards: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ALWAYS_ADD_ADJECTIVES, cards);
  } catch (error) {
    console.error('Failed to save always-add adjectives:', error);
  }
}

export function loadAlwaysAddAdjectives(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.ALWAYS_ADD_ADJECTIVES) || '';
  } catch (error) {
    console.error('Failed to load always-add adjectives:', error);
    return '';
  }
}

// Blacklist management
export function saveBlacklist(words: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BLACKLIST, words);
  } catch (error) {
    console.error('Failed to save blacklist:', error);
  }
}

export function loadBlacklist(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.BLACKLIST) || '';
  } catch (error) {
    console.error('Failed to load blacklist:', error);
    return '';
  }
}

/**
 * Parses a blacklist string into a Set of words for efficient lookup
 */
export function parseBlacklistToSet(blacklistText: string): Set<string> {
  return new Set(
    blacklistText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
  );
}

/**
 * Checks if a word or a word-conjugation pair is blacklisted
 */
export function isBlacklisted(blacklist: Set<string>, word: string, conjugation?: string): boolean {
  if (blacklist.has(word)) {
    return true;
  }
  if (conjugation && blacklist.has(`${word}#${conjugation}`)) {
    return true;
  }
  return false;
}
