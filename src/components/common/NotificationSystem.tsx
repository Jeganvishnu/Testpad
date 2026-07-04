import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X, Mail } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification after duration (default 5 seconds)
    if (notification.duration !== 0) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration || 5000);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      addNotification, 
      removeNotification, 
      clearAll 
    }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div 
      className="fixed top-4 right-4 z-[9999] space-y-3 max-w-sm w-full"
      style={{ 
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 9999,
        pointerEvents: 'none'
      }}
    >
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

const NotificationToast: React.FC<{
  notification: Notification;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (notification.type) {
      case 'success':
        return 'border-l-green-500';
      case 'error':
        return 'border-l-red-500';
      case 'warning':
        return 'border-l-yellow-500';
      case 'info':
      default:
        return 'border-l-blue-500';
    }
  };

  return (
    <div 
      className={`max-w-sm w-full bg-white shadow-xl rounded-lg pointer-events-auto border-l-4 ${getBorderColor()} animate-slide-in backdrop-blur-sm`}
      style={{
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid rgba(0, 0, 0, 0.05)'
      }}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">
              {notification.title}
            </p>
            <p className="mt-1 text-sm text-gray-600 leading-relaxed">
              {notification.message}
            </p>
            {notification.action && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={notification.action.onClick}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200 underline underline-offset-2"
                >
                  {notification.action.label}
                </button>
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              type="button"
              className="rounded-full p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none transition-all duration-200"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Utility functions for common notifications
export const useCommonNotifications = () => {
  const { addNotification } = useNotification();

  return {
    showSuccess: (title: string, message: string, action?: Notification['action']) => {
      addNotification({ type: 'success', title, message, action });
    },
    
    showError: (title: string, message: string, action?: Notification['action']) => {
      addNotification({ type: 'error', title, message, action, duration: 8000 });
    },
    
    showInfo: (title: string, message: string, action?: Notification['action']) => {
      addNotification({ type: 'info', title, message, action });
    },
    
    showWarning: (title: string, message: string, action?: Notification['action']) => {
      addNotification({ type: 'warning', title, message, action });
    },

    showEmailSent: (email: string) => {
      addNotification({
        type: 'success',
        title: 'Verification Email Sent!',
        message: `We've sent a verification link to ${email}. Please check your inbox and spam folder.`,
        duration: 8000,
        action: {
          label: 'Resend Email',
          onClick: () => {
            // This will be handled by the component
          }
        }
      });
    },

    showEmailVerified: () => {
      addNotification({
        type: 'success',
        title: 'Email Verified Successfully!',
        message: 'Your email has been verified. You now have full access to all features.',
        duration: 6000
      });
    }
  };
};
