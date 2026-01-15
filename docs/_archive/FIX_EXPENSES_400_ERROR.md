# Fix for Expenses 400 Bad Request Error

## Problem
The expenses table was missing required columns (`transaction_id`, `deferred_payment_installment_id`, `employee_id`) that the application code was trying to use. This caused a 400 Bad Request error when trying to create expenses.

## Root Cause
- The database schema in `create-all-tables.sql` was missing three columns
- The TypeScript interface defined these fields but marked them as optional
- The service layer was attempting to insert data for these fields, but the database rejected it

## Solution Applied

### 1. Updated Database Schema
Modified `supabase-migrations/create-all-tables.sql` to include:
- `transaction_id TEXT` - Links expense to transaction record
- `deferred_payment_installment_id TEXT` - Links expense to installment payments
- `employee_id TEXT` - Links expense to employee (for salary payments, etc.)

### 2. Updated Service Layer
Modified `src/services/supabaseService.ts` in the `expensesService` to:
- Map these new fields in `getAll()` method
- Include them in `create()` method when inserting
- Include them in `update()` method when updating

### 3. Created Migration Script
Created `supabase-migrations/add-expenses-columns.sql` to add these columns to existing database.

## How to Apply the Fix

### Step 1: Run the Migration
Execute the migration SQL in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of supabase-migrations/add-expenses-columns.sql
-- Or run it via Supabase CLI if you have it set up
```

### Step 2: Verify the Changes
In Supabase dashboard, check that the `expenses` table now has these columns:
- transaction_id
- deferred_payment_installment_id  
- employee_id

### Step 3: Restart Your Application
If your dev server is running, restart it to pick up the code changes:

```powershell
# Stop the current dev server (Ctrl+C)
# Then restart it
npm run dev
```

## Expected Result
After applying these changes:
- ✅ Expenses can be created without 400 errors
- ✅ Transaction linking works properly
- ✅ Employee and installment payments can be tracked
- ✅ All expense operations (create, read, update, delete) work correctly

## Testing
1. Try creating a new expense
2. Verify it saves successfully
3. Check that the transaction is created and linked
4. Confirm no more 400 errors in browser console
