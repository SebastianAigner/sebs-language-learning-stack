// Configuration constants for the vocabulary trainer

export const CONFIG = {
  // Service configuration
  DEFAULT_SERVICE_URL: 'http://localhost:3000',
  REVIEWED_TODAY_ENDPOINT: '/today',

  // Scheduling parameters
  RESCHEDULE_INTERVALS: [10, 15, 20, 30],

  // UI parameters
  JAPANESE_FONT_SIZE: '2.5rem',
  AUTO_ADVANCE_CORRECT: true,

  // Streak parameters
  STREAK_THRESHOLD: 3,
  STREAK_BASE_FONT_SIZE: 20,
  STREAK_FONT_INCREMENT: 1,
  
  // TTS configuration
  TTS_BASE_URL: 'http://localhost:5065',
  TTS_ENABLED: true,
  DEFAULT_TTS_PREFIX_TEXT: '[japanese text, clearly enunciated]',
  DEFAULT_TTS_SUFFIX_TEXT: '。 [brief pause]',

  // Storage
  STORAGE_KEY: 'jpdb-trainer-state',
  MISTAKES_STORAGE_KEY: 'jpdb-trainer-mistakes'
};
