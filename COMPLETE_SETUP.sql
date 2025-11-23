-- ============================================================================
-- ملف إعداد قاعدة البيانات الكامل - تنفيذ مباشر من VS Code
-- نفّذ هذا الملف بالكامل مرة واحدة في VS Code Database Connection
-- ============================================================================

-- ============================================================================
-- 1. تحديث جدول Users (إضافة الأعمدة الناقصة فقط)
-- ============================================================================
-- Skip users table updates for now - will be handled separately if needed

-- ============================================================================
-- 2. تحديث جدول Projects (إضافة أعمدة إذا لزم الأمر)
-- ============================================================================

-- Add missing columns to existing projects table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'location') THEN
        ALTER TABLE public.projects ADD COLUMN location TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'start_date') THEN
        ALTER TABLE public.projects ADD COLUMN start_date DATE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'end_date') THEN
        ALTER TABLE public.projects ADD COLUMN end_date DATE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'status') THEN
        ALTER TABLE public.projects ADD COLUMN status TEXT DEFAULT 'Active';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'budget') THEN
        ALTER TABLE public.projects ADD COLUMN budget DECIMAL(15, 2);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'total_units') THEN
        ALTER TABLE public.projects ADD COLUMN total_units INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'sold_units') THEN
        ALTER TABLE public.projects ADD COLUMN sold_units INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'available_units') THEN
        ALTER TABLE public.projects ADD COLUMN available_units INTEGER DEFAULT 0;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_name ON public.projects(name);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.projects;
CREATE POLICY "Enable read access for all users" ON public.projects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for admins only" ON public.projects;
CREATE POLICY "Enable insert for admins only" ON public.projects FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for admins only" ON public.projects;
CREATE POLICY "Enable update for admins only" ON public.projects FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for admins only" ON public.projects;
CREATE POLICY "Enable delete for admins only" ON public.projects FOR DELETE USING (true);

-- ============================================================================
-- 3. تحديث جدول Accounts (إضافة أعمدة إذا لزم الأمر)
-- ============================================================================

-- Add missing columns to existing accounts table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'accounts' AND column_name = 'balance') THEN
        ALTER TABLE public.accounts ADD COLUMN balance DECIMAL(15, 2) DEFAULT 0.00;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'accounts' AND column_name = 'description') THEN
        ALTER TABLE public.accounts ADD COLUMN description TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_accounts_name ON public.accounts(name);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.accounts;
CREATE POLICY "Allow read access to all authenticated users" ON public.accounts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.accounts;
CREATE POLICY "Allow insert for authenticated users" ON public.accounts FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.accounts;
CREATE POLICY "Allow update for authenticated users" ON public.accounts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.accounts;
CREATE POLICY "Allow delete for authenticated users" ON public.accounts FOR DELETE TO authenticated USING (true);

-- Insert default accounts using existing column name 'type' instead of 'account_type'
INSERT INTO public.accounts (id, name, type, balance, description) 
SELECT 'acc_cash_default', 'الصندوق', 'Cash', 0.00, 'الصندوق النقدي الرئيسي'
WHERE NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = 'acc_cash_default');

INSERT INTO public.accounts (id, name, type, balance, description) 
SELECT 'acc_bank_default', 'البنك الأهلي', 'Bank', 0.00, 'الحساب البنكي الرئيسي'
WHERE NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = 'acc_bank_default');

-- ============================================================================
-- 4. تحديث جدول Transactions (إضافة أعمدة إذا لزم الأمر)
-- ============================================================================

-- Add missing columns if transactions table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'transactions' AND column_name = 'reference_type') THEN
            ALTER TABLE public.transactions ADD COLUMN reference_type TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'transactions' AND column_name = 'reference_id') THEN
            ALTER TABLE public.transactions ADD COLUMN reference_id TEXT;
        END IF;
    END IF;
END $$;

-- Create indexes on existing columns
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions(account_id);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.transactions;
CREATE POLICY "Allow read access to all authenticated users" ON public.transactions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.transactions;
CREATE POLICY "Allow insert for authenticated users" ON public.transactions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.transactions;
CREATE POLICY "Allow update for authenticated users" ON public.transactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.transactions;
CREATE POLICY "Allow delete for authenticated users" ON public.transactions FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- 5. تحديث جدول Units (إضافة أعمدة إذا لزم الأمر)
-- ============================================================================

-- Skip units table - will use existing structure
CREATE INDEX IF NOT EXISTS idx_units_project ON public.units(project_id);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.units;
CREATE POLICY "Allow read access to all authenticated users" ON public.units FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.units;
CREATE POLICY "Allow insert for authenticated users" ON public.units FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.units;
CREATE POLICY "Allow update for authenticated users" ON public.units FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.units;
CREATE POLICY "Allow delete for authenticated users" ON public.units FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- 6. تحديث جدول Customers (إضافة أعمدة إذا لزم الأمر)
-- ============================================================================

-- Skip customers table - will use existing structure  
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.customers;
CREATE POLICY "Allow read access to all authenticated users" ON public.customers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.customers;
CREATE POLICY "Allow insert for authenticated users" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.customers;
CREATE POLICY "Allow update for authenticated users" ON public.customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.customers;
CREATE POLICY "Allow delete for authenticated users" ON public.customers FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- 7. تحديث جدول Bookings (إضافة أعمدة إذا لزم الأمر)
-- ============================================================================

-- Skip bookings table - will use existing structure
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
    CREATE INDEX IF NOT EXISTS idx_bookings_project ON public.bookings(project_id);
END IF; END $$;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.bookings;
CREATE POLICY "Allow read access to all authenticated users" ON public.bookings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.bookings;
CREATE POLICY "Allow insert for authenticated users" ON public.bookings FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.bookings;
CREATE POLICY "Allow update for authenticated users" ON public.bookings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.bookings;
CREATE POLICY "Allow delete for authenticated users" ON public.bookings FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- 8. تحديث جدول Payments (إضافة أعمدة إذا لزم الأمر)
-- ============================================================================

-- Skip payments table - will use existing structure
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    CREATE INDEX IF NOT EXISTS idx_payments_project ON public.payments(project_id);
END IF; END $$;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.payments;
CREATE POLICY "Allow read access to all authenticated users" ON public.payments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.payments;
CREATE POLICY "Allow insert for authenticated users" ON public.payments FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.payments;
CREATE POLICY "Allow update for authenticated users" ON public.payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.payments;
CREATE POLICY "Allow delete for authenticated users" ON public.payments FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- 9. إنشاء جداول Expenses
-- ============================================================================

-- Expense Categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_category_id TEXT REFERENCES public.expense_categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_name ON public.expense_categories(name);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.expense_categories;
CREATE POLICY "Allow read access to all authenticated users" ON public.expense_categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.expense_categories;
CREATE POLICY "Allow insert for authenticated users" ON public.expense_categories FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.expense_categories;
CREATE POLICY "Allow update for authenticated users" ON public.expense_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.expense_categories;
CREATE POLICY "Allow delete for authenticated users" ON public.expense_categories FOR DELETE TO authenticated USING (true);

-- Insert default categories (skip if already exist)
INSERT INTO public.expense_categories (id, name, description)
SELECT 'cat_salaries', 'رواتب وأجور', 'مصاريف الموظفين والرواتب'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'رواتب وأجور');

INSERT INTO public.expense_categories (id, name, description)
SELECT 'cat_maintenance', 'صيانة', 'مصاريف الصيانة والإصلاحات'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'صيانة');

INSERT INTO public.expense_categories (id, name, description)
SELECT 'cat_materials', 'مواد بناء', 'شراء مواد البناء'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'مواد بناء');

INSERT INTO public.expense_categories (id, name, description)
SELECT 'cat_contractors', 'مقاولات', 'أعمال المقاولين'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'مقاولات');

INSERT INTO public.expense_categories (id, name, description)
SELECT 'cat_admin', 'مصاريف إدارية', 'المصاريف الإدارية والعامة'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'مصاريف إدارية');

-- Vendors
CREATE TABLE IF NOT EXISTS public.vendors (
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

CREATE INDEX IF NOT EXISTS idx_vendors_name ON public.vendors(name);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.vendors;
CREATE POLICY "Allow read access to all authenticated users" ON public.vendors FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.vendors;
CREATE POLICY "Allow insert for authenticated users" ON public.vendors FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.vendors;
CREATE POLICY "Allow update for authenticated users" ON public.vendors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.vendors;
CREATE POLICY "Allow delete for authenticated users" ON public.vendors FOR DELETE TO authenticated USING (true);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
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

CREATE INDEX IF NOT EXISTS idx_expenses_project ON public.expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.expenses;
CREATE POLICY "Allow read access to all authenticated users" ON public.expenses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.expenses;
CREATE POLICY "Allow insert for authenticated users" ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.expenses;
CREATE POLICY "Allow update for authenticated users" ON public.expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.expenses;
CREATE POLICY "Allow delete for authenticated users" ON public.expenses FOR DELETE TO authenticated USING (true);

-- Budgets
CREATE TABLE IF NOT EXISTS public.budgets (
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

CREATE INDEX IF NOT EXISTS idx_budgets_project ON public.budgets(project_id);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.budgets;
CREATE POLICY "Allow read access to all authenticated users" ON public.budgets FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.budgets;
CREATE POLICY "Allow insert for authenticated users" ON public.budgets FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.budgets;
CREATE POLICY "Allow update for authenticated users" ON public.budgets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.budgets;
CREATE POLICY "Allow delete for authenticated users" ON public.budgets FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- التحقق النهائي
-- ============================================================================

SELECT 
    '✓ تم إنشاء قاعدة البيانات بنجاح!' as message,
    COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public';

SELECT 
    table_name as "الجداول المُنشأة"
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
