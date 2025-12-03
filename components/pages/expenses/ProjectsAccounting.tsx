import React, { useState, useEffect, useMemo } from 'react';
import { Project, Expense, ExpenseCategory, Booking, Payment, UnitSaleRecord, Unit, Customer } from '../../../types';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { BriefcaseIcon, ArrowLeftIcon } from '../../shared/Icons';
import { bookingsService, paymentsService, unitsService, customersService, expensesService } from '../../../src/services/supabaseService';

type ViewMode = 'projects' | 'project-details' | 'revenues' | 'expenses';

const ProjectsAccounting: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [unitSales, setUnitSales] = useState<UnitSaleRecord[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('projects');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Load local data
            const loadedProjects: Project[] = JSON.parse(localStorage.getItem('projects') || '[]');
            setProjects(loadedProjects);
            setCategories(JSON.parse(localStorage.getItem('expenseCategories') || '[]'));
            setUnitSales(JSON.parse(localStorage.getItem('unitSales') || '[]'));
            
            // Load Supabase data
            const [bookingsData, paymentsData, unitsData, customersData, expensesData] = await Promise.all([
                bookingsService.getAll(),
                paymentsService.getAll(),
                unitsService.getAll(),
                customersService.getAll(),
                expensesService.getAll()
            ]);
            
            setBookings(bookingsData);
            setPayments(paymentsData);
            setUnits(unitsData);
            setCustomers(customersData);
            setExpenses(expensesData);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const categoryMap = useMemo(() => {
        const map = new Map<string, string>();
        categories.forEach(c => map.set(c.id, c.name));
        return map;
    }, [categories]);

    const projectFinancials = useMemo(() => {
        const financials: { [projectId: string]: { 
            totalRevenue: number; 
            totalExpense: number; 
            revenueCount: number;
            expenseCount: number;
        } } = {};
        
        projects.forEach(p => {
            financials[p.id] = { 
                totalRevenue: 0, 
                totalExpense: 0,
                revenueCount: 0,
                expenseCount: 0
            };
        });
        
        // Calculate expenses
        expenses.forEach(e => {
            if (e.projectId && financials[e.projectId]) {
                financials[e.projectId].totalExpense += e.amount;
                financials[e.projectId].expenseCount++;
            }
        });
        
        // Calculate revenues from bookings (initial payments)
        bookings.forEach(b => {
            if (b.projectId && financials[b.projectId]) {
                financials[b.projectId].totalRevenue += b.amountPaid || 0;
                if (b.amountPaid > 0) financials[b.projectId].revenueCount++;
            }
        });
        
        // Calculate revenues from additional payments
        payments.forEach(p => {
            const booking = bookings.find(b => b.id === p.bookingId);
            if (booking?.projectId && financials[booking.projectId]) {
                financials[booking.projectId].totalRevenue += p.amount;
                financials[booking.projectId].revenueCount++;
            }
        });
        
        // Calculate revenues from unit sales
        unitSales.forEach(sale => {
            if (sale.projectId && financials[sale.projectId]) {
                financials[sale.projectId].totalRevenue += sale.salePrice;
                financials[sale.projectId].revenueCount++;
            }
        });
        
        return financials;
    }, [projects, expenses, bookings, payments, unitSales]);
    
    const selectedProject = useMemo(() => {
        return projects.find(p => p.id === selectedProjectId);
    }, [projects, selectedProjectId]);

    const selectedProjectRevenues = useMemo(() => {
        if (!selectedProjectId) return [];
        
        const revenues: Array<{
            id: string;
            date: string;
            type: 'booking' | 'payment' | 'sale';
            description: string;
            customerName: string;
            unitName: string;
            amount: number;
        }> = [];
        
        // Add booking revenues
        bookings
            .filter(b => b.projectId === selectedProjectId && b.amountPaid > 0)
            .forEach(b => {
                revenues.push({
                    id: b.id,
                    date: b.bookingDate,
                    type: 'booking',
                    description: 'دفعة حجز وحدة',
                    customerName: b.customerName || '-',
                    unitName: b.unitName || '-',
                    amount: b.amountPaid
                });
            });
        
        // Add additional payments
        payments.forEach(p => {
            const booking = bookings.find(b => b.id === p.bookingId);
            if (booking?.projectId === selectedProjectId) {
                revenues.push({
                    id: p.id,
                    date: p.paymentDate,
                    type: 'payment',
                    description: 'دفعة إضافية',
                    customerName: booking.customerName || '-',
                    unitName: booking.unitName || '-',
                    amount: p.amount
                });
            }
        });
        
        // Add unit sales
        unitSales
            .filter(s => s.projectId === selectedProjectId)
            .forEach(s => {
                const unit = units.find(u => u.id === s.unitId);
                const customer = customers.find(c => c.id === s.customerId);
                revenues.push({
                    id: s.id,
                    date: s.saleDate,
                    type: 'sale',
                    description: 'بيع وحدة سكنية',
                    customerName: customer?.name || '-',
                    unitName: unit?.name || '-',
                    amount: s.salePrice
                });
            });
        
        return revenues.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedProjectId, bookings, payments, unitSales, units, customers]);

    const selectedProjectExpenses = useMemo(() => {
        if (!selectedProjectId) return [];
        return expenses
            .filter(e => e.projectId === selectedProjectId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, selectedProjectId]);

    const handleProjectClick = (projectId: string) => {
        setSelectedProjectId(projectId);
        setViewMode('project-details');
    };

    const handleBackToProjects = () => {
        setViewMode('projects');
        setSelectedProjectId(null);
    };

    const handleShowRevenues = () => {
        setViewMode('revenues');
    };

    const handleShowExpenses = () => {
        setViewMode('expenses');
    };

    const handleBackToDetails = () => {
        setViewMode('project-details');
    };

    return (
        <div className="container mx-auto">
            {/* Header with back button */}
            <div className="flex items-center gap-4 mb-6">
                {viewMode !== 'projects' && (
                    <button
                        onClick={viewMode === 'project-details' ? handleBackToProjects : handleBackToDetails}
                        className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title="رجوع"
                    >
                        <ArrowLeftIcon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                    </button>
                )}
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">محاسبة المشاريع</h2>
            </div>
            
            {/* Projects List View */}
            {viewMode === 'projects' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(project => {
                        const financials = projectFinancials[project.id] || { 
                            totalRevenue: 0, 
                            totalExpense: 0,
                            revenueCount: 0,
                            expenseCount: 0
                        };
                        
                        return (
                            <button 
                                key={project.id} 
                                onClick={() => handleProjectClick(project.id)}
                                className="w-full text-right p-6 rounded-xl border-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all duration-200"
                            >
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="flex-shrink-0 p-3 rounded-full bg-primary-100 dark:bg-primary-500/20">
                                        <BriefcaseIcon className="h-8 w-8 text-primary-600 dark:text-primary-300" />
                                    </div>
                                    <div className="flex-grow">
                                        <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-2">{project.name}</h3>
                                        {project.description && (
                                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{project.description}</p>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                    {projects.length === 0 && (
                        <div className="col-span-full text-center p-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                             <BriefcaseIcon className="mx-auto h-16 w-16 text-slate-400 mb-4" />
                             <h4 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">لا توجد مشاريع</h4>
                             <p className="text-sm text-slate-500 dark:text-slate-400">أضف المشاريع أولاً من صفحة إدارة المشاريع.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Project Details View */}
            {viewMode === 'project-details' && selectedProject && (
                <div className="space-y-6">
                    {/* Project Info Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{selectedProject.name}</h3>
                        {selectedProject.description && (
                            <p className="text-slate-600 dark:text-slate-400">{selectedProject.description}</p>
                        )}
                    </div>

                    {/* Financial Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Revenues Card */}
                        <button
                            onClick={handleShowRevenues}
                            className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl shadow-md border-2 border-emerald-200 dark:border-emerald-700 p-6 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-200 text-right"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-emerald-200 dark:bg-emerald-700 rounded-full">
                                    <svg className="h-8 w-8 text-emerald-700 dark:text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </div>
                                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">اضغط للتفاصيل</span>
                            </div>
                            <p className="text-lg font-semibold text-emerald-800 dark:text-emerald-200 mb-2">إجمالي الإيرادات</p>
                            <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100 mb-1">
                                {formatCurrency(projectFinancials[selectedProjectId]?.totalRevenue || 0)}
                            </p>
                            <p className="text-sm text-emerald-700 dark:text-emerald-300">
                                {projectFinancials[selectedProjectId]?.revenueCount || 0} عملية
                            </p>
                        </button>

                        {/* Expenses Card */}
                        <button
                            onClick={handleShowExpenses}
                            className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-800/20 rounded-xl shadow-md border-2 border-rose-200 dark:border-rose-700 p-6 hover:border-rose-300 dark:hover:border-rose-600 transition-all duration-200 text-right"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-rose-200 dark:bg-rose-700 rounded-full">
                                    <svg className="h-8 w-8 text-rose-700 dark:text-rose-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    </svg>
                                </div>
                                <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">اضغط للتفاصيل</span>
                            </div>
                            <p className="text-lg font-semibold text-rose-800 dark:text-rose-200 mb-2">إجمالي المصروفات</p>
                            <p className="text-3xl font-bold text-rose-900 dark:text-rose-100 mb-1">
                                {formatCurrency(projectFinancials[selectedProjectId]?.totalExpense || 0)}
                            </p>
                            <p className="text-sm text-rose-700 dark:text-rose-300">
                                {projectFinancials[selectedProjectId]?.expenseCount || 0} عملية
                            </p>
                        </button>
                    </div>

                    {/* Net Profit/Loss Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
                        <div className="text-center">
                            <p className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">صافي الربح / الخسارة</p>
                            {(() => {
                                const net = (projectFinancials[selectedProjectId]?.totalRevenue || 0) - (projectFinancials[selectedProjectId]?.totalExpense || 0);
                                return (
                                    <p className={`text-4xl font-bold ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {formatCurrency(net)}
                                    </p>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Revenues List View */}
            {viewMode === 'revenues' && selectedProject && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                            إيرادات مشروع: {selectedProject.name}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            إجمالي: {formatCurrency(projectFinancials[selectedProjectId]?.totalRevenue || 0)} 
                            {' • '}
                            {projectFinancials[selectedProjectId]?.revenueCount || 0} عملية
                        </p>
                    </div>
                    {selectedProjectRevenues.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead>
                                    <tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
                                        <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">التاريخ</th>
                                        <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">النوع</th>
                                        <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الوصف</th>
                                        <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">العميل</th>
                                        <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الوحدة</th>
                                        <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المبلغ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedProjectRevenues.map(revenue => (
                                        <tr key={revenue.id} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                            <td className="p-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">{revenue.date}</td>
                                            <td className="p-4">
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                                    revenue.type === 'booking' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                                                    revenue.type === 'payment' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200' :
                                                    'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                                                }`}>
                                                    {revenue.type === 'booking' ? 'حجز' : revenue.type === 'payment' ? 'دفعة' : 'بيع'}
                                                </span>
                                            </td>
                                            <td className="p-4 font-medium text-slate-800 dark:text-slate-100">{revenue.description}</td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300">{revenue.customerName}</td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300">{revenue.unitName}</td>
                                            <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                                {formatCurrency(revenue.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center p-12">
                            <svg className="mx-auto h-12 w-12 text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">لا توجد إيرادات</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">لم يتم تسجيل أي إيرادات لهذا المشروع بعد.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Expenses List View */}
            {viewMode === 'expenses' && selectedProject && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                            مصروفات مشروع: {selectedProject.name}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            إجمالي: {formatCurrency(projectFinancials[selectedProjectId]?.totalExpense || 0)}
                            {' • '}
                            {projectFinancials[selectedProjectId]?.expenseCount || 0} عملية
                        </p>
                    </div>
                    {selectedProjectExpenses.length > 0 ? (
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
                                    {selectedProjectExpenses.map(expense => (
                                        <tr key={expense.id} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                            <td className="p-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">{expense.date}</td>
                                            <td className="p-4 font-medium text-slate-800 dark:text-slate-100">{expense.description}</td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300">{categoryMap.get(expense.categoryId) || '-'}</td>
                                            <td className="p-4 font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                                {formatCurrency(expense.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center p-12">
                            <svg className="mx-auto h-12 w-12 text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">لا توجد مصروفات</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">لم يتم تسجيل أي مصروفات لهذا المشروع بعد.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProjectsAccounting;