-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
    id TEXT PRIMARY KEY,
    unit_id TEXT NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_price DECIMAL(15, 2) NOT NULL,
    down_payment DECIMAL(15, 2) NOT NULL,
    remaining_amount DECIMAL(15, 2) NOT NULL,
    payment_plan TEXT,
    installments INTEGER,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Cancelled')),
    contract_number TEXT UNIQUE,
    notes TEXT,
    created_by TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_unit ON public.bookings(unit_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_project ON public.bookings(project_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_contract ON public.bookings(contract_number);
CREATE INDEX IF NOT EXISTS idx_bookings_active ON public.bookings(is_active);

-- Enable Row Level Security
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for bookings table
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.bookings;
CREATE POLICY "Allow read access to all authenticated users"
ON public.bookings
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.bookings;
CREATE POLICY "Allow insert for authenticated users"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.bookings;
CREATE POLICY "Allow update for authenticated users"
ON public.bookings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.bookings;
CREATE POLICY "Allow delete for authenticated users"
ON public.bookings
FOR DELETE
TO authenticated
USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS bookings_updated_at ON public.bookings;
CREATE TRIGGER bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION update_bookings_updated_at();

-- Create function to update unit status when booking is created
CREATE OR REPLACE FUNCTION update_unit_status_on_booking()
RETURNS TRIGGER AS $$
BEGIN
    -- Update unit status to Reserved or Sold based on booking status
    IF NEW.status = 'Active' THEN
        UPDATE public.units 
        SET status = 'Reserved' 
        WHERE id = NEW.unit_id;
    ELSIF NEW.status = 'Completed' THEN
        UPDATE public.units 
        SET status = 'Sold' 
        WHERE id = NEW.unit_id;
    ELSIF NEW.status = 'Cancelled' THEN
        UPDATE public.units 
        SET status = 'Available' 
        WHERE id = NEW.unit_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for unit status update
DROP TRIGGER IF EXISTS booking_unit_status_update ON public.bookings;
CREATE TRIGGER booking_unit_status_update
AFTER INSERT OR UPDATE OF status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION update_unit_status_on_booking();

-- Grant necessary permissions
GRANT ALL ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

COMMENT ON TABLE public.bookings IS 'Unit bookings and reservations';
COMMENT ON COLUMN public.bookings.id IS 'Unique identifier for the booking';
COMMENT ON COLUMN public.bookings.status IS 'Booking status: Active, Completed, Cancelled';
