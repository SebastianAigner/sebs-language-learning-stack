import { useEffect, useRef, useState } from 'react';
import type { ReviewItem } from '../types';
import { getConjugationInstruction } from '../conjugationInstructions';
import { TutorialBox } from './TutorialBox';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Input } from './ui/Input';
import { ConjugationBadge } from './ui/ConjugationBadge';
import { StreakDisplay } from './ui/StreakDisplay';
import { PolitenessImage } from './ui/PolitenessImage';
import { useSession } from '../contexts/SessionContext';

interface PromptViewProps {
  currentItem: ReviewItem;
  currentIndex: number;
  tutorialMode: boolean;
  onGrade: (answer: string) => Promise<void>;
  currentStreak: number;
}

export function PromptView({
  currentItem,
  currentIndex,
  tutorialMode,
  onGrade,
  currentStreak
}: PromptViewProps) {
  const { postponeCurrentItem, removeCurrentItem } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);

  const [showInstructions, setShowInstructions] = useState(false);
  const [prevIndex, setPrevIndex] = useState(currentIndex);

  if (currentIndex !== prevIndex) {
    setPrevIndex(currentIndex);
    setShowInstructions(false);
  }

  useEffect(() => {
    inputRef.current?.focus();
    window.scrollTo(0, 0);
  }, [currentIndex]);

  const handleSubmit = async () => {
    const userAnswer = inputRef.current?.value.trim();
    if (!userAnswer) return;
    await onGrade(userAnswer);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      void handleSubmit();
    }
  };

  const isGrammar = currentItem.type === 'grammar';
  const isCasual = currentItem.conjugationType?.endsWith('-casual');
  const isPolite = currentItem.conjugationType?.endsWith('-polite');

  return (
    <div className="view">
      <div className="prompt-actions">
        <button
          className="prompt-action-button"
          onClick={() => postponeCurrentItem()}
          title="Postpone to end of queue"
        >
          🕒
        </button>
        <button
          className="prompt-action-button remove"
          onClick={() => removeCurrentItem()}
          title="Remove from this session"
        >
          🗑️
        </button>
      </div>
      {isGrammar ? (
        <div className="grammar-display">
          <div className="grammar-description">
            {currentItem.grammarCard?.description}
            {currentItem.variant && ` ${currentItem.variant}`}
          </div>
        </div>
      ) : (
        <div className="verb-display">
          <PolitenessImage
            conjugationType={currentItem.conjugationType}
            isCasual={!!isCasual}
            isPolite={!!isPolite}
          />
          <div className="dictionary-form">{currentItem.vocab?.word}</div>
          <ConjugationBadge
            conjugationType={currentItem.conjugationType!}
            showEmoji={!isCasual && !isPolite}
            title={!tutorialMode ? getConjugationInstruction(currentItem.conjugationType!, currentItem.vocab!.type) : undefined}
          />
        </div>
      )}
      <Input
        ref={inputRef}
        type="text"
        id="answer-input"
        label={isGrammar ? "Type Your Answer" : "Type Your Conjugation"}
        placeholder={isGrammar ? "Type your answer..." : "Type your conjugation..."}
        autoComplete="off"
        onKeyDown={handleKeyDown}
      />
      {tutorialMode && !isGrammar ? (
        <TutorialBox
          conjugationType={currentItem.conjugationType!}
          wordType={currentItem.vocab!.type}
        />
      ) : (
        <>
          {(isGrammar ? !!currentItem.grammarCard?.instructions : true) && (
            <div
              style={{
                marginTop: '20px',
                textAlign: 'center',
                cursor: 'pointer',
                userSelect: 'none'
              }}
              onClick={() => setShowInstructions(!showInstructions)}
              title="Click to show/hide instructions"
            >
              <img
                src="/img/beginner.svg"
                alt="Show instructions"
                style={{
                  width: '48px',
                  height: '48px',
                  display: 'inline-block'
                }}
              />
            </div>
          )}
          {showInstructions && (
            isGrammar ? (
              <div className="tutorial-banner">
                <img src="/img/beginner.svg" alt="Beginner" className="tutorial-image" />
                <div className="tutorial-content">
                  <MarkdownRenderer content={currentItem.grammarCard?.instructions || ''} />
                </div>
              </div>
            ) : (
              <TutorialBox
                conjugationType={currentItem.conjugationType!}
                wordType={currentItem.vocab!.type}
              />
            )
          )}
        </>
      )}
      <StreakDisplay streak={currentStreak} />
    </div>
  );
}
