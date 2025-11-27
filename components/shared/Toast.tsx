import React, { useState, useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for fade-out animation
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const baseStyle = "flex items-center w-full max-w-sm p-4 text-white rounded-2xl shadow-2xl backdrop-blur-xl border border-white/20 transition-all duration-300 ease-in-out transform hover:scale-[1.01]";
  const typeStyles = {
    success: 'bg-emerald-500/90 shadow-emerald-500/20',
    error: 'bg-rose-500/90 shadow-rose-500/20',
    info: 'bg-sky-500/90 shadow-sky-500/20',
  };
  const animationStyle = visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0';

  const SuccessIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
  const ErrorIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>;

  return (
    <div className={`${baseStyle} ${typeStyles[type]} ${animationStyle}`} role="alert">
        <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-white bg-opacity-20">
            {type === 'success' ? <SuccessIcon /> : <ErrorIcon />}
        </div>
        <div className="ml-3 mr-3 text-sm font-medium">{message}</div>
        <button type="button" className="ml-auto -mx-1.5 -my-1.5 rounded-lg focus:ring-2 focus:ring-white p-1.5 hover:bg-white hover:bg-opacity-20 inline-flex h-8 w-8" onClick={onClose} aria-label="Close">
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
        </button>
    </div>
  );
};
export default Toast;