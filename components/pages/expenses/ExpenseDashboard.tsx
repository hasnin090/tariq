import React, { useState, useEffect, useMemo } from 'react';
import { UnitSaleRecord, Payment, Expense, Project, ExpenseCategory } from '../../../types';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { CalculatorIcon, BriefcaseIcon, ChartPieIcon } from '../../shared/Icons';
import { useAuth } from '../../../contexts/AuthContext';

const NewStatCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactElement;
  description: string;
  borderColor: string;
  progressColor: string;
  progress: number;
}> = ({ title, value, icon, description, borderColor, progressColor, progress }) => (
    <div className={`p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-800 border-t-4 ${borderColor}`}>
        <div className="flex justify-between items-start">
            <div className="flex flex-col min-w-0">
                <p className="text-slate-600 dark:text-slate-300 font-semibold text-sm sm:text-base">{title}</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white break-words">{value}</p>
            </div>
            <div className="flex-shrink-0 ml-2">
                {icon}
            </div>
        </div>
        <div className="mt-6">
            <div className="bg-slate-200 dark:bg-black/20 rounded-full h-1.5 w-full">
                <div className={`h-1.5 rounded-full ${progressColor}`} style={{ width: `${progress}%` }}></div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{description}</p>
        </div>
    </div>
);


const ProjectExpenseCard: React.FC<{ project: Project; totalExpense: number; expensesByCategory: { name: string; amount: number }[] }> = ({ project, totalExpense, expensesByCategory }) => {
    const topCategories = useMemo(() => {
        return expensesByCategory.sort((a, b) => b.amount - a.amount).slice(0, 4);
    }, [expensesByCategory]);

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
            <h4 className="font-bold text-lg text-slate-900 dark:text-slate-200">{project.name}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">إجمالي المصروفات</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mb-4">{formatCurrency(totalExpense)}</p>
            
            <div className="flex-grow space-y-3">
                <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300">أعلى الفئات إنفاقًا:</h5>
                {topCategories.length > 0 ? (
                    topCategories.map(cat => (
                        <div key={cat.name}>
                            <div className="flex justify-between mb-1 text-xs">
                                <span className="font-medium text-slate-800 dark:text-slate-200">{cat.name}</span>
                                <span className="font-medium text-slate-600 dark:text-slate-300">{formatCurrency(cat.amount)}</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                <div className="bg-primary-500 h-2 rounded-full" style={{ width: totalExpense > 0 ? `${(cat.amount / totalExpense) * 100}%` : '0%' }}></div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-slate-500 text-center py-4">لا توجد مصروفات مسجلة لهذا المشروع.</p>
                )}
            </div>
        </div>
    );
};

const ExpenseDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    // Set initial filter to 'projects' for assigned users, 'main_fund' for others
    const [filter, setFilter] = useState<'main_fund' | 'projects'>(currentUser?.assignedProjectId ? 'projects' : 'main_fund');
    const [stats, setStats] = useState({ totalRevenue: 0, totalExpenses: 0, netIncome: 0, transactionCount: 0 });
    const [projectData, setProjectData] = useState<{ project: Project; totalExpense: number; expensesByCategory: { name: string; amount: number }[] }[]>([]);

    useEffect(() => {
        const sales: UnitSaleRecord[] = JSON.parse(localStorage.getItem('unitSales') || '[]');
        const payments: Payment[] = JSON.parse(localStorage.getItem('payments') || '[]');
        let allExpenses: Expense[] = JSON.parse(localStorage.getItem('expenses') || '[]');
        const projects: Project[] = JSON.parse(localStorage.getItem('projects') || '[]');
        const categories: ExpenseCategory[] = JSON.parse(localStorage.getItem('expenseCategories') || '[]');
        
        // Filter expenses by assigned project for project users
        if (currentUser?.assignedProjectId) {
            allExpenses = allExpenses.filter(e => e.projectId === currentUser.assignedProjectId);
        }
        
        const totalRevenue = sales.reduce((sum, s) => sum + s.finalSalePrice, 0) + payments.reduce((sum, p) => sum + p.amount, 0);
        const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);
        const netIncome = totalRevenue - totalExpenses;
        const transactionCount = allExpenses.length;
        setStats({ totalRevenue, totalExpenses, netIncome, transactionCount });

        // Filter projects by assigned project for project users
        const relevantProjects = currentUser?.assignedProjectId 
            ? projects.filter(p => p.id === currentUser.assignedProjectId)
            : projects;
        
        const projectsWithExpenses = relevantProjects.map(project => {
            const projectExpenses = allExpenses.filter(e => e.projectId === project.id);
            const totalExpense = projectExpenses.reduce((sum, e) => sum + e.amount, 0);
            const byCategory: { [key: string]: number } = {};
            projectExpenses.forEach(expense => {
                byCategory[expense.categoryId] = (byCategory[expense.categoryId] || 0) + expense.amount;
            });
            const expensesByCategory = Object.entries(byCategory).map(([categoryId, amount]) => ({
                name: categories.find(c => c.id === categoryId)?.name || 'غير مصنف',
                amount,
            }));
            return { project, totalExpense, expensesByCategory };
        });
        setProjectData(projectsWithExpenses);
    }, [currentUser]);

    const RevenueIcon = () => <div className="bg-green-500/80 p-2 rounded-md"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v12" /></svg></div>;
    const ExpenseIcon = () => <div className="bg-rose-500/80 p-2 rounded-md"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg></div>;
    const ProfitIcon = () => <div className="bg-blue-500/80 p-2 rounded-md"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l3 8 4-16 3 8h4" /></svg></div>;

    return (
        <div className="text-slate-900 dark:text-white">
            {!currentUser?.assignedProjectId && (
                <div className="flex justify-start mb-6">
                    <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-full self-start border border-slate-200 dark:border-slate-700">
                        <button onClick={() => setFilter('main_fund')} className={`px-5 py-2 text-sm font-bold rounded-full transition-colors ${filter === 'main_fund' ? 'bg-blue-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                            الصندوق الرئيسي
                        </button>
                        <button onClick={() => setFilter('projects')} className={`px-5 py-2 text-sm font-bold rounded-full transition-colors ${filter === 'projects' ? 'bg-blue-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                            المشاريع
                        </button>
                    </div>
                </div>
            )}

            <div className={`grid grid-cols-1 md:grid-cols-2 ${currentUser?.role === 'Admin' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6 mb-6`}>
                {currentUser?.role === 'Admin' && (
                    <NewStatCard 
                        title="إجمالي الإيرادات"
                        value={formatCurrency(stats.totalRevenue)}
                        icon={<RevenueIcon />}
                        description="إجمالي إيرادات الصندوق الرئيسي"
                        borderColor="border-emerald-500"
                        progressColor="bg-emerald-500"
                        progress={stats.totalRevenue > 0 ? (stats.netIncome / stats.totalRevenue) * 100 : 0}
                    />
                )}
                <NewStatCard 
                    title="إجمالي المصروفات"
                    value={formatCurrency(stats.totalExpenses)}
                    icon={<ExpenseIcon />}
                    description={currentUser?.role === 'Admin' ? "إجمالي مصروفات الصندوق الرئيسي" : "إجمالي المصروفات التي قمت بإدخالها"}
                    borderColor="border-rose-500"
                    progressColor="bg-rose-500"
                    progress={stats.totalRevenue > 0 ? (stats.totalExpenses / stats.totalRevenue) * 100 : 0}
                />
                {currentUser?.role === 'Admin' ? (
                    <NewStatCard 
                        title="صافي الربح"
                        value={formatCurrency(stats.netIncome)}
                        icon={<ProfitIcon />}
                        description="الفرق بين إيرادات ومصروفات الصندوق الرئيسي"
                        borderColor="border-sky-500"
                        progressColor="bg-sky-500"
                        progress={50} 
                    />
                ) : (
                    <NewStatCard 
                        title="عدد الحركات المالية"
                        value={stats.transactionCount.toString()}
                        icon={<CalculatorIcon className="h-6 w-6 text-white" strokeWidth={2} />}
                        description="عدد المصروفات التي قمت بإدخالها"
                        borderColor="border-sky-500"
                        progressColor="bg-sky-500"
                        progress={50} 
                    />
                )}
            </div>
            
            {filter === 'main_fund' ? (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl min-h-[30rem] flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700">
                        <ChartPieIcon className="h-16 w-16 text-slate-400 dark:text-slate-600 mb-4" />
                        <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">توزيع مصروفات الصندوق الرئيسي</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">(Chart Placeholder)</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl min-h-[30rem] flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700">
                        <BriefcaseIcon className="h-16 w-16 text-slate-400 dark:text-slate-600 mb-4" />
                        <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">ملخص الصندوق الرئيسي</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">(Summary Placeholder)</p>
                    </div>
                </div>
            ) : (
                <>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">مصروفات المشاريع</h3>
                    {projectData.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projectData.map(data => (
                                <ProjectExpenseCard key={data.project.id} {...data} />
                            ))}
                        </div>
                    ) : (
                       <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                           <BriefcaseIcon className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
                           <h3 className="mt-2 text-lg font-medium text-slate-900 dark:text-slate-100">لا توجد مشاريع</h3>
                           <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">ابدأ بإضافة المشاريع لتتبع مصروفاتها هنا.</p>
                       </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ExpenseDashboard;