import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { UnitSaleRecord, Unit, Customer, Account, Transaction, SaleDocument, Document } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useProject } from '../../../contexts/ProjectContext';
import ProjectSelector from '../../shared/ProjectSelector';
import logActivity from '../../../utils/activityLogger';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { CloseIcon, TrendingUpIcon, PaperClipIcon } from '../../shared/Icons';
import Modal from '../../shared/Modal';
import DocumentViewerModal from '../../shared/DocumentViewerModal';
import { unitSalesService, unitsService, customersService, transactionsService, documentsService, accountsService } from '../../../src/services/supabaseService';

const UnitSales: React.FC = () => {
    const { addToast } = useToast();
    const { currentUser } = useAuth();
    const { activeProject, availableProjects, setActiveProject } = useProject();
    const [sales, setSales] = useState<UnitSaleRecord[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saleDocuments, setSaleDocuments] = useState<Map<string, Document[]>>(new Map());
    const [documentUrls, setDocumentUrls] = useState<Map<string, string>>(new Map());
    const [viewDoc, setViewDoc] = useState<{ url: string; name: string; mimeType?: string } | null>(null);
    
    // GSAP Table Animation Ref
    const tableBodyRef = useRef<HTMLTableSectionElement>(null);
    const hasAnimated = useRef(false);

    // Filter sales by active project (through unit relationship)
    const filteredSales = useMemo(() => {
        if (!activeProject) return sales;
        
        return sales.filter(sale => {
            const unit = units.find(u => u.id === sale.unitId);
            return unit?.projectId === activeProject.id;
        });
    }, [sales, units, activeProject]);

    // 🎬 GSAP Table Animation - runs only once
    useLayoutEffect(() => {
        if (tableBodyRef.current && !loading && filteredSales.length > 0 && !hasAnimated.current) {
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
    }, [filteredSales, loading]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            
            const [unitsData, customersData, accountsData, salesData] = await Promise.all([
                unitsService.getAll(),
                customersService.getAll(),
                accountsService.getAll(), // Load accounts from Supabase
                unitSalesService.getAll(), // Load sales from Supabase
            ]);
            setSales(salesData);
            setUnits(unitsData);
            setCustomers(customersData);
            setAccounts(accountsData);

            // Load documents for each sale from Supabase
            await loadSaleDocuments(salesData);
        } catch (error) {
            console.error('Error loading data:', error);
            addToast('خطأ في تحميل البيانات.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadSaleDocuments = async (sales: UnitSaleRecord[]) => {
        try {
            const docsMap = new Map<string, Document[]>();
            const urlsMap = new Map<string, string>();
            
            for (const sale of sales) {
                const docs = await documentsService.getForSale(sale.id);
                if (docs && docs.length > 0) {
                    docsMap.set(sale.id, docs);
                    
                    // Generate signed URLs for each document
                    for (const doc of docs) {
                        try {
                            const signedUrl = await documentsService.getSignedUrl(doc.storagePath);
                            urlsMap.set(`${sale.id}_${doc.id}`, signedUrl);
                        } catch (error) {
                            console.error('Error generating signed URL:', error);
                        }
                    }
                }
            }
            setSaleDocuments(docsMap);
            setDocumentUrls(urlsMap);
        } catch (error) {
            console.error('Error loading sale documents:', error);
        }
    };

    const handleSave = async (saleData: Omit<UnitSaleRecord, 'id' | 'unitName' | 'customerName'>, documents: File[]) => {
        const unit = units.find(u => u.id === saleData.unitId);
        const customer = customers.find(c => c.id === saleData.customerId);
        const account = accounts.find(a => a.id === saleData.accountId);

        if (!unit || !customer || !account) {
            addToast('بيانات غير مكتملة. يرجى التحقق من الوحدة والعميل والحساب.', 'error');
            return;
        }

        try {
            // 1. Create Transaction in Supabase
            const newTransaction = await transactionsService.create({
                accountId: saleData.accountId,
                accountName: account.name,
                type: 'Deposit',
                date: saleData.saleDate,
                description: `بيع الوحدة ${unit.name} إلى ${customer.name}`,
                amount: saleData.finalSalePrice,
                projectId: unit.projectId,
                sourceType: 'Sale'
            });

            // 2. Create Sale Record in Supabase
            const newSale = await unitSalesService.create({
                unitId: saleData.unitId,
                unitName: unit.name,
                customerId: saleData.customerId,
                customerName: customer.name,
                salePrice: unit.price,
                finalSalePrice: saleData.finalSalePrice,
                saleDate: saleData.saleDate,
                documents: [],
                accountId: saleData.accountId,
                transactionId: newTransaction.id,
                projectId: unit.projectId
            });

            // 3. Update transaction with sourceId
            await transactionsService.update(newTransaction.id, { sourceId: newSale.id });

            // 4. Upload documents to Supabase Storage
            if (documents.length > 0) {
                for (const doc of documents) {
                    await documentsService.upload(doc, { sale_id: newSale.id });
                }
                addToast(`تم رفع ${documents.length} مستندات بنجاح.`, 'success');
                
                // Reload documents for this sale
                const uploadedDocs = await documentsService.getForSale(newSale.id);
                setSaleDocuments(prev => new Map(prev).set(newSale.id, uploadedDocs));
                
                // Generate signed URLs for uploaded documents
                const urlsMap = new Map(documentUrls);
                for (const doc of uploadedDocs) {
                    try {
                        const signedUrl = await documentsService.getSignedUrl(doc.storagePath);
                        urlsMap.set(`${newSale.id}_${doc.id}`, signedUrl);
                    } catch (error) {
                        console.error('Error generating signed URL:', error);
                    }
                }
                setDocumentUrls(urlsMap);
            }

            // 5. Update unit status to Sold and assign customer
            await unitsService.update(unit.id, { 
                status: 'Sold',
                customerId: customer.id
            });

            addToast('تم تسجيل عملية البيع بنجاح!', 'success');
            logActivity('New Sale', `Sold unit ${unit.name} to ${customer.name}`, 'projects');
            setIsModalOpen(false);
            loadData();
        } catch (error) {
            console.error("Error saving sale:", error);
            addToast('فشل في حفظ عملية البيع.', 'error');
        }
    };

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">سجل المبيعات</h2>
                <button onClick={() => setIsModalOpen(true)} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700">
                    تسجيل عملية بيع
                </button>
            </div>
            
            <ProjectSelector 
                projects={availableProjects} 
                activeProject={activeProject} 
                onSelectProject={setActiveProject}
                disabled={!!currentUser?.assignedProjectId}
                showAllProjectsOption={currentUser?.role === 'Admin'}
            />
            
            {loading ? <p className="text-slate-300">جاري تحميل البيانات...</p> : (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right min-w-[700px]">
                        <thead><tr className="border-b-2 border-white/20 bg-white/5"><th className="p-4 font-bold text-sm text-slate-200">الوحدة</th><th className="p-4 font-bold text-sm text-slate-200">العميل</th><th className="p-4 font-bold text-sm text-slate-200">تاريخ البيع</th><th className="p-4 font-bold text-sm text-slate-200">سعر البيع النهائي</th><th className="p-4 font-bold text-sm text-slate-200">المستندات</th></tr></thead>
                        <tbody ref={tableBodyRef}>
                            {filteredSales.map(sale => {
                                const docs = saleDocuments.get(sale.id) || [];
                                return (
                                    <tr key={sale.id} className="border-b border-white/10 hover:bg-white/5">
                                        <td className="p-4 font-medium text-slate-100">{sale.unitName}</td>
                                        <td className="p-4 text-slate-300">{sale.customerName}</td>
                                        <td className="p-4 text-slate-300">{sale.saleDate}</td>
                                        <td className="p-4 font-semibold text-emerald-400">{formatCurrency(sale.finalSalePrice)}</td>
                                        <td className="p-4">
                                            {docs.length > 0 ? (
                                                <div className="flex flex-col gap-2">
                                                    {docs.map((doc, idx) => {
                                                        const signedUrl = documentUrls.get(`${sale.id}_${doc.id}`);
                                                        return (
                                                            <button
                                                                key={idx}
                                                                onClick={() => {
                                                                    if (signedUrl) {
                                                                        setViewDoc({ 
                                                                            url: signedUrl, 
                                                                            name: doc.fileName || doc.file_name, 
                                                                            mimeType: doc.file_type 
                                                                        });
                                                                    }
                                                                }}
                                                                className={`text-blue-300 hover:text-blue-200 hover:underline text-sm flex items-center gap-1 ${!signedUrl ? 'opacity-50 cursor-wait' : ''}`}
                                                                disabled={!signedUrl}
                                                            >
                                                                📄 {doc.fileName || doc.file_name}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-sm">لا يوجد</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    </div>
                    {sales.length === 0 && <p className="text-center p-8 text-slate-300">لا توجد عمليات بيع مسجلة.</p>}
                </div>
            )}
            {isModalOpen && <SalePanel units={units.filter(u => u.status === 'Available' || u.status === 'متاح')} customers={customers} accounts={accounts} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
            {viewDoc && (
                <DocumentViewerModal
                    isOpen={true}
                    onClose={() => setViewDoc(null)}
                    url={viewDoc.url}
                    fileName={viewDoc.name}
                    mimeType={viewDoc.mimeType}
                />
            )}
        </div>
    );
};

interface PanelProps { units: Unit[]; customers: Customer[]; accounts: Account[]; onClose: () => void; onSave: (data: Omit<UnitSaleRecord, 'id'|'unitName'|'customerName'>, documents: File[]) => void; }

const SalePanel: React.FC<PanelProps> = ({ units, customers, accounts, onClose, onSave }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        unitId: '',
        customerId: '',
        finalSalePrice: 0,
        saleDate: new Date().toISOString().split('T')[0],
        accountId: '',
    });
    const [documents, setDocuments] = useState<File[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setDocuments(Array.from(e.target.files));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.unitId || !formData.customerId || !formData.accountId || formData.finalSalePrice <= 0) {
            addToast('يرجى ملء جميع الحقول.', 'error');
            return;
        }
        onSave(formData, documents);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        // When unit is selected, automatically set the price
        if (name === 'unitId') {
            const selectedUnit = units.find(u => u.id === value);
            if (selectedUnit) {
                setFormData(prev => ({ 
                    ...prev, 
                    unitId: value,
                    finalSalePrice: selectedUnit.price 
                }));
                return;
            }
        }
        
        setFormData(prev => ({ ...prev, [name]: name === 'finalSalePrice' ? Number(value) : value }));
    };

    return (
        <Modal 
            isOpen={true} 
            onClose={onClose} 
            title="تسجيل عملية بيع" 
            size="md"
            footer={
                <div className="flex justify-end gap-4 w-full">
                    <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
                    <button type="submit" form="sale-form" className="btn-primary">حفظ</button>
                </div>
            }
        >
                <form id="sale-form" onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-4">
                        <div>
                            <label className="input-label">الوحدة السكنية <span className="text-rose-400">*</span></label>
                            <select name="unitId" value={formData.unitId} onChange={handleChange} className="input-field" required>
                                <option value="">اختر الوحدة المباعة</option>
                                {units.map(u => <option key={u.id} value={u.id}>{u.name} - {formatCurrency(u.price)}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="input-label">العميل <span className="text-rose-400">*</span></label>
                            <select name="customerId" value={formData.customerId} onChange={handleChange} className="input-field" required>
                                <option value="">اختر العميل</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="input-label">حساب الإيداع <span className="text-rose-400">*</span></label>
                            <select name="accountId" value={formData.accountId} onChange={handleChange} className="input-field" required>
                                <option value="">اختر حساب الإيداع</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="input-label">سعر البيع النهائي</label>
                            <input type="text" value={formData.finalSalePrice > 0 ? formatCurrency(formData.finalSalePrice) : ''} readOnly className="input-field opacity-60 cursor-not-allowed" placeholder="سيتم تحديده تلقائياً عند اختيار الوحدة" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">تاريخ البيع</label>
                            <input type="date" name="saleDate" value={formData.saleDate} onChange={handleChange} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" required />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">مستندات عملية البيع</label>
                            <div className="mt-2 flex justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 px-6 py-8 hover:border-primary-500 dark:hover:border-primary-400 transition-colors bg-slate-50/50 dark:bg-slate-800/50">
                                <div className="text-center">
                                    <PaperClipIcon className="mx-auto h-12 w-12 text-slate-400" aria-hidden="true" />
                                    <div className="mt-4 flex text-sm leading-6 text-slate-600 dark:text-slate-400 justify-center">
                                        <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-semibold text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-600 focus-within:ring-offset-2">
                                            <span>ارفع ملفات</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} />
                                        </label>
                                        <p className="pr-1">أو اسحبها وأفلتها</p>
                                    </div>
                                    <p className="text-xs leading-5 text-slate-500">PNG, JPG, PDF up to 10MB</p>
                                </div>
                            </div>
                            {documents.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {documents.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg">
                                            <PaperClipIcon className="h-4 w-4" />
                                            <span className="truncate">{file.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </form>
        </Modal>
    );
};


export default UnitSales;
