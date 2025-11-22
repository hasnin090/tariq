-- Create users table for authentication and authorization
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Sales', 'Accounting')),
    assigned_project_id TEXT,
    sales_interface_project_id TEXT,
    accounting_interface_project_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_assigned_project ON public.users(assigned_project_id);
CREATE INDEX IF NOT EXISTS idx_users_sales_project ON public.users(sales_interface_project_id);
CREATE INDEX IF NOT EXISTS idx_users_accounting_project ON public.users(accounting_interface_project_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(is_active);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
-- Allow all authenticated users to read their own data
CREATE POLICY "Users can read own data"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow admins to read all users
CREATE POLICY "Admins can read all users"
ON public.users
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'Admin'
    )
);

-- Allow only admins to insert users
CREATE POLICY "Allow insert for admins only"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'Admin'
    )
);

-- Allow only admins to update users
CREATE POLICY "Allow update for admins only"
ON public.users
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

-- Allow only admins to delete users
CREATE POLICY "Allow delete for admins only"
ON public.users
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
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_users_updated_at();

-- Create function to hash password (simple example - in production use proper hashing)
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    -- This is a simple example. In production, use proper password hashing like bcrypt
    RETURN encode(digest(password, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Insert default admin user (password: admin123)
-- Note: In production, change this password immediately!
INSERT INTO public.users (id, username, password_hash, role) 
SELECT 
    gen_random_uuid(),
    'admin',
    hash_password('admin123'),
    'Admin'
WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE username = 'admin'
);

-- Insert sample sales user (password: sales123)
INSERT INTO public.users (id, username, password_hash, role) 
SELECT 
    gen_random_uuid(),
    'sales',
    hash_password('sales123'),
    'Sales'
WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE username = 'sales'
);

-- Insert sample accounting user (password: accounting123)
INSERT INTO public.users (id, username, password_hash, role) 
SELECT 
    gen_random_uuid(),
    'accounting',
    hash_password('accounting123'),
    'Accounting'
WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE username = 'accounting'
);

-- Grant necessary permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

COMMENT ON TABLE public.users IS 'System users with role-based access control';
COMMENT ON COLUMN public.users.id IS 'Unique identifier linked to Supabase auth.uid()';
COMMENT ON COLUMN public.users.username IS 'Unique username for login';
COMMENT ON COLUMN public.users.password_hash IS 'Hashed password';
COMMENT ON COLUMN public.users.role IS 'User role: Admin, Sales, or Accounting';
COMMENT ON COLUMN public.users.assigned_project_id IS 'Legacy project assignment';
COMMENT ON COLUMN public.users.sales_interface_project_id IS 'Project ID for sales interface access';
COMMENT ON COLUMN public.users.accounting_interface_project_id IS 'Project ID for accounting interface access';
COMMENT ON COLUMN public.users.is_active IS 'Whether the user account is active';
