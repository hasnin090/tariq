-- Create transactions table for tracking financial transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    account_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Income', 'Expense', 'Transfer')),
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    category TEXT,
    reference_type TEXT CHECK (reference_type IN ('expense', 'payment', 'sale', 'booking', 'transfer', 'adjustment')),
    reference_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON public.transactions(reference_type, reference_id);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions table
-- Allow all authenticated users to read transactions
CREATE POLICY "Allow read access to all authenticated users"
ON public.transactions
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert transactions
CREATE POLICY "Allow insert for authenticated users"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow only admins and transaction creators to update
CREATE POLICY "Allow update for admins"
ON public.transactions
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

-- Allow only admins to delete transactions
CREATE POLICY "Allow delete for admins only"
ON public.transactions
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
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION update_transactions_updated_at();

-- Create function to update account balance on transaction
CREATE OR REPLACE FUNCTION update_account_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- On INSERT or UPDATE
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        -- Update account balance based on transaction type
        IF NEW.type = 'Income' THEN
            UPDATE public.accounts 
            SET balance = balance + NEW.amount 
            WHERE id = NEW.account_id;
        ELSIF NEW.type = 'Expense' THEN
            UPDATE public.accounts 
            SET balance = balance - NEW.amount 
            WHERE id = NEW.account_id;
        END IF;
        
        -- If updating, reverse old transaction first
        IF (TG_OP = 'UPDATE') THEN
            IF OLD.type = 'Income' THEN
                UPDATE public.accounts 
                SET balance = balance - OLD.amount 
                WHERE id = OLD.account_id;
            ELSIF OLD.type = 'Expense' THEN
                UPDATE public.accounts 
                SET balance = balance + OLD.amount 
                WHERE id = OLD.account_id;
            END IF;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- On DELETE
    IF (TG_OP = 'DELETE') THEN
        -- Reverse the transaction
        IF OLD.type = 'Income' THEN
            UPDATE public.accounts 
            SET balance = balance - OLD.amount 
            WHERE id = OLD.account_id;
        ELSIF OLD.type = 'Expense' THEN
            UPDATE public.accounts 
            SET balance = balance + OLD.amount 
            WHERE id = OLD.account_id;
        END IF;
        
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for account balance updates
CREATE TRIGGER update_balance_on_transaction
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance_on_transaction();

-- Grant necessary permissions
GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;

COMMENT ON TABLE public.transactions IS 'Financial transactions linked to accounts';
COMMENT ON COLUMN public.transactions.id IS 'Unique identifier for the transaction';
COMMENT ON COLUMN public.transactions.account_id IS 'ID of the account this transaction belongs to';
COMMENT ON COLUMN public.transactions.type IS 'Type of transaction: Income, Expense, or Transfer';
COMMENT ON COLUMN public.transactions.amount IS 'Amount of the transaction';
COMMENT ON COLUMN public.transactions.reference_type IS 'Type of related entity';
COMMENT ON COLUMN public.transactions.reference_id IS 'ID of related entity (expense, payment, etc.)';
