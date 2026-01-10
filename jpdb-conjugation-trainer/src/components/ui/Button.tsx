import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'icon' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  size: _size = 'md',
  style,
  ...props
}: ButtonProps) {
  const isIcon = variant === 'icon';
  
  // Base classes that already exist in styles.css
  const variantClass = !isIcon && variant !== 'ghost' ? variant : '';
  
  // For icon buttons, we'll provide some default styles if not overridden
  const iconStyle: React.CSSProperties = isIcon ? {
    background: 'none',
    border: '2px solid #4CAF50',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  } : {};

  const combinedStyle = { ...iconStyle, ...style };

  const combinedClassName = [
    isIcon ? 'icon-btn' : '',
    variantClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <button 
      className={combinedClassName} 
      style={combinedStyle}
      {...props}
    >
      {children}
    </button>
  );
}
