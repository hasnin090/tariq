import React, { useState, useEffect } from 'react';
import { UnitSaleRecord, Unit, Customer, Account, Transaction, SaleDocument } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import logActivity from '../../utils/activityLogger';
import { formatCurrency } from '../../utils/currencyFormatter';
import { CloseIcon, TrendingUpIcon, PaperClipIcon } from '../shared/Icons';
import Modal from '../shared/Modal';
import { unitSalesService, unitsService, customersService, transactionsService, documentsService, accountsService } from '../../src/services/supabaseService';

const UnitSales: React.FC = () => {
    const { addToast } = useToast();
    const [sales, setSales] = useState<UnitSaleRecord[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            // Load data from localStorage and Supabase
            const accountsData: Account[] = JSON.parse(localStorage.getItem('accounts') || '[]');
            const salesData: UnitSaleRecord[] = JSON.parse(localStorage.getItem('unitSales') || '[]');
            
            const [unitsData, customersData] = await Promise.all([
                unitsService.getAll(),
                customersService.getAll(),
            ]);
            setSales(salesData);
            setUnits(unitsData);
            setCustomers(customersData);
            setAccounts(accountsData);
        } catch (error) {
            console.error('Error loading data:', error);
            addToast('خطأ في تحميل البيانات.', 'error');
        } finally {
            setLoading(false);
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
                sourceType: 'Sale'
            });

            // 2. Create Sale Record in localStorage (unitSales table doesn't exist in Supabase yet)
            const unitSales: UnitSaleRecord[] = JSON.parse(localStorage.getItem('unitSales') || '[]');
            const saleId = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newSale: UnitSaleRecord = {
                id: saleId,
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
            };
            unitSales.push(newSale);
            localStorage.setItem('unitSales', JSON.stringify(unitSales));

            // 3. Update transaction with sourceId
            await transactionsService.update(newTransaction.id, { sourceId: saleId });

            // 4. Upload documents to Supabase Storage
            if (documents.length > 0) {
                for (const doc of documents) {
                    await documentsService.upload(doc, { sale_id: saleId });
                }
                addToast(`تم رفع ${documents.length} مستندات بنجاح.`, 'success');
            }

            // 5. Update unit status to Sold
            await unitsService.update(unit.id, { 
                status: 'Sold'
            });

            addToast('تم تسجيل عملية البيع بنجاح!', 'success');
            logActivity('New Sale', `Sold unit ${unit.name} to ${customer.name}`);
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
            {loading ? <p>جاري تحميل البيانات...</p> : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-right">
                        <thead><tr className="border-b-2 bg-slate-100 dark:bg-slate-700"><th className="p-4 font-bold text-sm">الوحدة</th><th className="p-4 font-bold text-sm">العميل</th><th className="p-4 font-bold text-sm">تاريخ البيع</th><th className="p-4 font-bold text-sm">سعر البيع النهائي</th></tr></thead>
                        <tbody>
                            {sales.map(sale => (
                                <tr key={sale.id} className="border-b border-slate-200 dark:border-slate-700">
                                    <td className="p-4 font-medium">{sale.unitName}</td>
                                    <td className="p-4">{sale.customerName}</td>
                                    <td className="p-4">{sale.saleDate}</td>
                                    <td className="p-4 font-semibold text-emerald-600">{formatCurrency(sale.finalSalePrice)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {sales.length === 0 && <p className="text-center p-8 text-slate-500 dark:text-slate-400">لا توجد عمليات بيع مسجلة.</p>}
                </div>
            )}
            {isModalOpen && <SalePanel units={units.filter(u => u.status === 'Available')} customers={customers} accounts={accounts} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
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
        <Modal isOpen={true} onClose={onClose} title="تسجيل عملية بيع" size="lg">
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <select name="unitId" value={formData.unitId} onChange={handleChange} className="w-full p-2.5 border rounded-lg bg-white dark:bg-slate-700" required><option value="">اختر الوحدة المباعة</option>{units.map(u => <option key={u.id} value={u.id}>{u.name} - {formatCurrency(u.price)}</option>)}</select>
                        <select name="customerId" value={formData.customerId} onChange={handleChange} className="w-full p-2.5 border rounded-lg bg-white dark:bg-slate-700" required><option value="">اختر العميل</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                        <select name="accountId" value={formData.accountId} onChange={handleChange} className="w-full p-2.5 border rounded-lg bg-white dark:bg-slate-700" required><option value="">اختر حساب الإيداع</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">سعر البيع النهائي</label>
                            <input type="text" value={formData.finalSalePrice > 0 ? formatCurrency(formData.finalSalePrice) : ''} readOnly className="w-full p-2.5 border rounded-lg dark:bg-slate-700 bg-slate-50 dark:bg-slate-600 cursor-not-allowed" placeholder="سيتم تحديده تلقائياً عند اختيار الوحدة" />
                        </div>
                        <input type="date" name="saleDate" value={formData.saleDate} onChange={handleChange} className="w-full p-2.5 border rounded-lg dark:bg-slate-700" required />
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">مستندات عملية البيع</label>
                            <div className="mt-2 flex justify-center rounded-lg border border-dashed border-slate-900/25 dark:border-slate-50/25 px-6 py-10">
                                <div className="text-center">
                                    <PaperClipIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                                    <div className="mt-4 flex text-sm leading-6 text-gray-600">
                                        <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white dark:bg-slate-800 font-semibold text-primary-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-600 focus-within:ring-offset-2 hover:text-primary-500">
                                            <span>ارفع ملفات</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} />
                                        </label>
                                        <p className="pr-1">أو اسحبها وأفلتها</p>
                                    </div>
                                    <p className="text-xs leading-5 text-gray-600">PNG, JPG, PDF up to 10MB</p>
                                </div>
                            </div>
                            {documents.length > 0 && (
                                <div className="mt-2 text-sm text-slate-500">
                                    {documents.map(file => <span key={file.name} className="block">{file.name}</span>)}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-4"><button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border font-semibold">إلغاء</button><button type="submit" className="bg-primary-600 text-white px-8 py-2 rounded-lg font-semibold">حفظ</button></div>
                </form>
        </Modal>
    );
};


export default UnitSales;