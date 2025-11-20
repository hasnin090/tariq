# إعداد قاعدة بيانات Supabase

## الجداول المطلوبة

يحتاج النظام إلى الجداول التالية في Supabase:

### 1. جدول المستخدمين (users)
```bash
نفذ: supabase-setup.sql
```

### 2. جدول المشاريع (projects)
```bash
نفذ: supabase-projects-setup.sql
```

### 3. جدول الحسابات المالية (accounts) - **مطلوب**
```bash
نفذ: supabase-accounts-setup.sql
```

### 4. جدول المعاملات المالية (transactions) - **مطلوب**
```bash
نفذ: supabase-transactions-setup.sql
```

### 5. جداول أخرى
- units (الوحدات)
- customers (العملاء)
- bookings (الحجوزات)
- payments (الدفعات)
- expenses (المصروفات)
- expense_categories (فئات المصروفات)
- documents (المستندات)

## خطوات الإعداد

### 1. افتح Supabase Dashboard
1. اذهب إلى: https://supabase.com/dashboard
2. افتح مشروعك: `dlxtduzxlwogpwxjeqxm`

### 2. افتح SQL Editor
1. من القائمة الجانبية، اختر **SQL Editor**
2. اضغط على **New query**

### 3. نفذ الملفات بالترتيب

#### الخطوة 1: جدول الحسابات
```sql
-- انسخ محتوى ملف supabase-accounts-setup.sql
-- والصقه في SQL Editor
-- ثم اضغط RUN
```

#### الخطوة 2: جدول المعاملات
```sql
-- انسخ محتوى ملف supabase-transactions-setup.sql
-- والصقه في SQL Editor
-- ثم اضغط RUN
```

#### الخطوة 3: جدول المشاريع (إذا لم ينفذ بعد)
```sql
-- انسخ محتوى ملف supabase-projects-setup.sql
-- والصقه في SQL Editor
-- ثم اضغط RUN
```

## التحقق من الإعداد

بعد تنفيذ الملفات، تحقق من:

### 1. تحقق من الجداول
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

يجب أن ترى:
- ✅ accounts
- ✅ transactions
- ✅ projects
- ✅ users
- وغيرها...

### 2. تحقق من الحسابات الافتراضية
```sql
SELECT * FROM public.accounts;
```

يجب أن ترى حسابين افتراضيين:
- الصندوق النقدي
- الحساب البنكي الرئيسي

### 3. تحقق من Row Level Security
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('accounts', 'transactions');
```

## الأخطاء الشائعة وحلولها

### خطأ: "relation does not exist"
**الحل:** نفذ ملف SQL الخاص بالجدول المفقود

### خطأ: "permission denied"
**الحل:** تأكد من أنك مسجل دخول كـ Admin في Supabase Dashboard

### خطأ: "duplicate key value"
**الحل:** الجدول موجود بالفعل، يمكنك تخطي هذا الخطأ

## ملاحظات مهمة

1. **النسخ الاحتياطي**: قبل تنفيذ أي SQL، قم بعمل نسخة احتياطية من قاعدة البيانات
2. **الترتيب**: نفذ الملفات بالترتيب المذكور أعلاه
3. **الصلاحيات**: تأكد من أن RLS (Row Level Security) مفعل
4. **الفهارس**: الفهارس موجودة لتحسين الأداء

## الدعم

إذا واجهت أي مشاكل:
1. تحقق من console في المتصفح
2. تحقق من Supabase Logs
3. تأكد من أن جميع الجداول المطلوبة موجودة
