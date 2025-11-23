-- إضافة مستخدم افتراضي يدوياً
-- استبدل USER_ID_HERE بالمعرف الفعلي للمستخدم من auth.users

-- طريقة 1: إضافة مستخدم محدد (استبدل المعرف والبريد الإلكتروني)
INSERT INTO public.users (id, email, name, role)
VALUES (
    '59abe09b-7baa-4619-93b8-23c03361bbed'::UUID,
    'البريد_الإلكتروني_هنا@example.com',
    'اسم المستخدم',
    'Admin'
)
ON CONFLICT (id) DO UPDATE
SET 
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role;

-- طريقة 2: مزامنة جميع المستخدمين من auth.users
INSERT INTO public.users (id, email, name, role)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'name', email),
    COALESCE(raw_user_meta_data->>'role', 'Admin')
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET 
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    updated_at = CURRENT_TIMESTAMP;
