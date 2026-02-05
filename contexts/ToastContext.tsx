import React, { createContext, useState, useContext, ReactNode, useCallback, useMemo, useEffect } from 'react';
import Toast from '../components/shared/Toast.tsx';

type ToastMessage = {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
};

interface ToastContextType {
  addToast: (message: string, type: ToastMessage['type']) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Counter to ensure unique IDs even when multiple toasts are added in the same millisecond
let toastIdCounter = 0;

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastMessage['type']) => {
    const id = Date.now() * 1000 + (toastIdCounter++ % 1000);
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
    
    // ✅ إزالة التنبيه تلقائياً بعد 5 ثوانٍ
    setTimeout(() => {
      setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  // ✅ useMemo لمنع re-renders غير ضرورية
  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-24 right-5 z-[100] space-y-2 no-print">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};