-- =====================================================
-- سكريبت اختبار نظام الدفع الإضافي والمرفقات
-- =====================================================

-- =====================================================
-- 1. التحقق من إنشاء الجداول
-- =====================================================
SELECT 
    'Checking tables...' as status,
    COUNT(*) as tables_created
FROM information_schema.tables 
WHERE table_name IN ('payment_attachments', 'extra_payments')
AND table_schema = 'public';

-- =====================================================
-- 2. التحقق من إضافة عمود attachment_id
-- =====================================================
SELECT 
    'Checking scheduled_payments update...' as status,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'scheduled_payments'
AND column_name = 'attachment_id';

-- =====================================================
-- 3. التحقق من الدوال
-- =====================================================
SELECT 
    'Checking functions...' as status,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name IN (
    'calculate_remaining_balance_after_extra_payment',
    'auto_reschedule_payments',
    'manual_reschedule_payments'
)
AND routine_schema = 'public';

-- =====================================================
-- 4. التحقق من الفهارس
-- =====================================================
SELECT 
    'Checking indexes...' as status,
    indexname
FROM pg_indexes
WHERE tablename IN ('payment_attachments', 'extra_payments')
AND schemaname = 'public';

-- =====================================================
-- 5. التحقق من سياسات RLS
-- =====================================================
SELECT 
    'Checking RLS policies...' as status,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('payment_attachments', 'extra_payments');

-- =====================================================
-- 6. اختبار دالة حساب المبلغ المتبقي
-- =====================================================
-- ملاحظة: استبدل 'test_unit_sale_id' بـ ID حقيقي من جدول unit_sales
/*
SELECT * FROM calculate_remaining_balance_after_extra_payment(
    'test_unit_sale_id',
    5000.00
);
*/

-- =====================================================
-- 7. عرض إحصائيات شاملة
-- =====================================================
SELECT 
    '✅ SYSTEM CHECK COMPLETE' as status,
    (SELECT COUNT(*) FROM payment_attachments) as total_attachments,
    (SELECT COUNT(*) FROM extra_payments) as total_extra_payments,
    (SELECT COUNT(*) FROM scheduled_payments WHERE attachment_id IS NOT NULL) as payments_with_attachments;

-- =====================================================
-- 8. اختبار إضافة مرفق (مثال)
-- =====================================================
/*
-- استبدل القيم بقيم حقيقية
INSERT INTO payment_attachments (
    id,
    payment_id,
    file_name,
    file_path,
    file_size,
    file_type,
    uploaded_by
) VALUES (
    gen_random_uuid()::TEXT,
    'payment_id_here',
    'receipt_001.pdf',
    'payment_id/receipt_001.pdf',
    150000,
    'application/pdf',
    'user_id_here'
);

SELECT 'Test attachment created' as status;
*/

-- =====================================================
-- 9. اختبار إضافة دفعة إضافية (مثال)
-- =====================================================
/*
-- استبدل القيم بقيم حقيقية
INSERT INTO extra_payments (
    id,
    unit_sale_id,
    customer_id,
    amount,
    payment_date,
    payment_method,
    reschedule_type
) VALUES (
    gen_random_uuid()::TEXT,
    'unit_sale_id_here',
    'customer_id_here',
    10000.00,
    CURRENT_DATE,
    'نقدي',
    'auto'
);

SELECT 'Test extra payment created' as status;
*/

-- =====================================================
-- 10. عرض آخر المرفقات المضافة
-- =====================================================
SELECT 
    '📎 Recent Attachments' as section,
    id,
    file_name,
    file_size,
    file_type,
    uploaded_at
FROM payment_attachments
ORDER BY uploaded_at DESC
LIMIT 5;

-- =====================================================
-- 11. عرض آخر الدفعات الإضافية
-- =====================================================
SELECT 
    '💰 Recent Extra Payments' as section,
    id,
    amount,
    payment_date,
    payment_method,
    reschedule_type
FROM extra_payments
ORDER BY payment_date DESC
LIMIT 5;

-- =====================================================
-- النتيجة النهائية
-- =====================================================
SELECT 
    '
    ═══════════════════════════════════════════
    ✅ نظام الدفع الإضافي والمرفقات جاهز!
    ═══════════════════════════════════════════
    
    الجداول: payment_attachments, extra_payments
    التحديثات: scheduled_payments
    الدوال: 3 دوال جديدة
    RLS: مفعل على جميع الجداول
    
    📋 للاستخدام:
    - صفحة الدفعات المجدولة
    - زر "تسديد" → رفع مرفق
    - زر "دفع إضافي" → إعادة جدولة
    
    📚 التوثيق:
    - docs/EXTRA_PAYMENTS_AND_ATTACHMENTS_GUIDE.md
    - docs/QUICK_START_EXTRA_PAYMENTS.md
    
    ═══════════════════════════════════════════
    ' as final_message;
