# إضافة عمود العميل في جدول الوحدات

## نظرة عامة
تم تحديث نظام إدارة الوحدات لعرض اسم العميل/المستفيد في جدول الوحدات السكنية عند الحجز أو البيع.

## التغييرات المطبقة

### 1. تحديث خدمة الوحدات (unitsService)

#### ملف: `src/services/supabaseService.ts`

- **getAll()**: تم تحديثها لجلب اسم العميل من جدول `customers` باستخدام JOIN
  ```typescript
  .select(`
    *,
    customers:customer_id (
      id,
      name
    )
  `)
  ```

- **create()**: تم تحديثها لدعم حفظ `customerId` عند إنشاء وحدة جديدة

- **update()**: تم تحديثها لدعم تحديث `customerId` عند تعديل وحدة

### 2. تحديث صفحة الحجوزات

#### ملف: `components/pages/sales/Bookings.tsx`

- عند إنشاء حجز جديد: يتم تحديث الوحدة بـ `customerId` بالإضافة إلى تغيير الحالة إلى "Booked"
  ```typescript
  await unitsService.update(unit.id, { 
    status: 'Booked',
    customerId: customer.id
  });
  ```

- عند إلغاء الحجز: يتم إزالة `customerId` وإعادة الحالة إلى "Available"
  ```typescript
  await unitsService.update(unit.id, { 
    status: 'Available',
    customerId: null
  });
  ```

### 3. تحديث صفحة المبيعات

#### ملف: `components/pages/sales/UnitSales.tsx`

- عند بيع وحدة: يتم تحديث الوحدة بـ `customerId` بالإضافة إلى تغيير الحالة إلى "Sold"
  ```typescript
  await unitsService.update(unit.id, { 
    status: 'Sold',
    customerId: customer.id
  });
  ```

### 4. قاعدة البيانات

#### الجدول: `units`

الجدول يحتوي بالفعل على:
- `customer_id`: معرف العميل (مرجع إلى جدول `customers`)
- Index على `customer_id` لتحسين الأداء

#### ملفات Migration

1. **update-units-customer-id.sql**: 
   - يقوم بتحديث `customer_id` للوحدات الموجودة بناءً على الحجوزات والمبيعات الحالية
   - يزيل `customer_id` من الوحدات المتاحة

2. **trigger-update-unit-customer.sql**:
   - Trigger تلقائي يقوم بتحديث `customer_id` عند إنشاء أو تحديث حجز
   - Trigger تلقائي يقوم بتحديث `customer_id` عند بيع وحدة

### 5. واجهة المستخدم

#### ملف: `components/pages/sales/Units.tsx`

الجدول يعرض بالفعل عمود "العميل" في السطر 223:
```tsx
<th className="p-4 font-bold text-sm">العميل</th>
```

وفي السطر 235:
```tsx
<td className="p-4 text-slate-600 dark:text-slate-300">
  {unit.customerName || '—'}
</td>
```

## كيفية تطبيق التحديثات

### 1. تشغيل Migration لتحديث البيانات الموجودة

```bash
# يمكنك تشغيل الملف في Supabase SQL Editor أو عبر CLI
supabase db push supabase-migrations/update-units-customer-id.sql
```

### 2. تشغيل Triggers

```bash
supabase db push supabase-migrations/trigger-update-unit-customer.sql
```

### 3. إعادة تشغيل التطبيق

بعد تطبيق التغييرات في الكود، قم بإعادة تشغيل التطبيق:
```bash
npm run dev
```

## النتيجة النهائية

الآن عند:
1. **إنشاء حجز جديد**: سيظهر اسم العميل في جدول الوحدات تحت عمود "العميل"
2. **بيع وحدة**: سيظهر اسم المشتري في جدول الوحدات
3. **إلغاء حجز**: سيختفي اسم العميل من جدول الوحدات
4. **الوحدات المتاحة**: لن يظهر أي اسم عميل (سيظهر "—")

## اختبار التحديثات

1. قم بإنشاء حجز جديد
2. افتح صفحة "إدارة الوحدات"
3. تأكد من ظهور اسم العميل في عمود "العميل" للوحدة المحجوزة
4. قم بإلغاء الحجز
5. تأكد من اختفاء اسم العميل من عمود "العميل"

## ملاحظات

- حقل `customerName` في نوع `Unit` موجود بالفعل في `types.ts`
- قاعدة البيانات تدعم العلاقة بالفعل عبر `customer_id`
- الـ Triggers تضمن التحديث التلقائي لـ `customer_id` عند أي تغيير في الحجوزات
