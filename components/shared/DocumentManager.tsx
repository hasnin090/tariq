import React, { useState, useEffect, useRef } from 'react';
import { Document } from '../../types';
import { documentsService } from '../../src/services/supabaseService';
import { useToast } from '../../contexts/ToastContext';
import { CloseIcon, UploadIcon, TrashIcon, FileIcon, SpinnerIcon } from './Icons';
import Modal from './Modal';
import { devError } from '../../utils/devLogger';

interface DocumentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string;
  entityType: 'customer' | 'booking';
  entityName: string;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({ isOpen, onClose, entityId, entityType, entityName }) => {
  const { addToast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && entityId) {
      fetchDocuments();
    }
  }, [isOpen, entityId]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const fetchedDocs = entityType === 'customer'
        ? await documentsService.getForCustomer(entityId)
        : await documentsService.getForBooking(entityId);
      
      // Generate signed URLs for each document
      const docsWithUrls = await Promise.all(
        fetchedDocs.map(async (doc) => {
          try {
            // Signed URL valid for 24 hours
            const signedUrl = await documentsService.getSignedUrl(doc.storagePath, 86400);
            return { ...doc, publicUrl: signedUrl };
          } catch (error) {
            devError(error, 'DocumentManager: Error generating signed URL');
            return { ...doc, publicUrl: '' };
          }
        })
      );
      setDocuments(docsWithUrls);
    } catch (error) {
      devError(error, 'DocumentManager: Error fetching documents');
      addToast('فشل في تحميل المستندات.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      addToast('الرجاء اختيار ملف أولاً.', 'warning');
      return;
    }

    setIsUploading(true);
    try {
      const linkedTo = entityType === 'customer' ? { customer_id: entityId } : { booking_id: entityId };
      const newDoc = await documentsService.upload(selectedFile, linkedTo);
      
      // Generate signed URL for the newly uploaded document
      const signedUrl = await documentsService.getSignedUrl(newDoc.storagePath);
      const newDocWithUrl = {
        ...newDoc,
        publicUrl: signedUrl
      };

      setDocuments(prev => [newDocWithUrl, ...prev]);
      setSelectedFile(null);
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      addToast('تم رفع المستند بنجاح.', 'success');
    } catch (error) {
      devError(error, 'DocumentManager: Error uploading document');
      addToast('فشل في رفع المستند.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!window.confirm(`هل أنت متأكد من حذف المستند "${doc.file_name}"؟`)) return;

    try {
      await documentsService.delete(doc.id);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      addToast('تم حذف المستند بنجاح.', 'success');
    } catch (error) {
      devError(error, 'DocumentManager: Error deleting document');
      addToast('فشل في حذف المستند.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 pt-20">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-8rem)] my-16 flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">إدارة مستندات: {entityName}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {/* Upload Section - Compact Design */}
          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                id="file-upload-input"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
              />
              <label
                htmlFor="file-upload-input"
                className="flex-1 flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm"
              >
                <UploadIcon className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-400 truncate">
                  {selectedFile ? selectedFile.name : 'اختر ملف للرفع...'}
                </span>
              </label>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {isUploading ? (
                  <>
                    <SpinnerIcon className="h-4 w-4" />
                    <span>جاري...</span>
                  </>
                ) : (
                  <span>رفع</span>
                )}
              </button>
            </div>
          </div>

          {/* Documents List - Enhanced Card Design */}
          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              المستندات المرفقة ({documents.length})
            </h4>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-8 gap-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg">
                <SpinnerIcon className="text-primary-600 h-8 w-8" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">جاري تحميل المستندات...</p>
              </div>
            ) : documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div 
                    key={doc.id} 
                    className="group relative flex items-center gap-3 p-3 backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-xl hover:bg-white/20 dark:hover:bg-white/10 hover:shadow-lg hover:shadow-black/20 transition-all duration-200"
                  >
                    <div className="flex-shrink-0">
                      <FileIcon mimeType={doc.fileType} className="h-10 w-10" />
                    </div>
                    <button
                      onClick={() => setPreviewDocument(doc)}
                      className="flex-1 min-w-0 text-right"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {doc.fileName}
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                          {new Date(doc.uploadedAt).toLocaleDateString('ar-SA', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </button>
                    <button 
                      onClick={() => handleDelete(doc)} 
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-2 text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded-lg transition-all duration-200"
                      title="حذف المستند"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600">
                <svg className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mb-1">لا توجد مستندات مرفقة</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs">ابدأ برفع المستندات باستخدام الزر أعلاه</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal - Using System Modal */}
      <Modal 
        isOpen={!!previewDocument} 
        onClose={() => setPreviewDocument(null)}
        title={previewDocument ? (
          <div className="flex items-center gap-3">
            <FileIcon mimeType={previewDocument.fileType} className="h-6 w-6" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base truncate">{previewDocument.fileName}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                {previewDocument.fileType} • {new Date(previewDocument.uploadedAt).toLocaleDateString('ar-SA')}
              </div>
            </div>
          </div>
        ) : undefined}
        size="xl"
        noPadding
      >
        {previewDocument && (
          <div className="bg-slate-50 dark:bg-slate-900 min-h-[60vh]">
            {!previewDocument.publicUrl ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 p-8 min-h-[60vh]">
                <svg className="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">انتهت صلاحية رابط المستند</p>
                <button 
                  onClick={() => fetchDocuments()}
                  className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  إعادة التحميل
                </button>
              </div>
            ) : previewDocument.fileType?.startsWith('image/') ? (
              <div className="flex items-center justify-center p-6 min-h-[60vh]">
                <img 
                  src={previewDocument.publicUrl} 
                  alt={previewDocument.fileName}
                  className="max-w-full max-h-full rounded-lg shadow-xl object-contain"
                />
              </div>
            ) : previewDocument.fileType === 'application/pdf' ? (
              <iframe 
                src={`${previewDocument.publicUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                className="w-full min-h-[70vh]"
                title={previewDocument.fileName}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-6 p-8 min-h-[60vh]">
                <FileIcon mimeType={previewDocument.fileType} className="h-20 w-20" />
                <div className="text-center">
                  <p className="text-slate-700 dark:text-slate-300 text-lg font-medium mb-2">
                    لا يمكن معاينة هذا النوع من الملفات
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {previewDocument.fileType || 'نوع الملف غير معروف'}
                  </p>
                </div>
                <a 
                  href={previewDocument.publicUrl}
                  download={previewDocument.fileName}
                  className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  تحميل الملف
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DocumentManager;
