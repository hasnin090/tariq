import React, { useMemo, useState, useEffect } from 'react';
import { UnitSaleRecord, Payment, Expense, Unit, Booking } from '../../../types';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { useProject } from '../../../contexts/ProjectContext';
import ProjectSelector from '../../shared/ProjectSelector';
import { calculateProjectStats } from '../../../utils/projectFilters';
import { unitsService, paymentsService, bookingsService, expensesService } from '../../../src/services/supabaseService';
import { TrendingUpIcon, ScaleIcon, BanknotesIcon } from '../../shared/Icons';

const SummaryCard: React.FC<{ title: string; value: string; icon: React.ReactElement; }> = ({ title, value, icon }) => (
    <div className="glass-card p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex-shrink-0 transform scale-75 sm:scale-100">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 truncate">{title}</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 break-words">{value}</p>
            </div>
        </div>
    </div>
);

const FinancialSummary: React.FC = () => {
    const { activeProject, availableProjects, setActiveProject } = useProject();
    const [units, setUnits] = useState<Unit[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [unitsData, paymentsData, bookingsData, expensesData] = await Promise.all([
                unitsService.getAll(),
                paymentsService.getAll(),
                bookingsService.getAll(),
                expensesService.getAll()
            ]);
            setUnits(unitsData);
            setPayments(paymentsData);
            setBookings(bookingsData);
            setExpenses(expensesData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const summary = useMemo(() => {
        const stats = calculateProjectStats(units, bookings, payments, activeProject?.id || null);
        
        // Filter expenses by active project
        const projectExpenses = activeProject 
            ? expenses.filter(e => e.projectId === activeProject.id)
            : expenses;
        
        const totalExpenses = projectExpenses.reduce((acc, e) => acc + e.amount, 0);
        const netProfit = stats.totalRevenue - totalExpenses;

        return {
            totalRevenue: formatCurrency(stats.totalRevenue),
            totalPaymentsReceived: formatCurrency(stats.totalRevenue),
            totalExpenses: formatCurrency(totalExpenses),
            netProfit: formatCurrency(netProfit),
            expensesCount: projectExpenses.length,
            ...stats
        };
    }, [units, bookings, payments, expenses, activeProject]);

    return (
        <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">الملخص المالي الشامل</h2>
            
            <ProjectSelector 
                projects={availableProjects} 
                activeProject={activeProject} 
                onSelectProject={setActiveProject} 
            />
            
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <SummaryCard title="إجمالي الإيرادات (المبيعات)" value={summary.totalRevenue} icon={<TrendingUpIcon className="h-10 w-10 text-primary-500" />} />
                    <SummaryCard title="إجمالي المصروفات" value={summary.totalExpenses} icon={<ScaleIcon className="h-10 w-10 text-rose-500" />} />
                    <SummaryCard title="صافي الربح" value={summary.netProfit} icon={<BanknotesIcon className="h-10 w-10 text-emerald-500" />} />
                    <SummaryCard title="إجمالي المقبوضات" value={summary.totalPaymentsReceived} icon={<TrendingUpIcon className="h-10 w-10 text-blue-500" />} />
                </div>

                <div className="glass-card p-6">
                    <h3 className="font-bold text-lg">تحليل سريع</h3>
                    <p className="text-slate-500">هذه المنطقة مخصصة لعرض مخططات ورسوم بيانية تلخص الوضع المالي العام.</p>
                    {/* Chart placeholder */}
                    <div className="mt-4 h-80 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                        <p className="text-slate-500">Chart will be displayed here.</p>
                    </div>
                </div>
            </>
            )}
        </div>
    );
};

export default FinancialSummary;
