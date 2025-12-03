-- إضافة عمود assignedUserId إلى جدول projects
-- هذا العمود يستخدم لتعيين مستخدم واحد لكل مشروع (للتوافق مع النسخة القديمة)

-- التحقق من وجود العمود قبل إضافته
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
        ADD COLUMN assigned_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Column assigned_user_id added to projects table';
    ELSE
        RAISE NOTICE 'Column assigned_user_id already exists in projects table';
    END IF;
END $$;

-- إضافة index للأداء
CREATE INDEX IF NOT EXISTS idx_projects_assigned_user_id 
ON public.projects(assigned_user_id);
