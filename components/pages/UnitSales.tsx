import React, { useState, useEffect } from 'react';
import { UnitSaleRecord, Unit, Customer, Account, Transaction } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import logActivity from '../../utils/activityLogger';
import { formatCurrency } from '../../utils/currencyFormatter';
import { CloseIcon, TrendingUpIcon } from '../shared/Icons';

const UnitSales: React.FC = () => {
    const [sales, setSales] = useState<UnitSaleRecord[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        setSales(JSON.parse(localStorage.getItem('unitSales') || '[]'));
        setUnits(JSON.parse(localStorage.getItem('units') || '[]'));
        setCustomers(JSON.parse(localStorage.getItem('customers') || '[]'));
        setAccounts(JSON.parse(localStorage.getItem('accounts') || '[]'));
    }, []);

    const saveData = (key: string, data: any[]) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    const handleSave = (saleData: Omit<UnitSaleRecord, 'id' | 'unitName' | 'customerName' | 'documents'>) => {
        const unit = units.find(u => u.id === saleData.unitId);
        const customer = customers.find(c => c.id === saleData.customerId);
        const account = accounts.find(a => a.id === saleData.accountId);

        if (!unit || !customer || !account) {
            // Should show a toast message
            return;
        }

        const newSale: UnitSaleRecord = {
            id: `sale_${Date.now()}`,
            ...saleData,
            unitName: unit.name,
            customerName: customer.name,
            documents: [],
        };
        
        const newTransaction: Transaction = {
             id: `trans_${Date.now()}`,
            accountId: saleData.accountId,
            accountName: account.name,
            type: 'Deposit',
            date: saleData.saleDate,
            description: `بيع الوحدة ${unit.name} إلى ${customer.name}`,
            amount: saleData.finalSalePrice,
            sourceId: newSale.id,
            sourceType: 'Sale'
        };
        newSale.transactionId = newTransaction.id;

        const allSales = [...sales, newSale];
        saveData('unitSales', allSales);
        setSales(allSales);

        const allTransactions = [...JSON.parse(localStorage.getItem('transactions') || '[]'), newTransaction];
        saveData('transactions', allTransactions);
        
        const updatedUnits = units.map(u => u.id === unit.id ? { ...u, status: 'Sold', customerId: customer.id, customerName: customer.name } : u);
        saveData('units', updatedUnits);
        setUnits(updatedUnits);

        logActivity('New Sale', `Sold unit ${unit.name} to ${customer.name}`);
        setIsModalOpen(false);
    };

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">سجل المبيعات</h2>
                <button onClick={() => setIsModalOpen(true)} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700">
                    تسجيل عملية بيع
                </button>
            </div>
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
            {isModalOpen && <SalePanel units={units.filter(u => u.status !== 'Sold')} customers={customers} accounts={accounts} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
        </div>
    );
};

interface PanelProps { units: Unit[]; customers: Customer[]; accounts: Account[]; onClose: () => void; onSave: (data: Omit<UnitSaleRecord, 'id'|'unitName'|'customerName'|'documents'>) => void; }

const SalePanel: React.FC<PanelProps> = ({ units, customers, accounts, onClose, onSave }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        unitId: '',
        customerId: '',
        finalSalePrice: 0,
        saleDate: new Date().toISOString().split('T')[0],
        accountId: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.unitId || !formData.customerId || !formData.accountId || formData.finalSalePrice <= 0) {
            addToast('يرجى ملء جميع الحقول.', 'error');
            return;
        }
        onSave(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'finalSalePrice' ? Number(value) : value }));
    };

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-xl" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-5 border-b flex justify-between items-start"><h2 className="text-xl font-bold">تسجيل عملية بيع</h2><button type="button" onClick={onClose}><CloseIcon className="h-6 w-6"/></button></div>
                    <div className="p-6 space-y-4">
                        <select name="unitId" value={formData.unitId} onChange={handleChange} className="w-full p-2.5 border rounded-lg bg-white dark:bg-slate-700" required><option value="">اختر الوحدة المباعة</option>{units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
                        <select name="customerId" value={formData.customerId} onChange={handleChange} className="w-full p-2.5 border rounded-lg bg-white dark:bg-slate-700" required><option value="">اختر العميل</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                        <select name="accountId" value={formData.accountId} onChange={handleChange} className="w-full p-2.5 border rounded-lg bg-white dark:bg-slate-700" required><option value="">اختر حساب الإيداع</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
                        <input type="number" name="finalSalePrice" placeholder="سعر البيع النهائي" value={formData.finalSalePrice} onChange={handleChange} className="w-full p-2.5 border rounded-lg dark:bg-slate-700" required min="1" />
                        <input type="date" name="saleDate" value={formData.saleDate} onChange={handleChange} className="w-full p-2.5 border rounded-lg dark:bg-slate-700" required />
                    </div>
                    <div className="px-6 py-4 border-t flex justify-end gap-4"><button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border font-semibold">إلغاء</button><button type="submit" className="bg-primary-600 text-white px-8 py-2 rounded-lg font-semibold">حفظ</button></div>
                </form>
            </div>
        </div>
    );
};


export default UnitSales;