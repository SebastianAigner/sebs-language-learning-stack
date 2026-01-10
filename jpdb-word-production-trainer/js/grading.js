// Grading coordination - handles persistence side effects

import { state, saveState } from './state.js';
import { saveMistakes } from './mistakes.js';
import {
  handleGoodGrade as handleGoodGradeCore,
  handleNotGoodGrade as handleNotGoodGradeCore
} from './scheduler.js';

// Handle "Good" grade with persistence
export function handleGoodGrade() {
  handleGoodGradeCore();
  saveState();
  saveMistakes(state.session.queue, state.session.reviewedCorrectly, state.session.repetitionCounts);
}

// Handle "Not Good" grade with persistence
export function handleNotGoodGrade() {
  handleNotGoodGradeCore();
  saveState();
  saveMistakes(state.session.queue, state.session.reviewedCorrectly, state.session.repetitionCounts);
}
