import { useState, useSyncExternalStore, type CSSProperties } from 'react';
import { subscribe, getEntries, clearEntries, type LogLevel } from './logStore';

const LEVEL_COLORS: Record<LogLevel, string> = {
  error: '#ff6b6b',
  warn: '#ffd166',
  info: '#8ecae6',
  log: '#c9c9c9',
  debug: '#9a9a9a'
};

// A self-contained, inline-styled overlay so it never clashes with app styles.
// Shows a small toggle button; tapping it opens a panel listing captured
// console output and uncaught errors. Intended for debugging on devices (iPad)
// where the browser console isn't reachable.
export function DebugConsole() {
  const entries = useSyncExternalStore(subscribe, getEntries);
  const [open, setOpen] = useState(false);

  const errorCount = entries.filter(e => e.level === 'error').length;
  const warnCount = entries.filter(e => e.level === 'warn').length;

  const copyAll = () => {
    const text = entries.map(e => `[${e.time}] ${e.level.toUpperCase()}: ${e.message}`).join('\n');
    void navigator.clipboard?.writeText(text).catch(() => {
      /* clipboard may be unavailable; ignore */
    });
  };

  const buttonLabel =
    errorCount > 0 ? `⚠︎ ${errorCount}` : warnCount > 0 ? `● ${warnCount}` : `Logs ${entries.length}`;

  const toggleStyle: CSSProperties = {
    position: 'fixed',
    right: 10,
    bottom: 10,
    zIndex: 2147483647,
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.2)',
    background: errorCount > 0 ? '#7a1f1f' : 'rgba(20,20,20,0.85)',
    color: '#fff',
    font: '600 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
  };

  if (!open) {
    return (
      <button
        type="button"
        style={toggleStyle}
        onClick={e => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {buttonLabel}
      </button>
    );
  }

  const panelStyle: CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '60vh',
    zIndex: 2147483647,
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(15,15,18,0.97)',
    color: '#eee',
    borderTop: '1px solid rgba(255,255,255,0.15)',
    boxShadow: '0 -4px 16px rgba(0,0,0,0.5)'
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    borderBottom: '1px solid rgba(255,255,255,0.12)',
    font: '600 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace'
  };

  const actionBtnStyle: CSSProperties = {
    padding: '5px 9px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    font: '600 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace'
  };

  return (
    <div style={panelStyle} onClick={e => e.stopPropagation()}>
      <div style={headerStyle}>
        <span>Console ({entries.length})</span>
        <span style={{ color: LEVEL_COLORS.error }}>err {errorCount}</span>
        <span style={{ color: LEVEL_COLORS.warn }}>warn {warnCount}</span>
        <span style={{ flex: 1 }} />
        <button type="button" style={actionBtnStyle} onClick={copyAll}>Copy</button>
        <button type="button" style={actionBtnStyle} onClick={() => clearEntries()}>Clear</button>
        <button type="button" style={actionBtnStyle} onClick={() => setOpen(false)}>Close</button>
      </div>
      <div style={{ overflowY: 'auto', padding: '6px 10px', WebkitOverflowScrolling: 'touch' }}>
        {entries.length === 0 ? (
          <div style={{ color: '#888', font: '12px/1.4 ui-monospace, monospace', padding: '8px 0' }}>
            No logs yet.
          </div>
        ) : (
          entries
            .slice()
            .reverse()
            .map(entry => (
              <div
                key={entry.id}
                style={{
                  font: '12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
                  color: LEVEL_COLORS[entry.level],
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  padding: '3px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.06)'
                }}
              >
                <span style={{ color: '#777' }}>{entry.time} </span>
                {entry.message}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
