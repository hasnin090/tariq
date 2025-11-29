-- ============================================================================
-- إصلاح العمليات المخزنة والمشغلات (Triggers) المفقودة
-- Fix Missing Stored Procedures and Triggers
-- ============================================================================

-- 1. دالة وتريجر لتحديث تاريخ التعديل (updated_at)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق التريجر على جميع الجداول
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.columns WHERE column_name = 'updated_at' AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I', t, t);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
    END LOOP;
END;
$$;

-- 2. تحديث رصيد الحساب عند إضافة/تعديل/حذف معاملة
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- حالة الحذف (DELETE)
    IF (TG_OP = 'DELETE') THEN
        IF OLD.type = 'Income' OR OLD.type = 'Deposit' THEN
            UPDATE public.accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
        ELSIF OLD.type = 'Expense' OR OLD.type = 'Withdrawal' THEN
            UPDATE public.accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
        END IF;
        RETURN OLD;
    
    -- حالة الإضافة (INSERT)
    ELSIF (TG_OP = 'INSERT') THEN
        IF NEW.type = 'Income' OR NEW.type = 'Deposit' THEN
            UPDATE public.accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
        ELSIF NEW.type = 'Expense' OR NEW.type = 'Withdrawal' THEN
            UPDATE public.accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
        END IF;
        RETURN NEW;
    
    -- حالة التعديل (UPDATE)
    ELSIF (TG_OP = 'UPDATE') THEN
        -- عكس العملية القديمة
        IF OLD.type = 'Income' OR OLD.type = 'Deposit' THEN
            UPDATE public.accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
        ELSIF OLD.type = 'Expense' OR OLD.type = 'Withdrawal' THEN
            UPDATE public.accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
        END IF;
        
        -- تطبيق العملية الجديدة
        IF NEW.type = 'Income' OR NEW.type = 'Deposit' THEN
            UPDATE public.accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
        ELSIF NEW.type = 'Expense' OR NEW.type = 'Withdrawal' THEN
            UPDATE public.accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_account_balance_trigger ON public.transactions;

CREATE TRIGGER update_account_balance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();

-- 3. تحديث حالة الوحدة عند الحجز
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_unit_status_on_booking()
RETURNS TRIGGER AS $$
BEGIN
    -- عند إنشاء حجز جديد
    IF (TG_OP = 'INSERT') THEN
        IF NEW.status = 'Active' THEN
            UPDATE public.units SET status = 'Booked', customer_id = NEW.customer_id WHERE id = NEW.unit_id;
        END IF;
        RETURN NEW;
    
    -- عند تعديل حجز
    ELSIF (TG_OP = 'UPDATE') THEN
        -- إذا تم إلغاء الحجز
        IF NEW.status = 'Cancelled' AND OLD.status = 'Active' THEN
            UPDATE public.units SET status = 'Available', customer_id = NULL WHERE id = NEW.unit_id;
        -- إذا تم تفعيل الحجز
        ELSIF NEW.status = 'Active' AND OLD.status != 'Active' THEN
            UPDATE public.units SET status = 'Booked', customer_id = NEW.customer_id WHERE id = NEW.unit_id;
        -- إذا تم تغيير الوحدة
        ELSIF NEW.unit_id != OLD.unit_id THEN
            UPDATE public.units SET status = 'Available', customer_id = NULL WHERE id = OLD.unit_id;
            UPDATE public.units SET status = 'Booked', customer_id = NEW.customer_id WHERE id = NEW.unit_id;
        END IF;
        RETURN NEW;
        
    -- عند حذف حجز
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.units SET status = 'Available', customer_id = NULL WHERE id = OLD.unit_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_unit_status_trigger ON public.bookings;

CREATE TRIGGER update_unit_status_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.update_unit_status_on_booking();

-- 4. تحديث المبلغ المدفوع في الحجز عند الدفع
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_booking_paid_amount()
RETURNS TRIGGER AS $$
DECLARE
    target_booking_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_booking_id := OLD.booking_id;
    ELSE
        target_booking_id := NEW.booking_id;
    END IF;

    UPDATE public.bookings 
    SET amount_paid = (
        SELECT COALESCE(SUM(amount), 0)
        FROM public.payments
        WHERE booking_id = target_booking_id
    )
    WHERE id = target_booking_id;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_booking_paid_amount_trigger ON public.payments;

CREATE TRIGGER update_booking_paid_amount_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.update_booking_paid_amount();

-- 5. دالة مساعدة للتحقق من الاتصال (Health Check)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_db_health()
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'status', 'ok',
        'timestamp', NOW(),
        'database', current_database(),
        'version', version()
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_db_health () TO authenticated;

GRANT EXECUTE ON FUNCTION public.check_db_health () TO anon;

-- ============================================================================
-- تم الانتهاء من الإصلاحات
-- ============================================================================