import { useCallback, useRef } from 'react';
import { useSession } from '../contexts/SessionContext';
import { useNotification } from '../contexts/NotificationContext';
import { useConfig } from '../contexts/ConfigContext';

import { useNavigate } from '@tanstack/react-router';
import type { GradingResult } from '../types';

/**
 * Hook that provides actions for the result view:
 * - Advancing to next question
 * - Skipping typing practice
 * - Overriding incorrect answer as correct
 * - Marking a correct answer as a mistake
 * - Completing typing practice
 */
export function useResultActions(options: { 
  wasOverriddenAsCorrect?: boolean, 
  onOverrideAsCorrect?: () => void,
  gradingResult?: GradingResult
} = {}) {
  const { wasOverriddenAsCorrect, onOverrideAsCorrect, gradingResult } = options;
  const { currentItem, applyGoodGrade, applyBadGrade, isComplete, removeWordFromQueue } = useSession();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { config, updateBlacklist } = useConfig();

  // Guard to prevent multiple actions (like double-clicks) on the same item instance
  const actionTakenRef = useRef(false);

  // Use a stable identifier for the current item being processed in this hook instance
  const isCurrentItem = gradingResult && currentItem?.id === gradingResult.itemId;

  const advanceToNext = useCallback(() => {
    if (!gradingResult || actionTakenRef.current) return;

    if (isCurrentItem) {
      actionTakenRef.current = true;
      if (gradingResult.isCorrect || wasOverriddenAsCorrect) {
        applyGoodGrade();
      } else {
        applyBadGrade();
      }
    }

    // Navigate based on whether we're complete
    // We use setTimeout to allow the session state to update before checking completion
    setTimeout(() => {
      // Re-checking completion status after state update
      if (isComplete) {
        void navigate({ to: '/completion', replace: true });
      } else {
        void navigate({ to: '/practice' });
      }
    }, 0);
  }, [gradingResult, wasOverriddenAsCorrect, applyGoodGrade, applyBadGrade, isComplete, navigate, isCurrentItem]);

  const markAsMistake = useCallback(() => {
    if (!isCurrentItem || actionTakenRef.current) return;
    
    actionTakenRef.current = true;
    applyBadGrade();
    
    setTimeout(() => {
      if (isComplete) {
        void navigate({ to: '/completion', replace: true });
      } else {
        void navigate({ to: '/practice' });
      }
    }, 0);
  }, [applyBadGrade, isComplete, navigate, isCurrentItem]);

  const skipTyping = useCallback(() => {
    if (!isCurrentItem || actionTakenRef.current) return;
    
    actionTakenRef.current = true;
    applyBadGrade();
    
    setTimeout(() => {
      if (isComplete) {
        void navigate({ to: '/completion', replace: true });
      } else {
        void navigate({ to: '/practice' });
      }
    }, 0);
  }, [applyBadGrade, isComplete, navigate, isCurrentItem]);

  const overrideAsCorrect = useCallback(() => {
    if (onOverrideAsCorrect) {
      onOverrideAsCorrect();
    }
    // If auto-advance enabled, we don't advance immediately here, 
    // it's handled by the auto-advance hook in ResultView
  }, [onOverrideAsCorrect]);

  const completeTypingPractice = useCallback((
    typingInput: string,
    correctAnswer: string,
    wasOriginallyCorrect: boolean
  ) => {
    if (typingInput.trim() === correctAnswer) {
      if (isCurrentItem && !actionTakenRef.current) {
        actionTakenRef.current = true;
        if (!wasOriginallyCorrect) {
          applyBadGrade();
        } else {
          applyGoodGrade();
        }
      }

      setTimeout(() => {
        if (isComplete) {
          void navigate({ to: '/completion', replace: true });
        } else {
          void navigate({ to: '/practice' });
        }
      }, 0);
      return true;
    }
    return false;
  }, [applyBadGrade, applyGoodGrade, isComplete, navigate, isCurrentItem]);

  const addToBlacklist = useCallback((word: string, conjugationType?: string) => {
    // Parse into set to check for duplicates
    const blacklistSet = new Set(
      config.blacklist
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
    );

    const entry = conjugationType !== undefined && conjugationType !== '' ? `${word}#${conjugationType}` : word;

    // Add the entry if not already present
    if (!blacklistSet.has(entry)) {
      blacklistSet.add(entry);

      // Convert back to newline-separated string
      const updatedBlacklist = Array.from(blacklistSet).sort().join('\n');

      // Update via context (this will also persist it)
      updateBlacklist(updatedBlacklist);

      // Remove from current queue
      removeWordFromQueue(word, conjugationType);

      // Notify user
      showNotification('success', `Added "${entry}" to blacklist. You can edit the blacklist in Settings.`);
    } else {
      showNotification('info', `"${entry}" is already in the blacklist.`);
    }
  }, [config.blacklist, updateBlacklist, removeWordFromQueue, showNotification]);

  return {
    advanceToNext,
    markAsMistake,
    skipTyping,
    overrideAsCorrect,
    completeTypingPractice,
    addToBlacklist
  };
}
