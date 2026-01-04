-- =====================================================
-- إعداد Storage Bucket لمرفقات الدفعات
-- =====================================================
-- 
-- الهدف: إنشاء bucket لتخزين وصولات تسديد الأقساط
-- مع سياسات RLS للسماح بالرفع والقراءة
-- =====================================================

-- 1. إنشاء الـ bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'payment-attachments',
    'payment-attachments',
    false,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "payment_attachments_upload" ON storage.objects;
DROP POLICY IF EXISTS "payment_attachments_read" ON storage.objects;
DROP POLICY IF EXISTS "payment_attachments_update" ON storage.objects;
DROP POLICY IF EXISTS "payment_attachments_delete" ON storage.objects;
DROP POLICY IF EXISTS "payment_attachments_public_upload" ON storage.objects;
DROP POLICY IF EXISTS "payment_attachments_public_read" ON storage.objects;
DROP POLICY IF EXISTS "payment_attachments_public_update" ON storage.objects;
DROP POLICY IF EXISTS "payment_attachments_public_delete" ON storage.objects;

-- 3. سياسات للسماح بالوصول العام (لأن التطبيق يستخدم anon key)

-- السماح بالرفع
CREATE POLICY "payment_attachments_public_upload"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'payment-attachments');

-- السماح بالقراءة
CREATE POLICY "payment_attachments_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'payment-attachments');

-- السماح بالتحديث
CREATE POLICY "payment_attachments_public_update"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'payment-attachments');

-- السماح بالحذف
CREATE POLICY "payment_attachments_public_delete"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'payment-attachments');

-- =====================================================
-- تنفيذ هذا الملف في Supabase SQL Editor
-- =====================================================
