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
import { useButtonPermissions } from '../../../hooks/useButtonPermission';
import logActivity from '../../../utils/activityLogger';
import { CloseIcon, BankIcon, CashIcon, ArrowUpIcon, ArrowDownIcon, PlusIcon, EditIcon, TrashIcon } from '../../shared/Icons';
import { accountsService, transactionsService, projectsService, expensesService } from '../../../src/services/supabaseService';
import AmountInput from '../../shared/AmountInput';
import { SkeletonListItem } from '../../shared/Skeleton';

const Treasury: React.FC = () => {
    const { addToast } = useToast();
    const { currentUser } = useAuth();
    const { canShow } = useButtonPermissions();
    
    // ✅ التحقق من صلاحيات الخزينة
    const canAdd = canShow('treasury', 'add');
    const canEdit = canShow('treasury', 'edit');
    const canDelete = canShow('treasury', 'delete');
    
    // التحقق من صلاحيات Admin فقط
    const isAdmin = currentUser?.role === 'Admin';
    
    // ✅ المشروع المخصص للمستخدم (لغير المدراء)
    const userAssignedProjectId = currentUser?.assignedProjectId || null;
    
    // State
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]); // ✅ جميع معاملات المشروع
    const [transactions, setTransactions] = useState<Transaction[]>([]); // معاملات الحساب المحدد فقط
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingTransactions, setLoadingTransactions] = useState(false);
    
    // ✅ تعريف selectedProject مبكراً باستخدام useMemo
    const selectedProject = useMemo(() => 
        projects.find(p => p.id === selectedProjectId), 
        [projects, selectedProjectId]
    );
    
    // Modals
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isDeleteWithTransferModalOpen, setIsDeleteWithTransferModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
    
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
                let loadedProjects = await projectsService.getAll();
                
                // ✅ إذا كان المستخدم غير Admin، يرى فقط المشروع المخصص له
                if (!isAdmin && userAssignedProjectId) {
                    loadedProjects = loadedProjects.filter(p => p.id === userAssignedProjectId);
                }
                
                setProjects(loadedProjects);
                
                // ✅ تعيين المشروع فقط لغير المدير (إذا لديه مشروع واحد مخصص)
                // ⚠️ للمدير: يجب اختيار المشروع يدوياً لتجنب إدخال إيرادات في المشروع الخطأ
                if (!isAdmin && userAssignedProjectId) {
                    // لغير المدير: المشروع المخصص فقط
                    setSelectedProjectId(userAssignedProjectId);
                }
                // ✅ لا نُعيّن مشروع افتراضي للمدير - يجب أن يختار يدوياً
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
            setAllTransactions([]); // ✅ تنظيف المعاملات أيضاً
            setTransactions([]);
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
                
                // ✅ تحميل جميع معاملات المشروع لحساب الأرصدة
                try {
                    const projectTransactions = await transactionsService.getAll({
                        projectId: selectedProjectId,
                    });
                    setAllTransactions(projectTransactions);
                } catch (err) {
                    console.error('Error loading all transactions:', err);
                    setAllTransactions([]);
                }
                
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
    // تحميل حركات الحساب المحدد - ✅ الإيرادات فقط
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
                // ✅ فلترة لعرض الإيرادات فقط (Deposits)
                // المصروفات مستقلة في صفحة المصروفات
                const depositsOnly = loadedTransactions.filter(t => t.type === 'Deposit');
                setTransactions(depositsOnly);
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
                { 
                    opacity: 1, x: 0, scale: 1, 
                    duration: 0.4, stagger: 0.1, ease: "back.out(1.5)",
                    onComplete: () => {
                        // ✅ ضمان ظهور العناصر بعد انتهاء الأنيميشن
                        gsap.set(accountCards, { clearProps: "opacity,transform" });
                    }
                }
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
                { 
                    opacity: 1, y: 0, 
                    duration: 0.3, stagger: 0.05, ease: "power2.out",
                    onComplete: () => {
                        // ✅ ضمان ظهور العناصر بعد انتهاء الأنيميشن
                        gsap.set(items, { clearProps: "opacity,transform" });
                    }
                }
            );
        }
    }, [transactions]);

    // ────────────────────────────────────────────────────────────────────
    // حساب الأرصدة - ✅ حساب من المعاملات الفعلية
    // ⚠️ لتجنب أي خطأ في رصيد DB، نحسب الرصيد من المعاملات مباشرة
    // ────────────────────────────────────────────────────────────────────
    const accountBalances = useMemo(() => {
        const balances = new Map<string, number>();
        
        // أولاً: تهيئة كل الحسابات برصيد initialBalance
        accounts.forEach(acc => {
            balances.set(acc.id, acc.initialBalance || 0);
        });
        
        // ثانياً: حساب الرصيد من جميع المعاملات (إيرادات + مصروفات)
        allTransactions.forEach(tx => {
            const currentBalance = balances.get(tx.accountId) || 0;
            if (tx.type === 'Deposit') {
                balances.set(tx.accountId, currentBalance + tx.amount);
            } else if (tx.type === 'Withdrawal') {
                balances.set(tx.accountId, currentBalance - tx.amount);
            }
        });
        
        return balances;
    }, [accounts, allTransactions]);

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

    // ✅ تنفيذ حذف الحساب مع الاحتفاظ بالمصروفات
    // - الإيرادات (Deposit): تُحذف نهائياً
    // - المصروفات (Withdrawal): تُنقل لحساب آخر أو يُفك ربطها
    const executeDeleteAccount = useCallback(async (account: Account, transferExpensesToAccountId?: string) => {
        try {
            // ✅ فصل المعاملات حسب النوع
            const accountTransactions = allTransactions.filter(t => t.accountId === account.id);
            const deposits = accountTransactions.filter(t => t.type === 'Deposit');
            const withdrawals = accountTransactions.filter(t => t.type === 'Withdrawal');
            
            const targetAccountId = transferExpensesToAccountId || accounts.find(a => a.id !== account.id)?.id;
            const targetAccount = targetAccountId ? accounts.find(a => a.id === targetAccountId) : null;
            
            // 1️⃣ معالجة المصروفات في جدول expenses أولاً (قبل حذف المعاملات)
            try {
                const allExpenses = await expensesService.getAll();
                const accountExpenses = allExpenses.filter(exp => exp.accountId === account.id);
                
                
                for (const expense of accountExpenses) {
                    if (targetAccountId) {
                        // نقل المصروف إلى حساب آخر
                        await expensesService.update(expense.id, { accountId: targetAccountId });
                    } else {
                        // فك ربط المصروف من الحساب (لكن لا نحذفه!)
                        await expensesService.update(expense.id, { accountId: '' }); // null
                    }
                }
                
                if (accountExpenses.length > 0) {
                    if (targetAccountId) {
                        addToast(`تم نقل ${accountExpenses.length} مصروف إلى ${targetAccount?.name}`, 'info');
                    } else {
                        addToast(`تم فك ربط ${accountExpenses.length} مصروف من الحساب المحذوف`, 'info');
                    }
                }
            } catch (err) {
                console.warn('Failed to update expenses:', err);
            }
            
            // 2️⃣ حذف الإيرادات (Deposits)
            for (const deposit of deposits) {
                try {
                    await transactionsService.delete(deposit.id);
                } catch (err) {
                    console.warn(`Failed to delete deposit ${deposit.id}:`, err);
                }
            }
            
            // 3️⃣ نقل أو حذف المصروفات (Withdrawals) من جدول transactions
            for (const withdrawal of withdrawals) {
                try {
                    if (targetAccountId) {
                        // نقل معاملة السحب إلى حساب آخر
                        await transactionsService.update(withdrawal.id, {
                            accountId: targetAccountId,
                            accountName: targetAccount?.name || '',
                        });
                    } else {
                        // فك ربط المعاملة (حذفها)
                        await transactionsService.delete(withdrawal.id);
                    }
                } catch (err) {
                    console.warn(`Failed to handle withdrawal ${withdrawal.id}:`, err);
                }
            }
            
            // 4️⃣ حذف الحساب
            await accountsService.delete(account.id);
            
            // ✅ تحديث الحالة المحلية
            setAccounts(prev => prev.filter(a => a.id !== account.id));
            setAllTransactions(prev => {
                // حذف الإيرادات من القائمة
                const withoutDeposits = prev.filter(t => !(t.accountId === account.id && t.type === 'Deposit'));
                // تحديث المصروفات المنقولة
                if (transferExpensesToAccountId) {
                    return withoutDeposits.map(t => 
                        t.accountId === account.id && t.type === 'Withdrawal'
                            ? { ...t, accountId: transferExpensesToAccountId }
                            : t
                    );
                }
                return withoutDeposits.filter(t => t.accountId !== account.id);
            });
            setTransactions(prev => prev.filter(t => t.accountId !== account.id));
            
            if (selectedAccount?.id === account.id) {
                setSelectedAccount(accounts.find(a => a.id !== account.id) || null);
            }
            
            addToast(`تم حذف الحساب "${account.name}" (${deposits.length} إيراد تم حذفه)`, 'success');
            logActivity('Delete Account', `تم حذف حساب: ${account.name} - حُذف ${deposits.length} إيراد، نُقل ${withdrawals.length} مصروف`, 'expenses');
        } catch (error: any) {
            console.error('Error deleting account:', error);
            if (error?.code === '23503' || error?.message?.includes('violates foreign key') || error?.status === 409) {
                addToast('لا يمكن حذف الحساب لأنه مرتبط بمعاملات. يرجى نقل المعاملات أولاً.', 'error');
                setAccountToDelete(account);
                setIsDeleteWithTransferModalOpen(true);
            } else {
                addToast('خطأ في حذف الحساب', 'error');
            }
        }
    }, [selectedAccount, accounts, allTransactions, addToast]);

    const handleDeleteAccount = useCallback(async (account: Account) => {
        // ✅ التحقق من وجود معاملات مرتبطة بالحساب قبل الحذف - استخدام allTransactions
        const accountTransactions = allTransactions.filter(t => t.accountId === account.id);
        
        if (accountTransactions.length > 0) {
            // ✅ عرض modal لنقل العمليات قبل الحذف بدلاً من confirm
            setAccountToDelete(account);
            setIsDeleteWithTransferModalOpen(true);
            return;
        }
        
        // إذا لم يكن هناك معاملات، نحذف مباشرة
        if (!confirm(`هل أنت متأكد من حذف حساب "${account.name}"؟`)) return;
        
        await executeDeleteAccount(account);
    }, [allTransactions, executeDeleteAccount]);

    // ✅ نقل المعاملات من حساب إلى آخر
    const handleTransferTransactions = useCallback(async (
        fromAccountId: string, 
        toAccountId: string,
        deleteAfterTransfer: boolean = false
    ) => {
        try {
            const fromAccount = accounts.find(a => a.id === fromAccountId);
            const toAccount = accounts.find(a => a.id === toAccountId);
            
            if (!fromAccount || !toAccount) {
                addToast('خطأ في تحديد الحسابات', 'error');
                return;
            }
            
            // ✅ جلب المعاملات من allTransactions بدلاً من transactions
            const transactionsToTransfer = allTransactions.filter(t => t.accountId === fromAccountId);
            
            if (transactionsToTransfer.length === 0) {
                addToast('لا توجد معاملات للنقل', 'warning');
                return;
            }
            
            // تحديث كل معاملة لتنتقل للحساب الجديد
            for (const t of transactionsToTransfer) {
                await transactionsService.update(t.id, {
                    accountId: toAccountId,
                    accountName: toAccount.name,
                });
            }
            
            // ✅ تحديث allTransactions (لحساب الأرصدة الصحيحة)
            setAllTransactions(prev => prev.map(t => 
                t.accountId === fromAccountId 
                    ? { ...t, accountId: toAccountId, accountName: toAccount.name }
                    : t
            ));
            
            // ✅ تحديث transactions (للعرض)
            setTransactions(prev => prev.map(t => 
                t.accountId === fromAccountId 
                    ? { ...t, accountId: toAccountId, accountName: toAccount.name }
                    : t
            ));
            
            addToast(`تم نقل ${transactionsToTransfer.length} معاملة إلى ${toAccount.name}`, 'success');
            logActivity('Transfer Transactions', `نقل ${transactionsToTransfer.length} معاملة من ${fromAccount.name} إلى ${toAccount.name}`, 'expenses');
            
            // إذا كان النقل مطلوباً قبل الحذف
            if (deleteAfterTransfer && accountToDelete) {
                // ✅ تمرير الحساب الهدف لنقل المصروفات إليه
                await executeDeleteAccount(accountToDelete, toAccountId);
                setAccountToDelete(null);
            }
            
            setIsTransferModalOpen(false);
            setIsDeleteWithTransferModalOpen(false);
        } catch (error) {
            console.error('Error transferring transactions:', error);
            addToast('خطأ في نقل المعاملات', 'error');
        }
    }, [accounts, transactions, accountToDelete, executeDeleteAccount, addToast]);

    // ✅ حذف الحساب مع حذف الإيرادات فقط (بدون نقل)
    const handleDeleteAccountWithoutTransfer = useCallback(async (account: Account) => {
        // البحث عن أول حساب آخر لنقل المصروفات إليه
        const targetAccount = accounts.find(a => a.id !== account.id);
        await executeDeleteAccount(account, targetAccount?.id);
        setAccountToDelete(null);
        setIsDeleteWithTransferModalOpen(false);
    }, [accounts, executeDeleteAccount]);

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
            
            // ✅ إضافة المعاملة للقائمتين - الرصيد يُحسب تلقائياً من المعاملات
            setTransactions(prev => [created, ...prev]);
            setAllTransactions(prev => [created, ...prev]);
            
            addToast('تمت إضافة الإيراد بنجاح', 'success');
            logActivity('Add Revenue', `إيراد: ${revenueData.description} - ${formatCurrency(revenueData.amount)}`, 'expenses');
            setIsRevenueModalOpen(false);
        } catch (error) {
            console.error('Error saving revenue:', error);
            addToast('خطأ في حفظ الإيراد', 'error');
        }
    }, [accounts, selectedProjectId, addToast]);

    // ════════════════════════════════════════════════════════════════════════
    // تصدير الحركات المالية
    // ════════════════════════════════════════════════════════════════════════
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);
    
    // إغلاق قائمة التصدير عند النقر خارجها
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    // تحويل البيانات إلى CSV
    const convertToCSV = useCallback((data: Transaction[]) => {
        const headers = ['التاريخ', 'الوصف', 'النوع', 'المبلغ', 'الحساب', 'المصدر'];
        const csvRows = [headers.join(',')];
        
        data.forEach(t => {
            const row = [
                t.date,
                `"${(t.description || '').replace(/"/g, '""')}"`, // معالجة النصوص
                t.type === 'Deposit' ? 'إيداع' : 'سحب',
                t.amount.toString(),
                `"${(t.accountName || '').replace(/"/g, '""')}"`,
                t.sourceType === 'Manual' ? 'يدوي' : 
                 t.sourceType === 'Payment' ? 'دفعة' :
                 t.sourceType === 'Expense' ? 'مصروف' :
                 t.sourceType === 'Salary' ? 'راتب' : (t.sourceType || '')
            ];
            csvRows.push(row.join(','));
        });
        
        // إضافة BOM لدعم العربية في Excel
        return '\uFEFF' + csvRows.join('\n');
    }, []);
    
    // تصدير ك CSV
    const handleExportCSV = useCallback(() => {
        const dataToExport = selectedAccount 
            ? transactions.filter(t => t.accountId === selectedAccount.id)
            : allTransactions;
        
        if (dataToExport.length === 0) {
            addToast('لا توجد بيانات للتصدير', 'warning');
            return;
        }
        
        const csv = convertToCSV(dataToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = selectedAccount 
            ? `حركات_${selectedAccount.name}_${new Date().toISOString().split('T')[0]}.csv`
            : `حركات_${selectedProject?.name || 'المشروع'}_${new Date().toISOString().split('T')[0]}.csv`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        addToast('تم تصدير البيانات بنجاح', 'success');
        setIsExportMenuOpen(false);
    }, [selectedAccount, transactions, allTransactions, selectedProject, convertToCSV, addToast]);
    
    // تصدير ك Excel (XLSX بسيط عبر HTML Table)
    const handleExportExcel = useCallback(() => {
        const dataToExport = selectedAccount 
            ? transactions.filter(t => t.accountId === selectedAccount.id)
            : allTransactions;
        
        if (dataToExport.length === 0) {
            addToast('لا توجد بيانات للتصدير', 'warning');
            return;
        }
        
        // إنشاء جدول HTML للتصدير ك Excel
        let html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8">
                <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
                <x:Name>الحركات المالية</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/><x:DisplayRightToLeft/></x:WorksheetOptions>
                </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
                <style>
                    table { border-collapse: collapse; direction: rtl; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                    th { background-color: #4F46E5; color: white; font-weight: bold; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                    .deposit { color: #059669; }
                    .withdrawal { color: #DC2626; }
                </style>
            </head>
            <body>
                <table>
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>الوصف</th>
                            <th>النوع</th>
                            <th>المبلغ</th>
                            <th>الحساب</th>
                            <th>المصدر</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        dataToExport.forEach(t => {
            const typeClass = t.type === 'Deposit' ? 'deposit' : 'withdrawal';
            const typeText = t.type === 'Deposit' ? 'إيداع' : 'سحب';
            const sourceText = t.sourceType === 'Manual' ? 'يدوي' : 
                 t.sourceType === 'Payment' ? 'دفعة' :
                 t.sourceType === 'Expense' ? 'مصروف' :
                 t.sourceType === 'Salary' ? 'راتب' : (t.sourceType || '');
            
            // ✅ تنظيف البيانات من HTML injection
            const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
            
            html += `
                <tr>
                    <td>${esc(t.date || '')}</td>
                    <td>${esc(t.description || '')}</td>
                    <td class="${typeClass}">${typeText}</td>
                    <td class="${typeClass}">${formatCurrency(t.amount)}</td>
                    <td>${esc(t.accountName || '')}</td>
                    <td>${sourceText}</td>
                </tr>
            `;
        });
        
        // إضافة سطر المجموع
        const totalDeposits = dataToExport.filter(t => t.type === 'Deposit').reduce((sum, t) => sum + t.amount, 0);
        const totalWithdrawals = dataToExport.filter(t => t.type === 'Withdrawal').reduce((sum, t) => sum + t.amount, 0);
        const netBalance = totalDeposits - totalWithdrawals;
        
        html += `
                        <tr style="font-weight: bold; background-color: #e5e7eb;">
                            <td colspan="3">إجمالي الإيداعات</td>
                            <td class="deposit">${formatCurrency(totalDeposits)}</td>
                            <td colspan="2"></td>
                        </tr>
                        <tr style="font-weight: bold; background-color: #e5e7eb;">
                            <td colspan="3">إجمالي السحوبات</td>
                            <td class="withdrawal">${formatCurrency(totalWithdrawals)}</td>
                            <td colspan="2"></td>
                        </tr>
                        <tr style="font-weight: bold; background-color: #dbeafe;">
                            <td colspan="3">صافي الرصيد</td>
                            <td>${formatCurrency(netBalance)}</td>
                            <td colspan="2"></td>
                        </tr>
                    </tbody>
                </table>
            </body>
            </html>
        `;
        
        const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = selectedAccount 
            ? `حركات_${selectedAccount.name}_${new Date().toISOString().split('T')[0]}.xls`
            : `حركات_${selectedProject?.name || 'المشروع'}_${new Date().toISOString().split('T')[0]}.xls`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        addToast('تم تصدير البيانات إلى Excel بنجاح', 'success');
        setIsExportMenuOpen(false);
    }, [selectedAccount, transactions, allTransactions, selectedProject, addToast]);

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
                    <svg className="w-24 h-24 mb-4 text-amber-400 dark:text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-300 mb-2">
                        ⚠️ اختر المشروع أولاً
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
                        يجب اختيار المشروع الصحيح قبل إضافة أي إيرادات أو مصروفات
                        <br />
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                            تأكد من اختيار المشروع المناسب لتجنب إدخال بيانات في المشروع الخطأ
                        </span>
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
                        {canAdd && (
                            <button
                                onClick={() => { setEditingAccount(null); setIsAccountModalOpen(true); }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl
                                    font-semibold hover:bg-primary-700 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <PlusIcon className="h-5 w-5" />
                                <span className="hidden sm:inline">إضافة حساب</span>
                                <span className="sm:hidden">حساب</span>
                            </button>
                        )}
                        
                        {accounts.length > 0 && canAdd && (
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
                        
                        {/* ✅ زر نقل العمليات بين الحسابات */}
                        {accounts.length > 1 && (
                            <button
                                onClick={() => setIsTransferModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl
                                    font-semibold hover:bg-amber-700 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                <span className="hidden sm:inline">نقل العمليات</span>
                                <span className="sm:hidden">نقل</span>
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
                                        {canAdd && (
                                            <button
                                                onClick={() => setIsAccountModalOpen(true)}
                                                className="mt-3 text-primary-600 hover:text-primary-700 font-medium"
                                            >
                                                + إنشاء حساب جديد
                                            </button>
                                        )}
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
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${acc.type === 'Cash' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'}`}>
                                                                {acc.type === 'Cash' ? 'صندوق' : 'مصرف'}
                                                            </span>
                                                            {acc.projectId ? (
                                                                <span className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 rounded text-[10px]">
                                                                    {acc.projectName || selectedProject?.name || 'مشروع'}
                                                                </span>
                                                            ) : (
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
                                                {selectedAccount?.id === acc.id && (canEdit || canDelete) && (
                                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                                                        {canEdit && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setEditingAccount(acc); setIsAccountModalOpen(true); }}
                                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm
                                                                    text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                                                            >
                                                                <EditIcon className="h-4 w-4" />
                                                                تعديل
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteAccount(acc); }}
                                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm
                                                                    text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                                                            >
                                                                <TrashIcon className="h-4 w-4" />
                                                                حذف
                                                            </button>
                                                        )}
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
                                <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50
                                    flex items-center justify-between flex-wrap gap-3">
                                    <h3 className="font-bold text-xl text-slate-900 dark:text-white">
                                        سجل الحركات {selectedAccount ? `- ${selectedAccount.name}` : ''}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {/* ✅ زر التصدير - يظهر دائماً */}
                                        <div className="relative" ref={exportMenuRef}>
                                            <button
                                                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                                disabled={allTransactions.length === 0}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                                                    ${allTransactions.length === 0 
                                                        ? 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 cursor-not-allowed opacity-50'
                                                        : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
                                                    }`}
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                تصدير
                                                <svg className={`h-4 w-4 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                            
                                            {/* قائمة خيارات التصدير */}
                                            {isExportMenuOpen && allTransactions.length > 0 && (
                                                    <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg
                                                        border border-slate-200 dark:border-slate-700 py-1 z-50 animate-fade-in-scale-up">
                                                        <button
                                                            onClick={handleExportExcel}
                                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200
                                                                hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                        >
                                                            <svg className="h-5 w-5 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12.9,14.5L15.8,19H14L12,15.6L10,19H8.2L11.1,14.5L8.2,10H10L12,13.4L14,10H15.8L12.9,14.5Z"/>
                                                            </svg>
                                                            <div className="text-right">
                                                                <p className="font-medium">تصدير Excel</p>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400">.xls</p>
                                                            </div>
                                                        </button>
                                                        <button
                                                            onClick={handleExportCSV}
                                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200
                                                                hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                        >
                                                            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            <div className="text-right">
                                                                <p className="font-medium">تصدير CSV</p>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400">ملف نصي</p>
                                                            </div>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        
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
                                                <li key={t.id} className="transaction-item p-5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-3 rounded-full flex-shrink-0 ${
                                                            t.type === 'Deposit' 
                                                                ? 'bg-emerald-100 dark:bg-emerald-500/20' 
                                                                : 'bg-rose-100 dark:bg-rose-500/20'
                                                        }`}>
                                                            {t.type === 'Deposit' 
                                                                ? <ArrowUpIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                                                : <ArrowDownIcon className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                                                            }
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                                                                {t.description}
                                                            </p>
                                                            <div className="flex items-center gap-3 text-base text-slate-600 dark:text-slate-300 mt-1">
                                                                <span className="font-medium">{t.date}</span>
                                                                {t.sourceType && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-sm font-medium">
                                                                            {t.sourceType === 'Manual' ? 'يدوي' : 
                                                                             t.sourceType === 'Payment' ? 'دفعة' :
                                                                             t.sourceType === 'Expense' ? 'مصروف' :
                                                                             t.sourceType === 'Salary' ? 'راتب' : t.sourceType}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex-shrink-0 w-[200px] flex items-center justify-center ml-auto">
                                                            <span className={`font-black text-3xl tracking-wide inline-block w-full text-center ${
                                                                t.type === 'Deposit' 
                                                                    ? 'text-emerald-700 dark:text-emerald-300' 
                                                                    : 'text-rose-700 dark:text-rose-300'
                                                            }`} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
                                                                {t.type === 'Deposit' ? '+' : '-'}{formatCurrency(t.amount)}
                                                            </span>
                                                        </div>
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
            {isAccountModalOpen && ((editingAccount === null && canAdd) || (editingAccount !== null && canEdit)) && (
                <AccountModal
                    account={editingAccount}
                    projectId={selectedProjectId!}
                    projectName={selectedProject?.name || ''}
                    existingAccounts={accounts}
                    onClose={() => { setIsAccountModalOpen(false); setEditingAccount(null); }}
                    onSave={handleSaveAccount}
                />
            )}
            
            {isRevenueModalOpen && selectedProjectId && canAdd && (
                <RevenueModal
                    accounts={accounts}
                    projectName={selectedProject?.name || ''}
                    onClose={() => setIsRevenueModalOpen(false)}
                    onSave={handleSaveRevenue}
                />
            )}
            
            {/* ✅ Modal نقل العمليات */}
            {isTransferModalOpen && (
                <TransferTransactionsModal
                    accounts={accounts}
                    transactions={allTransactions}
                    projectName={selectedProject?.name || ''}
                    onClose={() => setIsTransferModalOpen(false)}
                    onTransfer={handleTransferTransactions}
                />
            )}
            
            {/* ✅ Modal حذف الحساب مع خيار نقل المصروفات */}
            {isDeleteWithTransferModalOpen && accountToDelete && (
                <DeleteAccountWithTransferModal
                    account={accountToDelete}
                    accounts={accounts}
                    transactions={allTransactions}
                    onClose={() => { setIsDeleteWithTransferModalOpen(false); setAccountToDelete(null); }}
                    onTransferAndDelete={(toAccountId) => handleTransferTransactions(accountToDelete.id, toAccountId, true)}
                    onDeleteOnly={() => handleDeleteAccountWithoutTransfer(accountToDelete)}
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
    existingAccounts: Account[];
    onClose: () => void;
    onSave: (data: Omit<Account, 'id'>) => void;
}

const AccountModal: React.FC<AccountModalProps> = ({ account, projectId, projectName, existingAccounts, onClose, onSave }) => {
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
        
        // ✅ التحقق من تكرار الاسم
        const isDuplicate = existingAccounts.some(
            acc => acc.name.trim().toLowerCase() === formData.name.trim().toLowerCase() 
                   && acc.id !== account?.id // استثناء الحساب الحالي عند التعديل
        );
        
        if (isDuplicate) {
            addToast('يوجد حساب بنفس الاسم بالفعل، الرجاء اختيار اسم مختلف', 'error');
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

// ════════════════════════════════════════════════════════════════════════════
// Modal: نقل العمليات بين الحسابات
// ════════════════════════════════════════════════════════════════════════════

interface TransferTransactionsModalProps {
    accounts: Account[];
    transactions: Transaction[];
    projectName: string;
    onClose: () => void;
    onTransfer: (fromAccountId: string, toAccountId: string) => void;
}

const TransferTransactionsModal: React.FC<TransferTransactionsModalProps> = ({ 
    accounts, transactions, projectName, onClose, onTransfer 
}) => {
    const { addToast } = useToast();
    const [fromAccountId, setFromAccountId] = useState('');
    const [toAccountId, setToAccountId] = useState('');
    
    // حساب عدد المعاملات للحساب المصدر
    const transactionsCount = fromAccountId 
        ? transactions.filter(t => t.accountId === fromAccountId).length 
        : 0;
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fromAccountId) {
            addToast('يرجى اختيار الحساب المصدر', 'error');
            return;
        }
        if (!toAccountId) {
            addToast('يرجى اختيار الحساب الهدف', 'error');
            return;
        }
        if (fromAccountId === toAccountId) {
            addToast('لا يمكن النقل لنفس الحساب', 'error');
            return;
        }
        if (transactionsCount === 0) {
            addToast('لا توجد معاملات للنقل في الحساب المحدد', 'warning');
            return;
        }
        onTransfer(fromAccountId, toAccountId);
    };
    
    const inputStyle = `w-full p-2.5 border border-slate-300 dark:border-slate-600 
        bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl
        focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all`;
    
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
                                <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                نقل العمليات بين الحسابات
                            </h2>
                            <p className="text-sm text-slate-500 mt-0.5">المشروع: {projectName}</p>
                        </div>
                        <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                            <CloseIcon className="h-5 w-5 text-slate-500" />
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                <strong>تنبيه:</strong> سيتم نقل جميع المعاملات من الحساب المصدر إلى الحساب الهدف.
                                هذا يساعدك على دمج الحسابات أو تصحيح التسجيلات.
                            </p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                نقل من حساب <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={fromAccountId}
                                onChange={e => setFromAccountId(e.target.value)}
                                className={inputStyle}
                                required
                            >
                                <option value="">اختر الحساب المصدر...</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.type === 'Cash' ? '💵' : '🏦'} {acc.name}
                                    </option>
                                ))}
                            </select>
                            {fromAccountId && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    عدد المعاملات: <strong className="text-amber-600">{transactionsCount}</strong>
                                </p>
                            )}
                        </div>
                        
                        <div className="flex justify-center">
                            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full">
                                <ArrowDownIcon className="h-5 w-5 text-slate-500" />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                نقل إلى حساب <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={toAccountId}
                                onChange={e => setToAccountId(e.target.value)}
                                className={inputStyle}
                                required
                            >
                                <option value="">اختر الحساب الهدف...</option>
                                {accounts
                                    .filter(acc => acc.id !== fromAccountId)
                                    .map(acc => (
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
                            disabled={transactionsCount === 0}
                            className="px-6 py-2 rounded-xl bg-amber-600 text-white font-semibold 
                                hover:bg-amber-700 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]
                                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            نقل {transactionsCount > 0 ? `(${transactionsCount})` : ''} المعاملات
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════════════
// Modal: حذف حساب مع خيار نقل العمليات
// ════════════════════════════════════════════════════════════════════════════

interface DeleteAccountWithTransferModalProps {
    account: Account;
    accounts: Account[];
    transactions: Transaction[];
    onClose: () => void;
    onTransferAndDelete: (toAccountId: string) => void;
    onDeleteOnly: () => void;
}

const DeleteAccountWithTransferModal: React.FC<DeleteAccountWithTransferModalProps> = ({
    account, accounts, transactions, onClose, onTransferAndDelete, onDeleteOnly
}) => {
    const { addToast } = useToast();
    const [toAccountId, setToAccountId] = useState('');
    
    // ✅ فصل المعاملات حسب النوع
    const accountTransactions = transactions.filter(t => t.accountId === account.id);
    const depositsCount = accountTransactions.filter(t => t.type === 'Deposit').length;
    const withdrawalsCount = accountTransactions.filter(t => t.type === 'Withdrawal').length;
    const otherAccounts = accounts.filter(a => a.id !== account.id);
    
    // ✅ تحديد ما إذا كان هناك مصروفات تحتاج نقل
    const hasWithdrawals = withdrawalsCount > 0;
    const hasOtherAccounts = otherAccounts.length > 0;
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // ✅ إذا كان هناك مصروفات ويوجد حسابات أخرى، يجب اختيار حساب للنقل
        if (hasWithdrawals && hasOtherAccounts && !toAccountId) {
            addToast('يرجى اختيار الحساب لنقل المصروفات إليه', 'error');
            return;
        }
        
        // ✅ تأكيد الحذف
        const confirmMsg = depositsCount > 0 
            ? `سيتم حذف ${depositsCount} إيراد نهائياً${hasWithdrawals ? ` ونقل ${withdrawalsCount} مصروف` : ''}.\nهل أنت متأكد؟`
            : `هل أنت متأكد من حذف الحساب "${account.name}"؟`;
        
        if (!confirm(confirmMsg)) return;
        
        if (toAccountId) {
            onTransferAndDelete(toAccountId);
        } else {
            onDeleteOnly();
        }
    };
    
    const inputStyle = `w-full p-2.5 border border-slate-300 dark:border-slate-600 
        bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl
        focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all`;
    
    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center p-4" onClick={onClose}>
            <div 
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in-scale-up" 
                onClick={e => e.stopPropagation()}
            >
                <form onSubmit={handleSubmit}>
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <svg className="h-6 w-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            حذف حساب "{account.name}"
                        </h2>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        {/* ✅ ملخص المعاملات */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 text-center">
                                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{depositsCount}</p>
                                <p className="text-xs text-emerald-700 dark:text-emerald-300">إيراد (سيُحذف)</p>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3 text-center">
                                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{withdrawalsCount}</p>
                                <p className="text-xs text-amber-700 dark:text-amber-300">مصروف (سيُنقل)</p>
                            </div>
                        </div>
                        
                        {/* ✅ شرح السلوك */}
                        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                <strong>ℹ️ ماذا سيحدث:</strong>
                            </p>
                            <ul className="text-xs text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
                                {depositsCount > 0 && (
                                    <li><span className="text-rose-600">الإيرادات ({depositsCount})</span>: ستُحذف نهائياً</li>
                                )}
                                {withdrawalsCount > 0 && hasOtherAccounts && (
                                    <li><span className="text-emerald-600">المصروفات ({withdrawalsCount})</span>: ستُنقل للحساب المختار</li>
                                )}
                                {withdrawalsCount > 0 && !hasOtherAccounts && (
                                    <li><span className="text-amber-600">المصروفات ({withdrawalsCount})</span>: سيُفك ربطها بالحساب</li>
                                )}
                                <li>الحساب نفسه سيُحذف</li>
                            </ul>
                        </div>
                        
                        {/* ✅ اختيار حساب لنقل المصروفات (إذا وجدت) */}
                        {hasWithdrawals && hasOtherAccounts && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    نقل المصروفات إلى <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={toAccountId}
                                    onChange={e => setToAccountId(e.target.value)}
                                    className={inputStyle}
                                    required
                                >
                                    <option value="">اختر الحساب...</option>
                                    {otherAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.type === 'Cash' ? '💵' : '🏦'} {acc.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-500 mt-1">
                                    سيتم نقل {withdrawalsCount} مصروف لهذا الحساب
                                </p>
                            </div>
                        )}
                        
                        {/* ✅ تحذير إذا لا يوجد حسابات أخرى */}
                        {hasWithdrawals && !hasOtherAccounts && (
                            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
                                <p className="text-sm text-amber-800 dark:text-amber-200">
                                    <strong>⚠️ تنبيه:</strong> لا توجد حسابات أخرى لنقل المصروفات إليها.
                                    سيتم فك ربط المصروفات من هذا الحساب.
                                </p>
                            </div>
                        )}
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
                            className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold 
                                shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            حذف الحساب
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Treasury;
