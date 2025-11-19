import React from 'react';
import Modal from './Modal';
import { DownloadIcon } from './Icons';

interface DocumentViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
    fileName: string;
    mimeType?: string;
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ isOpen, onClose, url, fileName, mimeType }) => {
    const isImage = mimeType?.startsWith('image/') || url.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    const isPdf = mimeType === 'application/pdf' || url.match(/\.pdf$/i);

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={fileName} 
            size="xl"
            footer={
                <div className="flex justify-end">
                    <a 
                        href={url} 
                        download={fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        <DownloadIcon className="h-5 w-5" />
                        <span>تحميل الملف</span>
                    </a>
                </div>
            }
        >
            <div className="flex items-center justify-center min-h-[60vh] bg-slate-100 dark:bg-slate-900/50 rounded-xl overflow-hidden">
                {isImage ? (
                    <img src={url} alt={fileName} className="max-w-full max-h-[70vh] object-contain" />
                ) : isPdf ? (
                    <iframe src={url} className="w-full h-[70vh]" title={fileName}></iframe>
                ) : (
                    <div className="text-center p-8">
                        <p className="text-slate-500 dark:text-slate-400 mb-4">لا يمكن معاينة هذا النوع من الملفات مباشرة.</p>
                        <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:underline"
                        >
                            فتح في نافذة جديدة
                        </a>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default DocumentViewerModal;
