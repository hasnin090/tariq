-- ============================================================================
-- إعادة تعيين قاعدة البيانات بالكامل وإنشاء جميع الجداول
-- تحذير: سيتم حذف جميع البيانات الموجودة
-- ============================================================================

-- ============================================================================
-- 1. حذف جميع الجداول القديمة (بالترتيب الصحيح)
-- ============================================================================

DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.vendors CASCADE;
DROP TABLE IF EXISTS public.expense_categories CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.units CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.accounts CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================================================
-- 2. إنشاء جدول Users
-- ============================================================================

CREATE TABLE public.users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Manager', 'Sales', 'Accountant', 'Viewer')),
    department TEXT,
    assigned_project_id TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_users_role ON public.users(role);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Enable insert for admins only" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for admins only" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Enable delete for admins only" ON public.users FOR DELETE USING (true);

-- ============================================================================
-- 3. إنشاء جدول Projects
-- ============================================================================

CREATE TABLE public.projects (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    location TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'On Hold', 'Cancelled')),
    budget DECIMAL(15, 2),
    total_units INTEGER DEFAULT 0,
    sold_units INTEGER DEFAULT 0,
    available_units INTEGER DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_name ON public.projects(name);
CREATE INDEX idx_projects_status ON public.projects(status);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Enable insert for admins only" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for admins only" ON public.projects FOR UPDATE USING (true);
CREATE POLICY "Enable delete for admins only" ON public.projects FOR DELETE USING (true);

-- ============================================================================
-- 4. إنشاء جدول Accounts
-- ============================================================================

CREATE TABLE public.accounts (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('Cash', 'Bank', 'Other')),
    balance DECIMAL(15, 2) DEFAULT 0.00,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_name ON public.accounts(name);
CREATE INDEX idx_accounts_type ON public.accounts(account_type);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all authenticated users" ON public.accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated users" ON public.accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON public.accounts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON public.accounts FOR DELETE TO authenticated USING (true);

-- Insert default accounts
INSERT INTO public.accounts (id, name, account_type, balance, description) VALUES
('acc_cash_default', 'الصندوق', 'Cash', 0.00, 'الصندوق النقدي الرئيسي'),
('acc_bank_default', 'البنك الأهلي', 'Bank', 0.00, 'الحساب البنكي الرئيسي');

-- ============================================================================
-- 5. إنشاء جدول Transactions
-- ============================================================================

CREATE TABLE public.transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('Income', 'Expense', 'Transfer')),
    amount DECIMAL(15, 2) NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    reference_type TEXT,
    reference_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_account ON public.transactions(account_id);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX idx_transactions_type ON public.transactions(transaction_type);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all authenticated users" ON public.transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated users" ON public.transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON public.transactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON public.transactions FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- 6. إنشاء جدول Units
-- ============================================================================

CREATE TABLE public.units (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    unit_number TEXT NOT NULL,
    floor INTEGER,
    area DECIMAL(10, 2),
    bedrooms INTEGER,
    bathrooms INTEGER,
    unit_type TEXT CHECK (unit_type IN ('Apartment', 'Villa', 'Townhouse', 'Office', 'Shop', 'Land')),
    price DECIMAL(15, 2) NOT NULL,
    status TEXT DEFAULT 'Available' CHECK (status IN ('Available', 'Reserved', 'Sold', 'Maintenance')),
    features TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, unit_number)
);

CREATE INDEX idx_units_project ON public.units(project_id);
CREATE INDEX idx_units_status ON public.units(status);
CREATE INDEX idx_units_type ON public.units(unit_type);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all authenticated users" ON public.units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated users" ON public.units FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON public.units FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON public.units FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- 7. إنشاء جدول Customers
-- ============================================================================

CREATE TABLE public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    national_id TEXT UNIQUE,
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

CREATE INDEX idx_customers_name ON public.customers(name);
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_national_id ON public.customers(national_id);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all authenticated users" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated users" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON public.customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON public.customers FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- 8. إنشاء جدول Bookings
-- ============================================================================

CREATE TABLE public.bookings (
    id TEXT PRIMARY KEY,
    unit_id TEXT NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_price DECIMAL(15, 2) NOT NULL,
    down_payment DECIMAL(15, 2) NOT NULL,
    remaining_amount DECIMAL(15, 2) NOT NULL,
    payment_plan TEXT,
    installments INTEGER,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Cancelled')),
    contract_number TEXT UNIQUE,
    notes TEXT,
    created_by TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookings_unit ON public.bookings(unit_id);
CREATE INDEX idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX idx_bookings_project ON public.bookings(project_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all authenticated users" ON public.bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated users" ON public.bookings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON public.bookings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON public.bookings FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- 9. إنشاء جدول Payments
-- ============================================================================

CREATE TABLE public.payments (
    id TEXT PRIMARY KEY,
    booking_id TEXT REFERENCES public.bookings(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(15, 2) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Check', 'Credit Card')),
    payment_type TEXT CHECK (payment_type IN ('Down Payment', 'Installment', 'Full Payment', 'Other')),
    reference_number TEXT,
    account_id TEXT REFERENCES public.accounts(id),
    notes TEXT,
    created_by TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_booking ON public.payments(booking_id);
CREATE INDEX idx_payments_customer ON public.payments(customer_id);
CREATE INDEX idx_payments_project ON public.payments(project_id);
CREATE INDEX idx_payments_date ON public.payments(payment_date);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all authenticated users" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated users" ON public.payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON public.payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON public.payments FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- 10. إنشاء جداول Expenses
-- ============================================================================

-- Expense Categories
CREATE TABLE public.expense_categories (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_category_id TEXT REFERENCES public.expense_categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expense_categories_name ON public.expense_categories(name);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all authenticated users" ON public.expense_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated users" ON public.expense_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON public.expense_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON public.expense_categories FOR DELETE TO authenticated USING (true);

-- Insert default categories
INSERT INTO public.expense_categories (id, name, description) VALUES
('cat_salaries', 'رواتب وأجور', 'مصاريف الموظفين والرواتب'),
('cat_maintenance', 'صيانة', 'مصاريف الصيانة والإصلاحات'),
('cat_materials', 'مواد بناء', 'شراء مواد البناء'),
('cat_contractors', 'مقاولات', 'أعمال المقاولين'),
('cat_admin', 'مصاريف إدارية', 'المصاريف الإدارية والعامة');

-- Vendors
CREATE TABLE public.vendors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company_name TEXT,
    email TEXT,
    phone TEXT NOT NULL,
    tax_number TEXT,
    address TEXT,
    city TEXT,
    vendor_type TEXT CHECK (vendor_type IN ('Supplier', 'Contractor', 'Service Provider', 'Other')),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendors_name ON public.vendors(name);
CREATE INDEX idx_vendors_type ON public.vendors(vendor_type);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all authenticated users" ON public.vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated users" ON public.vendors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON public.vendors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON public.vendors FOR DELETE TO authenticated USING (true);

-- Expenses
CREATE TABLE public.expenses (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES public.expense_categories(id),
    vendor_id TEXT REFERENCES public.vendors(id),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Check', 'Credit Card')),
    account_id TEXT REFERENCES public.accounts(id),
    reference_number TEXT,
    receipt_number TEXT,
    status TEXT DEFAULT 'Paid' CHECK (status IN ('Paid', 'Pending', 'Cancelled')),
    notes TEXT,
    created_by TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expenses_project ON public.expenses(project_id);
CREATE INDEX idx_expenses_category ON public.expenses(category_id);
CREATE INDEX idx_expenses_vendor ON public.expenses(vendor_id);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all authenticated users" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated users" ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON public.expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON public.expenses FOR DELETE TO authenticated USING (true);

-- Budgets
CREATE TABLE public.budgets (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES public.expense_categories(id),
    budget_amount DECIMAL(15, 2) NOT NULL,
    spent_amount DECIMAL(15, 2) DEFAULT 0,
    remaining_amount DECIMAL(15, 2),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Exceeded')),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_budgets_project ON public.budgets(project_id);
CREATE INDEX idx_budgets_category ON public.budgets(category_id);
CREATE INDEX idx_budgets_status ON public.budgets(status);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all authenticated users" ON public.budgets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated users" ON public.budgets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON public.budgets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON public.budgets FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- 11. إضافة Foreign Key لـ Users
-- ============================================================================

ALTER TABLE public.users 
ADD CONSTRAINT fk_users_project 
FOREIGN KEY (assigned_project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

-- ============================================================================
-- التحقق النهائي
-- ============================================================================

SELECT 
    '✓ تم إنشاء قاعدة البيانات بنجاح!' as message,
    COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

SELECT 
    table_name as "الجداول المُنشأة"
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
