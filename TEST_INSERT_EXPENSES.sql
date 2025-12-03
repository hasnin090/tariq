-- Test inserting a simple expense directly in SQL
-- This will help us identify if the problem is in the data or the API

-- Test 1: Insert with minimal required fields only
INSERT INTO public.expenses (
    id,
    expense_date,
    description,
    amount
) VALUES (
    'test_expense_001',
    '2025-12-03',
    'Test expense',
    100.00
);

-- If the above works, test with all fields including NULLs
INSERT INTO public.expenses (
    id,
    expense_date,
    description,
    amount,
    category_id,
    project_id,
    account_id,
    vendor_id,
    transaction_id,
    deferred_payment_installment_id,
    employee_id
) VALUES (
    'test_expense_002',
    '2025-12-03',
    'Test expense with all fields',
    200.00,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
);

-- Check if inserts succeeded
SELECT * FROM public.expenses WHERE id LIKE 'test_expense%';

-- Clean up test data
-- DELETE FROM public.expenses WHERE id LIKE 'test_expense%';
