# 🔐 دليل تأمين نظام كلمات المرور

## 📋 نظرة عامة

تم تطبيق نظام تشفير آمن لكلمات المرور باستخدام **bcrypt** مع **salt** لحماية بيانات المستخدمين.

---

## ⚠️ المشاكل الأمنية التي تم حلها

### قبل التحديث:
- ❌ كلمات المرور مخزنة كنص صريح في قاعدة البيانات
- ❌ مقارنة مباشرة بدون تشفير أو hashing
- ❌ كلمة مرور افتراضية ضعيفة: `123456`
- ❌ عدم التوافق مع معايير GDPR و PCI DSS
- ❌ تعليق واضح في الكود: "THIS IS NOT SECURE FOR PRODUCTION"

### بعد التحديث:
- ✅ كلمات المرور مشفرة باستخدام bcrypt (10 salt rounds)
- ✅ مقارنة آمنة باستخدام `bcrypt.compare()`
- ✅ تشفير تلقائي عند إنشاء أو تحديث المستخدمين
- ✅ التحقق من قوة كلمة المرور (اختياري)
- ✅ التوافق مع معايير الأمان الدولية

---

## 🛠️ التغييرات المطبقة

### 1. الملفات الجديدة

#### `utils/passwordUtils.ts`
دوال مساعدة لتشفير والتحقق من كلمات المرور:
- `hashPassword()` - تشفير كلمة المرور
- `verifyPassword()` - التحقق من كلمة المرور
- `validatePasswordStrength()` - التحقق من قوة كلمة المرور

#### `scripts/migrate-passwords.ts`
Script لتشفير كلمات المرور الموجودة في قاعدة البيانات

#### `supabase-migrations/hash-existing-passwords.sql`
SQL migration لإعداد قاعدة البيانات قبل تشفير كلمات المرور

---

### 2. الملفات المعدلة

#### `src/services/supabaseService.ts`
- ✅ إضافة `import { hashPassword }` في الـ imports
- ✅ تشفير كلمة المرور في `usersService.create()` قبل الحفظ
- ✅ تشفير كلمة المرور في `usersService.update()` عند التحديث

#### `contexts/AuthContext.tsx`
- ✅ إضافة `import { verifyPassword }` في الـ imports
- ✅ استبدال المقارنة المباشرة `user.password !== password` بـ `verifyPassword()`
- ✅ إزالة التعليق "THIS IS NOT SECURE FOR PRODUCTION"

#### `package.json`
- ✅ إضافة `bcryptjs` (^2.4.3)
- ✅ إضافة `@types/bcryptjs` (dev dependency)

---

## 🚀 خطوات التطبيق

### الخطوة 1: تثبيت المكتبات (مكتمل ✅)
```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

### الخطوة 2: تشغيل SQL Migration
افتح **Supabase SQL Editor** وشغل الملف:
```
supabase-migrations/hash-existing-passwords.sql
```

هذا سينشئ:
- حقل `password_migrated` في جدول `users`
- جدول `password_migration_log` لتتبع العملية
- دالة `mark_password_migrated()` لتحديث الحالة

### الخطوة 3: تشغيل Script تشفير كلمات المرور
قبل التشغيل، تأكد من تعيين متغير البيئة:

**Windows PowerShell:**
```powershell
$env:SUPABASE_SERVICE_KEY = "your-service-role-key-here"
npx tsx scripts/migrate-passwords.ts
```

**Linux/Mac:**
```bash
export SUPABASE_SERVICE_KEY="your-service-role-key-here"
npx tsx scripts/migrate-passwords.ts
```

> **ملاحظة:** Service Role Key موجود في Supabase Dashboard → Settings → API

### الخطوة 4: اختبار النظام
1. حاول تسجيل الدخول بحساب موجود (username: admin, password: admin123)
2. أنشئ مستخدم جديد وتأكد من حفظ كلمة المرور مشفرة
3. حاول تسجيل الدخول بكلمة مرور خاطئة للتأكد من رفض الدخول

### الخطوة 5: التنظيف (اختياري)
بعد التأكد من نجاح العملية، يمكنك:

```sql
-- حذف جدول التتبع المؤقت
DROP TABLE IF EXISTS public.password_migration_log;

-- حذف حقل التتبع (اختياري)
ALTER TABLE public.users DROP COLUMN IF EXISTS password_migrated;
```

---

## 🔍 التحقق من نجاح التطبيق

### فحص كلمات المرور في قاعدة البيانات
```sql
SELECT username, 
       LEFT(password, 20) || '...' AS password_hash,
       CASE 
         WHEN password LIKE '$2a$%' OR password LIKE '$2b$%' 
         THEN '✅ مشفرة'
         ELSE '❌ نص صريح'
       END AS status
FROM public.users;
```

**النتيجة المتوقعة:**
```
username | password_hash              | status
---------|----------------------------|----------
admin    | $2b$10$8xKlM3p...        | ✅ مشفرة
sales    | $2b$10$xp9Lm4k...        | ✅ مشفرة
```

---

## 📊 معلومات تقنية

### خوارزمية bcrypt
- **Algorithm:** bcrypt (Blowfish-based)
- **Salt Rounds:** 10 (توازن بين الأمان والأداء)
- **Hash Length:** 60 حرف
- **Format:** `$2b$10$[22 chars salt][31 chars hash]`

### أمثلة:
```javascript
// كلمة مرور: "123456"
// Hash: "$2b$10$abcdefghijklmnopqrstuv8xKlM3pQwErTyUiOpLkJhGfDsAzXcV"

// كلمة مرور: "admin123"
// Hash: "$2b$10$xyzABCDEFGHIJKLMNOPQRSTp9Lm4kNhGfDsAzXcVbNmKjHgTrEwQ"
```

---

## 🛡️ أفضل الممارسات

### للمطورين:
1. ✅ لا تطبع كلمات المرور في console.log
2. ✅ لا ترسل كلمات المرور المشفرة للـ frontend
3. ✅ احذف حقل `password` من responses (استخدم select محدد)
4. ✅ استخدم HTTPS دائماً
5. ✅ طبق rate limiting على endpoint تسجيل الدخول

### للمستخدمين:
1. استخدم كلمة مرور قوية (8+ أحرف، أرقام، حروف)
2. لا تشارك كلمة المرور مع أحد
3. غير كلمة المرور الافتراضية فوراً
4. استخدم كلمة مرور مختلفة لكل نظام

---

## ⚙️ إعدادات إضافية

### تفعيل التحقق من قوة كلمة المرور
يمكنك استخدام دالة `validatePasswordStrength()` في صفحة إنشاء المستخدمين:

```typescript
import { validatePasswordStrength } from '../utils/passwordUtils';

const validation = validatePasswordStrength(password);
if (!validation.isValid) {
  console.log('أخطاء كلمة المرور:', validation.errors);
  console.log('قوة كلمة المرور:', validation.strength); // weak/medium/strong
}
```

### تغيير عدد Salt Rounds
في ملف `utils/passwordUtils.ts`:
```typescript
const SALT_ROUNDS = 12; // أكثر أماناً لكن أبطأ (الافتراضي: 10)
```

---

## 🆘 استكشاف الأخطاء

### خطأ: "Cannot find module 'bcryptjs'"
```bash
npm install bcryptjs @types/bcryptjs
```

### خطأ: "SUPABASE_SERVICE_KEY is not defined"
تأكد من تعيين المتغير قبل تشغيل الـ script:
```powershell
$env:SUPABASE_SERVICE_KEY = "your-key"
```

### خطأ: "Invalid password" بعد التشفير
تأكد من:
1. تم تشغيل migration SQL
2. تم تشغيل script تشفير كلمات المرور
3. تم تحديث التطبيق بالكود الجديد

---

## 📚 المراجع

- [bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [GDPR Compliance Guidelines](https://gdpr.eu/)

---

## ✅ خلاصة

تم تأمين نظام كلمات المرور بالكامل باستخدام معايير الصناعة. يرجى اتباع الخطوات أعلاه لتطبيق التشفير على البيانات الموجودة.

**الحالة الحالية:**
- ✅ الكود محدّث ويدعم bcrypt
- ⏳ يحتاج تشغيل migration SQL
- ⏳ يحتاج تشغيل script تشفير كلمات المرور الموجودة

بعد تطبيق الخطوات، سيكون النظام آمن تماماً ومتوافق مع معايير الأمان الدولية.
