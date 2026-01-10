import { useState, useEffect, useCallback } from 'react';
import type { CacheEntryDisplay } from '../llmCache';
import { clearCache, getCacheStats, getRecentCacheEntries } from '../llmCache';
import type { ConjugationType } from '../types';
import { CONJUGATION_LABELS } from '../types';
import { Button } from './ui/Button';

interface DebugSettingsPanelProps {
  rawOutput?: string;
}

export function DebugSettingsPanel({ rawOutput }: DebugSettingsPanelProps) {
  const [cacheStats, setCacheStats] = useState<{ entryCount: number; sizeKB: number }>({ entryCount: 0, sizeKB: 0 });
  const [cacheEntries, setCacheEntries] = useState<CacheEntryDisplay[]>([]);

  const updateCacheStats = () => {
    const stats = getCacheStats();
    setCacheStats(stats);
  };

  const updateCacheEntries = useCallback(() => {
    const recentEntries = getRecentCacheEntries(5);
    setCacheEntries(recentEntries);
  }, []);

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear the LLM response cache? This will remove all cached grading results.')) {
      clearCache();
      updateCacheStats();
      updateCacheEntries();
    }
  };

  const handleToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (e.currentTarget.open) {
      updateCacheStats();
      updateCacheEntries();
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Refresh cache entries every 2 seconds when panel is open
  useEffect(() => {
    const interval = setInterval(updateCacheEntries, 2000);
    return () => clearInterval(interval);
  }, [updateCacheEntries]);

  return (
    <details id="debug-settings-panel" onToggle={handleToggle}>
      <summary>Debug</summary>
      <div id="debug-settings-panel-content">
        <div className="settings-section">
          <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#2d3748' }}>LLM Cache</h3>
          <div className="cache-management">
            <div className="cache-stats">
              <strong>Cache:</strong> {cacheStats.entryCount} entries ({cacheStats.sizeKB} KB)
            </div>
            <Button variant="danger" onClick={handleClearCache}>Clear Cache</Button>
          </div>
        </div>

        <details id="cache-debug-section" style={{ marginTop: '20px' }}>
          <summary>LLM Cache Debug (5 Most Recent)</summary>
          {cacheEntries.length === 0 ? (
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
                  {cacheEntries.map((entry) => (
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

        <details id="raw-output-section" style={{ marginTop: '20px' }}>
          <summary>Raw LLM Output</summary>
          <pre className="raw-output-content">{rawOutput || 'No output yet'}</pre>
        </details>
      </div>
    </details>
  );
}
