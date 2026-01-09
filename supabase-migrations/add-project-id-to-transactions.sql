-- Add project allocation to treasury transactions
-- This enables per-project cash/bank balances.

ALTER TABLE IF EXISTS public.transactions
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_project ON public.transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_transactions_project_account_date ON public.transactions(project_id, account_id, date DESC);
