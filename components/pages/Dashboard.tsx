import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { Unit, Customer, UnitSaleRecord, Payment, UnitStatus, Booking } from '../../types.ts';
import { formatCurrency } from '../../utils/currencyFormatter.ts';
import { BuildingIcon, UsersIcon, TrendingUpIcon, CreditCardIcon } from '../shared/Icons.tsx';
import { unitsService, customersService, unitStatusesService, paymentsService, bookingsService } from '../../src/services/supabaseService';
import { useProject } from '../../contexts/ProjectContext.tsx';
import { useAuth } from '../../contexts/AuthContext.tsx';
import ProjectSelector from '../shared/ProjectSelector.tsx';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactElement; color: string; delay?: number }> = ({ title, value, icon, color, delay = 0 }) => {
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
        <div ref={cardRef} style={{opacity: 0}} className="glass-card p-4 sm:p-6 hover:scale-[1.02] transition-all duration-300 flex items-center min-w-0">
            <div className={`p-3 sm:p-4 rounded-xl ${color} flex-shrink-0`}>
                {icon}
            </div>
            <div className="mr-3 sm:mr-4 flex-1 min-w-0">
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100 break-words">{value}</p>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">{title}</p>
            </div>
        </div>
    );
};

const LineChart: React.FC<{ data: { labels: string[]; datasets: { label: string; data: number[]; color: string }[] } }> = ({ data }) => {
    const chartRef = useRef<SVGSVGElement>(null);
    const hasAnimated = useRef(false);
    const chartHeight = 300;
    const chartWidth = 800;
    const padding = { top: 10, right: 20, bottom: 35, left: 50 };

    // 🎬 GSAP Line Chart Animation - runs only once
    useLayoutEffect(() => {
        if (chartRef.current && !hasAnimated.current && data.datasets.some(ds => ds.data.length > 0)) {
            hasAnimated.current = true;
            const paths = chartRef.current.querySelectorAll('.chart-line');
            const areas = chartRef.current.querySelectorAll('.chart-area');
            const dots = chartRef.current.querySelectorAll('.chart-dot');
            
            const tl = gsap.timeline();
            
            // Animate lines drawing
            paths.forEach((path) => {
                const length = (path as SVGPathElement).getTotalLength();
                tl.fromTo(path,
                    { strokeDasharray: length, strokeDashoffset: length },
                    { strokeDashoffset: 0, duration: 1.2, ease: "power2.out" },
                    0.2
                );
            });
            
            // Animate areas fading in
            tl.fromTo(areas,
                { opacity: 0 },
                { opacity: 1, duration: 0.8, ease: "power2.out" },
                0.6
            );
            
            // Animate dots appearing
            tl.fromTo(dots,
                { scale: 0, opacity: 0, transformOrigin: 'center center' },
                { scale: 1, opacity: 1, duration: 0.3, stagger: 0.05, ease: "back.out(2)" },
                0.8
            );
        }
    }, [data]);

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

        // Generate dots for each data point
        const dots = points.map((point, i) => {
            const x = padding.left + (i * (chartWidth - padding.left - padding.right)) / (points.length - 1 || 1);
            const y = padding.top + chartHeight - padding.top - padding.bottom - (point / maxValue) * (chartHeight - padding.top - padding.bottom);
            return <circle key={i} className="chart-dot" cx={x} cy={y} r="3" fill={color} stroke="white" strokeWidth="1.5" />;
        });

        return (
            <g>
                <defs><linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
                <path className="chart-area" d={areaPath} fill={`url(#gradient-${color})`} />
                <path className="chart-line" d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {dots}
            </g>
        );
    };

    return (
        <div className="h-full flex flex-col">
             <svg ref={chartRef} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto flex-grow">
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
                {data.datasets.map((ds, index) => (
                    <React.Fragment key={ds.label || `${ds.color}-${index}`}>
                        {toPath(ds.data, ds.color)}
                    </React.Fragment>
                ))}
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

// 🎬 NEW: Animated Bar Chart with GSAP
const BarChart: React.FC<{ data: { label: string; value: number; color: string }[], title: string }> = ({ data, title }) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const hasAnimated = useRef(false);
    const maxValue = Math.max(...data.map(d => d.value), 1);

    // 🎬 GSAP Bar Chart Animation - runs only once
    useLayoutEffect(() => {
        if (chartRef.current && !hasAnimated.current && data.length > 0) {
            hasAnimated.current = true;
            const bars = chartRef.current.querySelectorAll('.bar-item');
            const labels = chartRef.current.querySelectorAll('.bar-label');
            const values = chartRef.current.querySelectorAll('.bar-value');
            
            const tl = gsap.timeline();
            
            // Animate bars growing
            tl.fromTo(bars,
                { scaleY: 0, transformOrigin: 'bottom' },
                { scaleY: 1, duration: 0.6, stagger: 0.08, ease: "elastic.out(1, 0.5)" },
                0.1
            );
            
            // Animate labels fading in
            tl.fromTo(labels,
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.3, stagger: 0.08 },
                0.4
            );
            
            // Animate values
            tl.fromTo(values,
                { opacity: 0, scale: 0 },
                { opacity: 1, scale: 1, duration: 0.25, stagger: 0.08, ease: "back.out(2)" },
                0.6
            );
        }
    }, [data]);

    return (
        <div className="flex flex-col h-full">
            <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-4">{title}</h4>
            <div ref={chartRef} className="flex-1 flex items-end justify-around gap-4 min-h-[200px]">
                {data.map((item, index) => (
                    <div key={item.label} className="flex flex-col items-center gap-2 flex-1 max-w-[80px]">
                        <span className="bar-value text-sm font-bold text-slate-700 dark:text-slate-300">{item.value}</span>
                        <div 
                            className="bar-item w-full rounded-t-lg transition-all duration-300 hover:opacity-80 cursor-pointer relative group"
                            style={{ 
                                height: `${(item.value / maxValue) * 150}px`,
                                backgroundColor: item.color,
                                minHeight: '20px'
                            }}
                        >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {item.value}
                            </div>
                        </div>
                        <span className="bar-label text-xs text-slate-600 dark:text-slate-400 text-center truncate w-full">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};


const DonutChart: React.FC<{ data: { label: string; value: number; color: string }[], title: string, centerLabel?: string }> = ({ data, title, centerLabel = "الإجمالي" }) => {
    const chartRef = useRef<SVGSVGElement>(null);
    const centerRef = useRef<HTMLDivElement>(null);
    const hasAnimated = useRef(false);
    const size = 200;
    const strokeWidth = 25;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const total = data.reduce((sum, item) => sum + item.value, 0);

    // 🎬 GSAP Donut Chart Animation - runs only once
    useLayoutEffect(() => {
        if (chartRef.current && centerRef.current && total > 0 && !hasAnimated.current) {
            hasAnimated.current = true;
            const circles = chartRef.current.querySelectorAll('.donut-segment');
            
            const tl = gsap.timeline();
            
            // Animate each segment
            circles.forEach((circle, index) => {
                const percentage = data[index]?.value / total || 0;
                const offset = circumference * (1 - percentage);
                
                tl.fromTo(circle,
                    { strokeDashoffset: circumference },
                    { 
                        strokeDashoffset: offset, 
                        duration: 0.8, 
                        ease: "power2.out" 
                    },
                    0.2 + (index * 0.15)
                );
            });
            
            // Animate center number
            tl.fromTo(centerRef.current,
                { scale: 0, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)" },
                0.3
            );
        }
    }, [data, total, circumference]);

    let cumulativeOffset = 0;

    return (
        <div className="flex flex-col items-center">
            <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-4">{title}</h4>
             <div className="relative" style={{ width: size, height: size }}>
                 <svg ref={chartRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <circle cx={size/2} cy={size/2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-slate-200 dark:stroke-slate-700" />
                    {total > 0 && data.map((item, index) => {
                        const percentage = item.value / total;
                        const rotation = cumulativeOffset * 360;
                        cumulativeOffset += percentage;
                        return <circle key={item.label} className="donut-segment" cx={size/2} cy={size/2} r={radius} fill="none" stroke={item.color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={circumference} strokeLinecap="round" transform={`rotate(${rotation - 90} ${size/2} ${size/2})`} />;
                    })}
                </svg>
                <div ref={centerRef} className="absolute inset-0 flex flex-col items-center justify-center">
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
    const { currentUser } = useAuth();
    const { activeProject, availableProjects, setActiveProject } = useProject();
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
    }, [activeProject]);

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

            // Filter data by active project
            const filteredUnits = activeProject 
                ? unitsData.filter(u => u.projectId === activeProject.id) 
                : unitsData;
            const filteredCustomers = customersData; // Customers are not project-specific
            const filteredPayments = activeProject
                ? paymentsData.filter(p => {
                    const booking = bookingsData.find(b => b.id === p.bookingId);
                    const unit = unitsData.find(u => u.id === booking?.unitId);
                    return unit?.projectId === activeProject.id;
                })
                : paymentsData;
            const filteredBookings = activeProject
                ? bookingsData.filter(b => {
                    const unit = unitsData.find(u => u.id === b.unitId);
                    return unit?.projectId === activeProject.id;
                })
                : bookingsData;

            setUnits(filteredUnits);
            setCustomers(filteredCustomers);
            setPayments(filteredPayments);
            setBookings(filteredBookings);

            // Get unitSales from localStorage (not in Supabase yet)
            const unitSales: UnitSaleRecord[] = JSON.parse(localStorage.getItem('unitSales') || '[]');
            const filteredUnitSales = activeProject
                ? unitSales.filter(s => {
                    const unit = unitsData.find(u => u.id === s.unitId);
                    return unit?.projectId === activeProject.id;
                })
                : unitSales;

            // Calculate total revenue from payments + bookings amountPaid + unitSales
            const paymentsRevenue = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
            const bookingsRevenue = filteredBookings.reduce((sum, booking) => sum + (booking.amountPaid || 0), 0);
            const salesRevenue = filteredUnitSales.reduce((sum, sale) => sum + sale.finalSalePrice, 0);
            const totalRevenue = paymentsRevenue + bookingsRevenue + salesRevenue;
            
            const statusCounts = filteredUnits.reduce((acc, unit) => {
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
                totalUnits: filteredUnits.length,
                totalCustomers: filteredCustomers.length,
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
            labels.push(d.toLocaleString('ar-EG', { month: 'short' }));
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
            
            {/* Project Selector */}
            {!currentUser?.assignedProjectId && (
                <ProjectSelector 
                    projects={availableProjects}
                    activeProject={activeProject}
                    onSelectProject={setActiveProject}
                />
            )}
            
            <div className={`grid grid-cols-1 md:grid-cols-2 ${currentUser?.role === 'Admin' ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-6 mb-6`}>
                <StatCard title="إجمالي الوحدات" value={stats.totalUnits} icon={<BuildingIcon className="h-8 w-8 text-white"/>} color="stat-card-amber" delay={0} />
                {currentUser?.role === 'Admin' && (
                    <StatCard title="إجمالي العملاء" value={stats.totalCustomers} icon={<UsersIcon className="h-8 w-8 text-white"/>} color="stat-card-amber-600" delay={1} />
                )}
                {currentUser?.role === 'Admin' && (
                    <StatCard title="إجمالي الإيرادات" value={formatCurrency(stats.totalRevenue)} icon={<TrendingUpIcon className="h-8 w-8 text-white"/>} color="stat-card-amber" delay={2} />
                )}
                <StatCard title="الوحدات المتاحة" value={stats.unitsAvailable} icon={<CreditCardIcon className="h-8 w-8 text-white"/>} color="stat-card-amber" delay={3} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-3">اتجاه المبيعات والإيرادات</h3>
                    <div className="h-72">
                        <LineChart data={salesTrendData} />
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                     <DonutChart data={unitStatusData} title="حالة الوحدات" centerLabel="الإجمالي" />
                </div>
            </div>

            {/* New Bar Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <BarChart 
                        data={unitStatusData.length > 0 ? unitStatusData : [
                            { label: 'متاحة', value: stats.unitsAvailable, color: '#10b981' },
                            { label: 'محجوزة', value: stats.totalUnits - stats.unitsAvailable, color: '#f59e0b' },
                        ]} 
                        title="توزيع حالة الوحدات"
                    />
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <BarChart 
                        data={salesTrendData.labels.slice(-4).map((label, i) => ({
                            label: label,
                            value: salesTrendData.datasets[0].data.slice(-4)[i] || 0,
                            color: ['#14b8a6', '#3b82f6', '#f59e0b', '#ec4899'][i % 4]
                        }))} 
                        title="إيرادات آخر 4 أشهر"
                    />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
