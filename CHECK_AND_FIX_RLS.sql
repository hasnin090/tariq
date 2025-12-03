-- Check RLS policies on expenses table
-- Run this to see if Row Level Security is blocking the inserts

-- 1. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'expenses';

-- 2. Show all policies on expenses table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'expenses';

-- If RLS is enabled (rowsecurity = true) but there are no INSERT policies,
-- that's the problem! You need to either:
-- A) Disable RLS: ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
-- B) Add INSERT policy (see below)

-- ============================================================================
-- SOLUTION: Add RLS policies for expenses table
-- ============================================================================

-- Option A: Disable RLS completely (simplest, but less secure)
-- ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;

-- Option B: Add proper RLS policies (recommended)
-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for all users" ON public.expenses;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.expenses;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.expenses;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.expenses;

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Allow SELECT for everyone (or restrict as needed)
CREATE POLICY "Enable read access for all users" ON public.expenses
    FOR SELECT
    USING (true);

-- Allow INSERT for authenticated users (or use anon if you're not using auth)
CREATE POLICY "Enable insert for authenticated users" ON public.expenses
    FOR INSERT
    WITH CHECK (true);

-- Allow UPDATE for authenticated users
CREATE POLICY "Enable update for authenticated users" ON public.expenses
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Allow DELETE for authenticated users
CREATE POLICY "Enable delete for authenticated users" ON public.expenses
    FOR DELETE
    USING (true);
