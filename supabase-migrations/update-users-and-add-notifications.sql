-- جعل عمود email اختيارياً بدلاً من إلزامي
ALTER TABLE public.users 
ALTER COLUMN email DROP NOT NULL;

-- إضافة عمود username إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'username') THEN
        ALTER TABLE public.users ADD COLUMN username TEXT UNIQUE;
    END IF;
END $$;

-- إضافة عمود password إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'password') THEN
        ALTER TABLE public.users ADD COLUMN password TEXT;
    END IF;
END $$;

-- تحديث المستخدمين الحاليين لإضافة username من name وكلمة مرور افتراضية
UPDATE public.users 
SET username = LOWER(REPLACE(name, ' ', '_')),
    password = '123456'
WHERE username IS NULL OR password IS NULL;

-- جعل username إلزامياً بعد ملء البيانات
ALTER TABLE public.users 
ALTER COLUMN username SET NOT NULL;

-- جعل password إلزامياً بعد ملء البيانات
ALTER TABLE public.users 
ALTER COLUMN password SET NOT NULL;

-- حذف المستخدم admin إن وجد وإعادة إنشائه
DELETE FROM public.users WHERE username = 'admin';

-- إنشاء مستخدم admin
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
-- تحديث سياسات RLS لجدول المستخدمين
-- ============================================================================
-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Allow public read for authentication" ON public.users;
DROP POLICY IF EXISTS "Allow authentication read" ON public.users;

-- السماح بقراءة المستخدمين للمصادقة (بدون auth.uid)
CREATE POLICY "Allow authentication read" ON public.users
    FOR SELECT
    USING (true);

-- ============================================================================
-- تحديث سياسات RLS لجدول الإعدادات (Settings)
-- ============================================================================
-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Allow public read settings" ON public.settings;
DROP POLICY IF EXISTS "Allow settings read" ON public.settings;

-- السماح بقراءة الإعدادات
CREATE POLICY "Allow settings read" ON public.settings
    FOR SELECT
    USING (true);

-- ============================================================================
-- تحديث سياسات RLS للجداول الأساسية - البيئة الآمنة
-- ============================================================================
-- ملاحظة: نظراً لأن النظام يستخدم localStorage بدلاً من Supabase Auth،
-- سنسمح بالوصول الكامل مؤقتاً حتى يتم تطبيق مصادقة آمنة من جانب الخادم

-- جدول المستخدمين - السماح بالتحديث للجميع
DROP POLICY IF EXISTS "Allow users update" ON public.users;
CREATE POLICY "Allow users update" ON public.users
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users insert" ON public.users;
CREATE POLICY "Allow users insert" ON public.users
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users delete" ON public.users;
CREATE POLICY "Allow users delete" ON public.users
    FOR DELETE
    USING (true);

-- جدول الإعدادات - السماح بالتحديث
DROP POLICY IF EXISTS "Allow settings update" ON public.settings;
CREATE POLICY "Allow settings update" ON public.settings
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow settings insert" ON public.settings;
CREATE POLICY "Allow settings insert" ON public.settings
    FOR INSERT
    WITH CHECK (true);

-- جدول المشاريع (Projects)
DROP POLICY IF EXISTS "Allow all projects access" ON public.projects;
CREATE POLICY "Allow all projects access" ON public.projects
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- جدول الوحدات (Units)
DROP POLICY IF EXISTS "Allow all units access" ON public.units;
CREATE POLICY "Allow all units access" ON public.units
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- جدول العملاء (Customers)
DROP POLICY IF EXISTS "Allow all customers access" ON public.customers;
CREATE POLICY "Allow all customers access" ON public.customers
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- جدول الحجوزات (Bookings)
DROP POLICY IF EXISTS "Allow all bookings access" ON public.bookings;
CREATE POLICY "Allow all bookings access" ON public.bookings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- جدول المدفوعات (Payments)
DROP POLICY IF EXISTS "Allow all payments access" ON public.payments;
CREATE POLICY "Allow all payments access" ON public.payments
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- جدول الإشعارات (Notifications)
-- ============================================================================
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

-- إنشاء فهرس لتسريع الاستعلامات
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- إضافة RLS policies للإشعارات
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can update notifications" ON public.notifications;

-- السماح بالوصول الكامل للإشعارات (بدون قيود مؤقتاً)
CREATE POLICY "Allow all notifications access" ON public.notifications
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- التعليق على الجداول
COMMENT ON TABLE public.notifications IS 'جدول الإشعارات للمدراء';
COMMENT ON COLUMN public.notifications.type IS 'نوع الإشعار: password_reset لطلبات استعادة كلمة المرور';
COMMENT ON COLUMN public.notifications.user_id IS 'معرف المستخدم المرتبط بالإشعار';
COMMENT ON COLUMN public.notifications.username IS 'اسم المستخدم لسهولة العرض';
COMMENT ON COLUMN public.notifications.is_read IS 'هل تم قراءة الإشعار';
COMMENT ON COLUMN public.notifications.resolved_at IS 'تاريخ حل المشكلة';
COMMENT ON COLUMN public.notifications.resolved_by IS 'المدير الذي حل المشكلة';
