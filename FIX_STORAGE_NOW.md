# 🚨 حل عاجل: خطأ رفع الملفات

## المشكلة
```
StorageApiError: new row violates row-level security policy
```
لا يمكن رفع الملفات (مستندات العملاء) بسبب عدم وجود سياسات أمان للـ Storage.

---

## ✅ الحل (3 دقائق)

### 1️⃣ افتح Supabase Dashboard
انتقل إلى: https://supabase.com/dashboard
- اختر مشروعك
- من القائمة الجانبية، اذهب إلى **SQL Editor**

### 2️⃣ انسخ والصق هذا الكود بالكامل:

```sql
-- إنشاء bucket للمستندات (إذا لم يكن موجوداً)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- حذف السياسات القديمة (إن وجدت)
DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;

-- إنشاء السياسات الجديدة
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
USING (bucket_id = 'documents');

CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
```

### 3️⃣ اضغط زر **Run** ▶️

### 4️⃣ تحقق من النتيجة
يجب أن ترى رسالة نجاح مثل:
```
Success. No rows returned
```

---

## 🧪 اختبار الحل

1. ارجع إلى التطبيق
2. جرب إضافة عميل جديد مع رفع مستند
3. يجب أن يعمل بنجاح! ✅

---

## 📋 التحقق من السياسات

إذا أردت التأكد من تطبيق السياسات، نفّذ:

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%authenticated%';
```

يجب أن ترى 4 سياسات:
- Allow authenticated upload (INSERT)
- Allow authenticated read (SELECT)
- Allow authenticated update (UPDATE)
- Allow authenticated delete (DELETE)

---

## ❓ لماذا حدث هذا؟

Supabase Storage يحمي الملفات افتراضياً بـ RLS (Row Level Security).
بدون سياسات واضحة، لا يمكن لأحد رفع أو قراءة الملفات - حتى المستخدمين المسجلين.

السياسات أعلاه تسمح لـ**جميع المستخدمين المسجلين** برفع/قراءة/تعديل/حذف المستندات.

---

## 🔒 لمزيد من الأمان (اختياري)

إذا أردت أن يرى كل مستخدم ملفاته فقط، يمكنك تعديل السياسات لاحقاً.
لكن للبدء السريع، السياسات الحالية كافية.
