import React from 'react';
import Modal from './Modal';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'تأكيد',
    cancelText = 'إلغاء',
    type = 'danger'
}) => {
    if (!isOpen) return null;

    const typeStyles = {
        danger: {
            icon: '⚠️',
            confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white',
            iconBg: 'bg-rose-100 dark:bg-rose-900/30',
            iconColor: 'text-rose-600 dark:text-rose-400'
        },
        warning: {
            icon: '⚡',
            confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
            iconBg: 'bg-amber-100 dark:bg-amber-900/30',
            iconColor: 'text-amber-600 dark:text-amber-400'
        },
        info: {
            icon: 'ℹ️',
            confirmBtn: 'bg-primary-600 hover:bg-primary-700 text-white',
            iconBg: 'bg-primary-100 dark:bg-primary-900/30',
            iconColor: 'text-primary-600 dark:text-primary-400'
        }
    };

    const styles = typeStyles[type];

    return (
        <Modal isOpen={isOpen} onClose={onCancel} title="">
            <div className="text-center p-4">
                {/* أيقونة التحذير */}
                <div className={`mx-auto w-16 h-16 rounded-full ${styles.iconBg} flex items-center justify-center mb-4`}>
                    <span className="text-3xl">{styles.icon}</span>
                </div>

                {/* العنوان */}
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    {title}
                </h3>

                {/* الرسالة */}
                <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                    {message}
                </p>

                {/* الأزرار */}
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2.5 rounded-lg font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${styles.confirmBtn}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmDialog;
