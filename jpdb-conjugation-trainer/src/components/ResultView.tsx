import { useEffect, useRef, useState } from 'react';
import type { GradingResult, ConfigState } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useAudio } from '../lib/audio-unlock';
import { useTTS } from '../hooks/useTTS';
import { useAutoAdvance } from '../hooks/useAutoAdvance';
import { useTypingPractice } from '../hooks/useTypingPractice';
import { TutorialBox } from './TutorialBox';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';
import { ConjugationBadge } from './ui/ConjugationBadge';
import { TypingPractice } from './ui/TypingPractice';

import { PolitenessImage } from './ui/PolitenessImage';

// Timing constants
const AUTO_ADVANCE_DELAY_MS = 4000;

interface ResultViewProps {
  gradingResult: GradingResult;
  config: Pick<ConfigState, 'ttsServiceUrl' | 'autoAdvance'>;
  actions: {
    advanceToNext: () => void;
    markAsMistake: () => void;
    skipTyping: () => void;
    overrideAsCorrect: () => void;
    completeTypingPractice: (input: string, answer: string, originallyCorrect: boolean) => boolean;
    addToBlacklist: (word: string, conjugationType?: string) => void;
  };
  onOverrideAsCorrect: () => void;
  wasOverriddenAsCorrect: boolean;
  isCurrentItem: boolean;
}

export function ResultView({
  gradingResult,
  config,
  actions,
  onOverrideAsCorrect,
  wasOverriddenAsCorrect,
  isCurrentItem
}: ResultViewProps) {
  const { playSound } = useAudio();
  const playedForResultRef = useRef<object | null>(null);

  // Track result-specific state and reset when gradingResult changes
  const [resState, setResState] = useState(() => ({
    lastResult: gradingResult,
    showTypingPractice: !gradingResult.isCorrect
  }));

  // Sync state if gradingResult changed
  if (resState.lastResult !== gradingResult) {
    setResState({
      lastResult: gradingResult,
      showTypingPractice: !gradingResult.isCorrect
    });
  }

  const { showTypingPractice } = resState;

  const setShowTypingPractice = (val: boolean) =>
    setResState(prev => ({ ...prev, showTypingPractice: val }));

  // Extract hooks for separated concerns
  const {
    ttsError,
    isRegenerating,
    playTTS,
    regenerateTTS,
    replayTTS
  } = useTTS({ ttsServiceUrl: config.ttsServiceUrl });

  const {
    advanceToNext,
    markAsMistake,
    skipTyping,
    overrideAsCorrect,
    completeTypingPractice,
    addToBlacklist
  } = actions;

  const {
    input: typingInput,
    hint: typingHint,
    setInput: setTypingInput
  } = useTypingPractice({
    correctAnswer: gradingResult.correctAnswer,
    itemId: gradingResult.itemId
  });

  useAutoAdvance({
    enabled: config.autoAdvance && isCurrentItem,
    isCorrect: gradingResult.isCorrect || wasOverriddenAsCorrect,
    isActive: true,
    delayMs: AUTO_ADVANCE_DELAY_MS,
    onAdvance: advanceToNext
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [gradingResult]);

  // Handle Enter key to advance when correct (and auto-advance is disabled)
  useEffect(() => {
    const shouldHandleEnter = (!showTypingPractice || gradingResult.isCorrect || wasOverriddenAsCorrect) && !config.autoAdvance;

    if (!shouldHandleEnter) {
      return;
    }

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        advanceToNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showTypingPractice, gradingResult.isCorrect, wasOverriddenAsCorrect, config.autoAdvance, advanceToNext]);

  // Handle audio when result is determined
  useEffect(() => {
    // Prevent double-playing audio for the same result
    // Track by gradingResult object identity, not by index
    if (playedForResultRef.current === gradingResult) {
      return;
    }
    playedForResultRef.current = gradingResult;

    const textToSpeak = gradingResult.reading ?? gradingResult.correctAnswer;

    // Play sound effect immediately
    if (gradingResult.isCorrect) {
      playSound('/audio/correct.mp3', { volume: 0.5, debounceMs: 100 });
    } else {
      playSound('/audio/wrong.mp3', { volume: 0.5, debounceMs: 100 });
    }

    // Play TTS audio for the correct answer
    if (textToSpeak !== '') {
      playTTS(textToSpeak).catch(error => {
        console.warn('TTS playback failed:', error);
      });
    }
  }, [
    gradingResult,
    playSound,
    playTTS
  ]);

  const handleTypingComplete = () => {
    const success = completeTypingPractice(
      typingInput,
      gradingResult.correctAnswer,
      gradingResult.isCorrect
    );
    if (!success) {
      // Input didn't match, keep showing typing practice
      setTypingInput(typingInput);
    }
  };

  const handleReplayTTS = () => {
    const textToSpeak = gradingResult.reading ?? gradingResult.correctAnswer;

    if (textToSpeak !== '') {
      void replayTTS(textToSpeak);
    }
  };

  const handleRegenerateTTS = () => {
    const textToSpeak = gradingResult.reading ?? gradingResult.correctAnswer;

    if (textToSpeak !== '') {
      void regenerateTTS(textToSpeak);
    }
  };

  const handleSkipTyping = () => {
    skipTyping();
    setShowTypingPractice(false);
  };

  const handleOverrideAsCorrect = () => {
    overrideAsCorrect();
    setShowTypingPractice(false);
    onOverrideAsCorrect();
  };

  const handleAddToBlacklistWord = () => {
    if (gradingResult.reviewItem.type === 'grammar') return;
    const { word } = gradingResult.reviewItem.vocab!;
    addToBlacklist(word);

    // Advance to next after blacklisting
    setTimeout(() => {
      advanceToNext();
    }, 0);
  };

  const handleAddToBlacklistCombination = () => {
    if (gradingResult.reviewItem.type === 'grammar') return;
    const { word } = gradingResult.reviewItem.vocab!;
    const { conjugationType } = gradingResult.reviewItem;
    addToBlacklist(word, conjugationType);

    // Advance to next after blacklisting
    setTimeout(() => {
      advanceToNext();
    }, 0);
  };

  const isGrammar = gradingResult.reviewItem.type === 'grammar';

  return (
    <div className="view">
      {ttsError !== null ? <Alert variant="error">
          {ttsError.message}
        </Alert> : null}

      {gradingResult.freeText !== undefined && gradingResult.freeText !== '' ? <div className="feedback-section">
          <MarkdownRenderer content={gradingResult.freeText} />
        </div> : null}

      <div id="correct-answer-display">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {isGrammar ? (
            <div style={{ textAlign: 'center' }}>
              <div className="correct-answer-label" style={{ color: '#a0aec0' }}>Task:</div>
              <div className="grammar-description" style={{ color: '#a0aec0', fontSize: '20px' }}>
                {gradingResult.reviewItem.grammarCard?.description}
                {gradingResult.reviewItem.variant !== undefined && gradingResult.reviewItem.variant !== '' ? ` ${gradingResult.reviewItem.variant}` : null}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <PolitenessImage
                  conjugationType={gradingResult.reviewItem.conjugationType}
                  isCasual={!!gradingResult.reviewItem.conjugationType?.endsWith('-casual')}
                  isPolite={!!gradingResult.reviewItem.conjugationType?.endsWith('-polite')}
                />
              </div>
              <div className="correct-answer-label" style={{ color: '#a0aec0' }}>Original word:</div>
              <div className="correct-answer-text" style={{ color: '#a0aec0' }}>
                {gradingResult.reviewItem.vocab?.word}
              </div>
              {gradingResult.reviewItem.vocab && Object.values(gradingResult.reviewItem.vocab.meanings).flat().length > 0 ? <div style={{
                  fontSize: '14px',
                  color: '#a0aec0',
                  marginTop: '4px',
                  maxWidth: '400px',
                  margin: '4px auto 0'
                }}>
                  {Object.values(gradingResult.reviewItem.vocab.meanings).flat().join(', ')}
                </div> : null}
            </div>
          )}

          {gradingResult.userAnswer !== undefined && gradingResult.userAnswer !== '' ? <div style={{ textAlign: 'center' }}>
              <div className="correct-answer-label" style={{ color: '#718096' }}>Your answer:</div>
              <div style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: gradingResult.isCorrect ? '#48bb78' : '#e53e3e'
              }}>
                {gradingResult.userAnswer}
              </div>
            </div> : null}

          {/* Middle: Divider with pill-shaped transformation label */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '2px',
              background: '#e2e8f0'
            }} />
            {!isGrammar ? (
              <ConjugationBadge
                variant="pill"
                showEmoji={!gradingResult.reviewItem.conjugationType?.endsWith('-casual') && !gradingResult.reviewItem.conjugationType?.endsWith('-polite')}
                conjugationType={gradingResult.reviewItem.conjugationType!}
                style={{ position: 'relative' }}
              />
            ) : (
              <div style={{
                position: 'relative',
                background: 'white',
                padding: '0 10px',
                color: '#cbd5e0',
                fontSize: '12px',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}>
                Result
              </div>
            )}
          </div>

          {/* Bottom: Correct conjugation */}
          <div style={{ position: 'relative' }} className="answer-with-audio-controls">
            <div style={{ textAlign: 'center' }}>
              <div className="correct-answer-label">Correct answer:</div>
              <div>
                <div className="correct-answer-text">{gradingResult.correctAnswer}</div>
                {gradingResult.reading !== undefined && gradingResult.reading !== '' ? <div style={{
                    fontSize: '14px',
                    color: '#718096',
                    marginTop: '4px'
                  }}>
                    {gradingResult.reading}
                  </div> : null}
              </div>
            </div>
            <div className="audio-controls" style={{
              position: 'absolute',
              right: '0',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              gap: '10px'
            }}>
              <Button
                variant="icon"
                onClick={handleReplayTTS}
                title="Play pronunciation"
                onMouseEnter={(e) => e.currentTarget.style.background = '#e8f5e9'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                🔊
              </Button>
              <Button
                variant="icon"
                onClick={handleRegenerateTTS}
                disabled={isRegenerating}
                title="Regenerate audio"
                style={{
                  border: '2px solid #667eea',
                  cursor: isRegenerating ? 'not-allowed' : 'pointer',
                  opacity: isRegenerating ? 0.5 : 1
                }}
                onMouseEnter={(e) => !isRegenerating && (e.currentTarget.style.background = '#eef2ff')}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                {isRegenerating ? '⏳' : '🔄'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {gradingResult.explanation !== undefined && gradingResult.explanation !== '' ? <div id="explanation-display">
          <div className="explanation-content">
            <MarkdownRenderer content={gradingResult.explanation} />
          </div>
        </div> : null}

      {showTypingPractice && !gradingResult.isCorrect ? <TypingPractice
          value={typingInput}
          onChange={setTypingInput}
          onComplete={handleTypingComplete}
          hint={typingHint}
        /> : null}

      <div style={{ marginTop: '20px', width: '100%' }}>
        {isGrammar ? (
          gradingResult.reviewItem.grammarCard?.instructions !== undefined && gradingResult.reviewItem.grammarCard.instructions !== '' && (
            <div className="tutorial-banner" style={{ margin: '0', width: '100%', boxSizing: 'border-box' }}>
              <img src="/img/beginner.svg" alt="Beginner" className="tutorial-image" />
              <div className="tutorial-content">
                <MarkdownRenderer content={gradingResult.reviewItem.grammarCard.instructions} />
              </div>
            </div>
          )
        ) : (
          <TutorialBox
            conjugationType={gradingResult.reviewItem.conjugationType!}
            wordType={gradingResult.reviewItem.vocab!.type}
            style={{ margin: '0', width: '100%', boxSizing: 'border-box' }}
          />
        )}
      </div>

      <div id="result-actions">
        {showTypingPractice && !gradingResult.isCorrect && !wasOverriddenAsCorrect ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '20px' }}>
            {isCurrentItem ? <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <Button variant="secondary" onClick={handleSkipTyping}>Skip Typing</Button>
                <Button variant="secondary" onClick={handleOverrideAsCorrect}>Actually, I Got It Right</Button>
              </div> : null}
            {!isCurrentItem && (
              <Button variant="primary" onClick={advanceToNext} style={{ marginBottom: '10px' }}>
                Back to Practice
              </Button>
            )}
          </div> : null}
        {(!showTypingPractice || gradingResult.isCorrect || wasOverriddenAsCorrect) && !config.autoAdvance ? <div style={{ display: 'flex', gap: '10px', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button variant="primary" onClick={advanceToNext}>
                {isCurrentItem ? 'Next' : 'Back to Practice'}
              </Button>
              {(isCurrentItem && gradingResult.isCorrect && !wasOverriddenAsCorrect) ? <Button variant="secondary" onClick={markAsMistake}>I made a mistake</Button> : null}
            </div>
          </div> : null}

        {isCurrentItem && !isGrammar ? <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="secondary"
              onClick={handleAddToBlacklistCombination}
              style={{ fontSize: '13px', padding: '6px 12px' }}
            >
              Never show this combination again
            </Button>
            <Button
              variant="secondary"
              onClick={handleAddToBlacklistWord}
              style={{ fontSize: '13px', padding: '6px 12px' }}
            >
              Never show word &quot;{gradingResult.reviewItem.vocab?.word}&quot; again
            </Button>
          </div> : null}
      </div>
    </div>
  );
}
