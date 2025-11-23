-- Create expense_categories table
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_category_id TEXT REFERENCES public.expense_categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expense_categories_name ON public.expense_categories(name);
CREATE INDEX IF NOT EXISTS idx_expense_categories_parent ON public.expense_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON public.expense_categories(is_active);

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.expense_categories;
CREATE POLICY "Allow read access to all authenticated users"
ON public.expense_categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.expense_categories;
CREATE POLICY "Allow insert for authenticated users"
ON public.expense_categories FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.expense_categories;
CREATE POLICY "Allow update for authenticated users"
ON public.expense_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.expense_categories;
CREATE POLICY "Allow delete for authenticated users"
ON public.expense_categories FOR DELETE TO authenticated USING (true);

-- Insert default categories
INSERT INTO public.expense_categories (id, name, description) VALUES
    ('cat_' || gen_random_uuid()::text, 'رواتب وأجور', 'مصاريف الموظفين والرواتب'),
    ('cat_' || gen_random_uuid()::text, 'صيانة', 'مصاريف الصيانة والإصلاحات'),
    ('cat_' || gen_random_uuid()::text, 'مواد بناء', 'شراء مواد البناء'),
    ('cat_' || gen_random_uuid()::text, 'مقاولات', 'أعمال المقاولين'),
    ('cat_' || gen_random_uuid()::text, 'مصاريف إدارية', 'المصاريف الإدارية والعامة')
ON CONFLICT (name) DO NOTHING;

-- Create vendors table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vendors_name ON public.vendors(name);
CREATE INDEX IF NOT EXISTS idx_vendors_phone ON public.vendors(phone);
CREATE INDEX IF NOT EXISTS idx_vendors_type ON public.vendors(vendor_type);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON public.vendors(is_active);

-- Enable RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.vendors;
CREATE POLICY "Allow read access to all authenticated users"
ON public.vendors FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.vendors;
CREATE POLICY "Allow insert for authenticated users"
ON public.vendors FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.vendors;
CREATE POLICY "Allow update for authenticated users"
ON public.vendors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.vendors;
CREATE POLICY "Allow delete for authenticated users"
ON public.vendors FOR DELETE TO authenticated USING (true);

-- Create expenses table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expenses_project ON public.expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor ON public.expenses(vendor_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_account ON public.expenses(account_id);
CREATE INDEX IF NOT EXISTS idx_expenses_active ON public.expenses(is_active);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.expenses;
CREATE POLICY "Allow read access to all authenticated users"
ON public.expenses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.expenses;
CREATE POLICY "Allow insert for authenticated users"
ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.expenses;
CREATE POLICY "Allow update for authenticated users"
ON public.expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.expenses;
CREATE POLICY "Allow delete for authenticated users"
ON public.expenses FOR DELETE TO authenticated USING (true);

-- Create budgets table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_budgets_project ON public.budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON public.budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON public.budgets(status);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON public.budgets(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_budgets_active ON public.budgets(is_active);

-- Enable RLS
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.budgets;
CREATE POLICY "Allow read access to all authenticated users"
ON public.budgets FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.budgets;
CREATE POLICY "Allow insert for authenticated users"
ON public.budgets FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.budgets;
CREATE POLICY "Allow update for authenticated users"
ON public.budgets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.budgets;
CREATE POLICY "Allow delete for authenticated users"
ON public.budgets FOR DELETE TO authenticated USING (true);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_expense_categories_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_vendors_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_expenses_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_budgets_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS expense_categories_updated_at ON public.expense_categories;
CREATE TRIGGER expense_categories_updated_at BEFORE UPDATE ON public.expense_categories
FOR EACH ROW EXECUTE FUNCTION update_expense_categories_updated_at();

DROP TRIGGER IF EXISTS vendors_updated_at ON public.vendors;
CREATE TRIGGER vendors_updated_at BEFORE UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION update_vendors_updated_at();

DROP TRIGGER IF EXISTS expenses_updated_at ON public.expenses;
CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION update_expenses_updated_at();

DROP TRIGGER IF EXISTS budgets_updated_at ON public.budgets;
CREATE TRIGGER budgets_updated_at BEFORE UPDATE ON public.budgets
FOR EACH ROW EXECUTE FUNCTION update_budgets_updated_at();

-- Grant permissions
GRANT ALL ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;
GRANT ALL ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
GRANT ALL ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
GRANT ALL ON public.budgets TO authenticated;
GRANT ALL ON public.budgets TO service_role;

COMMENT ON TABLE public.expense_categories IS 'Categories for organizing expenses';
COMMENT ON TABLE public.vendors IS 'Vendors and suppliers information';
COMMENT ON TABLE public.expenses IS 'Expense records for projects';
COMMENT ON TABLE public.budgets IS 'Budget allocations for projects and categories';
