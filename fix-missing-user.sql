-- ============================================================================
-- مزامنة وإضافة المستخدمين
-- Insert or Sync Users
-- ============================================================================

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

-- ============================================================================
-- تسمية الجداول بالعربية في Supabase SQL Editor
-- ============================================================================

-- تعليق على الجداول لإظهار الأسماء العربية
COMMENT ON TABLE public.users IS 'المستخدمين';
COMMENT ON TABLE public.projects IS 'المشاريع';
COMMENT ON TABLE public.accounts IS 'الحسابات';
COMMENT ON TABLE public.transactions IS 'المعاملات';
COMMENT ON TABLE public.customers IS 'العملاء';
COMMENT ON TABLE public.unit_types IS 'أنواع المساحات';
COMMENT ON TABLE public.unit_statuses IS 'حالات الوحدات';
COMMENT ON TABLE public.units IS 'الوحدات السكنية';
COMMENT ON TABLE public.bookings IS 'الحجوزات';
COMMENT ON TABLE public.payments IS 'المدفوعات';
COMMENT ON TABLE public.documents IS 'المستندات';
COMMENT ON TABLE public.expense_categories IS 'تصنيفات المصاريف';
COMMENT ON TABLE public.vendors IS 'الموردين';
COMMENT ON TABLE public.expenses IS 'المصاريف';
COMMENT ON TABLE public.budgets IS 'الميزانيات';
