import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { Employee, Expense, ExpenseCategory, Account, Transaction, Project } from '../../../types';
import logActivity from '../../../utils/activityLogger';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { CloseIcon, UsersIcon } from '../../shared/Icons';
import ConfirmModal from '../../shared/ConfirmModal';
import EmptyState from '../../shared/EmptyState';
import { projectsService } from '../../../src/services/supabaseService';


const PaySingleSalaryModal: React.FC<{
    employee: Employee;
    paidAmount: number;
    accounts: Account[];
    onClose: () => void;
    onConfirm: (employeeId: string, accountId: string, amount: number) => void;
}> = ({ employee, paidAmount, accounts, onClose, onConfirm }) => {
    const { addToast } = useToast();
    const remainingAmount = employee.salary - paidAmount;

    const [accountId, setAccountId] = useState<string>(accounts.length > 0 ? accounts[0].id : '');
    const [amount, setAmount] = useState<number>(remainingAmount);

    const handleConfirm = () => {
        if (!accountId) {
            addToast('يرجى اختيار حساب للدفع منه.', 'error');
            return;
        }
        if (amount <= 0) {
            addToast('يجب أن يكون مبلغ الدفعة أكبر من صفر.', 'error');
            return;
        }
        if (amount > remainingAmount) {
            addToast(`المبلغ المدفوع لا يمكن أن يتجاوز الرصيد المتبقي (${formatCurrency(remainingAmount)}).`, 'error');
            return;
        }
        onConfirm(employee.id, accountId, amount);
    };
    
    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4 pt-20 animate-drawer-overlay-show" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg animate-fade-in-scale-up my-16 max-h-[calc(100vh-8rem)] overflow-y-auto" onClick={e => e.stopPropagation()}>
                 <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">دفع راتب لـ {employee.name}</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><CloseIcon className="h-6 w-6"/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div><p className="text-sm text-slate-500">الراتب الكامل</p><p className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(employee.salary)}</p></div>
                        <div><p className="text-sm text-slate-500">المدفوع هذا الشهر</p><p className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(paidAmount)}</p></div>
                        <div><p className="text-sm text-slate-500">المتبقي</p><p className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(remainingAmount)}</p></div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">مبلغ الدفعة</label>
                        <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} max={remainingAmount} min="0.01" step="0.01" className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500" />
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
                    <button type="button" onClick={handleConfirm} className="bg-primary-600 text-white px-8 py-2 rounded-lg hover:bg-primary-700 font-semibold shadow-sm" disabled={remainingAmount <= 0}>تأكيد الدفع</button>
                </div>
            </div>
        </div>
    );
};

const Employees: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
    const [payingEmployee, setPayingEmployee] = useState<Employee | null>(null);
    
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
                           expDate.getFullYear() === currentYear;
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
        setEmployees(JSON.parse(localStorage.getItem('employees') || '[]'));
        setAccounts(JSON.parse(localStorage.getItem('accounts') || '[]'));
        setExpenses(JSON.parse(localStorage.getItem('expenses') || '[]'));
        setCategories(JSON.parse(localStorage.getItem('expenseCategories') || '[]'));
        try {
            const projectsData = await projectsService.getAll();
            setProjects(projectsData);
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const saveData = (key: string, data: any[]) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    const handleOpenModal = (employee: Employee | null) => {
        setEditingEmployee(employee);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingEmployee(null);
        setIsModalOpen(false);
    };

    const handleSave = (employeeData: Omit<Employee, 'id'>) => {
        if (editingEmployee) {
            const updated = employees.map(e =>
                e.id === editingEmployee.id ? { ...editingEmployee, ...employeeData } : e
            );
            saveData('employees', updated);
            addToast('تم تحديث بيانات الموظف بنجاح', 'success');
            logActivity('Update Employee', `Updated employee: ${employeeData.name}`);
        } else {
            const newEmployee = { id: `emp_${Date.now()}`, ...employeeData };
            const updated = [...employees, newEmployee];
            saveData('employees', updated);
            addToast('تمت إضافة موظف جديد بنجاح', 'success');
            logActivity('Add Employee', `Added employee: ${newEmployee.name}`);
        }
        loadData();
        handleCloseModal();
    };

    const handleDeleteRequest = (employee: Employee) => {
        setEmployeeToDelete(employee);
    };

    const confirmDelete = () => {
        if (!employeeToDelete) return;
        const updated = employees.filter(e => e.id !== employeeToDelete.id);
        saveData('employees', updated);
        addToast(`تم حذف الموظف "${employeeToDelete.name}" بنجاح`, 'success');
        logActivity('Delete Employee', `Deleted employee: ${employeeToDelete.name}`);
        setEmployeeToDelete(null);
        loadData();
    };
    
    const handlePaySalaryRequest = (employee: Employee) => {
        if (accounts.length === 0) {
            addToast('يجب إضافة حساب للدفع منه أولاً من صفحة الخزينة.', 'error');
            return;
        }
        setPayingEmployee(employee);
    };

    const confirmPaySalary = (employeeId: string, accountId: string, amount: number) => {
        const employee = employees.find(e => e.id === employeeId);
        const account = accounts.find(a => a.id === accountId);
        const salaryCategory = categories.find(c => c.name === 'رواتب');

        if(!employee || !account || !salaryCategory) {
            addToast('بيانات غير مكتملة, لا يمكن إتمام العملية.', 'error');
            return;
        }
        
        const monthName = new Date().toLocaleString('ar-EG', { month: 'long' });
        const paymentDate = new Date().toISOString().split('T')[0];
        const description = amount >= (employee.salary - (salaryStatus[employee.id]?.paidAmount || 0))
            ? `راتب شهر ${monthName} - ${employee.name}`
            : `دفعة من راتب شهر ${monthName} - ${employee.name}`;

        const newExpense: Expense = {
            id: `exp_sal_${Date.now()}_${employee.id}`,
            date: paymentDate,
            description,
            amount,
            categoryId: salaryCategory.id,
            accountId: accountId,
            transactionId: '',
            employeeId: employee.id,
        };
        const newTransaction: Transaction = {
            id: `trans_sal_${Date.now()}_${employee.id}`,
            accountId: accountId,
            accountName: account.name,
            type: 'Withdrawal',
            date: paymentDate,
            description,
            amount,
            sourceId: newExpense.id,
            sourceType: 'Salary',
        };
        newExpense.transactionId = newTransaction.id;

        saveData('expenses', [...expenses, newExpense]);
        saveData('transactions', [...JSON.parse(localStorage.getItem('transactions') || '[]'), newTransaction]);

        logActivity('Pay Salary', `Paid ${formatCurrency(amount)} to ${employee.name}`);
        addToast('تم تسجيل دفعة الراتب بنجاح!', 'success');
        setPayingEmployee(null);
        loadData();
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

    return (
        <div className="container mx-auto">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">الموظفين</h2>
                {currentUser?.role === 'Admin' && (
                    <div className="flex items-center gap-4">
                        <button onClick={() => handleOpenModal(null)} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-sm">
                            إضافة موظف
                        </button>
                    </div>
                )}
            </div>
            {employees.length > 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right min-w-[700px]">
                        <thead>
                            <tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الاسم</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المنصب</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الراتب</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">حالة الراتب (الشهر الحالي)</th>
                                {currentUser?.role === 'Admin' && <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">إجراءات</th>}
                            </tr>
                        </thead>
                        <tbody ref={tableBodyRef}>
                            {employees.map(emp => {
                                const statusInfo = salaryStatus[emp.id] || { paidAmount: 0, status: 'Not Paid' };
                                return (
                                <tr key={emp.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                                    <td className="p-4 font-medium text-slate-800 dark:text-slate-100">{emp.name}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{emp.position}</td>
                                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(emp.salary)}</td>
                                    <td className="p-4"><span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusStyle(statusInfo.status)}`}>{statusText[statusInfo.status]}</span></td>
                                    {currentUser?.role === 'Admin' && (
                                        <td className="p-4 whitespace-nowrap space-x-4">
                                            <button onClick={() => handlePaySalaryRequest(emp)} className="text-primary-600 hover:underline font-semibold disabled:opacity-50 disabled:cursor-not-allowed" disabled={statusInfo.status === 'Paid'}>دفع راتب</button>
                                            <button onClick={() => handleOpenModal(emp)} className="text-blue-600 hover:underline font-semibold">تعديل</button>
                                            <button onClick={() => handleDeleteRequest(emp)} className="text-rose-600 hover:underline font-semibold">حذف</button>
                                        </td>
                                    )}
                                </tr>
                            )})}
                        </tbody>
                    </table>
                    </div>
                </div>
                ) : (
                <EmptyState Icon={UsersIcon} title="لا يوجد موظفين" message="ابدأ بإضافة بيانات الموظفين لتتمكن من إدارة شؤونهم ورواتبهم." actionButton={currentUser?.role === 'Admin' ? { text: 'إضافة موظف', onClick: () => handleOpenModal(null) } : undefined} />
            )}

            {isModalOpen && (
                <EmployeePanel
                    employee={editingEmployee}
                    projects={projects}
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
    onClose: () => void;
    onSave: (data: Omit<Employee, 'id'>) => void;
}

const EmployeePanel: React.FC<PanelProps> = ({ employee, projects, onClose, onSave }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: employee?.name || '',
        position: employee?.position || '',
        salary: employee?.salary || '' as number | '',
        projectId: employee?.projectId || '',
    });

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
                        <input type="number" name="salary" placeholder="الراتب الشهري" value={formData.salary || ''} onChange={handleChange} className={inputStyle} step="0.01" min="0.01" required />
                        <select name="projectId" value={formData.projectId} onChange={handleChange} className={`${inputStyle} bg-white dark:bg-slate-700`}>
                            <option value="">اختر المشروع (اختياري)</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4"><button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold">إلغاء</button><button type="submit" className="bg-primary-600 text-white px-8 py-2 rounded-lg hover:bg-primary-700 font-semibold shadow-sm">حفظ</button></div>
                </form>
            </div>
        </div>
    );
};

export default Employees;