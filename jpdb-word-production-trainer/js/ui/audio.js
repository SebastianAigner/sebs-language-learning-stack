import { CONFIG } from '../config.js';

// Audio playback for feedback

// Play correct answer sound
export function playCorrectSound() {
  try {
    const audio = new Audio('audio/correct.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => {
      console.warn('Failed to play correct sound:', err);
    });
  } catch (error) {
    console.warn('Error creating audio:', error);
  }
}

// Play wrong answer sound
export function playWrongSound() {
  try {
    const audio = new Audio('audio/wrong.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => {
      console.warn('Failed to play wrong sound:', err);
    });
  } catch (error) {
    console.warn('Error creating audio:', error);
  }
}

// Play TTS for the given text
export function playTTS(text, prefixText = '', suffixText = '') {
  if (!text) return;
  
  try {
    const baseUrl = CONFIG.TTS_BASE_URL.replace(/\/$/, ''); // Remove trailing slash if any
    let url = `${baseUrl}/tts?text=${encodeURIComponent(text)}`;
    const trimmedPrefixText = prefixText.trim();
    if (trimmedPrefixText) {
      url += `&previous_text=${encodeURIComponent(trimmedPrefixText)}`;
    }
    const trimmedSuffixText = suffixText.trim();
    if (trimmedSuffixText) {
      url += `&suffix_text=${encodeURIComponent(trimmedSuffixText)}`;
    }
    const audio = new Audio(url);
    audio.volume = 1.0;
    audio.play().catch(err => {
      console.warn('Failed to play TTS:', err);
    });
  } catch (error) {
    console.warn('Error playing TTS:', error);
  }
}
