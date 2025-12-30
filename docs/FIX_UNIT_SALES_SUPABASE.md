# إصلاح نظام المبيعات - نقل البيانات من localStorage إلى Supabase

## المشكلة

عمليات البيع كانت تُحفظ في **localStorage** فقط، مما يعني:
- ❌ البيانات تختفي عند مسح الـ cache
- ❌ لا تظهر على الأجهزة الأخرى
- ❌ لا توجد نسخة احتياطية
- ❌ لا يمكن مشاركة البيانات بين المستخدمين

## الحل

تم إنشاء جدول `unit_sales` في قاعدة البيانات Supabase ونقل جميع عمليات الحفظ والقراءة إليه.

## التحديثات المطبقة

### 1. إنشاء جدول unit_sales في قاعدة البيانات

**الملف**: `supabase-migrations/create-unit-sales-table.sql`

الجدول يحتوي على:
- `id`: معرف فريد
- `unit_id`: معرف الوحدة (مرتبط بجدول units)
- `customer_id`: معرف العميل (مرتبط بجدول customers)
- `sale_price`: سعر الوحدة الأصلي
- `final_sale_price`: سعر البيع النهائي
- `sale_date`: تاريخ البيع
- `account_id`: الحساب المالي
- `transaction_id`: معرف المعاملة المالية
- `project_id`: معرف المشروع
- `created_at`: تاريخ الإنشاء
- `updated_at`: تاريخ آخر تحديث

### 2. تحديث خدمة unitSalesService

**الملف**: `src/services/supabaseService.ts`

التحديثات:
- ✅ جلب اسم الوحدة واسم العميل تلقائياً باستخدام JOIN
- ✅ حفظ البيانات في Supabase بدلاً من localStorage
- ✅ تحويل تلقائي بين snake_case (قاعدة البيانات) و camelCase (الكود)

### 3. تحديث صفحة المبيعات

**الملف**: `components/pages/sales/UnitSales.tsx`

التحديثات:
- ✅ جلب البيانات من Supabase بدلاً من localStorage
- ✅ حفظ عمليات البيع الجديدة في Supabase
- ✅ إزالة جميع العمليات المتعلقة بـ localStorage

## خطوات التطبيق

### 1. تشغيل Migration في Supabase

1. افتح [Supabase Dashboard](https://app.supabase.com/)
2. اختر المشروع الخاص بك
3. انتقل إلى **SQL Editor**
4. انسخ محتوى ملف `supabase-migrations/create-unit-sales-table.sql`
5. الصقه في SQL Editor
6. اضغط على **Run** أو **F5**

يجب أن ترى رسالة: **"جدول unit_sales تم إنشاؤه بنجاح!"**

### 2. نقل البيانات القديمة (اختياري)

إذا كان لديك بيانات محفوظة في localStorage:

```javascript
// افتح Console في المتصفح (F12) وشغّل:
const oldSales = JSON.parse(localStorage.getItem('unitSales') || '[]');
console.log('عدد المبيعات القديمة:', oldSales.length);
console.log(oldSales);

// انسخ البيانات واحفظها في ملف نصي للاحتفاظ بها
```

ثم أعد إدخال البيانات يدوياً أو استخدم SQL INSERT:

```sql
INSERT INTO unit_sales (
    id, unit_id, customer_id, sale_price, 
    final_sale_price, sale_date, account_id, 
    transaction_id, project_id
) VALUES
    ('sale_xxx', 'unit_xxx', 'customer_xxx', 12000000, 
     12000000, '2025-12-30', 'account_xxx', 
     'transaction_xxx', 'project_xxx');
```

### 3. إعادة تشغيل التطبيق

```bash
# إذا كان التطبيق يعمل، أعد تشغيله
npm run dev
```

## التحقق من النجاح

### 1. اختبار إضافة عملية بيع جديدة

1. انتقل إلى **سجل المبيعات**
2. اضغط على **تسجيل عملية بيع**
3. اختر وحدة متاحة وعميل
4. أدخل البيانات واحفظ
5. ✅ يجب أن تظهر العملية في الجدول فوراً

### 2. اختبار استمرارية البيانات

1. أعد تحميل الصفحة (F5)
2. ✅ يجب أن تظهر جميع عمليات البيع
3. افتح التطبيق من متصفح آخر أو جهاز آخر
4. ✅ يجب أن تظهر نفس البيانات

### 3. التحقق من قاعدة البيانات

افتح Supabase SQL Editor وشغّل:

```sql
SELECT 
    us.id,
    u.unit_number as unit_name,
    c.name as customer_name,
    us.final_sale_price,
    us.sale_date
FROM unit_sales us
LEFT JOIN units u ON us.unit_id = u.id
LEFT JOIN customers c ON us.customer_id = c.id
ORDER BY us.created_at DESC;
```

## الميزات الجديدة

### ✅ التزامن التلقائي
- البيانات تُحفظ في السحابة فوراً
- متاحة على جميع الأجهزة

### ✅ الأمان
- Row Level Security (RLS) مفعّل
- الصلاحيات محددة

### ✅ الأداء
- فهارس (Indexes) لتسريع الاستعلامات
- JOIN تلقائي مع جداول الوحدات والعملاء

### ✅ النسخ الاحتياطي
- Supabase يأخذ نسخ احتياطية تلقائية
- إمكانية استعادة البيانات

## حل المشاكل

### مشكلة: "relation 'unit_sales' does not exist"

**الحل**: لم يتم تشغيل الـ migration بعد. ارجع إلى خطوة 1.

### مشكلة: "permission denied for table unit_sales"

**الحل**: تأكد من تشغيل جزء RLS Policies في الـ migration.

### مشكلة: لا تظهر أسماء الوحدات/العملاء

**الحل**: تأكد من أن:
1. الوحدات والعملاء موجودة في قاعدة البيانات
2. الـ foreign keys صحيحة

## ملاحظات مهمة

- ❗ البيانات القديمة في localStorage لن تُحذف تلقائياً
- ❗ يجب نقل البيانات القديمة يدوياً إذا كانت مهمة
- ✅ بعد التأكد من نجاح النظام الجديد، يمكنك مسح localStorage:
  ```javascript
  localStorage.removeItem('unitSales');
  ```

## الملفات المعدّلة

- ✅ `supabase-migrations/create-unit-sales-table.sql` - إنشاء الجدول
- ✅ `src/services/supabaseService.ts` - تحديث الخدمة
- ✅ `components/pages/sales/UnitSales.tsx` - تحديث الواجهة

## الخلاصة

✅ **نظام المبيعات الآن يعمل بشكل كامل مع قاعدة البيانات**
✅ **البيانات محفوظة في السحابة**
✅ **متزامنة عبر جميع الأجهزة**
✅ **آمنة ومحمية**
