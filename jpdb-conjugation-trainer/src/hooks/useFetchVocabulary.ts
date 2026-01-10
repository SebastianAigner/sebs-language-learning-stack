import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useSession } from '../contexts/SessionContext';
import { useConfig } from '../contexts/ConfigContext';
import { useNotification } from '../contexts/NotificationContext';
import { fetchAndFilterVerbs, filterVocabularyByMode } from '../api';
import { parseBlacklistToSet } from '../persistence';
import { STORAGE_KEYS } from '../types';
import type { VocabItem, ReviewMode, ConjugationType, GrammarCard, ReviewItem } from '../types';
import { initializeQueue, shuffleArray } from '../scheduler';
import { parseManualVocabulary } from '../manualVocabulary';

export function useFetchVocabulary() {
  const { startNewSession, addToSession, session, isComplete } = useSession();
  const navigate = useNavigate();
  const { config } = useConfig();
  const { showNotification } = useNotification();

  const fetchVocabulary = useCallback(async (options?: { mode?: ReviewMode, enabledTypes?: ConjugationType[], maxPerType?: number }) => {
    const mode = options?.mode ?? config.reviewMode;
    const maxPerType = options?.maxPerType;
    
    try {
      let items = await fetchAndFilterVerbs(config.apiBaseUrl);

      // Apply blacklist filtering
      const blacklist = parseBlacklistToSet(config.blacklist);
      items = items.filter(item => !blacklist.has(item.word));

      // Filter based on review mode
      items = filterVocabularyByMode(items, mode);

      if (items.length === 0) {
        showNotification('warning', `No relevant ${mode === 'both' ? 'verbs or adjectives' : mode} found in today's vocabulary.`);
        void navigate({ to: '/completion', replace: true });
        return;
      }

      // Get enabled conjugation types
      let enabledTypes = options?.enabledTypes;
      if (!enabledTypes) {
        const saved = localStorage.getItem(STORAGE_KEYS.CONJUGATION_TYPES);
        if (saved) {
          try {
            enabledTypes = JSON.parse(saved);
          } catch (error) {
            console.error('Failed to load conjugation types:', error);
          }
        }
      }

      let queue = initializeQueue(items, enabledTypes, blacklist, maxPerType);

      // Append always-add cards to the end of the queue
      if (mode === 'both' || mode === 'verbs') {
        const alwaysAddVerbsText = config.alwaysAddVerbs;
        if (alwaysAddVerbsText.trim()) {
          const parseResult = parseManualVocabulary(alwaysAddVerbsText, 'verb');
          if (parseResult.success && parseResult.items.length > 0) {
            const alwaysAddItems = initializeQueue(parseResult.items, enabledTypes, blacklist, maxPerType);
            queue = [...queue, ...alwaysAddItems];
          }
        }
      }

      if (mode === 'both' || mode === 'adjectives') {
        const alwaysAddAdjectivesText = config.alwaysAddAdjectives;
        if (alwaysAddAdjectivesText.trim()) {
          const parseResult = parseManualVocabulary(alwaysAddAdjectivesText, 'adjective');
          if (parseResult.success && parseResult.items.length > 0) {
            const alwaysAddItems = initializeQueue(parseResult.items, enabledTypes, blacklist, maxPerType);
            queue = [...queue, ...alwaysAddItems];
          }
        }
      }

      // If we are in the wizard and have an active existing session, we append.
      // If the session is already complete, we start a fresh session.
      const isAddingToActive = session.queue.length > 0 && !isComplete;
      if (isAddingToActive) {
        addToSession(queue);
      } else {
        startNewSession(queue);
      }
      
      void navigate({ to: '/practice', replace: true });
    } catch (error) {
      console.error('Failed to fetch vocabulary:', error);
      showNotification('error', 'Failed to fetch vocabulary. Please check that the service is running on localhost:3000.');
      void navigate({ to: '/completion', replace: true });
    }
  }, [config.apiBaseUrl, config.reviewMode, config.blacklist, config.alwaysAddVerbs, config.alwaysAddAdjectives, startNewSession, addToSession, session.queue.length, isComplete, navigate, showNotification]);

  return { fetchVocabulary };
}

export function usePracticeEvergreens() {
  const { startNewSession, addToSession, session, isComplete } = useSession();
  const navigate = useNavigate();
  const { config } = useConfig();
  const { showNotification } = useNotification();

  const practiceEvergreens = useCallback(async (options?: { mode?: ReviewMode, enabledTypes?: ConjugationType[], maxPerType?: number }) => {
    const mode = options?.mode ?? config.reviewMode;
    const maxPerType = options?.maxPerType;

    try {
      let items: VocabItem[] = [];

      // Load verbs if applicable
      if (mode === 'both' || mode === 'verbs') {
        const response = await fetch('/top-conjugatables.txt');
        if (response.ok) {
          const text = await response.text();
          const parseResult = parseManualVocabulary(text, 'verb');
          if (parseResult.success) {
            items = [...items, ...parseResult.items];
          }
        }
      }

      // Load adjectives if applicable
      if (mode === 'both' || mode === 'adjectives') {
        const response = await fetch('/top-adjectives.txt');
        if (response.ok) {
          const text = await response.text();
          const parseResult = parseManualVocabulary(text, 'adjective');
          if (parseResult.success) {
            items = [...items, ...parseResult.items];
          }
        }
      }

      if (items.length === 0) {
        showNotification('warning', `No relevant ${mode === 'both' ? 'verbs or adjectives' : mode} found in evergreens files.`);
        void navigate({ to: '/completion', replace: true });
        return;
      }

      // Apply blacklist filtering
      const blacklist = parseBlacklistToSet(config.blacklist);
      items = items.filter(item => !blacklist.has(item.word));

      // Filter based on review mode (just in case, although we already targeted the files)
      items = filterVocabularyByMode(items, mode);

      if (items.length === 0) {
        showNotification('warning', `No relevant ${mode === 'both' ? 'verbs or adjectives' : mode} found in evergreens file.`);
        void navigate({ to: '/completion', replace: true });
        return;
      }

      // Get enabled conjugation types
      let enabledTypes = options?.enabledTypes;
      if (!enabledTypes) {
        const saved = localStorage.getItem(STORAGE_KEYS.CONJUGATION_TYPES);
        if (saved) {
          try {
            enabledTypes = JSON.parse(saved);
          } catch (error) {
            console.error('Failed to load conjugation types:', error);
          }
        }
      }

      let queue = initializeQueue(items, enabledTypes, blacklist, maxPerType);

      // Append always-add cards to the end of the queue
      if (mode === 'both' || mode === 'verbs') {
        const alwaysAddVerbsText = config.alwaysAddVerbs;
        if (alwaysAddVerbsText.trim()) {
          const alwaysAddResult = parseManualVocabulary(alwaysAddVerbsText, 'verb');
          if (alwaysAddResult.success && alwaysAddResult.items.length > 0) {
            const alwaysAddItems = initializeQueue(alwaysAddResult.items, enabledTypes, blacklist, maxPerType);
            queue = [...queue, ...alwaysAddItems];
          }
        }
      }

      if (mode === 'both' || mode === 'adjectives') {
        const alwaysAddAdjectivesText = config.alwaysAddAdjectives;
        if (alwaysAddAdjectivesText.trim()) {
          const alwaysAddResult = parseManualVocabulary(alwaysAddAdjectivesText, 'adjective');
          if (alwaysAddResult.success && alwaysAddResult.items.length > 0) {
            const alwaysAddItems = initializeQueue(alwaysAddResult.items, enabledTypes, blacklist, maxPerType);
            queue = [...queue, ...alwaysAddItems];
          }
        }
      }

      const isAddingToActive = session.queue.length > 0 && !isComplete;
      if (isAddingToActive) {
        addToSession(queue);
      } else {
        startNewSession(queue);
      }
      
      void navigate({ to: '/practice', replace: true });
    } catch (error) {
      console.error('Failed to load evergreens:', error);
      showNotification('error', 'Failed to load evergreens vocabulary. Please ensure top-conjugatables.txt and top-adjectives.txt are available.');
      void navigate({ to: '/completion', replace: true });
    }
  }, [config.reviewMode, config.blacklist, config.alwaysAddVerbs, config.alwaysAddAdjectives, startNewSession, addToSession, session.queue.length, isComplete, navigate, showNotification]);

  return { practiceEvergreens };
}

export function usePracticeGrammar() {
  const { startNewSession, addToSession, session, isComplete } = useSession();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const practiceGrammar = useCallback(async (cards: GrammarCard[], variantMode: 'random' | 'all' = 'random', shuffle: boolean = false) => {
    try {
      if (cards.length === 0) {
        showNotification('warning', 'No grammar cards selected.');
        return;
      }

      const queue: ReviewItem[] = [];

      cards.forEach(card => {
        if (!card.variants || card.variants.length === 0) {
          queue.push({
            id: crypto.randomUUID(),
            type: 'grammar',
            grammarCard: card,
            isRescheduled: false,
            rescheduleIteration: 0,
            originalAttempts: 0
          });
        } else if (variantMode === 'all') {
          card.variants.forEach(variant => {
            queue.push({
              id: crypto.randomUUID(),
              type: 'grammar',
              grammarCard: card,
              variant: variant,
              isRescheduled: false,
              rescheduleIteration: 0,
              originalAttempts: 0
            });
          });
        } else {
          // random variant
          const randomVariant = card.variants[Math.floor(Math.random() * card.variants.length)];
          queue.push({
            id: crypto.randomUUID(),
            type: 'grammar',
            grammarCard: card,
            variant: randomVariant,
            isRescheduled: false,
            rescheduleIteration: 0,
            originalAttempts: 0
          });
        }
      });

      if (shuffle) {
        shuffleArray(queue);
      }

      const isAddingToActive = session.queue.length > 0 && !isComplete;
      if (isAddingToActive) {
        addToSession(queue);
      } else {
        startNewSession(queue);
      }
      
      void navigate({ to: '/practice', replace: true });
    } catch (error) {
      console.error('Failed to load grammar cards:', error);
      showNotification('error', 'Failed to load grammar cards.');
    }
  }, [startNewSession, addToSession, session.queue.length, isComplete, navigate, showNotification]);

  return { practiceGrammar };
}
