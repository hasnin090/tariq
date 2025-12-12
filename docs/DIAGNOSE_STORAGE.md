# تشخيص مشكلة Storage

## التحقق من إعدادات Bucket

### 1. افتح Supabase Dashboard → Storage
تحقق من:
- ✅ وجود bucket اسمه `documents`
- ✅ الـ bucket ليس Public (يجب أن يكون Private)
- ✅ RLS مفعّل على الـ bucket

### 2. تحقق من السياسات
Dashboard → SQL Editor → نفّذ:

```sql
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE id = 'documents';

-- Check policies
SELECT 
    schemaname,
    tablename, 
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'objects'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';
```

### النتائج المتوقعة:

**Bucket:**
```
id: documents
name: documents
public: false
```

**Policies (يجب أن ترى 4):**
- Allow authenticated delete
- Allow authenticated read
- Allow authenticated update
- Allow authenticated upload

**RLS:**
```
rowsecurity: true
```

---

## إذا لم يكن الـ bucket موجوداً:

```sql
-- Create bucket manually
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents', 
    false,
    52428800,  -- 50MB
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'application/pdf', 'image/gif']::text[]
);
```

---

## إذا كانت السياسات غير موجودة:

```sql
-- Re-create all policies
DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;

CREATE POLICY "Allow authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow authenticated read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Allow authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
```

---

## اختبار الرفع يدوياً

1. Dashboard → Storage → documents bucket
2. اضغط **Upload file**
3. اختر أي صورة
4. إذا نجح الرفع، المشكلة في الكود
5. إذا فشل، المشكلة في السياسات

---

## أخبرني بالنتائج:
- هل الـ bucket موجود؟
- هل السياسات موجودة؟
- هل الرفع اليدوي يعمل؟
