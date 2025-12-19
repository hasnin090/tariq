# 🚀 خطة التطوير الشاملة - Development Roadmap
**تاريخ الإنشاء:** 18 ديسمبر 2025  
**الحالة الحالية:** 85-90% مكتمل للمميزات الأساسية  
**الهدف:** الوصول إلى 100% اكتمال مع مميزات احترافية متقدمة

---

## 📋 جدول المحتويات
1. [إصلاحات عاجلة فورية](#phase-1)
2. [التحسينات الأساسية](#phase-2)
3. [الميزات المتقدمة](#phase-3)
4. [الجودة والصيانة](#phase-4)
5. [تفاصيل التنفيذ لكل عنصر](#details)

---

<a name="phase-1"></a>
## 🔥 المرحلة 1: إصلاحات عاجلة فورية
**المدة المقدرة:** 1-2 أيام  
**الأولوية:** حرجة ⚠️

### ✅ Task 1.1: تطبيق RLS على Supabase
**الملفات:** `supabase-migrations/FIX-RLS-scheduled-payments.sql`

**الخطوات:**
1. فتح Supabase Dashboard
2. الذهاب إلى SQL Editor
3. نسخ محتوى `FIX-RLS-scheduled-payments.sql`
4. تشغيل السكربت
5. التحقق من نجاح العملية

**معايير النجاح:**
- ✅ لا توجد أخطاء عند تشغيل السكربت
- ✅ تظهر 4 سياسات لكل جدول (select, insert, update, delete)
- ✅ اختبار إنشاء حجز بخطة دفع بدون أخطاء RLS

**الأهمية:** حرجة - بدون هذا لن تعمل خطط الدفع

---

### ✅ Task 1.2: تنظيف Console Logs
**الملفات المطلوب تعديلها:**
- `src/services/supabaseService.ts`
- `contexts/AuthContext.tsx`
- `components/pages/sales/Bookings.tsx`
- `components/pages/sales/Payments.tsx`
- `utils/*.ts`

**الخطوات:**
```typescript
// خيار 1: إزالة console.logs تماماً (للإنتاج)
// قبل:
console.log('📅 Creating scheduled payments...');

// بعد:
// حذف السطر

// خيار 2: استبدال بـ devLogger (للتطوير)
import { devLog, devError } from '../utils/devLogger';

// قبل:
console.log('Data:', data);
console.error('Error:', error);

// بعد:
devLog('Data:', data);
devError('Error:', error);
```

**معايير النجاح:**
- ✅ لا توجد console.log/error/warn في production build
- ✅ استخدام devLogger في بيئة التطوير فقط

---

### ✅ Task 1.3: حذف Dead Code
**الملفات:**
1. `components/pages/sales/Bookings.tsx` - حذف old payments modal المعطّل
2. `components/pages/sales/ScheduledPayments.tsx` - قرار: حذف أو إعادة استخدام؟

**الخطوات:**
```typescript
// في Bookings.tsx - حذف هذا القسم بالكامل:
{false && showPaymentsModal && selectedBookingForPayments && (
    <div className="fixed inset-0...">
        {/* Old Payment Modal - 200+ سطر */}
    </div>
)}

// قرار ScheduledPayments.tsx:
// خيار 1: حذف الملف إذا غير مستخدم
// خيار 2: تطويره كلوحة تحكم (انظر Phase 2)
```

**معايير النجاح:**
- ✅ تقليل حجم bundle size
- ✅ كود أنظف وأسهل للصيانة

---

<a name="phase-2"></a>
## 🎯 المرحلة 2: التحسينات الأساسية
**المدة المقدرة:** 1-2 أسابيع  
**الأولوية:** عالية 🔴

---

### 📊 Task 2.1: نظام التقارير المالية الشامل
**الحالة:** جديد 🆕  
**الوقت المقدر:** 4-5 أيام

#### الملفات الجديدة:
```
components/pages/accounting/
├── FinancialReports.tsx          (صفحة رئيسية)
├── Reports/
│   ├── IncomeStatement.tsx       (قائمة الدخل)
│   ├── CashFlowReport.tsx        (التدفقات النقدية)
│   ├── BudgetComparison.tsx      (الميزانية vs الفعلي)
│   ├── ProjectReport.tsx         (تقرير حسب المشروع)
│   └── CustomReport.tsx          (تقرير مخصص)
utils/
├── reportGenerator.ts            (منطق التقارير)
└── exportHelpers.ts              (تصدير PDF/Excel)
```

#### الخطوات التفصيلية:

**الخطوة 1: إنشاء واجهة التقارير الرئيسية**
```typescript
// components/pages/accounting/FinancialReports.tsx
interface ReportFilters {
  startDate: string;
  endDate: string;
  projectId?: string;
  reportType: 'income' | 'cashflow' | 'budget' | 'project' | 'custom';
}

export const FinancialReports: React.FC = () => {
  const [filters, setFilters] = useState<ReportFilters>({...});
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Generate report based on filters
  const generateReport = async () => {
    setLoading(true);
    const data = await reportGenerator.generate(filters);
    setReportData(data);
    setLoading(false);
  };

  return (
    <div>
      {/* Filters Section */}
      <ReportFilters filters={filters} onChange={setFilters} />
      
      {/* Report Tabs */}
      <Tabs>
        <Tab label="قائمة الدخل"><IncomeStatement data={reportData} /></Tab>
        <Tab label="التدفقات النقدية"><CashFlowReport data={reportData} /></Tab>
        <Tab label="الميزانية"><BudgetComparison data={reportData} /></Tab>
        <Tab label="المشاريع"><ProjectReport data={reportData} /></Tab>
      </Tabs>

      {/* Export Buttons */}
      <div className="flex gap-2">
        <button onClick={() => exportHelpers.toPDF(reportData)}>
          تصدير PDF
        </button>
        <button onClick={() => exportHelpers.toExcel(reportData)}>
          تصدير Excel
        </button>
      </div>
    </div>
  );
};
```

**الخطوة 2: تقرير قائمة الدخل (Income Statement)**
```typescript
// components/pages/accounting/Reports/IncomeStatement.tsx
interface IncomeStatementData {
  revenue: {
    unitSales: number;
    bookingPayments: number;
    installments: number;
    total: number;
  };
  expenses: {
    operational: number;
    salaries: number;
    marketing: number;
    other: number;
    total: number;
  };
  netIncome: number;
  profitMargin: number;
}

const IncomeStatement: React.FC<{ data: IncomeStatementData }> = ({ data }) => {
  return (
    <div className="report-container">
      <h2>قائمة الدخل - Income Statement</h2>
      <p className="period">{data.period}</p>

      {/* Revenue Section */}
      <section className="revenue">
        <h3>الإيرادات - Revenue</h3>
        <table>
          <tr><td>مبيعات الوحدات</td><td>{formatCurrency(data.revenue.unitSales)}</td></tr>
          <tr><td>دفعات الحجز</td><td>{formatCurrency(data.revenue.bookingPayments)}</td></tr>
          <tr><td>أقساط</td><td>{formatCurrency(data.revenue.installments)}</td></tr>
          <tr className="total"><td>إجمالي الإيرادات</td><td>{formatCurrency(data.revenue.total)}</td></tr>
        </table>
      </section>

      {/* Expenses Section */}
      <section className="expenses">
        <h3>المصروفات - Expenses</h3>
        <table>
          <tr><td>تشغيلية</td><td>{formatCurrency(data.expenses.operational)}</td></tr>
          <tr><td>رواتب</td><td>{formatCurrency(data.expenses.salaries)}</td></tr>
          <tr><td>تسويق</td><td>{formatCurrency(data.expenses.marketing)}</td></tr>
          <tr><td>أخرى</td><td>{formatCurrency(data.expenses.other)}</td></tr>
          <tr className="total"><td>إجمالي المصروفات</td><td>{formatCurrency(data.expenses.total)}</td></tr>
        </table>
      </section>

      {/* Net Income */}
      <section className="net-income">
        <h3>صافي الدخل - Net Income</h3>
        <div className="big-number">
          {formatCurrency(data.netIncome)}
        </div>
        <p>هامش الربح: {data.profitMargin.toFixed(2)}%</p>
      </section>

      {/* Chart */}
      <BarChart 
        data={[
          { name: 'الإيرادات', value: data.revenue.total },
          { name: 'المصروفات', value: data.expenses.total },
          { name: 'صافي الدخل', value: data.netIncome }
        ]}
      />
    </div>
  );
};
```

**الخطوة 3: تقرير التدفقات النقدية**
```typescript
// components/pages/accounting/Reports/CashFlowReport.tsx
interface CashFlowData {
  operatingActivities: {
    cashFromSales: number;
    cashFromPayments: number;
    cashPaid: number;
    netOperating: number;
  };
  investingActivities: {
    purchaseAssets: number;
    saleAssets: number;
    netInvesting: number;
  };
  financingActivities: {
    loans: number;
    repayments: number;
    netFinancing: number;
  };
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
}

const CashFlowReport: React.FC<{ data: CashFlowData }> = ({ data }) => {
  return (
    <div className="cash-flow-report">
      <h2>قائمة التدفقات النقدية</h2>

      {/* Operating Activities */}
      <section>
        <h3>الأنشطة التشغيلية</h3>
        <table>
          <tr><td>نقد من المبيعات</td><td className="positive">{formatCurrency(data.operatingActivities.cashFromSales)}</td></tr>
          <tr><td>نقد من الدفعات</td><td className="positive">{formatCurrency(data.operatingActivities.cashFromPayments)}</td></tr>
          <tr><td>نقد مدفوع</td><td className="negative">({formatCurrency(data.operatingActivities.cashPaid)})</td></tr>
          <tr className="subtotal"><td>صافي النقد التشغيلي</td><td>{formatCurrency(data.operatingActivities.netOperating)}</td></tr>
        </table>
      </section>

      {/* Summary */}
      <section className="summary">
        <div className="balance-row">
          <span>الرصيد الافتتاحي</span>
          <span>{formatCurrency(data.openingBalance)}</span>
        </div>
        <div className="balance-row">
          <span>صافي التدفق النقدي</span>
          <span className={data.netCashFlow >= 0 ? 'positive' : 'negative'}>
            {formatCurrency(data.netCashFlow)}
          </span>
        </div>
        <div className="balance-row total">
          <span>الرصيد الختامي</span>
          <span>{formatCurrency(data.closingBalance)}</span>
        </div>
      </section>

      {/* Chart */}
      <LineChart 
        data={data.monthlyTrend}
        xKey="month"
        yKey="cashFlow"
        title="اتجاه التدفق النقدي الشهري"
      />
    </div>
  );
};
```

**الخطوة 4: منطق التقارير (Report Generator)**
```typescript
// utils/reportGenerator.ts
export const reportGenerator = {
  async generate(filters: ReportFilters) {
    const { startDate, endDate, projectId, reportType } = filters;

    // Fetch data from Supabase
    const [bookings, payments, expenses, units] = await Promise.all([
      bookingsService.getByDateRange(startDate, endDate, projectId),
      paymentsService.getByDateRange(startDate, endDate, projectId),
      expensesService.getByDateRange(startDate, endDate, projectId),
      unitsService.getAll()
    ]);

    // Calculate revenue
    const revenue = {
      unitSales: this.calculateUnitSales(units, bookings),
      bookingPayments: this.calculateBookingPayments(payments),
      installments: this.calculateInstallments(payments),
      total: 0
    };
    revenue.total = revenue.unitSales + revenue.bookingPayments + revenue.installments;

    // Calculate expenses
    const expensesData = {
      operational: this.sumByCategory(expenses, 'operational'),
      salaries: this.sumByCategory(expenses, 'salaries'),
      marketing: this.sumByCategory(expenses, 'marketing'),
      other: this.sumByCategory(expenses, 'other'),
      total: 0
    };
    expensesData.total = Object.values(expensesData).reduce((sum, val) => sum + val, 0) - expensesData.total;

    // Net income
    const netIncome = revenue.total - expensesData.total;
    const profitMargin = (netIncome / revenue.total) * 100;

    return {
      period: `${startDate} - ${endDate}`,
      revenue,
      expenses: expensesData,
      netIncome,
      profitMargin
    };
  },

  calculateUnitSales(units: Unit[], bookings: Booking[]): number {
    return bookings.reduce((sum, booking) => {
      const unit = units.find(u => u.id === booking.unitId);
      return sum + (unit?.price || 0);
    }, 0);
  },

  calculateBookingPayments(payments: Payment[]): number {
    return payments
      .filter(p => p.paymentType === 'booking')
      .reduce((sum, p) => sum + p.amount, 0);
  },

  calculateInstallments(payments: Payment[]): number {
    return payments
      .filter(p => p.paymentType === 'installment')
      .reduce((sum, p) => sum + p.amount, 0);
  },

  sumByCategory(expenses: Expense[], category: string): number {
    return expenses
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + e.amount, 0);
  }
};
```

**الخطوة 5: التصدير (Export Helpers)**
```typescript
// utils/exportHelpers.ts
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

export const exportHelpers = {
  toPDF(reportData: any) {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text('تقرير مالي', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`الفترة: ${reportData.period}`, 105, 30, { align: 'center' });

    // Revenue Section
    let yPos = 50;
    doc.setFontSize(14);
    doc.text('الإيرادات', 20, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.text(`مبيعات الوحدات: ${formatCurrency(reportData.revenue.unitSales)}`, 30, yPos);
    yPos += 7;
    doc.text(`دفعات الحجز: ${formatCurrency(reportData.revenue.bookingPayments)}`, 30, yPos);
    yPos += 7;
    doc.text(`أقساط: ${formatCurrency(reportData.revenue.installments)}`, 30, yPos);
    yPos += 10;
    doc.setFontSize(12);
    doc.text(`إجمالي الإيرادات: ${formatCurrency(reportData.revenue.total)}`, 30, yPos);

    // Expenses Section
    yPos += 20;
    doc.setFontSize(14);
    doc.text('المصروفات', 20, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.text(`تشغيلية: ${formatCurrency(reportData.expenses.operational)}`, 30, yPos);
    yPos += 7;
    doc.text(`رواتب: ${formatCurrency(reportData.expenses.salaries)}`, 30, yPos);
    yPos += 10;
    doc.setFontSize(12);
    doc.text(`إجمالي المصروفات: ${formatCurrency(reportData.expenses.total)}`, 30, yPos);

    // Net Income
    yPos += 20;
    doc.setFontSize(16);
    doc.text(`صافي الدخل: ${formatCurrency(reportData.netIncome)}`, 20, yPos);

    doc.save(`financial-report-${new Date().toISOString().split('T')[0]}.pdf`);
  },

  toExcel(reportData: any) {
    const wb = XLSX.utils.book_new();

    // Revenue sheet
    const revenueData = [
      ['الإيرادات', 'المبلغ'],
      ['مبيعات الوحدات', reportData.revenue.unitSales],
      ['دفعات الحجز', reportData.revenue.bookingPayments],
      ['أقساط', reportData.revenue.installments],
      ['', ''],
      ['إجمالي الإيرادات', reportData.revenue.total]
    ];
    const wsRevenue = XLSX.utils.aoa_to_sheet(revenueData);
    XLSX.utils.book_append_sheet(wb, wsRevenue, 'الإيرادات');

    // Expenses sheet
    const expensesData = [
      ['المصروفات', 'المبلغ'],
      ['تشغيلية', reportData.expenses.operational],
      ['رواتب', reportData.expenses.salaries],
      ['تسويق', reportData.expenses.marketing],
      ['أخرى', reportData.expenses.other],
      ['', ''],
      ['إجمالي المصروفات', reportData.expenses.total]
    ];
    const wsExpenses = XLSX.utils.aoa_to_sheet(expensesData);
    XLSX.utils.book_append_sheet(wb, wsExpenses, 'المصروفات');

    // Summary sheet
    const summaryData = [
      ['البند', 'المبلغ'],
      ['إجمالي الإيرادات', reportData.revenue.total],
      ['إجمالي المصروفات', reportData.expenses.total],
      ['', ''],
      ['صافي الدخل', reportData.netIncome],
      ['هامش الربح %', reportData.profitMargin.toFixed(2)]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'الملخص');

    XLSX.writeFile(wb, `financial-report-${new Date().toISOString().split('T')[0]}.xlsx`);
  }
};
```

**الخطوة 6: إضافة إلى Sidebar**
```typescript
// components/Sidebar.tsx
{interfaceMode === 'expenses' && (
  <NavLink to="/accounting/financial-reports" icon={<DocumentTextIcon />}>
    التقارير المالية
  </NavLink>
)}
```

**الخطوة 7: إضافة Route في App**
```typescript
// App.tsx
<Route path="/accounting/financial-reports" element={<FinancialReports />} />
```

**المتطلبات (Dependencies):**
```json
{
  "dependencies": {
    "jspdf": "^2.5.1",
    "xlsx": "^0.18.5",
    "recharts": "^2.10.0"
  }
}
```

**معايير النجاح:**
- ✅ عرض قائمة الدخل بشكل صحيح
- ✅ عرض التدفقات النقدية
- ✅ عرض مقارنة الميزانية
- ✅ تصدير PDF يعمل
- ✅ تصدير Excel يعمل
- ✅ Charts تعرض البيانات بشكل صحيح

---

### 🔔 Task 2.2: نظام الإشعارات التلقائية
**الحالة:** الجداول موجودة، النظام غير نشط  
**الوقت المقدر:** 3-4 أيام

#### الملفات المطلوبة:
```
components/
├── Header.tsx                    (تعديل - إضافة notification bell)
├── NotificationPanel.tsx         (جديد)
supabase/functions/
├── check-overdue-payments/
│   └── index.ts                  (Edge Function)
services/
└── notificationService.ts        (جديد)
```

#### الخطوات:

**الخطوة 1: إنشاء Supabase Edge Function**
```typescript
// supabase/functions/check-overdue-payments/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // استدعاء الدالة الموجودة في قاعدة البيانات
    const { data, error } = await supabase.rpc('check_overdue_payments_and_notify');

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsCreated: data,
        timestamp: new Date().toISOString()
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

**الخطوة 2: جدولة Cron Job**
```toml
# supabase/config.toml
[functions.check-overdue-payments]
verify_jwt = false

[functions.check-overdue-payments.cron]
# تشغيل يومياً في الساعة 8 صباحاً
schedule = "0 8 * * *"
```

**الخطوة 3: إضافة notification bell في Header**
```typescript
// components/Header.tsx - تعديل
import { BellIcon } from './shared/Icons';
import NotificationPanel from './NotificationPanel';

export const Header: React.FC = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();
    
    // Subscribe to new notifications
    const subscription = paymentNotificationsService.subscribe((notifications) => {
      const unread = notifications.filter(n => !n.isRead).length;
      setUnreadCount(unread);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const loadUnreadCount = async () => {
    const notifications = await paymentNotificationsService.getUnread();
    setUnreadCount(notifications.length);
  };

  return (
    <header>
      {/* ... existing header content ... */}
      
      <button 
        onClick={() => setShowNotifications(!showNotifications)}
        className="notification-bell relative"
      >
        <BellIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="badge">{unreadCount}</span>
        )}
      </button>

      {showNotifications && (
        <NotificationPanel onClose={() => setShowNotifications(false)} />
      )}
    </header>
  );
};
```

**الخطوة 4: لوحة الإشعارات**
```typescript
// components/NotificationPanel.tsx
interface Props {
  onClose: () => void;
}

export const NotificationPanel: React.FC<Props> = ({ onClose }) => {
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    const data = filter === 'unread' 
      ? await paymentNotificationsService.getUnread()
      : await paymentNotificationsService.getAll();
    setNotifications(data);
  };

  const handleMarkAsRead = async (id: string) => {
    await paymentNotificationsService.markAsRead(id);
    loadNotifications();
  };

  const handleMarkAllAsRead = async () => {
    await paymentNotificationsService.markAllAsRead();
    loadNotifications();
  };

  return (
    <div className="notification-panel">
      <div className="header">
        <h3>الإشعارات</h3>
        <button onClick={onClose}><CloseIcon /></button>
      </div>

      <div className="filters">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          الكل
        </button>
        <button 
          className={filter === 'unread' ? 'active' : ''}
          onClick={() => setFilter('unread')}
        >
          غير المقروءة
        </button>
        <button onClick={handleMarkAllAsRead}>تحديد الكل كمقروء</button>
      </div>

      <div className="notifications-list">
        {notifications.map(notification => (
          <div 
            key={notification.id}
            className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
            onClick={() => handleMarkAsRead(notification.id)}
          >
            <div className="icon">
              {notification.notificationType === 'overdue' && <ExclamationIcon className="text-red-500" />}
              {notification.notificationType === 'due_today' && <ClockIcon className="text-amber-500" />}
              {notification.notificationType === 'reminder' && <CalendarIcon className="text-blue-500" />}
            </div>
            <div className="content">
              <h4>{notification.customerName}</h4>
              <p>دفعة مستحقة بقيمة {formatCurrency(notification.amountDue)}</p>
              <p className="unit">الوحدة: {notification.unitName}</p>
              <p className="date">تاريخ الاستحقاق: {notification.dueDate}</p>
            </div>
            {!notification.isRead && <div className="unread-dot" />}
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="empty">
            <p>لا توجد إشعارات</p>
          </div>
        )}
      </div>
    </div>
  );
};
```

**الخطوة 5: خدمة الإشعارات (موجودة بالفعل)**
```typescript
// src/services/supabaseService.ts - paymentNotificationsService
// الخدمة موجودة، فقط نحتاج subscribe:

export const paymentNotificationsService = {
  // ... existing methods ...

  subscribe(callback: (notifications: PaymentNotification[]) => void) {
    const channel = supabase
      .channel('payment_notifications_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'payment_notifications' },
        () => {
          this.getAll().then(callback);
        }
      )
      .subscribe();

    // Initial load
    this.getAll().then(callback);

    return {
      unsubscribe: () => supabase.removeChannel(channel)
    };
  }
};
```

**الخطوة 6: نشر Edge Function**
```bash
# Terminal
supabase functions deploy check-overdue-payments
```

**الخطوة 7: اختبار يدوي**
```bash
# استدعاء الدالة يدوياً للاختبار
curl -X POST https://your-project.supabase.co/functions/v1/check-overdue-payments \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**معايير النجاح:**
- ✅ Cron job يعمل يومياً
- ✅ إشعارات تُنشأ للدفعات المتأخرة/المستحقة
- ✅ notification bell تظهر العدد الصحيح
- ✅ لوحة الإشعارات تعمل
- ✅ تحديد كمقروء يعمل

---

### 🗄️ Task 2.3: تحسين نظام الأرشفة
**الحالة:** موجود لكن بسيط  
**الوقت المقدر:** 2-3 أيام

#### الملفات للتعديل/الإنشاء:
```
components/pages/sales/
├── GeneralArchive.tsx            (تطوير كبير)
├── BookingArchive.tsx            (جديد - اختياري)
utils/
└── archiveHelper.ts              (تحسين)
```

#### الخطوات:

**الخطوة 1: تحسين archiveHelper**
```typescript
// utils/archiveHelper.ts - تعديل وإضافة
export const archiveHelper = {
  // ... existing methods ...

  async archiveWithReason(
    itemType: string,
    itemId: string,
    itemData: any,
    archivedBy: string,
    reason: string // جديد
  ) {
    const archiveId = generateUniqueId('archive');
    const { error } = await supabase
      .from('general_archive')
      .insert([{
        id: archiveId,
        item_type: itemType,
        item_id: itemId,
        item_data: itemData,
        archived_by: archivedBy,
        archive_reason: reason, // جديد
        archived_at: new Date().toISOString()
      }]);

    if (error) throw error;
    return archiveId;
  },

  async restoreWithValidation(archiveId: string): Promise<{success: boolean, error?: string}> {
    const { data: archivedItem, error: fetchError } = await supabase
      .from('general_archive')
      .select('*')
      .eq('id', archiveId)
      .single();

    if (fetchError || !archivedItem) {
      return { success: false, error: 'العنصر المؤرشف غير موجود' };
    }

    // Validation before restore
    const itemType = archivedItem.item_type;
    const itemData = archivedItem.item_data;

    // Check if item can be restored (e.g., customer with same name doesn't exist)
    if (itemType === 'customers') {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('name', itemData.name)
        .single();

      if (existingCustomer) {
        return { success: false, error: 'يوجد عميل بنفس الاسم بالفعل' };
      }
    }

    // Restore...
    // ... existing restore logic ...

    return { success: true };
  }
};
```

**الخطوة 2: تطوير واجهة GeneralArchive**
```typescript
// components/pages/sales/GeneralArchive.tsx - تطوير كبير
export const GeneralArchive: React.FC = () => {
  const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<ArchivedItem | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const filteredItems = useMemo(() => {
    let items = archivedItems;

    // Filter by type
    if (filter !== 'all') {
      items = items.filter(item => item.item_type === filter);
    }

    // Filter by search term
    if (searchTerm) {
      items = items.filter(item => {
        const data = item.item_data;
        return JSON.stringify(data).toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    return items.sort((a, b) => 
      new Date(b.archived_at).getTime() - new Date(a.archived_at).getTime()
    );
  }, [archivedItems, filter, searchTerm]);

  const handleRestore = async (item: ArchivedItem) => {
    setSelectedItem(item);
    setShowRestoreModal(true);
  };

  const confirmRestore = async () => {
    if (!selectedItem) return;

    try {
      const result = await archiveHelper.restoreWithValidation(selectedItem.id);
      
      if (result.success) {
        addToast('تم استعادة العنصر بنجاح', 'success');
        loadData();
      } else {
        addToast(result.error || 'فشل الاستعادة', 'error');
      }
    } catch (error) {
      addToast('خطأ في الاستعادة', 'error');
    } finally {
      setShowRestoreModal(false);
      setSelectedItem(null);
    }
  };

  return (
    <div className="archive-page">
      <header>
        <h1>الأرشيف العام</h1>
        <div className="filters">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">الكل</option>
            <option value="bookings">الحجوزات</option>
            <option value="customers">العملاء</option>
            <option value="units">الوحدات</option>
            <option value="payments">الدفعات</option>
          </select>
          <input
            type="search"
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <table>
        <thead>
          <tr>
            <th>النوع</th>
            <th>البيانات</th>
            <th>تاريخ الأرشفة</th>
            <th>بواسطة</th>
            <th>السبب</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map(item => (
            <tr key={item.id}>
              <td>
                <span className={`badge ${item.item_type}`}>
                  {getTypeLabel(item.item_type)}
                </span>
              </td>
              <td>
                <ItemDataPreview data={item.item_data} type={item.item_type} />
              </td>
              <td>{new Date(item.archived_at).toLocaleDateString('ar')}</td>
              <td>{item.archived_by}</td>
              <td>{item.archive_reason || '-'}</td>
              <td>
                <button onClick={() => handleRestore(item)} className="btn-restore">
                  استعادة
                </button>
                <button onClick={() => handleDelete(item.id)} className="btn-delete">
                  حذف نهائي
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showRestoreModal && selectedItem && (
        <ConfirmModal
          isOpen={true}
          title="تأكيد الاستعادة"
          message={`هل أنت متأكد من استعادة ${getTypeLabel(selectedItem.item_type)}؟`}
          onConfirm={confirmRestore}
          onCancel={() => setShowRestoreModal(false)}
        />
      )}
    </div>
  );
};

// Helper components
const ItemDataPreview: React.FC<{ data: any, type: string }> = ({ data, type }) => {
  switch (type) {
    case 'customers':
      return <div><strong>{data.name}</strong> - {data.phone}</div>;
    case 'bookings':
      return <div>الوحدة: {data.unitName} - العميل: {data.customerName}</div>;
    case 'units':
      return <div>{data.name} - {formatCurrency(data.price)}</div>;
    default:
      return <div>{JSON.stringify(data).slice(0, 50)}...</div>;
  }
};
```

**معايير النجاح:**
- ✅ عرض الأرشيف بتصفية وبحث
- ✅ استعادة مع validation
- ✅ سبب الأرشفة يُسجّل
- ✅ عرض معاينة البيانات بشكل مفهوم

---

### 📄 Task 2.4: تحسين نظام المستندات
**الوقت المقدر:** 2 أيام

#### التحسينات المطلوبة:
1. فئات المستندات
2. تواريخ انتهاء
3. تنزيل مجمّع
4. معاينة PDF مدمجة

#### الخطوات:

**الخطوة 1: تعديل types.ts**
```typescript
// types.ts - تعديل Document interface
export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploaded_at: string;
  uploaded_by?: string;
  // جديد:
  category?: 'contract' | 'id' | 'deed' | 'invoice' | 'receipt' | 'other';
  expiry_date?: string;
  notes?: string;
  tags?: string[];
}
```

**الخطوة 2: تعديل migration للمستندات**
```sql
-- إضافة أعمدة جديدة لجدول documents (إذا لم تكن موجودة)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tags TEXT[];
```

**الخطوة 3: تحسين DocumentManager**
```typescript
// components/shared/DocumentManager.tsx - إضافات
const DocumentManager: React.FC<Props> = ({ entityType, entityId }) => {
  // ... existing state ...
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredDocs = useMemo(() => {
    if (selectedCategory === 'all') return documents;
    return documents.filter(doc => doc.category === selectedCategory);
  }, [documents, selectedCategory]);

  const handleBulkDownload = async () => {
    // استخدام JSZip لإنشاء ZIP
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    for (const doc of filteredDocs) {
      const response = await fetch(doc.url);
      const blob = await response.blob();
      zip.file(doc.name, blob);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documents-${entityId}.zip`;
    a.click();
  };

  return (
    <div className="document-manager">
      <div className="toolbar">
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          <option value="all">جميع الفئات</option>
          <option value="contract">عقود</option>
          <option value="id">هويات</option>
          <option value="deed">سندات</option>
          <option value="invoice">فواتير</option>
          <option value="receipt">إيصالات</option>
          <option value="other">أخرى</option>
        </select>
        <button onClick={handleBulkDownload}>تنزيل الكل (ZIP)</button>
      </div>

      <div className="documents-grid">
        {filteredDocs.map(doc => (
          <DocumentCard 
            key={doc.id} 
            doc={doc}
            onView={() => handleViewDoc(doc)}
            onDelete={() => handleDelete(doc.id)}
          />
        ))}
      </div>
    </div>
  );
};

const DocumentCard: React.FC<{doc: Document}> = ({ doc, onView, onDelete }) => {
  const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();

  return (
    <div className={`document-card ${isExpired ? 'expired' : ''}`}>
      <div className="category-badge">{getCategoryLabel(doc.category)}</div>
      <FileIcon type={doc.type} />
      <h4>{doc.name}</h4>
      {doc.expiry_date && (
        <p className="expiry">
          {isExpired ? '⚠️ منتهي' : 'ينتهي'}: {doc.expiry_date}
        </p>
      )}
      {doc.notes && <p className="notes">{doc.notes}</p>}
      <div className="actions">
        <button onClick={onView}>معاينة</button>
        <button onClick={onDelete}>حذف</button>
      </div>
    </div>
  );
};
```

**الخطوة 4: معاينة PDF مدمجة**
```typescript
// components/shared/PDFViewer.tsx - جديد
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

export const PDFViewer: React.FC<{ url: string }> = ({ url }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  return (
    <div className="pdf-viewer">
      <div className="controls">
        <button 
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber(pageNumber - 1)}
        >
          السابق
        </button>
        <span>صفحة {pageNumber} من {numPages}</span>
        <button 
          disabled={pageNumber >= numPages}
          onClick={() => setPageNumber(pageNumber + 1)}
        >
          التالي
        </button>
      </div>

      <Document
        file={url}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
      >
        <Page pageNumber={pageNumber} />
      </Document>
    </div>
  );
};
```

**المتطلبات:**
```json
{
  "dependencies": {
    "jszip": "^3.10.1",
    "react-pdf": "^7.7.0"
  }
}
```

---

<a name="phase-3"></a>
## 🌟 المرحلة 3: الميزات المتقدمة
**المدة المقدرة:** 2-3 أسابيع  
**الأولوية:** متوسطة 🟡

### Task 3.1: نظام الطباعة
### Task 3.2: استيراد البيانات
### Task 3.3: SMS/Email Notifications
### Task 3.4: لوحة تحكم Scheduled Payments

(تفاصيل كاملة في القسم التالي)

---

<a name="phase-4"></a>
## 🎓 المرحلة 4: الجودة والصيانة
**المدة المقدرة:** 1-2 أسابيع  
**الأولوية:** منخفضة لكن مهمة 🟢

### Task 4.1: Unit Tests
### Task 4.2: E2E Tests
### Task 4.3: Performance Optimization
### Task 4.4: Mobile Responsiveness

---

<a name="details"></a>
## 📝 تفاصيل التنفيذ المتقدمة

(يتم استكمالها حسب الحاجة)

---

## 📊 مقاييس التقدم

### Progress Tracker
```
المرحلة 1: [========  ] 80% (2/3 tasks)
  ✅ Task 1.1: تطبيق RLS (يحتاج تنفيذ في Supabase)
  ✅ Task 1.2: تنظيف Console Logs (مكتمل 90%)
  ⏳ Task 1.3: حذف Dead Code (قيد التنفيذ)
المرحلة 2: [          ] 0%  (0/4 tasks)
المرحلة 3: [          ] 0%  (0/4 tasks)
المرحلة 4: [          ] 0%  (0/4 tasks)

Overall: [==        ] 20%
```

### الأولويات الحالية:
1. ⚠️ تطبيق RLS (يحتاج تنفيذك في Supabase SQL Editor)
2. ✅ تنظيف Console Logs (تم في Bookings, Payments, supabaseService)
3. ⏳ حذف Dead Code (قيد التنفيذ)
4. ⏳ نظام التقارير المالية (التالي)

---

## ⚡ البدء السريع

### الخطوة الأولى - الآن:
```bash
# 1. تطبيق RLS
# افتح Supabase SQL Editor
# شغّل: supabase-migrations/FIX-RLS-scheduled-payments.sql

# 2. تثبيت dependencies جديدة
npm install jspdf xlsx recharts jszip react-pdf

# 3. ابدأ بـ Task 2.1 (التقارير)
```

---

**ملاحظات مهمة:**
- كل task له معايير نجاح واضحة
- التقديرات الزمنية تقريبية وتعتمد على السرعة
- يمكن تنفيذ tasks بالتوازي إذا كان هناك أكثر من مطور
- الأولويات قابلة للتعديل حسب احتياجات العمل

---

**آخر تحديث:** 18 ديسمبر 2025
