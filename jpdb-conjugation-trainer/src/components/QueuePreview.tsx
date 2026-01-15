import { memo, useState } from 'react';
import { useSession } from '../contexts/SessionContext';
import { CONJUGATION_LABELS } from '../types';

import { useNavigate } from '@tanstack/react-router';

export const QueuePreview = memo(function QueuePreview() {
  const { session, upcomingItems, jumpToIndex, removeItemAtIndex } = useSession();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleJumpToItem = (relativeIndex: number) => {
    const absoluteIndex = session.currentIndex + 1 + relativeIndex;
    jumpToIndex(absoluteIndex);
    void navigate({ to: '/practice', replace: true });
  };

  const handleRemoveItem = (e: React.MouseEvent, relativeIndex: number) => {
    e.stopPropagation();
    const absoluteIndex = session.currentIndex + 1 + relativeIndex;
    removeItemAtIndex(absoluteIndex);
  };

  return (
    <div id="queue-preview-container">
      <details
        id="queue-preview-section"
        onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary>
          Upcoming Reviews{isOpen ? ` (${upcomingItems.length})` : null}
        </summary>
        <div id="queue-preview">
          {upcomingItems.length === 0 ? (
            <div style={{ color: '#718096', fontSize: '14px' }}>No more items in queue</div>
          ) : (
            upcomingItems.map((item, index) => (
              <div
                key={index}
                className={`queue-item ${item.isRescheduled ? 'rescheduled' : ''}`}
                onClick={() => handleJumpToItem(index)}
                style={{ cursor: 'pointer' }}
                title="Click to jump to this review"
              >
                <div>
                  <div className="queue-item-word">
                    {item.type === 'grammar' ? (
                      <>
                        {item.grammarCard?.description}
                        {item.variant !== undefined && item.variant !== '' ? ` ${item.variant}` : null}
                      </>
                    ) : item.vocab?.word}
                    {item.isRescheduled ? <span className="reschedule-badge" title={`Rescheduled (attempt ${item.rescheduleIteration})`}>
                        🔄
                      </span> : null}
                  </div>
                  <div className="queue-item-form">
                    {item.type === 'grammar' ? 'Grammar Task' : CONJUGATION_LABELS[item.conjugationType!]}
                  </div>
                </div>
                <button
                  className="queue-item-remove"
                  onClick={(e) => handleRemoveItem(e, index)}
                  title="Remove from queue"
                >
                  Remove
                </button>
                <div style={{ color: '#a0aec0', fontSize: '12px' }}>
                  #{session.currentIndex + index + 2}
                </div>
              </div>
            ))
          )}
        </div>
      </details>
    </div>
  );
});
