-- ============================================================================
-- 🔐 تفعيل Supabase Auth - ربط جدول users مع نظام المصادقة
-- ============================================================================
-- هذا الملف يجب تنفيذه قبل تفعيل RLS
-- تاريخ: 2026-01-05
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣ إضافة عمود auth_id لربط المستخدمين مع Supabase Auth
-- ═══════════════════════════════════════════════════════════════════════════

-- إضافة عمود auth_id إذا لم يكن موجوداً
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- إنشاء index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2️⃣ إنشاء function لإنشاء مستخدم في جدول users عند التسجيل
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- لا ننشئ مستخدم جديد تلقائياً
  -- فقط نربط المستخدم الموجود إذا كان email متطابق
  UPDATE public.users 
  SET auth_id = NEW.id 
  WHERE email = NEW.email AND auth_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- حذف trigger القديم إذا كان موجوداً
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- إنشاء trigger جديد
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ═══════════════════════════════════════════════════════════════════════════
-- 3️⃣ إنشاء function للحصول على user_id من auth.uid()
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4️⃣ إنشاء function للتحقق من دور المستخدم
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5️⃣ تحديث RLS Policies لاستخدام auth.uid()
-- ═══════════════════════════════════════════════════════════════════════════

-- سياسات محسّنة تستخدم auth.uid() للتحقق من الهوية

-- جدول users - يمكن للمستخدم رؤية وتعديل بياناته فقط (Admin يرى الكل)
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "users_delete" ON users;

CREATE POLICY "users_select" ON users 
FOR SELECT TO authenticated 
USING (
  auth_id = auth.uid() 
  OR get_current_user_role() = 'Admin'
);

CREATE POLICY "users_insert" ON users 
FOR INSERT TO authenticated 
WITH CHECK (get_current_user_role() = 'Admin');

CREATE POLICY "users_update" ON users 
FOR UPDATE TO authenticated 
USING (
  auth_id = auth.uid() 
  OR get_current_user_role() = 'Admin'
);

CREATE POLICY "users_delete" ON users 
FOR DELETE TO authenticated 
USING (get_current_user_role() = 'Admin');

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ تم إعداد البنية التحتية لـ Supabase Auth
-- ═══════════════════════════════════════════════════════════════════════════
-- الخطوة التالية: تشغيل script ترحيل المستخدمين لإنشاء حسابات في Supabase Auth
