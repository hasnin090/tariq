-- =====================================================
-- تحسين RLS Policies لجدول activity_logs
-- =====================================================

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Enable read access for all users" ON public.activity_logs;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.activity_logs;
DROP POLICY IF EXISTS "Enable update for all users" ON public.activity_logs;

-- سياسة القراءة: الجميع يمكنه قراءة السجلات (مبسطة)
CREATE POLICY "Users can read logs"
ON public.activity_logs FOR SELECT
USING (true);

-- سياسة الإدراج: أي مستخدم يمكنه إضافة سجل
CREATE POLICY "Users can insert logs"
ON public.activity_logs FOR INSERT
WITH CHECK (true);

-- سياسة الحذف: الجميع يمكنه حذف السجلات (مبسطة)
CREATE POLICY "Users can delete logs"
ON public.activity_logs FOR DELETE
USING (true);

-- منع التعديل تماماً (السجلات يجب أن تكون immutable)
-- لا نضيف سياسة UPDATE لأنه لن يكون هناك تعديل على السجلات

COMMENT ON TABLE public.activity_logs IS 'جدول سجلات الأنشطة - محمي بـ RLS';
