import React, { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';

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
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  // 🎬 GSAP Confirm Modal Animation
  useLayoutEffect(() => {
    if (isOpen && overlayRef.current && modalRef.current && iconRef.current) {
      const tl = gsap.timeline();
      
      // Animate overlay
      tl.fromTo(overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.2, ease: "power2.out" }
      );
      // Animate modal with bounce
      tl.fromTo(modalRef.current,
        { opacity: 0, scale: 0.6, y: -60 },
        { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "back.out(1.5)" },
        0.05
      );
      // Animate icon with shake effect
      tl.fromTo(iconRef.current,
        { rotation: -10, scale: 0 },
        { rotation: 0, scale: 1, duration: 0.4, ease: "elastic.out(1, 0.4)" },
        0.15
      );
    }
  }, [isOpen]);

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
            <svg className="h-7 w-7" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          );
      }
      return (
        <svg className="h-7 w-7" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.546-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[70] bg-slate-900/75 backdrop-blur-md flex justify-center items-center p-4 no-print" onClick={onClose}>
      <div ref={modalRef} className="backdrop-blur-2xl bg-gradient-to-br from-white/15 to-white/5 rounded-3xl p-8 w-full max-w-lg shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] border border-white/20" onClick={e => e.stopPropagation()}>
        <div className="sm:flex sm:items-start sm:gap-5">
          <div ref={iconRef} className={`mx-auto flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-2xl backdrop-blur-sm border-2 sm:mx-0 ${variant === 'danger' ? 'bg-rose-500/20 border-rose-400/50 text-rose-200' : 'bg-blue-500/20 border-blue-400/50 text-blue-200'}`}>
            <Icon />
          </div>
          <div className="mt-4 text-center sm:mt-0 sm:text-right flex-1">
            <h3 className="text-2xl leading-7 font-bold text-white drop-shadow-lg mb-3">{title}</h3>
            <div className="text-base leading-relaxed text-slate-200 space-y-2">{message}</div>
          </div>
        </div>
        <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            className="w-full sm:w-auto inline-flex justify-center items-center rounded-xl border border-white/30 shadow-lg px-6 py-3 bg-white/10 backdrop-blur-sm text-base font-semibold text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-300 hover:scale-105 active:scale-95"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`w-full sm:w-auto inline-flex justify-center items-center rounded-xl border border-transparent shadow-lg px-8 py-3 text-base font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 hover:scale-105 active:scale-95 ${variant === 'danger' ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 shadow-rose-500/40' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-blue-500/40'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;