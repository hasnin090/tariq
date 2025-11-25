-- ============================================================================
-- إعادة بناء قاعدة البيانات من الصفر
-- Real Estate Management System - Complete Database Schema
-- ============================================================================

-- حذف الجداول الموجودة بالترتيب الصحيح (من الأسفل للأعلى)
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.vendors CASCADE;
DROP TABLE IF EXISTS public.expense_categories CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.units CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.accounts CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.unit_types CASCADE;
DROP TABLE IF EXISTS public.unit_statuses CASCADE;

-- ============================================================================
-- 1. جدول المستخدمين (Users)
-- ============================================================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Sales', 'Accounting')),
    department TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. جدول المشاريع (Projects)
-- ============================================================================
CREATE TABLE public.projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Planning', 'Active', 'Completed', 'On Hold', 'Cancelled')),
    budget DECIMAL(15, 2),
    total_units INTEGER DEFAULT 0,
    sold_units INTEGER DEFAULT 0,
    available_units INTEGER DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. جدول الحسابات (Accounts)
-- ============================================================================
CREATE TABLE public.accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('Bank', 'Cash', 'Other')),
    balance DECIMAL(15, 2) DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- إدراج حسابات افتراضية
INSERT INTO public.accounts (id, name, account_type, balance, description) VALUES
('account_default_cash', 'خزينة المكتب', 'Cash', 0, 'الحساب النقدي الرئيسي للمكتب'),
('account_default_bank', 'الحساب البنكي', 'Bank', 0, 'الحساب البنكي الرئيسي');

-- ============================================================================
-- 4. جدول المعاملات (Transactions)
-- ============================================================================
CREATE TABLE public.transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT REFERENCES public.accounts(id) ON DELETE CASCADE,
    account_name TEXT,
    type TEXT NOT NULL CHECK (type IN ('Income', 'Expense', 'Transfer')),
    date DATE NOT NULL,
    description TEXT,
    amount DECIMAL(15, 2) NOT NULL,
    source_id TEXT,
    source_type TEXT CHECK (source_type IN ('expense', 'payment', 'sale', 'booking', 'transfer', 'adjustment')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. جدول العملاء (Customers)
-- ============================================================================
CREATE TABLE public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    national_id TEXT,
    address TEXT,
    city TEXT,
    customer_type TEXT DEFAULT 'Individual' CHECK (customer_type IN ('Individual', 'Company')),
    company_name TEXT,
    tax_number TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. جدول أنواع المساحات (Unit Types) - قابلة للتخصيص
-- ============================================================================
CREATE TABLE public.unit_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- إدراج مساحات افتراضية
INSERT INTO public.unit_types (id, name, description) VALUES
('type_1', '100 متر مربع', 'مساحة صغيرة'),
('type_2', '150 متر مربع', 'مساحة متوسطة'),
('type_3', '200 متر مربع', 'مساحة كبيرة'),
('type_4', '250 متر مربع', 'مساحة كبيرة جداً'),
('type_5', '300 متر مربع', 'مساحة فاخرة');

-- ============================================================================
-- 7. جدول حالات الوحدات (Unit Statuses)
-- ============================================================================
CREATE TABLE public.unit_statuses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- إدراج الحالات الافتراضية
INSERT INTO public.unit_statuses (id, name) VALUES
('status_1', 'Available'),
('status_2', 'Booked'),
('status_3', 'Sold');

-- ============================================================================
-- 8. جدول الوحدات السكنية (Units)
-- ============================================================================
CREATE TABLE public.units (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    unit_number TEXT NOT NULL,
    type TEXT NOT NULL REFERENCES public.unit_types(name) ON DELETE RESTRICT,
    status TEXT DEFAULT 'Available' CHECK (status IN ('Available', 'Booked', 'Sold')),
    price DECIMAL(15, 2) NOT NULL,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, unit_number)
);

-- ============================================================================
-- 9. جدول الحجوزات (Bookings)
-- ============================================================================
CREATE TABLE public.bookings (
    id TEXT PRIMARY KEY,
    unit_id TEXT NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    amount_paid DECIMAL(15, 2) DEFAULT 0,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Cancelled', 'Completed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 10. جدول المدفوعات (Payments)
-- ============================================================================
CREATE TABLE public.payments (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Check', 'Credit Card')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 11. جدول المستندات (Documents)
-- ============================================================================
CREATE TABLE public.documents (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_type TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE CASCADE,
    booking_id TEXT REFERENCES public.bookings(id) ON DELETE CASCADE
);

-- ============================================================================
-- 12. جدول تصنيفات المصاريف (Expense Categories)
-- ============================================================================
CREATE TABLE public.expense_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    parent_category_id TEXT REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 13. جدول الموردين (Vendors)
-- ============================================================================
CREATE TABLE public.vendors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company_name TEXT,
    email TEXT,
    phone TEXT,
    tax_number TEXT,
    address TEXT,
    city TEXT,
    vendor_type TEXT CHECK (vendor_type IN ('Supplier', 'Contractor', 'Service Provider', 'Other')),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 14. جدول المصاريف (Expenses)
-- ============================================================================
CREATE TABLE public.expenses (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    vendor_id TEXT REFERENCES public.vendors(id) ON DELETE SET NULL,
    expense_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    payment_method TEXT,
    account_id TEXT REFERENCES public.accounts(id) ON DELETE SET NULL,
    reference_number TEXT,
    receipt_number TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Paid', 'Rejected')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 15. جدول الميزانيات (Budgets)
-- ============================================================================
CREATE TABLE public.budgets (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES public.expense_categories(id) ON DELETE CASCADE,
    budget_amount DECIMAL(15, 2) NOT NULL,
    spent_amount DECIMAL(15, 2) DEFAULT 0,
    remaining_amount DECIMAL(15, 2) GENERATED ALWAYS AS (budget_amount - spent_amount) STORED,
    period_start DATE,
    period_end DATE,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Exceeded')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- إنشاء الفهارس (Indexes)
-- ============================================================================
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_units_project ON public.units(project_id);
CREATE INDEX idx_units_status ON public.units(status);
CREATE INDEX idx_units_customer ON public.units(customer_id);
CREATE INDEX idx_bookings_unit ON public.bookings(unit_id);
CREATE INDEX idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX idx_bookings_project ON public.bookings(project_id);
CREATE INDEX idx_payments_booking ON public.payments(booking_id);
CREATE INDEX idx_expenses_project ON public.expenses(project_id);
CREATE INDEX idx_expenses_category ON public.expenses(category_id);
CREATE INDEX idx_transactions_account ON public.transactions(account_id);

-- ============================================================================
-- تفعيل Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_statuses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- سياسات الأمان (RLS Policies) - السماح بالوصول للمستخدمين المصادق عليهم
-- ============================================================================

-- Users
CREATE POLICY "Allow authenticated users full access" ON public.users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Projects
CREATE POLICY "Allow authenticated users full access" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Accounts
CREATE POLICY "Allow authenticated users full access" ON public.accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Transactions
CREATE POLICY "Allow authenticated users full access" ON public.transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Customers
CREATE POLICY "Allow authenticated users full access" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Units
CREATE POLICY "Allow authenticated users full access" ON public.units FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Bookings
CREATE POLICY "Allow authenticated users full access" ON public.bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Payments
CREATE POLICY "Allow authenticated users full access" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Documents
CREATE POLICY "Allow authenticated users full access" ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Expense Categories
CREATE POLICY "Allow authenticated users full access" ON public.expense_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Vendors
CREATE POLICY "Allow authenticated users full access" ON public.vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Expenses
CREATE POLICY "Allow authenticated users full access" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Budgets
CREATE POLICY "Allow authenticated users full access" ON public.budgets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Unit Types
CREATE POLICY "Allow authenticated users full access" ON public.unit_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Unit Statuses
CREATE POLICY "Allow authenticated users full access" ON public.unit_statuses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- Trigger لربط المستخدمين مع auth.users
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'Sales')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- انتهى إنشاء قاعدة البيانات
-- ============================================================================
