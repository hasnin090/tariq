import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { DeferredPayment, Project, Account, Expense, Transaction, ExpenseCategory, DeferredPaymentInstallment } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import logActivity from '../../../utils/activityLogger';
import { formatCurrency } from '../../../utils/currencyFormatter';
import ConfirmModal from '../../shared/ConfirmModal';
import { CloseIcon, CalendarIcon, ChevronDownIcon, PlusCircleIcon } from '../../shared/Icons';
import EmptyState from '../../shared/EmptyState';
import { projectsService, accountsService } from '../../../src/services/supabaseService';
import AmountInput, { type AmountInputValue } from '../../shared/AmountInput';

const AddInstallmentModal: React.FC<{
    payment: DeferredPayment;
    accounts: Account[];
    onClose: () => void;
    onConfirm: (accountId: string, amount: number, date: string) => void;
}> = ({ payment, accounts, onClose, onConfirm }) => {
    const { addToast } = useToast();
    const remainingAmount = payment.totalAmount - payment.amountPaid;
    const [accountId, setAccountId] = useState<string>(accounts.length > 0 ? accounts[0].id : '');
    const [amount, setAmount] = useState<AmountInputValue>(remainingAmount);
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const handleConfirm = () => {
        if (!accountId) {
            addToast('يرجى اختيار حساب للدفع منه.', 'error');
            return;
        }
        const amountNumber = amount === '' ? 0 : amount;
        if (amountNumber <= 0) {
            addToast('يجب أن يكون مبلغ الدفعة أكبر من صفر.', 'error');
            return;
        }
        if (amountNumber > remainingAmount) {
            addToast(`المبلغ المدفوع لا يمكن أن يتجاوز الرصيد المتبقي (${formatCurrency(remainingAmount)}).`, 'error');
            return;
        }
        onConfirm(accountId, amountNumber, date);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4 animate-drawer-overlay-show" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg animate-fade-in-scale-up" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">إضافة دفعة لـ "{payment.description}"</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><CloseIcon className="h-6 w-6"/></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">الرصيد المتبقي: <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(remainingAmount)}</span></p>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">مبلغ الدفعة</label>
                        <AmountInput
                            value={amount}
                            onValueChange={setAmount}
                            className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تاريخ الدفع</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الدفع من حساب</label>
                        <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500">
                            <option value="" disabled>اختر حساب</option>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold">إلغاء</button>
                    <button type="button" onClick={handleConfirm} className="bg-primary-600 text-white px-8 py-2 rounded-lg hover:bg-primary-700 font-semibold shadow-sm">تأكيد الدفع</button>
                </div>
            </div>
        </div>
    );
};

const DeferredPaymentPanel: React.FC<{
    payment: DeferredPayment | null;
    projects: Project[];
    accounts: Account[];
    onClose: () => void;
    onSave: (
        data: Omit<DeferredPayment, 'id' | 'projectName' | 'status' | 'amountPaid'>,
        initialPayment?: { amount: number; accountId: string }
    ) => void;
}> = ({ payment, projects, accounts, onClose, onSave }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        description: payment?.description || '',
        projectId: payment?.projectId || '',
        totalAmount: payment?.totalAmount || '' as number | '',
    });
    const [initialPayment, setInitialPayment] = useState({ amount: '' as number | '', accountId: accounts.length > 0 ? accounts[0].id : ''});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'totalAmount' ? Number(value) : value }));
    };
    
    const handleInitialPaymentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setInitialPayment(prev => ({...prev, [name]: name === 'amount' ? Number(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.description || !formData.projectId || !formData.totalAmount || Number(formData.totalAmount) <= 0) {
            addToast('يرجى ملء حقول الوصف والمشروع والمبلغ الإجمالي بشكل صحيح.', 'error');
            return;
        }
        if (Number(initialPayment.amount) > 0 && !initialPayment.accountId) {
            addToast('يرجى اختيار حساب لتسديد الدفعة الأولية منه.', 'error');
            return;
        }
        if (Number(initialPayment.amount) > Number(formData.totalAmount)) {
             addToast('الدفعة الأولية لا يمكن أن تكون أكبر من المبلغ الإجمالي.', 'error');
            return;
        }

        onSave(formData, initialPayment.amount > 0 ? initialPayment : undefined);
    };
    
    const inputStyle = "w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200";

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4 pt-20 animate-drawer-overlay-show" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl animate-fade-in-scale-up my-16 max-h-[calc(100vh-8rem)] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start"><h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{payment ? 'تعديل حساب آجل' : 'إضافة حساب آجل'}</h2><button type="button" onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><CloseIcon className="h-6 w-6"/></button></div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <input type="text" name="description" placeholder="الوصف (مثال: دفعة من أرباح المشروع)" value={formData.description} onChange={handleChange} className={inputStyle} required />
                        <div className="grid grid-cols-2 gap-4">
                            <select name="projectId" value={formData.projectId} onChange={handleChange} className={`${inputStyle} bg-white dark:bg-slate-700`} required><option value="">اختر مشروع</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                            <AmountInput
                                value={formData.totalAmount || ''}
                                onValueChange={(totalAmount) => setFormData(prev => ({ ...prev, totalAmount: totalAmount === '' ? '' : totalAmount }))}
                                className={inputStyle}
                                placeholder="المبلغ الإجمالي"
                            />
                        </div>
                        
                        {!payment && (
                            <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-200">تسديد دفعة أولية (اختياري)</h3>
                                 <div className="grid grid-cols-2 gap-4">
                                     <AmountInput
                                         value={initialPayment.amount || ''}
                                         onValueChange={(amount) => setInitialPayment(prev => ({ ...prev, amount: amount === '' ? '' : amount }))}
                                         className={inputStyle}
                                         placeholder="مبلغ الدفعة الأولية"
                                     />
                                     <select name="accountId" value={initialPayment.accountId} onChange={handleInitialPaymentChange} className={`${inputStyle} bg-white dark:bg-slate-700`} disabled={!initialPayment.amount || Number(initialPayment.amount) <= 0}>
                                        <option value="">اختر حساب الدفع</option>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                    </div>
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4"><button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold">إلغاء</button><button type="submit" className="bg-primary-600 text-white px-8 py-2 rounded-lg hover:bg-primary-700 font-semibold shadow-sm">حفظ</button></div>
                </form>
            </div>
        </div>
    );
};

const InstallmentsHistory: React.FC<{
    paymentId: string;
    installments: DeferredPaymentInstallment[];
    accounts: Account[];
}> = ({ paymentId, installments, accounts }) => {
    const relevantInstallments = installments.filter(i => i.deferredPaymentId === paymentId);

    if (relevantInstallments.length === 0) {
        return <td colSpan={7} className="p-4 bg-slate-50 dark:bg-slate-800/50 text-center text-sm text-slate-500">لا توجد دفعات مسجلة لهذا الحساب.</td>;
    }

    return (
        <td colSpan={7} className="p-0">
            <div className="bg-slate-100 dark:bg-slate-800 p-4">
                <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-2">سجل الدفعات:</h4>
                <table className="w-full text-right bg-white dark:bg-slate-800/50 rounded-md">
                    <thead className="text-xs text-slate-500 dark:text-slate-400">
                        <tr>
                            <th className="p-2 font-semibold">تاريخ الدفعة</th>
                            <th className="p-2 font-semibold">المبلغ المدفوع</th>
                            <th className="p-2 font-semibold">الحساب</th>
                        </tr>
                    </thead>
                    <tbody>
                        {relevantInstallments.map(inst => (
                            <tr key={inst.id} className="border-t border-slate-200 dark:border-slate-700">
                                <td className="p-2 text-sm">{inst.paymentDate}</td>
                                <td className="p-2 text-sm">{formatCurrency(inst.amount)}</td>
                                <td className="p-2 text-sm">{accounts.find(a => a.id === inst.accountId)?.name || 'غير معروف'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </td>
    );
};

const DeferredPayments: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const [deferredPayments, setDeferredPayments] = useState<DeferredPayment[]>([]);
    const [installments, setInstallments] = useState<DeferredPaymentInstallment[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    
    // GSAP Table Animation Ref
    const tableBodyRef = useRef<HTMLTableSectionElement>(null);
    const hasAnimated = useRef(false);

    // 🎬 GSAP Table Animation - runs only once
    useLayoutEffect(() => {
        if (tableBodyRef.current && deferredPayments.length > 0 && !hasAnimated.current) {
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
    }, [deferredPayments]);
    const [editingPayment, setEditingPayment] = useState<DeferredPayment | null>(null);
    const [paymentToDelete, setPaymentToDelete] = useState<DeferredPayment | null>(null);
    const [paymentForInstallment, setPaymentForInstallment] = useState<DeferredPayment | null>(null);
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);


    useEffect(() => {
        const loadData = async () => {
            try {
                // Load from localStorage with proper amountPaid initialization
                const storedPayments = JSON.parse(localStorage.getItem('deferredPayments') || '[]');
                const normalizedPayments = storedPayments.map((p: DeferredPayment) => ({
                    ...p,
                    amountPaid: p.amountPaid || 0,
                    totalAmount: p.totalAmount || 0,
                }));
                setDeferredPayments(normalizedPayments);
                setInstallments(JSON.parse(localStorage.getItem('deferredPaymentInstallments') || '[]'));
                
                // Load from Supabase
                const [projectsData, accountsData] = await Promise.all([
                    projectsService.getAll(),
                    accountsService.getAll()
                ]);
                setProjects(projectsData);
                setAccounts(accountsData);
            } catch (error) {
                console.error('Error loading data:', error);
                addToast('خطأ في تحميل البيانات', 'error');
            }
        };
        loadData();
    }, [addToast]);

    const saveData = (key: string, data: any[]) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    const handleOpenPanel = (payment: DeferredPayment | null) => {
        setEditingPayment(payment);
        setIsPanelOpen(true);
    };

    const processAndSaveInstallment = (targetPayment: DeferredPayment, accountId: string, amount: number, date: string) => {
         const account = accounts.find(a => a.id === accountId);
        if (!account) return;

        const allExpenses: Expense[] = JSON.parse(localStorage.getItem('expenses') || '[]');
        const allTransactions: Transaction[] = JSON.parse(localStorage.getItem('transactions') || '[]');
        const categories: ExpenseCategory[] = JSON.parse(localStorage.getItem('expenseCategories') || '[]');
        const generalCategory = categories.find(c => c.name === 'عام') || categories[0] || { id: 'cat_other', name: 'أخرى' };

        const newInstallment: DeferredPaymentInstallment = {
            id: `dpi_${Date.now()}`,
            deferredPaymentId: targetPayment.id,
            paymentDate: date,
            amount: amount,
            accountId: accountId,
            transactionId: '',
            expenseId: '',
        };

        const newExpense: Expense = {
            id: `exp_dpi_${Date.now()}`,
            date: date,
            description: `دفعة من حساب: ${targetPayment.description}`,
            amount: amount,
            categoryId: generalCategory.id,
            projectId: targetPayment.projectId,
            accountId: accountId,
            transactionId: '',
            deferredPaymentInstallmentId: newInstallment.id,
        };

        const newTransaction: Transaction = {
            id: `trans_dpi_${Date.now()}`,
            accountId: accountId,
            accountName: account.name,
            type: 'Withdrawal',
            date: date,
            description: `دفعة من حساب: ${targetPayment.description}`,
            amount: amount,
            sourceId: targetPayment.id,
            sourceType: 'Deferred Payment',
        };

        newInstallment.transactionId = newTransaction.id;
        newInstallment.expenseId = newExpense.id;
        newExpense.transactionId = newTransaction.id;
        
        const currentInstallments = JSON.parse(localStorage.getItem('deferredPaymentInstallments') || '[]');
        const updatedInstallments = [...currentInstallments, newInstallment];
        setInstallments(updatedInstallments);
        saveData('deferredPaymentInstallments', updatedInstallments);
        saveData('expenses', [...allExpenses, newExpense]);
        saveData('transactions', [...allTransactions, newTransaction]);
        
        const currentDeferredPayments = JSON.parse(localStorage.getItem('deferredPayments') || '[]');
        const updatedDeferred: DeferredPayment[] = currentDeferredPayments.map((p: DeferredPayment) => {
            if (p.id === targetPayment.id) {
                const currentAmountPaid = p.amountPaid || 0;
                const newAmountPaid = currentAmountPaid + amount;
                const newStatus: DeferredPayment['status'] = newAmountPaid >= p.totalAmount ? 'Paid' : 'Partially Paid';
                return { ...p, amountPaid: newAmountPaid, status: newStatus };
            }
            return p;
        });

        setDeferredPayments(updatedDeferred);
        saveData('deferredPayments', updatedDeferred);

        addToast('تم تسجيل الدفعة بنجاح!', 'success');
        logActivity('Add Deferred Installment', `Paid ${formatCurrency(amount)} for: ${targetPayment.description}`, 'expenses');
    };

    const handleSave = (
        paymentData: Omit<DeferredPayment, 'id' | 'projectName' | 'status' | 'amountPaid'>,
        initialPayment?: { amount: number; accountId: string }
    ) => {
        const project = projects.find(p => p.id === paymentData.projectId);
        if (!project) {
            addToast('المشروع المحدد غير صالح.', 'error');
            return;
        }

        if (editingPayment) {
            const updatedPayments = deferredPayments.map(p =>
                p.id === editingPayment.id ? { ...editingPayment, ...paymentData, projectName: project.name } : p
            );
            setDeferredPayments(updatedPayments);
            saveData('deferredPayments', updatedPayments);
            addToast('تم تحديث الحساب الآجل بنجاح', 'success');
            logActivity('Update Deferred Payment', `Updated payment: ${paymentData.description}`, 'expenses');
        } else {
            const newPayment: DeferredPayment = {
                id: `dp_${Date.now()}`,
                ...paymentData,
                projectName: project.name,
                status: 'Pending',
                amountPaid: 0,
            };
            const updatedPayments = [...deferredPayments, newPayment];
            setDeferredPayments(updatedPayments);
            saveData('deferredPayments', updatedPayments);
            addToast('تمت إضافة حساب آجل بنجاح', 'success');
            logActivity('Add Deferred Payment', `Added payment: ${newPayment.description}`, 'expenses');
            
            if (initialPayment && initialPayment.amount > 0) {
                 const paymentDate = new Date().toISOString().split('T')[0];
                 processAndSaveInstallment(newPayment, initialPayment.accountId, initialPayment.amount, paymentDate);
            }
        }
        setIsPanelOpen(false);
        setEditingPayment(null);
    };

    const handleDeleteRequest = (payment: DeferredPayment) => {
        setPaymentToDelete(payment);
    };

    const confirmDelete = () => {
        if (paymentToDelete) {
            // Also delete related installments, expenses, and transactions
            const relatedInstallmentIds = installments.filter(i => i.deferredPaymentId === paymentToDelete.id).map(i => i.id);
            const updatedInstallments = installments.filter(i => i.deferredPaymentId !== paymentToDelete.id);
            const updatedExpenses = (JSON.parse(localStorage.getItem('expenses') || '[]') as Expense[]).filter(e => !e.deferredPaymentInstallmentId || !relatedInstallmentIds.includes(e.deferredPaymentInstallmentId));
            const updatedTransactions = (JSON.parse(localStorage.getItem('transactions') || '[]') as Transaction[]).filter(t => t.sourceType !== 'Deferred Payment' || t.sourceId !== paymentToDelete.id);

            const updatedPayments = deferredPayments.filter(p => p.id !== paymentToDelete.id);
            
            setDeferredPayments(updatedPayments);
            setInstallments(updatedInstallments);
            
            saveData('deferredPayments', updatedPayments);
            saveData('deferredPaymentInstallments', updatedInstallments);
            saveData('expenses', updatedExpenses);
            saveData('transactions', updatedTransactions);

            addToast('تم حذف الحساب الآجل وجميع دفعاته بنجاح', 'success');
            logActivity('Delete Deferred Payment', `Deleted payment: ${paymentToDelete.description}`, 'expenses');
            setPaymentToDelete(null);
        }
    };

    const handleAddInstallmentRequest = (payment: DeferredPayment) => {
        if (accounts.length === 0) {
            addToast('يجب إضافة حساب للدفع منه أولاً من صفحة الخزينة.', 'error');
            return;
        }
        setPaymentForInstallment(payment);
    };

    const confirmAddInstallment = (accountId: string, amount: number, date: string) => {
        if (!paymentForInstallment) return;
        processAndSaveInstallment(paymentForInstallment, accountId, amount, date);
        setPaymentForInstallment(null);
    };
    
    const getStatusStyle = (status: DeferredPayment['status']) => {
        switch (status) {
            case 'Pending': return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300';
            case 'Partially Paid': return 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300';
            case 'Paid': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300';
        }
    };
    
    const statusText = {
        'Pending': 'معلقة',
        'Partially Paid': 'مدفوعة جزئياً',
        'Paid': 'مدفوعة'
    };

    return (
        <div className="container mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">الدفعات الآجلة</h2>
                {currentUser?.role === 'Admin' && (
                    <button onClick={() => handleOpenPanel(null)} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-sm">
                        إضافة حساب آجل
                    </button>
                )}
            </div>

            {deferredPayments.length > 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-sm">
                                <th className="p-4 font-bold text-slate-700 dark:text-slate-200 w-8"></th>
                                <th className="p-4 font-bold text-slate-700 dark:text-slate-200">الوصف</th>
                                <th className="p-4 font-bold text-slate-700 dark:text-slate-200">المشروع</th>
                                <th className="p-4 font-bold text-slate-700 dark:text-slate-200">المبلغ الإجمالي</th>
                                <th className="p-4 font-bold text-slate-700 dark:text-slate-200">المدفوع</th>
                                <th className="p-4 font-bold text-slate-700 dark:text-slate-200">المتبقي</th>
                                <th className="p-4 font-bold text-slate-700 dark:text-slate-200">الحالة</th>
                                {currentUser?.role === 'Admin' && <th className="p-4 font-bold text-slate-700 dark:text-slate-200">إجراءات</th>}
                            </tr>
                        </thead>
                        <tbody ref={tableBodyRef}>
                            {deferredPayments.map(p => {
                                const amountPaid = p.amountPaid || 0;
                                const totalAmount = p.totalAmount || 0;
                                const remaining = totalAmount - amountPaid;
                                const isExpanded = expandedRowId === p.id;
                                return (
                                    <React.Fragment key={p.id}>
                                        <tr className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                                            <td className="p-2 text-center">
                                                <button onClick={() => setExpandedRowId(isExpanded ? null : p.id)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                                                    <ChevronDownIcon className={`h-5 w-5 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                </button>
                                            </td>
                                            <td className="p-4 font-medium text-slate-800 dark:text-slate-100">{p.description}</td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300">{p.projectName}</td>
                                            <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(totalAmount)}</td>
                                            <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(amountPaid)}</td>
                                            <td className="p-4 font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(remaining)}</td>
                                            <td className="p-4"><span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusStyle(p.status)}`}>{statusText[p.status]}</span></td>
                                            {currentUser?.role === 'Admin' && (
                                                <td className="p-4 whitespace-nowrap">
                                                    {p.status !== 'Paid' && (
                                                        <button onClick={() => handleAddInstallmentRequest(p)} className="text-emerald-600 hover:underline font-semibold flex items-center gap-1">
                                                            <PlusCircleIcon className="h-4 w-4" />
                                                            إضافة دفعة
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleOpenPanel(p)} className="text-primary-600 hover:underline font-semibold mx-4" disabled={amountPaid > 0}>تعديل</button>
                                                    <button onClick={() => handleDeleteRequest(p)} className="text-rose-600 hover:underline font-semibold">حذف</button>
                                                </td>
                                            )}
                                        </tr>
                                        {isExpanded && <InstallmentsHistory paymentId={p.id} installments={installments} accounts={accounts} />}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState
                    Icon={CalendarIcon}
                    title="لا توجد حسابات آجلة"
                    message="يمكنك إضافة الدفعات الآجلة للموردين لتتبعها هنا."
                    actionButton={currentUser?.role === 'Admin' ? { text: 'إضافة حساب آجل', onClick: () => handleOpenPanel(null) } : undefined}
                />
            )}
            
            {isPanelOpen && <DeferredPaymentPanel payment={editingPayment} projects={projects} accounts={accounts} onClose={() => { setIsPanelOpen(false); setEditingPayment(null); }} onSave={handleSave} />}
            <ConfirmModal isOpen={!!paymentToDelete} onClose={() => setPaymentToDelete(null)} onConfirm={confirmDelete} title="تأكيد الحذف" message={`هل أنت متأكد من حذف "${paymentToDelete?.description}"؟ سيتم حذف جميع الدفعات المرتبطة به.`} />
            {paymentForInstallment && <AddInstallmentModal payment={paymentForInstallment} accounts={accounts} onClose={() => setPaymentForInstallment(null)} onConfirm={confirmAddInstallment} />}
        </div>
    );
};

export default DeferredPayments;