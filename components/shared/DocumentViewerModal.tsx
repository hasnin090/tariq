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
    // Helper to check extension from filename or URL (ignoring query params)
    const checkExtension = (str: string, exts: string[]) => {
        if (!str) return false;
        // Remove query params if present
        const cleanStr = str.split('?')[0].toLowerCase();
        return exts.some(ext => cleanStr.endsWith(ext));
    };

    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const isImage = mimeType?.startsWith('image/') || checkExtension(fileName, imageExts) || checkExtension(url, imageExts);
    
    const isPdf = mimeType === 'application/pdf' || checkExtension(fileName, ['.pdf']) || checkExtension(url, ['.pdf']);

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={fileName} 
            size="xl"
            noPadding={true}
            footer={
                <div className="flex justify-end">
                    <a 
                        href={url} 
                        download={fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-gradient-to-r from-accent to-amber-500 text-white px-4 py-2 rounded-lg hover:from-amber-500 hover:to-accent transition-all duration-300 shadow-lg"
                    >
                        <DownloadIcon className="h-5 w-5" />
                        <span>تحميل الملف</span>
                    </a>
                </div>
            }
        >
            <div className="flex items-center justify-center bg-white/5 backdrop-blur-sm rounded-lg">
                {isImage ? (
                    <img src={url} alt={fileName} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
                ) : isPdf ? (
                    <iframe src={url} className="w-full h-[80vh] rounded-lg" title={fileName}></iframe>
                ) : (
                    <div className="text-center p-12">
                        <p className="text-slate-200 mb-6 text-lg">لا يمكن معاينة هذا النوع من الملفات مباشرة.</p>
                        <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-6 py-3 border border-white/30 text-base font-medium rounded-lg text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-300"
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
