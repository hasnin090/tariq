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
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6" onClick={handleBackdrop} role="dialog" aria-modal="true">
            <div className={`${containerSize} bg-white dark:bg-slate-800 shadow-2xl ${size === 'full' ? 'h-full' : 'rounded-xl'} flex flex-col`} onClick={e => e.stopPropagation()}>
                {title && (
                    <div className="px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
                        <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <span className="sr-only">Close</span>
                            ×
                        </button>
                    </div>
                )}
                <div className={`px-4 sm:px-6 py-4 ${size === 'full' ? 'flex-1 overflow-y-auto' : 'max-h-[78vh] overflow-y-auto'}`}>
                    {children}
                </div>
                {footer && (
                    <div className="px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-700">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
