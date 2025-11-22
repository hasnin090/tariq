-- Create users table for authentication and authorization
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Sales', 'Accounting')),
    assigned_project_id TEXT,
    sales_interface_project_id TEXT,
    accounting_interface_project_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_users_name ON public.users(name);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_assigned_project ON public.users(assigned_project_id);
CREATE INDEX IF NOT EXISTS idx_users_sales_project ON public.users(sales_interface_project_id);
CREATE INDEX IF NOT EXISTS idx_users_accounting_project ON public.users(accounting_interface_project_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(is_active);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
-- Allow all authenticated users to read all users (for listing in UI)
CREATE POLICY "Allow read access to all authenticated users"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert (will be restricted by app logic)
CREATE POLICY "Allow insert for authenticated users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update (will be restricted by app logic)
CREATE POLICY "Allow update for authenticated users"
ON public.users
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete (will be restricted by app logic)
CREATE POLICY "Allow delete for authenticated users"
ON public.users
FOR DELETE
TO authenticated
USING (true);

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

-- Insert default admin user (password: admin123)
-- Note: In production, change this password immediately!
INSERT INTO public.users (id, name, email, password, role) 
VALUES 
    ('user_' || gen_random_uuid()::text, 'admin', 'admin@example.com', 'admin123', 'Admin')
ON CONFLICT (name) DO NOTHING;

-- Insert sample sales user (password: sales123)
INSERT INTO public.users (id, name, email, password, role) 
VALUES 
    ('user_' || gen_random_uuid()::text, 'sales', 'sales@example.com', 'sales123', 'Sales')
ON CONFLICT (name) DO NOTHING;

-- Insert sample accounting user (password: accounting123)
INSERT INTO public.users (id, name, email, password, role) 
VALUES 
    ('user_' || gen_random_uuid()::text, 'accounting', 'accounting@example.com', 'accounting123', 'Accounting')
ON CONFLICT (name) DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

COMMENT ON TABLE public.users IS 'System users with role-based access control';
COMMENT ON COLUMN public.users.id IS 'Unique identifier for the user';
COMMENT ON COLUMN public.users.name IS 'Unique username for login';
COMMENT ON COLUMN public.users.email IS 'User email address';
COMMENT ON COLUMN public.users.password IS 'User password (should be hashed in production)';
COMMENT ON COLUMN public.users.role IS 'User role: Admin, Sales, or Accounting';
COMMENT ON COLUMN public.users.assigned_project_id IS 'Legacy project assignment';
COMMENT ON COLUMN public.users.sales_interface_project_id IS 'Project ID for sales interface access';
COMMENT ON COLUMN public.users.accounting_interface_project_id IS 'Project ID for accounting interface access';
COMMENT ON COLUMN public.users.is_active IS 'Whether the user account is active';
