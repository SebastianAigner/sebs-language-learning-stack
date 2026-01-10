// Auto-advance timer management

let autoAdvanceTimer = null;

// Start auto-advance timer
export function startAutoAdvanceTimer(callback, delay = 1000) {
  clearAutoAdvanceTimer();
  autoAdvanceTimer = setTimeout(callback, delay);
}

// Clear auto-advance timer
export function clearAutoAdvanceTimer() {
  if (autoAdvanceTimer) {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = null;
  }
}

// Check if timer is active
export function isTimerActive() {
  return autoAdvanceTimer !== null;
}
