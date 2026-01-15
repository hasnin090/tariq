-- ============================================================================
-- نظام خطط الدفع والجدولة - Payment Schedule System
-- ============================================================================
-- الغرض: إضافة نظام متكامل لتتبع خطط سداد الوحدات السكنية
-- تاريخ: 15 ديسمبر 2025
-- ============================================================================

-- ============================================================================
-- 1. إضافة أعمدة خطة الدفع لجدول bookings
-- ============================================================================

-- سنوات خطة الدفع (4 أو 5 سنوات)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_plan_years INTEGER DEFAULT NULL;

-- تعليق
COMMENT ON COLUMN bookings.payment_plan_years IS 'عدد سنوات خطة الدفع: 4 أو 5 سنوات';

-- تكرار الدفع بالأشهر (1 = شهري، 2 = كل شهرين، ... 5 = كل 5 أشهر)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_frequency_months INTEGER DEFAULT NULL;

COMMENT ON COLUMN bookings.payment_frequency_months IS 'تكرار الدفع: 1=شهري، 2=كل شهرين، 3=كل 3 أشهر، 4=كل 4 أشهر، 5=كل 5 أشهر';

-- تاريخ بدء الدفعات
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_start_date DATE DEFAULT NULL;

COMMENT ON COLUMN bookings.payment_start_date IS 'تاريخ بدء أول دفعة مجدولة';

-- المبلغ الشهري المحسوب
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS monthly_amount NUMERIC(15,2) DEFAULT NULL;

COMMENT ON COLUMN bookings.monthly_amount IS 'المبلغ الشهري = سعر الوحدة / عدد الأشهر الإجمالي';

-- مبلغ الدفعة الواحدة
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS installment_amount NUMERIC(15,2) DEFAULT NULL;

COMMENT ON COLUMN bookings.installment_amount IS 'مبلغ الدفعة = المبلغ الشهري × فترة الدفع';

-- إجمالي عدد الدفعات
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS total_installments INTEGER DEFAULT NULL;

COMMENT ON COLUMN bookings.total_installments IS 'إجمالي عدد الدفعات المجدولة';

-- ============================================================================
-- 2. جدول الدفعات المجدولة (scheduled_payments)
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_payments (
    id TEXT PRIMARY KEY DEFAULT ('sched_' || gen_random_uuid()::text),
    
    -- ربط بالحجز
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    
    -- رقم الدفعة
    installment_number INTEGER NOT NULL,
    
    -- تاريخ الاستحقاق
    due_date DATE NOT NULL,
    
    -- المبلغ المستحق
    amount NUMERIC(15,2) NOT NULL,
    
    -- حالة الدفعة
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partially_paid')),
    
    -- المبلغ المدفوع فعلياً (للدفعات الجزئية)
    paid_amount NUMERIC(15,2) DEFAULT 0,
    
    -- تاريخ الدفع الفعلي
    paid_date DATE DEFAULT NULL,
    
    -- ربط بالدفعة الفعلية إذا تمت
    payment_id TEXT REFERENCES payments(id) ON DELETE SET NULL,
    
    -- هل تم إرسال إشعار؟
    notification_sent BOOLEAN DEFAULT FALSE,
    
    -- تاريخ إرسال الإشعار
    notification_sent_at TIMESTAMP DEFAULT NULL,
    
    -- ملاحظات
    notes TEXT DEFAULT NULL,
    
    -- أوقات التتبع
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_scheduled_payments_booking ON scheduled_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_payments_due_date ON scheduled_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_payments_status ON scheduled_payments(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_payments_notification ON scheduled_payments(notification_sent, due_date) WHERE status = 'pending';

-- تعليق على الجدول
COMMENT ON TABLE scheduled_payments IS 'جدول الدفعات المجدولة - يحتوي على جميع الدفعات المستحقة لكل حجز مع تواريخها وحالاتها';

-- ============================================================================
-- 3. جدول إشعارات الدفعات (payment_notifications)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_notifications (
    id TEXT PRIMARY KEY DEFAULT ('pnotif_' || gen_random_uuid()::text),
    
    -- ربط بالدفعة المجدولة
    scheduled_payment_id TEXT NOT NULL REFERENCES scheduled_payments(id) ON DELETE CASCADE,
    
    -- ربط بالحجز
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    
    -- معلومات العميل (للعرض السريع)
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    
    -- اسم الوحدة
    unit_name TEXT NOT NULL,
    
    -- المبلغ المستحق
    amount_due NUMERIC(15,2) NOT NULL,
    
    -- تاريخ الاستحقاق
    due_date DATE NOT NULL,
    
    -- نوع الإشعار
    notification_type TEXT NOT NULL DEFAULT 'reminder' CHECK (notification_type IN ('reminder', 'due_today', 'overdue')),
    
    -- هل تم قراءة الإشعار؟
    is_read BOOLEAN DEFAULT FALSE,
    
    -- رسالة الإشعار
    message TEXT DEFAULT NULL,
    
    -- أوقات التتبع
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهارس
CREATE INDEX IF NOT EXISTS idx_payment_notifications_read ON payment_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_booking ON payment_notifications(booking_id);

COMMENT ON TABLE payment_notifications IS 'إشعارات الدفعات المستحقة - ترسل للمستخدمين عند اقتراب/حلول موعد الدفعة';

-- ============================================================================
-- 4. دالة لإنشاء الدفعات المجدولة تلقائياً
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_scheduled_payments(
    p_booking_id TEXT,
    p_unit_price NUMERIC,
    p_payment_plan_years INTEGER,
    p_payment_frequency_months INTEGER,
    p_start_date DATE
)
RETURNS INTEGER AS $$
DECLARE
    v_total_months INTEGER;
    v_monthly_amount NUMERIC(15,2);
    v_installment_amount NUMERIC(15,2);
    v_total_installments INTEGER;
    v_current_date DATE;
    v_installment_number INTEGER := 1;
BEGIN
    -- حساب إجمالي الأشهر
    v_total_months := p_payment_plan_years * 12;
    
    -- حساب المبلغ الشهري
    v_monthly_amount := ROUND(p_unit_price / v_total_months, 2);
    
    -- حساب مبلغ الدفعة
    v_installment_amount := ROUND(v_monthly_amount * p_payment_frequency_months, 2);
    
    -- حساب عدد الدفعات
    v_total_installments := CEIL(v_total_months::NUMERIC / p_payment_frequency_months);
    
    -- حذف الدفعات المجدولة السابقة (إن وجدت)
    DELETE FROM scheduled_payments WHERE booking_id = p_booking_id;
    
    -- تحديث بيانات الحجز
    UPDATE bookings SET
        payment_plan_years = p_payment_plan_years,
        payment_frequency_months = p_payment_frequency_months,
        payment_start_date = p_start_date,
        monthly_amount = v_monthly_amount,
        installment_amount = v_installment_amount,
        total_installments = v_total_installments,
        updated_at = NOW()
    WHERE id = p_booking_id;
    
    -- إنشاء الدفعات المجدولة
    v_current_date := p_start_date;
    
    WHILE v_installment_number <= v_total_installments LOOP
        -- الدفعة الأخيرة قد تكون مختلفة لتعويض الفرق في التقريب
        IF v_installment_number = v_total_installments THEN
            v_installment_amount := p_unit_price - (v_installment_amount * (v_total_installments - 1));
        END IF;
        
        INSERT INTO scheduled_payments (
            booking_id,
            installment_number,
            due_date,
            amount,
            status
        ) VALUES (
            p_booking_id,
            v_installment_number,
            v_current_date,
            v_installment_amount,
            'pending'
        );
        
        -- الانتقال للدفعة التالية
        v_installment_number := v_installment_number + 1;
        v_current_date := v_current_date + (p_payment_frequency_months || ' months')::INTERVAL;
    END LOOP;
    
    RETURN v_total_installments;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_scheduled_payments IS 'إنشاء جدول الدفعات المجدولة لحجز معين بناءً على خطة الدفع';

-- ============================================================================
-- 5. دالة للتحقق من الدفعات المتأخرة وإنشاء الإشعارات
-- ============================================================================

CREATE OR REPLACE FUNCTION check_overdue_payments_and_notify()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_scheduled RECORD;
    v_booking RECORD;
    v_customer RECORD;
    v_unit RECORD;
BEGIN
    -- تحديث حالة الدفعات المتأخرة
    UPDATE scheduled_payments
    SET status = 'overdue', updated_at = NOW()
    WHERE status = 'pending' AND due_date < CURRENT_DATE;
    
    -- البحث عن الدفعات التي تستحق اليوم أو خلال 3 أيام ولم يتم إشعارها
    FOR v_scheduled IN 
        SELECT sp.* 
        FROM scheduled_payments sp
        WHERE sp.status IN ('pending', 'overdue')
        AND sp.notification_sent = FALSE
        AND sp.due_date <= CURRENT_DATE + INTERVAL '3 days'
    LOOP
        -- جلب بيانات الحجز
        SELECT * INTO v_booking FROM bookings WHERE id = v_scheduled.booking_id;
        
        -- جلب بيانات العميل
        SELECT * INTO v_customer FROM customers WHERE id = v_booking.customer_id;
        
        -- جلب بيانات الوحدة
        SELECT * INTO v_unit FROM units WHERE id = v_booking.unit_id;
        
        -- إنشاء الإشعار
        INSERT INTO payment_notifications (
            scheduled_payment_id,
            booking_id,
            customer_name,
            customer_phone,
            unit_name,
            amount_due,
            due_date,
            notification_type
        ) VALUES (
            v_scheduled.id,
            v_scheduled.booking_id,
            v_customer.name,
            v_customer.phone,
            v_unit.unit_number,
            v_scheduled.amount,
            v_scheduled.due_date,
            CASE 
                WHEN v_scheduled.due_date < CURRENT_DATE THEN 'overdue'
                WHEN v_scheduled.due_date = CURRENT_DATE THEN 'due_today'
                ELSE 'reminder'
            END
        );
        
        -- تحديث حالة الإشعار
        UPDATE scheduled_payments 
        SET notification_sent = TRUE, notification_sent_at = NOW()
        WHERE id = v_scheduled.id;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_overdue_payments_and_notify IS 'فحص الدفعات المستحقة/المتأخرة وإنشاء إشعارات للمستخدمين';

-- ============================================================================
-- 6. دالة لربط الدفعة الفعلية بالدفعة المجدولة
-- ============================================================================

CREATE OR REPLACE FUNCTION link_payment_to_scheduled(
    p_payment_id TEXT,
    p_scheduled_payment_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_payment RECORD;
    v_scheduled RECORD;
BEGIN
    -- جلب الدفعة
    SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الدفعة غير موجودة: %', p_payment_id;
    END IF;
    
    -- جلب الدفعة المجدولة
    SELECT * INTO v_scheduled FROM scheduled_payments WHERE id = p_scheduled_payment_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الدفعة المجدولة غير موجودة: %', p_scheduled_payment_id;
    END IF;
    
    -- تحديث الدفعة المجدولة
    UPDATE scheduled_payments SET
        status = CASE 
            WHEN v_payment.amount >= v_scheduled.amount THEN 'paid'
            ELSE 'partially_paid'
        END,
        paid_amount = COALESCE(paid_amount, 0) + v_payment.amount,
        paid_date = v_payment.payment_date,
        payment_id = p_payment_id,
        updated_at = NOW()
    WHERE id = p_scheduled_payment_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. View لعرض الدفعات المستحقة مع بيانات العميل
-- ============================================================================

CREATE OR REPLACE VIEW view_upcoming_payments AS
SELECT 
    sp.id AS scheduled_payment_id,
    sp.booking_id,
    sp.installment_number,
    sp.due_date,
    sp.amount,
    sp.status,
    sp.paid_amount,
    b.unit_id,
    u.unit_number AS unit_name,
    u.price AS unit_price,
    b.customer_id,
    c.name AS customer_name,
    c.phone AS customer_phone,
    c.email AS customer_email,
    b.payment_plan_years,
    b.payment_frequency_months,
    b.total_installments,
    (sp.due_date - CURRENT_DATE) AS days_until_due,
    CASE 
        WHEN sp.due_date < CURRENT_DATE THEN 'متأخرة'
        WHEN sp.due_date = CURRENT_DATE THEN 'اليوم'
        WHEN sp.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'قريباً'
        ELSE 'مجدولة'
    END AS urgency
FROM scheduled_payments sp
JOIN bookings b ON sp.booking_id = b.id
JOIN units u ON b.unit_id = u.id
JOIN customers c ON b.customer_id = c.id
WHERE sp.status IN ('pending', 'overdue', 'partially_paid')
ORDER BY sp.due_date ASC;

COMMENT ON VIEW view_upcoming_payments IS 'عرض الدفعات القادمة والمتأخرة مع بيانات العميل الكاملة';

-- ============================================================================
-- 8. RLS Policies
-- ============================================================================

-- تفعيل RLS
ALTER TABLE scheduled_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;

-- 🔥 حذف السياسات القديمة إن وجدت (لتجنب التعارض)
DROP POLICY IF EXISTS "Allow all for authenticated" ON scheduled_payments;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON scheduled_payments;
DROP POLICY IF EXISTS "Allow all for authenticated" ON payment_notifications;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payment_notifications;

-- 🔁 حذف السياسات الجديدة إن كانت موجودة (لجعل السكربت قابل لإعادة التشغيل)
DROP POLICY IF EXISTS "scheduled_payments_select_policy" ON scheduled_payments;
DROP POLICY IF EXISTS "scheduled_payments_insert_policy" ON scheduled_payments;
DROP POLICY IF EXISTS "scheduled_payments_update_policy" ON scheduled_payments;
DROP POLICY IF EXISTS "scheduled_payments_delete_policy" ON scheduled_payments;
DROP POLICY IF EXISTS "payment_notifications_select_policy" ON payment_notifications;
DROP POLICY IF EXISTS "payment_notifications_insert_policy" ON payment_notifications;
DROP POLICY IF EXISTS "payment_notifications_update_policy" ON payment_notifications;
DROP POLICY IF EXISTS "payment_notifications_delete_policy" ON payment_notifications;

-- ✅ سياسات scheduled_payments (واضحة ومحددة)
CREATE POLICY "scheduled_payments_select_policy" ON scheduled_payments
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "scheduled_payments_insert_policy" ON scheduled_payments
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "scheduled_payments_update_policy" ON scheduled_payments
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "scheduled_payments_delete_policy" ON scheduled_payments
    FOR DELETE TO anon, authenticated
    USING (true);

-- ✅ سياسات payment_notifications
CREATE POLICY "payment_notifications_select_policy" ON payment_notifications
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "payment_notifications_insert_policy" ON payment_notifications
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "payment_notifications_update_policy" ON payment_notifications
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "payment_notifications_delete_policy" ON payment_notifications
    FOR DELETE TO anon, authenticated
    USING (true);

-- ============================================================================
-- 9. إنشاء فهرس للبحث السريع
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_bookings_payment_plan ON bookings(payment_plan_years) WHERE payment_plan_years IS NOT NULL;

-- ============================================================================
-- 10. Trigger لربط الدفعات الجديدة تلقائياً بالدفعات المجدولة
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_link_payment_to_scheduled()
RETURNS TRIGGER AS $$
DECLARE
    v_scheduled RECORD;
    v_remaining_amount NUMERIC;
BEGIN
    -- تطبيق فقط على دفعات التقسيط، وليس دفعة الحجز الأولى
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

-- تطبيق الـ Trigger عند إضافة دفعة جديدة
DROP TRIGGER IF EXISTS auto_link_payment_trigger ON payments;
CREATE TRIGGER auto_link_payment_trigger
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION auto_link_payment_to_scheduled();

COMMENT ON FUNCTION auto_link_payment_to_scheduled IS 'ربط الدفعات الجديدة تلقائياً بأقرب دفعة مجدولة معلقة';

-- ============================================================================
-- انتهى
-- ============================================================================
