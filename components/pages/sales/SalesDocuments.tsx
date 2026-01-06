import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { Customer, Booking, Unit, Document } from '../../../types';
import { FileIcon, SpinnerIcon, SearchIcon, CloseIcon, EyeIcon, TrashIcon } from '../../shared/Icons';
import { useProject } from '../../../contexts/ProjectContext';
import { useToast } from '../../../contexts/ToastContext';
import ProjectSelector from '../../shared/ProjectSelector';
import Modal from '../../shared/Modal';
import { customersService, bookingsService, unitsService, documentsService } from '../../../src/services/supabaseService';
import { storageService, AttachmentMetadata } from '../../../src/services/storageService';
import gsap from 'gsap';

interface DocumentWithUrl {
    id: string;
    fileName: string;
    storagePath: string;
    fileType?: string;
    uploadedAt: string;
    publicUrl?: string;
}

interface InstallmentAttachment {
    installmentNumber: number;
    dueDate: string;
    amount: number;
    paidDate: string;
    attachment: AttachmentMetadata | null;
    publicUrl?: string;
}

interface BookingWithInstallments {
    bookingId: string;
    unitName: string;
    installments: InstallmentAttachment[];
}

interface CustomerWithDocuments {
    customer: Customer;
    customerDocs: DocumentWithUrl[];
    bookings: {
        booking: Booking;
        bookingDocs: DocumentWithUrl[];
    }[];
    // مرفقات الأقساط
    installmentBookings: BookingWithInstallments[];
}

// مكون القائمة المنسدلة لوصولات الأقساط
const InstallmentDropdown: React.FC<{
    unitName: string;
    customerName: string;
    installments: InstallmentAttachment[];
    onPreview: (attachment: AttachmentMetadata | null, publicUrl?: string) => void;
    formatDate: (date: string) => string;
}> = ({ unitName, customerName, installments, onPreview, formatDate }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const totalInstallments = installments.length;
    const totalAmount = installments.reduce((sum, i) => sum + i.amount, 0);
    
    return (
        <div className="p-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
            {/* Header - عنوان الوحدة والعميل */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between gap-2 text-right"
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <svg className={`w-4 h-4 text-amber-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{unitName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{customerName}</p>
                    </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/30 text-amber-300">
                    {totalInstallments} قسط
                </span>
            </button>
            
            {/* Installments List */}
            {isOpen && (
                <div className="mt-2 pt-2 border-t border-amber-500/20 space-y-1.5">
                    {installments.map((inst, index) => (
                        <div 
                            key={index}
                            className="flex items-center gap-2 p-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors group"
                        >
                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold text-emerald-400">#{inst.installmentNumber}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-emerald-400 font-medium">
                                        {inst.amount.toLocaleString()} ر.س
                                    </span>
                                    <span className="text-[10px] text-slate-500">•</span>
                                    <span className="text-[10px] text-slate-400">
                                        {formatDate(inst.paidDate)}
                                    </span>
                                </div>
                                {inst.attachment && (
                                    <p className="text-[9px] text-slate-500 truncate">{inst.attachment.file_name}</p>
                                )}
                            </div>
                            {inst.attachment && inst.publicUrl && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onPreview(inst.attachment, inst.publicUrl);
                                    }}
                                    className="p-1 rounded hover:bg-primary-500/20 text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="عرض الوصل"
                                >
                                    <EyeIcon className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const SalesDocuments: React.FC = () => {
    const { activeProject, availableProjects, setActiveProject } = useProject();
    const { addToast } = useToast();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [customersWithDocs, setCustomersWithDocs] = useState<CustomerWithDocuments[]>([]);
    
    // Preview modal state
    const [previewDocument, setPreviewDocument] = useState<DocumentWithUrl | null>(null);
    
    // GSAP Animation Ref
    const cardsRef = useRef<HTMLDivElement>(null);
    const hasAnimated = useRef(false);

    useEffect(() => {
        loadData();
    }, []);

    // 🎬 GSAP Cards Animation
    useLayoutEffect(() => {
        if (cardsRef.current && !loading && customersWithDocs.length > 0 && !hasAnimated.current) {
            hasAnimated.current = true;
            const cards = cardsRef.current.querySelectorAll('.customer-card');
            gsap.fromTo(cards,
                { opacity: 0, y: 20, scale: 0.95 },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.4,
                    stagger: 0.08,
                    ease: "power2.out",
                    delay: 0.1
                }
            );
        }
    }, [customersWithDocs, loading]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [customersData, bookingsData, unitsData, installmentAttachmentsData] = await Promise.all([
                customersService.getAll(),
                bookingsService.getAll(),
                unitsService.getAll(),
                storageService.getAllInstallmentAttachments()
            ]);
            
            setCustomers(customersData);
            setBookings(bookingsData);
            setUnits(unitsData);
            
            // إنشاء خريطة لمرفقات الأقساط حسب العميل
            const installmentsByCustomer = new Map<string, BookingWithInstallments[]>();
            for (const customerData of installmentAttachmentsData) {
                const bookingsWithUrls: BookingWithInstallments[] = [];
                for (const booking of customerData.bookings) {
                    const installmentsWithUrls: InstallmentAttachment[] = [];
                    for (const inst of booking.installments) {
                        let publicUrl = '';
                        if (inst.attachment?.file_path) {
                            try {
                                publicUrl = await storageService.getPublicUrl(inst.attachment.file_path, 86400) || '';
                            } catch (e) {
                                console.warn('Failed to get signed URL for attachment:', e);
                            }
                        }
                        installmentsWithUrls.push({
                            ...inst,
                            publicUrl
                        });
                    }
                    bookingsWithUrls.push({
                        bookingId: booking.bookingId,
                        unitName: booking.unitName,
                        installments: installmentsWithUrls
                    });
                }
                installmentsByCustomer.set(customerData.customerId, bookingsWithUrls);
            }
            
            // Load documents for each customer and their bookings
            const customersWithDocuments: CustomerWithDocuments[] = [];
            
            for (const customer of customersData) {
                // Get customer documents
                const customerDocs = await documentsService.getForCustomer(customer.id);
                const customerDocsWithUrls: DocumentWithUrl[] = [];
                
                for (const doc of customerDocs) {
                    try {
                        const signedUrl = await documentsService.getSignedUrl(doc.storagePath, 86400);
                        customerDocsWithUrls.push({ ...doc, publicUrl: signedUrl });
                    } catch (error) {
                        customerDocsWithUrls.push({ ...doc, publicUrl: '' });
                    }
                }
                
                // Get bookings for this customer
                const customerBookings = bookingsData.filter(b => b.customerId === customer.id);
                const bookingsWithDocs: { booking: Booking; bookingDocs: DocumentWithUrl[] }[] = [];
                
                for (const booking of customerBookings) {
                    const bookingDocs = await documentsService.getForBooking(booking.id);
                    const bookingDocsWithUrls: DocumentWithUrl[] = [];
                    
                    for (const doc of bookingDocs) {
                        try {
                            const signedUrl = await documentsService.getSignedUrl(doc.storagePath, 86400);
                            bookingDocsWithUrls.push({ ...doc, publicUrl: signedUrl });
                        } catch (error) {
                            bookingDocsWithUrls.push({ ...doc, publicUrl: '' });
                        }
                    }
                    
                    bookingsWithDocs.push({ booking, bookingDocs: bookingDocsWithUrls });
                }
                
                // الحصول على مرفقات الأقساط لهذا العميل
                const installmentBookings = installmentsByCustomer.get(customer.id) || [];
                
                // أضف العملاء الذين لديهم حجوزات أو مستندات أو مرفقات أقساط
                const hasBookings = customerBookings.length > 0;
                const hasDocuments = customerDocsWithUrls.length > 0 || 
                    bookingsWithDocs.some(b => b.bookingDocs.length > 0);
                const hasInstallmentAttachments = installmentBookings.length > 0;
                
                if (hasBookings || hasDocuments || hasInstallmentAttachments) {
                    customersWithDocuments.push({
                        customer,
                        customerDocs: customerDocsWithUrls,
                        bookings: bookingsWithDocs,
                        installmentBookings
                    });
                }
            }
            
            setCustomersWithDocs(customersWithDocuments);
        } catch (error) {
            console.error('Error loading data:', error);
            addToast('فشل في تحميل البيانات', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Filter by project and search term
    const filteredCustomersWithDocs = useMemo(() => {
        let result = customersWithDocs;
        
        // Filter by project
        if (activeProject) {
            result = result.filter(item => {
                // Check if customer is linked to this project
                if (item.customer.projectId === activeProject.id) return true;
                
                // Check if any of their bookings are for units in this project
                const hasBookingInProject = item.bookings.some(b => {
                    const unit = units.find(u => u.id === b.booking.unitId);
                    return unit?.projectId === activeProject.id;
                });
                
                return hasBookingInProject;
            });
        }
        
        // Filter by search term
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            result = result.filter(item => 
                item.customer.name.toLowerCase().includes(search) ||
                item.customer.phone.includes(search) ||
                item.customer.email?.toLowerCase().includes(search)
            );
        }
        
        return result;
    }, [customersWithDocs, activeProject, units, searchTerm]);

    const getUnitName = (unitId: string) => {
        const unit = units.find(u => u.id === unitId);
        return unit?.name || 'غير معروف';
    };

    const handleDeleteDocument = async (docId: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المستند؟')) return;
        
        try {
            await documentsService.delete(docId);
            addToast('تم حذف المستند بنجاح', 'success');
            // Reload data
            hasAnimated.current = false;
            loadData();
        } catch (error) {
            console.error('Error deleting document:', error);
            addToast('فشل في حذف المستند', 'error');
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">مستندات البيع</h2>
            
            <ProjectSelector 
                projects={availableProjects} 
                activeProject={activeProject} 
                onSelectProject={setActiveProject} 
            />
            
            {/* Search */}
            <div className="mb-6">
                <div className="relative w-full md:w-80">
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <SearchIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="بحث عن عميل..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field w-full pr-10 pl-4"
                    />
                </div>
            </div>
            
            {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <SpinnerIcon className="h-12 w-12 text-primary-600" />
                    <p className="text-slate-500 dark:text-slate-400">جاري تحميل المستندات...</p>
                </div>
            ) : filteredCustomersWithDocs.length === 0 ? (
                <div className="text-center py-16 glass-card border-2 border-dashed border-white/20">
                    <svg className="h-16 w-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-white">لا يوجد عملاء</h3>
                    <p className="mt-1 text-sm text-slate-300">لا يوجد عملاء لديهم حجوزات حالياً.</p>
                </div>
            ) : (
                <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredCustomersWithDocs.map((item) => (
                        <div key={item.customer.id} className="customer-card glass-card p-3 hover:shadow-lg transition-shadow duration-300">
                            {/* Customer Header */}
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm">
                                    {item.customer.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-sm text-white truncate">{item.customer.name}</h3>
                                    <p className="text-xs text-slate-400">{item.customer.phone}</p>
                                </div>
                            </div>
                            
                            {/* Customer Documents */}
                            {item.customerDocs.length > 0 && (
                                <div className="mb-3">
                                    <h4 className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        مستندات العميل ({item.customerDocs.length})
                                    </h4>
                                    <div className="space-y-1">
                                        {item.customerDocs.map(doc => (
                                            <div key={doc.id} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
                                                <FileIcon mimeType={doc.fileType} className="h-6 w-6 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-white truncate">{doc.fileName}</p>
                                                </div>
                                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => setPreviewDocument(doc)}
                                                        className="p-1 rounded hover:bg-primary-500/20 text-primary-400"
                                                        title="عرض"
                                                    >
                                                        <EyeIcon className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteDocument(doc.id)}
                                                        className="p-1 rounded hover:bg-rose-500/20 text-rose-400"
                                                        title="حذف"
                                                    >
                                                        <TrashIcon className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Booking Documents */}
                            {item.bookings.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        الحجوزات ({item.bookings.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {item.bookings.map(({ booking, bookingDocs }) => (
                                            <div key={booking.id} className="p-2 rounded-lg bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                                                <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                                                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/20 text-emerald-400">
                                                        {getUnitName(booking.unitId)}
                                                    </span>
                                                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                                                        booking.status === 'Active' ? 'bg-blue-500/20 text-blue-400' :
                                                        booking.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        'bg-rose-500/20 text-rose-400'
                                                    }`}>
                                                        {booking.status === 'Active' ? 'نشط' : booking.status === 'Completed' ? 'مكتمل' : 'ملغي'}
                                                    </span>
                                                </div>
                                                {bookingDocs.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {bookingDocs.map(doc => (
                                                            <div key={doc.id} className="flex items-center gap-1 p-1 rounded bg-white/5 hover:bg-white/10 transition-colors group">
                                                                <FileIcon mimeType={doc.fileType} className="h-5 w-5 flex-shrink-0" />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[11px] font-medium text-white truncate">{doc.fileName}</p>
                                                                </div>
                                                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button 
                                                                        onClick={() => setPreviewDocument(doc)}
                                                                        className="p-0.5 rounded hover:bg-primary-500/20 text-primary-400"
                                                                        title="عرض"
                                                                    >
                                                                        <EyeIcon className="h-3 w-3" />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleDeleteDocument(doc.id)}
                                                                        className="p-0.5 rounded hover:bg-rose-500/20 text-rose-400"
                                                                        title="حذف"
                                                                    >
                                                                        <TrashIcon className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] text-slate-500 text-center py-1">لا توجد مستندات</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Installment Receipts / وصولات الأقساط */}
                            {item.installmentBookings && item.installmentBookings.length > 0 && (
                                <div className="mt-3">
                                    <h4 className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        وصولات الأقساط ({item.installmentBookings.reduce((sum, b) => sum + b.installments.length, 0)})
                                    </h4>
                                    <div className="space-y-2">
                                        {item.installmentBookings.map((booking) => (
                                            <InstallmentDropdown 
                                                key={booking.bookingId}
                                                unitName={booking.unitName}
                                                customerName={item.customer.name}
                                                installments={booking.installments}
                                                onPreview={(attachment, publicUrl) => {
                                                    if (attachment && publicUrl) {
                                                        setPreviewDocument({
                                                            id: attachment.id,
                                                            fileName: attachment.file_name,
                                                            storagePath: attachment.file_path,
                                                            fileType: attachment.file_type,
                                                            uploadedAt: attachment.uploaded_at,
                                                            publicUrl: publicUrl
                                                        });
                                                    }
                                                }}
                                                formatDate={formatDate}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Total documents count */}
                            <div className="mt-2 pt-2 border-t border-white/10 text-center text-[10px] text-slate-500">
                                {item.customerDocs.length + 
                                 item.bookings.reduce((sum, b) => sum + b.bookingDocs.length, 0) +
                                 (item.installmentBookings?.reduce((sum, b) => sum + b.installments.filter(i => i.attachment).length, 0) || 0)} مستند
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Document Preview Modal */}
            <Modal
                isOpen={!!previewDocument}
                onClose={() => setPreviewDocument(null)}
                title={previewDocument ? (
                    <div className="flex items-center gap-3">
                        <FileIcon mimeType={previewDocument.fileType} className="h-6 w-6" />
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-base truncate">{previewDocument.fileName}</div>
                            <div className="text-xs text-slate-400 font-normal">
                                {previewDocument.fileType} • {formatDate(previewDocument.uploadedAt)}
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
                                    onClick={() => {
                                        setPreviewDocument(null);
                                        loadData();
                                    }}
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
                                    className="max-w-full max-h-[70vh] rounded-lg shadow-xl object-contain"
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

export default SalesDocuments;
