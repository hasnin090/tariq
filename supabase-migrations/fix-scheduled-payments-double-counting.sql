-- =========================================
-- إصلاح مشكلة الحساب المزدوج للدفعات
-- =========================================
-- 
-- المشكلة:
-- عند تسديد دفعة إضافية، كان يتم تعليم الأقساط المغطاة كـ "paid" 
-- مع تسجيل paid_amount بقيمة الدفعة الإضافية الكاملة
-- هذا أدى إلى حساب المبلغ مرتين:
--   1. من جدول payments (الدفعة الإضافية)
--   2. من paid_amount في scheduled_payments
-- 
-- الحل:
-- الأقساط المدفوعة بدون payment_id تعني أنها غُطيت بدفعات إضافية
-- يجب تصفير paid_amount لها لتجنب الحساب المزدوج
-- =========================================

-- 1. تحديث الأقساط المدفوعة التي ليس لها payment_id صالح
UPDATE scheduled_payments
SET 
    paid_amount = 0,
    payment_id = 'extra_payment_covered'
WHERE status = 'paid' 
AND (payment_id IS NULL OR payment_id = '');

-- 2. إضافة تعليق للتوضيح
COMMENT ON COLUMN scheduled_payments.payment_id IS 'معرف الدفعة المرتبطة. القيمة extra_payment_covered تعني أن هذا القسط غُطي بدفعة إضافية';

-- 3. عرض النتائج للتحقق
SELECT 
    sp.booking_id,
    sp.installment_number,
    sp.amount as scheduled_amount,
    sp.paid_amount,
    sp.payment_id,
    sp.status
FROM scheduled_payments sp
WHERE sp.status = 'paid'
ORDER BY sp.booking_id, sp.installment_number;
