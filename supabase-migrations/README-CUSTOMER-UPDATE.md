# تشغيل Migrations لتحديث عمود العميل

## الخطوات

### 1. تسجيل الدخول إلى Supabase Dashboard

1. افتح [Supabase Dashboard](https://app.supabase.com/)
2. اختر المشروع الخاص بك
3. انتقل إلى **SQL Editor**

### 2. تشغيل Migration لتحديث البيانات الموجودة

1. انسخ محتوى ملف `supabase-migrations/update-units-customer-id.sql`
2. الصقه في SQL Editor
3. اضغط على **Run** أو **F5**

هذا سيقوم بـ:
- تحديث جميع الوحدات المحجوزة بـ customer_id من جدول الحجوزات
- تحديث جميع الوحدات المباعة بـ customer_id من جدول المبيعات
- إزالة customer_id من الوحدات المتاحة
- عرض إحصائيات النتائج

### 3. تشغيل Triggers للتحديث التلقائي (اختياري)

1. انسخ محتوى ملف `supabase-migrations/trigger-update-unit-customer.sql`
2. الصقه في SQL Editor
3. اضغط على **Run** أو **F5**

هذا سيقوم بإنشاء:
- Trigger يحدث customer_id تلقائياً عند إنشاء حجز
- Trigger يزيل customer_id تلقائياً عند إلغاء حجز
- Trigger يحدث customer_id تلقائياً عند بيع وحدة

## التحقق من النتائج

بعد تشغيل الـ migrations، يمكنك التحقق من النتائج بتشغيل:

```sql
SELECT 
    u.unit_number,
    u.status,
    c.name as customer_name
FROM units u
LEFT JOIN customers c ON u.customer_id = c.id
WHERE u.status IN ('Booked', 'Sold')
ORDER BY u.unit_number;
```

## ملاحظات مهمة

- الـ Triggers اختيارية لأن الكود في التطبيق يقوم بتحديث customer_id تلقائياً
- إذا كنت تفضل الاعتماد على قاعدة البيانات بالكامل، قم بتشغيل الـ Triggers
- إذا كنت تفضل الاعتماد على الكود في التطبيق، يمكنك تخطي الـ Triggers

## البديل: استخدام Supabase CLI

إذا كنت تستخدم Supabase CLI، يمكنك تشغيل:

```bash
supabase db push --file supabase-migrations/update-units-customer-id.sql
supabase db push --file supabase-migrations/trigger-update-unit-customer.sql
```
