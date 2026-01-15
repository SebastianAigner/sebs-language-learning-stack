import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Card } from '../components/ui/Card';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  stack?: string;
  duration?: number;
}

interface ConfirmDialog {
  id: string;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface NotificationContextType {
  showNotification: (type: Notification['type'], message: string, duration?: number, stack?: string) => void;
  showConfirm: (title: string, message: string) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [archive, setArchive] = useState<Notification[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);

  // Counter to ensure unique IDs even in the same millisecond
  const idCounter = useRef(0);
  // Last message tracker to prevent spam/loops
  const lastNotification = useRef<{ message: string; timestamp: number } | null>(null);

  const showNotification = useCallback((type: Notification['type'], message: string, duration: number = 5000, stack?: string) => {
    // Basic protection against notification loops/spam
    const now = Date.now();
    if (
      lastNotification.current?.message === message &&
      now - lastNotification.current.timestamp < 500 // Don't show same message within 500ms
    ) {
      return;
    }
    lastNotification.current = { message, timestamp: now };

    const id = `notification-${now}-${idCounter.current++}-${Math.random()}`;
    const notification: Notification = { id, type, message, duration, stack };

    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => {
          const notificationToRemove = prev.find(n => n.id === id);
          if (notificationToRemove) {
            setArchive(prevArchive => [notificationToRemove, ...prevArchive]);
          }
          return prev.filter(n => n.id !== id);
        });
      }, duration);
    }
  }, []);

  // Global error handler for uncaught exceptions
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      event.preventDefault();
      const error = event.error as Error | undefined;
      showNotification(
        'error',
        event.message,
        10000,
        error?.stack
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      const reason = event.reason as Error | undefined;
      showNotification(
        'error',
        `Unhandled Promise Rejection: ${String(event.reason)}`,
        10000,
        reason?.stack
      );
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [showNotification]);

  const showConfirm = useCallback((title: string, message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = `confirm-${Date.now()}`;
      setConfirmDialog({
        id,
        title,
        message,
        onConfirm: () => {
          setConfirmDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmDialog(null);
          resolve(false);
        }
      });
    });
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const notificationToRemove = prev.find(n => n.id === id);
      if (notificationToRemove) {
        setArchive(prevArchive => [notificationToRemove, ...prevArchive]);
      }
      return prev.filter(n => n.id !== id);
    });
  }, []);

  const value = useMemo(() => ({
    showNotification,
    showConfirm
  }), [showNotification, showConfirm]);

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* Notification toasts */}
      {notifications.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '400px'
        }}>
          {notifications.map(notification => (
            <Alert
              key={notification.id}
              variant={notification.type}
              style={{
                margin: 0,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                lineHeight: '1.5'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ flex: 1 }}>{notification.message}</span>
                <Button
                  variant="icon"
                  onClick={() => dismissNotification(notification.id)}
                  style={{
                    border: 'none',
                    fontSize: '18px',
                    width: 'auto',
                    height: 'auto',
                    padding: '0 4px',
                    color: 'inherit',
                    opacity: 0.7
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                >
                  ×
                </Button>
              </div>
              {notification.stack !== undefined && notification.stack !== '' ? <details style={{ marginTop: '4px' }}>
                  <summary style={{ cursor: 'pointer', fontSize: '12px', opacity: 0.8 }}>Stack trace</summary>
                  <pre style={{
                    marginTop: '8px',
                    padding: '8px',
                    background: 'rgba(0,0,0,0.05)',
                    borderRadius: '4px',
                    fontSize: '10px',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
                    {notification.stack}
                  </pre>
                </details> : null}
            </Alert>
          ))}
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmDialog ? <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001
        }}>
          <Card style={{ maxWidth: '400px', width: '90%', padding: '24px' }}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '18px',
              fontWeight: 600,
              color: '#1a202c'
            }}>
              {confirmDialog.title}
            </h3>
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '14px',
              color: '#4a5568',
              lineHeight: '1.5'
            }}>
              {confirmDialog.message}
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <Button variant="secondary" onClick={confirmDialog.onCancel}>
                Cancel
              </Button>
              <Button variant="primary" onClick={confirmDialog.onConfirm}>
                Confirm
              </Button>
            </div>
          </Card>
        </div> : null}

      {/* Toast Archive Sidebar */}
      <div className="toast-sidebar-container">
        <div className={`toast-sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
          <Button
            variant="icon"
            className="toast-sidebar-handle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label={isSidebarOpen ? "Close sidebar" : "Open notification archive"}
            style={{ border: 'none' }}
          >
            {isSidebarOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            )}
          </Button>

          <div className="toast-sidebar-header">
            <span className="toast-sidebar-title">Notification Archive</span>
            <Button
              variant="icon"
              className="toast-sidebar-close"
              onClick={() => setIsSidebarOpen(false)}
              style={{ border: 'none', width: '24px', height: '24px' }}
            >
              ×
            </Button>
          </div>

          <div className="toast-sidebar-content">
            {archive.length === 0 ? (
              <div className="archive-toast-empty">
                No notifications yet.
              </div>
            ) : (
              archive.map(item => (
                <div key={item.id} className={`archive-toast-item ${item.type}`}>
                  {item.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </NotificationContext.Provider>
  );
}
