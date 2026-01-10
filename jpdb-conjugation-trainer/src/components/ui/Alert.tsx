import React from 'react';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'error' | 'warning' | 'info' | 'success';
  className?: string;
  style?: React.CSSProperties;
}

export function Alert({ 
  children, 
  variant = 'info', 
  className = '',
  style
}: AlertProps) {
  const variantStyles: Record<string, React.CSSProperties> = {
    error: {
      background: '#fed7d7',
      color: '#742a2a',
    },
    warning: {
      background: '#feebc8',
      color: '#744210',
    },
    info: {
      background: '#ebf8ff',
      color: '#2a4365',
    },
    success: {
      background: '#f0fff4',
      color: '#22543d',
    }
  };

  return (
    <div 
      style={{
        padding: '12px',
        borderRadius: '6px',
        marginBottom: '15px',
        fontSize: '14px',
        ...variantStyles[variant],
        ...style
      }}
      className={`alert alert-${variant} ${className}`}
    >
      {children}
    </div>
  );
}
