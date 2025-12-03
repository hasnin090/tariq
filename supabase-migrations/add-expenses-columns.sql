-- Add missing columns to expenses table
-- This migration adds transaction_id, deferred_payment_installment_id, and employee_id columns

-- Add transaction_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'expenses' 
        AND column_name = 'transaction_id'
    ) THEN
        ALTER TABLE public.expenses ADD COLUMN transaction_id TEXT;
    END IF;
END $$;

-- Add deferred_payment_installment_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'expenses' 
        AND column_name = 'deferred_payment_installment_id'
    ) THEN
        ALTER TABLE public.expenses ADD COLUMN deferred_payment_installment_id TEXT;
    END IF;
END $$;

-- Add employee_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'expenses' 
        AND column_name = 'employee_id'
    ) THEN
        ALTER TABLE public.expenses ADD COLUMN employee_id TEXT;
    END IF;
END $$;

-- Optionally add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_transaction_id ON public.expenses(transaction_id);
CREATE INDEX IF NOT EXISTS idx_expenses_employee_id ON public.expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_deferred_payment_installment_id ON public.expenses(deferred_payment_installment_id);
