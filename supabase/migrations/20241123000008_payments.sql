-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    booking_id TEXT REFERENCES public.bookings(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(15, 2) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Check', 'Credit Card')),
    payment_type TEXT CHECK (payment_type IN ('Down Payment', 'Installment', 'Full Payment', 'Other')),
    reference_number TEXT,
    account_id TEXT REFERENCES public.accounts(id),
    notes TEXT,
    created_by TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_project ON public.payments(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_method ON public.payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_type ON public.payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_account ON public.payments(account_id);
CREATE INDEX IF NOT EXISTS idx_payments_active ON public.payments(is_active);

-- Enable Row Level Security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments table
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.payments;
CREATE POLICY "Allow read access to all authenticated users"
ON public.payments
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.payments;
CREATE POLICY "Allow insert for authenticated users"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.payments;
CREATE POLICY "Allow update for authenticated users"
ON public.payments
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.payments;
CREATE POLICY "Allow delete for authenticated users"
ON public.payments
FOR DELETE
TO authenticated
USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS payments_updated_at ON public.payments;
CREATE TRIGGER payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION update_payments_updated_at();

-- Create function to update booking remaining amount
CREATE OR REPLACE FUNCTION update_booking_remaining_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_id IS NOT NULL THEN
        UPDATE public.bookings 
        SET remaining_amount = total_price - (
            SELECT COALESCE(SUM(amount), 0) 
            FROM public.payments 
            WHERE booking_id = NEW.booking_id AND is_active = true
        )
        WHERE id = NEW.booking_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking remaining amount update
DROP TRIGGER IF EXISTS payment_booking_update ON public.payments;
CREATE TRIGGER payment_booking_update
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION update_booking_remaining_amount();

-- Grant necessary permissions
GRANT ALL ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

COMMENT ON TABLE public.payments IS 'Payment records for bookings and sales';
COMMENT ON COLUMN public.payments.id IS 'Unique identifier for the payment';
COMMENT ON COLUMN public.payments.payment_type IS 'Type of payment: Down Payment, Installment, Full Payment, Other';
