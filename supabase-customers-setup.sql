-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_national_id ON public.customers(national_id);
CREATE INDEX IF NOT EXISTS idx_customers_type ON public.customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_active ON public.customers(is_active);

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies for customers table
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.customers;
CREATE POLICY "Allow read access to all authenticated users"
ON public.customers
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.customers;
CREATE POLICY "Allow insert for authenticated users"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.customers;
CREATE POLICY "Allow update for authenticated users"
ON public.customers
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.customers;
CREATE POLICY "Allow delete for authenticated users"
ON public.customers
FOR DELETE
TO authenticated
USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS customers_updated_at ON public.customers;
CREATE TRIGGER customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION update_customers_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;

COMMENT ON TABLE public.customers IS 'Customer information for sales and bookings';
COMMENT ON COLUMN public.customers.id IS 'Unique identifier for the customer';
COMMENT ON COLUMN public.customers.name IS 'Customer full name';
COMMENT ON COLUMN public.customers.customer_type IS 'Individual or Company';
