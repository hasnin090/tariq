import React, { useState, useEffect } from 'react';
import { Employee, Expense, ExpenseCategory, Account, Transaction } from '../../types';
import logActivity from '../../utils/activityLogger';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils/currencyFormatter';
import { CloseIcon, UsersIcon } from '../../shared/Icons';
import ConfirmModal from '../../shared/ConfirmModal';
import EmptyState from '../../shared/EmptyState';


const PaySalariesModal: React.FC<{
    accounts: Account[];
    employees: Employee[];
    onClose: () => void;
    onConfirm: (accountId: string) => void;
}> = ({ accounts, employees, onClose, onConfirm }) => {
    const [accountId, setAccountId] = useState<string>(accounts.length > 0 ? accounts[0].id : '');
    const { addToast } = useToast();

    const handleConfirm = () => {
        if (!accountId) {
            addToast('يرجى اختيار حساب للدفع منه.', 'error');
            return;
        }
        onConfirm(accountId);
    };
    
    const totalSalaries = employees.reduce((sum, emp) => sum + emp.salary, 0);

    return (
        <ConfirmModal
            isOpen={true}
            onClose={onClose}
            onConfirm={handleConfirm}
            title="تأكيد دفع الرواتب"
            message={
                <div>
                    <p>سيتم إنشاء حركة مالية براتب كل موظف مسجل ({employees.length}) بإجمالي مبلغ {formatCurrency(totalSalaries)}. هل تريد المتابعة؟</p>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الدفع من حساب</label>
                        <select
                            value={accountId}
                            onChange={e => setAccountId(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="" disabled>اختر حساب</option>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                    </div>
                </div>
            }
            variant="primary"
            confirmText="نعم، قم بالدفع"
        />
    );
};


const Employees: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
    const [isPaySalariesModalOpen, setIsPaySalariesModalOpen] = useState(false);

    useEffect(() => {
        setEmployees(JSON.parse(localStorage.getItem('employees') || '[]'));
        setAccounts(JSON.parse(localStorage.getItem('accounts') || '[]'));
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
            setEmployees(updated);
            saveData('employees', updated);
            addToast('تم تحديث بيانات الموظف بنجاح', 'success');
            logActivity('Update Employee', `Updated employee: ${employeeData.name}`);
        } else {
            const newEmployee = { id: `emp_${Date.now()}`, ...employeeData };
            const updated = [...employees, newEmployee];
            setEmployees(updated);
            saveData('employees', updated);
            addToast('تمت إضافة موظف جديد بنجاح', 'success');
            logActivity('Add Employee', `Added employee: ${newEmployee.name}`);
        }
        handleCloseModal();
    };

    const handleDeleteRequest = (employee: Employee) => {
        setEmployeeToDelete(employee);
    };

    const confirmDelete = () => {
        if (!employeeToDelete) return;
        const updated = employees.filter(e => e.id !== employeeToDelete.id);
        setEmployees(updated);
        saveData('employees', updated);
        addToast(`تم حذف الموظف "${employeeToDelete.name}" بنجاح`, 'success');
        logActivity('Delete Employee', `Deleted employee: ${employeeToDelete.name}`);
        setEmployeeToDelete(null);
    };

    const handlePaySalariesRequest = () => {
        if (employees.length === 0) return;
        if (accounts.length === 0) {
            addToast('يجب إضافة حساب للدفع منه أولاً من صفحة الخزينة.', 'error');
            return;
        }
        setIsPaySalariesModalOpen(true);
    };

    const confirmPaySalaries = (accountId: string) => {
        const account = accounts.find(a => a.id === accountId);
        if(!account) return;

        const expenses: Expense[] = JSON.parse(localStorage.getItem('expenses') || '[]'));
        const transactions: Transaction[] = JSON.parse(localStorage.getItem('transactions') || '[]'));
        const categories: ExpenseCategory[] = JSON.parse(localStorage.getItem('expenseCategories') || '[]'));
        const salaryCategory = categories.find(c => c.name === 'رواتب');

        if (!salaryCategory) {
            addToast('فئة "رواتب" غير موجودة في فئات المصروفات. يرجى إضافتها أولاً.', 'error');
            setIsPaySalariesModalOpen(false);
            return;
        }
        
        const monthName = new Date().toLocaleString('ar-EG', { month: 'long' });
        const paymentDate = new Date().toISOString().split('T')[0];

        const newSalaryExpenses: Expense[] = [];
        const newTransactions: Transaction[] = [];

        employees.forEach(emp => {
            const newExpense: Expense = {
                id: `exp_sal_${Date.now()}_${emp.id}`,
                date: paymentDate,
                description: `راتب شهر ${monthName} - ${emp.name}`,
                amount: emp.salary,
                categoryId: salaryCategory.id,
                accountId: accountId,
                transactionId: '',
            };
            const newTransaction: Transaction = {
                id: `trans_sal_${Date.now()}_${emp.id}`,
                accountId: accountId,
                accountName: account.name,
                type: 'Withdrawal',
                date: paymentDate,
                description: `راتب شهر ${monthName} - ${emp.name}`,
                amount: emp.salary,
                sourceId: newExpense.id,
                sourceType: 'Salary',
            };
            newExpense.transactionId = newTransaction.id;
            newSalaryExpenses.push(newExpense);
            newTransactions.push(newTransaction);
        });

        saveData('expenses', [...expenses, ...newSalaryExpenses]);
        saveData('transactions', [...transactions, ...newTransactions]);

        logActivity('Pay Salaries', `Created ${newSalaryExpenses.length} salary expenses.`);
        addToast('تم تسجيل حركات الرواتب بنجاح!', 'success');
        setIsPaySalariesModalOpen(false);
    };

    return (
        <div className="container mx-auto">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">شؤون الموظفين</h2>
                {currentUser?.role === 'Admin' && (
                    <div className="flex items-center gap-4">
                        <button onClick={handlePaySalariesRequest} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled={employees.length === 0}>
                            دفع الرواتب
                        </button>
                        <button onClick={() => handleOpenModal(null)} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-sm">
                            إضافة موظف
                        </button>
                    </div>
                )}
            </div>
            {employees.length > 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الاسم</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المنصب</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الراتب</th>
                                {currentUser?.role === 'Admin' && <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">إجراءات</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => (
                                <tr key={emp.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                                    <td className="p-4 font-medium text-slate-800 dark:text-slate-100">{emp.name}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{emp.position}</td>
                                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(emp.salary)}</td>
                                    {currentUser?.role === 'Admin' && (
                                        <td className="p-4 whitespace-nowrap">
                                            <button onClick={() => handleOpenModal(emp)} className="text-primary-600 hover:underline font-semibold">تعديل</button>
                                            <button onClick={() => handleDeleteRequest(emp)} className="text-rose-600 hover:underline mr-4 font-semibold">حذف</button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                ) : (
                <EmptyState Icon={UsersIcon} title="لا يوجد موظفين" message="ابدأ بإضافة بيانات الموظفين لتتمكن من إدارة شؤونهم ورواتبهم." actionButton={{ text: 'إضافة موظف', onClick: () => handleOpenModal(null) }} />
            )}

            {isModalOpen && (
                <EmployeePanel
                    employee={editingEmployee}
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

            {isPaySalariesModalOpen && (
                <PaySalariesModal 
                    accounts={accounts}
                    employees={employees}
                    onClose={() => setIsPaySalariesModalOpen(false)}
                    onConfirm={confirmPaySalaries}
                />
            )}
        </div>
    );
};

interface PanelProps {
    employee: Employee | null;
    onClose: () => void;
    onSave: (data: Omit<Employee, 'id'>) => void;
}

const EmployeePanel: React.FC<PanelProps> = ({ employee, onClose, onSave }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: employee?.name || '',
        position: employee?.position || '',
        salary: employee?.salary || 0,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'salary' ? Number(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.position || formData.salary <= 0) {
            addToast('يرجى ملء جميع الحقول بشكل صحيح.', 'error');
            return;
        }
        onSave(formData);
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
                        <input type="number" name="salary" placeholder="الراتب الشهري" value={formData.salary} onChange={handleChange} className={inputStyle} step="0.01" min="0.01" required />
                    </div>
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4"><button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold">إلغاء</button><button type="submit" className="bg-primary-600 text-white px-8 py-2 rounded-lg hover:bg-primary-700 font-semibold shadow-sm">حفظ</button></div>
                </form>
            </div>
        </div>
    );
};

export default Employees;