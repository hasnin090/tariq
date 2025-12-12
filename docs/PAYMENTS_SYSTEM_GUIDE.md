# 📋 نظام الدفعات الاحترافي الموحد

## 🎯 الهدف
إنشاء نظام دفعات احترافي وسلس يجمع كل الدفعات في مكان واحد مع إمكانية التمييز الواضح بين أنواع الدفعات.

---

## 🏗️ البنية الجديدة

### 1. جدول الدفعات (payments)

```sql
CREATE TABLE public.payments (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_type TEXT NOT NULL DEFAULT 'installment' 
        CHECK (payment_type IN ('booking', 'installment', 'final')),
    account_id TEXT REFERENCES accounts(id),
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### أنواع الدفعات (payment_type):
- **`booking`** 🎯 - دفعة الحجز الأولى (الدفعة عند الحجز)
- **`installment`** 📝 - قسط أو دفعة إضافية
- **`final`** ✅ - الدفعة النهائية (التي تكمل المبلغ)

---

## 🔒 الحماية والأمان

### Trigger تلقائي لمنع التجاوز
```sql
CREATE TRIGGER validate_payment_amount
BEFORE INSERT OR UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION check_payment_limit();
```

**كيف يعمل:**
1. عند إدخال أي دفعة، يحسب النظام إجمالي جميع الدفعات
2. إذا تجاوز الإجمالي سعر الوحدة → يرفض العملية تلقائياً
3. رسالة خطأ واضحة: "إجمالي الدفعات (X) يتجاوز سعر الوحدة Y (Z)"

### تحديث تلقائي لحالة الوحدة
```sql
CREATE TRIGGER update_unit_on_full_payment
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_unit_status_on_full_payment();
```

**كيف يعمل:**
- عندما يصل إجمالي الدفعات = سعر الوحدة
- يتم تلقائياً تحديث حالة الوحدة إلى `Sold`

---

## 📊 View للبيانات الكاملة

```sql
CREATE VIEW payments_with_details AS
SELECT 
    p.id,
    p.booking_id,
    p.amount,
    p.payment_date,
    p.payment_type,
    c.name as customer_name,
    u.name as unit_name,
    u.price as unit_price,
    (إجمالي تراكمي) as total_paid_so_far,
    (المتبقي) as remaining_amount
FROM payments p
JOIN bookings b ON p.booking_id = b.id
JOIN customers c ON b.customer_id = c.id
JOIN units u ON b.unit_id = u.id;
```

---

## 🎨 الواجهة الاحترافية

### 1. عرض مصغر في الجداول
```typescript
<td onClick={() => showPaymentDetails(booking.id)}>
  <span className="text-emerald-600 font-bold cursor-pointer hover:underline">
    {formatCurrency(totalPaid)} / {formatCurrency(unitPrice)}
  </span>
</td>
```

### 2. Modal تفصيلي (PaymentTimeline)
عند الضغط على أي دفعة، يظهر نافذة منبثقة تحتوي على:

#### أ) Progress Bar
- عرض نسبة الإنجاز بشكل مرئي
- "تم الدفع: 75% - 150,000,000 من 200,000,000"

#### ب) بطاقات ملخص
```
┌─────────────┬─────────────┬─────────────┐
│ سعر الوحدة  │ إجمالي المدفوع │   المتبقي   │
│ 200,000,000│ 150,000,000│  50,000,000│
└─────────────┴─────────────┴─────────────┘
```

#### ج) Timeline عمودي
```
🎯 دفعة الحجز
   📅 2024-01-15
   💰 50,000,000
   ├─ إجمالي: 50,000,000
   └─ متبقي: 150,000,000

📝 قسط 1
   📅 2024-02-15
   💰 50,000,000
   ├─ إجمالي: 100,000,000
   └─ متبقي: 100,000,000

📝 قسط 2
   📅 2024-03-15
   💰 50,000,000
   ├─ إجمالي: 150,000,000
   └─ متبقي: 50,000,000

✅ دفعة نهائية
   📅 2024-04-15
   💰 50,000,000
   ├─ إجمالي: 200,000,000
   └─ ✅ مكتمل
```

### 3. الألوان والأيقونات
- **دفعة الحجز** 🎯: أزرق (`blue-500`)
- **القسط** 📝: بنفسجي (`indigo-500`)
- **دفعة نهائية** ✅: أخضر (`emerald-500`)

---

## 📝 خطوات الاستخدام

### 1. تشغيل Migration
```bash
# في Supabase Dashboard أو عبر CLI
psql -U postgres -d your_database -f restructure-payments-table.sql
```

### 2. إضافة دفعة جديدة
```typescript
const payment = {
  bookingId: 'booking_123',
  amount: 50000000,
  paymentDate: '2024-01-15',
  paymentType: 'booking', // أو 'installment' أو 'final'
  accountId: 'account_xyz',
  notes: 'دفعة الحجز الأولى'
};

await paymentsService.create(payment);
```

### 3. عرض تفاصيل الدفعات
```typescript
const [showTimeline, setShowTimeline] = useState(false);
const [selectedPayments, setSelectedPayments] = useState<Payment[]>([]);

// في الجدول
<td 
  onClick={() => {
    setSelectedPayments(getPaymentsForBooking(booking.id));
    setShowTimeline(true);
  }}
  className="cursor-pointer hover:bg-blue-50"
>
  {formatCurrency(totalPaid)}
</td>

// Modal
{showTimeline && (
  <PaymentTimeline
    payments={selectedPayments}
    unitPrice={unitPrice}
    onClose={() => setShowTimeline(false)}
  />
)}
```

---

## ✅ المزايا

### 1. بساطة
- ✅ جدول واحد لجميع الدفعات
- ✅ لا حاجة لمنطق معقد في الكود
- ✅ تمييز واضح بين أنواع الدفعات

### 2. أمان
- ✅ Trigger يمنع التجاوز على مستوى قاعدة البيانات
- ✅ لا يمكن التلاعب من Frontend
- ✅ رسائل خطأ واضحة

### 3. احترافية
- ✅ واجهة مستخدم جميلة وسهلة
- ✅ Timeline واضح لكل الدفعات
- ✅ معلومات تراكمية مفصلة

### 4. أداء
- ✅ Indexes محسّنة
- ✅ View جاهز لعرض البيانات
- ✅ Functions محسّنة للحسابات

---

## 🔄 Migration من النظام القديم

### البيانات القديمة:
- **bookings.amount_paid** → تُنقل إلى `payments` بنوع `booking`
- **payments (القديم)** → يبقى كما هو بنوع `installment`

### التحديثات المطلوبة:
1. ✅ Migration SQL (تم)
2. ✅ TypeScript Types (تم)
3. ✅ PaymentTimeline Component (تم)
4. ⏳ تحديث Services
5. ⏳ تحديث صفحة Bookings
6. ⏳ تحديث صفحة Payments

---

## 📞 الدعم

إذا واجهت أي مشكلة:
1. تحقق من logs قاعدة البيانات
2. تأكد من تشغيل Migration بنجاح
3. راجع أمثلة الاستخدام أعلاه

---

## 🎉 النتيجة النهائية

نظام دفعات **احترافي، آمن، وسلس** يوفر:
- 📊 رؤية واضحة لجميع الدفعات
- 🔒 حماية تلقائية ضد الأخطاء
- 🎨 واجهة مستخدم جميلة
- ⚡ أداء عالي
- 🧹 كود نظيف ومنظم
