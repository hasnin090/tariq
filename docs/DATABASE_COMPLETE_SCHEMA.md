# 🗄️ هيكل قاعدة البيانات الكامل - نظام إدارة المشاريع العقارية

> **تاريخ التحديث:** 10 ديسمبر 2025  
> **الإصدار:** 2.0  
> **الحالة:** محدّث ومنظّم بالكامل

---

## 📋 جدول المحتويات

1. [الجداول الأساسية](#1-الجداول-الأساسية)
2. [الجداول الثانوية](#2-الجداول-الثانوية)
3. [الجداول المعقدة](#3-الجداول-المعقدة)
4. [جداول التتبع والتدقيق](#4-جداول-التتبع-والتدقيق)
5. [الجداول المفقودة المطلوبة](#5-الجداول-المفقودة-المطلوبة)
6. [Views (طرق العرض)](#6-views-طرق-العرض)
7. [Functions (الدوال)](#7-functions-الدوال)
8. [Triggers (المحفزات)](#8-triggers-المحفزات)
9. [خارطة العلاقات](#9-خارطة-العلاقات)

---

## 1️⃣ الجداول الأساسية

> **الوصف:** جداول بدون علاقات خارجية (Foreign Keys) - يتم إنشاؤها أولاً

### 1.1 جدول `projects` (المشاريع)

**الغرض:** تخزين معلومات المشاريع العقارية

**الأعمدة:**
| العمود | النوع | الوصف | قيود |
|--------|------|-------|-----|
| `id` | TEXT | المعرف الفريد | PRIMARY KEY |
| `name` | TEXT | اسم المشروع | NOT NULL, UNIQUE |
| `description` | TEXT | وصف المشروع | - |
| `location` | TEXT | موقع المشروع | - |
| `start_date` | DATE | تاريخ البدء | - |
| `status` | TEXT | حالة المشروع | CHECK (Active, Completed, On Hold) |
| `created_at` | TIMESTAMP | وقت الإنشاء | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | وقت التحديث | DEFAULT NOW() |

**الفهارس:**
- `idx_projects_name` على `name`
- `idx_projects_status` على `status`

**الاستخدامات:**
- ✅ تصنيف الوحدات حسب المشروع
- ✅ تصنيف العملاء حسب المشروع
- ✅ تصنيف المصروفات حسب المشروع
- ✅ عرض تقارير لكل مشروع منفصل

---

### 1.2 جدول `users` (المستخدمين)

**الغرض:** تخزين معلومات موظفي النظام والصلاحيات

**الأعمدة:**
| العمود | النوع | الوصف | قيود |
|--------|------|-------|-----|
| `id` | TEXT | المعرف الفريد | PRIMARY KEY |
| `name` | TEXT | الاسم الكامل | NOT NULL |
| `username` | TEXT | اسم المستخدم | NOT NULL, UNIQUE |
| `email` | TEXT | البريد الإلكتروني | UNIQUE |
| `password` | TEXT | كلمة المرور (مُشفّرة) | NOT NULL |
| `role` | TEXT | الدور الوظيفي | CHECK (Admin, Sales, Accounting) |
| `can_view` | BOOLEAN | صلاحية العرض | DEFAULT TRUE |
| `can_edit` | BOOLEAN | صلاحية التعديل | DEFAULT TRUE |
| `can_delete` | BOOLEAN | صلاحية الحذف | DEFAULT FALSE |
| `is_active` | BOOLEAN | نشط/غير نشط | DEFAULT TRUE |
| `created_at` | TIMESTAMP | وقت الإنشاء | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | وقت التحديث | DEFAULT NOW() |

**الفهارس:**
- `idx_users_username` على `username`
- `idx_users_role` على `role`

**الاستخدامات:**
- ✅ تسجيل دخول الموظفين
- ✅ التحكم بالصلاحيات (RBAC)
- ✅ تتبع العمليات (من قام بالإضافة/التعديل)
- ✅ تخصيص المشاريع للموظفين

---

### 1.3 جدول `notifications` (الإشعارات)

**الغرض:** إشعارات النظام للمستخدمين

**الأعمدة:**
| العمود | النوع | الوصف | قيود |
|--------|------|-------|-----|
| `id` | TEXT | المعرف الفريد | PRIMARY KEY |
| `type` | TEXT | نوع الإشعار | CHECK (password_reset, general, alert) |
| `user_id` | TEXT | معرف المستخدم | FK → users.id |
| `username` | TEXT | اسم المستخدم | - |
| `message` | TEXT | نص الإشعار | NOT NULL |
| `is_read` | BOOLEAN | تم القراءة؟ | DEFAULT FALSE |
| `created_at` | TIMESTAMP | وقت الإنشاء | DEFAULT NOW() |
| `resolved_at` | TIMESTAMP | وقت الحل | - |
| `resolved_by` | TEXT | من قام بالحل | - |

**الفهارس:**
- `idx_notifications_user` على `user_id`
- `idx_notifications_type` على `type`
- `idx_notifications_read` على `is_read`

**الاستخدامات:**
- ✅ إشعارات تغيير كلمة المرور
- ✅ تنبيهات مهمة
- ✅ رسائل النظام

---

### 1.4 جدول `unit_types` (أنواع الوحدات)

**الغرض:** تصنيف أنواع الوحدات العقارية

**الأعمدة:**
| العمود | النوع | الوصف | قيود |
|--------|------|-------|-----|
| `id` | TEXT | المعرف الفريد | PRIMARY KEY |
| `name` | TEXT | اسم النوع | NOT NULL, UNIQUE |
| `is_system` | BOOLEAN | نوع نظام؟ | DEFAULT FALSE |
| `created_at` | TIMESTAMP | وقت الإنشاء | DEFAULT NOW() |

**القيم الافتراضية:**
- شقة
- فيلا
- محل تجاري
- مكتب
- أرض

**الاستخدامات:**
- ✅ تصنيف الوحدات
- ✅ تقارير حسب نوع الوحدة

---

### 1.5 جدول `unit_statuses` (حالات الوحدات)

**الغرض:** حالات الوحدات العقارية

**الأعمدة:**
| العمود | النوع | الوصف | قيود |
|--------|------|-------|-----|
| `id` | TEXT | المعرف الفريد | PRIMARY KEY |
| `name` | TEXT | اسم الحالة | NOT NULL, UNIQUE |
| `is_system` | BOOLEAN | حالة نظام؟ | DEFAULT FALSE |
| `created_at` | TIMESTAMP | وقت الإنشاء | DEFAULT NOW() |

**القيم الافتراضية:**
- Available (متاح)
- Booked (محجوز)
- Sold (مباع)

**الاستخدامات:**
- ✅ تتبع حالة الوحدات
- ✅ تقارير الوحدات المتاحة/المباعة

---

### 1.6 جدول `accounts` (الحسابات المالية)

**الغرض:** الحسابات المالية للنظام

**الأعمدة:**
| العمود | النوع | الوصف | قيود |
|--------|------|-------|-----|
| `id` | TEXT | المعرف الفريد | PRIMARY KEY |
| `name` | TEXT | اسم الحساب | NOT NULL, UNIQUE |
| `type` | TEXT | نوع الحساب | CHECK (Bank, Cash, Other) |
| `balance` | NUMERIC(15,2) | الرصيد الحالي | DEFAULT 0 |
| `currency` | TEXT | العملة | DEFAULT 'IQD' |
| `is_active` | BOOLEAN | نشط؟ | DEFAULT TRUE |
| `created_at` | TIMESTAMP | وقت الإنشاء | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | وقت التحديث | DEFAULT NOW() |

**الفهارس:**
- `idx_accounts_name` على `name`
- `idx_accounts_type` على `type`

**الاستخدامات:**
- ✅ تسجيل مصادر الدفعات
- ✅ تسجيل مصادر المصروفات
- ✅ تحويلات مالية بين الحسابات
- ✅ تقارير مالية حسب الحساب

---

## 2️⃣ الجداول الثانوية

> **الوصف:** جداول ذات علاقة واحدة فقط مع جداول أخرى

### 2.1 جدول `customers` (العملاء)

**الغرض:** معلومات العملاء والمشترين

**الأعمدة:**
| العمود | النوع | الوصف | قيود |
|--------|------|-------|-----|
| `id` | TEXT | المعرف الفريد | PRIMARY KEY |
| `name` | TEXT | اسم العميل | NOT NULL |
| `phone` | TEXT | رقم الهاتف | NOT NULL |
| `email` | TEXT | البريد الإلكتروني | - |
| `address` | TEXT | العنوان | - |
| `project_id` | TEXT | معرف المشروع | FK → projects.id |
| `created_at` | TIMESTAMP | وقت الإنشاء | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | وقت التحديث | DEFAULT NOW() |

**العلاقات:**
- 🔗 `project_id` → `projects.id` (المشروع المرتبط)

**الفهارس:**
- `idx_customers_name` على `name`
- `idx_customers_phone` على `phone`
- `idx_customers_project` على `project_id`

**الاستخدامات:**
- ✅ تسجيل بيانات العملاء
- ✅ ربط العملاء بالمشاريع
- ✅ ربط العملاء بالحجوزات

---

### 2.2 جدول `units` (الوحدات العقارية)

**الغرض:** الوحدات العقارية (شقق، فلل، محلات)

**الأعمدة:**
| العمود | النوع | الوصف | قيود |
|--------|------|-------|-----|
| `id` | TEXT | المعرف الفريد | PRIMARY KEY |
| `unit_number` | TEXT | رقم الوحدة | NOT NULL |
| `type` | TEXT | نوع الوحدة | NOT NULL |
| `status` | TEXT | حالة الوحدة | CHECK (Available, Booked, Sold) |
| `price` | NUMERIC(15,2) | السعر | NOT NULL |
| `area` | NUMERIC(10,2) | المساحة (متر مربع) | - |
| `floor_number` | INTEGER | رقم الطابق | - |
| `bedrooms` | INTEGER | عدد الغرف | - |
| `bathrooms` | INTEGER | عدد الحمامات | - |
| `description` | TEXT | الوصف | - |
| `project_id` | TEXT | معرف المشروع | FK → projects.id |
| `created_at` | TIMESTAMP | وقت الإنشاء | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | وقت التحديث | DEFAULT NOW() |

**العلاقات:**
- 🔗 `project_id` → `projects.id` (المشروع)
- ❌ **لا توجد علاقة مباشرة مع `customers`** (العلاقة عبر `bookings`)

**الفهارس:**
- `idx_units_number` على `unit_number`
- `idx_units_status` على `status`
- `idx_units_project` على `project_id`
- `idx_units_type` على `type`

**الاستخدامات:**
- ✅ إدارة الوحدات
- ✅ تتبع الحالة (متاح/محجوز/مباع)
- ✅ تقارير الوحدات

**⚠️ ملاحظة مهمة:**
- الوحدات **لا ترتبط مباشرة** بالعملاء
- العلاقة تتم عبر جدول `bookings`

---

### 2.3 جدول `employees` (الموظفين)

**الغرض:** موظفي المشاريع (عمال، مقاولين)

**الأعمدة:**
| العمود | النوع | الوصف | قيود |
|--------|------|-------|-----|
| `id` | TEXT | المعرف الفريد | PRIMARY KEY |
| `name` | TEXT | اسم الموظف | NOT NULL |
| `position` | TEXT | المنصب | - |
| `phone` | TEXT | رقم الهاتف | - |
| `salary` | NUMERIC(15,2) | الراتب | - |
| `hire_date` | DATE | تاريخ التعيين | - |
| `project_id` | TEXT | معرف المشروع | FK → projects.id |
| `is_active` | BOOLEAN | نشط؟ | DEFAULT TRUE |
| `created_at` | TIMESTAMP | وقت الإنشاء | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | وقت التحديث | DEFAULT NOW() |

**العلاقات:**
- 🔗 `project_id` → `projects.id`

**الفهارس:**
- `idx_employees_name` على `name`
- `idx_employees_project` على `project_id`

**الاستخدامات:**
- ✅ إدارة رواتب الموظفين
- ✅ تقارير الرواتب

---

## 3️⃣ الجداول المعقدة

> **الوصف:** جداول ذات علاقات متعددة - العمود الفقري للنظام

### 3.1 جدول `bookings` (الحجوزات)

**الغرض:** ربط العملاء بالوحدات

**الأعمدة:**
| العمود | النوع | الوصف | قيود |
|--------|------|-------|-----|
| `id` | TEXT | المعرف الفريد | PRIMARY KEY |
| `unit_id` | TEXT | معرف الوحدة | FK → units.id, NOT NULL |
| `customer_id` | TEXT | معرف العميل | FK → customers.id, NOT NULL |
| `booking_date` | DATE | تاريخ الحجز | NOT NULL |
| `amount_paid` | NUMERIC(15,2) | المبلغ المدفوع | DEFAULT 0 |
| `status` | TEXT | حالة الحجز | CHECK (Active, Cancelled, Completed) |
| `notes` | TEXT | ملاحظات | - |
| `created_at` | TIMESTAMP | وقت الإنشاء | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | وقت التحديث | DEFAULT NOW() |

**العلاقات:**
- 🔗 `unit_id` → `units.id` (الوحدة المحجوزة)
- 🔗 `customer_id` → `customers.id` (العميل)

**الفهارس:**
- `idx_bookings_unit` على `unit_id`
- `idx_bookings_customer` على `customer_id`
- `idx_bookings_status` على `status`
- `idx_bookings_date` على `booking_date`

**الاستخدامات:**
- ✅ ربط العميل بالوحدة
- ✅ تتبع حالة الحجز
- ✅ أساس جدول `payments`

**⚠️ ملاحظة:**
- `amount_paid` للبيانات القديمة فقط
- الدفعات الآن في جدول `payments` المنفصل

---

### 3.2 جدول `payments` (الدفعات)

**الغرض:** تتبع جميع الدفعات (حجز، أقساط، نهائية)

**الأعمدة:**
| العمود | النوع | الوصف | قيود |
|--------|------|-------|-----|
| `id` | TEXT | المعرف الفريد | PRIMARY KEY |
| `booking_id` | TEXT | معرف الحجز | FK → bookings.id, NOT NULL |
| `amount` | NUMERIC(15,2) | المبلغ | NOT NULL |
| `payment_date` | DATE | تاريخ الدفعة | NOT NULL |
| `payment_type` | TEXT | نوع الدفعة | CHECK (booking, installment, final) |
| `account_id` | TEXT | معرف الحساب | FK → accounts.id |
| `notes` | TEXT | ملاحظات | - |
| `created_by` | TEXT | من أضاف الدفعة | - |
| `created_at` | TIMESTAMP | وقت الإنشاء | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | وقت التحديث | DEFAULT NOW() |

**العلاقات:**
- 🔗 `booking_id` → `bookings.id` (الحجز)
- 🔗 `account_id` → `accounts.id` (الحساب المالي)

**الفهارس:**
- `idx_payments_booking` على `booking_id`
- `idx_payments_date` على `payment_date`
- `idx_payments_account` على `account_id`
- `idx_payments_type` على `payment_type`

**أنواع الدفعات:**
- `booking`: دفعة الحجز الأولية
- `installment`: قسط إضافي
- `final`: دفعة نهائية

**الاستخدامات:**
- ✅ تتبع جميع الدفعات
- ✅ حساب الإجمالي المدفوع
- ✅ حساب المتبقي
- ✅ تقارير الدفعات

**🔒 الحماية التلقائية:**
- Trigger يمنع تجاوز سعر الوحدة
- Trigger يحدّث حالة الوحدة عند اكتمال الدفع

---

### 3.3 جدول `documents` (المستندات)

**الغرض:** تخزين مستندات العملاء والحجوزات

**الأعمدة:**
| العمود | النوع | الوصف | قيود |
|--------|------|-------|-----|
| `id` | TEXT | المعرف الفريد | PRIMARY KEY |
| `name` | TEXT | اسم الملف | NOT NULL |
| `type` | TEXT | نوع الملف | - |
| `url` | TEXT | رابط الملف | NOT NULL |
| `size` | BIGINT | حجم الملف (بايت) | - |
| `customer_id` | TEXT | معرف العميل | FK → customers.id |
| `booking_id` | TEXT | معرف الحجز | FK → bookings.id |
| `uploaded_by` | TEXT | من رفع الملف | - |
| `created_at` | TIMESTAMP | وقت الرفع | DEFAULT NOW() |

**العلاقات:**
- 🔗 `customer_id` → `customers.id` (اختياري)
- 🔗 `booking_id` → `bookings.id` (اختياري)

**الفهارس:**
- `idx_documents_customer` على `customer_id`
- `idx_documents_booking` على `booking_id`

**الاستخدامات:**
- ✅ رفع مستندات العملاء
- ✅ رفع عقود الحجز
- ✅ أرشفة الوثائق

---

### 3.4 جدول `expenses` (المصروفات)

**الغرض:** مصروفات المشاريع

**الأعمدة:**
| العمود | النوع | الوصف | قيود |
|--------|------|-------|-----|
| `id` | TEXT | المعرف الفريد | PRIMARY KEY |
| `description` | TEXT | الوصف | NOT NULL |
| `amount` | NUMERIC(15,2) | المبلغ | NOT NULL |
| `expense_date` | DATE | تاريخ المصروف | NOT NULL |
| `category` | TEXT | الفئة | - |
| `project_id` | TEXT | معرف المشروع | FK → projects.id |
| `account_id` | TEXT | معرف الحساب | FK → accounts.id |
| `created_by` | TEXT | من أضاف المصروف | - |
| `created_at` | TIMESTAMP | وقت الإنشاء | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | وقت التحديث | DEFAULT NOW() |

**العلاقات:**
- 🔗 `project_id` → `projects.id`
- 🔗 `account_id` → `accounts.id`

**الفهارس:**
- `idx_expenses_project` على `project_id`
- `idx_expenses_account` على `account_id`
- `idx_expenses_date` على `expense_date`
- `idx_expenses_category` على `category`

**الاستخدامات:**
- ✅ تسجيل المصروفات
- ✅ تقارير المصروفات حسب المشروع
- ✅ تقارير المصروفات حسب الفئة

---

### 3.5 جدول `transactions` (المعاملات المالية)

**الغرض:** تحويلات مالية بين الحسابات

**الأعمدة:**
| العمود | النوع | الوصف | قيود |
|--------|------|-------|-----|
| `id` | TEXT | المعرف الفريد | PRIMARY KEY |
| `from_account_id` | TEXT | من حساب | FK → accounts.id |
| `to_account_id` | TEXT | إلى حساب | FK → accounts.id |
| `amount` | NUMERIC(15,2) | المبلغ | NOT NULL |
| `transaction_date` | DATE | تاريخ المعاملة | NOT NULL |
| `type` | TEXT | نوع المعاملة | CHECK (Transfer, Deposit, Withdrawal) |
| `description` | TEXT | الوصف | - |
| `created_by` | TEXT | من أضاف المعاملة | - |
| `created_at` | TIMESTAMP | وقت الإنشاء | DEFAULT NOW() |

**العلاقات:**
- 🔗 `from_account_id` → `accounts.id`
- 🔗 `to_account_id` → `accounts.id`

**الفهارس:**
- `idx_transactions_from` على `from_account_id`
- `idx_transactions_to` على `to_account_id`
- `idx_transactions_date` على `transaction_date`

**الاستخدامات:**
- ✅ تحويلات بين الحسابات
- ✅ إيداعات
- ✅ سحوبات
- ✅ تقارير الحركة المالية

---

## 4️⃣ جداول التتبع والتدقيق

### 4.1 جدول `activity_logs` (سجل الأنشطة)

**الغرض:** تتبع جميع العمليات في النظام

**الأعمدة:**
| العمود | النوع | الوصف | قيود |
|--------|------|-------|-----|
| `id` | TEXT | المعرف الفريد | PRIMARY KEY |
| `user_id` | TEXT | معرف المستخدم | FK → users.id |
| `action` | TEXT | العملية | NOT NULL |
| `description` | TEXT | الوصف | - |
| `table_name` | TEXT | اسم الجدول | - |
| `record_id` | TEXT | معرف السجل | - |
| `old_data` | JSONB | البيانات القديمة | - |
| `new_data` | JSONB | البيانات الجديدة | - |
| `ip_address` | TEXT | عنوان IP | - |
| `created_at` | TIMESTAMP | وقت العملية | DEFAULT NOW() |

**العلاقات:**
- 🔗 `user_id` → `users.id`

**الفهارس:**
- `idx_activity_logs_user` على `user_id`
- `idx_activity_logs_action` على `action`
- `idx_activity_logs_table` على `table_name`
- `idx_activity_logs_date` على `created_at`

**الاستخدامات:**
- ✅ تتبع من قام بماذا ومتى
- ✅ تدقيق الأمان
- ✅ استرجاع البيانات المحذوفة

---

## 5️⃣ الجداول المفقودة المطلوبة

> **الوصف:** جداول يجب إضافتها لاكتمال النظام

### 5.1 جدول `deferred_payments` (الدفعات المؤجلة) ⚠️ مفقود

**الغرض:** تتبع الدفعات المستحقة والمؤجلة

**الأعمدة المقترحة:**
```sql
CREATE TABLE public.deferred_payments (
    id TEXT PRIMARY KEY,
    booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,
    amount NUMERIC(15,2) NOT NULL,
    due_date DATE NOT NULL,
    status TEXT CHECK (status IN ('Pending', 'Paid', 'Overdue', 'Cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    paid_at TIMESTAMP
);
```

**الاستخدامات:**
- ✅ تتبع الأقساط المستحقة
- ✅ تنبيهات الدفعات القريبة
- ✅ تقارير المتأخرات

**📊 الأولوية:** عالية جداً

---

### 5.2 جدول `project_user_assignments` (تخصيص المشاريع) ⚠️ مفقود

**الغرض:** ربط الموظفين بالمشاريع

**الأعمدة المقترحة:**
```sql
CREATE TABLE public.project_user_assignments (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('Manager', 'Sales', 'Accountant')),
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, project_id)
);
```

**الاستخدامات:**
- ✅ تخصيص موظفين لمشاريع معينة
- ✅ تحكم في الوصول حسب المشروع
- ✅ تقارير الأداء

**📊 الأولوية:** متوسطة

---

### 5.3 جدول `budgets` (الميزانيات) ⚠️ مفقود

**الغرض:** ميزانيات المشاريع

**الأعمدة المقترحة:**
```sql
CREATE TABLE public.budgets (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    allocated_amount NUMERIC(15,2) NOT NULL,
    spent_amount NUMERIC(15,2) DEFAULT 0,
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**الاستخدامات:**
- ✅ تحديد ميزانية كل مشروع
- ✅ تتبع الإنفاق
- ✅ تحذيرات عند تجاوز الميزانية

**📊 الأولوية:** متوسطة

---

### 5.4 جدول `archived_items` (الأرشيف) ⚠️ مفقود

**الغرض:** أرشفة السجلات المحذوفة

**الأعمدة المقترحة:**
```sql
CREATE TABLE public.archived_items (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    record_data JSONB NOT NULL,
    archived_by TEXT,
    archived_at TIMESTAMP DEFAULT NOW(),
    reason TEXT
);
```

**الاستخدامات:**
- ✅ حفظ السجلات المحذوفة
- ✅ إمكانية الاسترجاع
- ✅ التدقيق

**📊 الأولوية:** منخفضة

---

### 5.5 جدول `payment_plans` (خطط الدفع) ⚠️ مفقود

**الغرض:** خطط دفع مخصصة للعملاء

**الأعمدة المقترحة:**
```sql
CREATE TABLE public.payment_plans (
    id TEXT PRIMARY KEY,
    booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,
    total_amount NUMERIC(15,2) NOT NULL,
    down_payment NUMERIC(15,2) NOT NULL,
    installment_count INTEGER NOT NULL,
    installment_amount NUMERIC(15,2) NOT NULL,
    frequency TEXT CHECK (frequency IN ('Monthly', 'Quarterly', 'Yearly')),
    start_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**الاستخدامات:**
- ✅ إنشاء خطط دفع مرنة
- ✅ حساب الأقساط تلقائياً
- ✅ تتبع الالتزام بالخطة

**📊 الأولوية:** عالية

---

### 5.6 جدول `reports` (التقارير المحفوظة) ⚠️ مفقود

**الغرض:** حفظ التقارير المخصصة

**الأعمدة المقترحة:**
```sql
CREATE TABLE public.reports (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    filters JSONB,
    created_by TEXT REFERENCES users(id),
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**الاستخدامات:**
- ✅ حفظ تقارير مخصصة
- ✅ إعادة استخدام التقارير
- ✅ مشاركة التقارير

**📊 الأولوية:** منخفضة

---

## 6️⃣ Views (طرق العرض)

### 6.1 `payments_with_details`

**الغرض:** عرض شامل للدفعات مع جميع التفاصيل

**الأعمدة:**
- معلومات الدفعة (id, amount, date, type)
- معلومات الحجز (booking_id)
- معلومات العميل (customer_id, customer_name)
- معلومات الوحدة (unit_id, unit_name, unit_price)
- معلومات الحساب (account_id, account_name)
- الحسابات التراكمية (total_paid_so_far, remaining_amount)

**الاستخدام:**
```sql
SELECT * FROM payments_with_details WHERE booking_id = 'booking_123';
```

---

### 6.2 `units_summary` ⚠️ مقترح

**الغرض:** ملخص الوحدات مع الحالة والعميل

```sql
CREATE OR REPLACE VIEW units_summary AS
SELECT 
    u.*,
    b.customer_id,
    c.name as customer_name,
    b.status as booking_status
FROM units u
LEFT JOIN bookings b ON u.id = b.unit_id AND b.status = 'Active'
LEFT JOIN customers c ON b.customer_id = c.id;
```

---

### 6.3 `project_financial_summary` ⚠️ مقترح

**الغرض:** ملخص مالي لكل مشروع

```sql
CREATE OR REPLACE VIEW project_financial_summary AS
SELECT 
    p.id,
    p.name,
    COUNT(DISTINCT u.id) as total_units,
    COUNT(DISTINCT CASE WHEN u.status = 'Sold' THEN u.id END) as sold_units,
    SUM(u.price) as total_value,
    COALESCE(SUM(pay.amount), 0) as total_received,
    COALESCE(SUM(e.amount), 0) as total_expenses
FROM projects p
LEFT JOIN units u ON u.project_id = p.id
LEFT JOIN bookings b ON b.unit_id = u.id
LEFT JOIN payments pay ON pay.booking_id = b.id
LEFT JOIN expenses e ON e.project_id = p.id
GROUP BY p.id, p.name;
```

---

## 7️⃣ Functions (الدوال)

### 7.1 `get_booking_total_paid(booking_id)`

**الغرض:** حساب إجمالي المدفوع لحجز

**الاستخدام:**
```sql
SELECT get_booking_total_paid('booking_123');
```

---

### 7.2 `get_booking_remaining(booking_id)`

**الغرض:** حساب المتبقي لحجز

**الاستخدام:**
```sql
SELECT get_booking_remaining('booking_123');
```

---

### 7.3 `get_project_revenue(project_id)` ⚠️ مقترح

**الغرض:** حساب إيرادات مشروع

```sql
CREATE OR REPLACE FUNCTION get_project_revenue(p_project_id TEXT)
RETURNS NUMERIC AS $$
DECLARE
    v_revenue NUMERIC;
BEGIN
    SELECT COALESCE(SUM(pay.amount), 0) INTO v_revenue
    FROM payments pay
    JOIN bookings b ON pay.booking_id = b.id
    JOIN units u ON b.unit_id = u.id
    WHERE u.project_id = p_project_id;
    
    RETURN v_revenue;
END;
$$ LANGUAGE plpgsql;
```

---

## 8️⃣ Triggers (المحفزات)

### 8.1 `validate_payment_amount` ✅ موجود

**الغرض:** منع تجاوز سعر الوحدة

**الجدول:** `payments`  
**التوقيت:** BEFORE INSERT OR UPDATE

---

### 8.2 `update_unit_on_full_payment` ✅ موجود

**الغرض:** تحديث حالة الوحدة إلى "مباع" عند اكتمال الدفع

**الجدول:** `payments`  
**التوقيت:** AFTER INSERT OR UPDATE

---

### 8.3 `update_unit_on_booking_cancel` ✅ موجود

**الغرض:** تحديث حالة الوحدة إلى "متاح" عند إلغاء الحجز

**الجدول:** `bookings`  
**التوقيت:** AFTER UPDATE

---

### 8.4 `update_updated_at_column` ✅ موجود

**الغرض:** تحديث `updated_at` تلقائياً

**الجداول:** جميع الجداول التي تحتوي على `updated_at`  
**التوقيت:** BEFORE UPDATE

---

### 8.5 `log_activity` ⚠️ مقترح

**الغرض:** تسجيل العمليات في `activity_logs` تلقائياً

```sql
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activity_logs (
        id,
        action,
        table_name,
        record_id,
        old_data,
        new_data,
        created_at
    ) VALUES (
        'log_' || gen_random_uuid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        row_to_json(OLD),
        row_to_json(NEW),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 9️⃣ خارطة العلاقات

```
projects
├─→ units (project_id)
├─→ customers (project_id)
├─→ employees (project_id)
└─→ expenses (project_id)

users
├─→ notifications (user_id)
└─→ activity_logs (user_id)

accounts
├─→ payments (account_id)
├─→ expenses (account_id)
├─→ transactions (from_account_id, to_account_id)

customers
└─→ bookings (customer_id)
    └─→ documents (customer_id)

units
└─→ bookings (unit_id)

bookings
├─→ payments (booking_id)
└─→ documents (booking_id)
```

---

## 📊 ترتيب الأولويات

### 🔴 أولوية عالية جداً (تنفيذ فوري)
1. ✅ إصلاح جدول `payments` (مكتمل)
2. ✅ إضافة Triggers للحماية (مكتمل)
3. ⚠️ إنشاء جدول `deferred_payments`
4. ⚠️ إنشاء جدول `payment_plans`

### 🟡 أولوية متوسطة
5. ⚠️ إنشاء جدول `project_user_assignments`
6. ⚠️ إنشاء جدول `budgets`
7. ⚠️ إضافة Views إضافية

### 🟢 أولوية منخفضة (تحسينات)
8. ⚠️ إنشاء جدول `archived_items`
9. ⚠️ إنشاء جدول `reports`
10. ⚠️ إضافة Trigger للتسجيل التلقائي

---

## ✅ الخلاصة

### ✔️ الجداول الموجودة والمكتملة (15 جدول)
1. projects ✅
2. users ✅
3. notifications ✅
4. unit_types ✅
5. unit_statuses ✅
6. accounts ✅
7. customers ✅
8. units ✅
9. employees ✅
10. bookings ✅
11. payments ✅
12. documents ✅
13. expenses ✅
14. transactions ✅
15. activity_logs ✅

### ⚠️ الجداول المفقودة المطلوبة (6 جداول)
1. deferred_payments ⚠️
2. payment_plans ⚠️
3. project_user_assignments ⚠️
4. budgets ⚠️
5. archived_items ⚠️
6. reports ⚠️

### 🛡️ الحماية والأمان
- ✅ Triggers لمنع تجاوز سعر الوحدة
- ✅ Triggers لتحديث حالة الوحدات تلقائياً
- ✅ Indexes لتحسين الأداء
- ✅ Foreign Keys لضمان سلامة البيانات

---

**📝 ملاحظة نهائية:**  
هذا الملف يُعتبر المرجع الكامل لقاعدة البيانات. يُنصح بالاحتفاظ به محدّثاً عند أي تغيير في البنية.
