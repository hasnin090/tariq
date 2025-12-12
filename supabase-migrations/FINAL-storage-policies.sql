 -- ============================================
-- Final Storage RLS Policies Configuration
-- ============================================
-- This is the FINAL correct configuration
-- Run this in Supabase SQL Editor

-- Step 1: Clean up ALL old policies
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_read" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "public_upload" ON storage.objects;
DROP POLICY IF EXISTS "public_read" ON storage.objects;
DROP POLICY IF EXISTS "public_update" ON storage.objects;
DROP POLICY IF EXISTS "public_delete" ON storage.objects;

-- Step 2: Create FINAL policies for authenticated users
-- These policies allow ALL authenticated users to manage documents

CREATE POLICY "documents_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "documents_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "documents_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "documents_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- Step 3: Verify the configuration
SELECT 
    policyname,
    cmd,
    roles::text,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects'
ORDER BY policyname;

-- Expected result: 4 policies
-- - documents_delete_policy (DELETE)
-- - documents_insert_policy (INSERT)
-- - documents_select_policy (SELECT)
-- - documents_update_policy (UPDATE)
