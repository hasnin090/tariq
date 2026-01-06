-- ============================================================================
-- إصلاح النصوص المشفرة (HTML Encoded) في جدول المصروفات
-- ============================================================================
-- المشكلة: بعض الحروف مثل / تم تحويلها إلى &#x2F;
-- الحل: استبدال الرموز المشفرة بالحروف الأصلية
-- ============================================================================

-- إصلاح جدول expenses
UPDATE expenses 
SET description = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(description, '&#x2F;', '/'),
        '&quot;', '"'
      ),
      '&#x27;', ''''
    ),
    '&lt;', '<'
  ),
  '&gt;', '>'
)
WHERE description LIKE '%&#x%' 
   OR description LIKE '%&quot;%' 
   OR description LIKE '%&lt;%' 
   OR description LIKE '%&gt;%';

-- إصلاح حقل notes أيضاً إذا كان موجوداً
UPDATE expenses 
SET notes = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(notes, '&#x2F;', '/'),
        '&quot;', '"'
      ),
      '&#x27;', ''''
    ),
    '&lt;', '<'
  ),
  '&gt;', '>'
)
WHERE notes IS NOT NULL 
  AND (notes LIKE '%&#x%' 
   OR notes LIKE '%&quot;%' 
   OR notes LIKE '%&lt;%' 
   OR notes LIKE '%&gt;%');

-- التحقق من النتيجة
SELECT id, description 
FROM expenses 
WHERE description LIKE '%مشتريات%' OR description LIKE '%عمولات%'
LIMIT 10;
