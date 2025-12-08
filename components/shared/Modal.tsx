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
    noPadding?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'w-full h-full rounded-none',
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', footer, preventCloseOnBackdrop = false, noPadding = false }) => {
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
        <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in" onClick={handleBackdrop} role="dialog" aria-modal="true">
            <div className={`${containerSize} backdrop-blur-xl bg-white/10 shadow-2xl border border-white/20 ${size === 'full' ? 'h-[calc(100vh-8rem)] my-16' : 'rounded-2xl max-h-[calc(100vh-8rem)] my-16'} flex flex-col transform transition-all animate-scale-up`} onClick={e => e.stopPropagation()}>
                {title && (
                    <div className="px-4 sm:px-6 py-4 border-b border-white/20 flex items-center justify-between bg-gradient-to-br from-white/10 to-white/5 rounded-t-2xl flex-shrink-0">
                        <h2 className="text-lg sm:text-xl font-bold text-white drop-shadow-lg">{title}</h2>
                        <button type="button" onClick={onClose} className="p-2 rounded-full bg-white/10 text-white hover:bg-rose-500/30 hover:text-rose-200 transition-all duration-200 shadow-lg backdrop-blur-sm border border-white/20 hover:border-rose-400/50">
                            <span className="sr-only">Close</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                )}
                <div className={`${noPadding ? 'p-0' : 'px-4 sm:px-6 py-4'} scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent flex-1 overflow-y-auto text-slate-100`}>
                    {children}
                </div>
                {footer && (
                    <div className="px-4 sm:px-6 py-4 border-t border-white/20 bg-gradient-to-br from-white/5 to-white/10 rounded-b-2xl flex-shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
