import React, { useState } from 'react';
import { 
  ALL_CONJUGATION_TYPES, 
  CONJUGATION_LABELS, 
  VERB_CONJUGATION_TYPES, 
  ADJECTIVE_CONJUGATION_TYPES,
  STORAGE_KEYS
} from '../types';
import type {
  ReviewMode,
  ConjugationType
} from '../types';
import { useFetchVocabulary, usePracticeEvergreens, usePracticeGrammar } from '../hooks/useFetchVocabulary';
import { useConfig } from '../contexts/ConfigContext';
import { Button } from './ui/Button';
import { StepIndicator } from './ui/StepIndicator';
import { Checkbox } from './ui/Checkbox';
import { loadGrammarCards, loadGrammarCardsInRotation } from '../grammarCards';

type WizardStep = 1 | 2 | 3;

const CONJUGATION_PAIRS: [ConjugationType, ConjugationType][] = [
  ['non-past-affirmative-casual', 'non-past-affirmative-polite'],
  ['past-affirmative-casual', 'past-affirmative-polite'],
  ['negative-casual', 'negative-polite'],
  ['negative-past-casual', 'negative-past-polite'],
  ['progressive-casual', 'progressive-polite'],
  ['progressive-past-casual', 'progressive-past-polite'],
  ['negative-progressive-casual', 'negative-progressive-polite'],
  ['negative-progressive-past-casual', 'negative-progressive-past-polite'],
  ['tai-casual', 'tai-polite'],
  ['sou-casual', 'sou-polite'],
  ['volitional-casual', 'volitional-polite'],
];

export function Wizard() {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [step, setStep] = useState<WizardStep>(1);
  const [source, setSource] = useState<'today' | 'evergreen' | 'grammar'>('today');
  const [mode, setMode] = useState<ReviewMode>('both');
  const [selectedGrammarCards, setSelectedGrammarCards] = useState<string[]>([]);
  const [grammarVariantMode, setGrammarVariantMode] = useState<'random' | 'all'>('random');
  const [shuffleGrammar, setShuffleGrammar] = useState<boolean>(true);
  const [randomCount, setRandomCount] = useState<number>(10);
  const [limitPerCategory, setLimitPerCategory] = useState<boolean>(false);
  const [cardsPerCategory, setCardsPerCategory] = useState<number>(1);
  const [enabledTypes, setEnabledTypes] = useState<ConjugationType[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CONJUGATION_TYPES);
    if (saved) {
      try {
        return JSON.parse(saved) as ConjugationType[];
      } catch (error) {
        return [...ALL_CONJUGATION_TYPES];
      }
    }
    return [...ALL_CONJUGATION_TYPES];
  });

  const { fetchVocabulary } = useFetchVocabulary();
  const { practiceEvergreens } = usePracticeEvergreens();
  const { practiceGrammar } = usePracticeGrammar();
  const { updateReviewMode } = useConfig();

  const allGrammarCards = React.useMemo(() => loadGrammarCards(), []);
  const inRotationIds = React.useMemo(() => loadGrammarCardsInRotation(), []);
  const inRotationGrammarCards = React.useMemo(() => 
    allGrammarCards.filter(c => inRotationIds.includes(c.id)),
    [allGrammarCards, inRotationIds]
  );

  React.useEffect(() => {
    if (source === 'grammar') {
      setSelectedGrammarCards(inRotationGrammarCards.map(c => c.id));
    }
  }, [source, inRotationGrammarCards]);

  const handleGrammarToggle = (id: string, checked: boolean) => {
    setSelectedGrammarCards(prev => 
      checked ? [...prev, id] : prev.filter(i => i !== id)
    );
  };

  const handleToggleAllGrammar = (checked: boolean) => {
    setSelectedGrammarCards(checked ? inRotationGrammarCards.map(c => c.id) : []);
  };

  const handleSelectRandomGrammar = (count: number) => {
    const shuffled = [...inRotationGrammarCards].sort(() => 0.5 - Math.random());
    setSelectedGrammarCards(shuffled.slice(0, count).map(c => c.id));
  };

  const handleSelectFreshestGrammar = (count: number) => {
    setSelectedGrammarCards(inRotationGrammarCards.slice(0, count).map(c => c.id));
  };

  const handleConjugationTypeChange = (type: ConjugationType, checked: boolean) => {
    let newEnabledTypes = checked
      ? [...enabledTypes, type]
      : enabledTypes.filter(t => t !== type);

    if (newEnabledTypes.length === 0) {
      newEnabledTypes = ['te-form'];
    }

    setEnabledTypes(newEnabledTypes);
  };

  const handleToggleAllCasual = () => {
    const casualTypes = ALL_CONJUGATION_TYPES.filter(type =>
      CONJUGATION_LABELS[type].includes('(casual)') || type === 'te-form'
    );
    const allCasualEnabled = casualTypes.every(type => enabledTypes.includes(type));
    let newEnabledTypes = allCasualEnabled
      ? enabledTypes.filter(type => !casualTypes.includes(type))
      : [...new Set([...enabledTypes, ...casualTypes])];
    if (newEnabledTypes.length === 0) newEnabledTypes = ['te-form'];
    setEnabledTypes(newEnabledTypes);
  };

  const handleToggleAllPolite = () => {
    const politeTypes = ALL_CONJUGATION_TYPES.filter(type =>
      CONJUGATION_LABELS[type].includes('(polite)')
    );
    const allPoliteEnabled = politeTypes.every(type => enabledTypes.includes(type));
    let newEnabledTypes = allPoliteEnabled
      ? enabledTypes.filter(type => !politeTypes.includes(type))
      : [...new Set([...enabledTypes, ...politeTypes])];
    if (newEnabledTypes.length === 0) newEnabledTypes = ['te-form'];
    setEnabledTypes(newEnabledTypes);
  };

  const handleToggleAllVerbs = () => {
    const allVerbsEnabled = VERB_CONJUGATION_TYPES.every(type => enabledTypes.includes(type));
    let newEnabledTypes = allVerbsEnabled
      ? enabledTypes.filter(type => !VERB_CONJUGATION_TYPES.includes(type))
      : [...new Set([...enabledTypes, ...VERB_CONJUGATION_TYPES])];
    if (newEnabledTypes.length === 0) newEnabledTypes = ['te-form'];
    setEnabledTypes(newEnabledTypes);
  };

  const handleToggleAllAdjectives = () => {
    const allAdjectivesEnabled = ADJECTIVE_CONJUGATION_TYPES.every(type => enabledTypes.includes(type));
    let newEnabledTypes = allAdjectivesEnabled
      ? enabledTypes.filter(type => !ADJECTIVE_CONJUGATION_TYPES.includes(type))
      : [...new Set([...enabledTypes, ...ADJECTIVE_CONJUGATION_TYPES])];
    if (newEnabledTypes.length === 0) newEnabledTypes = ['te-form'];
    setEnabledTypes(newEnabledTypes);
  };

  const handleAdd = async () => {
    if (source === 'grammar') {
      const selected = allGrammarCards.filter(c => selectedGrammarCards.includes(c.id));
      await practiceGrammar(selected, grammarVariantMode, shuffleGrammar);
      return;
    }

    // Save settings to localStorage so they persist for next time
    localStorage.setItem(STORAGE_KEYS.CONJUGATION_TYPES, JSON.stringify(enabledTypes));
    updateReviewMode(mode);

    const maxPerType = limitPerCategory ? cardsPerCategory : undefined;

    if (source === 'today') {
      await fetchVocabulary({ mode, enabledTypes, maxPerType });
    } else {
      await practiceEvergreens({ mode, enabledTypes, maxPerType });
    }
  };

  const sharedTypes = ALL_CONJUGATION_TYPES.filter(
    type => VERB_CONJUGATION_TYPES.includes(type) && ADJECTIVE_CONJUGATION_TYPES.includes(type) && type !== 'te-form'
  );
  const verbOnlyTypes = ALL_CONJUGATION_TYPES.filter(
    type => VERB_CONJUGATION_TYPES.includes(type) && !ADJECTIVE_CONJUGATION_TYPES.includes(type) && type !== 'te-form'
  );
  const adjectiveOnlyTypes = ALL_CONJUGATION_TYPES.filter(
    type => !VERB_CONJUGATION_TYPES.includes(type) && ADJECTIVE_CONJUGATION_TYPES.includes(type) && type !== 'te-form'
  );

  const renderTenseGroup = (title: string, types: ConjugationType[]) => {
    if (types.length === 0) return null;
    const relevantPairs = CONJUGATION_PAIRS.filter(
      ([casual, polite]) => types.includes(casual) || types.includes(polite)
    );

    return (
      <div className="tense-group" style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '10px 0' }}>{title}</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '5px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#666', paddingLeft: '25px' }}>Casual</div>
          <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#666', paddingLeft: '25px' }}>Polite</div>
        </div>
        <div className="tense-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
          {relevantPairs.map(([casual, polite]) => (
            <React.Fragment key={`${casual}-${polite}`}>
              {types.includes(casual) ? (
                <Checkbox
                  checked={enabledTypes.includes(casual)}
                  onChange={(e) => handleConjugationTypeChange(casual, e.target.checked)}
                  label={CONJUGATION_LABELS[casual].replace(' (casual)', '').replace(' - たい', '')}
                />
              ) : <div />}
              {types.includes(polite) ? (
                <Checkbox
                  checked={enabledTypes.includes(polite)}
                  onChange={(e) => handleConjugationTypeChange(polite, e.target.checked)}
                  label={CONJUGATION_LABELS[polite].replace(' (polite)', '').replace(' - たいです', '')}
                />
              ) : <div />}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="view wizard-view" style={{ padding: '20px' }}>
      <StepIndicator currentStep={step} totalSteps={source === 'grammar' ? 2 : 3} />

      {step === 1 && (
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '20px' }}>Choose Vocabulary Source</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
            <Button
              variant={source === 'today' ? 'primary' : 'secondary'}
              onClick={() => setSource('today')}
              style={{ padding: '15px 40px', fontSize: '16px', minWidth: '280px' }}
            >
              Today&#39;s Words
            </Button>
            <Button
              variant={source === 'evergreen' ? 'primary' : 'secondary'}
              onClick={() => setSource('evergreen')}
              style={{ padding: '15px 40px', fontSize: '16px', minWidth: '280px' }}
            >
              Evergreen Words
            </Button>
            <Button
              variant={source === 'grammar' ? 'primary' : 'secondary'}
              onClick={() => setSource('grammar')}
              style={{ padding: '15px 40px', fontSize: '16px', minWidth: '280px' }}
            >
              Grammar Cards
            </Button>
          </div>
        </div>
      )}

      {step === 2 && source === 'grammar' && (
        <div>
          <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>Select Grammar Cards</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', justifyContent: 'center', alignItems: 'center' }}>
            <Button variant="secondary" onClick={() => handleToggleAllGrammar(true)} style={{ padding: '8px 12px', fontSize: '12px' }}>Select All</Button>
            <Button variant="secondary" onClick={() => handleToggleAllGrammar(false)} style={{ padding: '8px 12px', fontSize: '12px' }}>Deselect All</Button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Button 
                variant="secondary" 
                onClick={() => handleSelectRandomGrammar(randomCount)} 
                style={{ padding: '8px 12px', fontSize: '12px' }}
              >
                Select {randomCount} random
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => handleSelectFreshestGrammar(randomCount)} 
                style={{ padding: '8px 12px', fontSize: '12px' }}
              >
                Select {randomCount} freshest
              </Button>
              <input
                type="number"
                value={randomCount}
                onChange={(e) => setRandomCount(Math.max(0, parseInt(e.target.value) || 0))}
                style={{ 
                  width: '50px', 
                  padding: '7px 8px', 
                  fontSize: '12px', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
            </div>
          </div>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '20px' }}>
            {allGrammarCards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                No grammar cards found. Create some first!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {allGrammarCards.map((card) => (
                  <Checkbox
                    key={card.id}
                    checked={selectedGrammarCards.includes(card.id)}
                    onChange={(e) => handleGrammarToggle(card.id, e.target.checked)}
                    label={card.description}
                    style={{ opacity: inRotationIds.includes(card.id) ? 1 : 0.6 }}
                  >
                    {!inRotationIds.includes(card.id) && (
                      <span style={{ fontSize: '10px', color: '#718096', marginLeft: 'auto' }}>
                        (Out of rotation)
                      </span>
                    )}
                  </Checkbox>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ marginBottom: '10px' }}>Modifier Handling</h4>
            <div style={{ display: 'flex', gap: '15px' }}>
              <Button 
                variant={grammarVariantMode === 'random' ? 'primary' : 'secondary'} 
                onClick={() => setGrammarVariantMode('random')}
                style={{ flex: 1, fontSize: '14px' }}
              >
                Random Variant
              </Button>
              <Button 
                variant={grammarVariantMode === 'all' ? 'primary' : 'secondary'} 
                onClick={() => setGrammarVariantMode('all')}
                style={{ flex: 1, fontSize: '14px' }}
              >
                All Variants
              </Button>
            </div>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              {grammarVariantMode === 'random' 
                ? 'Each selected card will be added once with a random modifier.' 
                : 'Each selected card will be added multiple times, once for each modifier it has.'}
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ marginBottom: '10px' }}>Session Settings</h4>
            <Checkbox
              checked={shuffleGrammar}
              onChange={(e) => setShuffleGrammar(e.target.checked)}
              label="Shuffle cards"
            />
          </div>
        </div>
      )}

      {step === 2 && source !== 'grammar' && (
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '20px' }}>What would you like to review?</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
            <Button
              variant={mode === 'verbs' ? 'primary' : 'secondary'}
              onClick={() => setMode('verbs')}
              style={{ padding: '15px 40px', fontSize: '16px', minWidth: '280px' }}
            >
              Verbs
            </Button>
            <Button
              variant={mode === 'adjectives' ? 'primary' : 'secondary'}
              onClick={() => setMode('adjectives')}
              style={{ padding: '15px 40px', fontSize: '16px', minWidth: '280px' }}
            >
              Adjectives
            </Button>
            <Button
              variant={mode === 'both' ? 'primary' : 'secondary'}
              onClick={() => setMode('both')}
              style={{ padding: '15px 40px', fontSize: '16px', minWidth: '280px' }}
            >
              Both
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>Select Conjugations</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
            <Button variant="secondary" onClick={handleToggleAllCasual} style={{ padding: '8px 12px', fontSize: '12px' }}>Toggle All Casual</Button>
            <Button variant="secondary" onClick={handleToggleAllPolite} style={{ padding: '8px 12px', fontSize: '12px' }}>Toggle All Polite</Button>
            <Button variant="secondary" onClick={handleToggleAllVerbs} style={{ padding: '8px 12px', fontSize: '12px' }}>Toggle All Verbs</Button>
            <Button variant="secondary" onClick={handleToggleAllAdjectives} style={{ padding: '8px 12px', fontSize: '12px' }}>Toggle All Adjectives</Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
            <Checkbox
              checked={limitPerCategory}
              onChange={(e) => setLimitPerCategory(e.target.checked)}
              label="Limit cards per category:"
            />
            <input
              type="number"
              min="1"
              value={cardsPerCategory}
              onChange={(e) => setCardsPerCategory(Math.max(1, parseInt(e.target.value) || 1))}
              disabled={!limitPerCategory}
              style={{
                width: '60px',
                padding: '7px 8px',
                fontSize: '14px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                outline: 'none',
                opacity: limitPerCategory ? 1 : 0.5
              }}
            />
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '20px' }}>
            <div className="tense-group" style={{ marginBottom: '15px' }}>
              <h4 style={{ margin: '10px 0' }}>て-form</h4>
              <Checkbox
                checked={enabledTypes.includes('te-form')}
                onChange={(e) => handleConjugationTypeChange('te-form', e.target.checked)}
                label={CONJUGATION_LABELS['te-form']}
              />
            </div>

            {renderTenseGroup('Verbs & Adjectives', sharedTypes)}
            {renderTenseGroup('Verbs Only', verbOnlyTypes)}
            {renderTenseGroup('Adjectives Only', adjectiveOnlyTypes)}
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
        {step > 1 ? (
          <Button variant="secondary" onClick={() => setStep((s) => (s - 1) as WizardStep)}>
            Back
          </Button>
        ) : <div />}
        
        {((step < 3 && source !== 'grammar') || (step < 2 && source === 'grammar')) ? (
          <Button variant="primary" onClick={() => setStep((s) => (s + 1) as WizardStep)}>
            Next
          </Button>
        ) : (
          <Button variant="primary" onClick={() => void handleAdd()} style={{ padding: '10px 30px', fontWeight: 'bold' }}>
            Add
          </Button>
        )}
      </div>
    </div>
  );
}
