import React, { useEffect } from 'react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: ModalSize;
    footer?: React.ReactNode;
    preventCloseOnBackdrop?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'w-full h-full rounded-none',
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', footer, preventCloseOnBackdrop = false }) => {
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleBackdrop = () => {
        if (!preventCloseOnBackdrop) onClose();
    };

    const containerSize = size === 'full' ? sizeClasses.full : `w-full ${sizeClasses[size]}`;

    return (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in" onClick={handleBackdrop} role="dialog" aria-modal="true">
            <div className={`${containerSize} bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl shadow-2xl border border-white/20 dark:border-slate-700/50 ${size === 'full' ? 'h-full' : 'rounded-2xl'} flex flex-col transform transition-all animate-scale-up`} onClick={e => e.stopPropagation()}>
                {title && (
                    <div className="px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 rounded-t-2xl">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
                        <button type="button" onClick={onClose} className="p-2 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                            <span className="sr-only">Close</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                )}
                <div className={`px-4 sm:px-6 py-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent ${size === 'full' ? 'flex-1 overflow-y-auto' : 'max-h-[78vh] overflow-y-auto'}`}>
                    {children}
                </div>
                {footer && (
                    <div className="px-4 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-2xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
