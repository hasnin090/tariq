-- ============================================================================
-- 🔐 إصلاح أمني عاجل: إزالة صلاحيات anon من جميع الجداول
-- ============================================================================
-- المشكلة: السياسات الحالية تسمح للمستخدمين غير المسجلين (anon) بالوصول للبيانات
-- الحل: تقييد الوصول للمستخدمين المصرح لهم (authenticated) فقط
-- تاريخ: 2026-01-05
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣ إصلاح جدول scheduled_payments
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "scheduled_payments_select_policy" ON scheduled_payments;
DROP POLICY IF EXISTS "scheduled_payments_insert_policy" ON scheduled_payments;
DROP POLICY IF EXISTS "scheduled_payments_update_policy" ON scheduled_payments;
DROP POLICY IF EXISTS "scheduled_payments_delete_policy" ON scheduled_payments;

CREATE POLICY "scheduled_payments_select_policy" 
ON scheduled_payments 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "scheduled_payments_insert_policy" 
ON scheduled_payments 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "scheduled_payments_update_policy" 
ON scheduled_payments 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "scheduled_payments_delete_policy" 
ON scheduled_payments 
FOR DELETE 
TO authenticated
USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2️⃣ إصلاح جدول payment_notifications
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "payment_notifications_select_policy" ON payment_notifications;
DROP POLICY IF EXISTS "payment_notifications_insert_policy" ON payment_notifications;
DROP POLICY IF EXISTS "payment_notifications_update_policy" ON payment_notifications;
DROP POLICY IF EXISTS "payment_notifications_delete_policy" ON payment_notifications;

CREATE POLICY "payment_notifications_select_policy" 
ON payment_notifications
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "payment_notifications_insert_policy" 
ON payment_notifications
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "payment_notifications_update_policy" 
ON payment_notifications
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "payment_notifications_delete_policy" 
ON payment_notifications
FOR DELETE 
TO authenticated
USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3️⃣ التحقق من جميع الجداول الأخرى وإصلاحها
-- ═══════════════════════════════════════════════════════════════════════════

-- جدول payments
DROP POLICY IF EXISTS "payments_select" ON payments;
DROP POLICY IF EXISTS "payments_insert" ON payments;
DROP POLICY IF EXISTS "payments_update" ON payments;
DROP POLICY IF EXISTS "payments_delete" ON payments;

CREATE POLICY "payments_select" ON payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "payments_insert" ON payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "payments_update" ON payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "payments_delete" ON payments FOR DELETE TO authenticated USING (true);

-- جدول bookings
DROP POLICY IF EXISTS "bookings_select" ON bookings;
DROP POLICY IF EXISTS "bookings_insert" ON bookings;
DROP POLICY IF EXISTS "bookings_update" ON bookings;
DROP POLICY IF EXISTS "bookings_delete" ON bookings;

CREATE POLICY "bookings_select" ON bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "bookings_insert" ON bookings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bookings_update" ON bookings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "bookings_delete" ON bookings FOR DELETE TO authenticated USING (true);

-- جدول expenses
DROP POLICY IF EXISTS "expenses_select" ON expenses;
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_update" ON expenses;
DROP POLICY IF EXISTS "expenses_delete" ON expenses;

CREATE POLICY "expenses_select" ON expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "expenses_insert" ON expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "expenses_update" ON expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "expenses_delete" ON expenses FOR DELETE TO authenticated USING (true);

-- جدول customers
DROP POLICY IF EXISTS "customers_select" ON customers;
DROP POLICY IF EXISTS "customers_insert" ON customers;
DROP POLICY IF EXISTS "customers_update" ON customers;
DROP POLICY IF EXISTS "customers_delete" ON customers;

CREATE POLICY "customers_select" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "customers_insert" ON customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "customers_update" ON customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "customers_delete" ON customers FOR DELETE TO authenticated USING (true);

-- جدول units
DROP POLICY IF EXISTS "units_select" ON units;
DROP POLICY IF EXISTS "units_insert" ON units;
DROP POLICY IF EXISTS "units_update" ON units;
DROP POLICY IF EXISTS "units_delete" ON units;

CREATE POLICY "units_select" ON units FOR SELECT TO authenticated USING (true);
CREATE POLICY "units_insert" ON units FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "units_update" ON units FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "units_delete" ON units FOR DELETE TO authenticated USING (true);

-- جدول projects
DROP POLICY IF EXISTS "projects_select" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update" ON projects;
DROP POLICY IF EXISTS "projects_delete" ON projects;

CREATE POLICY "projects_select" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_insert" ON projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "projects_update" ON projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "projects_delete" ON projects FOR DELETE TO authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ تم! جميع الجداول الآن محمية من الوصول غير المصرح
-- ═══════════════════════════════════════════════════════════════════════════
