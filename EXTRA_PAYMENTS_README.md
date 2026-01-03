# 💰 نظام الدفع الإضافي والمرفقات

## 🚀 البدء السريع

### 1. تطبيق Migration
افتح Supabase SQL Editor ونفذ:
```sql
-- نفذ محتوى هذا الملف:
supabase-migrations/add-payment-attachments-and-extra-payments.sql
```

### 2. التحقق من التثبيت
```sql
-- اختبار النظام:
supabase-migrations/TEST-extra-payments-system.sql
```

### 3. الاستخدام
- صفحة **الدفعات المجدولة**
- زر **"تسديد"** → رفع مرفق (اختياري)
- زر **"دفع إضافي"** → إعادة جدولة

---

## ✨ الميزات

| الميزة | الوصف |
|--------|-------|
| 📎 **المرفقات** | رفع إيصالات/فواتير مع كل دفعة |
| 💵 **دفع إضافي** | دفع مبلغ خارج الجدول |
| 🔄 **إعادة جدولة تلقائية** | توزيع تلقائي على الأقساط |
| ⚙️ **إعادة جدولة يدوية** | جدول جديد حسب الرغبة |

---

## 📚 التوثيق

- **دليل شامل:** [docs/EXTRA_PAYMENTS_AND_ATTACHMENTS_GUIDE.md](docs/EXTRA_PAYMENTS_AND_ATTACHMENTS_GUIDE.md)
- **بدء سريع:** [docs/QUICK_START_EXTRA_PAYMENTS.md](docs/QUICK_START_EXTRA_PAYMENTS.md)
- **ملخص التنفيذ:** [docs/IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md)

---

## 📁 الملفات الرئيسية

```
📦 نظام الدفع الإضافي
├── 📁 supabase-migrations/
│   ├── add-payment-attachments-and-extra-payments.sql
│   └── TEST-extra-payments-system.sql
├── 📁 src/services/
│   └── storageService.ts
├── 📁 components/shared/
│   ├── PaymentAttachmentModal.tsx
│   └── ExtraPaymentModal.tsx
└── 📁 docs/
    ├── EXTRA_PAYMENTS_AND_ATTACHMENTS_GUIDE.md
    ├── QUICK_START_EXTRA_PAYMENTS.md
    └── IMPLEMENTATION_SUMMARY.md
```

---

✅ **جاهز للاستخدام!**
