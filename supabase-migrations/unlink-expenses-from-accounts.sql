-- ============================================================================
-- إلغاء ربط المصروفات بالحسابات (Expenses Independence)
-- تاريخ: 2026-01-26
-- الهدف: جعل المصروفات مستقلة تماماً عن نظام الخزينة/الحسابات
-- ============================================================================

-- ============================================================================
-- 1️⃣ إلغاء ربط المصروفات بالحسابات
-- ============================================================================
-- تحديث جميع المصروفات لإزالة account_id
UPDATE public.expenses 
SET account_id = NULL 
WHERE account_id IS NOT NULL;

-- ✅ عرض عدد المصروفات التي تم تحديثها
-- SELECT COUNT(*) as updated_expenses FROM public.expenses WHERE account_id IS NULL;

-- ============================================================================
-- 2️⃣ حذف transactions من نوع Withdrawal المرتبطة بالمصروفات
-- ============================================================================
-- حذف الـ withdrawals التي تم إنشاؤها عند إضافة مصروفات
DELETE FROM public.transactions 
WHERE source_type = 'Expense' 
  AND type = 'Withdrawal';

-- ✅ أيضاً حذف أي withdrawal مرتبط بـ expense حتى لو لم يكن لديه source_type
DELETE FROM public.transactions 
WHERE type = 'Withdrawal'
  AND id IN (
    SELECT transaction_id FROM public.expenses WHERE transaction_id IS NOT NULL
  );

-- ============================================================================
-- 3️⃣ إزالة transaction_id من جميع المصروفات
-- ============================================================================
UPDATE public.expenses 
SET transaction_id = NULL 
WHERE transaction_id IS NOT NULL;

-- ============================================================================
-- 4️⃣ التحقق من النتائج
-- ============================================================================
-- يمكنك تشغيل هذه الاستعلامات للتحقق:

-- عدد المصروفات المستقلة الآن:
-- SELECT COUNT(*) as independent_expenses 
-- FROM public.expenses 
-- WHERE account_id IS NULL AND transaction_id IS NULL;

-- عدد الإيرادات المتبقية (Deposits):
-- SELECT COUNT(*) as remaining_deposits 
-- FROM public.transactions 
-- WHERE type = 'Deposit';

-- عدد المصروفات (Withdrawals) المتبقية - يجب أن تكون صفر أو فقط الرواتب:
-- SELECT COUNT(*) as remaining_withdrawals, source_type 
-- FROM public.transactions 
-- WHERE type = 'Withdrawal'
-- GROUP BY source_type;

-- ============================================================================
-- ملاحظة مهمة:
-- ============================================================================
-- بعد تشغيل هذا الـ migration:
-- - المصروفات ستكون مستقلة تماماً عن الحسابات
-- - قائمة الصندوق/البنك ستعرض الإيرادات فقط
-- - إجمالي المصروفات يُحسب من جدول expenses مباشرة
-- - صافي الدخل = إجمالي الإيرادات (transactions.Deposit) - إجمالي المصروفات (expenses.amount)
-- ============================================================================
