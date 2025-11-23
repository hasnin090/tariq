-- Add missing columns to existing users table
-- This script adds columns that don't exist yet

-- Add assigned_project_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'assigned_project_id') THEN
        ALTER TABLE public.users ADD COLUMN assigned_project_id TEXT;
    END IF;
END $$;

-- Add sales_interface_project_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'sales_interface_project_id') THEN
        ALTER TABLE public.users ADD COLUMN sales_interface_project_id TEXT;
    END IF;
END $$;

-- Add accounting_interface_project_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'accounting_interface_project_id') THEN
        ALTER TABLE public.users ADD COLUMN accounting_interface_project_id TEXT;
    END IF;
END $$;

-- Add is_active column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE public.users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Create indexes for faster queries (IF NOT EXISTS handles duplicates)
CREATE INDEX IF NOT EXISTS idx_users_assigned_project ON public.users(assigned_project_id);
CREATE INDEX IF NOT EXISTS idx_users_sales_project ON public.users(sales_interface_project_id);
CREATE INDEX IF NOT EXISTS idx_users_accounting_project ON public.users(accounting_interface_project_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(is_active);

-- Update existing RLS policies or create them if they don't exist
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.users;
CREATE POLICY "Allow read access to all authenticated users"
ON public.users
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.users;
CREATE POLICY "Allow insert for authenticated users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.users;
CREATE POLICY "Allow update for authenticated users"
ON public.users
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.users;
CREATE POLICY "Allow delete for authenticated users"
ON public.users
FOR DELETE
TO authenticated
USING (true);

-- Insert default users if they don't exist
INSERT INTO public.users (id, name, email, password, role, is_active) 
VALUES 
    ('user_admin_default', 'admin', 'admin@example.com', 'admin123', 'Admin', true)
ON CONFLICT (name) DO UPDATE SET email = EXCLUDED.email;

INSERT INTO public.users (id, name, email, password, role, is_active) 
VALUES 
    ('user_sales_default', 'sales', 'sales@example.com', 'sales123', 'Sales', true)
ON CONFLICT (name) DO UPDATE SET email = EXCLUDED.email;

INSERT INTO public.users (id, name, email, password, role, is_active) 
VALUES 
    ('user_accounting_default', 'accounting', 'accounting@example.com', 'accounting123', 'Accounting', true)
ON CONFLICT (name) DO UPDATE SET email = EXCLUDED.email;

COMMENT ON COLUMN public.users.assigned_project_id IS 'Legacy project assignment';
COMMENT ON COLUMN public.users.sales_interface_project_id IS 'Project ID for sales interface access';
COMMENT ON COLUMN public.users.accounting_interface_project_id IS 'Project ID for accounting interface access';
COMMENT ON COLUMN public.users.is_active IS 'Whether the user account is active';
