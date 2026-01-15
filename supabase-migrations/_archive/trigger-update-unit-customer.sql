-- =====================================================
-- Trigger لتحديث customer_id في الوحدات تلقائياً
-- =====================================================
-- هذا الـ trigger يقوم بتحديث customer_id في جدول units
-- عند إنشاء أو تحديث حجز

-- Function to update unit customer_id when booking is created/updated
CREATE OR REPLACE FUNCTION update_unit_customer_on_booking()
RETURNS TRIGGER AS $$
BEGIN
    -- عند إنشاء حجز جديد أو تحديثه لحالة Active
    IF (TG_OP = 'INSERT' AND NEW.status = 'Active') OR 
       (TG_OP = 'UPDATE' AND NEW.status = 'Active' AND OLD.status != 'Active') THEN
        
        UPDATE units
        SET customer_id = NEW.customer_id
        WHERE id = NEW.unit_id;
        
    -- عند إلغاء الحجز
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'Cancelled' AND OLD.status = 'Active' THEN
        
        UPDATE units
        SET customer_id = NULL
        WHERE id = NEW.unit_id AND status = 'Booked';
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء Trigger على جدول bookings
DROP TRIGGER IF EXISTS trigger_update_unit_customer ON bookings;
CREATE TRIGGER trigger_update_unit_customer
    AFTER INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_unit_customer_on_booking();

-- Function to update unit customer_id when unit is sold (via unit_sales if exists)
CREATE OR REPLACE FUNCTION update_unit_customer_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    -- عند إنشاء سجل بيع جديد
    IF TG_OP = 'INSERT' THEN
        UPDATE units
        SET customer_id = NEW.customer_id
        WHERE id = NEW.unit_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء Trigger على جدول unit_sales (إذا كان موجوداً)
-- ملاحظة: قد لا يكون جدول unit_sales موجوداً في قاعدة البيانات
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'unit_sales') THEN
        DROP TRIGGER IF EXISTS trigger_update_unit_customer_on_sale ON unit_sales;
        CREATE TRIGGER trigger_update_unit_customer_on_sale
            AFTER INSERT ON unit_sales
            FOR EACH ROW
            EXECUTE FUNCTION update_unit_customer_on_sale();
    END IF;
END $$;
