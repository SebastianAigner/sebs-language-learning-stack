import { SessionProvider } from './contexts/SessionContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { UIProvider } from './contexts/UIContext';
import { AudioProvider, AudioUnlockProvider } from '@sebs/audio-unlock';
import { NotificationProvider } from './contexts/NotificationContext';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './routes';

export function App() {
  return (
    <AudioUnlockProvider storageKey="jpdb-audio-unlocked" unlockAudioUrl="/audio/correct.mp3">
      <AudioProvider>
        <NotificationProvider>
          <ConfigProvider>
            <SessionProvider>
              <UIProvider>
                <RouterProvider router={router} />
              </UIProvider>
            </SessionProvider>
          </ConfigProvider>
        </NotificationProvider>
      </AudioProvider>
    </AudioUnlockProvider>
  );
}
