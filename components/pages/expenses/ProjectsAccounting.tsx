import React, { useState, useEffect, useMemo } from 'react';
import { Project, Expense, ExpenseCategory } from '../../../types';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { BriefcaseIcon } from '../../shared/Icons';

const ProjectsAccounting: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    useEffect(() => {
        const loadedProjects: Project[] = JSON.parse(localStorage.getItem('projects') || '[]');
        setProjects(loadedProjects);
        setExpenses(JSON.parse(localStorage.getItem('expenses') || '[]'));
        setCategories(JSON.parse(localStorage.getItem('expenseCategories') || '[]'));
        
        // Select the first project by default if available
        if (loadedProjects.length > 0) {
            setSelectedProjectId(loadedProjects[0].id);
        }
    }, []);

    const categoryMap = useMemo(() => {
        const map = new Map<string, string>();
        categories.forEach(c => map.set(c.id, c.name));
        return map;
    }, [categories]);

    const projectFinancials = useMemo(() => {
        const financials: { [projectId: string]: { totalExpense: number; transactionCount: number } } = {};
        projects.forEach(p => {
            financials[p.id] = { totalExpense: 0, transactionCount: 0 };
        });
        expenses.forEach(e => {
            if (e.projectId && financials[e.projectId]) {
                financials[e.projectId].totalExpense += e.amount;
                financials[e.projectId].transactionCount++;
            }
        });
        return financials;
    }, [projects, expenses]);
    
    const selectedProject = useMemo(() => {
        return projects.find(p => p.id === selectedProjectId);
    }, [projects, selectedProjectId]);

    const selectedProjectTransactions = useMemo(() => {
        if (!selectedProjectId) return [];
        return expenses
            .filter(e => e.projectId === selectedProjectId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, selectedProjectId]);

    return (
        <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">محاسبة المشاريع</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Projects List/Cards */}
                <div className="lg:col-span-1 space-y-4">
                    {projects.map(project => {
                        const financials = projectFinancials[project.id] || { totalExpense: 0, transactionCount: 0 };
                        const isSelected = selectedProjectId === project.id;
                        return (
                            <button 
                                key={project.id} 
                                onClick={() => setSelectedProjectId(project.id)}
                                className={`w-full text-right p-4 rounded-xl border-2 transition-all duration-200 ${isSelected ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md'}`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`flex-shrink-0 p-3 rounded-full ${isSelected ? 'bg-primary-100 dark:bg-primary-500/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                        <BriefcaseIcon className={`h-6 w-6 ${isSelected ? 'text-primary-600 dark:text-primary-300' : 'text-slate-600 dark:text-slate-300'}`} />
                                    </div>
                                    <div className="flex-grow">
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{project.name}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي المصروفات:</p>
                                        <p className="font-bold text-xl text-rose-600 dark:text-rose-400">{formatCurrency(financials.totalExpense)}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{`(${financials.transactionCount} حركة مالية)`}</p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                    {projects.length === 0 && (
                        <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                             <BriefcaseIcon className="mx-auto h-12 w-12 text-slate-400" />
                             <h4 className="mt-2 font-semibold text-slate-800 dark:text-slate-200">لا توجد مشاريع</h4>
                             <p className="text-sm text-slate-500 dark:text-slate-400">أضف المشاريع أولاً من صفحة إدارة المشاريع.</p>
                        </div>
                    )}
                </div>

                {/* Transactions for Selected Project */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 min-h-[60vh]">
                        {selectedProject ? (
                            <>
                                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                                        الحركات المالية لمشروع: {selectedProject.name}
                                    </h3>
                                </div>
                                {selectedProjectTransactions.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-right">
                                            <thead>
                                                <tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
                                                    <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">التاريخ</th>
                                                    <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الوصف</th>
                                                    <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الفئة</th>
                                                    <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المبلغ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedProjectTransactions.map(expense => (
                                                    <tr key={expense.id} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                                        <td className="p-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">{expense.date}</td>
                                                        <td className="p-4 font-medium text-slate-800 dark:text-slate-100">{expense.description}</td>
                                                        <td className="p-4 text-slate-600 dark:text-slate-300">{categoryMap.get(expense.categoryId) || '-'}</td>
                                                        <td className="p-4 font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                                            {formatCurrency(expense.amount)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center p-12 flex flex-col items-center justify-center h-full">
                                        <BriefcaseIcon className="h-12 w-12 text-slate-400 mb-4" />
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200">لا توجد حركات مالية</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">لم يتم تسجيل أي مصروفات لهذا المشروع بعد.</p>
                                    </div>
                                )}
                            </>
                        ) : (
                             <div className="text-center p-12 flex flex-col items-center justify-center h-full">
                                <BriefcaseIcon className="h-12 w-12 text-slate-400 mb-4" />
                                <h4 className="font-semibold text-slate-800 dark:text-slate-200">اختر مشروعًا</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">اختر أحد المشاريع من القائمة لعرض حركاته المالية.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectsAccounting;