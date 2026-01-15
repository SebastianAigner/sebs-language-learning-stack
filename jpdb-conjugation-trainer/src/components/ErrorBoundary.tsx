import type { ReactNode } from 'react';
import { Component } from 'react';
import { produce } from 'immer';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';
import { Card } from './ui/Card';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState(prev => produce(prev, draft => {
      draft.error = error;
      draft.errorInfo = errorInfo.componentStack ?? null;
    }));
  }

  handleReset = () => {
    this.setState(prev => produce(prev, draft => {
      draft.hasError = false;
      draft.error = null;
      draft.errorInfo = null;
    }));
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
          <Alert variant="error" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>Something went wrong</h2>
            <p style={{ fontSize: '16px', marginBottom: '0' }}>
              The application encountered an unexpected error. You can try reloading the page.
            </p>
          </Alert>

          {this.state.error ? <details open style={{
              backgroundColor: '#f7fafc',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              cursor: 'pointer'
            }}>
              <summary style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                Error details
              </summary>
              <pre style={{
                fontSize: '12px',
                overflow: 'auto',
                padding: '10px',
                backgroundColor: '#2d3748',
                color: '#e2e8f0',
                borderRadius: '6px'
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo !== null && this.state.errorInfo !== '' ? `\n\n${this.state.errorInfo}` : null}
              </pre>
            </details> : null}

          <Button
            onClick={this.handleReset}
            variant="primary"
            style={{ padding: '12px 24px', fontSize: '16px', fontWeight: 'bold' }}
          >
            Reload Application
          </Button>
        </Card>
      );
    }

    return this.props.children;
  }
}
