import { useEffect, useRef } from 'react';

interface UseAutoAdvanceOptions {
  enabled: boolean;
  isCorrect: boolean;
  isActive: boolean;
  delayMs: number;
  onAdvance: () => void;
}

/**
 * Hook to handle auto-advancing to next question after a delay
 * when the answer is correct and auto-advance is enabled.
 */
export function useAutoAdvance({
  enabled,
  isCorrect,
  isActive,
  delayMs,
  onAdvance
}: UseAutoAdvanceOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only auto-advance when active, correct and enabled
    if (isActive && isCorrect && enabled) {
      timerRef.current = setTimeout(() => {
        onAdvance();
      }, delayMs);
    }

    // Cleanup timer on unmount or dependency change
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, isCorrect, isActive, delayMs, onAdvance]);

  // Cancel the timer (useful for manual advance)
  const cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return { cancel };
}
