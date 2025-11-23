import React, { useState, useEffect, useMemo } from 'react';
import { Budget, ExpenseCategory, Expense } from '../../../types';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { useToast } from '../../../contexts/ToastContext';

const Budgets: React.FC = () => {
    const { addToast } = useToast();
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [newBudget, setNewBudget] = useState({ categoryId: '', amount: 0 });

    useEffect(() => {
        setBudgets(JSON.parse(localStorage.getItem('budgets') || '[]'));
        setCategories(JSON.parse(localStorage.getItem('expenseCategories') || '[]'));
        setExpenses(JSON.parse(localStorage.getItem('expenses') || '[]'));
    }, []);

    const handleAddBudget = () => {
        if (!newBudget.categoryId || newBudget.amount <= 0) {
            addToast('يرجى اختيار فئة وتحديد مبلغ صحيح.', 'error');
            return;
        }
        const category = categories.find(c => c.id === newBudget.categoryId);
        if (!category) return;

        const updatedBudgets = [...budgets.filter(b => b.categoryId !== newBudget.categoryId), {
            id: `bud_${Date.now()}`,
            categoryId: newBudget.categoryId,
            categoryName: category.name,
            amount: newBudget.amount,
        }];
        
        localStorage.setItem('budgets', JSON.stringify(updatedBudgets));
        setBudgets(updatedBudgets);
        setNewBudget({ categoryId: '', amount: 0 });
        addToast('تمت إضافة الميزانية بنجاح.', 'success');
    };

    const spentByCategory = useMemo(() => {
        const spent: { [key: string]: number } = {};
        expenses.forEach(e => {
            spent[e.categoryId] = (spent[e.categoryId] || 0) + e.amount;
        });
        return spent;
    }, [expenses]);
    
    const availableCategories = useMemo(() => {
        return categories.filter(c => !budgets.some(b => b.categoryId === c.id));
    }, [categories, budgets]);

    return (
        <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">الميزانيات</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    {budgets.map(budget => {
                        const spent = spentByCategory[budget.categoryId] || 0;
                        const percentage = (spent / budget.amount) * 100;
                        return (
                             <div key={budget.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-slate-800 dark:text-slate-100">{budget.categoryName}</span>
                                    <div><span className="font-semibold">{formatCurrency(spent)}</span> / {formatCurrency(budget.amount)}</div>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                                    <div className={`h-4 rounded-full ${percentage > 90 ? 'bg-rose-500' : 'bg-primary-600'}`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                                </div>
                             </div>
                        );
                    })}
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 self-start">
                    <h3 className="font-bold text-lg mb-4">إضافة/تعديل ميزانية</h3>
                    <div className="space-y-4">
                        <select value={newBudget.categoryId} onChange={e => setNewBudget({ ...newBudget, categoryId: e.target.value })} className="w-full p-2.5 border rounded-lg bg-white dark:bg-slate-700">
                            <option value="">اختر فئة</option>
                            {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input type="number" placeholder="مبلغ الميزانية" value={newBudget.amount || ''} onChange={e => setNewBudget({ ...newBudget, amount: Number(e.target.value) })} className="w-full p-2.5 border rounded-lg dark:bg-slate-700" min="1" step="0.01" />
                        <button onClick={handleAddBudget} className="w-full bg-primary-600 text-white p-2.5 rounded-lg font-semibold hover:bg-primary-700">
                            حفظ الميزانية
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Budgets;
