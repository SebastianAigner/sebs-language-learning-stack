import { CONJUGATION_LABELS, CONJUGATION_EMOJIS } from '../../types';
import { Badge } from './Badge';

interface ConjugationBadgeProps {
  conjugationType: keyof typeof CONJUGATION_LABELS;
  showEmoji?: boolean;
  variant?: 'default' | 'outline' | 'pill';
  title?: string;
  style?: React.CSSProperties;
}

const colorizeLabel = (label: string) => {
  const withCasual = label.replace(
    /\(casual\)/gi,
    '<span style="color: #e53e3e; font-weight: 700;">(casual)</span>'
  );
  const withPolite = withCasual.replace(
    /\(polite\)/gi,
    '<span style="color: #2b6cb0; font-weight: 700;">(polite)</span>'
  );
  return withPolite;
};

export function ConjugationBadge({ 
  conjugationType, 
  showEmoji = true, 
  variant = 'default',
  title,
  style
}: ConjugationBadgeProps) {
  const label = CONJUGATION_LABELS[conjugationType];
  const emoji = CONJUGATION_EMOJIS[conjugationType];

  if (variant === 'pill') {
    return (
      <Badge variant="pill" style={style}>
        {showEmoji && (
          <div style={{ fontSize: '16px', letterSpacing: '2px' }}>
            {emoji}
          </div>
        )}
        <div
          style={{
            fontSize: '14px',
            fontStyle: 'italic',
            color: '#718096',
            fontWeight: 500
          }}
          dangerouslySetInnerHTML={{ __html: colorizeLabel(label) }}
        />
      </Badge>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', ...style }}>
      {showEmoji && (
        <div style={{ fontSize: '24px', marginBottom: '8px', letterSpacing: '4px' }}>
          {emoji}
        </div>
      )}
      <div
        className="target-form"
        dangerouslySetInnerHTML={{ __html: colorizeLabel(label) }}
        title={title}
        style={{ cursor: title ? 'help' : 'default' }}
      />
    </div>
  );
}
