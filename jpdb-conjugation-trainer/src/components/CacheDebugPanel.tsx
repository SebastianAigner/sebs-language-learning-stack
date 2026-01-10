import { memo, useState, useEffect, useCallback } from 'react';
import type { CacheEntryDisplay } from '../llmCache';
import { getRecentCacheEntries } from '../llmCache';
import type { ConjugationType } from '../types';
import { CONJUGATION_LABELS } from '../types';

export const CacheDebugPanel = memo(function CacheDebugPanel() {
  const [entries, setEntries] = useState<CacheEntryDisplay[]>(() => getRecentCacheEntries(5));

  const updateEntries = useCallback(() => {
    const recentEntries = getRecentCacheEntries(5);
    setEntries(recentEntries);
  }, []);

  useEffect(() => {
    // Refresh every 2 seconds to show new entries
    const interval = setInterval(updateEntries, 2000);
    return () => clearInterval(interval);
  }, [updateEntries]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div id="cache-debug-panel">
      <details id="cache-debug-section">
        <summary>LLM Cache Debug (5 Most Recent)</summary>
        {entries.length === 0 ? (
          <div style={{ padding: '15px', color: '#718096', fontSize: '14px' }}>
            No cache entries yet
          </div>
        ) : (
          <div className="cache-debug-table-wrapper">
            <table className="cache-debug-table">
              <thead>
                <tr>
                  <th>Word</th>
                  <th>Form</th>
                  <th>Your Answer</th>
                  <th>Correct Answer</th>
                  <th>Result</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.key} className={entry.isCorrect ? 'cache-correct' : 'cache-incorrect'}>
                    <td className="cache-word">{entry.word}</td>
                    <td className="cache-form">{CONJUGATION_LABELS[entry.conjugationType as ConjugationType] || entry.conjugationType}</td>
                    <td className="cache-answer">{entry.userAnswer}</td>
                    <td className="cache-correct-answer">{entry.correctAnswer}</td>
                    <td className="cache-result">
                      {entry.isCorrect ? '✓' : '✗'}
                    </td>
                    <td className="cache-time">{formatTimestamp(entry.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </details>
    </div>
  );
});
