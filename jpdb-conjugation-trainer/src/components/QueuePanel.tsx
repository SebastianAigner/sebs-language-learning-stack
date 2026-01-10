import { memo } from 'react';
import { useUI } from '../contexts/UIContext';
import { Controls } from './Controls';
import { SettingsPanel } from './SettingsPanel';
import { SystemSettingsPanel } from './SystemSettingsPanel';
import { DebugSettingsPanel } from './DebugSettingsPanel';

export const QueuePanel = memo(function QueuePanel() {
  const { ui } = useUI();

  return (
    <div id="queue-panel">
      <Controls />
      <SettingsPanel />
      <SystemSettingsPanel />
      <DebugSettingsPanel rawOutput={ui.rawOutput} />
    </div>
  );
});
