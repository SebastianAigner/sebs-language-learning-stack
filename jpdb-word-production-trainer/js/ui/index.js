// Main UI module coordinator

import { state, getCurrentItem, isQueueEmpty } from '../state.js';
import { handleGoodGrade } from '../grading.js';
import { initializeDOMElements } from './dom-elements.js';
import { showLoading as showLoadingOverlay, hideLoading as hideLoadingOverlay, showError as showErrorOverlay, hideError as hideErrorOverlay, updateServiceUrlInput as updateServiceUrlField } from './views.js';
import { showPromptView, showComparisonView, showCompletionView, updateStats, updateMistakesButton, updateDebugPanels } from './views.js';
import { setupEventListeners as setupEvents } from './events.js';
import { startAutoAdvanceTimer } from './timer.js';
import { initTTSIndicator } from './tts-indicator.js';
import { CONFIG } from '../config.js';

// DOM elements cache
let elements = {};

// Initialize DOM element references
export function initializeUI() {
  elements = initializeDOMElements();
}

// Show loading overlay
export function showLoading() {
  showLoadingOverlay(elements);
}

// Hide loading overlay
export function hideLoading() {
  hideLoadingOverlay(elements);
}

// Show error overlay with message
export function showError(message) {
  showErrorOverlay(elements, message);
}

// Hide error overlay
export function hideError() {
  hideErrorOverlay(elements);
}

// Render the current review state
export function render() {
  updateStats(elements, state.session.stats);
  updateDebugPanels(elements, state.session.queue, state.session.currentIndex, state.session.reviewedCorrectly, state.session.repetitionCounts);
  updateMistakesButton(elements);

  if (isQueueEmpty()) {
    showCompletionView(elements, state.session.stats);
  } else if (state.ui.showingComparison) {
    // Stay in comparison view - show it with the current item
    const item = getCurrentItem();
    showComparisonView(elements, item, state.ui.currentInput, state, handleGoodCallback);
  } else {
    const item = getCurrentItem();
    showPromptView(elements, item, state.ui.currentInput, state);
  }
}

// Callback for auto-advance on exact match
function handleGoodCallback() {
  handleGoodGrade();
  state.ui.currentInput = '';
  state.ui.showingComparison = false;
  render();
}

// Set up event listeners
export function setupEventListeners(callbacks) {
  setupEvents(elements, render, callbacks);
}

// Initialize service URL input and config with current value
export function updateConfigInputs() {
  updateServiceUrlField(elements, state.config.serviceUrl);
  if (elements.blacklist) {
    elements.blacklist.value = state.config.blacklist || '';
  }
  initTTSIndicator('tts-status-container', CONFIG.TTS_BASE_URL);
}
