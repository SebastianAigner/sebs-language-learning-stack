import { useState } from 'react';
import { useSession } from '../contexts/SessionContext';
import { useUI } from '../contexts/UIContext';
import { useConfig } from '../contexts/ConfigContext';
import type { ConjugationType} from '../types';
import { ALL_CONJUGATION_TYPES, STORAGE_KEYS } from '../types';
import { parseManualVocabulary } from '../manualVocabulary';
import { initializeQueue } from '../scheduler';
import { useNotification } from '../contexts/NotificationContext';
import { Button } from './ui/Button';
import { TextArea } from './ui/TextArea';
import { Checkbox } from './ui/Checkbox';

import { useNavigate } from '@tanstack/react-router';

export function SettingsPanel() {
  const { showNotification } = useNotification();
  const { session, startNewSession } = useSession();
  const { ui, setTutorialMode } = useUI();
  const navigate = useNavigate();
  const { config, updateAutoAdvance, updateBlacklist, updateAlwaysAddVerbs, updateAlwaysAddAdjectives } = useConfig();

  // Initialize state with lazy initialization
  const [manualVerbInput, setManualVerbInput] = useState<string>('');
  const [manualAdjectiveInput, setManualAdjectiveInput] = useState<string>('');

  const handleAddManualVocabulary = () => {
    const verbItems = manualVerbInput.trim() 
      ? parseManualVocabulary(manualVerbInput, 'verb') 
      : { success: true as const, items: [] };
    
    const adjectiveItems = manualAdjectiveInput.trim() 
      ? parseManualVocabulary(manualAdjectiveInput, 'adjective') 
      : { success: true as const, items: [] };

    if (!verbItems.success) {
      showNotification('error', `Verb validation errors:\n\n${verbItems.errors.join('\n')}`);
      return;
    }

    if (!adjectiveItems.success) {
      showNotification('error', `Adjective validation errors:\n\n${adjectiveItems.errors.join('\n')}`);
      return;
    }

    const allItems = [...verbItems.items, ...adjectiveItems.items];

    if (allItems.length === 0) {
      showNotification('warning', 'Please enter at least one word');
      return;
    }

    // Get enabled types from localStorage for manual addition
    let enabledTypes: ConjugationType[] = ALL_CONJUGATION_TYPES;
    const saved = localStorage.getItem(STORAGE_KEYS.CONJUGATION_TYPES);
    if (saved) {
      try {
        enabledTypes = JSON.parse(saved);
      } catch (error) {
        console.error('Failed to load conjugation types:', error);
      }
    }

    // Create review items from the manual vocabulary using current enabled types
    const newReviewItems = initializeQueue(allItems, enabledTypes);

    // Add to existing queue
    startNewSession([...session.queue, ...newReviewItems]);

    // Navigate to prompt view to start the review
    void navigate({ to: '/practice', replace: true });

    // Clear the inputs
    setManualVerbInput('');
    setManualAdjectiveInput('');
    showNotification('success', `Added ${allItems.length} word(s) to the queue`);
  };

  const handleAlwaysAddVerbsChange = (value: string) => {
    updateAlwaysAddVerbs(value);
  };

  const handleAlwaysAddAdjectivesChange = (value: string) => {
    updateAlwaysAddAdjectives(value);
  };

  const handleBlacklistChange = (value: string) => {
    updateBlacklist(value);
  };

  return (
    <details id="settings-panel">
      <summary>Settings</summary>
      <div id="settings-panel-content">
        <div className="settings-section">
          <Checkbox
            className="settings-toggle"
            checked={config.autoAdvance}
            onChange={(e) => updateAutoAdvance(e.target.checked)}
            label="Auto-advance on correct answer"
          />
          <Checkbox
            className="settings-toggle"
            checked={ui.tutorialMode}
            onChange={(e) => setTutorialMode(e.target.checked)}
            label="Show tutorial instructions"
          />
        </div>

      <details id="manual-vocabulary-settings">
        <summary>Add Manual Vocabulary</summary>
        <div id="manual-vocabulary-section">
          <p className="manual-vocab-hint">
            Enter Japanese verbs and adjectives.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <TextArea
              label="Verbs"
              id="manual-verb-input"
              value={manualVerbInput}
              onChange={(e) => setManualVerbInput(e.target.value)}
              placeholder="食べる&#10;飲む&#10;勉強&#10;行く"
              rows={4}
            />
            <TextArea
              label="Adjectives (i-adjectives)"
              id="manual-adjective-input"
              value={manualAdjectiveInput}
              onChange={(e) => setManualAdjectiveInput(e.target.value)}
              placeholder="高い&#10;寒い&#10;面白い"
              rows={4}
            />
          </div>
          <Button variant="primary" onClick={handleAddManualVocabulary} style={{ marginTop: '10px' }}>
            Add to Current Queue
          </Button>
        </div>
      </details>

        <details id="always-add-cards-settings">
          <summary>Always Add These Cards</summary>
          <div id="always-add-cards-section">
            <p className="manual-vocab-hint">
              These words will be automatically appended to every review session when you fetch vocabulary.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <TextArea
                label="Verbs"
                id="always-add-verbs-input"
                value={config.alwaysAddVerbs}
                onChange={(e) => handleAlwaysAddVerbsChange(e.target.value)}
                placeholder="食べる&#10;飲む&#10;勉強&#10;行く"
                rows={4}
              />
              <TextArea
                label="Adjectives (i-adjectives)"
                id="always-add-adjectives-input"
                value={config.alwaysAddAdjectives}
                onChange={(e) => handleAlwaysAddAdjectivesChange(e.target.value)}
                placeholder="高い&#10;寒い&#10;面白い"
                rows={4}
              />
            </div>
          </div>
        </details>

        <details id="blacklist-settings">
          <summary>Blacklist (Never Show These Cards)</summary>
          <div id="blacklist-section">
            <p className="manual-vocab-hint">
              Words in the blacklist will never appear in review sessions. They are filtered out when you fetch vocabulary. Works for both verbs and adjectives.
              You can also blacklist specific combinations using the &quot;word#conjugation-id&quot; syntax (e.g. 食べる#tai-casual).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <TextArea
                label="Blacklisted Words"
                id="blacklist-input"
                value={config.blacklist}
                onChange={(e) => handleBlacklistChange(e.target.value)}
                placeholder="食べる&#10;飲む&#10;高い&#10;寒い"
                rows={4}
              />
            </div>
          </div>
        </details>
      </div>
    </details>
  );
}
