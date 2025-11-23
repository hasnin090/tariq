-- التحقق من جميع الجداول الموجودة في قاعدة البيانات
SELECT 
    table_name,
    table_type
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
ORDER BY 
    table_name;

-- التحقق من أعمدة جدول users
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'users'
ORDER BY 
    ordinal_position;

-- التحقق من الجداول المطلوبة
SELECT 
    'users' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') 
        THEN '✓ موجود' ELSE '✗ غير موجود' END as status
UNION ALL
SELECT 'projects', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') 
        THEN '✓ موجود' ELSE '✗ غير موجود' END
UNION ALL
SELECT 'accounts', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') 
        THEN '✓ موجود' ELSE '✗ غير موجود' END
UNION ALL
SELECT 'transactions', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') 
        THEN '✓ موجود' ELSE '✗ غير موجود' END
UNION ALL
SELECT 'units', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'units') 
        THEN '✓ موجود' ELSE '✗ غير موجود' END
UNION ALL
SELECT 'customers', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') 
        THEN '✓ موجود' ELSE '✗ غير موجود' END
UNION ALL
SELECT 'bookings', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') 
        THEN '✓ موجود' ELSE '✗ غير موجود' END
UNION ALL
SELECT 'payments', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') 
        THEN '✓ موجود' ELSE '✗ غير موجود' END
UNION ALL
SELECT 'expenses', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') 
        THEN '✓ موجود' ELSE '✗ غير موجود' END
UNION ALL
SELECT 'expense_categories', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expense_categories') 
        THEN '✓ موجود' ELSE '✗ غير موجود' END
UNION ALL
SELECT 'vendors', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendors') 
        THEN '✓ موجود' ELSE '✗ غير موجود' END
UNION ALL
SELECT 'budgets', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budgets') 
        THEN '✓ موجود' ELSE '✗ غير موجود' END;
