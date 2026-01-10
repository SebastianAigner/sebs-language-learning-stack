import { useCallback } from 'react';
import { useSession } from '../contexts/SessionContext';
import { useConfig } from '../contexts/ConfigContext';
import { useNotification } from '../contexts/NotificationContext';
import { gradeAnswerStreaming, gradeGrammarAnswerStreaming } from '../grader';
import { getCachedResult, setCachedResult } from '../llmCache';
import { useNavigate } from '@tanstack/react-router';

import { useUI } from '../contexts/UIContext';

export function useGrading() {
  const { currentItem, session } = useSession();
  const navigate = useNavigate();
  const { config } = useConfig();
  const { showNotification } = useNotification();
  const { setRawOutput } = useUI();

  const handleGrade = useCallback(async (userAnswer: string) => {
    if (!userAnswer || !currentItem) return;

    // Update UI state to show grading view
    void navigate({ to: '/grading' });

    // Check cache first
    const cacheKey = currentItem.type === 'grammar' 
      ? currentItem.grammarCard!.description 
      : currentItem.vocab!.word;
    const cacheType = currentItem.type === 'grammar'
      ? 'grammar'
      : currentItem.conjugationType!;

    const cachedResult = getCachedResult(
      cacheKey,
      cacheType,
      userAnswer
    );

    if (cachedResult) {
      setRawOutput(cachedResult.rawOutput || '');
      void navigate({
        to: '/result',
        replace: true,
        state: {
          result: {
            ...cachedResult,
            userAnswer,
            reviewItem: currentItem, // Immutable snapshot
            itemIndex: session.currentIndex,
            itemId: currentItem.id
          }
        }
      });
      return;
    }

    // No cache - make LLM request
    try {
      const result = currentItem.type === 'grammar'
        ? await gradeGrammarAnswerStreaming(
            currentItem.grammarCard!.description,
            userAnswer,
            config.apiKey,
            config.model,
            {
              onReasoningStart: () => {},
              onReasoningToken: () => {},
              onReasoningEnd: () => {},
              onContentToken: () => {},
              onThinking: () => {}
            }
          )
        : await gradeAnswerStreaming(
            currentItem.vocab!.word,
            currentItem.conjugationType!,
            userAnswer,
            currentItem.vocab!.type,
            config.apiKey,
            config.model,
            {
              onReasoningStart: () => {},
              onReasoningToken: () => {},
              onReasoningEnd: () => {},
              onContentToken: () => {},
              onThinking: () => {}
            }
          );

      // Cache the result
      setCachedResult(
        cacheKey,
        cacheType,
        userAnswer,
        result
      );

      setRawOutput(result.rawOutput || '');

      void navigate({
        to: '/result',
        replace: true,
        state: {
          result: {
            ...result,
            userAnswer,
            reviewItem: currentItem, // Immutable snapshot
            itemIndex: session.currentIndex,
            itemId: currentItem.id
          }
        }
      });
    } catch (error) {
      console.error('Grading error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showNotification('error', `Failed to grade answer: ${errorMessage}`);
      void navigate({ to: '/practice', replace: true });
    }
  }, [currentItem, navigate, config.apiKey, config.model, showNotification, setRawOutput, session.currentIndex]);

  return { handleGrade };
}
