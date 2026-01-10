import { useConfig } from '../contexts/ConfigContext';
import { clearCache } from '../llmCache';
import { Input } from './ui/Input';

export function SystemSettingsPanel() {
  const { config, updateModel, updateApiBaseUrl, updateTtsServiceUrl } = useConfig();

  const standardModels = [
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4-turbo',
    'x-ai/grok-4',
    'google/gemini-3-pro-preview',
    'google/gemini-3-flash-preview',
    'google/gemini-3-flash-preview:xhigh',
    'openai/gpt-oss-120b:nitro',
    'openai/gpt-oss-120b:nitro:xhigh'
  ];

  const isCustomModel = !standardModels.includes(config.model);

  const handleModelChange = (value: string) => {
    if (value !== 'custom') {
      // Clear LLM cache when model changes
      clearCache();
      updateModel(value);
    }
  };

  const handleCustomModelBlur = (value: string) => {
    if (value.trim() && value.trim() !== config.model) {
      // Clear LLM cache when model changes
      clearCache();
      updateModel(value.trim());
    }
  };

  return (
    <details id="system-settings-panel">
      <summary>System</summary>
      <div id="system-settings-panel-content">
        <div className="settings-section">
          <Input
            label="JPDB Transcriber URL:"
            type="text"
            id="jpdb-url"
            value={config.apiBaseUrl}
            onChange={(e) => updateApiBaseUrl(e.target.value)}
            placeholder="http://localhost:3000"
          />
        </div>

        <div className="settings-section">
          <Input
            label="TTS Service URL:"
            type="text"
            id="tts-url"
            value={config.ttsServiceUrl}
            onChange={(e) => updateTtsServiceUrl(e.target.value)}
            placeholder="http://localhost:5065"
          />
        </div>

        <div className="settings-section">
          <div id="model-config">
            <label htmlFor="model-select" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#4a5568' }}>Model:</label>
            <select
              id="model-select"
              value={isCustomModel ? 'custom' : config.model}
              onChange={(e) => handleModelChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                fontFamily: 'inherit',
                marginBottom: isCustomModel ? '10px' : '0'
              }}
            >
              <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
              <option value="openai/gpt-4-turbo">GPT-4 Turbo</option>
              <option value="x-ai/grok-4">Grok 4</option>
              <option value="google/gemini-3-pro-preview">Gemini 3 Pro Preview</option>
              <option value="google/gemini-3-flash-preview">Gemini 3 Flash Preview</option>
              <option value="google/gemini-3-flash-preview:xhigh">Gemini 3 Flash Preview XHigh</option>
              <option value="openai/gpt-oss-120b:nitro">GPT-OSS 120B (Nitro)</option>
              <option value="openai/gpt-oss-120b:nitro:xhigh">GPT-OSS 120B (Nitro, xhigh reasoning)</option>
              <option value="custom">Custom</option>
            </select>
            {isCustomModel && (
              <Input
                type="text"
                id="custom-model"
                placeholder="Enter custom model..."
                defaultValue={config.model}
                onBlur={(e) => handleCustomModelBlur(e.target.value)}
              />
            )}
          </div>
        </div>
      </div>
    </details>
  );
}
