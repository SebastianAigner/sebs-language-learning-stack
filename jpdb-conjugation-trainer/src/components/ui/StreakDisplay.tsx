import React from 'react';

interface StreakDisplayProps {
  streak: number;
  threshold?: number;
  baseFontSize?: number;
  style?: React.CSSProperties;
}

export function StreakDisplay({ 
  streak, 
  threshold = 3, 
  baseFontSize = 20,
  style 
}: StreakDisplayProps) {
  if (streak < threshold) return null;

  return (
    <div id="streak-display" style={{ marginTop: '20px', textAlign: 'center', ...style }}>
      <span
        id="streak-count"
        style={{ fontSize: `${baseFontSize + streak}px` }}
      >
        🔥 {streak}
      </span>
    </div>
  );
}
