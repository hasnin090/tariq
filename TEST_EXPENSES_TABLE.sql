-- Run this query in Supabase SQL Editor to check the current expenses table structure
-- This will show you all columns in the expenses table

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'expenses'
ORDER BY 
    ordinal_position;

-- Expected columns you should see:
-- id, expense_date, description, amount, category_id, project_id, 
-- account_id, vendor_id, transaction_id, deferred_payment_installment_id, 
-- employee_id, created_at, updated_at

-- If you DON'T see transaction_id, deferred_payment_installment_id, or employee_id,
-- then you MUST run the migration from add-expenses-columns.sql
