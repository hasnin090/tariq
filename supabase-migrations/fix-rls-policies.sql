-- ============================================================================
-- إصلاح سياسات RLS لجميع الجداول
-- ============================================================================

-- حذف جميع السياسات القديمة
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

-- سياسات المستخدمين
CREATE POLICY "users_select_policy" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_insert_policy" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update_policy" ON public.users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "users_delete_policy" ON public.users FOR DELETE USING (true);

-- سياسات الإعدادات
CREATE POLICY "settings_select_policy" ON public.settings FOR SELECT USING (true);
CREATE POLICY "settings_insert_policy" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "settings_update_policy" ON public.settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "settings_delete_policy" ON public.settings FOR DELETE USING (true);

-- سياسات المشاريع
CREATE POLICY "projects_select_policy" ON public.projects FOR SELECT USING (true);
CREATE POLICY "projects_insert_policy" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "projects_update_policy" ON public.projects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "projects_delete_policy" ON public.projects FOR DELETE USING (true);

-- سياسات الوحدات
CREATE POLICY "units_select_policy" ON public.units FOR SELECT USING (true);
CREATE POLICY "units_insert_policy" ON public.units FOR INSERT WITH CHECK (true);
CREATE POLICY "units_update_policy" ON public.units FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "units_delete_policy" ON public.units FOR DELETE USING (true);

-- سياسات العملاء
CREATE POLICY "customers_select_policy" ON public.customers FOR SELECT USING (true);
CREATE POLICY "customers_insert_policy" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "customers_update_policy" ON public.customers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "customers_delete_policy" ON public.customers FOR DELETE USING (true);

-- سياسات الحجوزات
CREATE POLICY "bookings_select_policy" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "bookings_insert_policy" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "bookings_update_policy" ON public.bookings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "bookings_delete_policy" ON public.bookings FOR DELETE USING (true);

-- سياسات المدفوعات
CREATE POLICY "payments_select_policy" ON public.payments FOR SELECT USING (true);
CREATE POLICY "payments_insert_policy" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "payments_update_policy" ON public.payments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "payments_delete_policy" ON public.payments FOR DELETE USING (true);

-- سياسات مبيعات الوحدات
CREATE POLICY "unit_sales_select_policy" ON public.unit_sales FOR SELECT USING (true);
CREATE POLICY "unit_sales_insert_policy" ON public.unit_sales FOR INSERT WITH CHECK (true);
CREATE POLICY "unit_sales_update_policy" ON public.unit_sales FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "unit_sales_delete_policy" ON public.unit_sales FOR DELETE USING (true);

-- سياسات المصروفات
CREATE POLICY "expenses_select_policy" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "expenses_insert_policy" ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "expenses_update_policy" ON public.expenses FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "expenses_delete_policy" ON public.expenses FOR DELETE USING (true);

-- سياسات الموظفين
CREATE POLICY "employees_select_policy" ON public.employees FOR SELECT USING (true);
CREATE POLICY "employees_insert_policy" ON public.employees FOR INSERT WITH CHECK (true);
CREATE POLICY "employees_update_policy" ON public.employees FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "employees_delete_policy" ON public.employees FOR DELETE USING (true);

-- سياسات الموردين
CREATE POLICY "vendors_select_policy" ON public.vendors FOR SELECT USING (true);
CREATE POLICY "vendors_insert_policy" ON public.vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "vendors_update_policy" ON public.vendors FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "vendors_delete_policy" ON public.vendors FOR DELETE USING (true);

-- سياسات فئات المصروفات
CREATE POLICY "expense_categories_select_policy" ON public.expense_categories FOR SELECT USING (true);
CREATE POLICY "expense_categories_insert_policy" ON public.expense_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "expense_categories_update_policy" ON public.expense_categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "expense_categories_delete_policy" ON public.expense_categories FOR DELETE USING (true);

-- سياسات أنواع الوحدات
CREATE POLICY "unit_types_select_policy" ON public.unit_types FOR SELECT USING (true);
CREATE POLICY "unit_types_insert_policy" ON public.unit_types FOR INSERT WITH CHECK (true);
CREATE POLICY "unit_types_update_policy" ON public.unit_types FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "unit_types_delete_policy" ON public.unit_types FOR DELETE USING (true);

-- سياسات حالات الوحدات
CREATE POLICY "unit_statuses_select_policy" ON public.unit_statuses FOR SELECT USING (true);
CREATE POLICY "unit_statuses_insert_policy" ON public.unit_statuses FOR INSERT WITH CHECK (true);
CREATE POLICY "unit_statuses_update_policy" ON public.unit_statuses FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "unit_statuses_delete_policy" ON public.unit_statuses FOR DELETE USING (true);

-- سياسات الحسابات
CREATE POLICY "accounts_select_policy" ON public.accounts FOR SELECT USING (true);
CREATE POLICY "accounts_insert_policy" ON public.accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "accounts_update_policy" ON public.accounts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "accounts_delete_policy" ON public.accounts FOR DELETE USING (true);

-- سياسات المعاملات
CREATE POLICY "transactions_select_policy" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "transactions_insert_policy" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "transactions_update_policy" ON public.transactions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "transactions_delete_policy" ON public.transactions FOR DELETE USING (true);

-- سياسات المستندات
CREATE POLICY "documents_select_policy" ON public.documents FOR SELECT USING (true);
CREATE POLICY "documents_insert_policy" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "documents_update_policy" ON public.documents FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "documents_delete_policy" ON public.documents FOR DELETE USING (true);

-- سياسات سجل النشاطات
CREATE POLICY "activity_logs_select_policy" ON public.activity_logs FOR SELECT USING (true);
CREATE POLICY "activity_logs_insert_policy" ON public.activity_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "activity_logs_update_policy" ON public.activity_logs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "activity_logs_delete_policy" ON public.activity_logs FOR DELETE USING (true);

-- سياسات الإشعارات
CREATE POLICY "notifications_select_policy" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "notifications_insert_policy" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update_policy" ON public.notifications FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "notifications_delete_policy" ON public.notifications FOR DELETE USING (true);

-- ============================================================================
-- تم إصلاح السياسات بنجاح!
-- ============================================================================
