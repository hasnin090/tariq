-- ══════════════════════════════════════════════════════════════════════════════
-- 📄 نقل المستندات الحالية إلى مشروع الفندق
-- Migration: Migrate existing documents to hotel project
-- ══════════════════════════════════════════════════════════════════════════════
-- التاريخ: 2026-01-07
-- الوصف: نقل جميع المستندات التي لا تحتوي على project_id إلى مشروع الفندق
-- ══════════════════════════════════════════════════════════════════════════════

-- 📌 الخطوة 1: التحقق من وجود عمود project_id في جدول documents
-- إذا لم يكن موجوداً، سيتم إنشاؤه
ALTER TABLE documents ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- 📌 الخطوة 2: إنشاء فهرس للأداء (إذا لم يكن موجوداً)
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);

-- 📌 الخطوة 3: إضافة تعليق على العمود
COMMENT ON COLUMN documents.project_id IS 'معرف المشروع المرتبط بالمستند';

-- ══════════════════════════════════════════════════════════════════════════════
-- 🔍 استعلامات للفحص قبل التنفيذ
-- ══════════════════════════════════════════════════════════════════════════════

-- 1️⃣ عرض جميع المشاريع المتاحة مع أسمائها
-- SELECT id, name, status FROM projects ORDER BY name;

-- 2️⃣ البحث عن مشروع الفندق بالتحديد
-- SELECT id, name FROM projects WHERE name LIKE '%فندق%' OR name LIKE '%hotel%' OR name ILIKE '%hotel%';

-- 3️⃣ عرض عدد المستندات التي لا تحتوي على project_id
-- SELECT COUNT(*) as documents_without_project FROM documents WHERE project_id IS NULL;

-- 4️⃣ عرض بعض الأمثلة من المستندات التي ستتأثر
-- SELECT id, file_name, uploaded_at FROM documents WHERE project_id IS NULL LIMIT 10;

-- ══════════════════════════════════════════════════════════════════════════════
-- ⚡ التنفيذ: نقل المستندات إلى مشروع الفندق
-- ══════════════════════════════════════════════════════════════════════════════

-- 📝 الطريقة الأولى: باستخدام البحث التلقائي عن مشروع الفندق
-- هذه الطريقة تبحث عن أول مشروع يحتوي كلمة "فندق" في اسمه
DO $$
DECLARE
    hotel_project_id UUID;
    affected_rows integer;
BEGIN
    -- البحث عن مشروع الفندق
    SELECT id INTO hotel_project_id 
    FROM projects 
    WHERE name LIKE '%فندق%' OR name ILIKE '%hotel%'
    LIMIT 1;
    
    -- التحقق من وجود المشروع
    IF hotel_project_id IS NULL THEN
        RAISE EXCEPTION 'لم يتم العثور على مشروع الفندق. يرجى التأكد من وجود مشروع يحتوي على كلمة "فندق" أو "hotel" في اسمه.';
    END IF;
    
    -- تحديث المستندات
    UPDATE documents 
    SET project_id = hotel_project_id 
    WHERE project_id IS NULL;
    
    -- الحصول على عدد الصفوف المتأثرة
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    -- إظهار رسالة نجاح
    RAISE NOTICE 'تم نقل % مستند(ات) إلى مشروع الفندق (ID: %)', affected_rows, hotel_project_id;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 📝 الطريقة الثانية (بديلة): تحديد ID المشروع يدوياً
-- ══════════════════════════════════════════════════════════════════════════════
-- إذا كنت تعرف ID مشروع الفندق بالتحديد، يمكنك استخدام هذا الاستعلام:
-- (قم بإزالة التعليق وتغيير 'YOUR_HOTEL_PROJECT_ID' بالـ ID الصحيح)

-- UPDATE documents 
-- SET project_id = 'YOUR_HOTEL_PROJECT_ID' 
-- WHERE project_id IS NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- ✅ التحقق من النتائج بعد التنفيذ
-- ══════════════════════════════════════════════════════════════════════════════

-- 1️⃣ عرض عدد المستندات حسب كل مشروع
-- SELECT 
--     p.name as project_name,
--     COUNT(d.id) as document_count
-- FROM projects p
-- LEFT JOIN documents d ON p.id = d.project_id
-- GROUP BY p.id, p.name
-- ORDER BY document_count DESC;

-- 2️⃣ التأكد من عدم وجود مستندات بدون مشروع
-- SELECT COUNT(*) as documents_without_project FROM documents WHERE project_id IS NULL;

-- 3️⃣ عرض المستندات التي تم نقلها لمشروع الفندق
-- SELECT 
--     d.id,
--     d.file_name,
--     d.uploaded_at,
--     p.name as project_name
-- FROM documents d
-- JOIN projects p ON d.project_id = p.id
-- WHERE p.name LIKE '%فندق%'
-- ORDER BY d.uploaded_at DESC
-- LIMIT 20;

-- ══════════════════════════════════════════════════════════════════════════════
-- 🔧 معلومات إضافية
-- ══════════════════════════════════════════════════════════════════════════════
-- 
-- الآلية الحالية للتنظيم:
-- ----------------------
-- 1. تم إضافة حقل project_id إلى جدول documents
-- 2. عند رفع مستندات جديدة، يتم ربطها تلقائياً بالمشروع النشط
-- 3. واجهة الحسابات (DocumentsAccounting.tsx) تعرض المستندات المفلترة حسب المشروع
-- 4. خدمة documentsService.getAllAccountingDocuments() تدعم التصفية حسب project_id
-- 
-- للحفاظ على التنظيم في المستقبل:
-- -----------------------------------
-- • تأكد من تفعيل ProjectSelector في الواجهة
-- • المستندات الجديدة سيتم ربطها تلقائياً بالمشروع النشط
-- • يمكنك نقل مستندات من مشروع لآخر عبر تحديث حقل project_id
-- 
-- مثال لنقل مستند معين لمشروع آخر:
-- UPDATE documents SET project_id = 'new_project_id' WHERE id = 'document_id';
-- ══════════════════════════════════════════════════════════════════════════════
