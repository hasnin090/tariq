-- إضافة عمود interface_mode لجدول activity_logs
-- يستخدم للفصل بين نشاطات المبيعات ونشاطات المحاسبة

ALTER TABLE activity_logs 
ADD COLUMN IF NOT EXISTS interface_mode TEXT DEFAULT NULL;

-- إضافة تعليق للعمود
COMMENT ON COLUMN activity_logs.interface_mode IS 'projects = مبيعات, expenses = محاسبة';

-- تحديث RLS policies إذا لزم الأمر
-- السماح بقراءة وكتابة العمود الجديد
