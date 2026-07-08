import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AudioUnlockProvider, AudioProvider } from '@sebs/audio-unlock';
import { installDebugConsole, DebugConsole } from './lib/debug-console';
import './styles.css';

// Capture console output and uncaught errors as early as possible so they can
// be surfaced on-device (the app runs on an iPad, where devtools aren't handy).
installDebugConsole();

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <AudioUnlockProvider storageKey="vocab-flashcards-audio">
      <AudioProvider>
        <App />
        <DebugConsole />
      </AudioProvider>
    </AudioUnlockProvider>
  </StrictMode>
);
