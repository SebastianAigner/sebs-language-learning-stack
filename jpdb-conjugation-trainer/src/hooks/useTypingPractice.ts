import { useState } from 'react';

interface UseTypingPracticeOptions {
  correctAnswer: string;
  itemId: string;
}

interface UseTypingPracticeResult {
  input: string;
  hint: string;
  setInput: (value: string) => void;
  isCorrect: boolean;
  clear: () => void;
}

/**
 * Hook to manage typing practice input and validation.
 * Allows user to type the correct answer to continue.
 *
 * Uses useState with lazy initialization to track the last seen item ID
 * and automatically reset input when it changes.
 */
export function useTypingPractice({
  correctAnswer,
  itemId
}: UseTypingPracticeOptions): UseTypingPracticeResult {
  // Track both input state and the item ID it belongs to
  const [state, setState] = useState(() => ({
    input: '',
    hint: '',
    lastId: itemId
  }));

  // If itemId changed, reset the input
  if (state.lastId !== itemId) {
    setState({
      input: '',
      hint: '',
      lastId: itemId
    });
  }

  const handleSetInput = (value: string) => {
    setState({
      input: value,
      hint: '',
      lastId: itemId
    });
  };

  const isCorrect = state.input.trim() === correctAnswer;

  const clear = () => {
    setState({
      input: '',
      hint: '',
      lastId: itemId
    });
  };

  return {
    input: state.input,
    hint: state.hint,
    setInput: handleSetInput,
    isCorrect,
    clear
  };
}
