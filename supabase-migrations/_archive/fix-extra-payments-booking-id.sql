-- ============================================================================
-- إصلاح جدول extra_payments - إضافة booking_id
-- تاريخ: 2026-01-11
-- ============================================================================

-- إضافة عمود booking_id إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'extra_payments' 
        AND column_name = 'booking_id'
    ) THEN
        -- إضافة العمود
        ALTER TABLE public.extra_payments 
        ADD COLUMN booking_id TEXT REFERENCES public.bookings(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ تم إضافة عمود booking_id';
        
        -- إنشاء فهرس للأداء
        CREATE INDEX IF NOT EXISTS idx_extra_payments_booking_id 
        ON public.extra_payments(booking_id);
        
        RAISE NOTICE '✅ تم إنشاء الفهرس';
    ELSE
        RAISE NOTICE 'ℹ️ العمود booking_id موجود مسبقاً';
    END IF;
END;
$$;

-- إضافة عمود payment_type إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'extra_payments' 
        AND column_name = 'payment_type'
    ) THEN
        ALTER TABLE public.extra_payments 
        ADD COLUMN payment_type TEXT DEFAULT 'extra';
        
        RAISE NOTICE '✅ تم إضافة عمود payment_type';
    ELSE
        RAISE NOTICE 'ℹ️ العمود payment_type موجود مسبقاً';
    END IF;
END;
$$;

-- إضافة عمود description إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'extra_payments' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.extra_payments 
        ADD COLUMN description TEXT;
        
        RAISE NOTICE '✅ تم إضافة عمود description';
    ELSE
        RAISE NOTICE 'ℹ️ العمود description موجود مسبقاً';
    END IF;
END;
$$;

-- إضافة عمود created_by إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'extra_payments' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.extra_payments 
        ADD COLUMN created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ تم إضافة عمود created_by';
    ELSE
        RAISE NOTICE 'ℹ️ العمود created_by موجود مسبقاً';
    END IF;
END;
$$;

-- محاولة ربط البيانات الموجودة عبر unit_sale_id (إن وجد)
-- نربط extra_payments مع bookings عبر unit_sales
UPDATE public.extra_payments ep
SET booking_id = b.id
FROM public.bookings b
WHERE ep.unit_sale_id IS NOT NULL 
  AND ep.booking_id IS NULL
  AND b.id = ep.unit_sale_id;

-- عرض الإحصائيات
SELECT 
    'إحصائيات extra_payments' as title,
    COUNT(*) as total_records,
    COUNT(booking_id) as with_booking_id,
    COUNT(unit_sale_id) as with_unit_sale_id
FROM public.extra_payments;
