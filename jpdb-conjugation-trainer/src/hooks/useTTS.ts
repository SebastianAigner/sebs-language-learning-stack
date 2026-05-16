import { useState, useCallback } from 'react';
import { useAudio } from '../lib/audio-unlock';

interface UseTTSOptions {
  ttsServiceUrl: string;
}

interface TTSError {
  message: string;
  timestamp: number;
}

interface RegenerateTTSResponse {
  url: string;
}

export function useTTS({ ttsServiceUrl }: UseTTSOptions) {
  const [ttsError, setTtsError] = useState<TTSError | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { playStreamingAudio } = useAudio();

  const clearError = useCallback(() => {
    setTtsError(null);
  }, []);

  const showError = useCallback((message: string) => {
    setTtsError({ message, timestamp: Date.now() });
    setTimeout(() => setTtsError(null), 3000);
  }, []);

  const playTTS = useCallback(async (text: string, previousText?: string, suffixText?: string) => {
    try {
      let url = `${ttsServiceUrl}/tts?text=${encodeURIComponent(text)}`;
      if (previousText !== undefined && previousText !== '') {
        url += `&previous_text=${encodeURIComponent(previousText)}`;
      }
      if (suffixText !== undefined) {
        url += `&suffix_text=${encodeURIComponent(suffixText)}`;
      }
      await playStreamingAudio(url, { volume: 0.7 });
    } catch (error) {
      console.warn('TTS playback failed:', error);
      showError('Failed to play pronunciation audio');
      throw error;
    }
  }, [ttsServiceUrl, playStreamingAudio, showError]);

  const regenerateTTS = useCallback(async (text: string, previousText?: string, suffixText?: string) => {
    setIsRegenerating(true);
    try {
      const requestBody: { text: string; previous_text?: string; suffix_text?: string } = { text };
      if (previousText !== undefined && previousText !== '') {
        requestBody.previous_text = previousText;
      }
      if (suffixText !== undefined) {
        requestBody.suffix_text = suffixText;
      }

      const response = await fetch(`${ttsServiceUrl}/api/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate TTS');
      }

      const data = await response.json() as RegenerateTTSResponse;
      const audioUrl = `${ttsServiceUrl}${data.url}`;
      await playStreamingAudio(audioUrl, { volume: 0.7 });
    } catch (error) {
      console.warn('TTS regeneration failed:', error);
      showError('Failed to regenerate audio');
      throw error;
    } finally {
      setIsRegenerating(false);
    }
  }, [ttsServiceUrl, playStreamingAudio, showError]);

  const replayTTS = useCallback(async (text: string, previousText?: string, suffixText?: string) => {
    try {
      await playTTS(text, previousText, suffixText);
    } catch {
      // Error already handled by playTTS
    }
  }, [playTTS]);

  return {
    ttsError,
    isRegenerating,
    playTTS,
    regenerateTTS,
    replayTTS,
    clearError
  };
}
