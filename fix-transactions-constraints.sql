-- ============================================================================
-- تحديث constraints لجدول transactions
-- قم بتشغيل هذا الملف في Supabase SQL Editor
-- ============================================================================

-- حذف constraints القديمة
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_source_type_check;

-- إضافة constraints جديدة تدعم كل القيم المستخدمة
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check 
    CHECK (type IN ('Income', 'Expense', 'Transfer', 'Deposit', 'Withdrawal'));

ALTER TABLE public.transactions ADD CONSTRAINT transactions_source_type_check 
    CHECK (source_type IN ('Expense', 'Payment', 'Sale', 'Booking', 'Transfer', 'Manual', 'Salary', 'Deferred Payment', 'expense', 'payment', 'sale', 'booking', 'transfer', 'adjustment'));

-- التحقق من التحديث
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.transactions'::regclass;
