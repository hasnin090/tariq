-- ============================================================================
-- 🏦 ربط الحسابات بالمشاريع - نظام الصندوق والمصرف لكل مشروع
-- ============================================================================
-- تاريخ: يناير 2026
-- الوصف: إضافة project_id لجدول accounts لربط كل حساب بمشروع معين
-- ============================================================================

-- 1️⃣ إضافة عمود project_id إلى جدول accounts
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- 2️⃣ إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_accounts_project_id ON public.accounts(project_id);

-- 3️⃣ إضافة تعليق توضيحي
COMMENT ON COLUMN public.accounts.project_id IS 'معرف المشروع المرتبط بالحساب - كل مشروع له حساباته الخاصة';

-- 4️⃣ حذف الحسابات الافتراضية القديمة (خزينة المكتب والحساب البنكي)
DELETE FROM public.accounts WHERE id IN ('account_default_cash', 'account_default_bank');

-- 5️⃣ تحديث سياسات RLS للحسابات
DROP POLICY IF EXISTS "accounts_select_policy" ON public.accounts;
DROP POLICY IF EXISTS "accounts_insert_policy" ON public.accounts;
DROP POLICY IF EXISTS "accounts_update_policy" ON public.accounts;
DROP POLICY IF EXISTS "accounts_delete_policy" ON public.accounts;

-- إعادة إنشاء السياسات
CREATE POLICY "accounts_select_policy" ON public.accounts FOR SELECT USING (true);
CREATE POLICY "accounts_insert_policy" ON public.accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "accounts_update_policy" ON public.accounts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "accounts_delete_policy" ON public.accounts FOR DELETE USING (true);

-- ============================================================================
-- ✅ تم بنجاح!
-- الآن كل حساب (صندوق أو مصرف) يمكن ربطه بمشروع معين
-- المدير يمكنه إنشاء حسابات متعددة لكل مشروع
-- ============================================================================
