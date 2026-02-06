import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { 
    LineChart as RechartsLineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    Area,
    AreaChart,
    Legend,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { UnitSaleRecord, Payment, Expense, ExpenseCategory, Project, Booking, Transaction, Account } from '../../../types';
import { formatCurrency } from '../../../utils/currencyFormatter';
// FIX: Replaced non-existent PresentationChartLineIcon with ChartBarIcon.
import { TrendingUpIcon, ScaleIcon, BanknotesIcon, ChartBarIcon } from '../../shared/Icons';
import ProjectSelector from '../../shared/ProjectSelector';
import { useAuth } from '../../../contexts/AuthContext';

const StatCard: React.FC<{ 
    title: string; 
    value: string | number; 
    icon: React.ReactElement; 
    color: string;
    bgGradient: string;
    iconBg: string;
    delay?: number;
}> = ({ title, value, icon, color, bgGradient, iconBg, delay = 0 }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    
    useLayoutEffect(() => {
        if (cardRef.current) {
            gsap.fromTo(cardRef.current,
                { opacity: 0, y: 30, scale: 0.9 },
                { 
                    opacity: 1, y: 0, scale: 1, 
                    duration: 0.5, 
                    delay: delay * 0.1, 
                    ease: "back.out(1.7)"
                }
            );
        }
    }, [delay]);
    
    return (
        <div ref={cardRef} style={{opacity: 0}} className={`group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 ${bgGradient} p-[1px]`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 h-full">
                <div className="flex items-start justify-between mb-4">
                    <div className={`${iconBg} p-3 rounded-xl shadow-md group-hover:scale-105 transition-transform duration-200 ease-in-out`}>
                        {React.cloneElement<{ className: string }>(icon, { className: "h-6 w-6 text-white"})}
                    </div>
                </div>
                <div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium mb-1">{title}</p>
                    <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${color} break-words`}>{value}</p>
                </div>
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${bgGradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}></div>
            </div>
        </div>
    );
};

// ✨ Custom Tooltip للمخطط
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-800/95 dark:bg-slate-900/95 backdrop-blur-sm text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700/50">
                <p className="text-slate-300 text-sm font-medium mb-2 border-b border-slate-700 pb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 py-1">
                        <span 
                            className="w-3 h-3 rounded-full shadow-sm" 
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-slate-400 text-sm">{entry.name}:</span>
                        <span className="text-white font-bold text-sm">{formatCurrency(entry.value)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

// ✨ Custom Legend للمخطط
const CustomLegend = ({ payload }: any) => {
    return (
        <div className="flex justify-center items-center gap-6 mt-4">
            {payload?.map((entry: any, index: number) => (
                <div key={index} className="flex items-center gap-2 cursor-pointer group">
                    <span 
                        className="w-3 h-3 rounded-full shadow-sm group-hover:scale-110 transition-transform" 
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-slate-600 dark:text-slate-400 text-sm font-medium group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                        {entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ✨ مخطط خطي احترافي باستخدام Recharts
const ProfessionalLineChart: React.FC<{ data: { labels: string[]; datasets: { label: string; data: number[]; color: string }[] } }> = ({ data }) => {
    // تحويل البيانات لصيغة Recharts
    const chartData = useMemo(() => {
        return data.labels.map((label, index) => {
            const point: any = { name: label };
            data.datasets.forEach(dataset => {
                point[dataset.label] = dataset.data[index] || 0;
            });
            return point;
        });
    }, [data]);

    const formatYAxis = (value: number) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
        return value.toString();
    };

    return (
        <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                    data={chartData} 
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                    <defs>
                        {data.datasets.map((dataset, index) => (
                            <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={dataset.color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={dataset.color} stopOpacity={0.05} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="currentColor" 
                        className="text-slate-200 dark:text-slate-700/50"
                        vertical={false}
                    />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'currentColor', fontSize: 12 }}
                        className="text-slate-500 dark:text-slate-400"
                        dy={10}
                    />
                    <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={formatYAxis}
                        tick={{ fill: 'currentColor', fontSize: 11 }}
                        className="text-slate-500 dark:text-slate-400"
                        width={50}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend content={<CustomLegend />} />
                    {data.datasets.map((dataset, index) => (
                        <Area
                            key={dataset.label}
                            type="monotone"
                            dataKey={dataset.label}
                            stroke={dataset.color}
                            strokeWidth={2.5}
                            fill={`url(#gradient-${index})`}
                            dot={{ 
                                r: 4, 
                                fill: 'white', 
                                stroke: dataset.color, 
                                strokeWidth: 2,
                            }}
                            activeDot={{ 
                                r: 6, 
                                fill: dataset.color, 
                                stroke: 'white', 
                                strokeWidth: 2,
                                className: 'drop-shadow-lg'
                            }}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

// ✨ مخطط دائري احترافي باستخدام Recharts
const ProfessionalDonutChart: React.FC<{ data: { label: string; value: number; color: string }[], title: string }> = ({ data, title }) => {
    const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const chartData = useMemo(() => 
        data.map(item => ({
            name: item.label,
            value: item.value,
            color: item.color,
            percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
        })),
        [data, total]
    );

    const onPieEnter = (_: any, index: number) => setActiveIndex(index);
    const onPieLeave = () => setActiveIndex(null);

    return (
        <div className="flex flex-col h-full">
            <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-4 text-center">{title}</h4>
            
            <div className="flex-1 min-h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius="55%"
                            outerRadius="80%"
                            paddingAngle={2}
                            dataKey="value"
                            onMouseEnter={onPieEnter}
                            onMouseLeave={onPieLeave}
                            animationBegin={0}
                            animationDuration={800}
                        >
                            {chartData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.color}
                                    stroke={activeIndex === index ? entry.color : 'transparent'}
                                    strokeWidth={activeIndex === index ? 3 : 0}
                                    style={{
                                        filter: activeIndex === index ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none',
                                        transform: activeIndex === index ? 'scale(1.02)' : 'scale(1)',
                                        transformOrigin: 'center',
                                        transition: 'all 0.2s ease'
                                    }}
                                />
                            ))}
                        </Pie>
                        <Tooltip 
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-slate-800/95 text-white px-3 py-2 rounded-lg shadow-xl">
                                            <p className="font-medium">{data.name}</p>
                                            <p className="text-primary-400">{formatCurrency(data.value)}</p>
                                            <p className="text-slate-400 text-sm">{data.percentage}%</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                
                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                            {formatCurrency(total)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">الإجمالي</p>
                    </div>
                </div>
            </div>
            
            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 gap-2">
                {chartData.map((item, index) => (
                    <div 
                        key={index} 
                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer ${
                            activeIndex === index ? 'bg-slate-100 dark:bg-slate-700/50' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                        }`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(null)}
                    >
                        <span 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: item.color }}
                        />
                        <div className="min-w-0 flex-1">
                            <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{item.name}</p>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.percentage}%</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const FinancialDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const [sales, setSales] = useState<UnitSaleRecord[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [manualRevenues, setManualRevenues] = useState<Transaction[]>([]); // ✅ الإيرادات اليدوية من الخزينة
    const [accounts, setAccounts] = useState<Account[]>([]); // ✅ الحسابات للرصيد الافتتاحي
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const { unitSalesService, paymentsService, expensesService, expenseCategoriesService, projectsService, bookingsService, transactionsService, accountsService } = await import('../../../src/services/supabaseService');
                
                let [salesData, paymentsData, expensesData, categoriesData, projectsData, bookingsData, transactionsData, accountsData] = await Promise.all([
                    unitSalesService.getAll(),
                    paymentsService.getAll(),
                    expensesService.getAll(),
                    expenseCategoriesService.getAll(),
                    projectsService.getAll(),
                    bookingsService.getAll(),
                    transactionsService.getAll(), // ✅ جلب جميع المعاملات
                    accountsService.getAll() // ✅ جلب الحسابات للرصيد الافتتاحي
                ]);
                
                // ✅ فلترة الإيرادات اليدوية فقط (Deposit بدون مصدر Payment أو Sale)
                const manualRevenuesData = transactionsData.filter(t => 
                    t.type === 'Deposit' && 
                    (t.sourceType === 'Manual' || !t.sourceType || 
                     (t.sourceType !== 'Payment' && t.sourceType !== 'Sale'))
                );
                
                // Filter expenses by assigned project for project users
                if (currentUser?.assignedProjectId) {
                    expensesData = expensesData.filter(e => e.projectId === currentUser.assignedProjectId);
                }
                
                setSales(salesData);
                setPayments(paymentsData);
                setExpenses(expensesData);
                setExpenseCategories(categoriesData);
                setProjects(projectsData);
                setBookings(bookingsData);
                setManualRevenues(manualRevenuesData); // ✅ تخزين الإيرادات اليدوية
                setAccounts(accountsData); // ✅ تخزين الحسابات
            } catch (error) {
                console.error('Error fetching financial data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchData();
    }, [currentUser]);

    // ✅ تصفية البيانات حسب المشروع المختار
    const filteredData = useMemo(() => {
        // إذا لم يختر مشروع، نعرض كل البيانات
        if (!selectedProjectId) {
            return { sales, payments, expenses, manualRevenues, accounts };
        }
        
        // الحصول على معرفات الحجوزات الخاصة بالمشروع المختار
        const projectBookingIds = bookings
            .filter(b => b.projectId === selectedProjectId)
            .map(b => b.id);
        
        return {
            // المبيعات: تصفية حسب projectId مباشرة
            sales: sales.filter(s => s.projectId === selectedProjectId),
            // المدفوعات: تصفية حسب الحجوزات التابعة للمشروع
            payments: payments.filter(p => projectBookingIds.includes(p.bookingId)),
            // المصروفات: تصفية حسب projectId مباشرة
            expenses: expenses.filter(e => e.projectId === selectedProjectId),
            // ✅ الإيرادات اليدوية: تصفية حسب projectId
            manualRevenues: manualRevenues.filter(r => r.projectId === selectedProjectId),
            // ✅ الحسابات: تصفية حسب projectId
            accounts: accounts.filter(a => a.projectId === selectedProjectId)
        };
    }, [sales, payments, expenses, bookings, manualRevenues, accounts, selectedProjectId, currentUser?.role]);

    const kpiData = useMemo(() => {
        const { sales: filteredSales, payments: filteredPayments, expenses: filteredExpenses, manualRevenues: filteredManualRevenues } = filteredData;
        
        // ⚠️ ملاحظة: لا نستخدم initialBalance هنا لأن:
        // 1. الـ Trigger في DB يُحدث balance تلقائياً مع كل معاملة
        // 2. الإيرادات اليدوية (manualRevenues) مُحسوبة منفصلة
        // 3. إضافة كليهما يُسبب حساب مُضاعف
        
        // ✅ حساب الإيرادات: المدفوعات المحصّلة + الإيرادات اليدوية
        // ⚠️ لا نجمع salesRevenue لأن المدفوعات هي التحصيل الفعلي للمبيعات (تجنب الازدواج)
        const paymentsRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
        const manualRevenueTotal = filteredManualRevenues.reduce((sum, r) => sum + r.amount, 0);
        const totalRevenue = paymentsRevenue + manualRevenueTotal;
        
        const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
        const netIncome = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) + '%' : '0%';
        const totalTransactions = filteredExpenses.length + filteredPayments.length + filteredManualRevenues.length;
        
        return { totalRevenue, totalExpenses, netIncome, profitMargin, totalTransactions };
    }, [filteredData]);

    const monthlyChartData = useMemo(() => {
        const { sales: filteredSales, payments: filteredPayments, expenses: filteredExpenses, manualRevenues: filteredManualRevenues } = filteredData;
        
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

        // ✅ إضافة المدفوعات المحصّلة فقط (بدون المبيعات لتجنب الازدواج)
        filteredPayments.forEach(item => {
            const date = new Date(item.paymentDate);
            if (date >= sixMonthsAgo) {
                const monthDiff = (date.getFullYear() - sixMonthsAgo.getFullYear()) * 12 + (date.getMonth() - sixMonthsAgo.getMonth());
                if(monthDiff >= 0 && monthDiff < 6) {
                    revenueData[monthDiff] += item.amount;
                }
            }
        });

        // ✅ إضافة الإيرادات اليدوية من الخزينة
        filteredManualRevenues.forEach(revenue => {
            const date = new Date(revenue.date);
            if (date >= sixMonthsAgo) {
                const monthDiff = (date.getFullYear() - sixMonthsAgo.getFullYear()) * 12 + (date.getMonth() - sixMonthsAgo.getMonth());
                if(monthDiff >= 0 && monthDiff < 6) {
                    revenueData[monthDiff] += revenue.amount;
                }
            }
        });

        filteredExpenses.forEach(item => {
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
    }, [filteredData]);
    
    const revenueSourcesData = useMemo(() => {
        const { sales: filteredSales, payments: filteredPayments, manualRevenues: filteredManualRevenues } = filteredData;
        
        const totalFromSales = filteredSales.reduce((sum, s) => sum + s.finalSalePrice, 0);
        const totalFromPayments = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
        const totalFromManual = filteredManualRevenues.reduce((sum, r) => sum + r.amount, 0); // ✅ الإيرادات اليدوية (Deposits)
        
        // ⚠️ لا نستخدم initialBalance لأنه الرصيد الحالي (ليس الرصيد الافتتاحي)
        // والإيرادات اليدوية (manualRevenues) تشمل كل الـ Deposits
        
        // Return data with at least 1 IQD if all are zero to show chart structure
        if (totalFromSales === 0 && totalFromPayments === 0 && totalFromManual === 0) {
            return [
                { label: "المبيعات", value: 1, color: "#14b8a6"},
                { label: "الدفعات", value: 1, color: "#5eead4"},
                { label: "إيرادات أخرى", value: 1, color: "#8b5cf6"},
            ];
        }
        
        const data = [];
        if (totalFromSales > 0) data.push({ label: "المبيعات", value: totalFromSales, color: "#14b8a6"});
        if (totalFromPayments > 0) data.push({ label: "الدفعات", value: totalFromPayments, color: "#5eead4"});
        if (totalFromManual > 0) data.push({ label: "إيرادات أخرى", value: totalFromManual, color: "#8b5cf6"}); // ✅ الإيرادات اليدوية
        
        // If no data, show placeholders
        if (data.length === 0) {
            return [
                { label: "المبيعات", value: 1, color: "#14b8a6"},
                { label: "الدفعات", value: 1, color: "#5eead4"},
            ];
        }
        
        return data;
    }, [filteredData]);

    const expenseBreakdownData = useMemo(() => {
        const { expenses: filteredExpenses } = filteredData;
        
        if (filteredExpenses.length === 0) {
            return [{ label: "لا توجد بيانات", value: 1, color: "#64748b" }];
        }
        
        const byCategory: { [key:string]: number } = {};
        filteredExpenses.forEach(e => {
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
    }, [filteredData, expenseCategories]);


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

    // الحصول على اسم المشروع المختار
    const selectedProject = selectedProjectId
        ? projects.find(p => p.id === selectedProjectId) || null
        : null;
    const selectedProjectName = selectedProject?.name || null;

    return (
        <div className="container mx-auto">
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent mb-2">
                            ملخص الأداء المالي
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            {selectedProjectName 
                                ? `بيانات مشروع: ${selectedProjectName}` 
                                : 'نظرة شاملة على جميع المشاريع'
                            }
                        </p>
                    </div>
                    
                    {/* فلتر المشاريع - للمدير فقط */}
                    {currentUser?.role === 'Admin' && projects.length > 0 && (
                        <div className="flex items-center gap-3">
                            <ProjectSelector
                                projects={projects}
                                activeProject={selectedProject}
                                onSelectProject={(project) => setSelectedProjectId(project ? project.id : null)}
                                showAllProjectsOption
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 ${currentUser?.role === 'Admin' ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-6 mb-8`}>
                {currentUser?.role === 'Admin' && (
                    <StatCard 
                        title="إجمالي الإيرادات" 
                        value={formatCurrency(kpiData.totalRevenue)} 
                        icon={<TrendingUpIcon />} 
                        color="text-emerald-600 dark:text-emerald-400"
                        bgGradient="bg-gradient-to-br from-emerald-400 to-teal-500"
                        iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
                        delay={0}
                    />
                )}
                <StatCard 
                    title="إجمالي المصروفات" 
                    value={formatCurrency(kpiData.totalExpenses)} 
                    icon={<ScaleIcon />} 
                    color="text-rose-600 dark:text-rose-400"
                    bgGradient="bg-gradient-to-br from-rose-400 to-pink-500"
                    iconBg="bg-gradient-to-br from-rose-500 to-pink-600"
                    delay={1}
                />
                {currentUser?.role === 'Admin' && (
                    <StatCard 
                        title="صافي الدخل" 
                        value={formatCurrency(kpiData.netIncome)} 
                        icon={<BanknotesIcon />} 
                        color="text-blue-600 dark:text-blue-400"
                        bgGradient="bg-gradient-to-br from-blue-400 to-indigo-500"
                        iconBg="bg-gradient-to-br from-blue-500 to-indigo-600"
                        delay={2}
                    />
                )}
                <StatCard 
                    title="عدد الحركات المالية" 
                    value={kpiData.totalTransactions} 
                    icon={<ChartBarIcon />} 
                    color="text-purple-600 dark:text-purple-400"
                    bgGradient="bg-gradient-to-br from-purple-400 to-fuchsia-500"
                    iconBg="bg-gradient-to-br from-purple-500 to-fuchsia-600"
                    delay={3}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className={`${currentUser?.role === 'Admin' ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden`}>
                    <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">الإيرادات مقابل المصروفات</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">آخر 6 أشهر</p>
                    </div>
                    <div className="p-4 sm:p-6 relative" style={{ height: '340px' }}>
                        <ProfessionalLineChart data={monthlyChartData} />
                    </div>
                </div>
                {/* مصادر الإيرادات - تظهر فقط للمدير */}
                {currentUser?.role === 'Admin' && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <ProfessionalDonutChart data={revenueSourcesData} title="مصادر الإيرادات" />
                    </div>
                )}
            </div>

            {/* توزيع المصروفات - يظهر فقط للمدير */}
            {currentUser?.role === 'Admin' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <ProfessionalDonutChart data={expenseBreakdownData} title="توزيع المصروفات" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinancialDashboard;