-- ============================================================================
-- 🔥 إصلاح عاجل: مشكلة RLS على جدول scheduled_payments
-- ============================================================================
-- الخطأ: new row violates row-level security policy
-- السبب: السياسات الأمنية تمنع INSERT/UPDATE/DELETE
-- الحل: إعادة إنشاء السياسات بشكل صحيح
-- ============================================================================

-- 1️⃣ حذف جميع السياسات القديمة
DROP POLICY IF EXISTS "Allow all for authenticated" ON scheduled_payments;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON scheduled_payments;
DROP POLICY IF EXISTS "scheduled_payments_select_policy" ON scheduled_payments;
DROP POLICY IF EXISTS "scheduled_payments_insert_policy" ON scheduled_payments;
DROP POLICY IF EXISTS "scheduled_payments_update_policy" ON scheduled_payments;
DROP POLICY IF EXISTS "scheduled_payments_delete_policy" ON scheduled_payments;

DROP POLICY IF EXISTS "Allow all for authenticated" ON payment_notifications;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payment_notifications;
DROP POLICY IF EXISTS "payment_notifications_select_policy" ON payment_notifications;
DROP POLICY IF EXISTS "payment_notifications_insert_policy" ON payment_notifications;
DROP POLICY IF EXISTS "payment_notifications_update_policy" ON payment_notifications;
DROP POLICY IF EXISTS "payment_notifications_delete_policy" ON payment_notifications;

-- 2️⃣ التأكد من تفعيل RLS
ALTER TABLE scheduled_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scheduled_payments_select_policy" 
ON scheduled_payments 
FOR SELECT 
TO anon, authenticated
USING (true);

CREATE POLICY "scheduled_payments_insert_policy" 
ON scheduled_payments 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "scheduled_payments_update_policy" 
ON scheduled_payments 
FOR UPDATE 
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "scheduled_payments_delete_policy" 
ON scheduled_payments 
FOR DELETE 
TO anon, authenticated
USING (true);


CREATE POLICY "payment_notifications_select_policy" 
ON payment_notifications
FOR SELECT 
TO anon, authenticated
USING (true);

CREATE POLICY "payment_notifications_insert_policy" 
ON payment_notifications
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "payment_notifications_update_policy" 
ON payment_notifications
FOR UPDATE 
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "payment_notifications_delete_policy" 
ON payment_notifications
FOR DELETE 
TO anon, authenticated
USING (true);

-- 5️⃣ التحقق من السياسات (اختياري - للمراجعة)
-- يمكنك تشغيل هذا الاستعلام للتحقق:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('scheduled_payments', 'payment_notifications')
-- ORDER BY tablename, policyname;

-- ============================================================================
-- ✅ تم! الآن يمكنك إنشاء الدفعات المجدولة بدون مشاكل
-- ============================================================================

-- ملاحظة مهمة:
-- إذا أردت تقييد الصلاحيات لاحقاً (مثلاً: فقط Admin يمكنه الحذف)
-- يمكنك تعديل السياسات بحيث تتحقق من دور المستخدم:
--
-- مثال:
-- CREATE POLICY "scheduled_payments_delete_admin_only" 
-- ON scheduled_payments
-- FOR DELETE 
-- TO authenticated
-- USING (
--     EXISTS (
--         SELECT 1 FROM users 
--         WHERE users.id = auth.uid() 
--         AND users.role = 'Admin'
--     )
-- );
