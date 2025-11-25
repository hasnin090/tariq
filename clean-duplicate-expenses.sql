-- ============================================================================
-- Clean Duplicate Expense Records
-- ============================================================================
-- This script removes duplicate expense records that were created due to
-- the 409 conflict errors before the unique ID generation was fixed.
-- ============================================================================

-- Step 1: Check how many duplicate expenses exist
-- (Run this first to see the problem)
SELECT 
    id,
    description,
    amount,
    expense_date,
    created_at,
    COUNT(*) OVER (PARTITION BY description, amount, expense_date) as duplicate_count
FROM expenses
WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY created_at DESC;

-- Step 2: Delete all expenses created today (if you want to start fresh)
-- UNCOMMENT the line below only if you want to delete ALL expenses from today
-- DELETE FROM expenses WHERE created_at >= CURRENT_DATE;

-- Step 3: Keep only the latest record for each duplicate set
-- This deletes older duplicates while keeping the most recent one
DELETE FROM expenses
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY description, amount, expense_date, category_id, account_id 
                ORDER BY created_at DESC
            ) as rn
        FROM expenses
        WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
    ) as ranked
    WHERE rn > 1
);

-- Step 4: Verify the cleanup
SELECT 
    COUNT(*) as total_expenses,
    COUNT(DISTINCT id) as unique_ids
FROM expenses;

-- Step 5: Check for any remaining duplicate IDs (should be 0)
SELECT id, COUNT(*) as count
FROM expenses
GROUP BY id
HAVING COUNT(*) > 1;
