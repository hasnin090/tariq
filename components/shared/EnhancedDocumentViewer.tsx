import React, { useState, useEffect } from 'react';
import { Document } from '../../types';
import { documentsService } from '../../src/services/supabaseService';
import { CloseIcon } from './Icons';
import { formatFileSize, getFileIcon, canPreviewFile } from '../../types/documentTypes';

interface EnhancedDocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  onNavigate?: (direction: 'prev' | 'next') => void;
  canNavigate?: { prev: boolean; next: boolean };
}

const EnhancedDocumentViewer: React.FC<EnhancedDocumentViewerProps> = ({
  isOpen,
  onClose,
  document,
  onNavigate,
  canNavigate
}) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string>('');

  useEffect(() => {
    if (document && isOpen) {
      loadDocument();
    }
  }, [document, isOpen]);

  const loadDocument = async () => {
    if (!document) return;

    setIsLoading(true);
    setError(null);

    try {
      // Check if document already has a valid URL
      if (document.publicUrl) {
        setSignedUrl(document.publicUrl);
      } else {
        // Generate new signed URL (valid for 24 hours)
        const url = await documentsService.getSignedUrl(document.storagePath, 86400);
        setSignedUrl(url);
      }
    } catch (err) {
      setError('فشل في تحميل المستند. الرجاء المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoom(100);
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleDownload = () => {
    if (!signedUrl || !document) return;
    
    const link = window.document.createElement('a');
    link.href = signedUrl;
    link.download = document.fileName;
    link.click();
  };

  const handlePrint = () => {
    if (!signedUrl) return;
    window.open(signedUrl, '_blank');
  };

  if (!isOpen || !document) return null;

  const isPDF = document.fileType === 'application/pdf';
  const isImage = document.fileType?.startsWith('image/');
  const canPreview = canPreviewFile(document.fileType);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-[100] flex flex-col">
      {/* Header/Toolbar */}
      <div className="bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        {/* Left: Navigation */}
        <div className="flex items-center gap-2">
          {onNavigate && canNavigate && (
            <>
              <button
                onClick={() => onNavigate('prev')}
                disabled={!canNavigate.prev}
                className="p-2 rounded-lg text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="المستند السابق"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => onNavigate('next')}
                disabled={!canNavigate.next}
                className="p-2 rounded-lg text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="المستند التالي"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div className="w-px h-6 bg-slate-700 mx-1"></div>
            </>
          )}
          
          {/* Document Info */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getFileIcon(document.fileType)}</span>
            <div>
              <div className="text-white font-medium text-sm max-w-xs truncate">{document.fileName}</div>
              <div className="text-slate-400 text-xs">
                {document.fileType} • {formatFileSize((document as any).file_size || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Zoom Controls (for images) */}
        {isImage && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              className="p-2 rounded-lg text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="تصغير"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg">
              <button
                onClick={handleResetZoom}
                className="text-white text-sm font-medium hover:text-primary-400 transition-colors"
              >
                {zoom}%
              </button>
            </div>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              className="p-2 rounded-lg text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="تكبير"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
            </button>
            <div className="w-px h-6 bg-slate-700 mx-1"></div>
            <button
              onClick={handleRotate}
              className="p-2 rounded-lg text-white hover:bg-slate-700 transition-colors"
              title="تدوير"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors text-sm"
            title="تحميل"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">تحميل</span>
          </button>

          {isPDF && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-white bg-slate-700 hover:bg-slate-600 transition-colors text-sm"
              title="طباعة"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span className="hidden sm:inline">طباعة</span>
            </button>
          )}

          <div className="w-px h-6 bg-slate-700 mx-1"></div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white hover:bg-slate-700 transition-colors"
            title="إغلاق"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-950">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="text-white text-sm">جاري تحميل المستند...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <svg className="w-16 h-16 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-white text-lg font-medium">{error}</p>
            <button
              onClick={loadDocument}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : !canPreview ? (
          <div className="flex flex-col items-center gap-6 max-w-md text-center">
            <span className="text-6xl">{getFileIcon(document.fileType)}</span>
            <div>
              <p className="text-white text-xl font-medium mb-2">لا يمكن معاينة هذا النوع من الملفات</p>
              <p className="text-slate-400 text-sm">{document.fileType || 'نوع الملف غير معروف'}</p>
            </div>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              تحميل الملف
            </button>
          </div>
        ) : isPDF ? (
          <div className="w-full h-full">
            <iframe
              src={`${signedUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
              className="w-full h-full border-0"
              title={document.fileName}
            />
          </div>
        ) : isImage ? (
          <div 
            className="max-w-full max-h-full transition-transform duration-200"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`
            }}
          >
            <img
              src={signedUrl}
              alt={document.fileName}
              className="max-w-full max-h-full object-contain shadow-2xl"
            />
          </div>
        ) : null}
      </div>

      {/* Footer Info */}
      <div className="bg-slate-900 border-t border-slate-700 px-4 py-2 text-center">
        <p className="text-slate-400 text-xs">
          تم الرفع في {new Date(document.uploadedAt).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  );
};

export default EnhancedDocumentViewer;
