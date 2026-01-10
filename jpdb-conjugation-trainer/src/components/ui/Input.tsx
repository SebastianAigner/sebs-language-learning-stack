import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = '', id, style, children: _children, ...props }, ref) => {
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
        <input
          ref={ref}
          id={id}
          className={className}
          style={{
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
);

Input.displayName = 'Input';
