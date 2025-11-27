-- جعل عمود email اختيارياً بدلاً من إلزامي
ALTER TABLE public.users 
ALTER COLUMN email DROP NOT NULL;

-- إضافة عمود username إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'username') THEN
        ALTER TABLE public.users ADD COLUMN username TEXT UNIQUE;
    END IF;
END $$;

-- إضافة عمود password إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'password') THEN
        ALTER TABLE public.users ADD COLUMN password TEXT;
    END IF;
END $$;

-- تحديث المستخدمين الحاليين لإضافة username من name وكلمة مرور افتراضية
UPDATE public.users 
SET username = LOWER(REPLACE(name, ' ', '_')),
    password = '123456'
WHERE username IS NULL OR password IS NULL;

-- جعل username إلزامياً بعد ملء البيانات
ALTER TABLE public.users 
ALTER COLUMN username SET NOT NULL;

-- جعل password إلزامياً بعد ملء البيانات
ALTER TABLE public.users 
ALTER COLUMN password SET NOT NULL;

-- ============================================================================
-- جدول الإشعارات (Notifications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('password_reset', 'general', 'alert')),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    username TEXT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES public.users(id)
);

-- إنشاء فهرس لتسريع الاستعلامات
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- إضافة RLS policies للإشعارات
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- السماح للمدراء فقط برؤية جميع الإشعارات
CREATE POLICY "Admins can view all notifications" ON public.notifications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Admin'
        )
    );

-- السماح بإنشاء إشعارات من أي مستخدم مسجل
CREATE POLICY "Authenticated users can create notifications" ON public.notifications
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- السماح للمدراء بتحديث الإشعارات (وضع علامة مقروء/حل)
CREATE POLICY "Admins can update notifications" ON public.notifications
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Admin'
        )
    );

-- التعليق على الجداول
COMMENT ON TABLE public.notifications IS 'جدول الإشعارات للمدراء';
COMMENT ON COLUMN public.notifications.type IS 'نوع الإشعار: password_reset لطلبات استعادة كلمة المرور';
COMMENT ON COLUMN public.notifications.user_id IS 'معرف المستخدم المرتبط بالإشعار';
COMMENT ON COLUMN public.notifications.username IS 'اسم المستخدم لسهولة العرض';
COMMENT ON COLUMN public.notifications.is_read IS 'هل تم قراءة الإشعار';
COMMENT ON COLUMN public.notifications.resolved_at IS 'تاريخ حل المشكلة';
COMMENT ON COLUMN public.notifications.resolved_by IS 'المدير الذي حل المشكلة';
