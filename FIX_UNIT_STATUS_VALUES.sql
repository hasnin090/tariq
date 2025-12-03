-- التحقق من القيم الموجودة في جدول unit_statuses
SELECT id, name FROM public.unit_statuses ORDER BY name;

-- إصلاح المشكلة: تحديث القيم لتكون بالإنجليزية أو تحديث القيد

-- الحل 1: تحديث أسماء الحالات لتكون بالإنجليزية
UPDATE public.unit_statuses SET name = 'Available' WHERE name = 'متاح';
UPDATE public.unit_statuses SET name = 'Booked' WHERE name = 'محجوز';
UPDATE public.unit_statuses SET name = 'Sold' WHERE name = 'مباع';

-- الحل 2: تحديث القيد ليقبل القيم العربية
-- أولاً احذف القيد القديم
ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_status_check;

-- ثم أضف قيد جديد بالقيم العربية
ALTER TABLE public.units 
ADD CONSTRAINT units_status_check 
CHECK (status IN ('متاح', 'محجوز', 'مباع', 'Available', 'Booked', 'Sold'));

-- أو احذف القيد تماماً (الأبسط)
-- ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_status_check;
