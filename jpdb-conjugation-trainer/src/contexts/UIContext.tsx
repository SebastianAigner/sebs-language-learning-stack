import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback } from 'react';
import { produce } from 'immer';

interface UIState {
  tutorialMode: boolean;
  showDebug: boolean;
  rawOutput?: string;
}

interface UIContextValue {
  ui: UIState;

  // UI Preferences
  setTutorialMode: (enabled: boolean) => void;
  setShowDebug: (show: boolean) => void;

  // Debugging
  setRawOutput: (output: string) => void;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [ui, setUI] = useState<UIState>(() => {
    // Load tutorial mode from localStorage
    const savedTutorialMode = localStorage.getItem('jpdb-conjugation-trainer-tutorial-mode');
    const tutorialMode = savedTutorialMode ? JSON.parse(savedTutorialMode) : false;

    return {
      tutorialMode,
      showDebug: false
    };
  });

  const updateUI = useCallback((updater: (draft: UIState) => void) => {
    setUI(prev => produce(prev, updater));
  }, []);

  const setTutorialMode = useCallback((enabled: boolean) => {
    updateUI(draft => {
      draft.tutorialMode = enabled;
    });
    localStorage.setItem('jpdb-conjugation-trainer-tutorial-mode', JSON.stringify(enabled));
  }, [updateUI]);

  const setShowDebug = useCallback((show: boolean) => {
    updateUI(draft => {
      draft.showDebug = show;
    });
  }, [updateUI]);

  const setRawOutput = useCallback((output: string) => {
    updateUI(draft => {
      draft.rawOutput = output;
    });
  }, [updateUI]);

  const value: UIContextValue = {
    ui,
    setTutorialMode,
    setShowDebug,
    setRawOutput
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
}
