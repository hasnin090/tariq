-- Migration: Add project_id to documents table
-- هذا الملف يضيف حقل المشروع لجدول المستندات لتمكين فلترة المستندات حسب المشروع

-- 1. إضافة عمود project_id
ALTER TABLE documents ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- 2. إنشاء فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);

-- 3. تعليق على العمود
COMMENT ON COLUMN documents.project_id IS 'Reference to the project this document belongs to';

-- 4. تحديث المستندات الحالية - ربطها بمشروع الفندق
-- أولاً نحتاج معرفة ID مشروع الفندق
-- يمكنك تشغيل هذا الاستعلام أولاً للحصول على ID:
-- SELECT id, name FROM projects WHERE name LIKE '%فندق%';

-- ثم قم بتحديث المستندات باستخدام ID الصحيح:
-- UPDATE documents SET project_id = 'YOUR_HOTEL_PROJECT_ID' WHERE project_id IS NULL;

-- أو يمكنك تشغيل هذا الاستعلام لتحديث جميع المستندات تلقائياً بناءً على اسم المشروع:
UPDATE documents 
SET project_id = (SELECT id FROM projects WHERE name LIKE '%فندق%' LIMIT 1)
WHERE project_id IS NULL;
