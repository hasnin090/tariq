/**
 * 🏦 Treasury - إدارة الصندوق والمصرف لكل مشروع
 * ====================================================================
 * - المدير يختار مشروع واحد
 * - لكل مشروع حسابات صندوق ومصرف خاصة به
 * - إمكانية إضافة إيرادات مباشرة
 * - عرض الحركات المالية لكل حساب
 * - صلاحيات Admin فقط
 * ====================================================================
 */

import React, { useState, useEffect, useMemo, useRef, useLayoutEffect, useCallback } from 'react';
import gsap from 'gsap';
import { Account, Transaction, Project } from '../../../types';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import logActivity from '../../../utils/activityLogger';
import { CloseIcon, BankIcon, CashIcon, ArrowUpIcon, ArrowDownIcon, PlusIcon, EditIcon, TrashIcon } from '../../shared/Icons';
import { accountsService, transactionsService, projectsService } from '../../../src/services/supabaseService';
import AmountInput from '../../shared/AmountInput';
import { SkeletonListItem } from '../../shared/Skeleton';

const Treasury: React.FC = () => {
    const { addToast } = useToast();
    const { currentUser } = useAuth();
    
    // التحقق من صلاحيات Admin
    const isAdmin = currentUser?.role === 'Admin';
    
    // State
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingTransactions, setLoadingTransactions] = useState(false);
    
    // Modals
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    
    // 🎬 GSAP Animation refs
    const accountsListRef = useRef<HTMLDivElement>(null);
    const transactionsListRef = useRef<HTMLUListElement>(null);
    const hasAnimatedAccounts = useRef(false);
    const hasAnimatedTransactions = useRef(false);
    
    // ────────────────────────────────────────────────────────────────────
    // تحميل المشاريع
    // ────────────────────────────────────────────────────────────────────
    useEffect(() => {
        const loadProjects = async () => {
            try {
                const loadedProjects = await projectsService.getAll();
                setProjects(loadedProjects);
                if (loadedProjects.length > 0 && !selectedProjectId) {
                    setSelectedProjectId(loadedProjects[0].id);
                }
            } catch (error) {
                console.error('Error loading projects:', error);
                addToast('خطأ في تحميل المشاريع', 'error');
            }
        };
        loadProjects();
    }, []);

    // ────────────────────────────────────────────────────────────────────
    // تحميل حسابات المشروع المحدد
    // ────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!selectedProjectId) {
            setAccounts([]);
            setSelectedAccount(null);
            setLoading(false);
            return;
        }
        
        const loadAccounts = async () => {
            try {
                setLoading(true);
                hasAnimatedAccounts.current = false;
                
                // Try to load with project filter, fallback to all accounts
                let loadedAccounts: Account[] = [];
                try {
                    loadedAccounts = await accountsService.getAll({ projectId: selectedProjectId });
                } catch {
                    // If project_id column doesn't exist, load all accounts
                    loadedAccounts = await accountsService.getAll();
                }
                
                setAccounts(loadedAccounts);
                
                if (loadedAccounts.length > 0) {
                    setSelectedAccount(loadedAccounts[0]);
                } else {
                    setSelectedAccount(null);
                }
            } catch (error) {
                console.error('Error loading accounts:', error);
                addToast('خطأ في تحميل الحسابات', 'error');
            } finally {
                setLoading(false);
            }
        };
        
        loadAccounts();
    }, [selectedProjectId]);

    // ────────────────────────────────────────────────────────────────────
    // تحميل حركات الحساب المحدد
    // ────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!selectedAccount) {
            setTransactions([]);
            return;
        }
        
        const loadTransactions = async () => {
            try {
                setLoadingTransactions(true);
                hasAnimatedTransactions.current = false;
                
                const loadedTransactions = await transactionsService.getAll({
                    accountId: selectedAccount.id,
                    projectId: selectedProjectId,
                });
                setTransactions(loadedTransactions);
            } catch (error) {
                console.error('Error loading transactions:', error);
            } finally {
                setLoadingTransactions(false);
            }
        };
        
        loadTransactions();
    }, [selectedAccount?.id, selectedProjectId]);

    // 🎬 GSAP Accounts Animation
    useLayoutEffect(() => {
        if (accountsListRef.current && accounts.length > 0 && !hasAnimatedAccounts.current) {
            hasAnimatedAccounts.current = true;
            const accountCards = accountsListRef.current.querySelectorAll('.account-card');
            gsap.fromTo(accountCards,
                { opacity: 0, x: -30, scale: 0.95 },
                { opacity: 1, x: 0, scale: 1, duration: 0.4, stagger: 0.1, ease: "back.out(1.5)" }
            );
        }
    }, [accounts]);
    
    // 🎬 GSAP Transactions Animation
    useLayoutEffect(() => {
        if (transactionsListRef.current && transactions.length > 0 && !hasAnimatedTransactions.current) {
            hasAnimatedTransactions.current = true;
            const items = transactionsListRef.current.querySelectorAll('.transaction-item');
            gsap.fromTo(items,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: "power2.out" }
            );
        }
    }, [transactions]);

    // ────────────────────────────────────────────────────────────────────
    // حساب الأرصدة
    // ────────────────────────────────────────────────────────────────────
    const accountBalances = useMemo(() => {
        const balances = new Map<string, number>();
        accounts.forEach(acc => {
            let balance = acc.initialBalance || 0;
            transactions
                .filter(t => t.accountId === acc.id)
                .forEach(t => {
                    balance += t.type === 'Deposit' ? t.amount : -t.amount;
                });
            balances.set(acc.id, balance);
        });
        return balances;
    }, [accounts, transactions]);

    // إجمالي أرصدة المشروع
    const projectTotals = useMemo(() => {
        let totalCash = 0;
        let totalBank = 0;
        
        accounts.forEach(acc => {
            const balance = accountBalances.get(acc.id) || 0;
            if (acc.type === 'Cash') {
                totalCash += balance;
            } else {
                totalBank += balance;
            }
        });
        
        return { totalCash, totalBank, total: totalCash + totalBank };
    }, [accounts, accountBalances]);

    // ────────────────────────────────────────────────────────────────────
    // معالجة الأحداث
    // ────────────────────────────────────────────────────────────────────
    const handleSaveAccount = useCallback(async (accountData: Omit<Account, 'id'>) => {
        try {
            if (editingAccount) {
                const updated = await accountsService.update(editingAccount.id, accountData);
                setAccounts(prev => prev.map(a => a.id === editingAccount.id ? updated : a));
                addToast('تم تحديث الحساب بنجاح', 'success');
                logActivity('Update Account', `تم تحديث حساب: ${accountData.name}`, 'expenses');
            } else {
                const newAccount = await accountsService.create({
                    ...accountData,
                    projectId: selectedProjectId!,
                });
                setAccounts(prev => [...prev, newAccount]);
                setSelectedAccount(newAccount);
                addToast('تم إنشاء الحساب بنجاح', 'success');
                logActivity('Create Account', `تم إنشاء حساب: ${newAccount.name}`, 'expenses');
            }
            setIsAccountModalOpen(false);
            setEditingAccount(null);
        } catch (error) {
            console.error('Error saving account:', error);
            addToast('خطأ في حفظ الحساب', 'error');
        }
    }, [editingAccount, selectedProjectId, addToast]);

    const handleDeleteAccount = useCallback(async (account: Account) => {
        if (!confirm(`هل أنت متأكد من حذف حساب "${account.name}"؟`)) return;
        
        try {
            await accountsService.delete(account.id);
            setAccounts(prev => prev.filter(a => a.id !== account.id));
            if (selectedAccount?.id === account.id) {
                setSelectedAccount(accounts.find(a => a.id !== account.id) || null);
            }
            addToast('تم حذف الحساب بنجاح', 'success');
            logActivity('Delete Account', `تم حذف حساب: ${account.name}`, 'expenses');
        } catch (error) {
            console.error('Error deleting account:', error);
            addToast('خطأ في حذف الحساب', 'error');
        }
    }, [selectedAccount, accounts, addToast]);

    const handleSaveRevenue = useCallback(async (revenueData: {
        description: string;
        amount: number;
        date: string;
        accountId: string;
    }) => {
        const account = accounts.find(a => a.id === revenueData.accountId);
        if (!account) {
            addToast('الحساب المحدد غير صالح', 'error');
            return;
        }
        
        try {
            const created = await transactionsService.create({
                accountId: revenueData.accountId,
                accountName: account.name,
                type: 'Deposit',
                date: revenueData.date,
                description: revenueData.description,
                amount: revenueData.amount,
                projectId: selectedProjectId,
                sourceType: 'Manual',
            });
            
            setTransactions(prev => [created, ...prev]);
            addToast('تمت إضافة الإيراد بنجاح', 'success');
            logActivity('Add Revenue', `إيراد: ${revenueData.description} - ${formatCurrency(revenueData.amount)}`, 'expenses');
            setIsRevenueModalOpen(false);
        } catch (error) {
            console.error('Error saving revenue:', error);
            addToast('خطأ في حفظ الإيراد', 'error');
        }
    }, [accounts, selectedProjectId, addToast]);

    // ────────────────────────────────────────────────────────────────────
    // التحقق من الصلاحيات
    // ────────────────────────────────────────────────────────────────────
    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                <svg className="w-20 h-20 mb-4 text-rose-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h2 className="text-xl font-bold text-slate-300 mb-2">صلاحية غير متاحة</h2>
                <p className="text-slate-500">هذه الصفحة متاحة للمدير فقط</p>
            </div>
        );
    }

    const selectedProject = projects.find(p => p.id === selectedProjectId);

    // ────────────────────────────────────────────────────────────────────
    // العرض
    // ────────────────────────────────────────────────────────────────────
    return (
        <div className="container mx-auto px-2 sm:px-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                        إدارة الصندوق والمصرف
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        إدارة الحسابات المالية لكل مشروع
                    </p>
                </div>
                
                {/* اختيار المشروع */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <select
                        value={selectedProjectId || ''}
                        onChange={(e) => setSelectedProjectId(e.target.value || null)}
                        className="flex-1 sm:w-64 p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 
                            bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                            focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                    >
                        <option value="">اختر مشروعاً...</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>
            
            {/* إذا لم يتم اختيار مشروع */}
            {!selectedProjectId && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <svg className="w-24 h-24 mb-4 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <h3 className="text-xl font-semibold text-slate-500 dark:text-slate-400 mb-2">
                        اختر مشروعاً للبدء
                    </h3>
                    <p className="text-slate-400 dark:text-slate-500 text-center max-w-md">
                        يرجى اختيار مشروع من القائمة أعلاه لعرض وإدارة حساباته المالية
                    </p>
                </div>
            )}
            
            {/* محتوى الصفحة */}
            {selectedProjectId && (
                <>
                    {/* إحصائيات المشروع */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 
                            rounded-xl p-4 border border-emerald-500/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                        إجمالي الصندوق
                                    </p>
                                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                                        {formatCurrency(projectTotals.totalCash)}
                                    </p>
                                </div>
                                <div className="p-3 bg-emerald-500/20 rounded-xl">
                                    <CashIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 
                            rounded-xl p-4 border border-blue-500/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                                        إجمالي المصرف
                                    </p>
                                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                                        {formatCurrency(projectTotals.totalBank)}
                                    </p>
                                </div>
                                <div className="p-3 bg-blue-500/20 rounded-xl">
                                    <BankIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 
                            rounded-xl p-4 border border-purple-500/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                                        الإجمالي الكلي
                                    </p>
                                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                                        {formatCurrency(projectTotals.total)}
                                    </p>
                                </div>
                                <div className="p-3 bg-purple-500/20 rounded-xl">
                                    <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* أزرار الإجراءات */}
                    <div className="flex flex-wrap gap-3 mb-6">
                        <button
                            onClick={() => { setEditingAccount(null); setIsAccountModalOpen(true); }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl
                                font-semibold hover:bg-primary-700 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <PlusIcon className="h-5 w-5" />
                            <span className="hidden sm:inline">إضافة حساب</span>
                            <span className="sm:hidden">حساب</span>
                        </button>
                        
                        {accounts.length > 0 && (
                            <button
                                onClick={() => setIsRevenueModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl
                                    font-semibold hover:bg-emerald-700 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <ArrowUpIcon className="h-5 w-5" />
                                <span className="hidden sm:inline">إضافة إيراد</span>
                                <span className="sm:hidden">إيراد</span>
                            </button>
                        )}
                    </div>
                    
                    {/* قائمة الحسابات والحركات */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* الحسابات */}
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100">
                                        حسابات {selectedProject?.name}
                                    </h3>
                                </div>
                                
                                {loading ? (
                                    <div className="p-4 space-y-3">
                                        {[1, 2, 3].map(i => (
                                            <SkeletonListItem key={i} hasAvatar hasAction />
                                        ))}
                                    </div>
                                ) : accounts.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500">
                                        <CashIcon className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                        <p>لا توجد حسابات لهذا المشروع</p>
                                        <button
                                            onClick={() => setIsAccountModalOpen(true)}
                                            className="mt-3 text-primary-600 hover:text-primary-700 font-medium"
                                        >
                                            + إنشاء حساب جديد
                                        </button>
                                    </div>
                                ) : (
                                    <div ref={accountsListRef} className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {accounts.map(acc => (
                                            <div
                                                key={acc.id}
                                                className={`account-card p-4 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50
                                                    ${selectedAccount?.id === acc.id 
                                                        ? 'bg-primary-50 dark:bg-primary-500/10 border-r-4 border-primary-500' 
                                                        : ''
                                                    }`}
                                                onClick={() => setSelectedAccount(acc)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2.5 rounded-xl ${
                                                        acc.type === 'Cash' 
                                                            ? 'bg-emerald-100 dark:bg-emerald-500/20' 
                                                            : 'bg-blue-100 dark:bg-blue-500/20'
                                                    }`}>
                                                        {acc.type === 'Cash' 
                                                            ? <CashIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                                            : <BankIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                        }
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                                                            {acc.name}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                            <span>{acc.type === 'Cash' ? 'صندوق' : 'مصرف'}</span>
                                                            {!acc.projectId && (
                                                                <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded text-[10px]">
                                                                    مشترك
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-left">
                                                        <p className={`font-bold text-lg ${
                                                            (accountBalances.get(acc.id) || 0) >= 0 
                                                                ? 'text-emerald-600 dark:text-emerald-400' 
                                                                : 'text-rose-600 dark:text-rose-400'
                                                        }`}>
                                                            {formatCurrency(accountBalances.get(acc.id) || 0)}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                {/* أزرار التعديل والحذف */}
                                                {selectedAccount?.id === acc.id && (
                                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setEditingAccount(acc); setIsAccountModalOpen(true); }}
                                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm
                                                                text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                                                        >
                                                            <EditIcon className="h-4 w-4" />
                                                            تعديل
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteAccount(acc); }}
                                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm
                                                                text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                            حذف
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* الحركات */}
                        <div className="lg:col-span-2">
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50
                                    flex items-center justify-between">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100">
                                        سجل الحركات {selectedAccount ? `- ${selectedAccount.name}` : ''}
                                    </h3>
                                    {selectedAccount && (
                                        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                                            selectedAccount.type === 'Cash'
                                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                                        }`}>
                                            {selectedAccount.type === 'Cash' ? 'صندوق' : 'مصرف'}
                                        </span>
                                    )}
                                </div>
                                
                                {!selectedAccount ? (
                                    <div className="p-12 text-center text-slate-500">
                                        <p>اختر حساباً لعرض حركاته</p>
                                    </div>
                                ) : loadingTransactions ? (
                                    <div className="p-4 space-y-3">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <SkeletonListItem key={i} hasAvatar />
                                        ))}
                                    </div>
                                ) : transactions.filter(t => t.accountId === selectedAccount.id).length === 0 ? (
                                    <div className="p-12 text-center text-slate-500">
                                        <svg className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
                                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <p>لا توجد حركات لهذا الحساب</p>
                                    </div>
                                ) : (
                                    <ul ref={transactionsListRef} className="divide-y divide-slate-200 dark:divide-slate-700 max-h-[500px] overflow-y-auto">
                                        {transactions
                                            .filter(t => t.accountId === selectedAccount.id)
                                            .map(t => (
                                                <li key={t.id} className="transaction-item p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-full flex-shrink-0 ${
                                                            t.type === 'Deposit' 
                                                                ? 'bg-emerald-100 dark:bg-emerald-500/20' 
                                                                : 'bg-rose-100 dark:bg-rose-500/20'
                                                        }`}>
                                                            {t.type === 'Deposit' 
                                                                ? <ArrowUpIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                                                : <ArrowDownIcon className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                                                            }
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                                {t.description}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                                <span>{t.date}</span>
                                                                {t.sourceType && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                                                                            {t.sourceType === 'Manual' ? 'يدوي' : 
                                                                             t.sourceType === 'Payment' ? 'دفعة' :
                                                                             t.sourceType === 'Expense' ? 'مصروف' :
                                                                             t.sourceType === 'Salary' ? 'راتب' : t.sourceType}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className={`font-bold text-lg flex-shrink-0 ${
                                                            t.type === 'Deposit' 
                                                                ? 'text-emerald-600 dark:text-emerald-400' 
                                                                : 'text-rose-600 dark:text-rose-400'
                                                        }`}>
                                                            {t.type === 'Deposit' ? '+' : '-'}{formatCurrency(t.amount)}
                                                        </span>
                                                    </div>
                                                </li>
                                            ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
            
            {/* Modals */}
            {isAccountModalOpen && (
                <AccountModal
                    account={editingAccount}
                    projectId={selectedProjectId!}
                    projectName={selectedProject?.name || ''}
                    onClose={() => { setIsAccountModalOpen(false); setEditingAccount(null); }}
                    onSave={handleSaveAccount}
                />
            )}
            
            {isRevenueModalOpen && selectedProjectId && (
                <RevenueModal
                    accounts={accounts}
                    projectName={selectedProject?.name || ''}
                    onClose={() => setIsRevenueModalOpen(false)}
                    onSave={handleSaveRevenue}
                />
            )}
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════════════
// Modal: إضافة/تعديل حساب
// ════════════════════════════════════════════════════════════════════════════

interface AccountModalProps {
    account: Account | null;
    projectId: string;
    projectName: string;
    onClose: () => void;
    onSave: (data: Omit<Account, 'id'>) => void;
}

const AccountModal: React.FC<AccountModalProps> = ({ account, projectId, projectName, onClose, onSave }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: account?.name || '',
        type: account?.type || 'Cash' as 'Bank' | 'Cash',
        initialBalance: account?.initialBalance || 0,
        description: account?.description || '',
    });
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            addToast('اسم الحساب مطلوب', 'error');
            return;
        }
        onSave({
            ...formData,
            projectId,
        });
    };
    
    const inputStyle = `w-full p-2.5 border border-slate-300 dark:border-slate-600 
        bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl
        focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all`;
    
    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center p-4" onClick={onClose}>
            <div 
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in-scale-up" 
                onClick={e => e.stopPropagation()}
            >
                <form onSubmit={handleSubmit}>
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                {account ? 'تعديل حساب' : 'إضافة حساب جديد'}
                            </h2>
                            <p className="text-sm text-slate-500 mt-0.5">المشروع: {projectName}</p>
                        </div>
                        <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                            <CloseIcon className="h-5 w-5 text-slate-500" />
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                اسم الحساب <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="مثال: صندوق المشروع الرئيسي"
                                className={inputStyle}
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                نوع الحساب
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, type: 'Cash' }))}
                                    className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all
                                        ${formData.type === 'Cash' 
                                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' 
                                            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'}`}
                                >
                                    <CashIcon className={`h-5 w-5 ${formData.type === 'Cash' ? 'text-emerald-600' : 'text-slate-400'}`} />
                                    <span className={formData.type === 'Cash' ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-slate-600 dark:text-slate-400'}>
                                        صندوق
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, type: 'Bank' }))}
                                    className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all
                                        ${formData.type === 'Bank' 
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' 
                                            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'}`}
                                >
                                    <BankIcon className={`h-5 w-5 ${formData.type === 'Bank' ? 'text-blue-600' : 'text-slate-400'}`} />
                                    <span className={formData.type === 'Bank' ? 'text-blue-700 dark:text-blue-300 font-semibold' : 'text-slate-600 dark:text-slate-400'}>
                                        مصرف
                                    </span>
                                </button>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                الرصيد الافتتاحي
                            </label>
                            <AmountInput
                                value={formData.initialBalance}
                                onValueChange={val => setFormData(prev => ({ ...prev, initialBalance: val === '' ? 0 : val }))}
                                className={inputStyle}
                                placeholder="0"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                وصف (اختياري)
                            </label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="وصف مختصر للحساب"
                                className={inputStyle}
                            />
                        </div>
                    </div>
                    
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 
                                text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 rounded-xl bg-primary-600 text-white font-semibold 
                                hover:bg-primary-700 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {account ? 'حفظ التعديلات' : 'إنشاء الحساب'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════════════
// Modal: إضافة إيراد
// ════════════════════════════════════════════════════════════════════════════

interface RevenueModalProps {
    accounts: Account[];
    projectName: string;
    onClose: () => void;
    onSave: (data: { description: string; amount: number; date: string; accountId: string }) => void;
}

const RevenueModal: React.FC<RevenueModalProps> = ({ accounts, projectName, onClose, onSave }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        description: '',
        amount: '' as number | '',
        date: new Date().toISOString().split('T')[0],
        accountId: accounts.length > 0 ? accounts[0].id : '',
    });
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.description.trim()) {
            addToast('وصف الإيراد مطلوب', 'error');
            return;
        }
        if (!formData.amount || Number(formData.amount) <= 0) {
            addToast('المبلغ يجب أن يكون أكبر من صفر', 'error');
            return;
        }
        if (!formData.accountId) {
            addToast('يرجى اختيار الحساب', 'error');
            return;
        }
        onSave({
            description: formData.description,
            amount: Number(formData.amount),
            date: formData.date,
            accountId: formData.accountId,
        });
    };
    
    const inputStyle = `w-full p-2.5 border border-slate-300 dark:border-slate-600 
        bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl
        focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all`;
    
    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center p-4" onClick={onClose}>
            <div 
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in-scale-up" 
                onClick={e => e.stopPropagation()}
            >
                <form onSubmit={handleSubmit}>
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <ArrowUpIcon className="h-5 w-5 text-emerald-500" />
                                إضافة إيراد
                            </h2>
                            <p className="text-sm text-slate-500 mt-0.5">المشروع: {projectName}</p>
                        </div>
                        <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                            <CloseIcon className="h-5 w-5 text-slate-500" />
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                وصف الإيراد <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="مثال: إيراد من مستثمر"
                                className={inputStyle}
                                required
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    المبلغ <span className="text-rose-500">*</span>
                                </label>
                                <AmountInput
                                    value={formData.amount || ''}
                                    onValueChange={val => setFormData(prev => ({ ...prev, amount: val }))}
                                    className={inputStyle}
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    التاريخ
                                </label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                    className={inputStyle}
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                إيداع في حساب <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={formData.accountId}
                                onChange={e => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                                className={`${inputStyle} bg-white dark:bg-slate-700`}
                                required
                            >
                                <option value="">اختر الحساب...</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.type === 'Cash' ? '💵' : '🏦'} {acc.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 
                                text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 rounded-xl bg-emerald-600 text-white font-semibold 
                                hover:bg-emerald-700 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            حفظ الإيراد
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Treasury;
