-- ============================================================================
-- إنشاء جداول نظام الدفعات المؤجلة (Deferred Payments)
-- نظام منفصل تماماً عن الحركات المالية العادية
-- الدفعات تؤثر على أرصدة الحسابات مباشرة بدون إنشاء expenses أو transactions
-- ============================================================================

-- 1. جدول الحسابات الآجلة (الديون)
CREATE TABLE IF NOT EXISTS deferred_accounts (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    vendor_id TEXT REFERENCES vendors(id) ON DELETE SET NULL,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(15, 2) NOT NULL DEFAULT 0,
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Partially Paid', 'Paid')),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول دفعات/أقساط الحسابات الآجلة
CREATE TABLE IF NOT EXISTS deferred_installments (
    id TEXT PRIMARY KEY,
    deferred_account_id TEXT NOT NULL REFERENCES deferred_accounts(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    notes TEXT,
    receipt_number TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. إنشاء الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_deferred_accounts_project ON deferred_accounts(project_id);
CREATE INDEX IF NOT EXISTS idx_deferred_accounts_vendor ON deferred_accounts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_deferred_accounts_status ON deferred_accounts(status);
CREATE INDEX IF NOT EXISTS idx_deferred_installments_account ON deferred_installments(deferred_account_id);
CREATE INDEX IF NOT EXISTS idx_deferred_installments_date ON deferred_installments(payment_date);

-- 4. تفعيل RLS (Row Level Security)
ALTER TABLE deferred_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deferred_installments ENABLE ROW LEVEL SECURITY;

-- 5. سياسات الأمان - السماح بالقراءة والكتابة للمستخدمين المصادق عليهم
-- ملاحظة: يمكنك تخصيص هذه السياسات حسب الأدوار

-- سياسات deferred_accounts
DROP POLICY IF EXISTS "Users can view deferred_accounts" ON deferred_accounts;
CREATE POLICY "Users can view deferred_accounts" 
    ON deferred_accounts FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Users can insert deferred_accounts" ON deferred_accounts;
CREATE POLICY "Users can insert deferred_accounts" 
    ON deferred_accounts FOR INSERT 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update deferred_accounts" ON deferred_accounts;
CREATE POLICY "Users can update deferred_accounts" 
    ON deferred_accounts FOR UPDATE 
    USING (true);

DROP POLICY IF EXISTS "Users can delete deferred_accounts" ON deferred_accounts;
CREATE POLICY "Users can delete deferred_accounts" 
    ON deferred_accounts FOR DELETE 
    USING (true);

-- سياسات deferred_installments
DROP POLICY IF EXISTS "Users can view deferred_installments" ON deferred_installments;
CREATE POLICY "Users can view deferred_installments" 
    ON deferred_installments FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Users can insert deferred_installments" ON deferred_installments;
CREATE POLICY "Users can insert deferred_installments" 
    ON deferred_installments FOR INSERT 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update deferred_installments" ON deferred_installments;
CREATE POLICY "Users can update deferred_installments" 
    ON deferred_installments FOR UPDATE 
    USING (true);

DROP POLICY IF EXISTS "Users can delete deferred_installments" ON deferred_installments;
CREATE POLICY "Users can delete deferred_installments" 
    ON deferred_installments FOR DELETE 
    USING (true);

-- ============================================================================
-- ملاحظة هامة:
-- هذا النظام منفصل تماماً عن expenses و transactions
-- عند إضافة دفعة (installment)، يتم خصم المبلغ مباشرة من رصيد الحساب (accounts.balance)
-- عند حذف دفعة، يتم إعادة المبلغ للحساب
-- هذا يتم عبر الكود في supabaseService.ts وليس عبر triggers
-- ============================================================================
