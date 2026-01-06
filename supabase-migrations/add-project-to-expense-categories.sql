-- ============================================================================
-- إضافة حقل المشروع لجدول فئات المصروفات
-- تخصيص أنواع المصروفات لكل مشروع
-- ============================================================================

-- 1. إضافة حقل project_id لجدول expense_categories (نوع UUID ليتوافق مع جدول projects)
ALTER TABLE public.expense_categories 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- 2. إضافة فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_expense_categories_project 
ON public.expense_categories(project_id);

-- 3. إزالة قيد UNIQUE القديم على الاسم فقط وإضافة قيد UNIQUE على (name, project_id)
-- هذا يسمح بنفس اسم الفئة في مشاريع مختلفة
ALTER TABLE public.expense_categories DROP CONSTRAINT IF EXISTS expense_categories_name_key;

-- إنشاء قيد فريد جديد يجمع بين الاسم والمشروع
-- ملاحظة: NULL في project_id يعني فئة عامة (مشتركة بين جميع المشاريع)
CREATE UNIQUE INDEX IF NOT EXISTS expense_categories_name_project_unique 
ON public.expense_categories(name, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 4. إضافة تعليق توضيحي
COMMENT ON COLUMN public.expense_categories.project_id IS 'معرف المشروع - إذا كان NULL فهي فئة عامة مشتركة';

-- 5. تحديث الفئات الافتراضية لتكون عامة (project_id = NULL)
-- هذه الفئات ستكون متاحة لجميع المشاريع
UPDATE public.expense_categories 
SET project_id = NULL 
WHERE id IN ('cat_salaries', 'cat_maintenance', 'cat_utilities', 'cat_marketing', 'cat_other');

-- ============================================================================
-- انتهى الملف
-- ============================================================================
