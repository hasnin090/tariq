-- Create accounts table for financial management
CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Bank', 'Cash', 'Other')),
    balance DECIMAL(15, 2) DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_accounts_type ON public.accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_active ON public.accounts(is_active);

-- Enable Row Level Security
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for accounts table
-- Allow all authenticated users to read accounts
CREATE POLICY "Allow read access to all authenticated users"
ON public.accounts
FOR SELECT
TO authenticated
USING (true);

-- Allow only admins to insert accounts
CREATE POLICY "Allow insert for admins only"
ON public.accounts
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'Admin'
    )
);

-- Allow only admins to update accounts
CREATE POLICY "Allow update for admins only"
ON public.accounts
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'Admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'Admin'
    )
);

-- Allow only admins to delete accounts
CREATE POLICY "Allow delete for admins only"
ON public.accounts
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'Admin'
    )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER accounts_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION update_accounts_updated_at();

-- Insert default accounts
INSERT INTO public.accounts (id, name, type, balance, description) VALUES
    ('account_' || gen_random_uuid()::text, 'الصندوق النقدي', 'Cash', 0, 'الصندوق النقدي الرئيسي'),
    ('account_' || gen_random_uuid()::text, 'الحساب البنكي الرئيسي', 'Bank', 0, 'الحساب البنكي الرئيسي للشركة')
ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;

COMMENT ON TABLE public.accounts IS 'Financial accounts for tracking cash and bank balances';
COMMENT ON COLUMN public.accounts.id IS 'Unique identifier for the account';
COMMENT ON COLUMN public.accounts.name IS 'Name of the account';
COMMENT ON COLUMN public.accounts.type IS 'Type of account: Bank, Cash, or Other';
COMMENT ON COLUMN public.accounts.balance IS 'Current balance of the account';
COMMENT ON COLUMN public.accounts.description IS 'Optional description of the account';
COMMENT ON COLUMN public.accounts.is_active IS 'Whether the account is active';
