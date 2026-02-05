# نظام الدفعات المؤجلة (Deferred Payments System)

## نظرة عامة
نظام منفصل تماماً عن الحركات المالية العادية (expenses/transactions) لتتبع الديون والحسابات الآجلة للموردين.

## المميزات
- ✅ **نظام منفصل**: لا يُنشئ مصروفات أو حركات مالية عادية
- ✅ **تأثير مباشر**: الدفعات تُخصم مباشرة من رصيد الحساب (الصندوق/البنك)
- ✅ **استرداد تلقائي**: عند حذف دفعة، يُعاد المبلغ للحساب تلقائياً
- ✅ **تتبع المورد**: إمكانية ربط الحساب الآجل بمورد معين
- ✅ **إدارة الصلاحيات**: دعم كامل لنظام الصلاحيات (إضافة/تعديل/حذف)

## البنية

### الجداول
1. **deferred_accounts** - الحسابات الآجلة (الديون)
   - `id`: معرف فريد
   - `description`: وصف الدين
   - `project_id`: المشروع المرتبط
   - `vendor_id`: المورد (اختياري)
   - `total_amount`: المبلغ الإجمالي
   - `amount_paid`: المبلغ المدفوع
   - `due_date`: تاريخ الاستحقاق
   - `status`: الحالة (Pending | Partially Paid | Paid)
   - `notes`: ملاحظات

2. **deferred_installments** - دفعات/أقساط الحسابات الآجلة
   - `id`: معرف فريد
   - `deferred_account_id`: الحساب الآجل المرتبط
   - `payment_date`: تاريخ الدفع
   - `amount`: المبلغ المدفوع
   - `account_id`: الحساب المسحوب منه
   - `notes`: ملاحظات
   - `receipt_number`: رقم الإيصال

### الخدمات (Services)

#### deferredPaymentsService
```typescript
// جلب جميع الحسابات الآجلة
await deferredPaymentsService.getAll({ projectId: 'xxx' });

// جلب حساب آجل واحد
await deferredPaymentsService.getById('dp_xxx');

// إنشاء حساب آجل
await deferredPaymentsService.create({
    description: 'دين مورد البناء',
    projectId: 'project_xxx',
    totalAmount: 50000,
    vendorId: 'vendor_xxx', // اختياري
    dueDate: '2024-06-01', // اختياري
});

// تحديث حساب آجل
await deferredPaymentsService.update('dp_xxx', { description: 'وصف جديد' });

// حذف حساب آجل (يحذف جميع الدفعات ويعيد المبالغ)
await deferredPaymentsService.delete('dp_xxx');
```

#### deferredInstallmentsService
```typescript
// جلب دفعات حساب آجل
await deferredInstallmentsService.getByPaymentId('dp_xxx');

// إضافة دفعة (يخصم من رصيد الحساب تلقائياً)
await deferredInstallmentsService.create({
    deferredPaymentId: 'dp_xxx',
    paymentDate: '2024-01-15',
    amount: 5000,
    accountId: 'account_xxx',
    notes: 'دفعة أولى',
});

// حذف دفعة (يعيد المبلغ للحساب تلقائياً)
await deferredInstallmentsService.delete('dinst_xxx');
```

## كيفية عمل النظام

### عند إضافة دفعة:
1. يتم إنشاء سجل في `deferred_installments`
2. يتم خصم المبلغ من رصيد الحساب (`accounts.balance`) مباشرة
3. يتم تحديث `amount_paid` في `deferred_accounts`
4. يتم تحديث `status` تلقائياً (Partially Paid أو Paid)

### عند حذف دفعة:
1. يتم إعادة المبلغ لرصيد الحساب
2. يتم تحديث `amount_paid` في `deferred_accounts`
3. يتم تحديث `status` تلقائياً
4. يتم حذف السجل من `deferred_installments`

### عند حذف حساب آجل:
1. يتم جلب جميع الدفعات المرتبطة
2. يتم إعادة مبالغ جميع الدفعات للحسابات
3. يتم حذف جميع الدفعات
4. يتم حذف الحساب الآجل

## الصلاحيات
يستخدم النظام نفس آلية الصلاحيات المستخدمة في باقي التطبيق:
- `pageKey`: `'deferred-payments'`
- `buttonKeys`: `'add'`, `'edit'`, `'delete'`

## إعداد قاعدة البيانات
قم بتشغيل ملف الـ SQL التالي في Supabase SQL Editor:
```
supabase-migrations/create-deferred-payments-tables.sql
```

## التكامل مع باقي النظام
- النظام مستقل تماماً ولا يؤثر على:
  - صفحة المصروفات (Expenses)
  - صفحة الحركات المالية (Transactions)
  - التقارير المالية العادية
- لكنه يؤثر على:
  - أرصدة الحسابات (accounts.balance)
