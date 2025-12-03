-- التحقق من قيد status في جدول units
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM 
    pg_constraint
WHERE 
    conrelid = 'public.units'::regclass
    AND conname LIKE '%status%';

-- عرض جميع القيود على جدول units
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM 
    pg_constraint
WHERE 
    conrelid = 'public.units'::regclass;

-- الحل: حذف القيد القديم وإنشاء واحد جديد يقبل القيم الصحيحة
-- تشغيل هذا فقط إذا كان القيد موجوداً ويسبب مشاكل

-- الخيار 1: حذف القيد تماماً (إذا لم نحتاج إلى التحقق)
-- ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_status_check;

-- الخيار 2: تحديث القيد ليقبل القيم المستخدمة في التطبيق
-- أولاً احذف القيد القديم
ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_status_check;

-- ثم أضف قيد جديد بالقيم الصحيحة
ALTER TABLE public.units 
ADD CONSTRAINT units_status_check 
CHECK (status IN ('Available', 'Booked', 'Sold'));
