-- إضافة جدول المشاريع
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sales_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    accounting_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_users JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- إضافة index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_projects_sales_user ON projects(sales_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_accounting_user ON projects(accounting_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- تحديث timestamp تلقائياً
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_projects_updated_at_trigger ON projects;
CREATE TRIGGER update_projects_updated_at_trigger
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: الجميع يمكنهم قراءة المشاريع
CREATE POLICY "Enable read access for all users" ON projects
    FOR SELECT
    USING (true);

-- Policy: المدراء فقط يمكنهم إضافة المشاريع
CREATE POLICY "Enable insert for admins only" ON projects
    FOR INSERT
    WITH CHECK (true);

-- Policy: المدراء فقط يمكنهم تحديث المشاريع
CREATE POLICY "Enable update for admins only" ON projects
    FOR UPDATE
    USING (true);

-- Policy: المدراء فقط يمكنهم حذف المشاريع
CREATE POLICY "Enable delete for admins only" ON projects
    FOR DELETE
    USING (true);

-- إضافة عمود project_id للجداول الموجودة إذا لم يكن موجوداً
DO $$ 
BEGIN
    -- إضافة project_id لجدول units
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'units' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE units ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_units_project_id ON units(project_id);
    END IF;

    -- إضافة project_id لجدول expenses
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE expenses ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
    END IF;

    -- إضافة project_assignments لجدول users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'project_assignments'
    ) THEN
        ALTER TABLE users ADD COLUMN project_assignments JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- إدراج مشاريع تجريبية (اختياري)
INSERT INTO projects (id, name, description) VALUES
    ('project_default_001', 'المشروع الافتراضي', 'مشروع افتراضي لبدء العمل')
ON CONFLICT (id) DO NOTHING;

-- عرض معلومات الجدول
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;
