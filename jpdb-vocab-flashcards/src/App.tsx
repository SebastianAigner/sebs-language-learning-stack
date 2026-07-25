import { useState, useEffect, useCallback, useRef } from 'react';
import { useAudio } from '@sebs/audio-unlock';

// Derive backends from the current host so the app works both on the dev
// machine (localhost) and from other devices on the LAN (e.g. an iPhone).
const HOST = window.location.hostname;
const API_BASE_URL = `http://${HOST}:3000`;
const TTS_BASE_URL = `http://${HOST}:5065`;

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

interface LoadedAudio {
  jp: HTMLAudioElement | null;
  en: HTMLAudioElement | null;
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
  const defs = firstEntry[1];
  if (defs.length === 0) return '';
  const first = defs[0];
  if (first.length > 20 || first.split(/\s+/).filter(Boolean).length > 3) {
    return first;
  }
  return defs.slice(0, 3).join('; ');
}

function jpAudioUrl(card: CardData): string {
  return `${TTS_BASE_URL}/tts?text=${encodeURIComponent(card.word)}`;
}

function enAudioUrl(card: CardData): string | null {
  const enText = getEnglishPreview(card.meanings);
  if (!enText) return null;
  return `${TTS_BASE_URL}/tts?text=${encodeURIComponent(enText)}&language=en`;
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
  const [autoPause, setAutoPause] = useState(1);
  const [interPause, setInterPause] = useState(0.5);
  const [reverseOrder, setReverseOrder] = useState(false);
  const [repeatCount, setRepeatCount] = useState(1);
  const currentCardRef = useRef<HTMLDivElement>(null);

  const autoModeRef = useRef(false);
  const autoPauseRef = useRef(1);
  const interPauseRef = useRef(0.5);
  const reverseOrderRef = useRef(false);
  const repeatCountRef = useRef(1);
  const allCardsRef = useRef<CardData[]>(allCards);
  allCardsRef.current = allCards;
  const currentCardDataRef = useRef<CardData | null>(null);
  const queueRef = useRef<CardData[]>([]);
  const currentIndexRef = useRef(0);
  const advanceRef = useRef<() => void>(() => {});
  const englishTTSEnabledRef = useRef(false);

  // Audio playback goes through the shared @sebs/audio-unlock library:
  // playStreamingAudio reuses a single element (reassigning `src` per clip,
  // which is what makes repeats replay reliably on iOS), and
  // unlockStreamingAudio primes that element from a user gesture so the timed
  // plays auto mode makes after a setTimeout aren't blocked by iOS.
  const { playStreamingAudio, unlockStreamingAudio, stopStreamingAudio } = useAudio();

  // Audio elements are cached by card id so the current and next card can be
  // preloaded (HTTP-cache warming) without one clobbering the other.
  const audioCacheRef = useRef<Map<string, Promise<LoadedAudio>>>(new Map());

  useEffect(() => {
    currentCardDataRef.current = currentCard;
  });

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    advanceRef.current = advance;
  });

  useEffect(() => {
    englishTTSEnabledRef.current = englishTTSEnabled;
  }, [englishTTSEnabled]);

  useEffect(() => {
    autoPauseRef.current = autoPause;
  }, [autoPause]);

  useEffect(() => {
    interPauseRef.current = interPause;
  }, [interPause]);

  useEffect(() => {
    reverseOrderRef.current = reverseOrder;
  }, [reverseOrder]);

  useEffect(() => {
    repeatCountRef.current = repeatCount;
  }, [repeatCount]);

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

  const loadAudio = (url: string): Promise<HTMLAudioElement> =>
    new Promise(resolve => {
      const audio = new Audio();
      audio.volume = 0.7;
      audio.preload = 'auto';
      audio.addEventListener('canplaythrough', () => resolve(audio), { once: true });
      audio.addEventListener('error', () => resolve(audio), { once: true });
      // Set src + load() explicitly so the fetch is kicked off eagerly, right now.
      audio.src = url;
      audio.load();
    });

  // Kick off (or reuse) the audio load for a card. The returned promise is
  // cached by card id, so repeated calls for the same card share one fetch and
  // preloading the next card never disturbs the current one.
  const preloadCard = useCallback((card: CardData): Promise<LoadedAudio> => {
    const cache = audioCacheRef.current;
    const existing = cache.get(card.id);
    if (existing) return existing;

    const jpUrl = `${TTS_BASE_URL}/tts?text=${encodeURIComponent(card.word)}`;
    const jpLoad = loadAudio(jpUrl);

    let enLoad: Promise<HTMLAudioElement | null> = Promise.resolve(null);
    if (englishTTSEnabledRef.current) {
      const enText = getEnglishPreview(card.meanings);
      if (enText) {
        const enUrl = `${TTS_BASE_URL}/tts?text=${encodeURIComponent(enText)}&language=en`;
        enLoad = loadAudio(enUrl);
      }
    }

    const entry = Promise.all([jpLoad, enLoad]).then(([jp, en]) => ({ jp, en }));
    cache.set(card.id, entry);
    return entry;
  }, []);

  // Whenever the active card changes, eagerly preload BOTH the current card and
  // the next one in the queue, then prune everything else so the cache stays small.
  useEffect(() => {
    if (!currentCard) return;
    preloadCard(currentCard);

    const nextCard = queue[currentIndex + 1];
    if (nextCard) preloadCard(nextCard);

    const keep = new Set([currentCard.id, nextCard?.id].filter(Boolean) as string[]);
    for (const id of audioCacheRef.current.keys()) {
      if (!keep.has(id)) audioCacheRef.current.delete(id);
    }
  }, [currentCard, currentIndex, queue, preloadCard]);

  // Enabling/disabling English TTS changes what needs to be fetched per card,
  // so drop the cache and let it rebuild.
  useEffect(() => {
    audioCacheRef.current.clear();
  }, [englishTTSEnabled]);

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

  const removeCurrentCard = useCallback(() => {
    if (!currentCard) return;
    const id = currentCard.id;
    const card = allCardsRef.current.find(c => c.id === id);
    if (!card || !card.selected) return;

    setAllCards(prev => prev.map(c => c.id === id ? { ...c, selected: false } : c));
    setQueue(q => q.filter(c => c.id !== id));
    setCurrentIndex(0);
    setRevealed(false);
  }, [currentCard]);

  // Play a card's clips through the shared library. `awaitEnd` makes each call
  // resolve when the clip finishes, so JP/EN and repeats sequence correctly.
  // The library reassigns `src` on its single element per clip, which resets it
  // for reliable replay; audio is served with a long-lived Cache-Control, so
  // repeats and the English clip load from the browser's HTTP cache.
  const playCardAudio = useCallback(async (card: CardData) => {
    const jpUrl = jpAudioUrl(card);
    const enUrl = englishTTSEnabledRef.current ? enAudioUrl(card) : null;
    const play = (url: string) => playStreamingAudio(url, { volume: 0.7, awaitEnd: true });

    if (reverseOrderRef.current) {
      if (enUrl) {
        await play(enUrl);
        await delay(interPauseRef.current * 1000);
      }
      await play(jpUrl);
    } else {
      await play(jpUrl);
      if (enUrl) {
        await delay(interPauseRef.current * 1000);
        await play(enUrl);
      }
    }
  }, [playStreamingAudio]);

  const handleReveal = useCallback(() => {
    // Prime playback from within this user gesture (see unlockStreamingAudio).
    unlockStreamingAudio();
    setRevealed(true);
    if (currentCard) playCardAudio(currentCard);
  }, [currentCard, playCardAudio, unlockStreamingAudio]);

  useEffect(() => {
    if (!autoMode) {
      autoModeRef.current = false;
      return;
    }

    autoModeRef.current = true;

    const run = async () => {
      while (autoModeRef.current) {
        const card = currentCardDataRef.current;
        if (!card) {
          await delay(500);
          continue;
        }

        // Preload the next card up front, so it has the entire duration of this
        // card (auto-pause + playback) to finish loading before it's shown.
        const nextIdx = currentIndexRef.current + 1;
        if (nextIdx < queueRef.current.length) {
          preloadCard(queueRef.current[nextIdx]);
        }

        // Warm the browser cache for this card (fire-and-forget). Playback
        // loads the URL on demand, so we must not await this — on iOS the
        // preload's `canplaythrough` may never fire, which would stall the loop.
        preloadCard(card);

        await delay(autoPauseRef.current * 1000);
        if (!autoModeRef.current) break;

        setRevealed(true);
        await delay(50);

        const reps = Math.max(1, repeatCountRef.current);
        for (let i = 0; i < reps; i++) {
          await playCardAudio(card);
          if (!autoModeRef.current) break;
          if (i < reps - 1) {
            await delay(interPauseRef.current * 1000);
          }
        }
        if (!autoModeRef.current) break;

        advanceRef.current();
        await delay(300);
      }
    };

    run();

    return () => {
      autoModeRef.current = false;
      stopStreamingAudio();
    };
  }, [autoMode, playCardAudio, preloadCard, stopStreamingAudio]);

  const toggleCard = useCallback((id: string) => {
    const card = allCardsRef.current.find(c => c.id === id);
    if (!card) return;
    const wasSelected = card.selected;

    setAllCards(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));

    if (wasSelected) {
      setQueue(q => q.filter(c => c.id !== id));
    } else {
      setQueue(q => q.some(c => c.id === id) ? q : [...q, { ...card, selected: true }]);
    }

    setCurrentIndex(0);
    setRevealed(false);
  }, []);

  const selectAllCards = useCallback(() => {
    const currentAllCards = allCardsRef.current;
    setAllCards(prev => prev.map(c => ({ ...c, selected: true })));
    setQueue(prev => {
      const existingIds = new Set(prev.map(c => c.id));
      const toAdd = currentAllCards.filter(c => !existingIds.has(c.id));
      return [...prev, ...toAdd];
    });
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
                    onChange={() => { unlockStreamingAudio(); setAutoMode(prev => !prev); }}
                  />
                  <span>Auto Mode</span>
                </label>
                <label className="settings-toggle">
                  <span>Pause:</span>
                  <input
                    type="number"
                    className="auto-pause-input"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={autoPause}
                    onChange={e => setAutoPause(Number(e.target.value))}
                  />
                  <span>s</span>
                </label>
                <label className="settings-toggle">
                  <span>Inter:</span>
                  <input
                    type="number"
                    className="auto-pause-input"
                    min="0"
                    max="5"
                    step="0.1"
                    value={interPause}
                    onChange={e => setInterPause(Number(e.target.value))}
                  />
                  <span>s</span>
                </label>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={reverseOrder}
                    onChange={() => setReverseOrder(prev => !prev)}
                  />
                  <span>Reverse JP/EN</span>
                </label>
                <label className="settings-toggle">
                  <span>Repeat:</span>
                  <button
                    className="step-btn"
                    onClick={() => setRepeatCount(p => Math.max(1, p - 1))}
                    type="button"
                  >−</button>
                  <input
                    type="number"
                    className="auto-pause-input"
                    min="1"
                    max="10"
                    step="1"
                    value={repeatCount}
                    onChange={e => setRepeatCount(Math.max(1, Number(e.target.value)))}
                  />
                  <button
                    className="step-btn"
                    onClick={() => setRepeatCount(p => Math.min(10, p + 1))}
                    type="button"
                  >+</button>
                  <span>x</span>
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
                <div className="next-row">
                  <button className="rem-btn" onClick={removeCurrentCard}>
                    (rem.)
                  </button>
                  <button className="next-btn" onClick={advance} disabled={autoMode}>
                    Next →
                  </button>
                </div>
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
