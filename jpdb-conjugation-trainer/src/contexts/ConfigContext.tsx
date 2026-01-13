import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { produce } from 'immer';
import type { ConfigState } from '../types';
import { loadConfig, saveConfig, loadBlacklist, saveBlacklist, loadAlwaysAddCards, saveAlwaysAddCards, loadAlwaysAddAdjectives, saveAlwaysAddAdjectives } from '../persistence';

interface ConfigContextValue {
  config: ConfigState;
  updateModel: (model: string) => void;
  updateAutoAdvance: (enabled: boolean) => void;
  updateApiBaseUrl: (url: string) => void;
  updateTtsServiceUrl: (url: string) => void;
  updateApiKey: (key: string) => void;
  updateReviewMode: (mode: ConfigState['reviewMode']) => void;
  updateBlacklist: (blacklist: string) => void;
  updateAlwaysAddVerbs: (verbs: string) => void;
  updateAlwaysAddAdjectives: (adjectives: string) => void;
}

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);

const DEFAULT_CONFIG: ConfigState = {
  model: 'x-ai/grok-4',
  apiKey: '',
  autoAdvance: false,
  apiBaseUrl: 'http://localhost:3000',
  ttsServiceUrl: 'http://localhost:5065',
  reviewMode: 'both',
  blacklist: '',
  alwaysAddVerbs: '',
  alwaysAddAdjectives: ''
};

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ConfigState>(() => {
    const saved = loadConfig();
    const blacklist = loadBlacklist();
    const alwaysAddVerbs = loadAlwaysAddCards();
    const alwaysAddAdjectives = loadAlwaysAddAdjectives();

    // Auto-detect API URL when served by backend (not on Vite dev server)
    const currentPort = window.location.port;
    const isViteDevServer = ['5173', '5174', '5175', '5176', '5177'].includes(currentPort);
    const autoDetectedUrl = isViteDevServer ? null : window.location.origin;

    return {
      ...DEFAULT_CONFIG,
      ...saved,
      apiBaseUrl: autoDetectedUrl || saved?.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl,
      blacklist,
      alwaysAddVerbs,
      alwaysAddAdjectives
    };
  });

  // Auto-save config whenever it changes (skip initial render)
  useEffect(() => {
    // Skip saving default config on mount
    if (config.model === 'x-ai/grok-4' && config.apiKey === '' && !config.autoAdvance && !config.blacklist && !config.alwaysAddVerbs && !config.alwaysAddAdjectives) {
      return;
    }

    saveConfig({
      model: config.model,
      autoAdvance: config.autoAdvance,
      apiBaseUrl: config.apiBaseUrl,
      ttsServiceUrl: config.ttsServiceUrl,
      reviewMode: config.reviewMode
    });

    saveBlacklist(config.blacklist);
    saveAlwaysAddCards(config.alwaysAddVerbs);
    saveAlwaysAddAdjectives(config.alwaysAddAdjectives);
  }, [config]);

  const updateConfig = useCallback((updater: (draft: ConfigState) => void) => {
    setConfig((prev: ConfigState) => produce(prev, updater));
  }, []);

  const updateModel = useCallback((model: string) => {
    updateConfig(draft => {
      draft.model = model;
    });
  }, [updateConfig]);

  const updateAutoAdvance = useCallback((enabled: boolean) => {
    updateConfig(draft => {
      draft.autoAdvance = enabled;
    });
  }, [updateConfig]);

  const updateApiBaseUrl = useCallback((url: string) => {
    updateConfig(draft => {
      draft.apiBaseUrl = url;
    });
  }, [updateConfig]);

  const updateTtsServiceUrl = useCallback((url: string) => {
    updateConfig(draft => {
      draft.ttsServiceUrl = url;
    });
  }, [updateConfig]);

  const updateApiKey = useCallback((key: string) => {
    updateConfig(draft => {
      draft.apiKey = key;
    });
  }, [updateConfig]);

  const updateReviewMode = useCallback((mode: ConfigState['reviewMode']) => {
    updateConfig(draft => {
      draft.reviewMode = mode;
    });
  }, [updateConfig]);

  const updateBlacklist = useCallback((blacklist: string) => {
    updateConfig(draft => {
      draft.blacklist = blacklist;
    });
  }, [updateConfig]);

  const updateAlwaysAddVerbs = useCallback((verbs: string) => {
    updateConfig(draft => {
      draft.alwaysAddVerbs = verbs;
    });
  }, [updateConfig]);

  const updateAlwaysAddAdjectives = useCallback((adjectives: string) => {
    updateConfig(draft => {
      draft.alwaysAddAdjectives = adjectives;
    });
  }, [updateConfig]);

  // Load API key on mount
  useEffect(() => {
    const loadApiKey = async () => {
      // Use environment variable (defined in vite.config.ts)
      if (process.env.OPENROUTER_API_KEY) {
        updateApiKey(process.env.OPENROUTER_API_KEY);
      }
    };

    void loadApiKey();
  }, [updateApiKey]);

  const value: ConfigContextValue = {
    config,
    updateModel,
    updateAutoAdvance,
    updateApiBaseUrl,
    updateTtsServiceUrl,
    updateApiKey,
    updateReviewMode,
    updateBlacklist,
    updateAlwaysAddVerbs,
    updateAlwaysAddAdjectives
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
}
