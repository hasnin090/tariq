import React, { useState, useEffect, useMemo } from 'react';
import { Expense, SaleDocument } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import logActivity from '../../../utils/activityLogger';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { FileIcon, CloseIcon, UploadIcon, SearchIcon, ArchiveIcon, LinkIcon, CheckCircleIcon } from '../../shared/Icons';
import EmptyState from '../../shared/EmptyState';

const AttachmentViewerModal: React.FC<{ document: SaleDocument | null, onClose: () => void }> = ({ document, onClose }) => {
    if (!document) return null;

    const url = `data:${document.mimeType};base64,${document.content}`;

    return (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-60 flex justify-center items-center p-4 animate-drawer-overlay-show" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col animate-fade-in-scale-up" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{document.name}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <CloseIcon className="h-6 w-6"/>
                    </button>
                </div>
                <div className="flex-grow p-4 overflow-auto text-center">
                    {document.mimeType.startsWith('image/') ? (
                        <img src={url} alt={document.name} className="max-w-full max-h-full mx-auto object-contain" />
                    ) : document.mimeType === 'application/pdf' ? (
                        <iframe src={url} title={document.name} className="w-full h-full" />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                            <FileIcon mimeType={document.mimeType} className="h-24 w-24 text-slate-400" />
                            <p className="mt-4 text-slate-600 dark:text-slate-300">لا يمكن عرض هذا النوع من الملفات.</p>
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
    onClose: () => void;
    onLink: (documentId: string, expenseId: string) => void;
}> = ({ documentToLink, expenses, onClose, onLink }) => {
    const { addToast } = useToast();
    const [selectedExpenseId, setSelectedExpenseId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredExpenses = useMemo(() => {
        return expenses.filter(exp => 
            exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exp.date.includes(searchTerm)
        ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, searchTerm]);

    const handleConfirm = () => {
        if (!selectedExpenseId) {
            addToast('يرجى اختيار حركة مالية لربط المستند بها.', 'error');
            return;
        }
        onLink(documentToLink.id, selectedExpenseId);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4 animate-drawer-overlay-show" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl animate-fade-in-scale-up flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">ربط مستند بحركة مالية</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">المستند: {documentToLink.name}</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><CloseIcon className="h-6 w-6"/></button>
                </div>
                
                <div className="p-6 space-y-4 flex-grow overflow-y-auto">
                    <div className="relative">
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-slate-400" />
                        </div>
                        <input type="text" placeholder="بحث بالوصف أو التاريخ..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2.5 pr-10 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div className="border border-slate-300 dark:border-slate-600 rounded-lg max-h-80 overflow-y-auto">
                        {filteredExpenses.length > 0 ? (
                            <ul>
                                {filteredExpenses.map(exp => (
                                    <li key={exp.id} className={`border-b border-slate-200 dark:border-slate-700 last:border-0 ${selectedExpenseId === exp.id ? 'bg-primary-50 dark:bg-primary-500/10' : ''}`}>
                                        <label className="flex items-center justify-between p-3 cursor-pointer">
                                            <div>
                                                <p className="font-semibold text-slate-800 dark:text-slate-200">{exp.description}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{exp.date} - {formatCurrency(exp.amount)}</p>
                                            </div>
                                            <input type="radio" name="expense" value={exp.id} checked={selectedExpenseId === exp.id} onChange={(e) => setSelectedExpenseId(e.target.value)} className="form-radio h-5 w-5 text-primary-600" />
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-slate-500 p-4">لا توجد حركات مالية متاحة أو تطابق البحث.</p>
                        )}
                    </div>
                </div>
                
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4 flex-shrink-0">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold">إلغاء</button>
                    <button type="button" onClick={handleConfirm} className="bg-primary-600 text-white px-8 py-2 rounded-lg hover:bg-primary-700 font-semibold shadow-sm disabled:opacity-50" disabled={!selectedExpenseId}>
                        ربط المستند
                    </button>
                </div>
            </div>
        </div>
    );
};

const UploadDocumentPanel: React.FC<{ onClose: () => void; onSave: (documents: SaleDocument[]) => void }> = ({ onClose, onSave }) => {
    const { addToast } = useToast();
    const [files, setFiles] = useState<FileList | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
            const selectedFiles = Array.from(e.target.files);
            
            // Check size only for files that won't be compressed
            // FIX: Explicitly typed the `file` parameter as `File` to resolve a TypeScript type inference error.
            const nonCompressibleFiles = selectedFiles.filter((file: File) => !file.type.startsWith('image/') || file.type.includes('svg'));
            // FIX: Explicitly typed the `file` parameter as `File` to resolve a TypeScript type inference error.
            const largeFiles = nonCompressibleFiles.filter((file: File) => file.size > MAX_FILE_SIZE);

            if (largeFiles.length > 0) {
                // FIX: Explicitly typed the `f` parameter as `File` to resolve a TypeScript type inference error.
                addToast(`الملفات التالية كبيرة جدًا: ${largeFiles.map((f: File) => f.name).join(', ')}. الحجم الأقصى للملفات غير الصور هو 4MB.`, 'error');
                e.target.value = ''; // Reset file input
                setFiles(null);
                return;
            }

            setFiles(e.target.files);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!files || files.length === 0) {
            addToast('يرجى اختيار ملف واحد على الأقل.', 'error');
            return;
        }

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
            const newDocs = await Promise.all(Array.from(files).map(fileToDoc));
            onSave(newDocs);
        } catch (error: any) {
            addToast('حدث خطأ أثناء معالجة الملفات.', 'error');
            console.error('File processing error:', error.message);
        }
    };

    return (
         <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4 pt-20 animate-drawer-overlay-show" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-xl animate-fade-in-scale-up" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">رفع مستندات جديدة</h2>
                        <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><CloseIcon className="h-6 w-6"/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <div className="flex text-sm text-slate-600 dark:text-slate-400">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-slate-800 rounded-md font-medium text-primary-600 hover:text-primary-500">
                                        <span>اختر ملفات للرفع</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} multiple />
                                    </label>
                                </div>
                                {files && files.length > 0 ? (
                                    <div className="mt-4 text-left">
                                        <ul className="list-disc pl-5 mt-2 text-sm text-slate-600 dark:text-slate-400 max-h-28 overflow-y-auto">
                                            {/* FIX: Explicitly typed the `f` parameter as `File` to resolve a TypeScript type inference error. */}
                                            {Array.from(files).map((f: File, i) => <li key={i}>{f.name}</li>)}
                                        </ul>
                                    </div>
                                ) : <p className="text-xs text-slate-500">يمكنك سحب وإفلات الملفات هنا</p>}
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold">إلغاء</button>
                        <button type="submit" className="bg-primary-600 text-white px-8 py-2 rounded-lg hover:bg-primary-700 font-semibold shadow-sm" disabled={!files || files.length === 0}>رفع</button>
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
    const [filter, setFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
    const { addToast } = useToast();

    const loadData = () => {
        setAllDocuments(JSON.parse(localStorage.getItem('accountingDocuments') || '[]'));
        setExpenses(JSON.parse(localStorage.getItem('expenses') || '[]'));
    };

    useEffect(() => {
        loadData();
    }, []);

    const expenseMap = useMemo(() => {
        const map = new Map<string, Expense>();
        expenses.forEach(exp => map.set(exp.id, exp));
        return map;
    }, [expenses]);
    
    const filteredDocuments = useMemo(() => {
        let docs = allDocuments;
        if (filter === 'linked') docs = docs.filter(d => d.expenseId);
        if (filter === 'unlinked') docs = docs.filter(d => !d.expenseId);
        return docs.sort((a,b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime());
    }, [allDocuments, filter]);

    const handleSaveUploads = (newDocs: SaleDocument[]) => {
        try {
            const updatedDocs = [...allDocuments, ...newDocs];
            localStorage.setItem('accountingDocuments', JSON.stringify(updatedDocs));
            loadData();
            logActivity('Upload Documents', `Uploaded ${newDocs.length} new document(s).`);
            addToast(`تم رفع ${newDocs.length} مستند(ات) بنجاح!`, 'success');
            setIsUploadModalOpen(false);
        } catch (e: any) {
            if (e.name === 'QuotaExceededError') {
                addToast('مساحة التخزين ممتلئة. لا يمكن حفظ المستندات الجديدة.', 'error');
            } else {
                addToast('حدث خطأ غير متوقع أثناء حفظ المستندات.', 'error');
            }
            console.error(e);
        }
    };

    const handleLink = (documentId: string, expenseId: string) => {
        const docs: SaleDocument[] = JSON.parse(localStorage.getItem('accountingDocuments') || '[]');
        const exps: Expense[] = JSON.parse(localStorage.getItem('expenses') || '[]');
        
        const docIndex = docs.findIndex(d => d.id === documentId);
        const expIndex = exps.findIndex(e => e.id === expenseId);

        if (docIndex === -1 || expIndex === -1) {
            addToast('خطأ: لم يتم العثور على المستند أو الحركة المالية.', 'error');
            return;
        }
        
        docs[docIndex].expenseId = expenseId;
        if (!exps[expIndex].documents) exps[expIndex].documents = [];
        exps[expIndex].documents!.push(docs[docIndex]);
        
        localStorage.setItem('accountingDocuments', JSON.stringify(docs));
        localStorage.setItem('expenses', JSON.stringify(exps));
        loadData();
        addToast('تم ربط المستند بنجاح!', 'success');
        logActivity('Link Document', `Linked doc ${documentId} to expense ${expenseId}`);
        setIsLinkModalOpen(false);
        setDocumentToLink(null);
    };

    const handleUnlink = (docToUnlink: SaleDocument) => {
        if (!docToUnlink.expenseId) return;

        const docs: SaleDocument[] = JSON.parse(localStorage.getItem('accountingDocuments') || '[]');
        const exps: Expense[] = JSON.parse(localStorage.getItem('expenses') || '[]');
        
        const docIndex = docs.findIndex(d => d.id === docToUnlink.id);
        const expIndex = exps.findIndex(e => e.id === docToUnlink.expenseId);

        if (docIndex > -1) {
            delete docs[docIndex].expenseId;
        }
        if (expIndex > -1) {
            exps[expIndex].documents = exps[expIndex].documents?.filter(d => d.id !== docToUnlink.id);
        }

        localStorage.setItem('accountingDocuments', JSON.stringify(docs));
        localStorage.setItem('expenses', JSON.stringify(exps));
        loadData();
        addToast('تم فك ارتباط المستند.', 'info');
        logActivity('Unlink Document', `Unlinked doc ${docToUnlink.id} from expense ${docToUnlink.expenseId}`);
    };

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">مستودع المستندات</h2>
                <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-sm flex items-center gap-2"
                >
                    <UploadIcon className="h-5 w-5" />
                    <span>رفع مستندات</span>
                </button>
            </div>

            <div className="mb-4 flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-full self-start border border-slate-200 dark:border-slate-700">
                {(['all', 'unlinked', 'linked'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={`px-5 py-2 text-sm font-bold rounded-full transition-colors ${filter === f ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-600 dark:text-slate-300'}`}>
                        {f === 'all' ? 'الكل' : f === 'unlinked' ? 'غير المرتبطة' : 'المرتبطة'}
                    </button>
                ))}
            </div>

            {filteredDocuments.length > 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المستند</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">تاريخ الرفع</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الحالة</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الحركة المرتبطة</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDocuments.map(doc => {
                                const linkedExpense = doc.expenseId ? expenseMap.get(doc.expenseId) : null;
                                return (
                                <tr key={doc.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                                    <td className="p-4 font-medium text-slate-800 dark:text-slate-100">
                                        <button onClick={() => setViewingDocument(doc)} className="flex items-center gap-3 hover:text-primary-600">
                                            <FileIcon mimeType={doc.mimeType} className="h-6 w-6" />
                                            <span>{doc.name}</span>
                                        </button>
                                    </td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('ar-EG') : '-'}</td>
                                    <td className="p-4">
                                        {linkedExpense ? (
                                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 flex items-center gap-1.5 w-fit">
                                                <CheckCircleIcon className="h-4 w-4" /> مرتبطة
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">غير مرتبطة</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{linkedExpense?.description || '—'}</td>
                                    <td className="p-4 whitespace-nowrap">
                                        {linkedExpense ? (
                                            <button onClick={() => handleUnlink(doc)} className="text-rose-600 hover:underline font-semibold">فك الارتباط</button>
                                        ) : (
                                            <button onClick={() => { setDocumentToLink(doc); setIsLinkModalOpen(true); }} className="text-primary-600 hover:underline font-semibold flex items-center gap-1">
                                                <LinkIcon className="h-4 w-4"/> ربط بحركة
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
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
            {isLinkModalOpen && documentToLink && <LinkExpenseModal documentToLink={documentToLink} expenses={expenses} onClose={() => setIsLinkModalOpen(false)} onLink={handleLink} />}
            {viewingDocument && <AttachmentViewerModal document={viewingDocument} onClose={() => setViewingDocument(null)} />}
        </div>
    );
};

export default DocumentsAccounting;