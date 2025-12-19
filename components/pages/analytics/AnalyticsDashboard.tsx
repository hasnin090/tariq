import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useProject } from '../../../contexts/ProjectContext';
import { 
  bookingsService, 
  paymentsService, 
  expensesService 
} from '../../../src/services/supabaseService';
import { Booking, Payment, Expense } from '../../../types';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import {
  DataPoint,
  TrendAnalysis,
  ForecastResult,
  KPI,
  calculateTrend,
  detectTrendDirection,
  forecastLinear,
  calculateMovingAverage,
  calculateROI,
  calculateGrossProfitMargin,
  calculateARPU,
  determineKPIStatus,
  groupByMonth,
  calculateGrowthRate,
  detectAnomalies
} from '../../../utils/analyticsUtils';
import { devError } from '../../../utils/devLogger';

// KPI Card Component
interface KPICardProps {
  kpi: KPI;
}

const KPICard: React.FC<KPICardProps> = ({ kpi }) => {
  const statusColors = {
    excellent: 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-400',
    good: 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 border-amber-500 text-amber-700 dark:text-amber-400',
    critical: 'bg-rose-100 dark:bg-rose-900/30 border-rose-500 text-rose-700 dark:text-rose-400'
  };

  const trendIcons = {
    up: '📈',
    down: '📉',
    stable: '➡️'
  };

  return (
    <div className={`p-6 rounded-xl border-2 ${statusColors[kpi.status]}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium opacity-75">{kpi.name}</h3>
        <span className="text-2xl">{trendIcons[kpi.trend.direction]}</span>
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <p className="text-3xl font-bold">{kpi.value.toFixed(1)}</p>
        <span className="text-sm opacity-75">{kpi.unit}</span>
      </div>
      {kpi.target && (
        <p className="text-xs opacity-75 mb-2">
          الهدف: {kpi.target.toFixed(1)} {kpi.unit}
        </p>
      )}
      <p className="text-xs font-medium">{kpi.trend.description}</p>
    </div>
  );
};

const AnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'3m' | '6m' | '1y' | 'all'>('6m');

  useEffect(() => {
    if (currentProject?.id && user?.id) {
      loadAnalyticsData();
    }
  }, [currentProject, user]);

  const loadAnalyticsData = async () => {
    if (!currentProject?.id) return;

    setIsLoading(true);
    try {
      const [bookingsData, paymentsData, expensesData] = await Promise.all([
        bookingsService.getByProject(currentProject.id),
        paymentsService.getByProject(currentProject.id),
        expensesService.getByProject(currentProject.id)
      ]);

      setBookings(bookingsData);
      setPayments(paymentsData);
      setExpenses(expensesData);
    } catch (error) {
      devError(error, 'AnalyticsDashboard: Error loading data');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter data by time range
  const filteredData = useMemo(() => {
    const now = new Date();
    let cutoffDate: Date;

    switch (timeRange) {
      case '3m':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6m':
        cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(0);
    }

    return {
      bookings: bookings.filter(b => new Date(b.createdAt) >= cutoffDate),
      payments: payments.filter(p => new Date(p.paymentDate || p.createdAt) >= cutoffDate),
      expenses: expenses.filter(e => new Date(e.expenseDate) >= cutoffDate)
    };
  }, [bookings, payments, expenses, timeRange]);

  // Calculate monthly revenue trend
  const revenueData = useMemo(() => {
    const monthlyRevenue = new Map<string, number>();

    filteredData.bookings.forEach(booking => {
      const month = new Date(booking.bookingDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short' });
      monthlyRevenue.set(month, (monthlyRevenue.get(month) || 0) + (booking.totalPrice || 0));
    });

    return Array.from(monthlyRevenue.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([month, revenue]) => ({
        date: new Date(month),
        value: revenue,
        month
      }));
  }, [filteredData.bookings]);

  // Calculate expenses trend
  const expensesData = useMemo(() => {
    const monthlyExpenses = new Map<string, number>();

    filteredData.expenses.forEach(expense => {
      const month = new Date(expense.expenseDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short' });
      monthlyExpenses.set(month, (monthlyExpenses.get(month) || 0) + (expense.amount || 0));
    });

    return Array.from(monthlyExpenses.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([month, expenses]) => ({
        date: new Date(month),
        value: expenses,
        month
      }));
  }, [filteredData.expenses]);

  // Calculate profit trend
  const profitData = useMemo(() => {
    const monthlyProfit = new Map<string, { revenue: number; expenses: number }>();

    filteredData.bookings.forEach(booking => {
      const month = new Date(booking.bookingDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short' });
      const current = monthlyProfit.get(month) || { revenue: 0, expenses: 0 };
      current.revenue += booking.totalPrice || 0;
      monthlyProfit.set(month, current);
    });

    filteredData.expenses.forEach(expense => {
      const month = new Date(expense.expenseDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short' });
      const current = monthlyProfit.get(month) || { revenue: 0, expenses: 0 };
      current.expenses += expense.amount || 0;
      monthlyProfit.set(month, current);
    });

    return Array.from(monthlyProfit.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([month, data]) => ({
        month,
        profit: data.revenue - data.expenses
      }));
  }, [filteredData.bookings, filteredData.expenses]);

  // Revenue forecast
  const revenueForecast = useMemo(() => {
    if (revenueData.length < 3) return [];
    
    try {
      return forecastLinear(revenueData, 3);
    } catch (error) {
      return [];
    }
  }, [revenueData]);

  // Combined data for forecasting chart
  const forecastChartData = useMemo(() => {
    const historical = revenueData.map(d => ({
      month: d.month,
      actual: d.value,
      predicted: null as number | null
    }));

    const forecast = revenueForecast.map(f => ({
      month: f.date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short' }),
      actual: null as number | null,
      predicted: f.predicted
    }));

    return [...historical, ...forecast];
  }, [revenueData, revenueForecast]);

  // Calculate KPIs
  const kpis = useMemo((): KPI[] => {
    const totalRevenue = filteredData.bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const totalExpenses = filteredData.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const profit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    const grossMargin = calculateGrossProfitMargin(totalRevenue, totalExpenses);
    const arpu = calculateARPU(totalRevenue, filteredData.bookings.length);
    const roi = calculateROI(totalRevenue, totalExpenses);

    // Calculate trends
    const midpoint = Math.floor(revenueData.length / 2);
    const firstHalf = revenueData.slice(0, midpoint).reduce((sum, d) => sum + d.value, 0);
    const secondHalf = revenueData.slice(midpoint).reduce((sum, d) => sum + d.value, 0);
    const revenueTrend = calculateTrend(secondHalf, firstHalf);

    const expMidpoint = Math.floor(expensesData.length / 2);
    const expFirstHalf = expensesData.slice(0, expMidpoint).reduce((sum, d) => sum + d.value, 0);
    const expSecondHalf = expensesData.slice(expMidpoint).reduce((sum, d) => sum + d.value, 0);
    const expensesTrend = calculateTrend(expSecondHalf, expFirstHalf);

    return [
      {
        name: 'هامش الربح الإجمالي',
        value: grossMargin,
        target: 40,
        unit: '%',
        trend: revenueTrend,
        status: determineKPIStatus(grossMargin, 40, true)
      },
      {
        name: 'متوسط الإيراد لكل وحدة',
        value: arpu,
        target: undefined,
        unit: 'ريال',
        trend: revenueTrend,
        status: 'good' as const
      },
      {
        name: 'العائد على الاستثمار',
        value: roi,
        target: 50,
        unit: '%',
        trend: revenueTrend,
        status: determineKPIStatus(roi, 50, true)
      },
      {
        name: 'معدل نمو الإيرادات',
        value: revenueTrend.percentage,
        target: 10,
        unit: '%',
        trend: revenueTrend,
        status: determineKPIStatus(revenueTrend.percentage, 10, true)
      }
    ];
  }, [filteredData, revenueData, expensesData]);

  // Moving average for smoothing
  const smoothedRevenue = useMemo(() => {
    return calculateMovingAverage(revenueData, 3);
  }, [revenueData]);

  // Growth rate calculation
  const growthRates = useMemo(() => {
    const rates = calculateGrowthRate(revenueData);
    return revenueData.slice(1).map((d, i) => ({
      month: d.month,
      growthRate: rates[i]
    }));
  }, [revenueData]);

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">التحليلات المتقدمة</h1>
          <p className="text-slate-600 dark:text-slate-400">
            تحليل شامل للأداء المالي والتنبؤات المستقبلية
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-300 dark:border-slate-600">
          {(['3m', '6m', '1y', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {range === '3m' ? '3 أشهر' : range === '6m' ? '6 أشهر' : range === '1y' ? 'سنة' : 'الكل'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <KPICard key={index} kpi={kpi} />
        ))}
      </div>

      {/* Revenue Forecast Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          الإيرادات والتنبؤات المستقبلية
        </h2>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={forecastChartData}>
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
              formatter={(value: any) => value ? formatCurrency(value) : 'N/A'}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="actual" 
              stroke="#3b82f6" 
              strokeWidth={3}
              name="الإيرادات الفعلية"
              dot={{ fill: '#3b82f6', r: 5 }}
              connectNulls
            />
            <Line 
              type="monotone" 
              dataKey="predicted" 
              stroke="#f59e0b" 
              strokeWidth={3}
              strokeDasharray="5 5"
              name="التنبؤات"
              dot={{ fill: '#f59e0b', r: 5 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
        {revenueForecast.length > 0 && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>التنبؤ للأشهر الثلاثة القادمة:</strong>
              {' '}إيرادات متوقعة بقيمة {formatCurrency(revenueForecast.reduce((sum, f) => sum + f.predicted, 0))}
              {' '}(مستوى الثقة: {revenueForecast[0].confidence === 'high' ? 'عالي' : revenueForecast[0].confidence === 'medium' ? 'متوسط' : 'منخفض'})
            </p>
          </div>
        )}
      </div>

      {/* Revenue vs Expenses Trend */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            مقارنة الإيرادات والمصروفات
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={profitData}>
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
              <Area 
                type="monotone" 
                dataKey="profit" 
                stroke="#10b981" 
                fill="#10b981"
                fillOpacity={0.3}
                name="صافي الربح"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Growth Rate Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            معدل النمو الشهري
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={growthRates}>
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
                formatter={(value: any) => `${value.toFixed(1)}%`}
              />
              <Bar 
                dataKey="growthRate" 
                fill="#8b5cf6"
                radius={[8, 8, 0, 0]}
                name="معدل النمو"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-4">ملخص التحليلات</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-blue-100 text-sm mb-1">إجمالي الإيرادات</p>
            <p className="text-3xl font-bold">
              {formatCurrency(filteredData.bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0))}
            </p>
          </div>
          <div>
            <p className="text-blue-100 text-sm mb-1">إجمالي المصروفات</p>
            <p className="text-3xl font-bold">
              {formatCurrency(filteredData.expenses.reduce((sum, e) => sum + (e.amount || 0), 0))}
            </p>
          </div>
          <div>
            <p className="text-blue-100 text-sm mb-1">صافي الربح</p>
            <p className="text-3xl font-bold">
              {formatCurrency(
                filteredData.bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0) -
                filteredData.expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
