-- ============================================================================
-- Fix RLS Policies and Add Settings Table
-- ============================================================================

-- 1. إنشاء جدول الإعدادات (Settings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- إدراج الإعدادات الافتراضية
INSERT INTO
    public.settings (key, value, description)
VALUES (
        'systemCurrency',
        'ريال',
        'العملة المستخدمة في النظام'
    ),
    (
        'systemDecimalPlaces',
        '2',
        'عدد الخانات العشرية'
    ),
    (
        'companyName',
        'شركة العقارات',
        'اسم الشركة'
    ),
    (
        'companyPhone',
        '',
        'رقم هاتف الشركة'
    ),
    (
        'companyEmail',
        '',
        'البريد الإلكتروني للشركة'
    ),
    (
        'companyAddress',
        '',
        'عنوان الشركة'
    ) ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 2. تفعيل RLS على جميع الجداول
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. حذف السياسات القديمة إن وجدت
-- ============================================================================
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.users;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.projects;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.accounts;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.transactions;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.customers;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.units;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.bookings;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.payments;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.expenses;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.vendors;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.settings;

-- ============================================================================
-- 4. إنشاء سياسات RLS جديدة - السماح لجميع المستخدمين المصادقين
-- ============================================================================

-- Users
CREATE POLICY "Allow all for authenticated users" ON public.users FOR ALL USING (
    auth.role () = 'authenticated'
);

-- Projects
CREATE POLICY "Allow all for authenticated users" ON public.projects FOR ALL USING (
    auth.role () = 'authenticated'
);

-- Accounts
CREATE POLICY "Allow all for authenticated users" ON public.accounts FOR ALL USING (
    auth.role () = 'authenticated'
);

-- Transactions
CREATE POLICY "Allow all for authenticated users" ON public.transactions FOR ALL USING (
    auth.role () = 'authenticated'
);

-- Customers
CREATE POLICY "Allow all for authenticated users" ON public.customers FOR ALL USING (
    auth.role () = 'authenticated'
);

-- Units
CREATE POLICY "Allow all for authenticated users" ON public.units FOR ALL USING (
    auth.role () = 'authenticated'
);

-- Bookings
CREATE POLICY "Allow all for authenticated users" ON public.bookings FOR ALL USING (
    auth.role () = 'authenticated'
);

-- Payments
CREATE POLICY "Allow all for authenticated users" ON public.payments FOR ALL USING (
    auth.role () = 'authenticated'
);

-- Expenses
CREATE POLICY "Allow all for authenticated users" ON public.expenses FOR ALL USING (
    auth.role () = 'authenticated'
);

-- Vendors
CREATE POLICY "Allow all for authenticated users" ON public.vendors FOR ALL USING (
    auth.role () = 'authenticated'
);

-- Settings
CREATE POLICY "Allow all for authenticated users" ON public.settings FOR ALL USING (
    auth.role () = 'authenticated'
);

-- ============================================================================
-- 5. منح الصلاحيات للمستخدمين المصادقين
-- ============================================================================
GRANT ALL ON public.users TO authenticated;

GRANT ALL ON public.projects TO authenticated;

GRANT ALL ON public.accounts TO authenticated;

GRANT ALL ON public.transactions TO authenticated;

GRANT ALL ON public.customers TO authenticated;

GRANT ALL ON public.units TO authenticated;

GRANT ALL ON public.bookings TO authenticated;

GRANT ALL ON public.payments TO authenticated;

GRANT ALL ON public.expenses TO authenticated;

GRANT ALL ON public.vendors TO authenticated;

GRANT ALL ON public.settings TO authenticated;

-- منح صلاحيات للمستخدمين المجهولين (للقراءة فقط إذا لزم الأمر)
GRANT SELECT ON public.settings TO anon;

-- ============================================================================
-- 6. إنشاء trigger لتحديث updated_at في جدول settings
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;

CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- تم الانتهاء من إعداد RLS وجدول الإعدادات
-- ============================================================================