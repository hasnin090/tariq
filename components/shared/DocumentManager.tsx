import React, { useState, useEffect, useRef } from 'react';
import { Document } from '../../types';
import { documentsService } from '../../src/services/supabaseService';
import { useToast } from '../../contexts/ToastContext';
import { CloseIcon, UploadIcon, TrashIcon, FileIcon, SpinnerIcon } from './Icons';

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
            const signedUrl = await documentsService.getSignedUrl(doc.storagePath);
            return { ...doc, publicUrl: signedUrl };
          } catch (error) {
            console.error('Error generating signed URL:', error);
            return { ...doc, publicUrl: '' };
          }
        })
      );
      setDocuments(docsWithUrls);
    } catch (error) {
      console.error('Error fetching documents:', error);
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
      console.error('Error uploading document:', error);
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
      console.error('Error deleting document:', error);
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

          {/* Documents List - Compact Design */}
          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 text-sm">المستندات المرفقة ({documents.length})</h4>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-6 gap-2">
                <SpinnerIcon className="text-primary-600 h-6 w-6" />
                <p className="text-slate-500 dark:text-slate-400 text-xs">جاري التحميل...</p>
              </div>
            ) : documents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {documents.map(doc => (
                  <div 
                    key={doc.id} 
                    className="group relative flex items-center gap-2 p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-sm transition-all"
                  >
                    <button
                      onClick={() => setPreviewDocument(doc)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-right"
                    >
                      <FileIcon mimeType={doc.file_type} />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">
                        {doc.file_name}
                      </span>
                    </button>
                    <button 
                      onClick={() => handleDelete(doc)} 
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-all"
                      title="حذف"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4">
                <FileIcon className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 dark:text-slate-500 text-sm">لا توجد مستندات مرفقة</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex justify-center items-center p-4" onClick={() => setPreviewDocument(null)}>
          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{previewDocument.file_name}</h3>
              <button 
                onClick={() => setPreviewDocument(null)} 
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="إغلاق"
              >
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              {previewDocument.file_type?.startsWith('image/') ? (
                <img 
                  src={previewDocument.publicUrl} 
                  alt={previewDocument.file_name}
                  className="max-w-full max-h-full mx-auto object-contain"
                />
              ) : previewDocument.file_type === 'application/pdf' ? (
                <iframe 
                  src={previewDocument.publicUrl} 
                  className="w-full h-full min-h-[60vh] rounded-lg"
                  title={previewDocument.file_name}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <FileIcon className="h-16 w-16 text-slate-400" />
                  <p className="text-slate-600 dark:text-slate-400">لا يمكن معاينة هذا النوع من الملفات</p>
                  <a 
                    href={previewDocument.publicUrl}
                    download={previewDocument.file_name}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    تحميل الملف
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;
