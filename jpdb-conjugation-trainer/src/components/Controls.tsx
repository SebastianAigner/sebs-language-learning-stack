import { memo } from 'react';
import { useSession } from '../contexts/SessionContext';
import { useFetchVocabulary } from '../hooks/useFetchVocabulary';
import { useNotification } from '../contexts/NotificationContext';
import { useAudioUnlock } from '@sebs/audio-unlock';
import { Button } from './ui/Button';

import { useNavigate } from '@tanstack/react-router';

export const Controls = memo(function Controls() {
  const { clearSession: clearSessionData } = useSession();
  const navigate = useNavigate();
  const { showConfirm } = useNotification();
  const { audioUnlocked, unlockAudio } = useAudioUnlock();
  const { fetchVocabulary } = useFetchVocabulary();

  const handleFetchVocabulary = () => {
    void fetchVocabulary();
  };

  const handleResetSession = () => {
    void (async () => {
      const confirmed = await showConfirm(
        'Reset Session',
        'Are you sure you want to reset the current session? All progress will be lost.'
      );

      if (confirmed) {
        clearSessionData();
        void navigate({ to: '/' });
      }
    })();
  };

  return (
    <div id="controls">
      <Button id="fetch-vocab-btn" onClick={handleFetchVocabulary}>Fetch Vocabulary</Button>
      <Button id="reset-btn" onClick={handleResetSession}>Reset Session</Button>
      {!audioUnlocked && (
        <Button
          id="unlock-audio-btn"
          onClick={unlockAudio}
          style={{
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            fontWeight: 'bold'
          }}
          title="Click to enable audio playback"
        >
          🔊 Enable Audio
        </Button>
      )}
    </div>
  );
});
