# إضافة جدول transactions إلى Supabase

## الخطوات المطلوبة:

### 1. افتح Supabase Dashboard
انتقل إلى: https://supabase.com/dashboard/project/dlxtduzxlwogpwxjeqxm

### 2. افتح SQL Editor
- اضغط على "SQL Editor" من القائمة الجانبية
- اضغط على "New query"

### 3. انسخ الكود من الملف SQL

افتح الملف `supabase-migrations/create-transactions-table.sql` وانسخ كل المحتوى

أو انسخ الكود التالي **بدون علامات markdown** (```sql و ```):

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    account_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Deposit', 'Withdrawal')),
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    source_id TEXT,
    source_type TEXT CHECK (source_type IN ('Payment', 'Sale', 'Expense', 'Manual', 'Salary', 'Deferred Payment')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_source_id ON public.transactions(source_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_updated_at_trigger
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_transactions_updated_at();

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Enable read access for all authenticated users" ON public.transactions
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert access for all authenticated users" ON public.transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update access for all authenticated users" ON public.transactions
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete access for all authenticated users" ON public.transactions
    FOR DELETE
    TO authenticated
    USING (true);

-- Grant permissions
GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;

### 4. اضغط "Run" أو Ctrl+Enter

### 5. تحقق من نجاح العملية
- يجب أن ترى رسالة "Success. No rows returned"
- انتقل إلى "Table Editor" من القائمة الجانبية
- يجب أن ترى جدول جديد باسم "transactions"

## بعد التنفيذ:
- جدول transactions جاهز للاستخدام
- النظام سيحفظ المعاملات المالية في Supabase
- البيانات الحالية في localStorage ستبقى، لكن البيانات الجديدة ستذهب إلى Supabase
