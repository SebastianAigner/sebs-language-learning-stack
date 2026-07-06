import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AudioUnlockProvider, AudioProvider } from './lib/audio-unlock';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <AudioUnlockProvider storageKey="vocab-flashcards-audio">
      <AudioProvider>
        <App />
      </AudioProvider>
    </AudioUnlockProvider>
  </StrictMode>
);
