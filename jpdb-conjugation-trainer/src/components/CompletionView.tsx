import { useEffect } from 'react';
import type { SessionState } from '../types';
import { Button } from './ui/Button';

interface CompletionViewProps {
  session: SessionState;
  onStartNewSession: () => void;
}

export function CompletionView({ session, onStartNewSession }: CompletionViewProps) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="view">
      <h2>Session Complete!</h2>
      <div id="session-stats">
        <p>Total Reviewed: <span>{session.stats.totalReviewed}</span></p>
        <p>Final Streak: <span>{session.stats.currentStreak}</span></p>
      </div>
      <Button variant="primary" onClick={onStartNewSession}>Start New Session</Button>
    </div>
  );
}
