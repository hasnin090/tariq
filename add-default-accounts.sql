-- ============================================================================
-- إضافة حسابات افتراضية
-- قم بتشغيل هذا الملف في Supabase SQL Editor
-- ============================================================================

-- إضافة حساب خزينة المكتب (نقدي)
INSERT INTO public.accounts (id, name, account_type, balance, description) 
VALUES ('account_default_cash', 'خزينة المكتب', 'Cash', 0, 'الحساب النقدي الرئيسي للمكتب')
ON CONFLICT (id) DO NOTHING;

-- إضافة الحساب البنكي
INSERT INTO public.accounts (id, name, account_type, balance, description) 
VALUES ('account_default_bank', 'الحساب البنكي', 'Bank', 0, 'الحساب البنكي الرئيسي')
ON CONFLICT (id) DO NOTHING;

-- عرض الحسابات المضافة
SELECT * FROM public.accounts;
