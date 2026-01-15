-- =====================================================
-- إنشاء جدول عمليات بيع الوحدات
-- =====================================================

-- إنشاء الجدول
CREATE TABLE IF NOT EXISTS unit_sales (
    id TEXT PRIMARY KEY,
    unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    sale_price DECIMAL(15,2) NOT NULL,
    final_sale_price DECIMAL(15,2) NOT NULL,
    sale_date DATE NOT NULL,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- إنشاء الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_unit_sales_unit_id ON unit_sales(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_sales_customer_id ON unit_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_unit_sales_project_id ON unit_sales(project_id);
CREATE INDEX IF NOT EXISTS idx_unit_sales_sale_date ON unit_sales(sale_date);

-- تفعيل RLS (Row Level Security)
ALTER TABLE unit_sales ENABLE ROW LEVEL SECURITY;

-- سياسة السماح بالقراءة للجميع
CREATE POLICY "Allow read access to all" ON unit_sales
    FOR SELECT
    USING (true);

-- سياسة السماح بالإضافة للجميع
CREATE POLICY "Allow insert access to all" ON unit_sales
    FOR INSERT
    WITH CHECK (true);

-- سياسة السماح بالتحديث للجميع
CREATE POLICY "Allow update access to all" ON unit_sales
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- سياسة السماح بالحذف للجميع
CREATE POLICY "Allow delete access to all" ON unit_sales
    FOR DELETE
    USING (true);

-- Trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_unit_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_unit_sales_updated_at
    BEFORE UPDATE ON unit_sales
    FOR EACH ROW
    EXECUTE FUNCTION update_unit_sales_updated_at();

-- عرض النتيجة
SELECT 
    'جدول unit_sales تم إنشاؤه بنجاح!' as message,
    COUNT(*) as total_sales
FROM unit_sales;
