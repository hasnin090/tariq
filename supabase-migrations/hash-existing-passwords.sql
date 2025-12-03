-- =====================================================
-- تشفير كلمات المرور الموجودة في قاعدة البيانات
-- =====================================================
-- تحذير: هذا الملف يجب تشغيله مرة واحدة فقط بعد تطبيق نظام bcrypt
-- ملاحظة: bcrypt لا يمكن تشغيله مباشرة في PostgreSQL، لذلك سنستخدم حل بديل

-- الخيار 1: تمكين pgcrypto extension لاستخدام crypt
-- لكن pgcrypto.crypt لا يدعم bcrypt بنفس الطريقة

-- الخيار 2 (الموصى به): إعادة تعيين كلمات المرور الافتراضية المشفرة
-- هذا يتطلب تشغيل script من جانب التطبيق

-- =====================================================
-- الحل المؤقت: إعادة تعيين كلمات مرور المستخدمين الموجودين
-- =====================================================

-- خطوة 1: إضافة عمود مؤقت لتمييز المستخدمين الذين تم تشفير كلمات مرورهم
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_migrated BOOLEAN DEFAULT FALSE;

-- خطوة 2: إنشاء جدول مؤقت لحفظ معلومات المستخدمين الذين يحتاجون إعادة تعيين كلمة المرور
CREATE TABLE IF NOT EXISTS public.password_migration_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    old_password_hash TEXT,
    migration_date TIMESTAMPTZ DEFAULT NOW(),
    migration_status TEXT DEFAULT 'pending' CHECK (migration_status IN ('pending', 'completed', 'failed'))
);

-- خطوة 3: حفظ معلومات المستخدمين الذين يحتاجون تشفير كلمة المرور
INSERT INTO public.password_migration_log (user_id, old_password_hash, migration_status)
SELECT 
    id,
    password,
    'pending'
FROM public.users
WHERE password_migrated = FALSE;

-- =====================================================
-- ملاحظات مهمة للمسؤول:
-- =====================================================
-- 1. يجب تشغيل script TypeScript لتشفير كلمات المرور الفعلية
-- 2. بعد تشغيل الـ script، سيتم تحديث حقل password_migrated إلى TRUE
-- 3. يمكن حذف جدول password_migration_log بعد التأكد من نجاح العملية

-- =====================================================
-- إنشاء دالة لتحديث حالة التشفير (يستخدمها التطبيق)
-- =====================================================
CREATE OR REPLACE FUNCTION public.mark_password_migrated(user_id_param UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.users 
    SET password_migrated = TRUE 
    WHERE id = user_id_param;
    
    UPDATE public.password_migration_log 
    SET migration_status = 'completed', migration_date = NOW() 
    WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- عرض المستخدمين الذين لم يتم تشفير كلمات مرورهم بعد
-- =====================================================
COMMENT ON TABLE public.password_migration_log IS 'جدول مؤقت لتتبع عملية تشفير كلمات المرور للمستخدمين الموجودين';
COMMENT ON COLUMN public.users.password_migrated IS 'حقل يوضح ما إذا تم تشفير كلمة مرور المستخدم باستخدام bcrypt';

-- استعلام لعرض حالة التشفير
SELECT 
    u.id,
    u.username,
    u.name,
    u.password_migrated,
    pml.migration_status,
    pml.migration_date
FROM public.users u
LEFT JOIN public.password_migration_log pml ON u.id = pml.user_id
ORDER BY u.created_at;
