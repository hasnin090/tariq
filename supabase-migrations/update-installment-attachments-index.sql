-- =====================================================
-- تحسين استعلامات مرفقات الأقساط
-- =====================================================
-- 
-- الهدف:
-- إضافة فهارس لتحسين أداء استعلامات مرفقات الأقساط
-- =====================================================

-- 1. إضافة فهرس مركب على scheduled_payments للاستعلامات الشائعة
CREATE INDEX IF NOT EXISTS idx_scheduled_payments_status_attachment 
ON scheduled_payments(status, attachment_id) 
WHERE status = 'paid' AND attachment_id IS NOT NULL;

-- 2. التأكد من وجود علاقة صحيحة بين scheduled_payments و payment_attachments
-- (قد تكون موجودة من قبل)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'scheduled_payments' 
        AND column_name = 'attachment_id'
    ) THEN
        ALTER TABLE scheduled_payments 
        ADD COLUMN attachment_id TEXT REFERENCES payment_attachments(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. فهرس للبحث السريع عن مرفقات حسب scheduled_payment_id
CREATE INDEX IF NOT EXISTS idx_payment_attachments_scheduled_payment 
ON payment_attachments(payment_id);

-- 4. تحديث التعليقات
COMMENT ON COLUMN scheduled_payments.attachment_id IS 'رابط إلى وصل التسديد المرفق مع القسط';
COMMENT ON TABLE payment_attachments IS 'جدول مرفقات وصولات تسديد الأقساط';

-- =====================================================
-- ملاحظة: هذا الملف يضيف فهارس لتحسين الأداء فقط
-- لا يغير من بنية الجداول الأساسية
-- =====================================================
