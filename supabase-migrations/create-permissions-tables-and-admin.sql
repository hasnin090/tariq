-- ============================================================================
-- 🔐 إنشاء جداول الصلاحيات وإضافة المدير
-- هذا الملف يحتوي على الجداول الجديدة للصلاحيات + إنشاء حساب المدير
-- ============================================================================
-- تاريخ: ديسمبر 2025
-- نفذ هذا الملف في Supabase SQL Editor
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 🔐 جدول: user_permissions (صلاحيات المستخدمين التفصيلية)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    resource TEXT NOT NULL,
    can_view BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, resource)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_resource ON public.user_permissions(resource);

-- ────────────────────────────────────────────────────────────────────────────
-- 📋 جدول: user_menu_access (القوائم المتاحة لكل مستخدم)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_menu_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    menu_key TEXT NOT NULL,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, menu_key)
);

CREATE INDEX IF NOT EXISTS idx_user_menu_access_user ON public.user_menu_access(user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 🔘 جدول: user_button_access (الأزرار المتاحة لكل مستخدم)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_button_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    page_key TEXT NOT NULL,
    button_key TEXT NOT NULL,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, page_key, button_key)
);

CREATE INDEX IF NOT EXISTS idx_user_button_access_user ON public.user_button_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_button_access_page ON public.user_button_access(page_key);

-- ────────────────────────────────────────────────────────────────────────────
-- 📊 جدول: user_project_assignments (ربط المستخدمين بالمشاريع)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_project_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    interface_mode TEXT NOT NULL CHECK (interface_mode IN ('projects', 'expenses')),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    UNIQUE(user_id, project_id, interface_mode)
);

CREATE INDEX IF NOT EXISTS idx_user_project_assignments_user ON public.user_project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_project_assignments_project ON public.user_project_assignments(project_id);

-- ────────────────────────────────────────────────────────────────────────────
-- تفعيل RLS على الجداول الجديدة
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_menu_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_button_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_project_assignments ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- سياسات الأمان (السماح لجميع العمليات)
-- ────────────────────────────────────────────────────────────────────────────
-- user_permissions
DROP POLICY IF EXISTS "user_permissions_select" ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_insert" ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_update" ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_delete" ON public.user_permissions;

CREATE POLICY "user_permissions_select" ON public.user_permissions FOR SELECT USING (true);
CREATE POLICY "user_permissions_insert" ON public.user_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "user_permissions_update" ON public.user_permissions FOR UPDATE USING (true);
CREATE POLICY "user_permissions_delete" ON public.user_permissions FOR DELETE USING (true);

-- user_menu_access
DROP POLICY IF EXISTS "user_menu_access_select" ON public.user_menu_access;
DROP POLICY IF EXISTS "user_menu_access_insert" ON public.user_menu_access;
DROP POLICY IF EXISTS "user_menu_access_update" ON public.user_menu_access;
DROP POLICY IF EXISTS "user_menu_access_delete" ON public.user_menu_access;

CREATE POLICY "user_menu_access_select" ON public.user_menu_access FOR SELECT USING (true);
CREATE POLICY "user_menu_access_insert" ON public.user_menu_access FOR INSERT WITH CHECK (true);
CREATE POLICY "user_menu_access_update" ON public.user_menu_access FOR UPDATE USING (true);
CREATE POLICY "user_menu_access_delete" ON public.user_menu_access FOR DELETE USING (true);

-- user_button_access
DROP POLICY IF EXISTS "user_button_access_select" ON public.user_button_access;
DROP POLICY IF EXISTS "user_button_access_insert" ON public.user_button_access;
DROP POLICY IF EXISTS "user_button_access_update" ON public.user_button_access;
DROP POLICY IF EXISTS "user_button_access_delete" ON public.user_button_access;

CREATE POLICY "user_button_access_select" ON public.user_button_access FOR SELECT USING (true);
CREATE POLICY "user_button_access_insert" ON public.user_button_access FOR INSERT WITH CHECK (true);
CREATE POLICY "user_button_access_update" ON public.user_button_access FOR UPDATE USING (true);
CREATE POLICY "user_button_access_delete" ON public.user_button_access FOR DELETE USING (true);

-- user_project_assignments
DROP POLICY IF EXISTS "user_project_assignments_select" ON public.user_project_assignments;
DROP POLICY IF EXISTS "user_project_assignments_insert" ON public.user_project_assignments;
DROP POLICY IF EXISTS "user_project_assignments_update" ON public.user_project_assignments;
DROP POLICY IF EXISTS "user_project_assignments_delete" ON public.user_project_assignments;

CREATE POLICY "user_project_assignments_select" ON public.user_project_assignments FOR SELECT USING (true);
CREATE POLICY "user_project_assignments_insert" ON public.user_project_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "user_project_assignments_update" ON public.user_project_assignments FOR UPDATE USING (true);
CREATE POLICY "user_project_assignments_delete" ON public.user_project_assignments FOR DELETE USING (true);

-- ────────────────────────────────────────────────────────────────────────────
-- Triggers لتحديث updated_at
-- ────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS update_user_permissions_updated_at ON public.user_permissions;
DROP TRIGGER IF EXISTS update_user_menu_access_updated_at ON public.user_menu_access;
DROP TRIGGER IF EXISTS update_user_button_access_updated_at ON public.user_button_access;

CREATE TRIGGER update_user_permissions_updated_at BEFORE UPDATE ON public.user_permissions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_menu_access_updated_at BEFORE UPDATE ON public.user_menu_access
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_button_access_updated_at BEFORE UPDATE ON public.user_button_access
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────────────────────
-- إنشاء/تحديث حساب المدير
-- ────────────────────────────────────────────────────────────────────────────
-- حذف المستخدم القديم إن وجد
DELETE FROM public.users WHERE username = 'admin';

-- إنشاء المستخدم الجديد
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

-- ────────────────────────────────────────────────────────────────────────────
-- للتحقق: عرض المستخدم الذي تم إنشاؤه
-- ────────────────────────────────────────────────────────────────────────────
SELECT id, name, username, role, is_active, password FROM public.users WHERE username = 'admin';

-- ────────────────────────────────────────────────────────────────────────────
-- منح الصلاحيات للجداول الجديدة
-- ────────────────────────────────────────────────────────────────────────────
GRANT ALL ON public.user_permissions TO anon;
GRANT ALL ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_menu_access TO anon;
GRANT ALL ON public.user_menu_access TO authenticated;
GRANT ALL ON public.user_button_access TO anon;
GRANT ALL ON public.user_button_access TO authenticated;
GRANT ALL ON public.user_project_assignments TO anon;
GRANT ALL ON public.user_project_assignments TO authenticated;

-- ============================================================================
-- ✅ تم الانتهاء!
-- ============================================================================
-- بيانات تسجيل الدخول:
--   👤 اسم المستخدم: admin
--   🔑 كلمة المرور: 123456
-- ============================================================================
