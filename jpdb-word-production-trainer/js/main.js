// Main application initialization and coordination

import { state, loadState, resetState, saveState, isQueueEmpty } from './state.js';
import { loadMistakes, clearMistakes } from './mistakes.js';
import { fetchReviewedToday, normalizeVocabItem } from './api.js';
import { initializeQueue, spreadConsecutiveDuplicates } from './scheduler.js';
import {
  initializeUI,
  setupEventListeners,
  render,
  showLoading,
  hideLoading,
  showError,
  updateConfigInputs
} from './ui/index.js';

// Initialize the application
async function init() {
  console.log('Initializing Japanese Vocabulary Trainer...');

  // Initialize UI
  initializeUI();

  // Try to load persisted state
  const hasPersistedState = loadState();
  
  // Update inputs from loaded state
  updateConfigInputs();

  if (hasPersistedState) {
    // We have persisted state, restore it (even if queue is exhausted)
    console.log('Resuming from persisted state');

    // Spread out any consecutive duplicates that may exist in the loaded queue
    if (!isQueueEmpty()) {
      spreadConsecutiveDuplicates();
    }
    saveState();

    render();
  } else {
    // No persisted state, fetch fresh data
    console.log('No persisted state, fetching fresh data');
    await fetchAndInitialize();
  }

  // Set up event listeners
  setupEventListeners({
    onRetry: fetchAndInitialize,
    onNewSession: fetchAndInitialize,
    onReset: handleReset,
    onFetch: fetchAndInitialize,
    onLoadMistakes: handleLoadMistakes
  });

  console.log('Application initialized');
}

// Fetch vocabulary and initialize queue
async function fetchAndInitialize() {
  showLoading();

  try {
    console.log(`Fetching vocabulary from ${state.config.serviceUrl}`);
    const items = await fetchReviewedToday(state.config.serviceUrl);

    if (items.length === 0) {
      throw new Error('No vocabulary items found. Please review some words first.');
    }

    // Normalize all items
    const normalizedItems = items.map(normalizeVocabItem);

    // Initialize queue
    initializeQueue(normalizedItems);

    hideLoading();
    render();

  } catch (error) {
    console.error('Failed to fetch and initialize:', error);
    hideLoading();
    showError(error.message);
  }
}

// Handle loading mistakes for review
function handleLoadMistakes() {
  console.log('Loading mistakes for review');

  const mistakes = loadMistakes();
  if (mistakes.length === 0) {
    showError('No saved mistakes found.');
    return;
  }

  // Initialize queue with mistakes
  initializeQueue(mistakes);

  // Clear the mistakes from storage since we're reviewing them now
  clearMistakes();

  hideLoading();
  render();
}

// Handle reset
function handleReset() {
  console.log('Resetting application state');
  resetState();
  // Don't save - let the page reload fetch fresh data
  // Reload the page to start fresh
  window.location.reload();
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
