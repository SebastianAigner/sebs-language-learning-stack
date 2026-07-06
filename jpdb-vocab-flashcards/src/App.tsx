import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE_URL = 'http://localhost:3000';
const TTS_BASE_URL = 'http://localhost:5065';

interface VocabContent {
  url: string;
  word: string;
  reading: string | null;
  meanings: Record<string, string[]>;
}

interface VocabEntry {
  timestamp: string;
  content: string;
}

interface ApiResponse {
  date: string;
  count: number;
  total: number;
  entries: VocabEntry[];
}

interface CardData {
  id: string;
  word: string;
  reading: string;
  meanings: Record<string, string[]>;
  selected: boolean;
}

function parseEntries(entries: VocabEntry[]): CardData[] {
  const seen = new Set<string>();
  const cards: CardData[] = [];

  for (const entry of entries) {
    try {
      const content = JSON.parse(entry.content) as VocabContent;
      const key = `${content.word}|${content.reading ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);

      cards.push({
        id: key,
        word: content.word,
        reading: content.reading ?? '',
        meanings: content.meanings,
        selected: true,
      });
    } catch {
      // skip unparseable entries
    }
  }

  return cards;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getEnglishPreview(meanings: Record<string, string[]>): string {
  const [firstEntry] = Object.entries(meanings);
  if (!firstEntry) return '';
  const firstDef = firstEntry[1][0] || '';
  return firstDef.split(';')[0].trim();
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function App() {
  const [allCards, setAllCards] = useState<CardData[]>([]);
  const [queue, setQueue] = useState<CardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [englishTTSEnabled, setEnglishTTSEnabled] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const currentCardRef = useRef<HTMLDivElement>(null);

  const autoModeRef = useRef(false);
  const currentCardDataRef = useRef<CardData | null>(null);
  const advanceRef = useRef<() => void>(() => {});
  const englishTTSEnabledRef = useRef(false);
  const preloadedJpAudioRef = useRef<HTMLAudioElement | null>(null);
  const preloadedEnAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    currentCardDataRef.current = currentCard;
  });

  useEffect(() => {
    advanceRef.current = advance;
  });

  useEffect(() => {
    englishTTSEnabledRef.current = englishTTSEnabled;
  }, [englishTTSEnabled]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/today/unique`)
      .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json() as Promise<ApiResponse>;
      })
      .then(data => {
        const cards = parseEntries(data.entries);
        setAllCards(cards);
        setQueue(shuffleArray(cards.filter(c => c.selected)));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const selectableCards = allCards;
  const currentCard = queue[currentIndex] ?? null;

  useEffect(() => {
    if (!currentCard) return;
    const jpUrl = `${TTS_BASE_URL}/tts?text=${encodeURIComponent(currentCard.word)}`;
    const jpAudio = new Audio(jpUrl);
    jpAudio.volume = 0.7;
    preloadedJpAudioRef.current = jpAudio;

    let enAudio: HTMLAudioElement | null = null;
    if (englishTTSEnabledRef.current) {
      const enText = getEnglishPreview(currentCard.meanings);
      if (enText) {
        const enUrl = `${TTS_BASE_URL}/tts?text=${encodeURIComponent(enText)}&language=en`;
        enAudio = new Audio(enUrl);
        enAudio.volume = 0.7;
      }
    }
    preloadedEnAudioRef.current = enAudio;
  }, [currentCard]);

  const advance = useCallback(() => {
    const selected = allCards.filter(c => c.selected);
    if (selected.length === 0) return;

    setRevealed(false);

    if (currentIndex + 1 >= queue.length) {
      const remaining = queue.slice(currentIndex + 1);
      const unused = selected.filter(c => !queue.slice(0, currentIndex + 1).some(q => q.id === c.id));
      const nextQueue = [...remaining, ...shuffleArray(unused)];
      if (nextQueue.length === 0) {
        setQueue(shuffleArray(selected));
        setCurrentIndex(0);
      } else {
        setQueue(nextQueue);
        setCurrentIndex(0);
      }
    } else {
      setCurrentIndex(i => i + 1);
    }
  }, [allCards, queue, currentIndex]);

  const playRevealAudio = useCallback(async () => {
    const jpAudio = preloadedJpAudioRef.current;
    if (!jpAudio) return;

    await new Promise<void>(resolve => {
      jpAudio.addEventListener('ended', () => resolve());
      jpAudio.addEventListener('error', () => resolve());
      jpAudio.play().catch(() => resolve());
    });

    const enAudio = preloadedEnAudioRef.current;
    if (enAudio) {
      await new Promise<void>(resolve => {
        enAudio.addEventListener('ended', () => resolve());
        enAudio.addEventListener('error', () => resolve());
        enAudio.play().catch(() => resolve());
      });
    }
  }, []);

  const handleReveal = useCallback(() => {
    setRevealed(true);
    playRevealAudio();
  }, [playRevealAudio]);

  useEffect(() => {
    if (!autoMode) {
      autoModeRef.current = false;
      return;
    }

    autoModeRef.current = true;

    const run = async () => {
      while (autoModeRef.current) {
        const beforeCard = currentCardDataRef.current;
        if (!beforeCard) {
          await delay(500);
          continue;
        }

        await delay(1000);
        if (!autoModeRef.current) break;

        setRevealed(true);
        await delay(50);

        await playRevealAudio();
        if (!autoModeRef.current) break;

        advanceRef.current();
        await delay(300);
      }
    };

    run();

    return () => {
      autoModeRef.current = false;
    };
  }, [autoMode, playRevealAudio]);

  const toggleCard = useCallback((id: string) => {
    setAllCards(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
    setQueue(prev => prev.filter(c => c.id !== id));
    setCurrentIndex(0);
    setRevealed(false);
  }, []);

  const selectAllCards = useCallback(() => {
    setAllCards(prev => prev.map(c => ({ ...c, selected: true })));
    setQueue(prev => prev);
  }, []);

  const deselectAllCards = useCallback(() => {
    setAllCards(prev => prev.map(c => ({ ...c, selected: false })));
    setQueue([]);
    setCurrentIndex(0);
    setRevealed(false);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (autoModeRef.current) return;
      if (!revealed) {
        handleReveal();
      } else {
        advance();
      }
    }
  }, [revealed, handleReveal, advance]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (loading) {
    return (
      <div id="app">
        <div className="loading-container">
          <p>Loading vocabulary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div id="app">
        <div className="error-container">
          <p className="error-text">Error: {error}</p>
          <p>Make sure the review transcriber is running on port 3000.</p>
        </div>
      </div>
    );
  }

  const selectedCount = allCards.filter(c => c.selected).length;

  return (
    <>
      <div
        className="bottom-click-zone"
        onClick={() => {
          if (autoModeRef.current) return;
          if (!revealed) handleReveal(); else advance();
        }}
      />
      <div id="app">
        <header>
          <h1>単語カード</h1>
          <span className="header-subtitle">Vocab Flashcards</span>
        </header>

        <div className="selection-panel">
          <button
            className="selection-toggle"
            onClick={() => setSelectionOpen(o => !o)}
          >
            {selectionOpen ? '▼' : '▶'} Options ({selectedCount}/{allCards.length})
          </button>

          {selectionOpen && (
            <div className="selection-list">
              <div className="settings-toggles">
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={englishTTSEnabled}
                    onChange={() => setEnglishTTSEnabled(prev => !prev)}
                  />
                  <span>English TTS</span>
                </label>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={autoMode}
                    onChange={() => setAutoMode(prev => !prev)}
                  />
                  <span>Auto Mode</span>
                </label>
              </div>

              {selectableCards.length > 0 && (
                <div className="selection-actions">
                  <button className="selection-action-btn" onClick={selectAllCards}>Select All</button>
                  <button className="selection-action-btn" onClick={deselectAllCards}>Deselect All</button>
                </div>
              )}
              {selectableCards.map(card => (
                <label key={card.id} className="card-select-item">
                  <input
                    type="checkbox"
                    checked={card.selected}
                    onChange={() => toggleCard(card.id)}
                  />
                  <span className="card-select-word">{card.word}</span>
                  {card.reading && <span className="card-select-reading">（{card.reading}）</span>}
                </label>
              ))}
              {selectableCards.length === 0 && (
                <p className="empty-text">No vocabulary loaded. Complete some reviews on jpdb.io first!</p>
              )}
            </div>
          )}
        </div>

        <div className="card-area" ref={currentCardRef} onClick={e => {
          const target = e.target as HTMLElement;
          if (target.closest('button, label, input, .selection-panel')) return;
          if (autoModeRef.current) return;
          if (!revealed) handleReveal(); else advance();
        }}>
          {currentCard ? (
            <>
              <div className="flashcard">
                <div className="flashcard-word">{currentCard.word}</div>

                {!revealed ? (
                  <button className="reveal-btn" onClick={handleReveal} disabled={autoMode}>
                    Reveal
                  </button>
                ) : (
                  <div className="flashcard-details">
                    {currentCard.reading && (
                      <div className="flashcard-reading">
                        {currentCard.reading}
                      </div>
                    )}
                    <div className="flashcard-meanings">
                      {Object.entries(currentCard.meanings).map(([pos, defs]) => (
                        <div key={pos} className="meaning-group">
                          <span className="meaning-pos">{pos}</span>
                          <span className="meaning-defs">{defs.join('; ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {revealed && (
                <button className="next-btn" onClick={advance} disabled={autoMode}>
                  Next →
                </button>
              )}
            </>
          ) : (
            <div className="empty-state">
              <p>No cards selected.</p>
              <p>Open the Options panel above and pick some cards to study.</p>
            </div>
          )}
        </div>

        <div className="controls-help">
          <span>Press <kbd>Space</kbd> or <kbd>Enter</kbd> to reveal / advance</span>
        </div>
      </div>
    </>
  );
}

export { App };
