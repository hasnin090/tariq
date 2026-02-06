import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { Employee, Expense, ExpenseCategory, Account, Transaction, Project } from '../../../types';
import logActivity from '../../../utils/activityLogger';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { useProject } from '../../../contexts/ProjectContext';
import { useButtonPermission } from '../../../hooks';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { CloseIcon, UsersIcon, BuildingIcon } from '../../shared/Icons';
import ConfirmModal from '../../shared/ConfirmModal';
import EmptyState from '../../shared/EmptyState';
import { accountsService, employeesService, expenseCategoriesService, expensesService, projectsService, transactionsService } from '../../../src/services/supabaseService';
import AmountInput, { type AmountInputValue } from '../../shared/AmountInput';


const PaySingleSalaryModal: React.FC<{
    employee: Employee;
    paidAmount: number;
    accounts: Account[];
    onClose: () => void;
    onConfirm: (employeeId: string, accountId: string, amount: number) => Promise<void>;
}> = ({ employee, paidAmount, accounts, onClose, onConfirm }) => {
    const { addToast } = useToast();
    const remainingAmount = employee.salary - paidAmount;

    const [accountId, setAccountId] = useState<string>(accounts.length > 0 ? accounts[0].id : '');
    const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
    const [partialAmount, setPartialAmount] = useState<AmountInputValue>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        if (!accountId) {
            addToast('يرجى اختيار حساب للدفع منه.', 'error');
            return;
        }
        
        const amountToPay = paymentType === 'full' 
            ? remainingAmount 
            : (partialAmount === '' ? 0 : partialAmount);
        
        if (amountToPay <= 0) {
            addToast('يجب أن يكون مبلغ الدفعة أكبر من صفر.', 'error');
            return;
        }
        if (amountToPay > remainingAmount) {
            addToast(`المبلغ المدفوع لا يمكن أن يتجاوز الرصيد المتبقي (${formatCurrency(remainingAmount)}).`, 'error');
            return;
        }
        
        setIsSubmitting(true);
        try {
            await onConfirm(employee.id, accountId, amountToPay);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4 pt-20 animate-drawer-overlay-show" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg animate-fade-in-scale-up my-16 max-h-[calc(100vh-8rem)] overflow-y-auto" onClick={e => e.stopPropagation()}>
                 <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">دفع راتب لـ {employee.name}</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><CloseIcon className="h-6 w-6"/></button>
                </div>
                <div className="p-6 space-y-4">
                    {/* ملخص الراتب */}
                    <div className="grid grid-cols-3 gap-4 text-center bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">الراتب الكامل</p>
                            <p className="font-bold text-lg text-slate-800 dark:text-slate-200">{formatCurrency(employee.salary)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">المدفوع هذا الشهر</p>
                            <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{formatCurrency(paidAmount)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">المتبقي</p>
                            <p className="font-bold text-lg text-rose-600 dark:text-rose-400">{formatCurrency(remainingAmount)}</p>
                        </div>
                    </div>
                    
                    {/* نوع الدفع */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">نوع الدفع</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="paymentType" 
                                    checked={paymentType === 'full'} 
                                    onChange={() => setPaymentType('full')}
                                    className="w-4 h-4 text-primary-600"
                                />
                                <span className="text-slate-700 dark:text-slate-300">دفع كامل المتبقي ({formatCurrency(remainingAmount)})</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="paymentType" 
                                    checked={paymentType === 'partial'} 
                                    onChange={() => setPaymentType('partial')}
                                    className="w-4 h-4 text-primary-600"
                                />
                                <span className="text-slate-700 dark:text-slate-300">دفع جزئي</span>
                            </label>
                        </div>
                    </div>
                    
                    {/* مبلغ الدفعة الجزئية */}
                    {paymentType === 'partial' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">مبلغ الدفعة</label>
                            <AmountInput
                                value={partialAmount}
                                onValueChange={setPartialAmount}
                                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500"
                                placeholder={`الحد الأقصى: ${formatCurrency(remainingAmount)}`}
                            />
                        </div>
                    )}
                    
                    {/* اختيار الحساب */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الدفع من حساب</label>
                        <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500">
                            <option value="" disabled>اختر حساب</option>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                    </div>
                    
                    {/* المبلغ النهائي */}
                    <div className="bg-primary-50 dark:bg-primary-900/30 rounded-lg p-4 text-center">
                        <p className="text-sm text-primary-700 dark:text-primary-300 mb-1">المبلغ الذي سيتم دفعه</p>
                        <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                            {formatCurrency(paymentType === 'full' ? remainingAmount : (partialAmount === '' ? 0 : partialAmount))}
                        </p>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold" disabled={isSubmitting}>إلغاء</button>
                    <button type="button" onClick={handleConfirm} className="bg-primary-600 text-white px-8 py-2 rounded-lg hover:bg-primary-700 font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" disabled={remainingAmount <= 0 || isSubmitting}>
                        {isSubmitting && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>}
                        {isSubmitting ? 'جاري الدفع...' : 'تأكيد الدفع'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Employees: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const { selectedProject } = useProject();
    const canAdd = useButtonPermission('employees', 'add');
    const canEdit = useButtonPermission('employees', 'edit');
    const canDelete = useButtonPermission('employees', 'delete');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
    const [payingEmployee, setPayingEmployee] = useState<Employee | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // ✅ فلتر المشاريع المحلي - للAdmin فقط
    const [filterProjectId, setFilterProjectId] = useState<string>('');
    
    // ✅ تحديد المشروع الفعّال للمستخدم
    // Admin: يمكنه التنقل بين المشاريع
    // غير Admin: يرى فقط مشروعه المخصص من ProjectContext أو من projectAssignments
    const isAdmin = currentUser?.role === 'Admin';
    
    // المشروع المخصص للمستخدم (من تعيينات المشاريع)
    const userAssignedProjectId = useMemo(() => {
        if (isAdmin) return null; // Admin لا يحتاج تعيين
        
        // أولاً: من selectedProject (ProjectContext)
        if (selectedProject?.id) return selectedProject.id;
        
        // ثانياً: من تعيينات المشاريع للمستخدم
        const accountingAssignment = currentUser?.projectAssignments?.find(
            a => a.interfaceMode === 'expenses'
        );
        if (accountingAssignment?.projectId) return accountingAssignment.projectId;
        
        // ثالثاً: من assignedProjectId القديم
        if (currentUser?.assignedProjectId) return currentUser.assignedProjectId;
        
        return null;
    }, [isAdmin, selectedProject?.id, currentUser?.projectAssignments, currentUser?.assignedProjectId]);
    
    // ✅ المشروع الفعّال النهائي
    const effectiveProjectId = isAdmin 
        ? (selectedProject?.id || filterProjectId) 
        : userAssignedProjectId;
    
    // GSAP Table Animation Ref
    const tableBodyRef = useRef<HTMLTableSectionElement>(null);
    const hasAnimated = useRef(false);

    // 🎬 GSAP Table Animation - runs only once
    useLayoutEffect(() => {
        if (tableBodyRef.current && employees.length > 0 && !hasAnimated.current) {
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
    }, [employees]);

    const salaryStatus = useMemo(() => {
        const status: { [key: string]: { paidAmount: number, status: 'Paid' | 'Partially Paid' | 'Not Paid'} } = {};
        const salaryCategory = categories.find(c => c.name === 'رواتب');
        if (!salaryCategory) return status;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        employees.forEach(employee => {
            const paidAmount = expenses
                .filter(exp => {
                    const expDate = new Date(exp.date);
                    return exp.categoryId === salaryCategory.id &&
                           exp.employeeId === employee.id &&
                           expDate.getMonth() === currentMonth &&
                           expDate.getFullYear() === currentYear &&
                           // ✅ فلترة حسب المشروع لتجنب حساب مصروفات مشاريع أخرى
                           (!employee.projectId || exp.projectId === employee.projectId);
                })
                .reduce((sum, exp) => sum + exp.amount, 0);
            
            let currentStatus: 'Paid' | 'Partially Paid' | 'Not Paid' = 'Not Paid';
            if (paidAmount >= employee.salary) {
                currentStatus = 'Paid';
            } else if (paidAmount > 0) {
                currentStatus = 'Partially Paid';
            }

            status[employee.id] = { paidAmount, status: currentStatus };
        });
        return status;
    }, [employees, expenses, categories]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // ✅ جلب الموظفين من قاعدة البيانات حسب المشروع الفعّال
            // للمستخدم العادي: فقط مشروعه المخصص
            // للAdmin: المشروع المحدد من الفلتر أو القائمة الرئيسية
            
            if (!effectiveProjectId) {
                // ✅ لا يوجد مشروع محدد - لا نعرض موظفين
                setEmployees([]);
            } else {
                const employeesData = await employeesService.getAll({ 
                    projectId: effectiveProjectId, 
                    includeGeneral: false 
                });
                setEmployees(employeesData);
            }
        } catch (error) {
            console.error('Error loading employees:', error);
            // fallback to localStorage if DB fails
            setEmployees(JSON.parse(localStorage.getItem('employees') || '[]'));
        }
        
        try {
            // جلب الحسابات حسب المشروع المحدد
            const projectFilter = effectiveProjectId || undefined;
            const [accountsData, expensesData, categoriesData] = await Promise.all([
                accountsService.getAll(projectFilter ? { projectId: projectFilter } : undefined),
                expensesService.getAll(),
                expenseCategoriesService.getAll(),
            ]);
            setAccounts(accountsData);
            setExpenses(expensesData);
            setCategories(categoriesData as any);
        } catch (error) {
            console.error('Error loading accounting data:', error);
            addToast('تعذر تحميل بيانات الحسابات (الحسابات/الحركات/الفئات).', 'error');
            setAccounts([]);
            setExpenses([]);
            setCategories([]);
        }
        try {
            const projectsData = await projectsService.getAll();
            setProjects(projectsData);
        } catch (error) {
            console.error('Error loading projects:', error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [effectiveProjectId]);

    const saveData = (key: string, data: any[]) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    const handleOpenModal = (employee: Employee | null) => {
        // ✅ فحص الصلاحيات قبل فتح المودال
        if (employee === null && !canAdd) {
            console.warn('🚫 handleOpenModal blocked: No add permission');
            return;
        }
        if (employee !== null && !canEdit) {
            console.warn('🚫 handleOpenModal blocked: No edit permission');
            return;
        }
        setEditingEmployee(employee);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingEmployee(null);
        setIsModalOpen(false);
    };

    const handleSave = async (employeeData: Omit<Employee, 'id'>) => {
        try {
            if (editingEmployee) {
                // تحديث موظف موجود في قاعدة البيانات
                await employeesService.update(editingEmployee.id, employeeData);
                addToast('تم تحديث بيانات الموظف بنجاح', 'success');
                logActivity('Update Employee', `Updated employee: ${employeeData.name}`, 'expenses');
            } else {
                // إضافة موظف جديد في قاعدة البيانات
                // ✅ ربط الموظف بالمشروع الفعّال (إلزامي)
                const projectIdToUse = employeeData.projectId || effectiveProjectId;
                
                if (!projectIdToUse) {
                    addToast('يجب تحديد مشروع للموظف', 'error');
                    return;
                }
                
                const dataWithProject = {
                    ...employeeData,
                    projectId: projectIdToUse,
                };
                await employeesService.create(dataWithProject);
                addToast('تمت إضافة موظف جديد بنجاح', 'success');
                logActivity('Add Employee', `Added employee: ${employeeData.name}`, 'expenses');
            }
            await loadData();
            handleCloseModal();
        } catch (error: any) {
            console.error('Error saving employee:', error);
            addToast(`فشل حفظ بيانات الموظف: ${error?.message || 'خطأ غير معروف'}`, 'error');
        }
    };

    const handleDeleteRequest = (employee: Employee) => {
        setEmployeeToDelete(employee);
    };

    const confirmDelete = async () => {
        if (!employeeToDelete) return;
        try {
            await employeesService.delete(employeeToDelete.id);
            addToast(`تم حذف الموظف "${employeeToDelete.name}" بنجاح`, 'success');
            logActivity('Delete Employee', `Deleted employee: ${employeeToDelete.name}`, 'expenses');
            setEmployeeToDelete(null);
            await loadData();
        } catch (error: any) {
            console.error('Error deleting employee:', error);
            addToast(`فشل حذف الموظف: ${error?.message || 'خطأ غير معروف'}`, 'error');
        }
    };
    
    const handlePaySalaryRequest = async (employee: Employee) => {
        // ✅ التحقق من وجود صندوق للمشروع أو إنشاؤه تلقائياً
        if (accounts.length === 0 && employee.projectId) {
            try {
                addToast('جاري إنشاء صندوق المشروع...', 'info');
                const projectForCashbox = projects.find(p => p.id === employee.projectId);
                const projectCashbox = await accountsService.getOrCreateProjectCashbox(employee.projectId, projectForCashbox?.name || '');
                setAccounts([projectCashbox]);
            } catch (error) {
                console.error('Error creating project cashbox:', error);
                addToast('تعذر إنشاء صندوق المشروع. يرجى إضافة حساب من صفحة الخزينة.', 'error');
                return;
            }
        } else if (accounts.length === 0) {
            addToast('يجب إضافة حساب للدفع منه أولاً من صفحة الخزينة.', 'error');
            return;
        }
        setPayingEmployee(employee);
    };

    const confirmPaySalary = async (employeeId: string, accountId: string, amount: number) => {
        const employee = employees.find(e => e.id === employeeId);
        let salaryCategory = categories.find(c => c.name === 'رواتب');

        if(!employee) {
            addToast('لم يتم العثور على بيانات الموظف.', 'error');
            return;
        }
        
        // ✅ إنشاء فئة "رواتب" تلقائياً إذا لم تكن موجودة
        if (!salaryCategory) {
            try {
                const newCategory = await expenseCategoriesService.findOrCreate('رواتب', employee.projectId || null);
                if (newCategory) {
                    salaryCategory = newCategory;
                    setCategories(prev => [...prev, newCategory as any]);
                } else {
                    addToast('تعذر إنشاء فئة الرواتب. الرجاء إنشائها يدوياً من قسم التصنيفات.', 'error');
                    return;
                }
            } catch (error) {
                console.error('Error creating salary category:', error);
                addToast('تعذر إنشاء فئة الرواتب. الرجاء إنشائها يدوياً من قسم التصنيفات.', 'error');
                return;
            }
        }

        // جلب صندوق المشروع تلقائياً إذا كان الموظف تابع لمشروع
        let finalAccountId = accountId;
        let account: Account | undefined;
        
        if (employee.projectId) {
            try {
                const projectCashbox = await accountsService.getOrCreateProjectCashbox(employee.projectId);
                finalAccountId = projectCashbox.id;
                account = projectCashbox;
            } catch (error) {
                console.error('Error getting project cashbox:', error);
                addToast('فشل في الحصول على صندوق المشروع.', 'error');
                return;
            }
        } else {
            account = accounts.find(a => a.id === accountId);
            if (!account) {
                addToast('يرجى اختيار حساب صالح.', 'error');
                return;
            }
        }

        const monthName = new Date().toLocaleString('ar-EG', { month: 'long' });
        const paymentDate = new Date().toISOString().split('T')[0];
        const description = amount >= (employee.salary - (salaryStatus[employee.id]?.paidAmount || 0))
            ? `دفع راتب شهر ${monthName} - ${employee.name}`
            : `دفع دفعة من راتب شهر ${monthName} - ${employee.name}`;

        try {
            // Ensure employee exists in DB so expenses.employee_id FK passes.
            await employeesService.upsertFromAppEmployee(employee);

            const newTransaction = await transactionsService.create({
                accountId: finalAccountId,
                accountName: account.name,
                type: 'Withdrawal',
                date: paymentDate,
                description,
                amount,
                sourceType: 'Salary',
                projectId: employee.projectId || null,
            });

            if (!newTransaction) {
                throw new Error('Failed to create transaction');
            }

            const newExpense = await expensesService.create({
                date: paymentDate,
                description,
                amount,
                categoryId: salaryCategory.id,
                accountId: finalAccountId,
                employeeId: employee.id,
                transactionId: newTransaction.id,
                projectId: employee.projectId || null,
            } as any);

            await transactionsService.update(newTransaction.id, { sourceId: newExpense.id });

            logActivity('Pay Salary', `Paid ${formatCurrency(amount)} to ${employee.name}`, 'expenses');
            addToast('تم دفع الراتب وتسجيل الحركة المالية بنجاح!', 'success');
            setPayingEmployee(null);
            await loadData();
        } catch (error: any) {
            console.error('Error paying salary:', error);
            const errorMessage = error?.message || 'حدث خطأ غير متوقع';
            addToast(`فشل دفع الراتب. السبب: ${errorMessage}`, 'error');
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Paid': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300';
            case 'Partially Paid': return 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300';
            case 'Not Paid': return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
        }
    };
    const statusText = {
        'Paid': 'مدفوع',
        'Partially Paid': 'مدفوع جزئياً',
        'Not Paid': 'غير مدفوع'
    };

    // ✅ الحصول على اسم المشروع الفعّال للعرض
    const effectiveProjectName = useMemo(() => {
        if (selectedProject?.id === effectiveProjectId) return selectedProject.name;
        return projects.find(p => p.id === effectiveProjectId)?.name || '';
    }, [selectedProject, effectiveProjectId, projects]);

    return (
        <div className="container mx-auto">
            {/* ✅ رسالة تحذير إذا لم يكن للمستخدم مشروع مخصص */}
            {!isAdmin && !effectiveProjectId && (
                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-3">
                        <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <p className="font-semibold text-amber-800 dark:text-amber-200">لم يتم تعيين مشروع لك</p>
                            <p className="text-sm text-amber-700 dark:text-amber-300">يرجى التواصل مع المسؤول لتعيين مشروع لحسابك.</p>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">الموظفين</h2>
                <div className="flex items-center gap-4 flex-wrap">
                    {/* ✅ فلتر المشاريع - للAdmin فقط عندما لا يكون هناك مشروع محدد من القائمة الرئيسية */}
                    {isAdmin && !selectedProject && (
                        <div className="flex items-center gap-2">
                            <BuildingIcon className="h-5 w-5 text-slate-500" />
                            <select
                                value={filterProjectId}
                                onChange={(e) => setFilterProjectId(e.target.value)}
                                className="p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm min-w-[180px]"
                            >
                                <option value="">اختر مشروع</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    {/* ✅ عرض المشروع الفعّال (للجميع) */}
                    {effectiveProjectId && (
                        <div className="flex items-center gap-2 bg-primary-50 dark:bg-primary-900/30 px-3 py-1.5 rounded-lg">
                            <BuildingIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                                {effectiveProjectName}
                            </span>
                            {!isAdmin && (
                                <svg className="h-4 w-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                    )}
                    
                    {/* ✅ زر إضافة موظف - مع فحص الصلاحيات ووجود مشروع محدد */}
                    {canAdd && effectiveProjectId && (
                        <button onClick={() => handleOpenModal(null)} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-sm">
                            إضافة موظف
                        </button>
                    )}
                </div>
            </div>
            
            {/* إحصائيات سريعة */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي الموظفين</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{employees.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400">مجموع الرواتب</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(employees.reduce((sum, e) => sum + (e.salary || 0), 0))}
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400">رواتب مدفوعة</p>
                    <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                        {Object.values(salaryStatus).filter(s => s.status === 'Paid').length}
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400">رواتب معلقة</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {Object.values(salaryStatus).filter(s => s.status !== 'Paid').length}
                    </p>
                </div>
            </div>
            
            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
                </div>
            ) : employees.length > 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right min-w-[800px]">
                        <thead>
                            <tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الاسم</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المنصب</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المشروع</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الراتب</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">حالة الراتب (الشهر الحالي)</th>
                                {currentUser?.role === 'Admin' && <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">إجراءات</th>}
                            </tr>
                        </thead>
                        <tbody ref={tableBodyRef}>
                            {employees.map(emp => {
                                const statusInfo = salaryStatus[emp.id] || { paidAmount: 0, status: 'Not Paid' };
                                const projectName = emp.projectName || projects.find(p => p.id === emp.projectId)?.name;
                                return (
                                <tr key={emp.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                                    <td className="p-4 font-medium text-slate-800 dark:text-slate-100">{emp.name}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{emp.position}</td>
                                    <td className="p-4">
                                        {projectName ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                                                <BuildingIcon className="h-3.5 w-3.5" />
                                                {projectName}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 dark:text-slate-500 text-sm">عام</span>
                                        )}
                                    </td>
                                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(emp.salary)}</td>
                                    <td className="p-4"><span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusStyle(statusInfo.status)}`}>{statusText[statusInfo.status]}</span></td>
                                    {currentUser?.role === 'Admin' && (
                                        <td className="p-4 whitespace-nowrap space-x-4">
                                            {canAdd && <button onClick={() => handlePaySalaryRequest(emp)} className="text-primary-600 hover:underline font-semibold disabled:opacity-50 disabled:cursor-not-allowed" disabled={statusInfo.status === 'Paid'}>دفع راتب</button>}
                                            {canEdit && <button onClick={() => handleOpenModal(emp)} className="text-blue-600 hover:underline font-semibold">تعديل</button>}
                                            {canDelete && <button onClick={() => handleDeleteRequest(emp)} className="text-rose-600 hover:underline font-semibold">حذف</button>}
                                        </td>
                                    )}
                                </tr>
                            )})}
                        </tbody>
                    </table>
                    </div>
                </div>
                ) : (
                <EmptyState 
                    Icon={UsersIcon} 
                    title="لا يوجد موظفين" 
                    message={
                        (selectedProject || filterProjectId) 
                            ? `لا يوجد موظفين في ${selectedProject?.name || projects.find(p => p.id === filterProjectId)?.name || 'هذا المشروع'}. يمكنك إضافة موظفين جدد أو تحديد مشروع آخر.`
                            : "ابدأ بإضافة بيانات الموظفين لتتمكن من إدارة شؤونهم ورواتبهم."
                    } 
                    actionButton={canAdd ? { text: 'إضافة موظف', onClick: () => handleOpenModal(null) } : undefined} 
                />
            )}

            {/* ✅ حماية المودال بفحص الصلاحيات */}
            {isModalOpen && ((editingEmployee === null && canAdd) || (editingEmployee !== null && canEdit)) && (
                <EmployeePanel
                    employee={editingEmployee}
                    projects={projects}
                    defaultProjectId={effectiveProjectId || undefined}
                    isProjectPreselected={!!effectiveProjectId}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                />
            )}

            <ConfirmModal
                isOpen={!!employeeToDelete}
                onClose={() => setEmployeeToDelete(null)}
                onConfirm={confirmDelete}
                title="تأكيد حذف الموظف"
                message={<p>هل أنت متأكد من حذف الموظف "<strong>{employeeToDelete?.name}</strong>"؟</p>}
            />

            {payingEmployee && (
                <PaySingleSalaryModal 
                    employee={payingEmployee}
                    paidAmount={salaryStatus[payingEmployee.id]?.paidAmount || 0}
                    accounts={accounts}
                    onClose={() => setPayingEmployee(null)}
                    onConfirm={confirmPaySalary}
                />
            )}
        </div>
    );
};

interface PanelProps {
    employee: Employee | null;
    projects: Project[];
    defaultProjectId?: string;
    isProjectPreselected?: boolean; // هل المشروع محدد مسبقاً من القائمة الرئيسية؟
    onClose: () => void;
    onSave: (data: Omit<Employee, 'id'>) => void;
}

const EmployeePanel: React.FC<PanelProps> = ({ employee, projects, defaultProjectId, isProjectPreselected, onClose, onSave }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: employee?.name || '',
        position: employee?.position || '',
        salary: employee?.salary || '' as number | '',
        projectId: employee?.projectId || defaultProjectId || '',
    });
    
    // الحصول على اسم المشروع المحدد للعرض
    const selectedProjectName = projects.find(p => p.id === formData.projectId)?.name || '';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'salary' ? Number(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.position || !formData.salary || Number(formData.salary) <= 0) {
            addToast('يرجى ملء جميع الحقول بشكل صحيح.', 'error');
            return;
        }
        onSave({ ...formData, salary: Number(formData.salary) });
    };
    
    const inputStyle = "w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200";

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4 animate-drawer-overlay-show" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-xl animate-fade-in-scale-up" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start"><h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{employee ? 'تعديل بيانات موظف' : 'إضافة موظف جديد'}</h2><button type="button" onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><CloseIcon className="h-6 w-6"/></button></div>
                    <div className="p-6 space-y-4">
                        <input type="text" name="name" placeholder="الاسم الكامل" value={formData.name} onChange={handleChange} className={inputStyle} required />
                        <input type="text" name="position" placeholder="المنصب الوظيفي" value={formData.position} onChange={handleChange} className={inputStyle} required />
                        <AmountInput
                            value={formData.salary || ''}
                            onValueChange={(salary) => setFormData(prev => ({ ...prev, salary: salary === '' ? '' : salary }))}
                            className={inputStyle}
                            placeholder="الراتب الشهري"
                        />
                        
                        {/* إظهار المشروع المحدد أو قائمة الاختيار */}
                        {isProjectPreselected && defaultProjectId ? (
                            <div className="bg-primary-50 dark:bg-primary-900/30 p-3 rounded-lg border border-primary-200 dark:border-primary-700">
                                <div className="flex items-center gap-2">
                                    <svg className="h-5 w-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <span className="text-sm text-primary-700 dark:text-primary-300">المشروع:</span>
                                    <span className="font-semibold text-primary-800 dark:text-primary-200">{selectedProjectName}</span>
                                </div>
                            </div>
                        ) : (
                            <select name="projectId" value={formData.projectId} onChange={handleChange} className={`${inputStyle} bg-white dark:bg-slate-700`} required>
                                <option value="">اختر المشروع *</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        )}
                    </div>
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4"><button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold">إلغاء</button><button type="submit" className="bg-primary-600 text-white px-8 py-2 rounded-lg hover:bg-primary-700 font-semibold shadow-sm">حفظ</button></div>
                </form>
            </div>
        </div>
    );
};

export default Employees;
