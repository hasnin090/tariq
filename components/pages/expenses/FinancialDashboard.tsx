import React, { useState, useEffect, useMemo } from 'react';
import { UnitSaleRecord, Payment, Expense, ExpenseCategory } from '../../../types';
import { formatCurrency } from '../../../utils/currencyFormatter';
// FIX: Replaced non-existent PresentationChartLineIcon with ChartBarIcon.
import { TrendingUpIcon, ScaleIcon, BanknotesIcon, ChartBarIcon } from '../../shared/Icons';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactElement; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex items-start border border-slate-200 dark:border-slate-700">
        <div className={`p-3 rounded-full ${color}`}>
            {/* FIX: Corrected React.cloneElement call by providing a generic type argument `<{ className: string }>` to resolve a TypeScript error where the `className` prop was not recognized on the cloned icon element. */}
            {React.cloneElement<{ className: string }>(icon, { className: "h-7 w-7 text-white"})}
        </div>
        <div className="mr-4">
            <p className="text-slate-600 dark:text-slate-300 font-semibold">{title}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        </div>
    </div>
);

const LineChart: React.FC<{ data: { labels: string[]; datasets: { label: string; data: number[]; color: string }[] } }> = ({ data }) => {
    const chartHeight = 300;
    const chartWidth = 800;
    const padding = { top: 20, right: 20, bottom: 40, left: 70 };

    const maxValue = useMemo(() => {
        const allData = data.datasets.flatMap(ds => ds.data);
        const max = Math.max(...allData);
        return max > 0 ? Math.ceil(max / 1000) * 1000 : 1000;
    }, [data]);
    
    const yAxisLabels = useMemo(() => {
        const labels = [];
        for (let i = 0; i <= 5; i++) {
            labels.push((maxValue / 5) * i);
        }
        return labels;
    }, [maxValue]);

    const toPath = (points: number[], color: string) => {
        const path = points.map((point, i) => {
            const x = padding.left + (i * (chartWidth - padding.left - padding.right)) / (points.length - 1);
            const y = padding.top + chartHeight - padding.top - padding.bottom - (point / maxValue) * (chartHeight - padding.top - padding.bottom);
            return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
        }).join(' ');

        const firstPointY = padding.top + chartHeight - padding.top - padding.bottom - (points[0] / maxValue) * (chartHeight - padding.top - padding.bottom);
        const lastPointY = padding.top + chartHeight - padding.top - padding.bottom - (points[points.length - 1] / maxValue) * (chartHeight - padding.top - padding.bottom);
        const areaPath = `${path} L ${chartWidth - padding.right},${chartHeight-padding.bottom} L ${padding.left},${chartHeight-padding.bottom} Z`;

        return (
            <g>
                <defs><linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
                <path d={areaPath} fill={`url(#gradient-${color})`} />
                <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                 {points.map((point, i) => {
                    const x = padding.left + (i * (chartWidth - padding.left - padding.right)) / (points.length - 1);
                    const y = padding.top + chartHeight - padding.top - padding.bottom - (point / maxValue) * (chartHeight - padding.top - padding.bottom);
                    return <circle key={i} cx={x} cy={y} r="5" fill={color} stroke="white" strokeWidth="2" className="opacity-0 hover:opacity-100 transition-opacity" />;
                })}
            </g>
        );
    };

    return (
        <div>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
                <g className="text-slate-500 dark:text-slate-400 text-xs">
                    {yAxisLabels.map((label, i) => (
                        <g key={i}>
                            <line x1={padding.left} y1={chartHeight - padding.bottom - (i * (chartHeight-padding.top-padding.bottom) / 5)} x2={chartWidth-padding.right} y2={chartHeight - padding.bottom - (i * (chartHeight-padding.top-padding.bottom) / 5)} stroke="currentColor" className="stroke-slate-200 dark:stroke-slate-700" strokeDasharray="2,3"/>
                            <text x={padding.left - 10} y={chartHeight - padding.bottom - (i * (chartHeight-padding.top-padding.bottom) / 5) + 3} textAnchor="end" className="fill-current">{label/1000}k</text>
                        </g>
                    ))}
                     {data.labels.map((label, i) => (
                        <text key={i} x={padding.left + (i * (chartWidth-padding.left-padding.right)) / (data.labels.length - 1)} y={chartHeight-padding.bottom + 20} textAnchor="middle" className="fill-current">{label}</text>
                    ))}
                </g>
                {data.datasets.map(ds => toPath(ds.data, ds.color))}
            </svg>
            <div className="flex justify-center gap-6 mt-4">
                {data.datasets.map(ds => (
                    <div key={ds.label} className="flex items-center gap-2 text-sm font-semibold">
                        <span className="w-3 h-3 rounded-full" style={{backgroundColor: ds.color}}></span>
                        <span className="text-slate-700 dark:text-slate-300">{ds.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DonutChart: React.FC<{ data: { label: string; value: number; color: string }[], title: string }> = ({ data, title }) => {
    const size = 150;
    const strokeWidth = 20;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const total = data.reduce((sum, item) => sum + item.value, 0);

    let cumulativeOffset = 0;

    return (
        <div className="flex flex-col items-center">
            <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-4">{title}</h4>
            <div className="relative" style={{ width: size, height: size }}>
                 <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <circle cx={size/2} cy={size/2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-slate-200 dark:stroke-slate-700" />
                    {data.map(item => {
                        const percentage = item.value / total;
                        const offset = circumference * (1 - percentage);
                        const rotation = cumulativeOffset * 360;
                        cumulativeOffset += percentage;
                        return <circle key={item.label} cx={size/2} cy={size/2} r={radius} fill="none" stroke={item.color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(${rotation} ${size/2} ${size/2})`} />;
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Total</span>
                    <span className="font-bold text-xl text-slate-800 dark:text-slate-200">{formatCurrency(total)}</span>
                </div>
            </div>
            <ul className="mt-4 w-full space-y-2">
                {data.map(item => (
                    <li key={item.label} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}></span>
                            <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {((item.value/total)*100).toFixed(1)}%
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

const FinancialDashboard: React.FC = () => {
    const [sales, setSales] = useState<UnitSaleRecord[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                console.log('🔄 Fetching financial data...');
                const { unitSalesService, paymentsService, expensesService, expenseCategoriesService } = await import('../../../src/services/supabaseService');
                
                const [salesData, paymentsData, expensesData, categoriesData] = await Promise.all([
                    unitSalesService.getAll(),
                    paymentsService.getAll(),
                    expensesService.getAll(),
                    expenseCategoriesService.getAll()
                ]);
                
                console.log('✅ Financial data loaded:', {
                    sales: salesData.length,
                    payments: paymentsData.length,
                    expenses: expensesData.length,
                    categories: categoriesData.length
                });
                
                setSales(salesData);
                setPayments(paymentsData);
                setExpenses(expensesData);
                setExpenseCategories(categoriesData);
            } catch (error) {
                console.error('❌ Error fetching financial data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchData();
    }, []);

    const kpiData = useMemo(() => {
        const totalRevenue = sales.reduce((sum, s) => sum + s.finalSalePrice, 0) + payments.reduce((sum, p) => sum + p.amount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const netIncome = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) + '%' : '0%';
        const totalTransactions = expenses.length;
        return { totalRevenue, totalExpenses, netIncome, profitMargin, totalTransactions };
    }, [sales, payments, expenses]);

    const monthlyChartData = useMemo(() => {
        const labels: string[] = [];
        const revenueData: number[] = [];
        const expenseData: number[] = [];
        
        const today = new Date();
        for(let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            labels.push(d.toLocaleString('ar-EG', { month: 'short' }));
            revenueData.push(0);
            expenseData.push(0);
        }

        const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

        [...sales, ...payments].forEach(item => {
            const date = new Date('saleDate' in item ? item.saleDate : item.paymentDate);
            if (date >= sixMonthsAgo) {
                const monthDiff = (date.getFullYear() - sixMonthsAgo.getFullYear()) * 12 + (date.getMonth() - sixMonthsAgo.getMonth());
                if(monthDiff >= 0 && monthDiff < 6) {
                    revenueData[monthDiff] += 'finalSalePrice' in item ? item.finalSalePrice : item.amount;
                }
            }
        });

        expenses.forEach(item => {
            const date = new Date(item.date);
            if (date >= sixMonthsAgo) {
                 const monthDiff = (date.getFullYear() - sixMonthsAgo.getFullYear()) * 12 + (date.getMonth() - sixMonthsAgo.getMonth());
                if(monthDiff >= 0 && monthDiff < 6) {
                    expenseData[monthDiff] += item.amount;
                }
            }
        });

        return {
            labels,
            datasets: [
                { label: "الإيرادات", data: revenueData, color: "#14b8a6" },
                { label: "المصروفات", data: expenseData, color: "#f43f5e" },
            ]
        };
    }, [sales, payments, expenses]);
    
    const revenueSourcesData = useMemo(() => {
        const totalFromSales = sales.reduce((sum, s) => sum + s.finalSalePrice, 0);
        const totalFromPayments = payments.reduce((sum, p) => sum + p.amount, 0);
        
        // Return data with at least 1 IQD if both are zero to show chart structure
        if (totalFromSales === 0 && totalFromPayments === 0) {
            return [
                { label: "المبيعات", value: 1, color: "#14b8a6"},
                { label: "الدفعات", value: 1, color: "#5eead4"},
            ];
        }
        
        return [
            { label: "المبيعات", value: totalFromSales || 1, color: "#14b8a6"},
            { label: "الدفعات", value: totalFromPayments || 1, color: "#5eead4"},
        ];
    }, [sales, payments]);

    const expenseBreakdownData = useMemo(() => {
        if (expenses.length === 0) {
            return [{ label: "لا توجد بيانات", value: 1, color: "#64748b" }];
        }
        
        const byCategory: { [key:string]: number } = {};
        expenses.forEach(e => {
            const catId = e.categoryId || 'uncategorized';
            byCategory[catId] = (byCategory[catId] || 0) + e.amount;
        });

        const sorted = Object.entries(byCategory).sort((a,b) => b[1] - a[1]);
        const top4 = sorted.slice(0, 4);
        const other = sorted.slice(4).reduce((sum, item) => sum + item[1], 0);

        const colors = ["#f43f5e", "#f59e0b", "#8b5cf6", "#3b82f6", "#64748b"];
        const data = top4.map(([id, value], i) => ({
            label: expenseCategories.find(c => c.id === id)?.name || "غير مصنف",
            value,
            color: colors[i]
        }));
        if(other > 0) data.push({ label: "أخرى", value: other, color: colors[4] });
        
        return data.length > 0 ? data : [{ label: "لا توجد بيانات", value: 1, color: "#64748b" }];
    }, [expenses, expenseCategories]);


    if (isLoading) {
        return (
            <div className="container mx-auto flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">جاري تحميل البيانات المالية...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">ملخص الأداء المالي</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="إجمالي الإيرادات" value={formatCurrency(kpiData.totalRevenue)} icon={<TrendingUpIcon />} color="bg-primary-500" />
                <StatCard title="إجمالي المصروفات" value={formatCurrency(kpiData.totalExpenses)} icon={<ScaleIcon />} color="bg-rose-500" />
                <StatCard title="صافي الدخل" value={formatCurrency(kpiData.netIncome)} icon={<BanknotesIcon />} color="bg-emerald-500" />
                <StatCard title="عدد الحركات المالية" value={kpiData.totalTransactions} icon={<ChartBarIcon />} color="bg-blue-500" />
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
                 <h3 className="font-bold text-xl text-slate-800 dark:text-slate-200 mb-4">الإيرادات مقابل المصروفات (آخر 6 أشهر)</h3>
                 <LineChart data={monthlyChartData} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <DonutChart data={revenueSourcesData} title="مصادر الإيرادات" />
                </div>
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <DonutChart data={expenseBreakdownData} title="توزيع المصروفات" />
                </div>
            </div>
        </div>
    );
};

export default FinancialDashboard;