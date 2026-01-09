import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { Expense, SaleDocument } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import { useProject } from '../../../contexts/ProjectContext';
import { useAuth } from '../../../contexts/AuthContext';
import ProjectSelector from '../../shared/ProjectSelector';
import logActivity from '../../../utils/activityLogger';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { FileIcon, CloseIcon, UploadIcon, SearchIcon, ArchiveIcon, LinkIcon, CheckCircleIcon, TrashIcon } from '../../shared/Icons';
import EmptyState from '../../shared/EmptyState';
import { documentsService, expensesService } from '../../../src/services/supabaseService';

const AttachmentViewerModal: React.FC<{ document: SaleDocument | null, onClose: () => void }> = ({ document, onClose }) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    
    useLayoutEffect(() => {
        if (document && overlayRef.current && modalRef.current) {
            const tl = gsap.timeline();
            tl.fromTo(overlayRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.25, ease: "power2.out" }
            );
            tl.fromTo(modalRef.current,
                { opacity: 0, scale: 0.85, y: 30 },
                { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: "back.out(1.5)" },
                0.05
            );
        }
    }, [document]);
    
    if (!document) return null;

    // استخدام signedUrl إذا كان متوفراً، وإلا استخدام content
    const url = document.signedUrl || (document.content ? `data:${document.mimeType};base64,${document.content}` : null);

    if (!url) {
        return (
            <div ref={overlayRef} className="fixed inset-0 z-[60] bg-slate-900/75 backdrop-blur-md flex items-start justify-center pt-20 pb-8 overflow-y-auto" onClick={onClose}>
                <div ref={modalRef} className="w-full max-w-md mx-4 backdrop-blur-2xl bg-gradient-to-br from-white/15 to-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] border border-white/20 rounded-3xl p-8 text-center" onClick={e => e.stopPropagation()}>
                    <FileIcon mimeType={document.mimeType} className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-white mb-4">لا يمكن عرض هذا المستند</p>
                    <button onClick={onClose} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700">
                        إغلاق
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div ref={overlayRef} className="fixed inset-0 z-[60] bg-slate-900/75 backdrop-blur-md flex items-start justify-center pt-20 pb-8 overflow-y-auto" onClick={onClose} style={{ perspective: '1000px' }}>
            <div ref={modalRef} className="w-full max-w-3xl mx-4 h-[80vh] backdrop-blur-2xl bg-gradient-to-br from-white/15 to-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] border border-white/20 rounded-3xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-5 border-b border-white/20 flex justify-between items-center bg-gradient-to-br from-white/10 to-transparent">
                    <h2 className="text-xl font-bold text-white">{document.name}</h2>
                    <button onClick={onClose} className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-rose-500/30 hover:text-rose-100 transition-all duration-300 shadow-lg backdrop-blur-sm border border-white/20 hover:border-rose-400/50">
                        <CloseIcon className="h-5 w-5"/>
                    </button>
                </div>
                <div className="flex-grow p-4 overflow-auto text-center">
                    {document.mimeType?.startsWith('image/') ? (
                        <img src={url} alt={document.name} className="max-w-full max-h-full mx-auto object-contain" />
                    ) : document.mimeType === 'application/pdf' ? (
                        <iframe src={url} title={document.name} className="w-full h-full" />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                            <FileIcon mimeType={document.mimeType} className="h-24 w-24 text-slate-400" />
                            <p className="mt-4 text-slate-300">لا يمكن عرض هذا النوع من الملفات.</p>
                            <a href={url} download={document.name} className="mt-4 bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-sm">
                                تحميل الملف
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const LinkExpenseModal: React.FC<{
    documentToLink: SaleDocument;
    expenses: Expense[];
    allDocuments: SaleDocument[];
    projectIdFilter?: string | null;
    onClose: () => void;
    onLink: (documentId: string, expenseId: string) => void;
}> = ({ documentToLink, expenses, allDocuments, projectIdFilter, onClose, onLink }) => {
    const { addToast } = useToast();
    const [selectedExpenseId, setSelectedExpenseId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    const overlayRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    
    useLayoutEffect(() => {
        if (overlayRef.current && modalRef.current) {
            const tl = gsap.timeline();
            tl.fromTo(overlayRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.25, ease: "power2.out" }
            );
            tl.fromTo(modalRef.current,
                { opacity: 0, scale: 0.85, y: 30 },
                { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: "back.out(1.5)" },
                0.05
            );
        }
    }, []);

    const filteredExpenses = useMemo(() => {
        const effectiveProjectId = (documentToLink as any)?.projectId || projectIdFilter || null;
        const projectFiltered = effectiveProjectId
            ? expenses.filter(exp => (exp as any).projectId === effectiveProjectId)
            : expenses;

        // ✅ جمع جميع expense_id المرتبطة بمستندات أخرى (غير المستند الحالي)
        const linkedExpenseIds = new Set<string>(
            allDocuments
                .filter(doc => doc.expenseId && doc.id !== documentToLink.id)
                .map(doc => doc.expenseId!)
        );

        // ✅ تصفية الحركات المالية: استبعاد الحركات المرتبطة بمستندات أخرى
        const unlinkedExpenses = projectFiltered.filter(exp => !linkedExpenseIds.has(exp.id));

        return unlinkedExpenses.filter(exp => 
            exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exp.date.includes(searchTerm)
        ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, allDocuments, searchTerm, projectIdFilter, documentToLink]);

    const handleConfirm = () => {
        if (!selectedExpenseId) {
            addToast('يرجى اختيار حركة مالية لربط المستند بها.', 'error');
            return;
        }
        onLink(documentToLink.id, selectedExpenseId);
    };

    return (
        <div ref={overlayRef} className="fixed inset-0 z-[60] bg-slate-900/75 backdrop-blur-md flex items-start justify-center pt-20 pb-8 overflow-y-auto" onClick={onClose} style={{ perspective: '1000px' }}>
            <div ref={modalRef} className="w-full max-w-2xl mx-4 backdrop-blur-2xl bg-gradient-to-br from-white/15 to-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] border border-white/20 rounded-3xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-5 border-b border-white/20 flex justify-between items-start bg-gradient-to-br from-white/10 to-transparent">
                    <div>
                        <h2 className="text-xl font-bold text-white">ربط مستند بحركة مالية</h2>
                        <p className="text-sm text-slate-400">المستند: {documentToLink.name}</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-rose-500/30 hover:text-rose-100 transition-all duration-300 shadow-lg backdrop-blur-sm border border-white/20 hover:border-rose-400/50"><CloseIcon className="h-5 w-5"/></button>
                </div>
                
                <div className="p-6 space-y-4 flex-grow overflow-y-auto text-white">
                    <div className="relative">
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-slate-400" />
                        </div>
                        <input type="text" placeholder="بحث بالوصف أو التاريخ..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2.5 pr-10 border border-white/20 bg-white/10 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div className="border border-white/20 rounded-lg max-h-80 overflow-y-auto">
                        {filteredExpenses.length > 0 ? (
                            <ul>
                                {filteredExpenses.map(exp => (
                                    <li key={exp.id} className={`border-b border-white/10 last:border-0 ${selectedExpenseId === exp.id ? 'bg-primary-500/20' : ''}`}>
                                        <label className="flex items-center justify-between p-3 cursor-pointer">
                                            <div>
                                                <p className="font-semibold text-white">{exp.description}</p>
                                                <p className="text-xs text-slate-400">{exp.date} - {formatCurrency(exp.amount)}</p>
                                            </div>
                                            <input type="radio" name="expense" value={exp.id} checked={selectedExpenseId === exp.id} onChange={(e) => setSelectedExpenseId(e.target.value)} className="form-radio h-5 w-5 text-primary-600" />
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-slate-400 p-4">لا توجد حركات مالية متاحة أو تطابق البحث.</p>
                        )}
                    </div>
                </div>
                
                <div className="px-6 py-5 border-t border-white/20 flex justify-end gap-4 flex-shrink-0">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 font-semibold">إلغاء</button>
                    <button type="button" onClick={handleConfirm} className="bg-primary-600 text-white px-8 py-2.5 rounded-lg hover:bg-primary-700 font-semibold shadow-sm disabled:opacity-50" disabled={!selectedExpenseId}>
                        ربط المستند
                    </button>
                </div>
            </div>
        </div>
    );
};

const UploadDocumentPanel: React.FC<{ onClose: () => void; onSave: (documents: SaleDocument[]) => void }> = ({ onClose, onSave }) => {
    const { addToast } = useToast();
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedCount, setUploadedCount] = useState(0);
    const [currentFileName, setCurrentFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    const MAX_FILES = 100; // زيادة الحد الأقصى

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const validateFiles = (filesToValidate: File[]): File[] => {
        const validFiles: File[] = [];
        const errors: string[] = [];

        filesToValidate.forEach((file: File) => {
            console.log(`📝 Validating file: ${file.name}, Size: ${file.size} bytes (${formatFileSize(file.size)}), Type: ${file.type}`);
            
            // ✅ فقط التحقق من التكرار في نفس الجلسة (نفس الاختيار)
            if (files.some(f => f.name === file.name && f.size === file.size)) {
                console.log(`❌ Rejected: Duplicate in current selection`);
                errors.push(`${file.name}: الملف مضاف بالفعل في الاختيار الحالي`);
                return;
            }

            // ✅ التحقق من حجم الملف فقط (بدون التحقق من التكرار في القاعدة)
            const isCompressibleImage = file.type.startsWith('image/') && !file.type.includes('svg');
            console.log(`🖼️ Is compressible image: ${isCompressibleImage}, Max size: ${formatFileSize(MAX_FILE_SIZE)}`);
            
            if (!isCompressibleImage && file.size > MAX_FILE_SIZE) {
                console.log(`❌ Rejected: File too large (${formatFileSize(file.size)} > ${formatFileSize(MAX_FILE_SIZE)})`);
                errors.push(`${file.name}: حجم الملف أكبر من ${formatFileSize(MAX_FILE_SIZE)}`);
                return;
            }

            console.log(`✅ File accepted: ${file.name}`);
            validFiles.push(file);
        });

        // عرض رسائل الأخطاء
        if (errors.length > 0) {
            errors.forEach(err => addToast(err, 'error'));
        }

        console.log(`📊 Validation complete: ${validFiles.length} valid files out of ${filesToValidate.length}`);
        return validFiles;
    };

    const addFiles = (newFiles: File[]) => {
        const totalFiles = files.length + newFiles.length;
        if (totalFiles > MAX_FILES) {
            addToast(`يمكنك رفع ${MAX_FILES} ملفات كحد أقصى`, 'error');
            const allowedCount = MAX_FILES - files.length;
            newFiles = newFiles.slice(0, allowedCount);
        }

        const validFiles = validateFiles(newFiles);
        if (validFiles.length > 0) {
            setFiles(prev => [...prev, ...validFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            addFiles(Array.from(e.target.files));
            e.target.value = ''; // Reset to allow selecting same file again
        }
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files) as File[];
        if (droppedFiles.length > 0) {
            addFiles(droppedFiles);
        }
    };

    const clearAllFiles = () => {
        setFiles([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (files.length === 0) {
            addToast('يرجى اختيار ملف واحد على الأقل.', 'error');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setUploadedCount(0);
        setCurrentFileName('');

        const BATCH_SIZE = 5; // معالجة 5 ملفات في وقت واحد
        const totalFiles = files.length;
        const processedDocs: SaleDocument[] = [];
        let processed = 0;

        const fileToDoc = (file: File): Promise<SaleDocument> => new Promise((resolve, reject) => {
            // If it's a compressible image, resize and compress it.
            if (file.type.startsWith('image/') && !file.type.includes('svg')) {
                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                    if (!loadEvent.target?.result) {
                        return reject(new Error('Failed to read image file.'));
                    }
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_DIMENSION = 1280; // Max width or height
                        let { width, height } = img;

                        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                            if (width > height) {
                                height = Math.round(height * (MAX_DIMENSION / width));
                                width = MAX_DIMENSION;
                            } else {
                                width = Math.round(width * (MAX_DIMENSION / height));
                                height = MAX_DIMENSION;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                           return reject(new Error('Could not get canvas context.'));
                        }
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        // Use JPEG for compression with quality 0.8
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

                        resolve({
                            id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            name: file.name.replace(/\.[^/.]+$/, "") + ".jpeg", // change extension
                            type: 'مستند مرفق',
                            fileName: file.name.replace(/\.[^/.]+$/, "") + ".jpeg",
                            content: dataUrl.split(',')[1],
                            mimeType: 'image/jpeg',
                            uploadedAt: new Date().toISOString(),
                        });
                    };
                    img.onerror = () => reject(new Error('Failed to load image.'));
                    img.src = loadEvent.target.result as string;
                };
                reader.onerror = () => reject(reader.error ?? new Error('Unknown file read error'));
                reader.readAsDataURL(file);
            } else { // For non-images, SVGs, and other files, use original logic
                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                    if (loadEvent.target?.result) {
                        resolve({
                            id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            name: file.name,
                            type: 'مستند مرفق',
                            fileName: file.name,
                            content: (loadEvent.target.result as string).split(',')[1],
                            mimeType: file.type,
                            uploadedAt: new Date().toISOString(),
                        });
                    } else reject(new Error('Failed to read file.'));
                };
                reader.onerror = () => reject(reader.error ?? new Error('Unknown file read error'));
                reader.readAsDataURL(file);
            }
        });
        
        try {
            // معالجة الملفات على دفعات
            for (let i = 0; i < files.length; i += BATCH_SIZE) {
                const batch = files.slice(i, i + BATCH_SIZE);
                
                // تحديث اسم الملف الحالي
                setCurrentFileName(batch[0].name);
                
                // معالجة الدفعة بالتوازي
                const batchResults = await Promise.all(
                    batch.map(async (file) => {
                        try {
                            return await fileToDoc(file);
                        } catch (err) {
                            console.error(`Error processing ${file.name}:`, err);
                            return null;
                        }
                    })
                );
                
                // إضافة النتائج الناجحة
                batchResults.forEach(doc => {
                    if (doc) processedDocs.push(doc);
                });
                
                // تحديث التقدم
                processed += batch.length;
                setUploadedCount(processed);
                setUploadProgress(Math.round((processed / totalFiles) * 100));
            }
            
            if (processedDocs.length > 0) {
                onSave(processedDocs);
            } else {
                addToast('لم يتم معالجة أي ملفات.', 'error');
            }
        } catch (error: any) {
            addToast('حدث خطأ أثناء معالجة الملفات.', 'error');
            console.error('File processing error:', error.message);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            setUploadedCount(0);
            setCurrentFileName('');
        }
    };

    return (
         <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4 pt-20 animate-drawer-overlay-show" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl animate-fade-in-scale-up max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start flex-shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">رفع مستندات جديدة</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">يمكنك رفع حتى {MAX_FILES} ملفات بالحد الأقصى</p>
                        </div>
                        <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><CloseIcon className="h-6 w-6"/></button>
                    </div>
                    <div className="p-6 space-y-4 overflow-y-auto flex-grow">
                        {/* Drag & Drop Zone */}
                        <div 
                            className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 ${
                                isDragging 
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                                    : 'border-slate-300 dark:border-slate-600 hover:border-primary-400'
                            }`}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            <div className="space-y-3 text-center">
                                <div className={`mx-auto h-14 w-14 rounded-full flex items-center justify-center transition-colors ${
                                    isDragging ? 'bg-primary-100 dark:bg-primary-800' : 'bg-slate-100 dark:bg-slate-700'
                                }`}>
                                    <UploadIcon className={`h-7 w-7 ${isDragging ? 'text-primary-600' : 'text-slate-400'}`} />
                                </div>
                                <div>
                                    <p className="text-base font-medium text-slate-700 dark:text-slate-300">
                                        {isDragging ? 'أفلت الملفات هنا' : 'اسحب وأفلت الملفات هنا'}
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">أو</p>
                                </div>
                                <label className="inline-block">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        onChange={handleFileChange}
                                        multiple
                                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                    />
                                    <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg cursor-pointer hover:bg-primary-700 transition-colors font-semibold shadow-sm">
                                        <UploadIcon className="h-4 w-4" />
                                        اختر ملفات
                                    </span>
                                </label>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    الأنواع المدعومة: صور، PDF، Word، Excel (حتى 4MB للملف الواحد)
                                </p>
                            </div>
                        </div>

                        {/* Selected Files List */}
                        {files.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-slate-700 dark:text-slate-300">
                                        الملفات المختارة ({files.length})
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={clearAllFiles}
                                        className="text-sm text-rose-600 hover:text-rose-700 font-medium"
                                    >
                                        إزالة الكل
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-lg p-2">
                                    {files.map((file, index) => (
                                        <div 
                                            key={`${file.name}-${index}`} 
                                            className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg group hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <FileIcon mimeType={file.type} className="h-8 w-8 flex-shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatFileSize(file.size)}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <CloseIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Upload Progress */}
                        {isUploading && (
                            <div className="space-y-3 bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl border border-primary-200 dark:border-primary-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <svg className="animate-spin h-5 w-5 text-primary-600" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span className="font-semibold text-primary-700 dark:text-primary-300">جاري معالجة الملفات...</span>
                                    </div>
                                    <span className="text-2xl font-bold text-primary-600">{uploadProgress}%</span>
                                </div>
                                
                                {/* Progress bar */}
                                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                                
                                {/* Details */}
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600 dark:text-slate-400">
                                        تم معالجة <span className="font-bold text-primary-600">{uploadedCount}</span> من <span className="font-bold">{files.length}</span> ملف
                                    </span>
                                    {currentFileName && (
                                        <span className="text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={currentFileName}>
                                            📄 {currentFileName}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4 flex-shrink-0">
                        <button type="button" onClick={onClose} disabled={isUploading} className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold disabled:opacity-50">إلغاء</button>
                        <button 
                            type="submit" 
                            className="bg-primary-600 text-white px-8 py-2.5 rounded-lg hover:bg-primary-700 font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" 
                            disabled={files.length === 0 || isUploading}
                        >
                            {isUploading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    جاري الرفع...
                                </>
                            ) : (
                                <>رفع {files.length > 0 ? `(${files.length})` : ''}</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const DocumentsAccounting: React.FC = () => {
    const [allDocuments, setAllDocuments] = useState<SaleDocument[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [documentToLink, setDocumentToLink] = useState<SaleDocument | null>(null);
    const [viewingDocument, setViewingDocument] = useState<SaleDocument | null>(null);
    const [documentToDelete, setDocumentToDelete] = useState<SaleDocument | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [filter, setFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
    const [loading, setLoading] = useState(true);
    // حالات الرفع للمكون الرئيسي
    const [isServerUploading, setIsServerUploading] = useState(false);
    const [serverUploadProgress, setServerUploadProgress] = useState(0);
    const [serverUploadedCount, setServerUploadedCount] = useState(0);
    const [serverTotalCount, setServerTotalCount] = useState(0);
    // حالة التبويبات (Pagination)
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 100;
    // ✅ حالات التحديد المتعدد للحذف
    const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
    const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);
    const { addToast } = useToast();
    const { currentUser } = useAuth();
    const { activeProject, availableProjects, setActiveProject } = useProject();

    // ✅ المشروع الذي تُعرض ضمنه مستندات/حركات الصفحة (للمستخدم المخصص أو المشروع النشط)
    const projectIdToFilter = currentUser?.assignedProjectId || activeProject?.id || null;
    
    // ✅ تتبع آخر مشروع تم تحميله لتجنب إعادة التحميل غير الضرورية
    // استخدام رمز خاص للدلالة على "لم يتم التحميل بعد"
    const INITIAL_LOAD = Symbol('INITIAL_LOAD');
    const lastLoadedProjectRef = useRef<string | null | typeof INITIAL_LOAD>(INITIAL_LOAD);
    
    // GSAP Table Animation Ref
    const tableBodyRef = useRef<HTMLTableSectionElement>(null);
    const hasAnimated = useRef(false);

    const loadData = async () => {
        try {
            // ✅ تجنب إعادة التحميل إذا لم يتغير المشروع (ولكن السماح بالتحميل الأول)
            if (lastLoadedProjectRef.current !== INITIAL_LOAD && lastLoadedProjectRef.current === projectIdToFilter) {
                console.log('⏭️ Documents - Skipping reload, same project:', projectIdToFilter);
                return;
            }
            
            lastLoadedProjectRef.current = projectIdToFilter;
            
            setLoading(true);
            // Load expenses from Supabase
            const expensesData = await expensesService.getAll();
            const filteredExpenses = projectIdToFilter
                ? expensesData.filter(e => (e as any).projectId === projectIdToFilter)
                : expensesData;
            setExpenses(filteredExpenses);

            // Load all accounting documents from Supabase (linked and unlinked), filtered by project
            const allDocsFromDB = await documentsService.getAllAccountingDocuments(projectIdToFilter);
            
            // عرض المستندات فوراً بدون signed URLs
            const initialDocs: SaleDocument[] = allDocsFromDB.map(doc => ({
                id: doc.id,
                name: doc.fileName,
                type: 'مستند مرفق',
                fileName: doc.fileName,
                mimeType: doc.fileType || 'application/octet-stream',
                storagePath: doc.storagePath,
                signedUrl: null,
                expenseId: doc.expenseId,
                projectId: doc.projectId,
                uploadedAt: doc.uploadedAt,
                hasError: false,
                isLoadingUrl: true, // علامة أن URL قيد التحميل
            }));
            
            setAllDocuments(initialDocs);
            setLoading(false); // إنهاء التحميل مبكراً لعرض الجدول
            
            // ✅ جلب signed URLs في الخلفية بشكل متوازي - دفعات أكبر وأسرع
            const BATCH_SIZE = 50; // ✅ زيادة حجم الدفعة من 20 إلى 50 لتسريع التحميل
            
            for (let i = 0; i < allDocsFromDB.length; i += BATCH_SIZE) {
                const batch = allDocsFromDB.slice(i, i + BATCH_SIZE);
                
                const batchResults = await Promise.allSettled(
                    batch.map(async (doc) => {
                        const signedUrl = await documentsService.getSignedUrl(doc.storagePath);
                        // إذا كان signedUrl null، يعني أن الملف غير موجود
                        return { id: doc.id, signedUrl, hasError: signedUrl === null };
                    })
                );
                
                // تحديث المستندات بـ signed URLs
                setAllDocuments(prevDocs => {
                    const updatedDocs = [...prevDocs];
                    batchResults.forEach(result => {
                        if (result.status === 'fulfilled' && result.value) {
                            const docIndex = updatedDocs.findIndex(d => d.id === result.value.id);
                            if (docIndex !== -1) {
                                updatedDocs[docIndex] = {
                                    ...updatedDocs[docIndex],
                                    signedUrl: result.value.signedUrl,
                                    hasError: result.value.hasError,
                                    isLoadingUrl: false,
                                } as SaleDocument;
                            }
                        }
                    });
                    return updatedDocs;
                });
            }
        } catch (error) {
            console.error('Error loading data:', error);
            addToast('خطأ في تحميل البيانات', 'error');
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [activeProject, currentUser?.assignedProjectId]);

    const expenseMap = useMemo(() => {
        const map = new Map<string, Expense>();
        expenses.forEach(exp => map.set(exp.id, exp));
        return map;
    }, [expenses]);
    
    // تحديد المستندات المكررة والترتيب حسب الاسم تنازلياً
    const filteredDocuments = useMemo(() => {
        let docs = [...allDocuments];
        
        // تحديد المستندات المكررة (بدون إزالتها)
        const nameCount = new Map<string, number>();
        docs.forEach(doc => {
            const key = (doc.fileName || doc.name).toLowerCase().trim();
            nameCount.set(key, (nameCount.get(key) || 0) + 1);
        });
        
        // تمييز المستندات المكررة
        docs = docs.map(doc => {
            const key = (doc.fileName || doc.name).toLowerCase().trim();
            return {
                ...doc,
                isDuplicate: (nameCount.get(key) || 0) > 1
            } as SaleDocument & { isDuplicate: boolean };
        });
        
        // تطبيق الفلتر
        if (filter === 'linked') docs = docs.filter(d => d.expenseId);
        if (filter === 'unlinked') docs = docs.filter(d => !d.expenseId);
        
        // الترتيب حسب الاسم تنازلياً (من الأكبر للأصغر)
        return docs.sort((a, b) => {
            const nameA = (a.fileName || a.name).toLowerCase();
            const nameB = (b.fileName || b.name).toLowerCase();
            // محاولة استخراج الأرقام من الأسماء للترتيب الرقمي
            const numA = parseInt(nameA.replace(/[^0-9]/g, '')) || 0;
            const numB = parseInt(nameB.replace(/[^0-9]/g, '')) || 0;
            if (numA !== 0 && numB !== 0) {
                return numB - numA; // ترتيب تنازلي للأرقام
            }
            return nameB.localeCompare(nameA, 'ar'); // ترتيب تنازلي للنصوص
        });
    }, [allDocuments, filter]);

    // حساب التبويبات
    const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);
    const paginatedDocuments = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredDocuments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredDocuments, currentPage]);

    // إعادة تعيين الصفحة عند تغيير الفلتر
    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    // 🎬 GSAP Table Animation - runs only once
    useLayoutEffect(() => {
        if (tableBodyRef.current && filteredDocuments.length > 0 && !hasAnimated.current) {
            hasAnimated.current = true;
            const rows = tableBodyRef.current.querySelectorAll('tr');
            gsap.fromTo(rows,
                { opacity: 0, y: 15, x: -10 },
                {
                    opacity: 1,
                    y: 0,
                    x: 0,
                    duration: 0.35,
                    stagger: 0.04,
                    ease: "power2.out",
                    delay: 0.1
                }
            );
        }
    }, [filteredDocuments]);

    const handleSaveUploads = async (newDocs: SaleDocument[]) => {
        try {
            // ✅ التحقق من التكرار فقط في نفس المشروع
            const currentProjectDocs = allDocuments.filter(d => 
                d.projectId === projectIdToFilter
            );
            const existingNamesInProject = new Set(
                currentProjectDocs.map(d => (d.fileName || d.name).toLowerCase().trim())
            );
            
            // فصل المستندات المكررة في نفس المشروع فقط
            const duplicateDocs: string[] = [];
            const uniqueDocs: SaleDocument[] = [];
            
            for (const doc of newDocs) {
                const docName = (doc.fileName || doc.name).toLowerCase().trim();
                if (existingNamesInProject.has(docName)) {
                    // ⚠️ مكرر في نفس المشروع
                    duplicateDocs.push(doc.fileName || doc.name);
                } else {
                    // ✅ غير مكرر في المشروع الحالي
                    uniqueDocs.push(doc);
                    existingNamesInProject.add(docName);
                }
            }
            
            // إظهار تحذير للملفات المكررة في نفس المشروع
            if (duplicateDocs.length > 0) {
                addToast(`تم تجاهل ${duplicateDocs.length} ملف(ات) مكررة في المشروع الحالي`, 'warning');
            }
            
            // إذا لم يكن هناك ملفات فريدة للرفع
            if (uniqueDocs.length === 0) {
                addToast('جميع الملفات المحددة موجودة مسبقاً في المشروع الحالي!', 'info');
                setIsUploadModalOpen(false);
                return;
            }
            
            // إغلاق نافذة الرفع وبدء الرفع للخادم
            setIsUploadModalOpen(false);
            setIsServerUploading(true);
            setServerTotalCount(uniqueDocs.length);
            setServerUploadedCount(0);
            setServerUploadProgress(0);
            
            // رفع المستندات بشكل متوازي على دفعات
            const BATCH_SIZE = 3; // رفع 3 ملفات بالتوازي
            let uploadedCount = 0;
            const errors: string[] = [];
            
            // Get project ID for new uploads
            const projectIdForUpload = currentUser?.assignedProjectId || activeProject?.id || null;

            for (let i = 0; i < uniqueDocs.length; i += BATCH_SIZE) {
                const batch = uniqueDocs.slice(i, i + BATCH_SIZE);
                
                // رفع الدفعة بالتوازي
                const results = await Promise.allSettled(
                    batch.map(async (doc) => {
                        if (doc.content) {
                            await documentsService.uploadUnlinkedDocument(
                                doc.fileName || doc.name,
                                doc.content,
                                doc.mimeType,
                                projectIdForUpload
                            );
                            return doc.name;
                        }
                        return null;
                    })
                );
                
                // حساب النجاح والفشل
                results.forEach((result, idx) => {
                    if (result.status === 'fulfilled' && result.value) {
                        uploadedCount++;
                    } else if (result.status === 'rejected') {
                        errors.push(batch[idx].name);
                        console.error(`Error uploading ${batch[idx].name}:`, result.reason);
                    }
                });
                
                // تحديث التقدم
                const processed = Math.min(i + BATCH_SIZE, uniqueDocs.length);
                setServerUploadedCount(uploadedCount);
                setServerUploadProgress(Math.round((processed / uniqueDocs.length) * 100));
            }

            // إعادة تحميل البيانات من قاعدة البيانات
            await loadData();
            
            if (errors.length > 0) {
                addToast(`فشل رفع ${errors.length} ملف(ات)`, 'error');
            }
            
            if (uploadedCount > 0) {
                logActivity('Upload Documents', `Uploaded ${uploadedCount} new document(s).`, 'expenses');
                addToast(`تم رفع ${uploadedCount} مستند(ات) بنجاح!`, 'success');
            }
        } catch (e: any) {
            console.error('Upload error:', e);
            addToast('حدث خطأ أثناء رفع المستندات.', 'error');
        } finally {
            setIsServerUploading(false);
            setServerUploadProgress(0);
            setServerUploadedCount(0);
            setServerTotalCount(0);
        }
    };

    const handleLink = async (documentId: string, expenseId: string) => {
        try {
            // Find the document
            const doc = allDocuments.find(d => d.id === documentId);
            if (!doc) {
                addToast('خطأ: لم يتم العثور على المستند.', 'error');
                return;
            }
            
            // Document is already in Supabase Storage, just update the link
            if (doc.storagePath) {
                await documentsService.linkToExpense(documentId, expenseId);
            } else {
                addToast('خطأ: المستند غير موجود في التخزين.', 'error');
                return;
            }
            
            await loadData();
            addToast('تم ربط المستند بنجاح!', 'success');
            logActivity('Link Document', `Linked doc ${documentId} to expense ${expenseId}`, 'expenses');
            setIsLinkModalOpen(false);
            setDocumentToLink(null);
        } catch (error) {
            console.error('Error linking document:', error);
            addToast('خطأ في ربط المستند', 'error');
        }
    };

    const handleUnlink = async (docToUnlink: SaleDocument) => {
        if (!docToUnlink.expenseId) return;

        try {
            if (docToUnlink.storagePath) {
                // Unlink in database
                await documentsService.unlinkFromExpense(docToUnlink.id);
            }
            
            await loadData();
            addToast('تم إلغاء ربط المستند بنجاح.', 'info');
            logActivity('Unlink Document', `Unlinked doc ${docToUnlink.id} from expense ${docToUnlink.expenseId}`, 'expenses');
        } catch (error) {
            console.error('Error unlinking document:', error);
            addToast('خطأ في إلغاء ربط المستند', 'error');
        }
    };

    const handleDeleteDocument = async () => {
        if (!documentToDelete) return;
        
        const docToDelete = documentToDelete;
        setIsDeleting(true);
        
        // حذف فوري من الواجهة (Optimistic Update)
        setAllDocuments(prev => prev.filter(d => d.id !== docToDelete.id));
        setDocumentToDelete(null);
        
        try {
            // حذف من الخادم في الخلفية
            await documentsService.delete(docToDelete.id);
            addToast('تم حذف المستند بنجاح!', 'success');
            logActivity('Delete Document', `Deleted document: ${docToDelete.name}`, 'expenses');
        } catch (error) {
            console.error('Error deleting document:', error);
            // إعادة المستند في حالة فشل الحذف
            setAllDocuments(prev => [...prev, docToDelete]);
            addToast('خطأ في حذف المستند', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    // ✅ حذف متعدد للمستندات المحددة
    const handleDeleteMultiple = async () => {
        if (selectedDocuments.size === 0) return;
        
        const docsToDelete = Array.from(selectedDocuments);
        setIsDeletingMultiple(true);
        
        // حذف فوري من الواجهة
        setAllDocuments(prev => prev.filter(d => !selectedDocuments.has(d.id)));
        setSelectedDocuments(new Set());
        
        try {
            // حذف من الخادم بشكل متوازي
            const deletePromises = docsToDelete.map(id => documentsService.delete(id));
            await Promise.all(deletePromises);
            
            addToast(`تم حذف ${docsToDelete.length} مستند بنجاح!`, 'success');
            logActivity('Delete Multiple Documents', `Deleted ${docsToDelete.length} documents`, 'expenses');
        } catch (error) {
            console.error('Error deleting documents:', error);
            // إعادة تحميل البيانات في حالة الفشل
            await loadData();
            addToast('حدث خطأ أثناء حذف بعض المستندات', 'error');
        } finally {
            setIsDeletingMultiple(false);
        }
    };

    // ✅ تحديد/إلغاء تحديد مستند
    const toggleSelectDocument = (docId: string) => {
        setSelectedDocuments(prev => {
            const newSet = new Set(prev);
            if (newSet.has(docId)) {
                newSet.delete(docId);
            } else {
                newSet.add(docId);
            }
            return newSet;
        });
    };

    // ✅ تحديد/إلغاء تحديد الكل في الصفحة الحالية
    const toggleSelectAll = () => {
        if (selectedDocuments.size === paginatedDocuments.length) {
            // إلغاء تحديد الكل
            setSelectedDocuments(new Set());
        } else {
            // تحديد الكل في الصفحة الحالية
            const allIds = new Set(paginatedDocuments.map(d => d.id));
            setSelectedDocuments(allIds);
        }
    };

    // مودال تأكيد الحذف
    const DeleteConfirmationModal = () => {
        const overlayRef = useRef<HTMLDivElement>(null);
        const modalRef = useRef<HTMLDivElement>(null);

        useLayoutEffect(() => {
            if (documentToDelete && overlayRef.current && modalRef.current) {
                const tl = gsap.timeline();
                tl.fromTo(overlayRef.current,
                    { opacity: 0 },
                    { opacity: 1, duration: 0.2, ease: "power2.out" }
                );
                tl.fromTo(modalRef.current,
                    { opacity: 0, scale: 0.9, y: 20 },
                    { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "back.out(1.5)" },
                    0.05
                );
            }
        }, []);

        if (!documentToDelete) return null;

        return (
            <div 
                ref={overlayRef}
                className="fixed inset-0 z-[70] bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => !isDeleting && setDocumentToDelete(null)}
            >
                <div 
                    ref={modalRef}
                    className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="text-center">
                        <div className="mx-auto h-16 w-16 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-4">
                            <TrashIcon className="h-8 w-8 text-rose-600 dark:text-rose-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                            تأكيد الحذف
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-2">
                            هل أنت متأكد من حذف هذا المستند؟
                        </p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg p-3 mb-6 flex items-center gap-2 justify-center">
                            <FileIcon mimeType={documentToDelete.mimeType} className="h-5 w-5" />
                            {documentToDelete.name}
                        </p>
                        <p className="text-xs text-rose-500 dark:text-rose-400 mb-6">
                            ⚠️ لا يمكن التراجع عن هذا الإجراء
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDocumentToDelete(null)}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleDeleteDocument}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        جاري الحذف...
                                    </>
                                ) : (
                                    <>
                                        <TrashIcon className="h-4 w-4" />
                                        حذف
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="container mx-auto">
            {/* شريط تقدم الرفع للخادم */}
            {isServerUploading && (
                <div className="mb-6 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                                <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">جاري رفع المستندات إلى الخادم...</h3>
                                <p className="text-white/80 text-sm">يرجى الانتظار وعدم إغلاق الصفحة</p>
                            </div>
                        </div>
                        <div className="text-left">
                            <span className="text-4xl font-bold">{serverUploadProgress}%</span>
                        </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="h-4 bg-white/20 rounded-full overflow-hidden mb-3">
                        <div 
                            className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${serverUploadProgress}%` }}
                        />
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                        <span>
                            تم رفع <span className="font-bold">{serverUploadedCount}</span> من <span className="font-bold">{serverTotalCount}</span> مستند
                        </span>
                        <span className="text-white/80">
                            المتبقي: {serverTotalCount - serverUploadedCount} مستند
                        </span>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">مستودع المستندات</h2>
                <div className="flex items-center gap-3">
                    {selectedDocuments.size > 0 && (
                        <>
                            <button
                                onClick={() => setSelectedDocuments(new Set())}
                                className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors shadow-sm"
                            >
                                إلغاء التحديد
                            </button>
                            <button
                                onClick={handleDeleteMultiple}
                                disabled={isDeletingMultiple}
                                className="bg-rose-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-rose-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDeletingMultiple ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        جاري الحذف...
                                    </>
                                ) : (
                                    <>
                                        <TrashIcon className="h-5 w-5" />
                                        <span>حذف المحددة ({selectedDocuments.size})</span>
                                    </>
                                )}
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        disabled={isServerUploading}
                        className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <UploadIcon className="h-5 w-5" />
                        <span>رفع مستندات</span>
                    </button>
                </div>
            </div>

            {/* اختيار المشروع */}
            {!currentUser?.assignedProjectId && (
                <ProjectSelector 
                    projects={availableProjects} 
                    activeProject={activeProject} 
                    onSelectProject={setActiveProject} 
                />
            )}

            <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
                    {(['all', 'unlinked', 'linked'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-5 py-2 text-sm font-bold rounded-full transition-colors ${filter === f ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-600 dark:text-slate-300'}`}>
                            {f === 'all' ? 'الكل' : f === 'unlinked' ? 'غير المرتبطة' : 'المرتبطة'}
                        </button>
                    ))}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-4">
                    {selectedDocuments.size > 0 && (
                        <span className="font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-3 py-1 rounded-full">
                            محدد: {selectedDocuments.size}
                        </span>
                    )}
                    <span>
                        إجمالي المستندات: <span className="font-bold text-primary-600">{filteredDocuments.length}</span>
                        {totalPages > 1 && (
                            <span className="mr-2">| الصفحة {currentPage} من {totalPages}</span>
                        )}
                    </span>
                </div>
            </div>

            {filteredDocuments.length > 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
                                <th className="p-4 w-12">
                                    <input
                                        type="checkbox"
                                        checked={paginatedDocuments.length > 0 && selectedDocuments.size === paginatedDocuments.length}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 text-primary-600 bg-white border-slate-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 cursor-pointer"
                                        title="تحديد/إلغاء تحديد الكل"
                                    />
                                </th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200 w-16">#</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المستند</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">تاريخ الرفع</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الحالة</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الحركة المرتبطة</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody ref={tableBodyRef}>
                            {paginatedDocuments.map((doc, index) => {
                                const linkedExpense = doc.expenseId ? expenseMap.get(doc.expenseId) : null;
                                const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                                const isDuplicate = (doc as any).isDuplicate;
                                const hasError = (doc as any).hasError;
                                const isLoadingUrl = (doc as any).isLoadingUrl;
                                
                                return (
                                <tr key={doc.id} className={`border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200 ${
                                    selectedDocuments.has(doc.id) ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700' :
                                    hasError ? 'bg-rose-50 dark:bg-rose-900/10' : 
                                    isDuplicate ? 'bg-amber-50 dark:bg-amber-900/10' : ''
                                }`}>
                                    <td className="p-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedDocuments.has(doc.id)}
                                            onChange={() => toggleSelectDocument(doc.id)}
                                            className="w-4 h-4 text-primary-600 bg-white border-slate-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 cursor-pointer"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </td>
                                    <td className="p-4 text-sm font-medium text-slate-500 dark:text-slate-400">{rowNumber}</td>
                                    <td className="p-4 font-medium text-slate-800 dark:text-slate-100">
                                        <button 
                                            onClick={() => !hasError && !isLoadingUrl && setViewingDocument(doc)} 
                                            className={`flex items-center gap-3 ${hasError || isLoadingUrl ? 'cursor-not-allowed opacity-60' : 'hover:text-primary-600'}`}
                                            disabled={hasError || isLoadingUrl}
                                        >
                                            <FileIcon mimeType={doc.mimeType} className="h-6 w-6" />
                                            <span className={isDuplicate ? 'text-amber-700 dark:text-amber-400' : ''}>{doc.name}</span>
                                            {isDuplicate && (
                                                <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                    مكرر
                                                </span>
                                            )}
                                            {hasError && (
                                                <span className="px-2 py-0.5 text-xs font-bold rounded bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                                                    ⚠️ تالف
                                                </span>
                                            )}
                                            {isLoadingUrl && !hasError && (
                                                <svg className="animate-spin h-4 w-4 text-slate-400" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                            )}
                                        </button>
                                    </td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('ar-EG') : '-'}</td>
                                    <td className="p-4">
                                        {hasError ? (
                                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 flex items-center gap-1.5 w-fit">
                                                ⚠️ ملف مفقود
                                            </span>
                                        ) : isDuplicate ? (
                                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1.5 w-fit">
                                                ⚠️ مكرر
                                            </span>
                                        ) : linkedExpense ? (
                                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 flex items-center gap-1.5 w-fit">
                                                <CheckCircleIcon className="h-4 w-4" /> مرتبطة
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">غير مرتبطة</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{linkedExpense?.description || '—'}</td>
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {hasError ? (
                                                <button 
                                                    onClick={() => setDocumentToDelete(doc)} 
                                                    className="text-rose-600 hover:underline font-semibold flex items-center gap-1"
                                                >
                                                    <TrashIcon className="h-4 w-4"/> حذف السجل
                                                </button>
                                            ) : (
                                                <>
                                                    {linkedExpense ? (
                                                        <button onClick={() => handleUnlink(doc)} className="text-rose-600 hover:underline font-semibold">إلغاء الربط</button>
                                                    ) : (
                                                        <button onClick={() => { setDocumentToLink(doc); setIsLinkModalOpen(true); }} className="text-primary-600 hover:underline font-semibold flex items-center gap-1">
                                                            <LinkIcon className="h-4 w-4"/> ربط بحركة
                                                        </button>
                                                    )}
                                                    <span className="text-slate-300 dark:text-slate-600">|</span>
                                                    <button 
                                                        onClick={() => setDocumentToDelete(doc)} 
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                                        title="حذف المستند"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                    
                    {/* مكون التبويبات */}
                    {totalPages > 1 && (
                        <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex flex-wrap justify-center items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    الأولى
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    السابق
                                </button>
                                
                                {/* أرقام الصفحات */}
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = currentPage - 2 + i;
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${
                                                currentPage === pageNum
                                                    ? 'bg-primary-600 text-white border-primary-600'
                                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    التالي
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    الأخيرة
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <EmptyState 
                    Icon={ArchiveIcon}
                    title="لا توجد مستندات"
                    message={filter === 'all' ? "ابدأ برفع الفواتير والإيصالات لإدارتها من هنا." : `لا توجد مستندات تطابق الفلتر المحدد.`}
                    actionButton={{ text: 'رفع مستندات', onClick: () => setIsUploadModalOpen(true) }}
                />
            )}

            {isUploadModalOpen && <UploadDocumentPanel onClose={() => setIsUploadModalOpen(false)} onSave={handleSaveUploads} />}
            {isLinkModalOpen && documentToLink && (
                <LinkExpenseModal
                    documentToLink={documentToLink}
                    expenses={expenses}
                    allDocuments={allDocuments}
                    projectIdFilter={projectIdToFilter}
                    onClose={() => setIsLinkModalOpen(false)}
                    onLink={handleLink}
                />
            )}
            {viewingDocument && <AttachmentViewerModal document={viewingDocument} onClose={() => setViewingDocument(null)} />}
            {documentToDelete && <DeleteConfirmationModal />}
        </div>
    );
};

export default DocumentsAccounting;