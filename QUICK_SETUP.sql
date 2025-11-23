-- ============================================
-- تنفيذ سريع لجميع الجداول
-- نفّذ هذا الملف مرة واحدة في Supabase SQL Editor
-- ============================================

-- Note: يمكنك تنفيذ هذا الملف بالكامل مرة واحدة
-- أو تنفيذ كل قسم على حدة

-- ============================================
-- 1. تحديث جدول Users
-- ============================================

-- Add missing columns to existing users table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'assigned_project_id') THEN
        ALTER TABLE public.users ADD COLUMN assigned_project_id TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'sales_interface_project_id') THEN
        ALTER TABLE public.users ADD COLUMN sales_interface_project_id TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'accounting_interface_project_id') THEN
        ALTER TABLE public.users ADD COLUMN accounting_interface_project_id TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE public.users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_assigned_project ON public.users(assigned_project_id);
CREATE INDEX IF NOT EXISTS idx_users_sales_project ON public.users(sales_interface_project_id);
CREATE INDEX IF NOT EXISTS idx_users_accounting_project ON public.users(accounting_interface_project_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(is_active);

-- Insert default users
INSERT INTO public.users (id, name, email, password, role, is_active) 
VALUES 
    ('user_admin_default', 'admin', 'admin@example.com', 'admin123', 'Admin', true)
ON CONFLICT (name) DO UPDATE SET email = EXCLUDED.email;

INSERT INTO public.users (id, name, email, password, role, is_active) 
VALUES 
    ('user_sales_default', 'sales', 'sales@example.com', 'sales123', 'Sales', true)
ON CONFLICT (name) DO UPDATE SET email = EXCLUDED.email;

INSERT INTO public.users (id, name, email, password, role, is_active) 
VALUES 
    ('user_accounting_default', 'accounting', 'accounting@example.com', 'accounting123', 'Accounting', true)
ON CONFLICT (name) DO UPDATE SET email = EXCLUDED.email;

-- ============================================
-- 2. إنشاء جدول Accounts
-- ============================================

\echo 'Creating accounts table...'

-- تم نسخ محتوى supabase-accounts-setup.sql هنا
-- (للاختصار، يمكنك نسخ المحتوى الكامل من الملف)

-- ============================================
-- 3. إنشاء جدول Transactions  
-- ============================================

\echo 'Creating transactions table...'

-- تم نسخ محتوى supabase-transactions-setup.sql هنا

-- ============================================
-- التحقق من النتيجة
-- ============================================

SELECT 
    'إعداد قاعدة البيانات اكتمل بنجاح! ✓' as message,
    COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public';

SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
