-- Create units table
CREATE TABLE IF NOT EXISTS public.units (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    unit_number TEXT NOT NULL,
    floor INTEGER,
    area DECIMAL(10, 2),
    bedrooms INTEGER,
    bathrooms INTEGER,
    unit_type TEXT CHECK (unit_type IN ('Apartment', 'Villa', 'Townhouse', 'Office', 'Shop', 'Land')),
    price DECIMAL(15, 2) NOT NULL,
    status TEXT DEFAULT 'Available' CHECK (status IN ('Available', 'Reserved', 'Sold', 'Maintenance')),
    features TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, unit_number)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_units_project ON public.units(project_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON public.units(status);
CREATE INDEX IF NOT EXISTS idx_units_type ON public.units(unit_type);
CREATE INDEX IF NOT EXISTS idx_units_price ON public.units(price);
CREATE INDEX IF NOT EXISTS idx_units_active ON public.units(is_active);
CREATE INDEX IF NOT EXISTS idx_units_number ON public.units(unit_number);

-- Enable Row Level Security
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Create policies for units table
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.units;
CREATE POLICY "Allow read access to all authenticated users"
ON public.units
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.units;
CREATE POLICY "Allow insert for authenticated users"
ON public.units
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.units;
CREATE POLICY "Allow update for authenticated users"
ON public.units
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.units;
CREATE POLICY "Allow delete for authenticated users"
ON public.units
FOR DELETE
TO authenticated
USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_units_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS units_updated_at ON public.units;
CREATE TRIGGER units_updated_at
BEFORE UPDATE ON public.units
FOR EACH ROW
EXECUTE FUNCTION update_units_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;

COMMENT ON TABLE public.units IS 'Real estate units in projects';
COMMENT ON COLUMN public.units.id IS 'Unique identifier for the unit';
COMMENT ON COLUMN public.units.project_id IS 'Reference to parent project';
COMMENT ON COLUMN public.units.unit_number IS 'Unit number within project';
COMMENT ON COLUMN public.units.status IS 'Unit status: Available, Reserved, Sold, Maintenance';
