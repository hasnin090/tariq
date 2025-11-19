import React, { useState, useEffect, useMemo } from 'react';
import { Unit, Customer, UnitSaleRecord, Payment, UnitStatus, Booking } from '../../types.ts';
import { formatCurrency } from '../../utils/currencyFormatter.ts';
import { BuildingIcon, UsersIcon, TrendingUpIcon, CreditCardIcon } from '../shared/Icons.tsx';
import { unitsService, customersService, unitStatusesService, paymentsService, bookingsService } from '../../src/services/supabaseService';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactElement; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 flex items-center border border-slate-200 dark:border-slate-700 min-w-0">
        <div className={`p-4 rounded-full ${color} flex-shrink-0`}>
            {icon}
        </div>
        <div className="mr-4 flex-1 min-w-0">
            <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 truncate">{value}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 truncate">{title}</p>
        </div>
    </div>
);

const LineChart: React.FC<{ data: { labels: string[]; datasets: { label: string; data: number[]; color: string }[] } }> = ({ data }) => {
    const chartHeight = 300;
    const chartWidth = 800;
    const padding = { top: 20, right: 20, bottom: 40, left: 80 };

    const maxValue = useMemo(() => {
        const allData = data.datasets.flatMap(ds => ds.data);
        const max = Math.max(...allData, 0);
        if (max === 0) return 1000000; // Default max value if no data
        return Math.ceil(max / 100000) * 100000;
    }, [data]);
    
    const yAxisLabels = useMemo(() => {
        const labels = [];
        for (let i = 0; i <= 5; i++) {
            labels.push((maxValue / 5) * i);
        }
        return labels;
    }, [maxValue]);

    const formatYAxisLabel = (value: number) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${value / 1000}K`;
        return value;
    }

    const toPath = (points: number[], color: string) => {
        if (points.length === 0) return <g></g>;
        const path = points.map((point, i) => {
            const x = padding.left + (i * (chartWidth - padding.left - padding.right)) / (points.length - 1 || 1);
            const y = padding.top + chartHeight - padding.top - padding.bottom - (point / maxValue) * (chartHeight - padding.top - padding.bottom);
            return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)},${y.toFixed(2)}`;
        }).join(' ');

        const areaPath = `${path} L ${(chartWidth - padding.right).toFixed(2)},${(chartHeight-padding.bottom).toFixed(2)} L ${padding.left.toFixed(2)},${(chartHeight-padding.bottom).toFixed(2)} Z`;

        return (
            <g key={color}>
                <defs><linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
                <path d={areaPath} fill={`url(#gradient-${color})`} />
                <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </g>
        );
    };

    return (
        <div className="h-full flex flex-col">
             <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto flex-grow">
                <g className="text-slate-500 dark:text-slate-400 text-xs">
                    {yAxisLabels.map((label, i) => (
                        <g key={i}>
                            <line x1={padding.left} y1={chartHeight - padding.bottom - (i * (chartHeight-padding.top-padding.bottom) / 5)} x2={chartWidth-padding.right} y2={chartHeight - padding.bottom - (i * (chartHeight-padding.top-padding.bottom) / 5)} stroke="currentColor" className="stroke-slate-200 dark:stroke-slate-700" strokeDasharray="2,3"/>
                            <text x={padding.left - 10} y={chartHeight - padding.bottom - (i * (chartHeight-padding.top-padding.bottom) / 5) + 3} textAnchor="end" className="fill-current">{formatYAxisLabel(label)}</text>
                        </g>
                    ))}
                     {data.labels.map((label, i) => (
                        <text key={i} x={padding.left + (i * (chartWidth-padding.left-padding.right)) / (data.labels.length - 1 || 1)} y={chartHeight-padding.bottom + 20} textAnchor="middle" className="fill-current">{label}</text>
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


const DonutChart: React.FC<{ data: { label: string; value: number; color: string }[], title: string, centerLabel?: string }> = ({ data, title, centerLabel = "الإجمالي" }) => {
    const size = 200;
    const strokeWidth = 25;
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
                    {total > 0 && data.map(item => {
                        const percentage = item.value / total;
                        const offset = circumference * (1 - percentage);
                        const rotation = cumulativeOffset * 360;
                        cumulativeOffset += percentage;
                        return <circle key={item.label} cx={size/2} cy={size/2} r={radius} fill="none" stroke={item.color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(${rotation - 90} ${size/2} ${size/2})`} />;
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{centerLabel}</span>
                    <span className="font-bold text-2xl text-slate-800 dark:text-slate-200">{total}</span>
                </div>
            </div>
             <ul className="mt-4 w-full space-y-2 max-w-xs mx-auto">
                {data.map(item => (
                    <li key={item.label} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}></span>
                            <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.value}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalUnits: 0,
        totalCustomers: 0,
        totalRevenue: 0,
        unitsAvailable: 0
    });
    const [unitStatusData, setUnitStatusData] = useState<{ label: string; value: number; color: string }[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [unitsData, customersData, unitStatusesData, paymentsData, bookingsData] = await Promise.all([
                unitsService.getAll(),
                customersService.getAll(),
                unitStatusesService.getAll(),
                paymentsService.getAll(),
                bookingsService.getAll(),
            ]);

            setUnits(unitsData);
            setCustomers(customersData);
            setPayments(paymentsData);
            setBookings(bookingsData);

            // Get unitSales from localStorage (not in Supabase yet)
            const unitSales: UnitSaleRecord[] = JSON.parse(localStorage.getItem('unitSales') || '[]');

            // Calculate total revenue from payments + bookings amountPaid + unitSales
            const paymentsRevenue = paymentsData.reduce((sum, payment) => sum + payment.amount, 0);
            const bookingsRevenue = bookingsData.reduce((sum, booking) => sum + (booking.amountPaid || 0), 0);
            const salesRevenue = unitSales.reduce((sum, sale) => sum + sale.finalSalePrice, 0);
            const totalRevenue = paymentsRevenue + bookingsRevenue + salesRevenue;
            
            const statusCounts = unitsData.reduce((acc, unit) => {
                acc[unit.status] = (acc[unit.status] || 0) + 1;
                return acc;
            }, {} as { [key: string]: number });

            const statusColors: { [key: string]: string } = {
                'Available': '#10b981',
                'Booked': '#f59e0b',
                'Sold': '#f43f5e',
            };

            const donutData = unitStatusesData.map(status => ({
                label: status.name,
                value: statusCounts[status.name] || 0,
                color: statusColors[status.name] || '#64748b'
            })).filter(item => item.value > 0);

            setStats({
                totalUnits: unitsData.length,
                totalCustomers: customersData.length,
                totalRevenue: totalRevenue,
                unitsAvailable: statusCounts['Available'] || 0,
            });
            
            setUnitStatusData(donutData);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const salesTrendData = useMemo(() => {
        const unitSales: UnitSaleRecord[] = JSON.parse(localStorage.getItem('unitSales') || '[]');

        const labels: string[] = [];
        const revenueData: number[] = [];
        const salesCountData: number[] = [];
        
        const today = new Date();
        for(let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            labels.push(d.toLocaleString('ar-EG', { month: 'short', year: 'numeric' }));
            revenueData.push(0);
            salesCountData.push(0);
        }

        const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

        // Add unit sales revenue
        unitSales.forEach(sale => {
            const saleDate = new Date(sale.saleDate);
            if (saleDate >= sixMonthsAgo) {
                const monthDiff = (saleDate.getFullYear() - sixMonthsAgo.getFullYear()) * 12 + (saleDate.getMonth() - sixMonthsAgo.getMonth());
                if(monthDiff >= 0 && monthDiff < 6) {
                    revenueData[monthDiff] += sale.finalSalePrice;
                    salesCountData[monthDiff] += 1;
                }
            }
        });
        
        // Add payments revenue
        payments.forEach(payment => {
             const paymentDate = new Date(payment.paymentDate);
            if (paymentDate >= sixMonthsAgo) {
                const monthDiff = (paymentDate.getFullYear() - sixMonthsAgo.getFullYear()) * 12 + (paymentDate.getMonth() - sixMonthsAgo.getMonth());
                if(monthDiff >= 0 && monthDiff < 6) {
                    revenueData[monthDiff] += payment.amount;
                }
            }
        });

        // Add bookings initial payments revenue
        bookings.forEach(booking => {
            const bookingDate = new Date(booking.bookingDate);
            if (bookingDate >= sixMonthsAgo && booking.amountPaid) {
                const monthDiff = (bookingDate.getFullYear() - sixMonthsAgo.getFullYear()) * 12 + (bookingDate.getMonth() - sixMonthsAgo.getMonth());
                if(monthDiff >= 0 && monthDiff < 6) {
                    revenueData[monthDiff] += booking.amountPaid;
                }
            }
        });

        return {
            labels,
            datasets: [
                { label: "الإيرادات", data: revenueData, color: "#14b8a6" },
                { label: "عدد المبيعات", data: salesCountData, color: "#3b82f6" },
            ]
        };

    }, [payments, bookings]);

    return (
        <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">لوحة التحكم الرئيسية</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatCard title="إجمالي الوحدات" value={stats.totalUnits} icon={<BuildingIcon className="h-8 w-8 text-white"/>} color="bg-blue-500" />
                <StatCard title="إجمالي العملاء" value={stats.totalCustomers} icon={<UsersIcon className="h-8 w-8 text-white"/>} color="bg-primary-500" />
                <StatCard title="إجمالي الإيرادات" value={formatCurrency(stats.totalRevenue)} icon={<TrendingUpIcon className="h-8 w-8 text-white"/>} color="bg-emerald-500" />
                <StatCard title="الوحدات المتاحة" value={stats.unitsAvailable} icon={<CreditCardIcon className="h-8 w-8 text-white"/>} color="bg-amber-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-4">اتجاه المبيعات والإيرادات</h3>
                    <div className="h-96">
                        <LineChart data={salesTrendData} />
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                     <DonutChart data={unitStatusData} title="حالة الوحدات" centerLabel="الإجمالي" />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
