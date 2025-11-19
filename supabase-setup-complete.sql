-- ===================================
-- Complete Supabase Database Setup
-- ===================================

-- 1. Create Accounts Table
-- ===================================
CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Bank', 'Cash')),
    initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_type ON public.accounts(type);

CREATE OR REPLACE FUNCTION update_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS accounts_updated_at_trigger ON public.accounts;
CREATE TRIGGER accounts_updated_at_trigger
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_accounts_updated_at();

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users on accounts" ON public.accounts
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

GRANT ALL ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;


-- 2. Create Transactions Table
-- ===================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    account_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Deposit', 'Withdrawal')),
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    source_id TEXT,
    source_type TEXT CHECK (source_type IN ('Payment', 'Sale', 'Expense', 'Manual', 'Salary', 'Deferred Payment')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_source_id ON public.transactions(source_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transactions_updated_at_trigger ON public.transactions;
CREATE TRIGGER transactions_updated_at_trigger
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_transactions_updated_at();

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users on transactions" ON public.transactions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;


-- 3. Create Customers Table
-- ===================================
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    unit_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customers_updated_at_trigger ON public.customers;
CREATE TRIGGER customers_updated_at_trigger
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customers_updated_at();

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users on customers" ON public.customers
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

GRANT ALL ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;


-- 4. Create Unit Types Table
-- ===================================
CREATE TABLE IF NOT EXISTS public.unit_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unit_types_name ON public.unit_types(name);

ALTER TABLE public.unit_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users on unit_types" ON public.unit_types
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

GRANT ALL ON public.unit_types TO authenticated;
GRANT ALL ON public.unit_types TO service_role;


-- 5. Create Unit Statuses Table
-- ===================================
CREATE TABLE IF NOT EXISTS public.unit_statuses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add is_system column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'unit_statuses' 
        AND column_name = 'is_system'
    ) THEN
        ALTER TABLE public.unit_statuses ADD COLUMN is_system BOOLEAN DEFAULT false;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_unit_statuses_name ON public.unit_statuses(name);

ALTER TABLE public.unit_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users on unit_statuses" ON public.unit_statuses
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

GRANT ALL ON public.unit_statuses TO authenticated;
GRANT ALL ON public.unit_statuses TO service_role;

-- Insert default statuses
INSERT INTO public.unit_statuses (id, name, is_system) VALUES
    ('11111111-1111-1111-1111-111111111111', 'متاح', true),
    ('22222222-2222-2222-2222-222222222222', 'محجوز', true),
    ('33333333-3333-3333-3333-333333333333', 'مباع', true)
ON CONFLICT (id) DO NOTHING;


-- 6. Create Units Table
-- ===================================
CREATE TABLE IF NOT EXISTS public.units (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    price NUMERIC(15, 2) NOT NULL,
    customer_id TEXT,
    customer_name TEXT,
    project_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_units_name ON public.units(name);
CREATE INDEX IF NOT EXISTS idx_units_type ON public.units(type);
CREATE INDEX IF NOT EXISTS idx_units_status ON public.units(status);
CREATE INDEX IF NOT EXISTS idx_units_customer_id ON public.units(customer_id);
CREATE INDEX IF NOT EXISTS idx_units_project_id ON public.units(project_id);

CREATE OR REPLACE FUNCTION update_units_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS units_updated_at_trigger ON public.units;
CREATE TRIGGER units_updated_at_trigger
    BEFORE UPDATE ON public.units
    FOR EACH ROW
    EXECUTE FUNCTION update_units_updated_at();

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users on units" ON public.units
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

GRANT ALL ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;


-- 7. Create Employees Table
-- ===================================
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    salary NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_name ON public.employees(name);

CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS employees_updated_at_trigger ON public.employees;
CREATE TRIGGER employees_updated_at_trigger
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION update_employees_updated_at();

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users on employees" ON public.employees
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

GRANT ALL ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;


-- ===================================
-- Setup Complete!
-- ===================================
-- You can now use all tables in your application.
