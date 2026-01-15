-- ============================================================================
-- 🔍 اختبار وتشخيص نظام الدفعات المجدولة
-- ============================================================================
-- استخدم هذا السكريبت للتحقق من أن النظام يعمل بشكل صحيح
-- ============================================================================

-- 1️⃣ التحقق من وجود الجداول
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public'
        ) THEN '✅ موجود'
        ELSE '❌ غير موجود'
    END as status
FROM (
    VALUES ('scheduled_payments'), ('payment_notifications')
) AS tables(table_name);

-- 2️⃣ التحقق من تفعيل RLS
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ مُفعّل'
        ELSE '❌ معطّل'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('scheduled_payments', 'payment_notifications');

-- 3️⃣ عرض جميع السياسات الموجودة
SELECT 
    schemaname,
    tablename,
    policyname,
    CASE cmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END as operation,
    CASE 
        WHEN roles = '{authenticated}' THEN '✅ Authenticated'
        ELSE roles::text
    END as roles
FROM pg_policies
WHERE tablename IN ('scheduled_payments', 'payment_notifications')
ORDER BY tablename, policyname;

-- 4️⃣ عد الدفعات المجدولة الموجودة
SELECT 
    COUNT(*) as total_scheduled_payments,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,
    COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue,
    COUNT(CASE WHEN status = 'partially_paid' THEN 1 END) as partially_paid
FROM scheduled_payments;

-- 5️⃣ عرض آخر 5 دفعات مجدولة تم إنشاؤها
SELECT 
    sp.id,
    sp.booking_id,
    sp.installment_number,
    sp.due_date,
    sp.amount,
    sp.status,
    sp.created_at,
    b.status as booking_status,
    c.name as customer_name,
    u.unit_number
FROM scheduled_payments sp
LEFT JOIN bookings b ON sp.booking_id = b.id
LEFT JOIN customers c ON b.customer_id = c.id
LEFT JOIN units u ON b.unit_id = u.id
ORDER BY sp.created_at DESC
LIMIT 5;

-- 6️⃣ التحقق من الحجوزات التي لها خطة دفع
SELECT 
    b.id as booking_id,
    c.name as customer_name,
    u.unit_number,
    b.payment_plan_years,
    b.payment_frequency_months,
    b.total_installments,
    b.installment_amount,
    (
        SELECT COUNT(*) 
        FROM scheduled_payments sp 
        WHERE sp.booking_id = b.id
    ) as actual_scheduled_payments
FROM bookings b
LEFT JOIN customers c ON b.customer_id = c.id
LEFT JOIN units u ON b.unit_id = u.id
WHERE b.payment_plan_years IS NOT NULL
ORDER BY b.created_at DESC
LIMIT 10;

-- 7️⃣ التحقق من الـ Triggers
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    CASE tgtype & 1
        WHEN 1 THEN 'BEFORE'
        ELSE 'AFTER'
    END as timing,
    CASE tgtype & 66
        WHEN 2 THEN 'INSERT'
        WHEN 4 THEN 'DELETE'
        WHEN 8 THEN 'UPDATE'
        WHEN 16 THEN 'TRUNCATE'
        ELSE 'UNKNOWN'
    END as event,
    CASE tgenabled
        WHEN 'O' THEN '✅ مُفعّل'
        WHEN 'D' THEN '❌ معطّل'
        ELSE '⚠️ ' || tgenabled::text
    END as status
FROM pg_trigger
WHERE tgname IN ('auto_link_payment_trigger', 'update_booking_paid_amount_trigger')
ORDER BY tgname;

-- ============================================================================
-- 💡 تفسير النتائج
-- ============================================================================
-- 
-- ✅ إذا كانت جميع الفحوصات خضراء، النظام جاهز
-- ❌ إذا كانت RLS معطّلة أو السياسات غير موجودة، شغّل:
--    FIX-RLS-scheduled-payments.sql
-- 
-- ⚠️ إذا كان عدد scheduled_payments = 0 لكن توجد حجوزات بخطة دفع:
--    المشكلة في إنشاء الدفعات (تحقق من console logs في المتصفح)
-- 
-- 🔧 إذا كانت الدفعات موجودة لكن لا تظهر في الواجهة:
--    تحقق من أن الواجهة تستدعي getByBookingIds بشكل صحيح
-- 
-- ============================================================================
