-- ============================================================================
-- 🚨 عاجل: إزالة triggers القيود اليومية من جدول المصروفات
-- السبب: جدول journal_entries غير موجود مما يمنع حذف المصروفات
-- تاريخ: 2026-01-13
-- ============================================================================

-- ⚠️ نفذ هذا الكود في Supabase Dashboard > SQL Editor

-- 1. حذف triggers القيود اليومية
DROP TRIGGER IF EXISTS trigger_create_journal_expense ON public.expenses;
DROP TRIGGER IF EXISTS trigger_delete_journal_expense ON public.expenses;
DROP TRIGGER IF EXISTS trigger_update_journal_expense ON public.expenses;

-- 2. حذف الدوال المرتبطة
DROP FUNCTION IF EXISTS create_journal_from_expense();
DROP FUNCTION IF EXISTS delete_journal_from_expense();
DROP FUNCTION IF EXISTS update_journal_from_expense();

-- 3. تأكيد الحذف
SELECT 
    'تم حذف triggers القيود اليومية بنجاح ✅' as status,
    (SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%journal%expense%') as remaining_triggers;
