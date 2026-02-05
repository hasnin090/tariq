-- ============================================================================
-- إضافة عمود project_id لجدول الموظفين
-- Migration: add-project-to-employees.sql
-- Date: 2026-01-19
-- Description: ربط الموظفين بالمشاريع لتمكين تخصيص الموظفين حسب المشروع
-- ============================================================================

-- 1. إضافة عمود project_id لجدول employees
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- 2. إنشاء فهرس للبحث السريع حسب المشروع
CREATE INDEX IF NOT EXISTS idx_employees_project_id ON public.employees(project_id);

-- 3. إضافة تعليق توضيحي للعمود الجديد
COMMENT ON COLUMN public.employees.project_id IS 'معرف المشروع المرتبط بالموظف (اختياري - NULL يعني موظف عام)';

-- ============================================================================
-- ملاحظات:
-- - الموظفين الذين لديهم project_id = NULL هم موظفين عامين (يظهرون في كل المشاريع)
-- - الموظفين المرتبطين بمشروع معين يظهرون فقط في ذلك المشروع
-- - عند حذف مشروع، يتم تعيين project_id للموظفين إلى NULL (ON DELETE SET NULL)
-- ============================================================================
