import React, { useState, useEffect, useMemo } from 'react';
import { ExpenseCategory, Expense, Project } from '../../../types';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { TagIcon, BriefcaseIcon, ArrowRightIcon } from '../../shared/Icons';

const CategoryAccounting: React.FC = () => {
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');

    useEffect(() => {
        setCategories(JSON.parse(localStorage.getItem('expenseCategories') || '[]'));
        setExpenses(JSON.parse(localStorage.getItem('expenses') || '[]'));
        setProjects(JSON.parse(localStorage.getItem('projects') || '[]'));
    }, []);

    const categoryData = useMemo(() => {
        const categoryMap = new Map<string, { name: string; totalAmount: number; transactionCount: number }>();
        categories.forEach(c => categoryMap.set(c.id, { name: c.name, totalAmount: 0, transactionCount: 0 }));
        const uncategorized = { name: 'غير مصنفة', totalAmount: 0, transactionCount: 0 };

        for (const expense of expenses) {
            if (expense.categoryId && categoryMap.has(expense.categoryId)) {
                const category = categoryMap.get(expense.categoryId)!;
                category.totalAmount += expense.amount;
                category.transactionCount++;
            } else {
                uncategorized.totalAmount += expense.amount;
                uncategorized.transactionCount++;
            }
        }
        
        const results = Array.from(categoryMap.entries())
            .map(([id, data]) => ({ categoryId: id, ...data }));
        
        if (uncategorized.transactionCount > 0) {
            results.push({ categoryId: 'uncategorized', ...uncategorized });
        }

        return results
            .filter(c => c.transactionCount > 0)
            .sort((a, b) => b.totalAmount - a.totalAmount);

    }, [categories, expenses]);
    
    const selectedCategory = useMemo(() => {
        if (!selectedCategoryId) return null;
        return categoryData.find(c => c.categoryId === selectedCategoryId);
    }, [selectedCategoryId, categoryData]);

    const filteredTransactions = useMemo(() => {
        if (!selectedCategory) return [];
        
        let txs = expenses.filter(expense => {
            if (selectedCategoryId === 'uncategorized') {
                return !expense.categoryId || !categories.some(c => c.id === expense.categoryId);
            }
            return expense.categoryId === selectedCategoryId;
        });

        if (selectedProjectId) {
            txs = txs.filter(tx => tx.projectId === selectedProjectId);
        }

        return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedCategory, selectedProjectId, expenses, categories]);
    
    const handleSelectCategory = (categoryId: string) => {
        setSelectedCategoryId(categoryId);
        setSelectedProjectId(''); // Reset project filter
    };

    const handleClearCategory = () => {
        setSelectedCategoryId(null);
    };

    if (selectedCategory) {
        return (
            <div className="container mx-auto animate-fade-in-scale-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                        دفتر الأستاذ: {selectedCategory.name}
                    </h2>
                    <button 
                        onClick={handleClearCategory}
                        className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                        <span>العودة لجميع الفئات</span>
                        <ArrowRightIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="mb-4">
                    <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 min-w-[200px]"
                    >
                        <option value="">عرض كل المشاريع</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">التاريخ</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الوصف</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المشروع</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المبلغ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map(expense => (
                                <tr key={expense.id} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                    <td className="p-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">{expense.date}</td>
                                    <td className="p-4 font-medium text-slate-800 dark:text-slate-100">{expense.description}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{projects.find(p => p.id === expense.projectId)?.name || '—'}</td>
                                    <td className="p-4 font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">{formatCurrency(expense.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredTransactions.length === 0 && (
                        <p className="text-center p-8 text-slate-500 dark:text-slate-400">لا توجد حركات تطابق الفلتر المحدد.</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">دفتر الأستاذ</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {categoryData.map(cat => (
                    <button 
                        key={cat.categoryId} 
                        onClick={() => handleSelectCategory(cat.categoryId)}
                        className="text-right p-4 rounded-xl border-2 transition-all duration-200 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-md"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 p-3 rounded-full bg-slate-100 dark:bg-slate-700">
                                <TagIcon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                            </div>
                            <div className="flex-grow">
                                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{cat.name}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي المصروفات:</p>
                                <p className="font-bold text-xl text-rose-600 dark:text-rose-400">{formatCurrency(cat.totalAmount)}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{`(${cat.transactionCount} حركة مالية)`}</p>
                            </div>
                        </div>
                    </button>
                ))}
                {categoryData.length === 0 && (
                     <div className="md:col-span-2 lg:col-span-3 xl:col-span-4 text-center p-8 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <TagIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <h4 className="mt-2 font-semibold text-slate-800 dark:text-slate-200">لا توجد حركات مالية</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">ابدأ بإضافة الحركات المالية لتظهر هنا.</p>
                   </div>
                )}
            </div>
        </div>
    );
};

export default CategoryAccounting;
