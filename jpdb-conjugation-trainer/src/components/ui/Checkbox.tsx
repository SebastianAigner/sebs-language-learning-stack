import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Checkbox({ label, className = '', id, children, style, ...props }: CheckboxProps) {
  return (
    <label 
      className={className.includes('settings-toggle') ? className : `checkbox-label ${className}`} 
      style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', ...style }}
    >
      <input
        id={id}
        type="checkbox"
        {...props}
      />
      {label && <span style={{ fontSize: '14px' }}>{label}</span>}
      {children}
    </label>
  );
}
