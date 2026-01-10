import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'pill';
  style?: React.CSSProperties;
}

export function Badge({ children, className = '', variant = 'default', style }: BadgeProps) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: variant === 'pill' ? '20px' : '4px',
    fontSize: '0.875rem',
    fontWeight: 500,
    ...style
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      background: '#edf2f7',
      color: '#2d3748',
    },
    outline: {
      background: 'transparent',
      border: '1px solid #e2e8f0',
      color: '#4a5568',
    },
    pill: {
        background: 'white',
        padding: '6px 20px',
        border: '2px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px'
    }
  };

  return (
    <div className={`badge ${className}`} style={{ ...baseStyle, ...variantStyles[variant] }}>
      {children}
    </div>
  );
}
