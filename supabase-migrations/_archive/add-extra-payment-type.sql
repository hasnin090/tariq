-- =========================================
-- إضافة نوع دفعة جديد 'extra' للدفعات الإضافية
-- =========================================
-- 
-- الهدف:
-- إضافة نوع 'extra' للدفعات الإضافية خارج خطة الأقساط
-- هذا يمنع trigger auto_link_payment_to_scheduled من ربط
-- الدفعات الإضافية بالأقساط تلقائياً
-- =========================================

-- 1. تعديل CHECK constraint على payment_type
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check 
    CHECK (payment_type IN ('booking', 'installment', 'final', 'extra'));

-- 2. تحديث التعليق
COMMENT ON COLUMN public.payments.payment_type IS 'نوع الدفعة: booking=دفعة الحجز الأولى, installment=قسط, final=دفعة نهائية, extra=دفعة إضافية خارج الخطة';

-- 3. تحديث trigger لاستثناء نوع 'extra' من الربط التلقائي
CREATE OR REPLACE FUNCTION auto_link_payment_to_scheduled()
RETURNS TRIGGER AS $$
DECLARE
    v_scheduled RECORD;
    v_remaining_amount NUMERIC;
BEGIN
    -- ✅ تطبيق فقط على دفعات التقسيط والنهائية، وليس دفعة الحجز الأولى أو الدفعات الإضافية
    -- نوع 'extra' يعني دفعة إضافية خارج الخطة ولا يجب ربطها تلقائياً بأقساط
    IF NEW.payment_type NOT IN ('installment', 'final') THEN
        RETURN NEW;
    END IF;
    
    -- البحث عن أقرب دفعة مجدولة معلقة لهذا الحجز
    SELECT * INTO v_scheduled
    FROM scheduled_payments
    WHERE booking_id = NEW.booking_id
    AND status IN ('pending', 'overdue', 'partially_paid')
    ORDER BY due_date ASC, installment_number ASC
    LIMIT 1;
    
    -- إذا وُجدت دفعة مجدولة معلقة
    IF FOUND THEN
        v_remaining_amount := v_scheduled.amount - COALESCE(v_scheduled.paid_amount, 0);
        
        -- ربط الدفعة بالدفعة المجدولة
        UPDATE scheduled_payments
        SET 
            paid_amount = COALESCE(paid_amount, 0) + NEW.amount,
            status = CASE
                WHEN (COALESCE(paid_amount, 0) + NEW.amount) >= amount THEN 'paid'
                ELSE 'partially_paid'
            END,
            paid_date = CASE
                WHEN (COALESCE(paid_amount, 0) + NEW.amount) >= amount THEN NEW.payment_date
                ELSE paid_date
            END,
            payment_id = CASE
                WHEN (COALESCE(paid_amount, 0) + NEW.amount) >= amount THEN NEW.id
                ELSE payment_id
            END,
            updated_at = NOW()
        WHERE id = v_scheduled.id;
        
        RAISE NOTICE 'Auto-linked payment % to scheduled payment % (installment #%)', 
            NEW.id, v_scheduled.id, v_scheduled.installment_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_link_payment_to_scheduled IS 'ربط الدفعات الجديدة (installment/final فقط) تلقائياً بأقرب دفعة مجدولة معلقة - الدفعات الإضافية (extra) لا تُربط تلقائياً';
