import { useState, useEffect } from 'react';

const CHECK_INTERVAL = 60000; // Check every minute

interface TTSStatusIndicatorProps {
  ttsServiceUrl: string;
}

export function TTSStatusIndicator({ ttsServiceUrl }: TTSStatusIndicatorProps) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

        const response = await fetch(`${ttsServiceUrl}/health`, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          setIsOnline(true);
        } else {
          setIsOnline(false);
        }
      } catch (error) {
        setIsOnline(false);
      }
    };

    // Check immediately on mount
    void checkStatus();

    // Then check periodically
    const interval = setInterval(() => {
      void checkStatus();
    }, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [ttsServiceUrl]);

  if (isOnline === null) {
    return null; // Don't show anything while initial check is pending
  }

  return (
    <a
      href={ttsServiceUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: 'white',
        textDecoration: 'none',
        cursor: 'pointer'
      }}
      title={isOnline ? 'TTS service online' : 'TTS service offline'}
    >
      {isOnline ? (
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#48bb78',
            boxShadow: '0 0 8px rgba(72, 187, 120, 0.6)',
            animation: 'pulse 2s ease-in-out infinite'
          }}
        />
      ) : (
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderBottom: '9px solid #f56565',
            filter: 'drop-shadow(0 0 4px rgba(245, 101, 101, 0.6))'
          }}
        />
      )}
      <span style={{ fontWeight: 500 }}>TTS</span>
    </a>
  );
}
