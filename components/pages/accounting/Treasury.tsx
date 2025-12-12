import React, { useState, useEffect, useMemo } from 'react';
import { Account, Transaction } from '../../../types';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { useToast } from '../../../contexts/ToastContext';
import logActivity from '../../../utils/activityLogger';
import { CloseIcon, BankIcon, CashIcon, ArrowUpIcon, ArrowDownIcon, PlusIcon } from '../../shared/Icons';
import { accountsService } from '../../../src/services/supabaseService';

const Treasury: React.FC = () => {
    const { addToast } = useToast();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const loadedTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
            const loadedAccounts = await accountsService.getAll();
            
            setAccounts(loadedAccounts);
            setTransactions(loadedTransactions);
            if (loadedAccounts.length > 0) {
                setSelectedAccount(loadedAccounts[0]);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            addToast('خطأ في تحميل البيانات.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const saveData = (key: string, data: any[]) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    const handleSaveAccount = async (accountData: Omit<Account, 'id'>) => {
        try {
            if (editingAccount) {
                await accountsService.update(editingAccount.id, accountData);
                const updated = accounts.map(a => a.id === editingAccount.id ? { ...editingAccount, ...accountData } : a);
                setAccounts(updated);
                addToast('تم تحديث الحساب بنجاح.', 'success');
                logActivity('Update Account', `Updated account: ${accountData.name}`);
            } else {
                const newAccount = await accountsService.create(accountData);
                const updated = [...accounts, newAccount];
                setAccounts(updated);
                addToast('تم إضافة الحساب بنجاح.', 'success');
                logActivity('Add Account', `Added account: ${newAccount.name}`);
                if (!selectedAccount) {
                    setSelectedAccount(newAccount);
                }
            }
            setIsModalOpen(false);
            setEditingAccount(null);
        } catch (error) {
            console.error('Error saving account:', error);
            addToast('خطأ في حفظ الحساب.', 'error');
        }
    };
    
    const handleSaveRevenue = (revenueData: { description: string; amount: number; date: string; accountId: string; }) => {
        const account = accounts.find(a => a.id === revenueData.accountId);
        if (!account) {
            addToast('الحساب المحدد غير صالح.', 'error');
            return;
        }

        const newTransaction: Transaction = {
            id: `trans_${Date.now()}`,
            accountId: revenueData.accountId,
            accountName: account.name,
            type: 'Deposit',
            date: revenueData.date,
            description: revenueData.description,
            amount: revenueData.amount,
            sourceType: 'Manual',
        };

        const currentTransactions = [...transactions, newTransaction];
        saveData('transactions', currentTransactions);
        setTransactions(currentTransactions);

        addToast('تمت إضافة الإيراد بنجاح.', 'success');
        logActivity('Add Revenue', `Added revenue: ${revenueData.description} - ${formatCurrency(revenueData.amount)}`);
        setIsRevenueModalOpen(false);
    };

    const accountBalances = useMemo(() => {
        const balances = new Map<string, number>();
        accounts.forEach(acc => {
            let balance = acc.initialBalance;
            transactions.forEach(t => {
                if (t.accountId === acc.id) {
                    balance += t.type === 'Deposit' ? t.amount : -t.amount;
                }
            });
            balances.set(acc.id, balance);
        });
        return balances;
    }, [accounts, transactions]);
    
    const filteredTransactions = useMemo(() => {
        if (!selectedAccount) return [];
        return transactions.filter(t => t.accountId === selectedAccount.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, selectedAccount]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">إدارة الصندوق و حساب البنك</h2>
                <div className="flex gap-4">
                    <button onClick={() => setIsRevenueModalOpen(true)} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-700 flex items-center gap-2 shadow-sm transition-colors">
                        <PlusIcon className="h-5 w-5"/>
                        إضافة إيراد
                    </button>
                    <button onClick={() => { setEditingAccount(null); setIsModalOpen(true); }} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 shadow-sm transition-colors">
                        إضافة حساب
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    {accounts.map(acc => (
                         <button key={acc.id} onClick={() => setSelectedAccount(acc)} className={`w-full text-right p-4 rounded-xl border-2 transition-all ${selectedAccount?.id === acc.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary-300'}`}>
                             <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-full">{acc.type === 'Bank' ? <BankIcon className="h-6 w-6 text-slate-600 dark:text-slate-300"/> : <CashIcon className="h-6 w-6 text-slate-600 dark:text-slate-300"/>}</div>
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-slate-100">{acc.name}</p>
                                    <p className="font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400">{formatCurrency(accountBalances.get(acc.id) || 0)}</p>
                                </div>
                             </div>
                         </button>
                    ))}
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">سجل الحركات لـ {selectedAccount?.name || "..."}</h3>
                    </div>
                    <div className="overflow-y-auto max-h-[70vh]">
                         {filteredTransactions.length > 0 ? (
                            <ul>
                                {filteredTransactions.map(t => (
                                     <li key={t.id} className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 last:border-0">
                                         <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${t.type === 'Deposit' ? 'bg-emerald-100 dark:bg-emerald-500/10' : 'bg-rose-100 dark:bg-rose-500/10'}`}>
                                                {t.type === 'Deposit' ? <ArrowUpIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400"/> : <ArrowDownIcon className="h-5 w-5 text-rose-600 dark:text-rose-400"/>}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800 dark:text-slate-200">{t.description}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{t.date}</p>
                                            </div>
                                         </div>
                                         <span className={`font-bold ${t.type === 'Deposit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{formatCurrency(t.amount)}</span>
                                     </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center p-12 text-slate-500">لا توجد حركات لهذا الحساب.</p>
                        )}
                    </div>
                </div>
            </div>
             {isModalOpen && <AccountPanel account={editingAccount} onClose={() => setIsModalOpen(false)} onSave={handleSaveAccount} />}
             {isRevenueModalOpen && <RevenuePanel accounts={accounts} onClose={() => setIsRevenueModalOpen(false)} onSave={handleSaveRevenue} />}
        </div>
    );
};

interface RevenuePanelProps {
    accounts: Account[];
    onClose: () => void;
    onSave: (data: { description: string; amount: number; date: string; accountId: string; }) => void;
}
const RevenuePanel: React.FC<RevenuePanelProps> = ({ accounts, onClose, onSave }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        description: '',
        amount: '' as number | '',
        date: new Date().toISOString().split('T')[0],
        accountId: accounts.length > 0 ? accounts[0].id : '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.description || !formData.amount || Number(formData.amount) <= 0 || !formData.accountId) {
            addToast('يرجى ملء جميع الحقول الإلزامية.', 'error');
            return;
        }
        onSave(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'amount' ? Number(value) : value
        }));
    };

    const inputStyle = "w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200";

    return (
         <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4 pt-20 animate-drawer-overlay-show" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg animate-fade-in-scale-up" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">إضافة إيراد جديد</h2>
                        <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><CloseIcon className="h-6 w-6"/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <input type="text" name="description" placeholder="وصف الإيراد" value={formData.description} onChange={handleChange} className={inputStyle} required />
                        <div className="grid grid-cols-2 gap-4">
                            <input type="number" name="amount" placeholder="المبلغ" value={formData.amount || ''} onChange={handleChange} className={inputStyle} required min="0.01" step="0.01" />
                            <input type="date" name="date" value={formData.date} onChange={handleChange} className={inputStyle} required />
                        </div>
                        <select name="accountId" value={formData.accountId} onChange={handleChange} className={`${inputStyle} bg-white dark:bg-slate-700`} required>
                            <option value="">إيداع في حساب...</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold">إلغاء</button>
                        <button type="submit" className="bg-emerald-600 text-white px-8 py-2 rounded-lg hover:bg-emerald-700 font-semibold shadow-sm">حفظ الإيراد</button>
                    </div>
                </form>
            </div>
        </div>
    )
};

interface PanelProps { account: Account | null, onClose: () => void, onSave: (data: Omit<Account, 'id'>) => void; }
const AccountPanel: React.FC<PanelProps> = ({ account, onClose, onSave }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: account?.name || '',
        type: account?.type || 'Bank',
        initialBalance: account?.initialBalance || 0,
    });
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!formData.name) { addToast('اسم الحساب مطلوب', 'error'); return; }
        onSave(formData);
    };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: name === 'initialBalance' ? Number(e.target.value) : value });
    };
    
    const inputStyle = "w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200";

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4 pt-20" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-5 border-b flex justify-between items-start"><h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{account ? 'تعديل حساب' : 'إضافة حساب'}</h2><button type="button" onClick={onClose}><CloseIcon className="h-6 w-6"/></button></div>
                    <div className="p-6 space-y-4">
                        <input type="text" name="name" placeholder="اسم الحساب" value={formData.name} onChange={handleChange} className={inputStyle} required />
                        <select name="type" value={formData.type} onChange={handleChange} className={`${inputStyle} bg-white dark:bg-slate-700`}>
                            <option value="Bank">Bank</option>
                            <option value="Cash">Cash</option>
                        </select>
                        <input type="number" name="initialBalance" placeholder="الرصيد الافتتاحي" value={formData.initialBalance} onChange={handleChange} className={inputStyle} required />
                    </div>
                    <div className="px-6 py-4 border-t flex justify-end gap-4"><button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border font-semibold border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">إلغاء</button><button type="submit" className="bg-primary-600 text-white px-8 py-2 rounded-lg font-semibold hover:bg-primary-700">حفظ</button></div>
                </form>
            </div>
        </div>
    )
};

export default Treasury;