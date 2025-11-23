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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">إدارة مستندات: {entityName}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
            <CloseIcon />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="mb-6">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">رفع مستند جديد</h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-slate-700 dark:file:text-slate-300 dark:hover:file:bg-slate-600"
              />
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:bg-primary-300 disabled:cursor-not-allowed"
              >
                {isUploading ? <SpinnerIcon /> : <UploadIcon />}
                <span>{isUploading ? 'جاري الرفع...' : 'رفع'}</span>
              </button>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">المستندات المرفقة</h4>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-8 gap-3">
                <SpinnerIcon className="text-primary-600" />
                <p className="text-slate-600 dark:text-slate-400 text-sm">جاري تحميل المستندات...</p>
              </div>
            ) : documents.length > 0 ? (
              <ul className="space-y-2">
                {documents.map(doc => (
                  <li key={doc.id} className="flex justify-between items-center bg-slate-100 dark:bg-slate-700 p-3 rounded-lg">
                    <button
                      onClick={() => setPreviewDocument(doc)}
                      className="flex items-center gap-3 font-medium text-primary-600 hover:underline flex-1 text-right"
                    >
                      <FileIcon />
                      <span>{doc.file_name}</span>
                    </button>
                    <button onClick={() => handleDelete(doc)} className="text-rose-500 hover:text-rose-700 p-2 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors">
                      <TrashIcon />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-slate-500 dark:text-slate-400 py-8">لا توجد مستندات مرفقة لهذا العنصر.</p>
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
