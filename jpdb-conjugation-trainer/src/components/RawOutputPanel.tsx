import { memo } from 'react';

interface RawOutputPanelProps {
  rawOutput?: string;
}

export const RawOutputPanel = memo(function RawOutputPanel({ rawOutput }: RawOutputPanelProps) {
  return (
    <div id="raw-output-panel">
      <details id="raw-output-section">
        <summary>Raw LLM Output</summary>
        <pre className="raw-output-content">{rawOutput || 'No output yet'}</pre>
      </details>
    </div>
  );
});
