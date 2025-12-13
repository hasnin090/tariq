import React, { useEffect, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';

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
    topOffset?: string; // مثل 'pt-8' أو 'pt-12' للتحكم في الحاشية العلوية
}

const sizeClasses: Record<ModalSize, string> = {
    sm: 'max-w-md',      // 448px - للنوافذ الصغيرة
    md: 'max-w-lg',      // 512px - للنوافذ المتوسطة
    lg: 'max-w-3xl',     // 768px - للنوافذ الكبيرة
    xl: 'max-w-5xl',     // 1024px - للنوافذ الضخمة
    full: 'w-full h-full rounded-none',
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', footer, preventCloseOnBackdrop = false, noPadding = false, topOffset = 'pt-20' }) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    // 🎬 GSAP Modal Animation
    useLayoutEffect(() => {
        if (isOpen && overlayRef.current && modalRef.current) {
            const tl = gsap.timeline();
            
            // Animate overlay
            tl.fromTo(overlayRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.25, ease: "power2.out" }
            );
            // Animate modal
            tl.fromTo(modalRef.current,
                { 
                    opacity: 0, 
                    scale: 0.85, 
                    y: 30,
                    rotateX: 10
                },
                { 
                    opacity: 1, 
                    scale: 1, 
                    y: 0,
                    rotateX: 0,
                    duration: 0.35, 
                    ease: "back.out(1.5)"
                },
                0.05
            );
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBackdrop = () => {
        if (!preventCloseOnBackdrop) onClose();
    };

    const containerSize = size === 'full' ? sizeClasses.full : `w-full ${sizeClasses[size]} mx-4`;

    return (
        <div ref={overlayRef} className={`fixed inset-0 z-[60] bg-slate-900/75 backdrop-blur-md flex items-start justify-center ${topOffset} pb-8 overflow-y-auto`} onClick={handleBackdrop} role="dialog" aria-modal="true" style={{ perspective: '1000px' }}>
            <div ref={modalRef} className={`${containerSize} backdrop-blur-2xl bg-gradient-to-br from-white/15 to-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] border border-white/20 ${size === 'full' ? 'h-[calc(100vh-4rem)] my-8' : 'rounded-3xl max-h-[calc(100vh-10rem)]'} flex flex-col transform transition-all overflow-hidden`} onClick={e => e.stopPropagation()}>
                {title && (
                    <div className="px-6 sm:px-8 py-5 border-b border-white/20 flex items-center justify-between bg-gradient-to-br from-white/10 to-transparent backdrop-blur-sm flex-shrink-0">
                        <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)] tracking-tight">{title}</h2>
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-rose-500/30 hover:text-rose-100 transition-all duration-300 shadow-lg backdrop-blur-sm border border-white/20 hover:border-rose-400/50 hover:scale-110 active:scale-95"
                        >
                            <span className="sr-only">Close</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
                <div className={`${noPadding ? 'p-0' : 'px-6 sm:px-8 py-6'} scrollbar-thin scrollbar-thumb-white/20 hover:scrollbar-thumb-white/30 scrollbar-track-white/5 flex-1 overflow-y-auto text-white`}>
                    {children}
                </div>
                {footer && (
                    <div className="px-6 sm:px-8 py-5 border-t border-white/20 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm flex-shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
