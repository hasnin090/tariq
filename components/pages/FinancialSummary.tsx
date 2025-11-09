import React, { useMemo } from 'react';
import { UnitSaleRecord, Payment, Expense } from '../../types';
import { formatCurrency } from '../../utils/currencyFormatter';
import { TrendingUpIcon, ScaleIcon, BanknotesIcon } from '../shared/Icons';

const SummaryCard: React.FC<{ title: string; value: string; icon: React.ReactElement; }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
            {icon}
            <div>
                <p className="text-slate-600 dark:text-slate-300">{title}</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
            </div>
        </div>
    </div>
);

const FinancialSummary: React.FC = () => {
    const summary = useMemo(() => {
        const sales: UnitSaleRecord[] = JSON.parse(localStorage.getItem('unitSales') || '[]');
        const payments: Payment[] = JSON.parse(localStorage.getItem('payments') || '[]');
        const expenses: Expense[] = JSON.parse(localStorage.getItem('expenses') || '[]');

        const totalRevenue = sales.reduce((acc, sale) => acc + sale.finalSalePrice, 0);
        const totalPaymentsReceived = payments.reduce((acc, p) => acc + p.amount, 0);
        const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
        const netProfit = totalRevenue - totalExpenses;

        return {
            totalRevenue: formatCurrency(totalRevenue),
            totalPaymentsReceived: formatCurrency(totalPaymentsReceived),
            totalExpenses: formatCurrency(totalExpenses),
            netProfit: formatCurrency(netProfit),
        };
    }, []);

    return (
        <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">الملخص المالي الشامل</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                 <SummaryCard title="إجمالي الإيرادات (المبيعات)" value={summary.totalRevenue} icon={<TrendingUpIcon className="h-10 w-10 text-primary-500" />} />
                 <SummaryCard title="إجمالي المصروفات" value={summary.totalExpenses} icon={<ScaleIcon className="h-10 w-10 text-rose-500" />} />
                 <SummaryCard title="صافي الربح" value={summary.netProfit} icon={<BanknotesIcon className="h-10 w-10 text-emerald-500" />} />
                 <SummaryCard title="إجمالي المقبوضات" value={summary.totalPaymentsReceived} icon={<TrendingUpIcon className="h-10 w-10 text-blue-500" />} />
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-lg">تحليل سريع</h3>
                <p className="text-slate-500">هذه المنطقة مخصصة لعرض مخططات ورسوم بيانية تلخص الوضع المالي العام.</p>
                {/* Chart placeholder */}
                <div className="mt-4 h-80 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                    <p className="text-slate-500">Chart will be displayed here.</p>
                </div>
            </div>
        </div>
    );
};

export default FinancialSummary;
