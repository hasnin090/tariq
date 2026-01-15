-- إضافة أعمدة المستخدمين المعينين إلى جدول projects (UUID)

-- 1) assigned_user_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'projects' 
        AND column_name = 'assigned_user_id'
    ) THEN
        ALTER TABLE public.projects 
        ADD COLUMN assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Column assigned_user_id added to projects table';
    ELSE
        RAISE NOTICE 'Column assigned_user_id already exists in projects table';
    END IF;
END $$;

-- 2) sales_user_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'projects' 
        AND column_name = 'sales_user_id'
    ) THEN
        ALTER TABLE public.projects 
        ADD COLUMN sales_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Column sales_user_id added to projects table';
    ELSE
        RAISE NOTICE 'Column sales_user_id already exists in projects table';
    END IF;
END $$;

-- 3) accounting_user_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'projects' 
        AND column_name = 'accounting_user_id'
    ) THEN
        ALTER TABLE public.projects 
        ADD COLUMN accounting_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Column accounting_user_id added to projects table';
    ELSE
        RAISE NOTICE 'Column accounting_user_id already exists in projects table';
    END IF;
END $$;

-- Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_projects_assigned_user_id 
ON public.projects(assigned_user_id);

CREATE INDEX IF NOT EXISTS idx_projects_sales_user_id 
ON public.projects(sales_user_id);

CREATE INDEX IF NOT EXISTS idx_projects_accounting_user_id 
ON public.projects(accounting_user_id);
