// Vocabulary and conjugation types
export interface VocabContent {
  url: string;
  word: string;
  reading: string | null;
  meanings: {
    [key: string]: string[];
  };
}

export interface VocabEntry {
  timestamp: string;
  content: string; // JSON string that needs to be parsed
}

export interface ApiResponse {
  date: string;
  count: number;
  total: number;
  entries: VocabEntry[];
}

export type WordType = 'verb' | 'adjective';
export type ReviewMode = 'verbs' | 'adjectives' | 'both';

export interface VocabItem extends VocabContent {
  type: WordType;
  verbType?: 'ichidan' | 'godan';
}

// Conjugation targets
export type ConjugationType =
  | 'non-past-affirmative-casual'
  | 'non-past-affirmative-polite'
  | 'past-affirmative-casual'
  | 'past-affirmative-polite'
  | 'negative-casual'
  | 'negative-polite'
  | 'negative-past-casual'
  | 'negative-past-polite'
  | 'progressive-casual'
  | 'progressive-polite'
  | 'progressive-past-casual'
  | 'progressive-past-polite'
  | 'negative-progressive-casual'
  | 'negative-progressive-polite'
  | 'negative-progressive-past-casual'
  | 'negative-progressive-past-polite'
  | 'te-form'
  | 'tai-casual'
  | 'tai-polite'
  | 'sou-casual'
  | 'sou-polite'
  | 'volitional-casual'
  | 'volitional-polite';

export const CONJUGATION_LABELS: Record<ConjugationType, string> = {
  'non-past-affirmative-casual': 'Non-past affirmative (casual)',
  'non-past-affirmative-polite': 'Non-past affirmative (polite)',
  'past-affirmative-casual': 'Past affirmative (casual)',
  'past-affirmative-polite': 'Past affirmative (polite)',
  'negative-casual': 'Negative (casual)',
  'negative-polite': 'Negative (polite)',
  'negative-past-casual': 'Negative past (casual)',
  'negative-past-polite': 'Negative past (polite)',
  'progressive-casual': 'Progressive present (casual)',
  'progressive-polite': 'Progressive present (polite)',
  'progressive-past-casual': 'Progressive past (casual)',
  'progressive-past-polite': 'Progressive past (polite)',
  'negative-progressive-casual': 'Negative progressive present (casual)',
  'negative-progressive-polite': 'Negative progressive present (polite)',
  'negative-progressive-past-casual': 'Negative progressive past (casual)',
  'negative-progressive-past-polite': 'Negative progressive past (polite)',
  'te-form': 'て-form',
  'tai-casual': 'Want to (casual)',
  'tai-polite': 'Want to (polite)',
  'sou-casual': 'Looks / seems (casual)',
  'sou-polite': 'Looks / seems (polite)',
  'volitional-casual': 'Volitional ("Let\'s") (casual)',
  'volitional-polite': 'Volitional ("Let\'s") (polite)'
};

// Emoji representations for conjugation types
// Time/Tense: 🕐 (non-past), 🕰️ (past), ▶️ (progressive)
// Polarity: ✅ (affirmative), ❌ (negative)
// Formality: 😎🤙 (casual), 🙇 (polite)
// Special: 🔗 (て-form), 💭 (たい/want to)
export const CONJUGATION_EMOJIS: Record<ConjugationType, string> = {
  'non-past-affirmative-casual': '🕐 😎🤙',
  'non-past-affirmative-polite': '🕐',
  'past-affirmative-casual': '🕰️ 😎🤙',
  'past-affirmative-polite': '🕰️',
  'negative-casual': '🕐 😎🤙',
  'negative-polite': '🕐',
  'negative-past-casual': '🕰️ 😎🤙',
  'negative-past-polite': '🕰️',
  'progressive-casual': '▶️ 😎🤙',
  'progressive-polite': '▶️',
  'progressive-past-casual': '🕰️ ▶️ 😎🤙',
  'progressive-past-polite': '🕰️ ▶️',
  'negative-progressive-casual': '▶️ 😎🤙',
  'negative-progressive-polite': '▶️',
  'negative-progressive-past-casual': '🕰️ ▶️ 😎🤙',
  'negative-progressive-past-polite': '🕰️ ▶️',
  'te-form': '🔗',
  'tai-casual': '💭 😎🤙',
  'tai-polite': '💭',
  'sou-casual': '👀 😎🤙',
  'sou-polite': '👀',
  'volitional-casual': '🤝 😎🤙',
  'volitional-polite': '🤝'
};

export const VERB_CONJUGATION_TYPES: ConjugationType[] = [
  'non-past-affirmative-casual',
  'non-past-affirmative-polite',
  'past-affirmative-casual',
  'past-affirmative-polite',
  'negative-casual',
  'negative-polite',
  'negative-past-casual',
  'negative-past-polite',
  'progressive-casual',
  'progressive-polite',
  'progressive-past-casual',
  'progressive-past-polite',
  'negative-progressive-casual',
  'negative-progressive-polite',
  'negative-progressive-past-casual',
  'negative-progressive-past-polite',
  'te-form',
  'tai-casual',
  'tai-polite',
  'sou-casual',
  'sou-polite',
  'volitional-casual',
  'volitional-polite'
];

export const ADJECTIVE_CONJUGATION_TYPES: ConjugationType[] = [
  'non-past-affirmative-casual',
  'non-past-affirmative-polite',
  'negative-casual',
  'negative-polite',
  'past-affirmative-casual',
  'past-affirmative-polite',
  'negative-past-casual',
  'negative-past-polite',
  'te-form',
  'sou-casual',
  'sou-polite'
];

export const ALL_CONJUGATION_TYPES: ConjugationType[] = Array.from(new Set([...VERB_CONJUGATION_TYPES, ...ADJECTIVE_CONJUGATION_TYPES]));

// Grammar cards
export interface GrammarCard {
  id: string;
  description: string;
  instructions?: string;
  variants?: string[];
  createdAt: number;
  updatedAt?: number;
}

// Review queue item
export type ReviewItemType = 'conjugation' | 'grammar';

export interface ReviewItem {
  id: string;
  type?: ReviewItemType;
  vocab?: VocabItem;
  conjugationType?: ConjugationType;
  grammarCard?: GrammarCard;
  variant?: string;
  isRescheduled: boolean;
  rescheduleIteration: number;
  originalAttempts: number;
  scheduledAt?: number;
}

export interface GradingResult {
  isCorrect: boolean;
  correctAnswer: string;
  userAnswer?: string;
  reading?: string;
  explanation?: string;
  freeText?: string;
  rawOutput?: string;
  reviewItem: ReviewItem; // Immutable snapshot of what was graded
  itemIndex: number; // Index in the queue when this was graded
  itemId: string; // Unique ID of the card when it was graded
}

// Session state
export interface SessionState {
  queue: ReviewItem[];
  currentIndex: number;
  reviewedCorrectly: ReviewItem[];
  attemptHistory: Record<string, AttemptRecord>;
  repetitionCounts: Record<string, number>;
  consecutiveCorrect: Record<string, number>;
  totalUniqueItems: number;
  stats: {
    totalReviewed: number;
    currentStreak: number;
  };
  lastSmartReschedule?: {
    count: number;
    endingKana: string;
    conjugationType?: ConjugationType;
  };
}

export interface AttemptRecord {
  attempts: number;
  lastWasCorrect: boolean;
  completed: boolean;
}

// Config state
export interface ConfigState {
  model: string;
  apiKey: string;
  autoAdvance: boolean;
  apiBaseUrl: string;
  ttsServiceUrl: string;
  reviewMode: ReviewMode;
  blacklist: string;
  alwaysAddVerbs: string;
  alwaysAddAdjectives: string;
}

// Storage keys
export const STORAGE_KEYS = {
  SESSION: 'jpdb-conjugation-trainer-session',
  CONFIG: 'jpdb-conjugation-trainer-config',
  CONJUGATION_TYPES: 'jpdb-conjugation-trainer-conjugation-types',
  AUTO_ADVANCE: 'jpdb-conjugation-trainer-auto-advance',
  ALWAYS_ADD_CARDS: 'jpdb-conjugation-trainer-always-add-cards',
  ALWAYS_ADD_ADJECTIVES: 'jpdb-conjugation-trainer-always-add-adjectives',
  REVIEW_MODE: 'jpdb-conjugation-trainer-review-mode',
  BLACKLIST: 'jpdb-conjugation-trainer-blacklist',
  GRAMMAR_CARDS: 'jpdb-conjugation-trainer-grammar-cards',
  GRAMMAR_CARDS_IN_ROTATION: 'jpdb-conjugation-trainer-grammar-cards-in-rotation',
  LAST_EXPORT_TIME: 'jpdb-conjugation-trainer-last-export-time'
};
