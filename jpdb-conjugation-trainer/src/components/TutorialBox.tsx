import React from 'react';
import type { ConjugationType, WordType } from '../types';
import { getConjugationInstruction } from '../conjugationInstructions';
import { MarkdownRenderer } from './MarkdownRenderer';

interface TutorialBoxProps {
  conjugationType: ConjugationType;
  wordType: WordType;
  style?: React.CSSProperties;
}

export function TutorialBox({ conjugationType, wordType, style }: TutorialBoxProps) {
  const instructions = getConjugationInstruction(conjugationType, wordType);
  
  if (instructions === '') {
    return null;
  }

  return (
    <div className="tutorial-banner" style={style}>
      <img src="/img/beginner.svg" alt="Beginner" className="tutorial-image" />
      <div className="tutorial-content">
        <MarkdownRenderer content={instructions} />
      </div>
    </div>
  );
}
