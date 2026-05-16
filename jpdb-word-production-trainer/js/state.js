/**
 * State management and localStorage persistence
 *
 * This module provides centralized state management for the application,
 * including persistence to localStorage. The state contains:
 * - config: User configuration (service URL)
 * - session: Review session data (queue, progress, statistics)
 * - ui: UI state (current input, view state)
 */

import { CONFIG } from './config.js';

/**
 * Centralized application state
 * @type {Object}
 * @property {Object} config - User configuration
 * @property {string} config.serviceUrl - URL of the vocabulary service
 * @property {string} config.ttsPrefixText - Optional TTS prefix text sent as previous_text
 * @property {string} config.ttsSuffixText - Optional TTS suffix text sent as suffix_text
 * @property {string} config.ttsDefaultPrefixText - Server-provided default previous_text
 * @property {string} config.ttsDefaultSuffixText - Server-provided default suffix_text
 * @property {Object} session - Current review session data
 * @property {Array} session.queue - Queue of vocabulary items to review
 * @property {number} session.currentIndex - Current position in the queue
 * @property {Array} session.reviewedCorrectly - Items reviewed correctly on first try
 * @property {Object} session.attemptHistory - Map of vocab ID to attempt count
 * @property {Object} session.repetitionCounts - Map of vocab ID to repetition count
 * @property {Object} session.consecutiveCorrect - Map of vocab ID to consecutive correct count
 * @property {Object} session.stats - Session statistics
 * @property {number} session.stats.totalReviewed - Count of items reviewed correctly on first try
 * @property {number} session.stats.currentStreak - Current streak of correct answers
 * @property {string|null} session.lastUpdated - ISO date string of last update
 * @property {Object} ui - UI state (not persisted)
 * @property {string} ui.currentInput - Current user input
 * @property {boolean} ui.showingComparison - Whether comparison view is active
 * @property {Object} ui.debugPanelsOpen - Debug panel visibility state
 */
export const state = {
  config: {
    serviceUrl: CONFIG.DEFAULT_SERVICE_URL,
    autoAdvanceCorrect: CONFIG.AUTO_ADVANCE_CORRECT,
    ttsEnabled: CONFIG.TTS_ENABLED,
    ttsPrefixText: '',
    ttsSuffixText: '',
    ttsDefaultPrefixText: CONFIG.DEFAULT_TTS_PREFIX_TEXT,
    ttsDefaultSuffixText: CONFIG.DEFAULT_TTS_SUFFIX_TEXT,
    blacklist: ''
  },

  session: {
    queue: [],
    currentIndex: 0,
    reviewedCorrectly: [],
    attemptHistory: {},
    repetitionCounts: {},
    consecutiveCorrect: {},
    stats: {
      totalReviewed: 0,
      currentStreak: 0
    },
    lastUpdated: null
  },

  ui: {
    currentInput: '',
    showingComparison: false,
    debugPanelsOpen: {
      queue: false,
      completed: false
    }
  }
};

/**
 * Load state from localStorage and merge into current state
 * UI state is reset to defaults (not restored from storage)
 * @returns {boolean} True if state was successfully loaded, false otherwise
 */
export function loadState() {
  try {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Deep merge the parsed state into the current state
      Object.assign(state.config, parsed.config || {});
      Object.assign(state.session, parsed.session || {});

      // Force enable TTS and Auto-advance regardless of saved settings
      state.config.ttsEnabled = true;
      state.config.autoAdvanceCorrect = true;

      // Reset UI state to defaults (don't restore comparison view state)
      state.ui = {
        currentInput: '',
        showingComparison: false,
        debugPanelsOpen: {
          queue: false,
          completed: false
        }
      };

      console.log('State loaded from localStorage');
      return true;
    }
  } catch (error) {
    console.error('Failed to load state from localStorage:', error);
  }
  return false;
}

/**
 * Save current state to localStorage
 * Handles quota exceeded errors gracefully
 */
export function saveState() {
  try {
    state.session.lastUpdated = new Date().toISOString();
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state));
    console.log('State saved to localStorage');
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
    // Handle quota exceeded error
    if (error.name === 'QuotaExceededError') {
      alert('Storage quota exceeded. Please reset your session data.');
    }
  }
}

/**
 * Reset all persisted data to defaults
 * Clears localStorage and resets in-memory state
 */
export function resetState() {
  try {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    console.log('State cleared from localStorage');
    // Reset in-memory state to defaults
    state.config.serviceUrl = CONFIG.DEFAULT_SERVICE_URL;
    state.config.autoAdvanceCorrect = CONFIG.AUTO_ADVANCE_CORRECT;
    state.config.ttsEnabled = CONFIG.TTS_ENABLED;
    state.config.ttsPrefixText = '';
    state.config.ttsSuffixText = '';
    state.config.ttsDefaultPrefixText = CONFIG.DEFAULT_TTS_PREFIX_TEXT;
    state.config.ttsDefaultSuffixText = CONFIG.DEFAULT_TTS_SUFFIX_TEXT;
    state.config.blacklist = '';
    state.session = {
      queue: [],
      currentIndex: 0,
      reviewedCorrectly: [],
      attemptHistory: {},
      repetitionCounts: {},
      consecutiveCorrect: {},
      stats: {
        totalReviewed: 0,
        currentStreak: 0
      },
      lastUpdated: null
    };
    state.ui = {
      currentInput: '',
      showingComparison: false,
      debugPanelsOpen: {
        queue: false,
        completed: false
      }
    };
  } catch (error) {
    console.error('Failed to reset state:', error);
  }
}

/**
 * Get the current vocabulary item from the queue
 * @returns {Object|null} The current vocabulary item, or null if queue is exhausted
 */
export function getCurrentItem() {
  if (state.session.currentIndex < state.session.queue.length) {
    return state.session.queue[state.session.currentIndex];
  }
  return null;
}

/**
 * Check if the review queue is exhausted
 * @returns {boolean} True if all items have been reviewed, false otherwise
 */
export function isQueueEmpty() {
  return state.session.currentIndex >= state.session.queue.length;
}
