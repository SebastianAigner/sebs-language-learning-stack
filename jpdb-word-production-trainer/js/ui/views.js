// View rendering functions

import { CONFIG } from '../config.js';
import { isExactMatch } from '../utils.js';
import { getQueueForDebug, getReviewedCorrectlyForDebug, getMostRepeatedForDebug } from '../debug.js';
import { loadMistakes } from '../mistakes.js';
import { playCorrectSound, playWrongSound, playTTS, prefetchTTS } from './audio.js';
import { startAutoAdvanceTimer, clearAutoAdvanceTimer } from './timer.js';

/**
 * Filter English definition based on blacklist
 * @param {string} text - Original English definition
 * @param {string} blacklistStr - Blacklist string (newline separated)
 * @returns {string} Filtered text
 */
function filterDefinition(text, blacklistStr) {
  if (!blacklistStr) return text;

  const blacklist = blacklistStr
    .split('\n')
    .map(word => word.trim())
    .filter(word => word.length > 0);

  if (blacklist.length === 0) return text;

  let filteredText = text;
  for (const word of blacklist) {
    // Escape special regex characters in the word
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Case-insensitive replacement with question marks
    const regex = new RegExp(escapedWord, 'gi');
    filteredText = filteredText.replace(regex, match => '?'.repeat(match.length));
  }

  return filteredText;
}

// Show prompt view (English definition + input)
export function showPromptView(elements, item, currentInput, state) {
  if (!item) {
    console.error('No current item to display');
    return;
  }

  // Get English definition from various possible fields
  let englishDef = item.englishDefinition || item.english || item.meaning || item.definition || 'No definition available';
  
  // Apply blacklist filter
  englishDef = filterDefinition(englishDef, state.config.blacklist);

  elements.englishText.textContent = englishDef;
  elements.japaneseInput.value = currentInput;

  // Show prompt view, hide others
  elements.promptView.classList.remove('hidden');
  elements.comparisonView.classList.add('hidden');
  elements.completionView.classList.add('hidden');

  state.ui.showingComparison = false;

  // Asynchronously request TTS audio so it's cached by the time the user submits
  const correctJapanese = item.japaneseText || item.japanese || item.spelling || '';
  prefetchTTS(correctJapanese, state.config.ttsPrefixText, state.config.ttsSuffixText);

  // Focus input field (using setTimeout to ensure it happens after render)
  setTimeout(() => {
    elements.japaneseInput.focus();
  }, 0);
}

// Show comparison view (side-by-side answers)
export function showComparisonView(elements, item, currentInput, state, handleGoodCallback) {
  if (!item) {
    console.error('No current item to display');
    return;
  }

  // Get Japanese text from various possible fields
  const correctJapanese = item.japaneseText || item.japanese || item.spelling || 'No Japanese text available';
  let englishDef = item.englishDefinition || item.english || item.meaning || item.definition || 'No definition available';

  // Apply blacklist filter
  englishDef = filterDefinition(englishDef, state.config.blacklist);

  elements.comparisonEnglishText.textContent = englishDef;
  elements.userAnswer.textContent = currentInput;
  elements.correctAnswer.textContent = correctJapanese;

  // Show reading if available (for all answers)
  const reading = item.reading;
  if (reading) {
    elements.comparisonReading.textContent = `Reading: ${reading}`;
    elements.comparisonReading.style.display = 'block';
  } else {
    elements.comparisonReading.style.display = 'none';
  }

  // Check for exact match
  const isExact = isExactMatch(currentInput, correctJapanese);
  
  // Play TTS for the written form shown as the correct answer.
  playTTS(correctJapanese, state.config.ttsPrefixText, state.config.ttsSuffixText);

  if (isExact) {
    elements.comparisonGrid.classList.add('exact-match');

    // Show grading controls, hide retry section
    elements.gradingControls.classList.remove('hidden');
    elements.retrySection.classList.add('hidden');

    // Play correct answer sound
    playCorrectSound();
    
    // Auto-advance after 1 second
    startAutoAdvanceTimer(handleGoodCallback, 1000);

    // Focus on Good button for keyboard accessibility
    setTimeout(() => elements.goodBtn.focus(), 0);
  } else {
    elements.comparisonGrid.classList.remove('exact-match');
    clearAutoAdvanceTimer();

    // Play wrong answer sound
    playWrongSound();

    // Show retry section, hide grading controls
    elements.retrySection.classList.remove('hidden');
    elements.gradingControls.classList.add('hidden');

    // Show reading hint if available
    const reading = item.reading;
    if (reading) {
      elements.readingHint.textContent = `Reading: ${reading}`;
      elements.readingHint.style.display = 'block';
    } else {
      elements.readingHint.style.display = 'none';
    }

    // Clear and focus retry input
    elements.retryInput.value = '';
    setTimeout(() => elements.retryInput.focus(), 0);
  }

  // Show comparison view, hide others
  elements.promptView.classList.add('hidden');
  elements.comparisonView.classList.remove('hidden');
  elements.completionView.classList.add('hidden');

  state.ui.showingComparison = true;
}

// Show completion view
export function showCompletionView(elements, stats) {
  elements.completionCount.textContent = stats.totalReviewed;

  // Show completion view, hide others
  elements.promptView.classList.add('hidden');
  elements.comparisonView.classList.add('hidden');
  elements.completionView.classList.remove('hidden');
}

// Update statistics display
export function updateStats(elements, stats) {
  elements.reviewCount.textContent = stats.totalReviewed;

  // Update streak counter
  const streak = stats.currentStreak;
  if (streak >= CONFIG.STREAK_THRESHOLD) {
    const fontSize = CONFIG.STREAK_BASE_FONT_SIZE + (streak - CONFIG.STREAK_THRESHOLD) * CONFIG.STREAK_FONT_INCREMENT;
    elements.streakCounter.textContent = `🔥 ${streak}`;
    elements.streakCounter.style.fontSize = `${fontSize}pt`;
    elements.streakCounter.classList.remove('hidden');
  } else {
    elements.streakCounter.classList.add('hidden');
  }
}

// Update mistakes button state
export function updateMistakesButton(elements) {
  const savedMistakes = loadMistakes();
  elements.mistakesCount.textContent = savedMistakes.length;

  // Disable button if no mistakes
  if (savedMistakes.length === 0) {
    elements.loadMistakesBtn.disabled = true;
  } else {
    elements.loadMistakesBtn.disabled = false;
  }
}

// Update debug panels
export function updateDebugPanels(elements, queue, currentIndex, reviewedCorrectly, repetitionCounts) {
  // Update queue debug panel
  const queueItems = getQueueForDebug(queue, currentIndex);
  if (queueItems.length === 0) {
    elements.queueList.innerHTML = '';
    elements.queueList.previousElementSibling.style.display = 'block';
  } else {
    elements.queueList.previousElementSibling.style.display = 'none';
    elements.queueList.innerHTML = queueItems
      .map(item => {
        const english = item.englishDefinition || item.english || item.meaning || '?';
        let badgeText = '';
        if (item.isEndReschedule) {
          badgeText = 'End';
        } else if (item.isRescheduled) {
          badgeText = `R${item.rescheduleIteration}`;
        }
        const badge = badgeText ? ` <span class="rescheduled-badge">${badgeText}</span>` : '';
        return `<li>${english}${badge}</li>`;
      })
      .join('');
  }

  // Update most repeated debug panel
  const mostRepeatedItems = getMostRepeatedForDebug(queue, reviewedCorrectly, repetitionCounts);
  if (mostRepeatedItems.length === 0) {
    elements.mostRepeatedList.innerHTML = '';
    elements.mostRepeatedList.previousElementSibling.style.display = 'block';
  } else {
    elements.mostRepeatedList.previousElementSibling.style.display = 'none';
    elements.mostRepeatedList.innerHTML = mostRepeatedItems
      .map(entry => {
        const item = entry.item;
        const count = entry.count;
        const japanese = item.japaneseText || item.japanese || item.spelling || item.word || '?';
        const english = item.englishDefinition || item.english || item.meaning || (item.meanings && item.meanings[0]) || '?';
        return `<li>${japanese} — ${english} <span class="repetition-badge">${count}x</span></li>`;
      })
      .join('');
  }

  // Update completed debug panel
  const completedItems = getReviewedCorrectlyForDebug(reviewedCorrectly);
  if (completedItems.length === 0) {
    elements.completedList.innerHTML = '';
    elements.completedList.previousElementSibling.style.display = 'block';
  } else {
    elements.completedList.previousElementSibling.style.display = 'none';
    elements.completedList.innerHTML = completedItems
      .map(item => {
        const japanese = item.japaneseText || item.japanese || item.spelling || '?';
        const english = item.englishDefinition || item.english || item.meaning || '?';
        return `<li>${japanese} — ${english}</li>`;
      })
      .join('');
  }
}

// Show/hide loading overlay
export function showLoading(elements) {
  elements.loadingOverlay.classList.remove('hidden');
}

export function hideLoading(elements) {
  elements.loadingOverlay.classList.add('hidden');
}

// Show/hide error overlay
export function showError(elements, message) {
  elements.errorMessage.textContent = message;
  elements.errorOverlay.classList.remove('hidden');
}

export function hideError(elements) {
  elements.errorOverlay.classList.add('hidden');
}

// Update service URL input
export function updateServiceUrlInput(elements, serviceUrl) {
  elements.serviceUrl.value = serviceUrl;
}

// Show toast notification
export function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) {
    console.error('Toast container not found');
    return;
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  // Add to container
  container.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => {
      container.removeChild(toast);
    }, 300); // Match fade-out animation duration
  }, duration);
}
