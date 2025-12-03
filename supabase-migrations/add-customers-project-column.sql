-- إضافة عمود project_id إلى جدول customers
-- هذا يربط كل عميل بمشروع محدد

-- التحقق من وجود العمود قبل إضافته
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customers' 
        AND column_name = 'project_id'
    ) THEN
        ALTER TABLE public.customers 
        ADD COLUMN project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Column project_id added to customers table';
    ELSE
        RAISE NOTICE 'Column project_id already exists in customers table';
    END IF;
END $$;

-- إضافة index للأداء
CREATE INDEX IF NOT EXISTS idx_customers_project_id 
ON public.customers(project_id);

-- اختياري: تحديث العملاء الحاليين بمشروع افتراضي
-- UPDATE public.customers SET project_id = 'your-default-project-id' WHERE project_id IS NULL;
