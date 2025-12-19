import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useProject } from '../../../contexts/ProjectContext';
import { 
  bookingsService, 
  paymentsService, 
  expensesService,
  unitsService 
} from '../../../src/services/supabaseService';
import { Booking, Payment, Expense, Unit } from '../../../types';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { devError } from '../../../utils/devLogger';

// Widget Component
interface WidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
}

const Widget: React.FC<WidgetProps> = ({ title, value, subtitle, icon, color, trend, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all ${
        onClick ? 'cursor-pointer hover:scale-105' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend.isPositive ? 'text-green-600' : 'text-rose-600'
          }`}>
            <svg className={`w-4 h-4 ${trend.isPositive ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{value}</p>
      {subtitle && <p className="text-slate-500 dark:text-slate-400 text-xs">{subtitle}</p>}
    </div>
  );
};

// Quick Action Component
interface QuickActionProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ label, icon, onClick, color }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl ${color} text-white hover:scale-105 transition-transform shadow-md hover:shadow-lg`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
};

const EnhancedDashboard: React.FC = () => {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentProject?.id && user?.id) {
      loadDashboardData();
    }
  }, [currentProject, user]);

  const loadDashboardData = async () => {
    if (!currentProject?.id || !user?.id) return;

    setIsLoading(true);
    try {
      const [bookingsData, paymentsData, expensesData, unitsData] = await Promise.all([
        bookingsService.getByProject(currentProject.id),
        paymentsService.getByProject(currentProject.id),
        expensesService.getByProject(currentProject.id),
        unitsService.getByProject(currentProject.id)
      ]);

      setBookings(bookingsData);
      setPayments(paymentsData);
      setExpenses(expensesData);
      setUnits(unitsData);
    } catch (error) {
      devError(error, 'EnhancedDashboard: Error loading data');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const pendingPayments = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
    
    const availableUnits = units.filter(u => u.status === 'available').length;
    const soldUnits = units.filter(u => u.status === 'sold').length;
    const reservedUnits = units.filter(u => u.status === 'reserved').length;

    const profit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((profit / totalRevenue) * 100) : 0;

    // Recent trends (last 30 days vs previous 30 days)
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previous30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentBookings = bookings.filter(b => new Date(b.createdAt) >= last30Days);
    const previousBookings = bookings.filter(b => {
      const date = new Date(b.createdAt);
      return date >= previous30Days && date < last30Days;
    });

    const bookingsTrend = previousBookings.length > 0 
      ? ((recentBookings.length - previousBookings.length) / previousBookings.length) * 100 
      : 0;

    return {
      totalRevenue,
      totalExpenses,
      totalPayments,
      pendingPayments,
      profit,
      profitMargin,
      units: { total: units.length, available: availableUnits, sold: soldUnits, reserved: reservedUnits },
      bookings: { total: bookings.length, recent: recentBookings.length, trend: bookingsTrend }
    };
  }, [bookings, payments, expenses, units]);

  // Monthly revenue chart data
  const monthlyRevenueData = useMemo(() => {
    const monthlyData: { [key: string]: { revenue: number; expenses: number; profit: number } } = {};

    bookings.forEach(booking => {
      const month = new Date(booking.bookingDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short' });
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, expenses: 0, profit: 0 };
      }
      monthlyData[month].revenue += booking.totalPrice || 0;
    });

    expenses.forEach(expense => {
      const month = new Date(expense.expenseDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short' });
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, expenses: 0, profit: 0 };
      }
      monthlyData[month].expenses += expense.amount || 0;
    });

    Object.keys(monthlyData).forEach(month => {
      monthlyData[month].profit = monthlyData[month].revenue - monthlyData[month].expenses;
    });

    return Object.entries(monthlyData)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-6)
      .map(([month, data]) => ({
        month,
        إيرادات: data.revenue,
        مصروفات: data.expenses,
        ربح: data.profit
      }));
  }, [bookings, expenses]);

  // Units distribution data
  const unitsDistributionData = [
    { name: 'متاح', value: stats.units.available, color: '#10b981' },
    { name: 'محجوز', value: stats.units.reserved, color: '#f59e0b' },
    { name: 'مباع', value: stats.units.sold, color: '#3b82f6' }
  ];

  // Payment status data
  const paymentStatusData = useMemo(() => {
    const paid = payments.filter(p => p.status === 'paid').length;
    const pending = payments.filter(p => p.status === 'pending').length;
    const overdue = payments.filter(p => p.status === 'overdue').length;

    return [
      { name: 'مدفوع', value: paid, color: '#10b981' },
      { name: 'معلق', value: pending, color: '#f59e0b' },
      { name: 'متأخر', value: overdue, color: '#ef4444' }
    ];
  }, [payments]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">لوحة التحكم</h1>
          <p className="text-slate-600 dark:text-slate-400">
            نظرة شاملة على أداء المشروع: {currentProject?.name}
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          تحديث
        </button>
      </div>

      {/* Key Metrics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Widget
          title="إجمالي الإيرادات"
          value={formatCurrency(stats.totalRevenue)}
          subtitle={`من ${bookings.length} حجز`}
          icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          trend={{ value: stats.bookings.trend, isPositive: stats.bookings.trend >= 0 }}
        />

        <Widget
          title="إجمالي المصروفات"
          value={formatCurrency(stats.totalExpenses)}
          subtitle={`${expenses.length} مصروف`}
          icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
          color="bg-gradient-to-br from-rose-500 to-rose-600"
        />

        <Widget
          title="صافي الربح"
          value={formatCurrency(stats.profit)}
          subtitle={`هامش ربح ${stats.profitMargin.toFixed(1)}%`}
          icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
          color={stats.profit >= 0 ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-orange-500 to-orange-600'}
          trend={{ value: stats.profitMargin, isPositive: stats.profit >= 0 }}
        />

        <Widget
          title="دفعات معلقة"
          value={formatCurrency(stats.pendingPayments)}
          subtitle={`${payments.filter(p => p.status === 'pending').length} دفعة`}
          icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          color="bg-gradient-to-br from-amber-500 to-amber-600"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <QuickAction
            label="حجز جديد"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
            onClick={() => {/* Navigate to bookings */}}
            color="bg-blue-500 hover:bg-blue-600"
          />
          <QuickAction
            label="دفعة جديدة"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
            onClick={() => {/* Navigate to payments */}}
            color="bg-green-500 hover:bg-green-600"
          />
          <QuickAction
            label="مصروف جديد"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>}
            onClick={() => {/* Navigate to expenses */}}
            color="bg-rose-500 hover:bg-rose-600"
          />
          <QuickAction
            label="تقرير مالي"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            onClick={() => {/* Navigate to financial reports */}}
            color="bg-purple-500 hover:bg-purple-600"
          />
          <QuickAction
            label="الإشعارات"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
            onClick={() => {/* Navigate to notifications */}}
            color="bg-amber-500 hover:bg-amber-600"
          />
          <QuickAction
            label="الوحدات"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
            onClick={() => {/* Navigate to units */}}
            color="bg-indigo-500 hover:bg-indigo-600"
          />
        </div>
      </div>

      {/* Charts Row 1: Revenue & Profit Trend */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">الإيرادات والمصروفات (آخر 6 أشهر)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyRevenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: 'none', 
                  borderRadius: '8px',
                  color: '#fff' 
                }}
                formatter={(value: any) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="إيرادات" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="مصروفات" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">صافي الربح (آخر 6 أشهر)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyRevenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: 'none', 
                  borderRadius: '8px',
                  color: '#fff' 
                }}
                formatter={(value: any) => formatCurrency(value)}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="ربح" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Units & Payments */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">توزيع الوحدات</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={unitsDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {unitsDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `${value} وحدة`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-4">
            {unitsDistributionData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-slate-600 dark:text-slate-400">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">حالة الدفعات</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {paymentStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `${value} دفعة`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-4">
            {paymentStatusData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-slate-600 dark:text-slate-400">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">ملخص النشاط</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">حجوزات جديدة (30 يوم)</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.bookings.recent}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">دفعات مكتملة</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {payments.filter(p => p.status === 'paid').length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">إجمالي الوحدات</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.units.total}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;
