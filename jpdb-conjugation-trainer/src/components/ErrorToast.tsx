import { memo } from 'react';
import { Button } from './ui/Button';

interface ErrorToastProps {
  message: string;
  stack?: string;
  onDismiss: () => void;
}

export const ErrorToast = memo(function ErrorToast({ message, stack, onDismiss }: ErrorToastProps) {
  return (
    <div className="error-toast">
      <div className="error-toast-header">
        <span className="error-toast-title">Uncaught Exception</span>
        <Button 
          variant="icon"
          className="error-toast-close" 
          onClick={onDismiss} 
          aria-label="Dismiss error"
          style={{ width: '24px', height: '24px', border: 'none' }}
        >
          ×
        </Button>
      </div>
      <div className="error-toast-body">
        <div className="error-toast-message">{message}</div>
        {stack && (
          <details className="error-toast-details">
            <summary>Stack trace</summary>
            <pre className="error-toast-stack">{stack}</pre>
          </details>
        )}
      </div>
    </div>
  );
});
