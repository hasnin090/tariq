-- Add sale_id column to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS sale_id TEXT;

-- Create index for sale_id
CREATE INDEX IF NOT EXISTS idx_documents_sale_id ON public.documents(sale_id);

-- Update the check constraint to allow documents without customer_id or booking_id if they have sale_id
-- First, drop the old constraint if it exists
ALTER TABLE public.documents 
DROP CONSTRAINT IF EXISTS documents_must_have_link;

-- Add new constraint that allows customer_id OR booking_id OR sale_id
ALTER TABLE public.documents 
ADD CONSTRAINT documents_must_have_link 
CHECK (
    (customer_id IS NOT NULL) OR 
    (booking_id IS NOT NULL) OR 
    (sale_id IS NOT NULL)
);
