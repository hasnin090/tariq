import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = 'تأكيد',
    cancelText = 'إلغاء',
    variant = 'danger'
}) => {
  if (!isOpen) return null;

  const confirmButtonColorClasses = {
      danger: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500',
      primary: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500'
  };

  const iconColorClasses = {
      danger: 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
      primary: 'bg-primary-100 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400'
  }
  
  const Icon = () => {
      if (variant === 'danger') {
          return (
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          );
      }
      return (
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.546-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 no-print animate-fade-in pt-20" onClick={onClose}>
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-white/20 dark:border-slate-700/50 animate-scale-up my-16" onClick={e => e.stopPropagation()}>
        <div className="sm:flex sm:items-start">
          <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${iconColorClasses[variant]} sm:mx-0 sm:h-10 sm:w-10`}>
            <Icon />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:mr-4 sm:text-right">
            <h3 className="text-xl leading-6 font-bold text-slate-900 dark:text-slate-100">{title}</h3>
            <div className="mt-2">
              <div className="text-base text-slate-600 dark:text-slate-300 space-y-2">{message}</div>
            </div>
          </div>
        </div>
        <div className="mt-6 sm:mt-8 sm:flex sm:flex-row-reverse gap-3">
          <button
            type="button"
            className={`w-full inline-flex justify-center rounded-xl border border-transparent shadow-lg shadow-rose-500/20 px-6 py-2.5 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto sm:text-sm transition-all duration-200 ${confirmButtonColorClasses[variant]}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-xl border border-slate-300 dark:border-slate-600 shadow-sm px-6 py-2.5 bg-white dark:bg-slate-700 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm transition-all duration-200"
            onClick={onClose}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;