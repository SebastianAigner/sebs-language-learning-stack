import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function TextArea({ label, className = '', id, style, children: _children, ...props }: TextAreaProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      {label && (
        <label 
          htmlFor={id} 
          style={{ 
            display: 'block', 
            marginBottom: '5px', 
            fontWeight: 'bold',
            fontSize: '14px',
            color: '#4a5568',
            textAlign: 'left'
          }}
        >
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={className}
        style={{ 
          width: '100%',
          padding: '8px',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          fontFamily: 'inherit',
          ...style 
        }}
        {...props}
      />
    </div>
  );
}
