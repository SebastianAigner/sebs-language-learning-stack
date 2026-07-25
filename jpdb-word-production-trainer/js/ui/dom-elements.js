// DOM element references

let elements = {};

// Initialize DOM element references
export function initializeDOMElements() {
  elements = {
    // Views
    promptView: document.getElementById('prompt-view'),
    comparisonView: document.getElementById('comparison-view'),
    completionView: document.getElementById('completion-view'),
    errorOverlay: document.getElementById('error-overlay'),
    loadingOverlay: document.getElementById('loading-overlay'),

    // Prompt view
    englishText: document.getElementById('english-text'),
    japaneseInput: document.getElementById('japanese-input'),

    // Comparison view
    comparisonEnglishText: document.getElementById('comparison-english-text'),
    correctAnswer: document.getElementById('correct-answer'),
    comparisonGrid: document.getElementById('comparison-grid'),
    correctAnswerReading: document.getElementById('correct-answer-reading'),
    goodBtn: document.getElementById('good-btn'),
    notGoodBtn: document.getElementById('not-good-btn'),
    retrySection: document.getElementById('retry-section'),
    retryPrompt: document.getElementById('retry-prompt'),
    retryInput: document.getElementById('retry-input'),
    readingHint: document.getElementById('reading-hint'),
    skipTypingBtn: document.getElementById('skip-typing-btn'),
    retryGoodBtn: document.getElementById('retry-good-btn'),
    gradingControls: document.getElementById('grading-controls'),

    // Stats
    reviewCount: document.getElementById('review-count'),
    streakCounter: document.getElementById('streak-counter'),

    // Config
    serviceUrl: document.getElementById('service-url'),
    ttsPrefixText: document.getElementById('tts-prefix-text'),
    ttsSuffixText: document.getElementById('tts-suffix-text'),
    blacklist: document.getElementById('blacklist'),
    fetchBtn: document.getElementById('fetch-btn'),
    shuffleBtn: document.getElementById('shuffle-btn'),
    reverseBtn: document.getElementById('reverse-btn'),
    removeKatakanaBtn: document.getElementById('remove-katakana-btn'),
    clearMistakesBtn: document.getElementById('clear-mistakes-btn'),
    resetBtn: document.getElementById('reset-btn'),
    ttsStatusContainer: document.getElementById('tts-status-container'),

    // Error
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    closeErrorBtn: document.getElementById('close-error-btn'),

    // Completion
    completionCount: document.getElementById('completion-count'),
    mistakesCount: document.getElementById('mistakes-count'),
    newSessionBtn: document.getElementById('new-session-btn'),
    loadMistakesBtn: document.getElementById('load-mistakes-btn'),

    // Debug panels
    queueList: document.getElementById('queue-list'),
    mostRepeatedList: document.getElementById('most-repeated-list'),
    completedList: document.getElementById('completed-list')
  };

  console.log('UI elements initialized');
  return elements;
}

// Get DOM elements
export function getDOMElements() {
  return elements;
}
