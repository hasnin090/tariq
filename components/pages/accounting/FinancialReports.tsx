import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../../contexts/ToastContext';
import { useProject } from '../../../contexts/ProjectContext';
import { useButtonPermission } from '../../../hooks/useButtonPermission';
import { supabase } from '../../../src/lib/supabase';
import { formatCurrency } from '../../../utils/currencyFormatter';
import {
    generatePDFReport,
    generateExcelReport,
    generateWordReport,
    printReport,
    generateQuickSummary,
    type ReportData,
    type BookingReportItem,
    type ExpenseReportItem,
    type PaymentReportItem
} from '../../../utils/reportGenerator';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

// دالة لتنظيف النصوص من الرموز الغريبة
const cleanText = (text: string | null | undefined): string => {
    if (!text) return '';
    
    let result = text;
    
    // فك تشفير URL encoded characters
    try {
        if (result.includes('%') || result.includes('x2F') || result.includes('x2f')) {
            result = result.replace(/x2[Ff]/g, '/');
            try { result = decodeURIComponent(result); } catch {}
        }
    } catch {}
    
    return result
        .replace(/[\u200B-\u200D\uFEFF\u00A0\u2028\u2029]/g, '')
        .replace(/[\u0600-\u0605\u06DD\u070F\u08E2]/g, '')
        .replace(/\(\s*\)/g, '')
        .replace(/\[\s*\]/g, '')
        .replace(/\{\s*\}/g, '')
        .replace(/^\s*[-–—]\s*$/g, '')
        .replace(/\(\s*(\d+)\s*\)$/g, ' ($1)')
        .replace(/[,،]{2,}/g, '،')
        .replace(/^[,،\s]+|[,،\s]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

// دالة لتنسيق النص للعرض
const formatDescriptionForDisplay = (text: string | null | undefined): { main: string; details: string } => {
    const cleaned = cleanText(text);
    if (!cleaned) return { main: '-', details: '' };
    
    const parts = cleaned.split('/').map(p => p.trim()).filter(p => p);
    
    if (parts.length === 0) return { main: '-', details: '' };
    if (parts.length === 1) return { main: parts[0], details: '' };
    
    return {
        main: parts[0],
        details: parts.slice(1).join(' • ')
    };
};

// Icons
const DownloadIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const PrintIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>;
const ChartIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const FinancialReports: React.FC = () => {
    const { addToast } = useToast();
    const { currentProject } = useProject();
    const canExport = useButtonPermission('financial-reports', 'export');
    
    // Filters
    const [dateFrom, setDateFrom] = useState<string>(
        new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
    );
    const [dateTo, setDateTo] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [reportType, setReportType] = useState<'full' | 'revenue' | 'expenses'>('full');
    
    // Data
    const [bookings, setBookings] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Load data
    useEffect(() => {
        if (currentProject) {
            loadReportData();
        }
    }, [currentProject, dateFrom, dateTo]);
    
    const loadReportData = async () => {
        if (!currentProject) return;
        
        setLoading(true);
        try {
            // Load bookings
            const { data: bookingsData, error: bookingsError } = await supabase
                .from('bookings')
                .select(`
                    *,
                    units:unitId(name, price),
                    customers:customerId(name)
                `)
                .eq('project_id', currentProject.id)
                .gte('bookingDate', dateFrom)
                .lte('bookingDate', dateTo)
                .order('bookingDate', { ascending: false });
            
            if (bookingsError) throw bookingsError;
            setBookings(bookingsData || []);
            
            // Load payments
            const { data: paymentsData, error: paymentsError } = await supabase
                .from('payments')
                .select('*')
                .eq('project_id', currentProject.id)
                .gte('paymentDate', dateFrom)
                .lte('paymentDate', dateTo)
                .order('paymentDate', { ascending: false });
            
            if (paymentsError) throw paymentsError;
            setPayments(paymentsData || []);
            
            // Load expenses
            const { data: expensesData, error: expensesError } = await supabase
                .from('expenses')
                .select('*')
                .eq('project_id', currentProject.id)
                .gte('expenseDate', dateFrom)
                .lte('expenseDate', dateTo)
                .order('expenseDate', { ascending: false });
            
            if (expensesError) throw expensesError;
            setExpenses(expensesData || []);
            
        } catch (error: any) {
            addToast(`خطأ في تحميل البيانات: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };
    
    // Helper functions (defined before useMemo to avoid hoisting issues)
    const calculateRevenueByMonth = (bookings: any[]) => {
        const monthlyData: { [key: string]: number } = {};
        bookings.forEach(b => {
            const month = b.bookingDate.substring(0, 7); // YYYY-MM
            const amount = b.units?.price || 0;
            monthlyData[month] = (monthlyData[month] || 0) + amount;
        });
        return Object.entries(monthlyData)
            .map(([month, amount]) => ({ month, amount }))
            .sort((a, b) => a.month.localeCompare(b.month));
    };
    
    const calculateExpensesByCategory = (expenses: any[]) => {
        const categoryData: { [key: string]: number } = {};
        expenses.forEach(e => {
            const category = e.category || 'أخرى';
            categoryData[category] = (categoryData[category] || 0) + (e.amount || 0);
        });
        return Object.entries(categoryData).map(([category, amount]) => ({ category, amount }));
    };
    
    // Calculate report data
    const reportData = useMemo<ReportData>(() => {
        // Calculate revenue from bookings
        const totalRevenue = bookings.reduce((sum, b) => {
            const unitPrice = b.units?.price || 0;
            return sum + unitPrice;
        }, 0);
        
        // Calculate total expenses
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        
        // Net profit
        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
        
        // Prepare bookings items
        const bookingsItems: BookingReportItem[] = bookings.map(b => ({
            id: b.id,
            date: b.bookingDate,
            unitName: b.units?.name || 'N/A',
            customerName: b.customers?.name || 'N/A',
            totalAmount: b.units?.price || 0,
            amountPaid: b.amountPaid || 0,
            remainingAmount: (b.units?.price || 0) - (b.amountPaid || 0),
            status: b.status || 'Active'
        }));
        
        // Prepare expenses items
        const expensesItems: ExpenseReportItem[] = expenses.map(e => ({
            id: e.id,
            date: e.expenseDate,
            category: e.category || 'Other',
            description: e.description || '',
            amount: e.amount || 0,
            status: e.status || 'Paid'
        }));
        
        // Prepare payments items
        const paymentsItems: PaymentReportItem[] = payments.map(p => ({
            id: p.id,
            date: p.paymentDate,
            bookingId: p.bookingId || '',
            amount: p.amount || 0,
            type: p.paymentType || 'installment'
        }));
        
        // Revenue by month
        const revenueByMonth = calculateRevenueByMonth(bookings);
        
        // Expenses by category
        const expensesByCategory = calculateExpensesByCategory(expenses);
        
        return {
            title: `التقرير المالي - ${currentProject?.name || ''}`,
            period: `من ${dateFrom} إلى ${dateTo}`,
            generatedAt: new Date().toISOString(),
            generatedBy: 'المستخدم الحالي',
            totalRevenue,
            totalExpenses,
            netProfit,
            profitMargin,
            bookings: bookingsItems,
            expenses: expensesItems,
            payments: paymentsItems,
            revenueByMonth,
            expensesByCategory
        };
    }, [bookings, expenses, payments, dateFrom, dateTo, currentProject]);
    
    // Export handlers
    const handleExportPDF = () => {
        if (!canExport) {
            addToast('ليس لديك صلاحية تصدير التقارير', 'error');
            return;
        }
        try {
            generatePDFReport(reportData);
            addToast('تم تصدير التقرير بصيغة PDF بنجاح', 'success');
        } catch (error: any) {
            addToast(`خطأ في تصدير PDF: ${error.message}`, 'error');
        }
    };
    
    const handleExportExcel = () => {
        if (!canExport) {
            addToast('ليس لديك صلاحية تصدير التقارير', 'error');
            return;
        }
        try {
            generateExcelReport(reportData);
            addToast('تم تصدير التقرير بصيغة Excel بنجاح', 'success');
        } catch (error: any) {
            addToast(`خطأ في تصدير Excel: ${error.message}`, 'error');
        }
    };
    
    const handleExportWord = async () => {
        if (!canExport) {
            addToast('ليس لديك صلاحية تصدير التقارير', 'error');
            return;
        }
        try {
            await generateWordReport(reportData);
            addToast('تم تصدير التقرير بصيغة Word بنجاح', 'success');
        } catch (error: any) {
            addToast(`خطأ في تصدير Word: ${error.message}`, 'error');
        }
    };
    
    const handlePrint = () => {
        const reportHtml = document.getElementById('report-content')?.innerHTML || '';
        printReport(reportHtml);
    };
    
    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-slate-400">جاري تحميل البيانات...</div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    📊 التقارير المالية
                </h1>
                
                {/* Export Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleExportPDF}
                        disabled={!canExport}
                        className="btn-secondary flex items-center gap-2"
                        title="تصدير PDF"
                    >
                        <DownloadIcon />
                        PDF
                    </button>
                    <button
                        onClick={handleExportExcel}
                        disabled={!canExport}
                        className="btn-secondary flex items-center gap-2"
                        title="تصدير Excel"
                    >
                        <DownloadIcon />
                        Excel
                    </button>
                    <button
                        onClick={handleExportWord}
                        disabled={!canExport}
                        className="btn-secondary flex items-center gap-2"
                        title="تصدير Word"
                    >
                        <DownloadIcon />
                        Word
                    </button>
                    <button
                        onClick={handlePrint}
                        className="btn-secondary flex items-center gap-2"
                        title="طباعة"
                    >
                        <PrintIcon />
                        طباعة
                    </button>
                </div>
            </div>
            
            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="input-label">من تاريخ</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="input-field"
                        />
                    </div>
                    <div>
                        <label className="input-label">إلى تاريخ</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="input-field"
                        />
                    </div>
                    <div>
                        <label className="input-label">نوع التقرير</label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value as any)}
                            className="input-field"
                        >
                            <option value="full">تقرير شامل</option>
                            <option value="revenue">الإيرادات فقط</option>
                            <option value="expenses">المصروفات فقط</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={loadReportData}
                            className="btn-primary w-full"
                        >
                            تحديث البيانات
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Report Content */}
            <div id="report-content" className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="text-sm opacity-90 mb-1">إجمالي الإيرادات</div>
                        <div className="text-3xl font-bold">{formatCurrency(reportData.totalRevenue)}</div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="text-sm opacity-90 mb-1">إجمالي المصروفات</div>
                        <div className="text-3xl font-bold">{formatCurrency(reportData.totalExpenses)}</div>
                    </div>
                    
                    <div className={`bg-gradient-to-br ${reportData.netProfit >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'} rounded-xl p-6 text-white shadow-lg`}>
                        <div className="text-sm opacity-90 mb-1">صافي الربح</div>
                        <div className="text-3xl font-bold">{formatCurrency(reportData.netProfit)}</div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="text-sm opacity-90 mb-1">هامش الربح</div>
                        <div className="text-3xl font-bold">{reportData.profitMargin.toFixed(1)}%</div>
                    </div>
                </div>
                
                {/* Charts */}
                {(reportType === 'full' || reportType === 'revenue') && reportData.revenueByMonth && reportData.revenueByMonth.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <ChartIcon />
                            الإيرادات الشهرية
                        </h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={reportData.revenueByMonth}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                                <Bar dataKey="amount" fill="#3b82f6" name="الإيرادات" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
                
                {(reportType === 'full' || reportType === 'expenses') && reportData.expensesByCategory && reportData.expensesByCategory.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <ChartIcon />
                            المصروفات حسب الفئة
                        </h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={reportData.expensesByCategory}
                                    dataKey="amount"
                                    nameKey="category"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label={(entry) => `${entry.category}: ${formatCurrency(entry.amount)}`}
                                >
                                    {reportData.expensesByCategory.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}
                
                {/* Data Tables */}
                {(reportType === 'full' || reportType === 'revenue') && reportData.bookings.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                            الحجوزات ({reportData.bookings.length})
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead>
                                    <tr className="border-b-2 border-slate-200 dark:border-slate-600">
                                        <th className="p-3 text-sm font-bold">التاريخ</th>
                                        <th className="p-3 text-sm font-bold">الوحدة</th>
                                        <th className="p-3 text-sm font-bold">العميل</th>
                                        <th className="p-3 text-sm font-bold">المبلغ</th>
                                        <th className="p-3 text-sm font-bold">المدفوع</th>
                                        <th className="p-3 text-sm font-bold">المتبقي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.bookings.slice(0, 20).map((booking) => (
                                        <tr key={booking.id} className="border-b border-slate-200 dark:border-slate-700">
                                            <td className="p-3">{booking.date}</td>
                                            <td className="p-3">{booking.unitName}</td>
                                            <td className="p-3">{booking.customerName}</td>
                                            <td className="p-3">{formatCurrency(booking.totalAmount)}</td>
                                            <td className="p-3 text-emerald-600">{formatCurrency(booking.amountPaid)}</td>
                                            <td className="p-3 text-amber-600">{formatCurrency(booking.remainingAmount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {reportData.bookings.length > 20 && (
                                <p className="text-center text-slate-500 mt-4">
                                    ... و {reportData.bookings.length - 20} حجز آخر
                                </p>
                            )}
                        </div>
                    </div>
                )}
                
                {(reportType === 'full' || reportType === 'expenses') && reportData.expenses.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                            المصروفات ({reportData.expenses.length})
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right table-fixed min-w-[700px]">
                                <thead>
                                    <tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
                                        <th className="p-3 text-sm font-bold text-slate-700 dark:text-slate-200 w-[100px]">التاريخ</th>
                                        <th className="p-3 text-sm font-bold text-slate-700 dark:text-slate-200 w-[160px]">الفئة</th>
                                        <th className="p-3 text-sm font-bold text-slate-700 dark:text-slate-200">الوصف</th>
                                        <th className="p-3 text-sm font-bold text-slate-700 dark:text-slate-200 w-[120px]">المبلغ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.expenses.slice(0, 20).map((expense) => {
                                        const descText = cleanText(expense.description) || '-';
                                        const catText = cleanText(expense.category) || '-';
                                        return (
                                        <tr key={expense.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                            <td className="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{expense.date}</td>
                                            <td className="p-3 overflow-hidden">
                                                <div className="truncate text-slate-600 dark:text-slate-300" title={catText}>{catText}</div>
                                            </td>
                                            <td className="p-3 overflow-hidden">
                                                <div className="truncate font-medium text-slate-800 dark:text-slate-100 cursor-default" title={descText}>
                                                    {descText}
                                                </div>
                                            </td>
                                            <td className="p-3 font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">{formatCurrency(expense.amount)}</td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {reportData.expenses.length > 20 && (
                                <p className="text-center text-slate-500 mt-4">
                                    ... و {reportData.expenses.length - 20} مصروف آخر
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinancialReports;
