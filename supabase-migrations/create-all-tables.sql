-- ============================================================================
-- إنشاء جميع الجداول المطلوبة للنظام
-- ============================================================================

-- 1. جدول المستخدمين (Users) - موجود مسبقاً، نضيف الأعمدة المطلوبة فقط
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;

-- إضافة قيد UNIQUE على username إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_username_key'
    ) THEN
        ALTER TABLE public.users ADD CONSTRAINT users_username_key UNIQUE (username);
    END IF;
END $$;

-- تحديث المستخدمين الحاليين
UPDATE public.users 
SET username = LOWER(REPLACE(name, ' ', '_')),
    password = '123456'
WHERE username IS NULL OR password IS NULL;

-- جعل الحقول إلزامية
ALTER TABLE public.users ALTER COLUMN username SET NOT NULL;
ALTER TABLE public.users ALTER COLUMN password SET NOT NULL;

-- 2. جدول الإعدادات (Settings) - موجود مسبقاً
-- لا حاجة لتعديل

-- 3. جدول المشاريع (Projects) - موجود مسبقاً
-- لا حاجة لتعديل

-- 4. جدول الوحدات (Units) - موجود مسبقاً
-- لا حاجة لتعديل

-- 5. جدول العملاء (Customers) - موجود مسبقاً
-- لا حاجة لتعديل

-- 6. جدول الحجوزات (Bookings) - موجود مسبقاً
-- لا حاجة لتعديل

-- 7. جدول المدفوعات (Payments) - موجود مسبقاً
-- لا حاجة لتعديل

-- 8. جدول مبيعات الوحدات (Unit Sales)
CREATE TABLE IF NOT EXISTS public.unit_sales (
    id TEXT PRIMARY KEY,
    unit_id TEXT REFERENCES public.units(id) ON DELETE CASCADE,
    unit_name TEXT,
    customer_id TEXT REFERENCES public.customers(id),
    customer_name TEXT,
    sale_price NUMERIC(15, 2),
    final_sale_price NUMERIC(15, 2),
    sale_date DATE NOT NULL,
    documents JSONB DEFAULT '[]',
    account_id TEXT,
    transaction_id TEXT,
    project_id TEXT REFERENCES public.projects(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. جدول المصروفات (Expenses)
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    expense_date DATE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    category_id TEXT,
    project_id TEXT REFERENCES public.projects(id),
    account_id TEXT,
    vendor_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. جدول الموظفين (Employees)
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position TEXT,
    salary NUMERIC(15, 2),
    phone TEXT,
    email TEXT,
    hire_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. جدول الموردين (Vendors)
CREATE TABLE IF NOT EXISTS public.vendors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. جدول فئات المصروفات (Expense Categories)
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. جدول أنواع الوحدات (Unit Types)
CREATE TABLE IF NOT EXISTS public.unit_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. جدول حالات الوحدات (Unit Statuses)
CREATE TABLE IF NOT EXISTS public.unit_statuses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. جدول الحسابات (Accounts)
CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('Bank', 'Cash')),
    balance NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. جدول المعاملات (Transactions)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT REFERENCES public.accounts(id) ON DELETE CASCADE,
    account_name TEXT,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    date DATE NOT NULL,
    description TEXT,
    amount NUMERIC(15, 2) NOT NULL,
    source_id TEXT,
    source_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. جدول المستندات (Documents)
CREATE TABLE IF NOT EXISTS public.documents (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE CASCADE,
    booking_id TEXT REFERENCES public.bookings(id) ON DELETE CASCADE,
    sale_id TEXT,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_type TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. جدول سجل النشاطات (Activity Logs)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id SERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    details TEXT,
    user_id UUID REFERENCES public.users(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 19. جدول الإشعارات (Notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('password_reset', 'general', 'alert')),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    username TEXT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES public.users(id)
);

-- ============================================================================
-- إنشاء الفهارس (Indexes) لتحسين الأداء
-- ============================================================================

-- فهارس جدول المصروفات
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project ON public.expenses(project_id);

-- فهارس جدول مبيعات الوحدات
CREATE INDEX IF NOT EXISTS idx_unit_sales_date ON public.unit_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_unit_sales_unit ON public.unit_sales(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_sales_customer ON public.unit_sales(customer_id);

-- فهارس جدول المعاملات
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions(account_id);

-- فهارس جدول الإشعارات
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- فهارس جدول المستندات
CREATE INDEX IF NOT EXISTS idx_documents_customer ON public.documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_booking ON public.documents(booking_id);
CREATE INDEX IF NOT EXISTS idx_documents_sale ON public.documents(sale_id);

-- فهارس جدول سجل النشاطات
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);

-- ============================================================================
-- تفعيل Row Level Security (RLS) على جميع الجداول
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- إنشاء سياسات RLS (Row Level Security Policies)
-- ============================================================================

-- حذف السياسات القديمة أولاً
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
CREATE POLICY "Allow users read" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow users insert" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow users update" ON public.users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow users delete" ON public.users FOR DELETE USING (true);

-- سياسات الإعدادات
CREATE POLICY "Allow settings read" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow settings update" ON public.settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow settings insert" ON public.settings FOR INSERT WITH CHECK (true);

-- سياسات عامة لباقي الجداول (الوصول الكامل)
CREATE POLICY "Allow all projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all units" ON public.units FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all bookings" ON public.bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all unit_sales" ON public.unit_sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all vendors" ON public.vendors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all expense_categories" ON public.expense_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all unit_types" ON public.unit_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all unit_statuses" ON public.unit_statuses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all accounts" ON public.accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- إنشاء مستخدم admin افتراضي
-- ============================================================================

-- حذف المستخدم القديم وإنشاء واحد جديد
DELETE FROM public.users WHERE username = 'admin';

INSERT INTO public.users (id, name, username, email, role, password, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'المدير',
    'admin',
    NULL,
    'Admin',
    '123456',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- ============================================================================
-- إضافة تعليقات توضيحية
-- ============================================================================

COMMENT ON TABLE public.unit_sales IS 'جدول مبيعات الوحدات';
COMMENT ON TABLE public.expenses IS 'جدول المصروفات';
COMMENT ON TABLE public.employees IS 'جدول الموظفين';
COMMENT ON TABLE public.vendors IS 'جدول الموردين';
COMMENT ON TABLE public.expense_categories IS 'جدول فئات المصروفات';
COMMENT ON TABLE public.unit_types IS 'جدول أنواع الوحدات';
COMMENT ON TABLE public.unit_statuses IS 'جدول حالات الوحدات';
COMMENT ON TABLE public.accounts IS 'جدول الحسابات المالية';
COMMENT ON TABLE public.transactions IS 'جدول المعاملات المالية';
COMMENT ON TABLE public.documents IS 'جدول المستندات والملفات';
COMMENT ON TABLE public.activity_logs IS 'جدول سجل النشاطات';
COMMENT ON TABLE public.notifications IS 'جدول الإشعارات للمدراء';

COMMENT ON COLUMN public.notifications.type IS 'نوع الإشعار: password_reset لطلبات استعادة كلمة المرور';
COMMENT ON COLUMN public.notifications.user_id IS 'معرف المستخدم المرتبط بالإشعار';
COMMENT ON COLUMN public.notifications.is_read IS 'هل تم قراءة الإشعار';
COMMENT ON COLUMN public.notifications.resolved_at IS 'تاريخ حل المشكلة';

-- ============================================================================
-- إضافة بيانات تجريبية للجداول الأساسية (اختياري)
-- ============================================================================

-- إضافة بعض أنواع الوحدات
INSERT INTO public.unit_types (id, name) VALUES 
    ('type_apt', 'شقة'),
    ('type_villa', 'فيلا'),
    ('type_shop', 'محل تجاري'),
    ('type_office', 'مكتب')
ON CONFLICT (name) DO NOTHING;

-- إضافة بعض حالات الوحدات
INSERT INTO public.unit_statuses (id, name, color) VALUES 
    ('status_available', 'متاح', '#10b981'),
    ('status_reserved', 'محجوز', '#f59e0b'),
    ('status_sold', 'مباع', '#ef4444')
ON CONFLICT (name) DO NOTHING;

-- إضافة بعض فئات المصروفات
INSERT INTO public.expense_categories (id, name, description) VALUES 
    ('cat_salaries', 'رواتب', 'رواتب الموظفين'),
    ('cat_maintenance', 'صيانة', 'مصاريف الصيانة'),
    ('cat_utilities', 'مرافق', 'كهرباء وماء وغاز'),
    ('cat_marketing', 'تسويق', 'مصاريف الإعلان والتسويق'),
    ('cat_other', 'أخرى', 'مصاريف متنوعة')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- تم بنجاح! 
-- ============================================================================
