// Event handler setup and coordination

import { state, saveState, isQueueEmpty } from '../state.js';
import { getCurrentItem } from '../state.js';
import { handleGoodGrade, handleNotGoodGrade } from '../grading.js';
import { shuffleQueue, reverseQueue, removeKatakanaWords } from '../scheduler.js';
import { loadMistakes, clearMistakes } from '../mistakes.js';
import { isExactMatch } from '../utils.js';
import { clearAutoAdvanceTimer } from './timer.js';
import { hideError } from './views.js';

// Handle submit button click
function handleSubmit(elements, render) {
  const input = elements.japaneseInput.value.trim();

  // Don't submit if input is empty
  if (!input) {
    return;
  }

  state.ui.currentInput = input;
  state.ui.showingComparison = true;
  render();
}

// Handle Good button click
function handleGood(elements, render) {
  clearAutoAdvanceTimer();
  handleGoodGrade();
  state.ui.currentInput = '';
  state.ui.showingComparison = false;
  render();
}

// Handle Not Good button click
function handleNotGood(elements, render) {
  clearAutoAdvanceTimer();
  handleNotGoodGrade();
  state.ui.currentInput = '';
  state.ui.showingComparison = false;
  render();
}

// Handle retry input submission (for wrong answers)
function handleRetrySubmit(elements, render) {
  const currentItem = getCurrentItem();
  if (!currentItem) return;

  const correctJapanese = currentItem.japaneseText || currentItem.japanese || currentItem.spelling || '';
  const retryAnswer = elements.retryInput.value;

  // Check if retry answer matches the correct answer
  if (isExactMatch(retryAnswer, correctJapanese)) {
    // They typed it correctly, proceed to next card (still grade as Not Good)
    clearAutoAdvanceTimer();
    handleNotGoodGrade();
    state.ui.currentInput = '';
    state.ui.showingComparison = false;
    render();
  } else {
    // Wrong again, shake the input or give feedback
    elements.retryInput.classList.add('shake');
    setTimeout(() => {
      elements.retryInput.classList.remove('shake');
    }, 500);
  }
}

// Set up event listeners
export function setupEventListeners(elements, render, callbacks) {
  const { onRetry, onNewSession, onReset, onFetch, onLoadMistakes } = callbacks;

  // Enter key in input
  elements.japaneseInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(elements, render);
    }
  });

  // Retry input - Enter key to submit retry answer
  elements.retryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRetrySubmit(elements, render);
    }
  });

  // Grading buttons
  elements.goodBtn.addEventListener('click', () => handleGood(elements, render));
  elements.notGoodBtn.addEventListener('click', () => handleNotGood(elements, render));
  elements.retryGoodBtn.addEventListener('click', () => handleGood(elements, render));
  elements.skipTypingBtn.addEventListener('click', () => handleNotGood(elements, render));

  // Spacebar shortcut (only when grading controls are visible - meaning answer was correct)
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && state.ui.showingComparison && !elements.gradingControls.classList.contains('hidden')) {
      e.preventDefault();
      handleGood(elements, render);
    }
  });

  // Error overlay buttons
  elements.retryBtn.addEventListener('click', () => {
    hideError(elements);
    if (onRetry) onRetry();
  });

  elements.closeErrorBtn.addEventListener('click', () => {
    hideError(elements);
  });

  // Completion buttons
  elements.newSessionBtn.addEventListener('click', () => {
    if (onNewSession) onNewSession();
  });

  elements.loadMistakesBtn.addEventListener('click', () => {
    if (!elements.loadMistakesBtn.disabled && onLoadMistakes) {
      if (confirm('Load past mistakes for review? This will replace your current session.')) {
        onLoadMistakes();
      }
    }
  });

  // Clear mistakes button
  elements.clearMistakesBtn.addEventListener('click', () => {
    const savedMistakes = loadMistakes();
    if (savedMistakes.length === 0) {
      alert('No saved mistakes to clear.');
      return;
    }
    if (confirm(`Clear ${savedMistakes.length} saved mistake(s)? This cannot be undone.`)) {
      clearMistakes();
      render(); // This will call updateMistakesButton
      console.log('Cleared saved mistakes');
    }
  });

  // Fetch button
  elements.fetchBtn.addEventListener('click', () => {
    if (confirm('Fetch new vocabulary from service? This will replace your current session.')) {
      if (onFetch) onFetch();
    }
  });

  // Shuffle button
  elements.shuffleBtn.addEventListener('click', () => {
    if (isQueueEmpty()) {
      alert('Queue is empty, nothing to shuffle.');
      return;
    }
    shuffleQueue();
    render();
    console.log('Queue shuffled and UI refreshed');
  });

  // Reverse button
  elements.reverseBtn.addEventListener('click', () => {
    if (isQueueEmpty()) {
      alert('Queue is empty, nothing to reverse.');
      return;
    }
    reverseQueue();
    render();
    console.log('Queue reversed and UI refreshed');
  });

  // Remove katakana button
  elements.removeKatakanaBtn.addEventListener('click', () => {
    if (isQueueEmpty()) {
      alert('Queue is empty, nothing to remove.');
      return;
    }
    const removedCount = removeKatakanaWords();
    render();
    alert(`Removed ${removedCount} katakana-only word(s) from the queue.`);
  });

  // Reset button
  elements.resetBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all data? This will clear your session and reload the page.')) {
      if (onReset) onReset();
    }
  });

  // Service URL input - update config on change
  elements.serviceUrl.addEventListener('change', () => {
    state.config.serviceUrl = elements.serviceUrl.value;
    console.log('Service URL updated to:', state.config.serviceUrl);
    saveState();
  });

  // TTS prefix text input - update config on change
  elements.ttsPrefixText.addEventListener('change', () => {
    state.config.ttsPrefixText = elements.ttsPrefixText.value.trim();
    console.log('TTS prefix text updated');
    saveState();
  });

  // TTS suffix text input - update config on change
  elements.ttsSuffixText.addEventListener('change', () => {
    state.config.ttsSuffixText = elements.ttsSuffixText.value.trim();
    console.log('TTS suffix text updated');
    saveState();
  });

  // Blacklist input - update config on change
  elements.blacklist.addEventListener('change', () => {
    state.config.blacklist = elements.blacklist.value;
    console.log('Blacklist updated');
    saveState();
    render();
  });

  console.log('Event listeners set up');
}
