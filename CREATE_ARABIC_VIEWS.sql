-- ============================================================================
-- إنشاء واجهات عرض (Views) باللغة العربية لجميع الجداول
-- هذا يسمح بالتعامل مع البيانات بأسماء عربية دون التأثير على عمل التطبيق
-- ============================================================================

-- 1. المستخدمين
CREATE OR REPLACE VIEW "المستخدمين" AS 
SELECT 
    id AS "المعرف",
    name AS "الاسم",
    email AS "البريد_الإلكتروني",
    phone AS "رقم_الهاتف",
    role AS "الدور",
    department AS "القسم",
    is_active AS "نشط",
    last_login AS "آخر_تسجيل_دخول",
    created_at AS "تاريخ_الإنشاء"
FROM public.users;

-- 2. المشاريع
CREATE OR REPLACE VIEW "المشاريع" AS 
SELECT 
    id AS "المعرف",
    name AS "اسم_المشروع",
    location AS "الموقع",
    start_date AS "تاريخ_البدء",
    end_date AS "تاريخ_الانتهاء",
    status AS "الحالة",
    budget AS "الميزانية",
    total_units AS "إجمالي_الوحدات",
    sold_units AS "الوحدات_المباعة",
    available_units AS "الوحدات_المتاحة",
    description AS "الوصف",
    is_active AS "نشط",
    created_at AS "تاريخ_الإنشاء"
FROM public.projects;

-- 3. الحسابات
CREATE OR REPLACE VIEW "الحسابات" AS 
SELECT 
    id AS "المعرف",
    name AS "اسم_الحساب",
    account_type AS "نوع_الحساب",
    balance AS "الرصيد",
    description AS "الوصف",
    is_active AS "نشط",
    created_at AS "تاريخ_الإنشاء"
FROM public.accounts;

-- 4. المعاملات
CREATE OR REPLACE VIEW "المعاملات" AS 
SELECT 
    id AS "المعرف",
    account_id AS "معرف_الحساب",
    transaction_type AS "نوع_المعاملة",
    amount AS "المبلغ",
    transaction_date AS "تاريخ_المعاملة",
    description AS "الوصف",
    reference_type AS "نوع_المرجع",
    reference_id AS "معرف_المرجع",
    created_at AS "تاريخ_الإنشاء"
FROM public.transactions;

-- 5. العملاء
CREATE OR REPLACE VIEW "العملاء" AS 
SELECT 
    id AS "المعرف",
    name AS "الاسم",
    email AS "البريد_الإلكتروني",
    phone AS "رقم_الهاتف",
    national_id AS "رقم_الهوية",
    address AS "العنوان",
    city AS "المدينة",
    customer_type AS "نوع_العميل",
    company_name AS "اسم_الشركة",
    tax_number AS "الرقم_الضريبي",
    notes AS "ملاحظات",
    is_active AS "نشط",
    created_at AS "تاريخ_الإنشاء"
FROM public.customers;

-- 6. الوحدات
CREATE OR REPLACE VIEW "الوحدات" AS 
SELECT 
    id AS "المعرف",
    project_id AS "معرف_المشروع",
    name AS "اسم_الوحدة",
    unit_number AS "رقم_الوحدة",
    floor AS "الدور",
    area AS "المساحة",
    bedrooms AS "غرف_النوم",
    bathrooms AS "دورات_المياه",
    type AS "النوع",
    price AS "السعر",
    status AS "الحالة",
    customer_id AS "معرف_العميل",
    customer_name AS "اسم_العميل",
    features AS "المميزات",
    notes AS "ملاحظات",
    is_active AS "نشط",
    created_at AS "تاريخ_الإنشاء"
FROM public.units;

-- 7. الحجوزات
CREATE OR REPLACE VIEW "الحجوزات" AS 
SELECT 
    id AS "المعرف",
    unit_id AS "معرف_الوحدة",
    customer_id AS "معرف_العميل",
    project_id AS "معرف_المشروع",
    booking_date AS "تاريخ_الحجز",
    total_price AS "السعر_الإجمالي",
    down_payment AS "الدفعة_الأولى",
    remaining_amount AS "المبلغ_المتبقي",
    payment_plan AS "خطة_الدفع",
    installments AS "الأقساط",
    status AS "الحالة",
    contract_number AS "رقم_العقد",
    notes AS "ملاحظات",
    created_at AS "تاريخ_الإنشاء"
FROM public.bookings;

-- 8. المدفوعات
CREATE OR REPLACE VIEW "المدفوعات" AS 
SELECT 
    id AS "المعرف",
    booking_id AS "معرف_الحجز",
    customer_id AS "معرف_العميل",
    project_id AS "معرف_المشروع",
    payment_date AS "تاريخ_الدفع",
    amount AS "المبلغ",
    payment_method AS "طريقة_الدفع",
    payment_type AS "نوع_الدفع",
    reference_number AS "رقم_المرجع",
    account_id AS "معرف_الحساب",
    notes AS "ملاحظات",
    created_at AS "تاريخ_الإنشاء"
FROM public.payments;

-- 9. تصنيفات المصاريف
CREATE OR REPLACE VIEW "تصنيفات_المصاريف" AS 
SELECT 
    id AS "المعرف",
    name AS "الاسم",
    description AS "الوصف",
    parent_category_id AS "معرف_التصنيف_الأب",
    is_active AS "نشط",
    created_at AS "تاريخ_الإنشاء"
FROM public.expense_categories;

-- 10. الموردين
CREATE OR REPLACE VIEW "الموردين" AS 
SELECT 
    id AS "المعرف",
    name AS "الاسم",
    company_name AS "اسم_الشركة",
    email AS "البريد_الإلكتروني",
    phone AS "رقم_الهاتف",
    tax_number AS "الرقم_الضريبي",
    address AS "العنوان",
    city AS "المدينة",
    vendor_type AS "نوع_المورد",
    notes AS "ملاحظات",
    is_active AS "نشط",
    created_at AS "تاريخ_الإنشاء"
FROM public.vendors;

-- 11. المصاريف
CREATE OR REPLACE VIEW "المصاريف" AS 
SELECT 
    id AS "المعرف",
    project_id AS "معرف_المشروع",
    category_id AS "معرف_التصنيف",
    vendor_id AS "معرف_المورد",
    expense_date AS "تاريخ_المصروف",
    amount AS "المبلغ",
    description AS "الوصف",
    payment_method AS "طريقة_الدفع",
    account_id AS "معرف_الحساب",
    reference_number AS "رقم_المرجع",
    receipt_number AS "رقم_الإيصال",
    status AS "الحالة",
    notes AS "ملاحظات",
    created_at AS "تاريخ_الإنشاء"
FROM public.expenses;

-- 12. الميزانيات
CREATE OR REPLACE VIEW "الميزانيات" AS 
SELECT 
    id AS "المعرف",
    project_id AS "معرف_المشروع",
    category_id AS "معرف_التصنيف",
    budget_amount AS "مبلغ_الميزانية",
    spent_amount AS "المبلغ_المصروف",
    remaining_amount AS "المبلغ_المتبقي",
    period_start AS "بداية_الفترة",
    period_end AS "نهاية_الفترة",
    status AS "الحالة",
    notes AS "ملاحظات",
    created_at AS "تاريخ_الإنشاء"
FROM public.budgets;

-- التحقق
SELECT table_name as "الجداول_العربية" 
FROM information_schema.views 
WHERE table_schema = 'public';
