import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
}

export function Card({ children, className = '', id, style }: CardProps) {
  return (
    <div 
      id={id}
      className={`card ${className}`} 
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0',
        ...style
      }}
    >
      {children}
    </div>
  );
}
