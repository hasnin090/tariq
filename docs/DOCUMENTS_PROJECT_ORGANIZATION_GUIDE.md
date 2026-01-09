# 📄 دليل تنظيم المستندات حسب المشروع
## نظام إدارة مستندات واجهة الحسابات

---

## 📋 نظرة عامة

هذا الدليل يشرح كيفية تنظيم المستندات في واجهة الحسابات بحيث تُعرض وتُنظم حسب المشروع. تم تصميم النظام بحيث:

✅ **كل مستند يرتبط بمشروع معين**  
✅ **المستندات تُعرض مُفلترة حسب المشروع النشط**  
✅ **يمكن نقل المستندات القديمة بسهولة**  
✅ **المستندات الجديدة تُربط تلقائياً بالمشروع**

---

## 🏗️ البنية التقنية

### 1. قاعدة البيانات

تم إضافة حقل `project_id` إلى جدول `documents`:

```sql
ALTER TABLE documents ADD COLUMN project_id text REFERENCES projects(id);
CREATE INDEX idx_documents_project_id ON documents(project_id);
```

### 2. الواجهة الأمامية

**الملف:** `components/pages/accounting/DocumentsAccounting.tsx`

- يستخدم `ProjectSelector` لاختيار المشروع النشط
- يستخدم `useProject()` hook للحصول على المشروع الحالي
- يُمرر `projectId` لخدمة `documentsService`

**الكود الرئيسي:**
```typescript
const { activeProject } = useProject();
const projectIdToFilter = currentUser?.assignedProjectId || activeProject?.id || null;
const allDocsFromDB = await documentsService.getAllAccountingDocuments(projectIdToFilter);
```

### 3. الخدمات (Services)

**الملف:** `src/services/supabaseService.ts`

#### دالة `getAllAccountingDocuments()`
```typescript
async getAllAccountingDocuments(projectId?: string | null) {
  let query = supabase
    .from('documents')
    .select('*')
    .or('expense_id.not.is.null,and(customer_id.is.null,booking_id.is.null,sale_id.is.null)');
  
  if (projectId) {
    query = query.eq('project_id', projectId);
  }
  
  const { data, error } = await query.order('uploaded_at', { ascending: false });
  // ...
}
```

#### دالة `uploadUnlinkedDocument()`
```typescript
async uploadUnlinkedDocument(fileName: string, base64Content: string, mimeType: string, projectId?: string | null) {
  // تحويل base64 إلى blob
  // ...
  return this.upload(file, { allow_unlinked: true, project_id: projectId || null });
}
```

---

## 🚀 خطوات نقل المستندات الحالية إلى مشروع الفندق

### الخطوة 1: التحضير

قبل البدء، تأكد من:
1. وجود نسخة احتياطية من قاعدة البيانات
2. معرفة اسم أو ID مشروع الفندق

### الخطوة 2: تنفيذ Migration

استخدم الملف: `supabase-migrations/migrate-documents-to-hotel-project.sql`

#### الطريقة الأولى: تنفيذ تلقائي
```sql
-- سيبحث تلقائياً عن مشروع يحتوي على كلمة "فندق" أو "hotel"
-- ثم ينقل جميع المستندات التي ليس لها project_id إلى هذا المشروع
-- الكود موجود في الملف، فقط قم بتشغيله
```

#### الطريقة الثانية: تحديد ID يدوياً
إذا كنت تعرف ID المشروع:
```sql
-- 1. اعرض المشاريع المتاحة
SELECT id, name FROM projects;

-- 2. نفذ التحديث باستخدام ID المحدد
UPDATE documents 
SET project_id = 'YOUR_HOTEL_PROJECT_ID' 
WHERE project_id IS NULL;
```

### الخطوة 3: التحقق من النتائج

```sql
-- 1. عرض عدد المستندات لكل مشروع
SELECT 
    p.name as project_name,
    COUNT(d.id) as document_count
FROM projects p
LEFT JOIN documents d ON p.id = d.project_id
GROUP BY p.id, p.name
ORDER BY document_count DESC;

-- 2. التأكد من عدم وجود مستندات بدون مشروع
SELECT COUNT(*) FROM documents WHERE project_id IS NULL;
```

---

## 📊 كيفية عمل النظام

### رفع مستندات جديدة

1. المستخدم يختار المشروع من `ProjectSelector`
2. يرفع المستندات عبر واجهة الحسابات
3. يتم تمرير `projectId` تلقائياً عند الرفع:

```typescript
const projectIdForUpload = currentUser?.assignedProjectId || activeProject?.id || null;

await documentsService.uploadUnlinkedDocument(
    doc.fileName,
    doc.content,
    doc.mimeType,
    projectIdForUpload  // ← يتم ربط المستند بالمشروع تلقائياً
);
```

### عرض المستندات

1. يتم تحديد المشروع النشط من `useProject()`
2. يتم تمرير `projectId` لدالة `getAllAccountingDocuments()`
3. تُعرض فقط المستندات المرتبطة بهذا المشروع

```typescript
const projectIdToFilter = currentUser?.assignedProjectId || activeProject?.id || null;
const documents = await documentsService.getAllAccountingDocuments(projectIdToFilter);
```

---

## 🎯 حالات الاستخدام

### الحالة 1: عرض مستندات مشروع معين
- اختر المشروع من القائمة المنسدلة في الأعلى
- ستُعرض فقط المستندات الخاصة به

### الحالة 2: نقل مستند من مشروع لآخر
```sql
UPDATE documents 
SET project_id = 'new_project_id' 
WHERE id = 'document_id';
```

### الحالة 3: عرض جميع المستندات (بدون فلترة)
```sql
-- في حالة الحاجة لعرض جميع المستندات في جميع المشاريع
SELECT * FROM documents ORDER BY uploaded_at DESC;
```

---

## 🔐 الصلاحيات والأمان

### Row Level Security (RLS)

تأكد من أن سياسات RLS تسمح بالتالي:
```sql
-- مثال على سياسة للسماح بعرض المستندات حسب المشروع
CREATE POLICY "Users can view documents for their assigned projects"
ON documents FOR SELECT
USING (
  project_id IN (
    SELECT project_id FROM user_project_assignments 
    WHERE user_id = auth.uid()
  )
);
```

---

## 📝 ملاحظات مهمة

### 1. المستندات المرفوعة قبل إضافة حقل project_id
- **المشكلة:** المستندات القديمة لا تحتوي على `project_id`
- **الحل:** استخدم Migration Script المرفق لنقلها

### 2. المستخدمين المرتبطين بمشروع محدد
```typescript
// إذا كان المستخدم مرتبطاً بمشروع معين (assignedProjectId)
// سيتم استخدامه تلقائياً بدلاً من activeProject
const projectIdToFilter = currentUser?.assignedProjectId || activeProject?.id || null;
```

### 3. المستندات المرتبطة بالمصروفات
- المستندات المرتبطة بـ `expense_id` ستظهر دائماً
- حتى لو لم تكن مرتبطة بمشروع معين

---

## 🛠️ استكشاف الأخطاء

### المشكلة: المستندات لا تظهر
**الحل:**
1. تأكد من اختيار المشروع الصحيح
2. تحقق من قاعدة البيانات:
```sql
SELECT id, file_name, project_id 
FROM documents 
WHERE project_id IS NULL;
```
3. إذا وجدت مستندات بدون `project_id`، قم بتحديثها

### المشكلة: مستندات من مشروع آخر تظهر
**الحل:**
1. تحقق من `project_id` في قاعدة البيانات
2. تأكد من أن التصفية تعمل:
```typescript
// في DocumentsAccounting.tsx
console.log('Active Project ID:', activeProject?.id);
console.log('Filtering by:', projectIdToFilter);
```

---

## 📚 الملفات ذات الصلة

| الملف | الوصف |
|-------|-------|
| `supabase-migrations/add-project-id-to-documents.sql` | Migration الأصلي لإضافة حقل project_id |
| `supabase-migrations/migrate-documents-to-hotel-project.sql` | Script لنقل المستندات لمشروع الفندق |
| `components/pages/accounting/DocumentsAccounting.tsx` | واجهة عرض المستندات |
| `src/services/supabaseService.ts` | خدمات التعامل مع المستندات |
| `contexts/ProjectContext.tsx` | Context لإدارة المشروع النشط |

---

## ✅ الخطوات التالية المقترحة

1. ✅ تشغيل Migration لنقل المستندات الحالية
2. ⚙️ التأكد من عمل التصفية بشكل صحيح في الواجهة
3. 📊 إضافة إحصائيات لعدد المستندات لكل مشروع
4. 🔒 مراجعة سياسات RLS للتأكد من الأمان
5. 📖 تدريب المستخدمين على استخدام النظام

---

## 💡 نصائح للاستخدام الأمثل

### للمطورين:
- دائماً مرر `projectId` عند رفع المستندات
- استخدم `ProjectSelector` في جميع الصفحات ذات الصلة
- تحقق من `projectId` قبل الحفظ

### للمستخدمين:
- اختر المشروع الصحيح قبل رفع المستندات
- تأكد من ظهور اسم المشروع في الأعلى
- استخدم البحث والتصفية لتنظيم المستندات

---

## 📞 الدعم

للمساعدة أو الاستفسارات:
- راجع ملفات التوثيق في مجلد `docs/`
- تحقق من سجلات النشاط في `activity_logs`
- راجع Console logs في المتصفح للأخطاء

---

**تاريخ الإنشاء:** 2026-01-07  
**الإصدار:** 1.0  
**آخر تحديث:** 2026-01-07
