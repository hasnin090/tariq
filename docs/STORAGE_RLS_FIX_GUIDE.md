# دليل إصلاح سياسات الأمان للملفات (Storage RLS)

## المشكلة
عند محاولة رفع ملفات، يظهر خطأ:
```
StorageApiError: new row violates row-level security policy
```

هذا يعني أن سياسات الأمان للـ Storage bucket غير موجودة أو غير مفعّلة.

## الحل

### الخطوة 1: تسجيل الدخول إلى Supabase Dashboard
1. افتح [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروعك
3. اذهب إلى **SQL Editor** من القائمة الجانبية

### الخطوة 2: تنفيذ الكود SQL
انسخ والصق هذا الكود في SQL Editor واضغط **Run**:

```sql
-- Fix Storage RLS Policies for Documents Bucket
-- This script adds necessary RLS policies for the 'documents' storage bucket

-- First, ensure the bucket exists (if not created yet)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete documents" ON storage.objects;

-- Policy 1: Allow authenticated users to INSERT (upload) documents
CREATE POLICY "Allow authenticated users to upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Policy 2: Allow authenticated users to SELECT (read) documents
CREATE POLICY "Allow authenticated users to read documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Policy 3: Allow authenticated users to UPDATE documents
CREATE POLICY "Allow authenticated users to update documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- Policy 4: Allow authenticated users to DELETE documents
CREATE POLICY "Allow authenticated users to delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
```

### الخطوة 3: التحقق من إنشاء الـ Bucket
1. اذهب إلى **Storage** من القائمة الجانبية
2. تأكد من وجود bucket اسمه **documents**
3. إذا لم يكن موجوداً، اضغط **New bucket** وأنشئ bucket بالاسم `documents`
4. اجعله **Private** (ليس Public)

### الخطوة 4: التحقق من السياسات
في SQL Editor، نفذ هذا الأمر للتحقق:

```sql
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%documents%'
ORDER BY policyname;
```

يجب أن ترى 4 سياسات:
- Allow authenticated users to delete documents
- Allow authenticated users to read documents
- Allow authenticated users to update documents
- Allow authenticated users to upload documents

### الخطوة 5: اختبار رفع الملفات
1. ارجع إلى التطبيق
2. جرب إضافة عميل جديد مع مستند
3. يجب أن يعمل رفع الملف بنجاح

## ملاحظات مهمة

- **الأمان**: السياسات الحالية تسمح لأي مستخدم مُسجَّل برفع/قراءة/تعديل/حذف الملفات
- إذا كنت تريد المزيد من التحكم، يمكنك تعديل السياسات لتعتمد على:
  - دور المستخدم (role)
  - معرف المستخدم (auth.uid())
  - البيانات المرتبطة بالملف

## مثال لسياسة أكثر أماناً (اختياري)

إذا أردت أن يستطيع المستخدمون رؤية ملفاتهم فقط:

```sql
-- Only allow users to read their own uploaded files
CREATE POLICY "Users can read their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);
```

لكن هذا يتطلب تعديل طريقة رفع الملفات لتضع الملفات في مجلد باسم معرف المستخدم.

## الأخطاء الشائعة

### خطأ: "Bucket not found"
**الحل**: أنشئ الـ bucket من Storage > New bucket

### خطأ: "Permission denied"
**الحل**: تأكد من تسجيل الدخول بحساب Admin في Supabase Dashboard

### خطأ: "Policy already exists"
**الحل**: نفذ أوامر DROP POLICY أولاً قبل CREATE POLICY
