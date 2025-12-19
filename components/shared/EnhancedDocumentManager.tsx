import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Document } from '../../types';
import { documentsService } from '../../src/services/supabaseService';
import { useToast } from '../../contexts/ToastContext';
import { CloseIcon, UploadIcon, TrashIcon, FileIcon, SpinnerIcon } from './Icons';
import Modal from './Modal';
import { devError } from '../../utils/devLogger';
import {
  DocumentCategory,
  DocumentMetadata,
  DOCUMENT_CATEGORIES,
  detectDocumentCategory,
  formatFileSize,
  calculateDocumentStats
} from '../../types/documentTypes';

interface EnhancedDocumentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string;
  entityType: 'customer' | 'booking' | 'payment' | 'expense';
  entityName: string;
  directView?: boolean;
}

const EnhancedDocumentManager: React.FC<EnhancedDocumentManagerProps> = ({ 
  isOpen, 
  onClose, 
  entityId, 
  entityType, 
  entityName, 
  directView = false 
}) => {
  const { addToast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('other');
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [showManagementView, setShowManagementView] = useState(!directView);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && entityId) {
      fetchDocuments();
    }
  }, [isOpen, entityId]);

  useEffect(() => {
    // Auto-detect category when file is selected
    if (selectedFile) {
      const autoCategory = detectDocumentCategory(selectedFile.name);
      setSelectedCategory(autoCategory);
    }
  }, [selectedFile]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const fetchedDocs = entityType === 'customer'
        ? await documentsService.getForCustomer(entityId)
        : await documentsService.getForBooking(entityId);
      
      const docsWithUrls = await Promise.all(
        fetchedDocs.map(async (doc) => {
          try {
            const signedUrl = await documentsService.getSignedUrl(doc.storagePath, 86400);
            return { ...doc, publicUrl: signedUrl };
          } catch (error) {
            devError(error, 'EnhancedDocumentManager: Error generating signed URL');
            return { ...doc, publicUrl: '' };
          }
        })
      );
      setDocuments(docsWithUrls);
      
      if (directView && docsWithUrls.length > 0) {
        setPreviewDocument(docsWithUrls[0]);
        setShowManagementView(false);
      }
    } catch (error) {
      devError(error, 'EnhancedDocumentManager: Error fetching documents');
      addToast('فشل في تحميل المستندات.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered & searched documents
  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(doc => 
        (doc as any).category === filterCategory || 
        detectDocumentCategory(doc.fileName) === filterCategory
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.fileName.toLowerCase().includes(query) ||
        ((doc as any).description || '').toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [documents, filterCategory, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const metadata: DocumentMetadata[] = documents.map(doc => ({
      id: doc.id,
      name: doc.fileName,
      category: (doc as any).category || detectDocumentCategory(doc.fileName),
      file_path: doc.storagePath,
      file_size: (doc as any).file_size || 0,
      file_type: doc.fileType,
      uploaded_at: doc.uploadedAt,
      uploaded_by: (doc as any).uploaded_by || '',
      description: (doc as any).description
    }));
    return calculateDocumentStats(metadata);
  }, [documents]);

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
      const linkedTo = entityType === 'customer' 
        ? { customer_id: entityId } 
        : entityType === 'booking'
        ? { booking_id: entityId }
        : entityType === 'payment'
        ? { payment_id: entityId }
        : { expense_id: entityId };

      const newDoc = await documentsService.upload(selectedFile, linkedTo, {
        category: selectedCategory,
        file_size: selectedFile.size
      });
      
      const signedUrl = await documentsService.getSignedUrl(newDoc.storagePath);
      const newDocWithUrl = {
        ...newDoc,
        publicUrl: signedUrl,
        category: selectedCategory
      };

      setDocuments(prev => [newDocWithUrl, ...prev]);
      setSelectedFile(null);
      setSelectedCategory('other');
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      addToast('تم رفع المستند بنجاح.', 'success');
    } catch (error) {
      devError(error, 'EnhancedDocumentManager: Error uploading document');
      addToast('فشل في رفع المستند.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!window.confirm(`هل أنت متأكد من حذف المستند "${doc.fileName}"؟`)) return;

    try {
      await documentsService.delete(doc.id);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      setSelectedDocs(prev => {
        const newSet = new Set(prev);
        newSet.delete(doc.id);
        return newSet;
      });
      addToast('تم حذف المستند بنجاح.', 'success');
    } catch (error) {
      devError(error, 'EnhancedDocumentManager: Error deleting document');
      addToast('فشل في حذف المستند.', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocs.size === 0) return;
    
    if (!window.confirm(`هل أنت متأكد من حذف ${selectedDocs.size} مستند؟`)) return;

    const deletions = Array.from(selectedDocs).map(async (docId) => {
      try {
        await documentsService.delete(docId);
        return { success: true, id: docId };
      } catch (error) {
        devError(error, 'EnhancedDocumentManager: Error in bulk delete');
        return { success: false, id: docId };
      }
    });

    const results = await Promise.all(deletions);
    const successCount = results.filter(r => r.success).length;
    
    setDocuments(prev => prev.filter(d => !selectedDocs.has(d.id)));
    setSelectedDocs(new Set());
    
    addToast(`تم حذف ${successCount} من ${results.length} مستند بنجاح.`, 'success');
  };

  const toggleSelectAll = () => {
    if (selectedDocs.size === filteredDocuments.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(filteredDocuments.map(d => d.id)));
    }
  };

  if (!isOpen) return null;

  return (
    <>
    {showManagementView && (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 pt-12">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[calc(100vh-6rem)] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">المرفقات: {entityName}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {stats.total} مستند • {formatFileSize(stats.totalSize)}
              {stats.recentUploads > 0 && ` • ${stats.recentUploads} جديد خلال 7 أيام`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {/* Upload Section with Category Selection */}
          <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload-input-enhanced"
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                />
                <label
                  htmlFor="file-upload-input-enhanced"
                  className="flex-1 flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm"
                >
                  <UploadIcon className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-400 truncate">
                    {selectedFile ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})` : 'اختر ملف للرفع...'}
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

              {/* Category Selection */}
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-600 dark:text-slate-400">التصنيف:</span>
                  <div className="flex flex-wrap gap-1">
                    {(Object.keys(DOCUMENT_CATEGORIES) as DocumentCategory[]).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          selectedCategory === cat
                            ? DOCUMENT_CATEGORIES[cat].color
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {DOCUMENT_CATEGORIES[cat].icon} {DOCUMENT_CATEGORIES[cat].label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filters & Search */}
          <div className="mb-4 flex flex-col sm:flex-row gap-2">
            {/* Category Filter */}
            <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setFilterCategory('all')}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterCategory === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                الكل ({stats.total})
              </button>
              {(Object.keys(DOCUMENT_CATEGORIES) as DocumentCategory[]).map(cat => {
                const count = stats.byCategory[cat] || 0;
                if (count === 0) return null;
                return (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filterCategory === cat
                        ? DOCUMENT_CATEGORIES[cat].color
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {DOCUMENT_CATEGORIES[cat].icon} {DOCUMENT_CATEGORIES[cat].label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في المستندات..."
                className="w-full sm:w-64 px-3 py-1.5 pr-8 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <svg className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedDocs.size > 0 && (
            <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {selectedDocs.size} مستند محدد
              </span>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 text-xs bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
              >
                حذف المحددة
              </button>
            </div>
          )}

          {/* Documents Grid */}
          <div>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-8 gap-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg">
                <SpinnerIcon className="text-primary-600 h-8 w-8" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">جاري تحميل المستندات...</p>
              </div>
            ) : filteredDocuments.length > 0 ? (
              <>
                {documents.length > 1 && (
                  <div className="mb-2 flex items-center gap-2">
                    <button
                      onClick={toggleSelectAll}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      {selectedDocs.size === filteredDocuments.length ? 'إلغاء التحديد' : 'تحديد الكل'}
                    </button>
                  </div>
                )}
                <div className="space-y-2">
                  {filteredDocuments.map(doc => {
                    const category = (doc as any).category || detectDocumentCategory(doc.fileName);
                    const categoryInfo = DOCUMENT_CATEGORIES[category];
                    const isSelected = selectedDocs.has(doc.id);

                    return (
                      <div 
                        key={doc.id} 
                        className={`group relative flex items-center gap-3 p-3 backdrop-blur-xl bg-white/10 dark:bg-white/5 border rounded-xl transition-all duration-200 ${
                          isSelected 
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                            : 'border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-white/10 hover:shadow-lg hover:shadow-black/20'
                        }`}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            setSelectedDocs(prev => {
                              const newSet = new Set(prev);
                              if (e.target.checked) {
                                newSet.add(doc.id);
                              } else {
                                newSet.delete(doc.id);
                              }
                              return newSet;
                            });
                          }}
                          className="flex-shrink-0 w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />

                        {/* File Icon */}
                        <div className="flex-shrink-0">
                          <FileIcon mimeType={doc.fileType} className="h-10 w-10" />
                        </div>

                        {/* File Info */}
                        <button
                          onClick={() => setPreviewDocument(doc)}
                          className="flex-1 min-w-0 text-right"
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${categoryInfo.color}`}>
                                {categoryInfo.icon} {categoryInfo.label}
                              </span>
                            </div>
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
                              })} • {formatFileSize((doc as any).file_size || 0)}
                            </span>
                          </div>
                        </button>

                        {/* Delete Button */}
                        <button 
                          onClick={() => handleDelete(doc)} 
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-2 text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded-lg transition-all duration-200"
                          title="حذف المستند"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-12 px-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600">
                <svg className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mb-1">
                  {searchQuery || filterCategory !== 'all' ? 'لا توجد نتائج' : 'لا توجد مستندات مرفقة'}
                </p>
                <p className="text-slate-400 dark:text-slate-500 text-xs">
                  {searchQuery || filterCategory !== 'all' ? 'جرب تغيير الفلاتر' : 'ابدأ برفع المستندات باستخدام الزر أعلاه'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    )}

      {/* Preview Modal */}
      <Modal 
        isOpen={!!previewDocument} 
        onClose={() => {
          setPreviewDocument(null);
          if (directView) {
            onClose();
          }
        }}
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
        topOffset="pt-24"
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
    </>
  );
};

export default EnhancedDocumentManager;
