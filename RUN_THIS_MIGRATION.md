# تعليمات تنفيذ Migration لإضافة عمود assigned_user_id

## المشكلة
عند إضافة أو تعديل مستخدم، يظهر الخطأ التالي:
```
Could not find the 'assigned_user_id' column of 'projects' in the schema cache
```

## الحل
يجب تنفيذ الـ SQL التالي في قاعدة بيانات Supabase:

### الخطوات:
1. افتح Supabase Dashboard: https://supabase.com/dashboard
2. اذهب إلى مشروعك
3. من القائمة الجانبية، اختر **SQL Editor**
4. انسخ والصق **الكود SQL فقط** (بدون علامات ```sql و ```) التالي:

---
**⚠️ انسخ من هنا فقط:**

-- إضافة عمود assigned_user_id إلى جدول projects
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

-- تحديث الـ comment
COMMENT ON COLUMN public.projects.assigned_user_id IS 'معرف المستخدم المعين للمشروع (للمحاسبين والمبيعات)';

**⚠️ إلى هنا فقط - لا تنسخ علامات markdown**

---

5. الصق الكود في SQL Editor واضغط على **Run** أو **F5**
6. تأكد من ظهور رسالة نجاح
7. أعد تحميل التطبيق

## ملاحظات
- هذا الـ migration آمن ويمكن تنفيذه في أي وقت
- إذا كان العمود موجوداً بالفعل، لن يحدث شيء
- العمود يدعم `NULL` لذلك لن يؤثر على البيانات الموجودة
- عند حذف مستخدم، يتم تلقائياً وضع `NULL` في هذا العمود

## بعد التنفيذ
بعد تنفيذ الـ migration بنجاح:
- ستتمكن من إضافة مستخدمين جدد بدون أخطاء
- ستتمكن من تعيين المستخدمين للمشاريع
- سيتم حفظ العلاقة بين المستخدم والمشروع في قاعدة البيانات
