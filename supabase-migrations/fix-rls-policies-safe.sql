-- ============================================================================
-- إصلاح سياسات RLS بشكل آمن (يتحقق من وجود الجداول)
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

-- إنشاء السياسات فقط للجداول الموجودة
DO $$
BEGIN
    -- سياسات المستخدمين
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        EXECUTE 'CREATE POLICY "users_select_policy" ON public.users FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "users_insert_policy" ON public.users FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "users_update_policy" ON public.users FOR UPDATE USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "users_delete_policy" ON public.users FOR DELETE USING (true)';
    END IF;

    -- سياسات الإعدادات
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'settings') THEN
        EXECUTE 'CREATE POLICY "settings_select_policy" ON public.settings FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "settings_insert_policy" ON public.settings FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "settings_update_policy" ON public.settings FOR UPDATE USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "settings_delete_policy" ON public.settings FOR DELETE USING (true)';
    END IF;

    -- سياسات المشاريع
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN
        EXECUTE 'CREATE POLICY "projects_select_policy" ON public.projects FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "projects_insert_policy" ON public.projects FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "projects_update_policy" ON public.projects FOR UPDATE USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "projects_delete_policy" ON public.projects FOR DELETE USING (true)';
    END IF;

    -- سياسات الوحدات
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'units') THEN
        EXECUTE 'CREATE POLICY "units_select_policy" ON public.units FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "units_insert_policy" ON public.units FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "units_update_policy" ON public.units FOR UPDATE USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "units_delete_policy" ON public.units FOR DELETE USING (true)';
    END IF;

    -- سياسات العملاء
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customers') THEN
        EXECUTE 'CREATE POLICY "customers_select_policy" ON public.customers FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "customers_insert_policy" ON public.customers FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "customers_update_policy" ON public.customers FOR UPDATE USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "customers_delete_policy" ON public.customers FOR DELETE USING (true)';
    END IF;

    -- سياسات الحجوزات
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bookings') THEN
        EXECUTE 'CREATE POLICY "bookings_select_policy" ON public.bookings FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "bookings_insert_policy" ON public.bookings FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "bookings_update_policy" ON public.bookings FOR UPDATE USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "bookings_delete_policy" ON public.bookings FOR DELETE USING (true)';
    END IF;

    -- سياسات المدفوعات
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        EXECUTE 'CREATE POLICY "payments_select_policy" ON public.payments FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "payments_insert_policy" ON public.payments FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "payments_update_policy" ON public.payments FOR UPDATE USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "payments_delete_policy" ON public.payments FOR DELETE USING (true)';
    END IF;

    -- سياسات مبيعات الوحدات
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'unit_sales') THEN
        EXECUTE 'CREATE POLICY "unit_sales_select_policy" ON public.unit_sales FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "unit_sales_insert_policy" ON public.unit_sales FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "unit_sales_update_policy" ON public.unit_sales FOR UPDATE USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "unit_sales_delete_policy" ON public.unit_sales FOR DELETE USING (true)';
    END IF;

    -- سياسات المصروفات
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expenses') THEN
        EXECUTE 'CREATE POLICY "expenses_select_policy" ON public.expenses FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "expenses_insert_policy" ON public.expenses FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "expenses_update_policy" ON public.expenses FOR UPDATE USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "expenses_delete_policy" ON public.expenses FOR DELETE USING (true)';
    END IF;

    -- سياسات الموظفين
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employees') THEN
        EXECUTE 'CREATE POLICY "employees_select_policy" ON public.employees FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "employees_insert_policy" ON public.employees FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "employees_update_policy" ON public.employees FOR UPDATE USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "employees_delete_policy" ON public.employees FOR DELETE USING (true)';
    END IF;

    -- سياسات الموردين
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vendors') THEN
        EXECUTE 'CREATE POLICY "vendors_select_policy" ON public.vendors FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "vendors_insert_policy" ON public.vendors FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "vendors_update_policy" ON public.vendors FOR UPDATE USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "vendors_delete_policy" ON public.vendors FOR DELETE USING (true)';
    END IF;

    -- سياسات فئات المصروفات
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expense_categories') THEN
        EXECUTE 'CREATE POLICY "expense_categories_select_policy" ON public.expense_categories FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "expense_categories_insert_policy" ON public.expense_categories FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "expense_categories_update_policy" ON public.expense_categories FOR UPDATE USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "expense_categories_delete_policy" ON public.expense_categories FOR DELETE USING (true)';
    END IF;

    -- سياسات أنواع الوحدات
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'unit_types') THEN
        EXECUTE 'CREATE POLICY "unit_types_select_policy" ON public.unit_types FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "unit_types_insert_policy" ON public.unit_types FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "unit_types_update_policy" ON public.unit_types FOR UPDATE USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "unit_types_delete_policy" ON public.unit_types FOR DELETE USING (true)';
    END IF;

    -- سياسات حالات الوحدات
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'unit_statuses') THEN
        EXECUTE 'CREATE POLICY "unit_statuses_select_policy" ON public.unit_statuses FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "unit_statuses_insert_policy" ON public.unit_statuses FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "unit_statuses_update_policy" ON public.unit_statuses FOR UPDATE USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "unit_statuses_delete_policy" ON public.unit_statuses FOR DELETE USING (true)';
    END IF;

    -- سياسات الحسابات
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'accounts') THEN
        EXECUTE 'CREATE POLICY "accounts_select_policy" ON public.accounts FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "accounts_insert_policy" ON public.accounts FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "accounts_update_policy" ON public.accounts FOR UPDATE USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "accounts_delete_policy" ON public.accounts FOR DELETE USING (true)';
    END IF;

    -- سياسات المعاملات
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transactions') THEN
        EXECUTE 'CREATE POLICY "transactions_select_policy" ON public.transactions FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "transactions_insert_policy" ON public.transactions FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "transactions_update_policy" ON public.transactions FOR UPDATE USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "transactions_delete_policy" ON public.transactions FOR DELETE USING (true)';
    END IF;

    -- سياسات المستندات
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'documents') THEN
        EXECUTE 'CREATE POLICY "documents_select_policy" ON public.documents FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "documents_insert_policy" ON public.documents FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "documents_update_policy" ON public.documents FOR UPDATE USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "documents_delete_policy" ON public.documents FOR DELETE USING (true)';
    END IF;

    -- سياسات سجل النشاطات
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_logs') THEN
        EXECUTE 'CREATE POLICY "activity_logs_select_policy" ON public.activity_logs FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "activity_logs_insert_policy" ON public.activity_logs FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "activity_logs_update_policy" ON public.activity_logs FOR UPDATE USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "activity_logs_delete_policy" ON public.activity_logs FOR DELETE USING (true)';
    END IF;

    -- سياسات الإشعارات
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        EXECUTE 'CREATE POLICY "notifications_select_policy" ON public.notifications FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "notifications_insert_policy" ON public.notifications FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "notifications_update_policy" ON public.notifications FOR UPDATE USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "notifications_delete_policy" ON public.notifications FOR DELETE USING (true)';
    END IF;
END $$;

-- ============================================================================
-- تم إصلاح السياسات بنجاح!
-- ============================================================================
