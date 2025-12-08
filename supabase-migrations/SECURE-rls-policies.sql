-- ============================================================================
-- سياسات RLS آمنة ومحسّنة
-- ============================================================================
-- هذا الملف يحتوي على سياسات RLS آمنة تعتمد على:
-- 1. التحقق من هوية المستخدم (auth.uid())
-- 2. التحقق من دور المستخدم (role من جدول users)
-- 3. منع الوصول غير المصرح به
-- ============================================================================

-- دالة مساعدة للحصول على دور المستخدم الحالي
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- دالة مساعدة للتحقق من أن المستخدم Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'Admin'
  );
$$;

-- دالة مساعدة للتحقق من أن المستخدم له صلاحيات (Admin أو Accounting)
CREATE OR REPLACE FUNCTION public.has_accounting_access()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role IN ('Admin', 'Accounting')
  );
$$;

-- ============================================================================
-- حذف جميع السياسات القديمة
-- ============================================================================
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                       r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ============================================================================
-- سياسات المستخدمين (Users)
-- ============================================================================
-- يمكن لأي مستخدم مسجل رؤية المستخدمين الآخرين (للعرض في القوائم)
CREATE POLICY "users_select_policy" ON public.users 
FOR SELECT 
TO authenticated
USING (true);

-- فقط Admin يمكنه إضافة مستخدمين جدد
CREATE POLICY "users_insert_policy" ON public.users 
FOR INSERT 
TO authenticated
WITH CHECK (is_admin());

-- Admin يمكنه تعديل أي مستخدم، المستخدمون العاديون يمكنهم تعديل حساباتهم فقط
CREATE POLICY "users_update_policy" ON public.users 
FOR UPDATE 
TO authenticated
USING (is_admin() OR id = auth.uid())
WITH CHECK (is_admin() OR id = auth.uid());

-- فقط Admin يمكنه حذف المستخدمين
CREATE POLICY "users_delete_policy" ON public.users 
FOR DELETE 
TO authenticated
USING (is_admin());

-- ============================================================================
-- سياسات الإعدادات (Settings)
-- ============================================================================
-- يمكن لجميع المستخدمين رؤية الإعدادات
CREATE POLICY "settings_select_policy" ON public.settings 
FOR SELECT 
TO authenticated
USING (true);

-- فقط Admin يمكنه تعديل الإعدادات
CREATE POLICY "settings_insert_policy" ON public.settings 
FOR INSERT 
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "settings_update_policy" ON public.settings 
FOR UPDATE 
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "settings_delete_policy" ON public.settings 
FOR DELETE 
TO authenticated
USING (is_admin());

-- ============================================================================
-- سياسات المشاريع (Projects)
-- ============================================================================
-- جميع المستخدمين يمكنهم رؤية المشاريع
CREATE POLICY "projects_select_policy" ON public.projects 
FOR SELECT 
TO authenticated
USING (true);

-- فقط Admin يمكنه إدارة المشاريع
CREATE POLICY "projects_insert_policy" ON public.projects 
FOR INSERT 
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "projects_update_policy" ON public.projects 
FOR UPDATE 
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "projects_delete_policy" ON public.projects 
FOR DELETE 
TO authenticated
USING (is_admin());

-- ============================================================================
-- سياسات الوحدات (Units)
-- ============================================================================
CREATE POLICY "units_select_policy" ON public.units 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "units_insert_policy" ON public.units 
FOR INSERT 
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "units_update_policy" ON public.units 
FOR UPDATE 
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "units_delete_policy" ON public.units 
FOR DELETE 
TO authenticated
USING (is_admin());

-- ============================================================================
-- سياسات العملاء (Customers)
-- ============================================================================
CREATE POLICY "customers_select_policy" ON public.customers 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "customers_insert_policy" ON public.customers 
FOR INSERT 
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "customers_update_policy" ON public.customers 
FOR UPDATE 
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "customers_delete_policy" ON public.customers 
FOR DELETE 
TO authenticated
USING (is_admin());

-- ============================================================================
-- سياسات الحجوزات (Bookings)
-- ============================================================================
CREATE POLICY "bookings_select_policy" ON public.bookings 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "bookings_insert_policy" ON public.bookings 
FOR INSERT 
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "bookings_update_policy" ON public.bookings 
FOR UPDATE 
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "bookings_delete_policy" ON public.bookings 
FOR DELETE 
TO authenticated
USING (is_admin());

-- ============================================================================
-- سياسات المدفوعات (Payments)
-- ============================================================================
-- Admin و Accounting يمكنهم رؤية المدفوعات
CREATE POLICY "payments_select_policy" ON public.payments 
FOR SELECT 
TO authenticated
USING (has_accounting_access());

CREATE POLICY "payments_insert_policy" ON public.payments 
FOR INSERT 
TO authenticated
WITH CHECK (has_accounting_access());

CREATE POLICY "payments_update_policy" ON public.payments 
FOR UPDATE 
TO authenticated
USING (has_accounting_access())
WITH CHECK (has_accounting_access());

CREATE POLICY "payments_delete_policy" ON public.payments 
FOR DELETE 
TO authenticated
USING (is_admin());

-- ============================================================================
-- سياسات المصروفات (Expenses)
-- ============================================================================
CREATE POLICY "expenses_select_policy" ON public.expenses 
FOR SELECT 
TO authenticated
USING (has_accounting_access());

CREATE POLICY "expenses_insert_policy" ON public.expenses 
FOR INSERT 
TO authenticated
WITH CHECK (has_accounting_access());

CREATE POLICY "expenses_update_policy" ON public.expenses 
FOR UPDATE 
TO authenticated
USING (has_accounting_access())
WITH CHECK (has_accounting_access());

CREATE POLICY "expenses_delete_policy" ON public.expenses 
FOR DELETE 
TO authenticated
USING (is_admin());

-- ============================================================================
-- سياسات الموظفين (Employees)
-- ============================================================================
CREATE POLICY "employees_select_policy" ON public.employees 
FOR SELECT 
TO authenticated
USING (has_accounting_access());

CREATE POLICY "employees_insert_policy" ON public.employees 
FOR INSERT 
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "employees_update_policy" ON public.employees 
FOR UPDATE 
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "employees_delete_policy" ON public.employees 
FOR DELETE 
TO authenticated
USING (is_admin());

-- ============================================================================
-- سياسات الموردين (Vendors)
-- ============================================================================
CREATE POLICY "vendors_select_policy" ON public.vendors 
FOR SELECT 
TO authenticated
USING (has_accounting_access());

CREATE POLICY "vendors_insert_policy" ON public.vendors 
FOR INSERT 
TO authenticated
WITH CHECK (has_accounting_access());

CREATE POLICY "vendors_update_policy" ON public.vendors 
FOR UPDATE 
TO authenticated
USING (has_accounting_access())
WITH CHECK (has_accounting_access());

CREATE POLICY "vendors_delete_policy" ON public.vendors 
FOR DELETE 
TO authenticated
USING (is_admin());

-- ============================================================================
-- سياسات المعاملات (Transactions)
-- ============================================================================
CREATE POLICY "transactions_select_policy" ON public.transactions 
FOR SELECT 
TO authenticated
USING (has_accounting_access());

CREATE POLICY "transactions_insert_policy" ON public.transactions 
FOR INSERT 
TO authenticated
WITH CHECK (has_accounting_access());

CREATE POLICY "transactions_update_policy" ON public.transactions 
FOR UPDATE 
TO authenticated
USING (has_accounting_access())
WITH CHECK (has_accounting_access());

CREATE POLICY "transactions_delete_policy" ON public.transactions 
FOR DELETE 
TO authenticated
USING (is_admin());

-- ============================================================================
-- سياسات المستندات (Documents)
-- ============================================================================
-- يمكن لجميع المستخدمين رؤية المستندات
CREATE POLICY "documents_select_policy" ON public.documents 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "documents_insert_policy" ON public.documents 
FOR INSERT 
TO authenticated
WITH CHECK (true); -- أي مستخدم يمكنه رفع مستندات

CREATE POLICY "documents_update_policy" ON public.documents 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- فقط Admin يمكنه حذف المستندات
CREATE POLICY "documents_delete_policy" ON public.documents 
FOR DELETE 
TO authenticated
USING (is_admin());

-- ============================================================================
-- سياسات سجل النشاطات (Activity Logs)
-- ============================================================================
-- يمكن لجميع المستخدمين إضافة سجلات
CREATE POLICY "activity_logs_insert_policy" ON public.activity_logs 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- فقط Admin يمكنه رؤية جميع السجلات
CREATE POLICY "activity_logs_select_policy" ON public.activity_logs 
FOR SELECT 
TO authenticated
USING (is_admin());

-- لا يمكن تعديل أو حذف السجلات (للأمان)
-- يمكن للـ Admin فقط حذفها إذا لزم الأمر
CREATE POLICY "activity_logs_delete_policy" ON public.activity_logs 
FOR DELETE 
TO authenticated
USING (is_admin());

-- ============================================================================
-- سياسات الإشعارات (Notifications)
-- ============================================================================
-- يمكن للمستخدمين رؤية إشعاراتهم فقط
CREATE POLICY "notifications_select_policy" ON public.notifications 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "notifications_insert_policy" ON public.notifications 
FOR INSERT 
TO authenticated
WITH CHECK (true); -- النظام يمكنه إنشاء إشعارات لأي مستخدم

-- المستخدم يمكنه تعديل إشعاراته فقط (مثل تحديد "مقروء")
CREATE POLICY "notifications_update_policy" ON public.notifications 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid() OR is_admin())
WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "notifications_delete_policy" ON public.notifications 
FOR DELETE 
TO authenticated
USING (user_id = auth.uid() OR is_admin());

-- ============================================================================
-- التحقق من السياسات
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles::text,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
