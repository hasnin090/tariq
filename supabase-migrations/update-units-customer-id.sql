-- =====================================================
-- تحديث customer_id في جدول الوحدات
-- =====================================================
-- هذا السكريبت يقوم بتحديث customer_id في جدول units
-- بناءً على الحجوزات والمبيعات الموجودة

-- تحديث الوحدات المحجوزة (Booked) بناءً على آخر حجز نشط
UPDATE units u
SET customer_id = b.customer_id
FROM (
    SELECT DISTINCT ON (unit_id) 
        unit_id, 
        customer_id
    FROM bookings
    WHERE status = 'Active'
    ORDER BY unit_id, created_at DESC
) b
WHERE u.id = b.unit_id
  AND u.status = 'Booked'
  AND u.customer_id IS NULL;

-- تحديث الوحدات المباعة (Sold) بناءً على سجل المبيعات
-- ملاحظة: إذا كان لديك جدول unit_sales في قاعدة البيانات
UPDATE units u
SET customer_id = s.customer_id
FROM unit_sales s
WHERE u.id = s.unit_id
  AND u.status = 'Sold'
  AND u.customer_id IS NULL
  AND s.customer_id IS NOT NULL;

-- إزالة customer_id من الوحدات المتاحة
UPDATE units
SET customer_id = NULL
WHERE status = 'Available'
  AND customer_id IS NOT NULL;

-- عرض النتائج
SELECT 
    status,
    COUNT(*) as total_units,
    COUNT(customer_id) as units_with_customer
FROM units
GROUP BY status
ORDER BY status;
