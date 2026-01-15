-- =====================================================
-- إضافة نظام المرفقات والدفعات الإضافية
-- =====================================================

-- =====================================================
-- 1. جدول مرفقات الدفعات (Payment Attachments)
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_attachments (
    id TEXT PRIMARY KEY,
    payment_id TEXT NOT NULL REFERENCES scheduled_payments(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    uploaded_by TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_payment_attachments_payment_id ON payment_attachments(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_attachments_uploaded_at ON payment_attachments(uploaded_at);

-- تفعيل RLS
ALTER TABLE payment_attachments ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY "Allow read access to all" ON payment_attachments
    FOR SELECT
    USING (true);

CREATE POLICY "Allow insert access to all" ON payment_attachments
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow update access to all" ON payment_attachments
    FOR UPDATE
    USING (true);

CREATE POLICY "Allow delete access to all" ON payment_attachments
    FOR DELETE
    USING (true);

-- =====================================================
-- 2. جدول الدفعات الإضافية (Extra Payments)
-- =====================================================
CREATE TABLE IF NOT EXISTS extra_payments (
    id TEXT PRIMARY KEY,
    unit_sale_id TEXT NOT NULL REFERENCES unit_sales(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    payment_method TEXT,
    notes TEXT,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    -- خيارات إعادة الجدولة
    reschedule_type TEXT CHECK (reschedule_type IN ('auto', 'manual')),
    new_installment_count INTEGER,
    new_installment_period TEXT CHECK (new_installment_period IN ('daily', 'weekly', 'monthly', 'yearly')),
    -- المرفقات
    attachment_id TEXT REFERENCES payment_attachments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_extra_payments_unit_sale_id ON extra_payments(unit_sale_id);
CREATE INDEX IF NOT EXISTS idx_extra_payments_customer_id ON extra_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_extra_payments_payment_date ON extra_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_extra_payments_project_id ON extra_payments(project_id);

-- تفعيل RLS
ALTER TABLE extra_payments ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY "Allow read access to all" ON extra_payments
    FOR SELECT
    USING (true);

CREATE POLICY "Allow insert access to all" ON extra_payments
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow update access to all" ON extra_payments
    FOR UPDATE
    USING (true);

CREATE POLICY "Allow delete access to all" ON extra_payments
    FOR DELETE
    USING (true);

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_extra_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_extra_payments_updated_at
    BEFORE UPDATE ON extra_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_extra_payments_updated_at();

-- =====================================================
-- 3. تحديث جدول scheduled_payments لإضافة المرفقات
-- =====================================================
ALTER TABLE scheduled_payments 
ADD COLUMN IF NOT EXISTS attachment_id TEXT REFERENCES payment_attachments(id) ON DELETE SET NULL;

-- =====================================================
-- 3.1 جدول سجل تعديلات جدول الدفع (للمراجعة والتدقيق)
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_schedule_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    unit_sale_id TEXT NOT NULL REFERENCES unit_sales(id) ON DELETE CASCADE,
    extra_payment_id TEXT REFERENCES extra_payments(id) ON DELETE SET NULL,
    
    -- نوع التعديل
    reschedule_option TEXT NOT NULL CHECK (reschedule_option IN (
        'reduce_amount',      -- تقليل مبلغ القسط (نفس العدد)
        'reduce_count',       -- تقليل عدد الأقساط (نفس المبلغ)
        'custom'              -- إعادة جدولة مخصصة
    )),
    
    -- البيانات قبل التعديل
    old_pending_count INTEGER,
    old_installment_amount DECIMAL(15,2),
    old_remaining_balance DECIMAL(15,2),
    
    -- البيانات بعد التعديل
    new_pending_count INTEGER,
    new_installment_amount DECIMAL(15,2),
    new_remaining_balance DECIMAL(15,2),
    new_installment_period TEXT,
    
    -- معلومات إضافية
    extra_payment_amount DECIMAL(15,2),
    notes TEXT,
    modified_by TEXT,
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_schedule_history_unit_sale ON payment_schedule_history(unit_sale_id);
CREATE INDEX IF NOT EXISTS idx_schedule_history_extra_payment ON payment_schedule_history(extra_payment_id);
CREATE INDEX IF NOT EXISTS idx_schedule_history_modified_at ON payment_schedule_history(modified_at);

-- تفعيل RLS
ALTER TABLE payment_schedule_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all" ON payment_schedule_history
    FOR SELECT USING (true);

CREATE POLICY "Allow insert access to all" ON payment_schedule_history
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 4. دالة لحساب المبلغ المتبقي بعد الدفع الإضافي
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_remaining_balance_after_extra_payment(
    p_unit_sale_id TEXT,
    p_extra_payment_amount DECIMAL
)
RETURNS TABLE(
    remaining_balance DECIMAL,
    paid_amount DECIMAL,
    total_amount DECIMAL,
    pending_installments INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (us.final_sale_price - COALESCE(SUM(sp.amount_paid), 0) - p_extra_payment_amount) as remaining_balance,
        (COALESCE(SUM(sp.amount_paid), 0) + p_extra_payment_amount) as paid_amount,
        us.final_sale_price as total_amount,
        COUNT(*) FILTER (WHERE sp.status = 'pending')::INTEGER as pending_installments
    FROM unit_sales us
    LEFT JOIN scheduled_payments sp ON sp.unit_sale_id = us.id
    WHERE us.id = p_unit_sale_id
    GROUP BY us.final_sale_price;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. دالة لإعادة جدولة الدفعات المتبقية تلقائياً (تقليل المبلغ)
-- =====================================================
CREATE OR REPLACE FUNCTION reschedule_reduce_amount(
    p_unit_sale_id TEXT,
    p_extra_payment_id TEXT,
    p_modified_by TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    new_installment_amount DECIMAL,
    remaining_installments INTEGER
) AS $$
DECLARE
    v_remaining_balance DECIMAL;
    v_pending_count INTEGER;
    v_old_amount DECIMAL;
    v_new_amount DECIMAL;
    v_extra_amount DECIMAL;
BEGIN
    -- حساب البيانات الحالية
    SELECT 
        (us.final_sale_price - COALESCE(SUM(sp.amount_paid), 0) - COALESCE(ep.amount, 0)),
        COUNT(*) FILTER (WHERE sp.status = 'pending'),
        AVG(sp.scheduled_amount) FILTER (WHERE sp.status = 'pending'),
        COALESCE(ep.amount, 0)
    INTO v_remaining_balance, v_pending_count, v_old_amount, v_extra_amount
    FROM unit_sales us
    LEFT JOIN scheduled_payments sp ON sp.unit_sale_id = us.id
    LEFT JOIN extra_payments ep ON ep.id = p_extra_payment_id
    WHERE us.id = p_unit_sale_id
    GROUP BY us.final_sale_price, ep.amount;

    -- التحقق من المبلغ المتبقي
    IF v_remaining_balance <= 0 THEN
        UPDATE scheduled_payments
        SET status = 'paid',
            amount_paid = scheduled_amount,
            actual_payment_date = CURRENT_DATE
        WHERE unit_sale_id = p_unit_sale_id 
        AND status = 'pending';
        
        RETURN QUERY SELECT true, 'تم دفع جميع الأقساط المتبقية'::TEXT, 0::DECIMAL, 0::INTEGER;
        RETURN;
    END IF;

    -- التحقق من وجود أقساط معلقة
    IF v_pending_count = 0 THEN
        RETURN QUERY SELECT false, 'لا توجد أقساط معلقة لإعادة جدولتها'::TEXT, 0::DECIMAL, 0::INTEGER;
        RETURN;
    END IF;

    -- حساب المبلغ الجديد
    v_new_amount := v_remaining_balance / v_pending_count;
    
    -- حفظ السجل في جدول التاريخ
    INSERT INTO payment_schedule_history (
        unit_sale_id,
        extra_payment_id,
        reschedule_option,
        old_pending_count,
        old_installment_amount,
        old_remaining_balance,
        new_pending_count,
        new_installment_amount,
        new_remaining_balance,
        extra_payment_amount,
        modified_by
    ) VALUES (
        p_unit_sale_id,
        p_extra_payment_id,
        'reduce_amount',
        v_pending_count,
        v_old_amount,
        v_remaining_balance + v_extra_amount,
        v_pending_count,
        v_new_amount,
        v_remaining_balance,
        v_extra_amount,
        p_modified_by
    );
    
    -- تحديث الأقساط المعلقة بالمبلغ الجديد
    UPDATE scheduled_payments
    SET scheduled_amount = v_new_amount
    WHERE unit_sale_id = p_unit_sale_id 
    AND status = 'pending';
    
    RETURN QUERY SELECT 
        true, 
        'تم إعادة جدولة الأقساط بنجاح - تم تقليل مبلغ القسط'::TEXT,
        v_new_amount,
        v_pending_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5.1 دالة لتقليل عدد الأقساط (نفس المبلغ)
-- =====================================================
CREATE OR REPLACE FUNCTION reschedule_reduce_count(
    p_unit_sale_id TEXT,
    p_extra_payment_id TEXT,
    p_modified_by TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    new_installment_count INTEGER,
    installment_amount DECIMAL
) AS $$
DECLARE
    v_remaining_balance DECIMAL;
    v_old_pending_count INTEGER;
    v_new_pending_count INTEGER;
    v_installment_amount DECIMAL;
    v_extra_amount DECIMAL;
    v_to_delete INTEGER;
    v_original_period TEXT;
BEGIN
    -- حساب البيانات الحالية
    SELECT 
        (us.final_sale_price - COALESCE(SUM(sp.amount_paid), 0) - COALESCE(ep.amount, 0)),
        COUNT(*) FILTER (WHERE sp.status = 'pending'),
        AVG(sp.scheduled_amount) FILTER (WHERE sp.status = 'pending'),
        COALESCE(ep.amount, 0)
    INTO v_remaining_balance, v_old_pending_count, v_installment_amount, v_extra_amount
    FROM unit_sales us
    LEFT JOIN scheduled_payments sp ON sp.unit_sale_id = us.id
    LEFT JOIN extra_payments ep ON ep.id = p_extra_payment_id
    WHERE us.id = p_unit_sale_id
    GROUP BY us.final_sale_price, ep.amount;

    -- التحقق من المبلغ المتبقي
    IF v_remaining_balance <= 0 THEN
        DELETE FROM scheduled_payments
        WHERE unit_sale_id = p_unit_sale_id AND status = 'pending';
        
        RETURN QUERY SELECT true, 'تم دفع جميع الأقساط'::TEXT, 0::INTEGER, 0::DECIMAL;
        RETURN;
    END IF;

    -- حساب عدد الأقساط الجديد
    v_new_pending_count := CEIL(v_remaining_balance / v_installment_amount)::INTEGER;
    v_to_delete := v_old_pending_count - v_new_pending_count;

    IF v_to_delete <= 0 THEN
        RETURN QUERY SELECT false, 'المبلغ الإضافي غير كافٍ لتقليل عدد الأقساط'::TEXT, v_old_pending_count, v_installment_amount;
        RETURN;
    END IF;

    -- حفظ السجل
    INSERT INTO payment_schedule_history (
        unit_sale_id,
        extra_payment_id,
        reschedule_option,
        old_pending_count,
        old_installment_amount,
        old_remaining_balance,
        new_pending_count,
        new_installment_amount,
        new_remaining_balance,
        extra_payment_amount,
        modified_by
    ) VALUES (
        p_unit_sale_id,
        p_extra_payment_id,
        'reduce_count',
        v_old_pending_count,
        v_installment_amount,
        v_remaining_balance + v_extra_amount,
        v_new_pending_count,
        v_installment_amount,
        v_remaining_balance,
        v_extra_amount,
        p_modified_by
    );

    -- حذف آخر أقساط معلقة
    DELETE FROM scheduled_payments
    WHERE id IN (
        SELECT id FROM scheduled_payments
        WHERE unit_sale_id = p_unit_sale_id AND status = 'pending'
        ORDER BY due_date DESC
        LIMIT v_to_delete
    );

    RETURN QUERY SELECT 
        true,
        format('تم تقليل عدد الأقساط من %s إلى %s', v_old_pending_count, v_new_pending_count)::TEXT,
        v_new_pending_count,
        v_installment_amount;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. دالة لإعادة جدولة الدفعات يدوياً (مخصص)
-- =====================================================
CREATE OR REPLACE FUNCTION reschedule_custom(
    p_unit_sale_id TEXT,
    p_extra_payment_id TEXT,
    p_new_installment_count INTEGER,
    p_new_period TEXT,
    p_start_date DATE,
    p_modified_by TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    new_installment_amount DECIMAL,
    new_installment_count INTEGER
) AS $$
DECLARE
    v_remaining_balance DECIMAL;
    v_old_pending_count INTEGER;
    v_old_installment_amount DECIMAL;
    v_installment_amount DECIMAL;
    v_current_date DATE;
    v_extra_amount DECIMAL;
    i INTEGER;
BEGIN
    -- حساب البيانات الحالية
    SELECT 
        (us.final_sale_price - COALESCE(SUM(sp.amount_paid), 0) - COALESCE(ep.amount, 0)),
        COUNT(*) FILTER (WHERE sp.status = 'pending'),
        AVG(sp.scheduled_amount) FILTER (WHERE sp.status = 'pending'),
        COALESCE(ep.amount, 0)
    INTO v_remaining_balance, v_old_pending_count, v_old_installment_amount, v_extra_amount
    FROM unit_sales us
    LEFT JOIN scheduled_payments sp ON sp.unit_sale_id = us.id
    LEFT JOIN extra_payments ep ON ep.id = p_extra_payment_id
    WHERE us.id = p_unit_sale_id
    GROUP BY us.final_sale_price, ep.amount;

    -- التحقق من الصحة
    IF v_remaining_balance <= 0 THEN
        RETURN QUERY SELECT false, 'المبلغ المتبقي صفر أو سالب'::TEXT, 0::DECIMAL, 0::INTEGER;
        RETURN;
    END IF;

    IF p_new_installment_count <= 0 THEN
        RETURN QUERY SELECT false, 'عدد الأقساط يجب أن يكون أكبر من صفر'::TEXT, 0::DECIMAL, 0::INTEGER;
        RETURN;
    END IF;

    -- حساب مبلغ القسط الجديد
    v_installment_amount := v_remaining_balance / p_new_installment_count;
    v_current_date := COALESCE(p_start_date, CURRENT_DATE);

    -- حفظ السجل
    INSERT INTO payment_schedule_history (
        unit_sale_id,
        extra_payment_id,
        reschedule_option,
        old_pending_count,
        old_installment_amount,
        old_remaining_balance,
        new_pending_count,
        new_installment_amount,
        new_remaining_balance,
        new_installment_period,
        extra_payment_amount,
        modified_by
    ) VALUES (
        p_unit_sale_id,
        p_extra_payment_id,
        'custom',
        v_old_pending_count,
        v_old_installment_amount,
        v_remaining_balance + v_extra_amount,
        p_new_installment_count,
        v_installment_amount,
        v_remaining_balance,
        p_new_period,
        v_extra_amount,
        p_modified_by
    );

    -- حذف الدفعات المعلقة القديمة
    DELETE FROM scheduled_payments
    WHERE unit_sale_id = p_unit_sale_id 
    AND status = 'pending';

    -- إنشاء جدول دفعات جديد
    FOR i IN 1..p_new_installment_count LOOP
        INSERT INTO scheduled_payments (
            id,
            unit_sale_id,
            installment_number,
            scheduled_amount,
            due_date,
            status,
            created_at
        ) VALUES (
            gen_random_uuid()::TEXT,
            p_unit_sale_id,
            i,
            v_installment_amount,
            v_current_date,
            'pending',
            TIMEZONE('utc', NOW())
        );

        -- حساب تاريخ الدفعة التالية
        v_current_date := CASE p_new_period
            WHEN 'daily' THEN v_current_date + INTERVAL '1 day'
            WHEN 'weekly' THEN v_current_date + INTERVAL '1 week'
            WHEN 'monthly' THEN v_current_date + INTERVAL '1 month'
            WHEN 'yearly' THEN v_current_date + INTERVAL '1 year'
            ELSE v_current_date + INTERVAL '1 month'
        END;
    END LOOP;

    RETURN QUERY SELECT 
        true,
        format('تم إنشاء جدول دفع جديد: %s أقساط × %s', p_new_installment_count, v_installment_amount)::TEXT,
        v_installment_amount,
        p_new_installment_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. دالة ذكية لحساب خيارات إعادة الجدولة المتاحة
-- =====================================================
CREATE OR REPLACE FUNCTION get_reschedule_options(
    p_unit_sale_id TEXT,
    p_extra_payment_amount DECIMAL
)
RETURNS TABLE(
    option_type TEXT,
    option_name TEXT,
    description TEXT,
    new_installment_amount DECIMAL,
    new_installment_count INTEGER,
    current_installment_amount DECIMAL,
    current_installment_count INTEGER,
    remaining_balance DECIMAL,
    can_apply BOOLEAN
) AS $$
DECLARE
    v_remaining_balance DECIMAL;
    v_pending_count INTEGER;
    v_current_amount DECIMAL;
    v_new_amount_option1 DECIMAL;
    v_new_count_option2 INTEGER;
BEGIN
    -- حساب البيانات الحالية
    SELECT 
        (us.final_sale_price - COALESCE(SUM(sp.amount_paid), 0) - p_extra_payment_amount),
        COUNT(*) FILTER (WHERE sp.status = 'pending'),
        AVG(sp.scheduled_amount) FILTER (WHERE sp.status = 'pending')
    INTO v_remaining_balance, v_pending_count, v_current_amount
    FROM unit_sales us
    LEFT JOIN scheduled_payments sp ON sp.unit_sale_id = us.id
    WHERE us.id = p_unit_sale_id
    GROUP BY us.final_sale_price;

    -- الخيار 1: تقليل مبلغ القسط (نفس العدد)
    v_new_amount_option1 := CASE 
        WHEN v_pending_count > 0 THEN v_remaining_balance / v_pending_count 
        ELSE 0 
    END;

    -- الخيار 2: تقليل عدد الأقساط (نفس المبلغ)
    v_new_count_option2 := CASE 
        WHEN v_current_amount > 0 THEN CEIL(v_remaining_balance / v_current_amount)::INTEGER
        ELSE 0
    END;

    -- إرجاع الخيارات
    RETURN QUERY
    -- الخيار 1
    SELECT 
        'reduce_amount'::TEXT,
        'تقليل مبلغ القسط'::TEXT,
        format('توزيع المبلغ المتبقي على نفس عدد الأقساط (%s أقساط)', v_pending_count)::TEXT,
        v_new_amount_option1,
        v_pending_count,
        v_current_amount,
        v_pending_count,
        v_remaining_balance,
        (v_remaining_balance > 0 AND v_pending_count > 0)::BOOLEAN
    
    UNION ALL
    
    -- الخيار 2
    SELECT 
        'reduce_count'::TEXT,
        'تقليل عدد الأقساط'::TEXT,
        format('تقليل عدد الأقساط من %s إلى %s (نفس المبلغ)', v_pending_count, v_new_count_option2)::TEXT,
        v_current_amount,
        v_new_count_option2,
        v_current_amount,
        v_pending_count,
        v_remaining_balance,
        (v_remaining_balance > 0 AND v_new_count_option2 < v_pending_count)::BOOLEAN
    
    UNION ALL
    
    -- الخيار 3
    SELECT 
        'custom'::TEXT,
        'إعادة جدولة مخصصة'::TEXT,
        'إنشاء جدول دفع جديد بمبالغ وفترات مخصصة'::TEXT,
        NULL::DECIMAL,
        NULL::INTEGER,
        v_current_amount,
        v_pending_count,
        v_remaining_balance,
        (v_remaining_balance > 0)::BOOLEAN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. دالة موحدة ذكية لإعادة الجدولة
-- =====================================================
CREATE OR REPLACE FUNCTION apply_reschedule(
    p_unit_sale_id TEXT,
    p_extra_payment_id TEXT,
    p_option_type TEXT, -- 'reduce_amount', 'reduce_count', 'custom'
    p_custom_count INTEGER DEFAULT NULL,
    p_custom_period TEXT DEFAULT NULL,
    p_custom_start_date DATE DEFAULT NULL,
    p_modified_by TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    details JSONB
) AS $$
DECLARE
    v_result RECORD;
BEGIN
    -- اختيار الدالة المناسبة حسب النوع
    CASE p_option_type
        WHEN 'reduce_amount' THEN
            SELECT * INTO v_result FROM reschedule_reduce_amount(
                p_unit_sale_id, 
                p_extra_payment_id, 
                p_modified_by
            );
            
            RETURN QUERY SELECT 
                v_result.success,
                v_result.message,
                jsonb_build_object(
                    'new_installment_amount', v_result.new_installment_amount,
                    'remaining_installments', v_result.remaining_installments
                );
        
        WHEN 'reduce_count' THEN
            SELECT * INTO v_result FROM reschedule_reduce_count(
                p_unit_sale_id,
                p_extra_payment_id,
                p_modified_by
            );
            
            RETURN QUERY SELECT 
                v_result.success,
                v_result.message,
                jsonb_build_object(
                    'new_installment_count', v_result.new_installment_count,
                    'installment_amount', v_result.installment_amount
                );
        
        WHEN 'custom' THEN
            IF p_custom_count IS NULL OR p_custom_period IS NULL THEN
                RETURN QUERY SELECT 
                    false,
                    'يجب تحديد عدد الأقساط والفترة للجدولة المخصصة'::TEXT,
                    '{}'::JSONB;
                RETURN;
            END IF;
            
            SELECT * INTO v_result FROM reschedule_custom(
                p_unit_sale_id,
                p_extra_payment_id,
                p_custom_count,
                p_custom_period,
                p_custom_start_date,
                p_modified_by
            );
            
            RETURN QUERY SELECT 
                v_result.success,
                v_result.message,
                jsonb_build_object(
                    'new_installment_amount', v_result.new_installment_amount,
                    'new_installment_count', v_result.new_installment_count
                );
        
        ELSE
            RETURN QUERY SELECT 
                false,
                'نوع إعادة الجدولة غير صحيح'::TEXT,
                '{}'::JSONB;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- عرض النتيجة
-- =====================================================
SELECT 
    'نظام المرفقات والدفعات الإضافية تم إنشاؤه بنجاح!' as message,
    (SELECT COUNT(*) FROM payment_attachments) as total_attachments,
    (SELECT COUNT(*) FROM extra_payments) as total_extra_payments;
