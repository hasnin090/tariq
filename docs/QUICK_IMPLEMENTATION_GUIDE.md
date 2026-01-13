# 🚀 تطبيق سريع: نظام الصلاحيات المحسن

## ✅ ما تم إنجازه

### 1. نظام الصلاحيات الأساسي
- ✅ 3 قوالب جاهزة لكل دور (كامل، عرض فقط، محدود)
- ✅ وضع مخصص للتحكم اليدوي
- ✅ واجهة بسيطة في `SimplePermissionsManager.tsx`

### 2. صلاحيات الأزرار
- ✅ إضافة (Add)
- ✅ تعديل (Edit)
- ✅ حذف (Delete)
- ✅ تصدير (Export)
- ✅ طباعة (Print)

### 3. فلترة البيانات
- ✅ دالة `filterDataByUserProject()` - فلترة البيانات حسب المشروع
- ✅ دالة `canAccessProject()` - فحص صلاحية الوصول للمشروع

---

## 📋 خطوات التطبيق في الصفحات

### الخطوة 1: استيراد الدوال المطلوبة

```typescript
import { 
  filterDataByUserProject, 
  canShowButton,
  canAccessProject 
} from '@/utils/permissions';
import { useAuth } from '@/contexts/AuthContext';
```

### الخطوة 2: فلترة البيانات في useEffect

```typescript
const { currentUser } = useAuth();
const [data, setData] = useState([]);

useEffect(() => {
  const loadData = async () => {
    const allData = await yourService.getAll();
    
    // Admin يرى كل شيء، غير Admin يرى مشروعه فقط
    if (currentUser.role === 'Admin') {
      setData(allData);
    } else {
      const filtered = await filterDataByUserProject(allData, currentUser.id);
      setData(filtered);
    }
  };
  
  loadData();
}, [currentUser]);
```

### الخطوة 3: التحكم في الأزرار

```typescript
// تعريف صلاحيات الأزرار
const canAdd = canShowButton(
  currentUser.role, 
  'page-key',  // مثل 'customers', 'expenses', 'transactions'
  'add', 
  currentUser.customButtonAccess
);

const canEdit = canShowButton(currentUser.role, 'page-key', 'edit', currentUser.customButtonAccess);
const canDelete = canShowButton(currentUser.role, 'page-key', 'delete', currentUser.customButtonAccess);
const canExport = canShowButton(currentUser.role, 'page-key', 'export', currentUser.customButtonAccess);
const canPrint = canShowButton(currentUser.role, 'page-key', 'print', currentUser.customButtonAccess);

// استخدامها في JSX
{canAdd && <button onClick={handleAdd}>إضافة</button>}
{canEdit && <button onClick={handleEdit}>تعديل</button>}
{canDelete && <button onClick={handleDelete}>حذف</button>}
```

### الخطوة 4: التحقق من العمليات

```typescript
const handleCreate = async (newData) => {
  // للمستخدمين غير Admin، تحقق من صلاحية المشروع
  if (currentUser.role !== 'Admin') {
    const hasAccess = await canAccessProject(currentUser.id, newData.project_id);
    if (!hasAccess) {
      alert('لا يمكنك إضافة بيانات لهذا المشروع');
      return;
    }
  }
  
  await yourService.create(newData);
};
```

---

## 🎯 الصفحات المطلوب تطبيق الفلترة عليها

### صفحات المحاسبة
- ✅ دفتر الأستاذ (GeneralLedger)
- ✅ المصروفات (Expenses)
- ✅ الفواتير (Invoices)
- ✅ سند قبض (ReceiptVoucher)
- ✅ سند صرف (PaymentVoucher)
- ✅ القيود اليومية (JournalEntries)

### صفحات المبيعات
- ✅ العملاء (Customers)
- ✅ الحجوزات (Bookings)
- ✅ العقود (Contracts)
- ✅ الدفعات (Payments)

### صفحات التقارير
- ✅ تقارير المبيعات
- ✅ تقارير المحاسبة
- ✅ تقارير المشاريع

---

## 🔧 مثال كامل: صفحة المصروفات

```typescript
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { filterDataByUserProject, canShowButton, canAccessProject } from '@/utils/permissions';
import { expenseService } from '@/services/supabaseService';

export const Expenses = () => {
  const { currentUser } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // صلاحيات الأزرار
  const canAdd = canShowButton(currentUser.role, 'expenses', 'add', currentUser.customButtonAccess);
  const canEdit = canShowButton(currentUser.role, 'expenses', 'edit', currentUser.customButtonAccess);
  const canDelete = canShowButton(currentUser.role, 'expenses', 'delete', currentUser.customButtonAccess);
  const canExport = canShowButton(currentUser.role, 'expenses', 'export', currentUser.customButtonAccess);
  
  // تحميل البيانات
  useEffect(() => {
    loadExpenses();
  }, [currentUser]);
  
  const loadExpenses = async () => {
    try {
      setLoading(true);
      const allExpenses = await expenseService.getAll();
      
      if (currentUser.role === 'Admin') {
        setExpenses(allExpenses);
      } else {
        const filtered = await filterDataByUserProject(allExpenses, currentUser.id);
        setExpenses(filtered);
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // إضافة مصروف
  const handleAddExpense = async (expenseData) => {
    if (currentUser.role !== 'Admin') {
      const hasAccess = await canAccessProject(currentUser.id, expenseData.project_id);
      if (!hasAccess) {
        alert('لا يمكنك إضافة مصروفات لهذا المشروع');
        return;
      }
    }
    
    await expenseService.create(expenseData);
    loadExpenses();
  };
  
  // تعديل مصروف
  const handleEditExpense = async (id, updates) => {
    if (currentUser.role !== 'Admin' && updates.project_id) {
      const hasAccess = await canAccessProject(currentUser.id, updates.project_id);
      if (!hasAccess) {
        alert('لا يمكنك نقل المصروف لهذا المشروع');
        return;
      }
    }
    
    await expenseService.update(id, updates);
    loadExpenses();
  };
  
  // حذف مصروف
  const handleDeleteExpense = async (id) => {
    if (confirm('هل أنت متأكد من الحذف؟')) {
      await expenseService.delete(id);
      loadExpenses();
    }
  };
  
  // تصدير البيانات
  const handleExport = () => {
    // منطق التصدير
  };
  
  return (
    <div className="p-6">
      {/* الرأس */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">المصروفات</h1>
        <div className="flex gap-2">
          {canExport && (
            <button 
              onClick={handleExport}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              تصدير
            </button>
          )}
          {canAdd && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-accent-600 text-white px-4 py-2 rounded"
            >
              إضافة مصروف
            </button>
          )}
        </div>
      </div>
      
      {/* الجدول */}
      {loading ? (
        <p>جاري التحميل...</p>
      ) : expenses.length === 0 ? (
        <p>لا توجد مصروفات</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr>
              <th>البيان</th>
              <th>المبلغ</th>
              <th>التاريخ</th>
              <th>المشروع</th>
              {(canEdit || canDelete) && <th>الإجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {expenses.map(expense => (
              <tr key={expense.id}>
                <td>{expense.description}</td>
                <td>{expense.amount}</td>
                <td>{expense.date}</td>
                <td>{expense.project_name}</td>
                {(canEdit || canDelete) && (
                  <td>
                    {canEdit && (
                      <button 
                        onClick={() => handleEditExpense(expense.id, {...})}
                        className="text-blue-600 mr-2"
                      >
                        تعديل
                      </button>
                    )}
                    {canDelete && (
                      <button 
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="text-red-600"
                      >
                        حذف
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
```

---

## 🎨 تخصيص مفاتيح الصفحات (Page Keys)

استخدم المفاتيح التالية في `canShowButton`:

| الصفحة | المفتاح |
|--------|---------|
| العملاء | `'customers'` |
| الحجوزات | `'bookings'` |
| المصروفات | `'expenses'` |
| الفواتير | `'invoices'` |
| دفتر الأستاذ | `'general-ledger'` |
| القيود اليومية | `'journal-entries'` |
| سند قبض | `'receipt-voucher'` |
| سند صرف | `'payment-voucher'` |

---

## 🚨 ملاحظات هامة

### 1. Admin دائماً لديه كل الصلاحيات
```typescript
if (currentUser.role === 'Admin') {
  // لا حاجة للفلترة أو التحقق
  return true;
}
```

### 2. تأكد من وجود project_id في البيانات
```typescript
// البيانات يجب أن تحتوي على project_id
const allExpenses = await expenseService.getAll();
// كل عنصر يجب أن يحتوي: { id, description, amount, project_id, ... }
```

### 3. استخدم customButtonAccess من المستخدم الحالي
```typescript
const { currentUser } = useAuth();
// تأكد من أن currentUser يحتوي على customButtonAccess
canShowButton(currentUser.role, 'page', 'button', currentUser.customButtonAccess);
```

---

## ✅ قائمة التحقق للمطور

- [ ] استيراد الدوال من `@/utils/permissions`
- [ ] استخدام `filterDataByUserProject` في تحميل البيانات
- [ ] استخدام `canShowButton` لكل زر
- [ ] استخدام `canAccessProject` في العمليات (إضافة/تعديل)
- [ ] التحقق من `currentUser.role === 'Admin'` للاستثناءات
- [ ] اختبار مع مستخدم Admin
- [ ] اختبار مع مستخدم Sales/Accounting
- [ ] التأكد من عدم ظهور بيانات مشاريع أخرى

---

## 📞 المساعدة

إذا واجهت مشاكل:
1. راجع `docs/PERMISSIONS_SYSTEM_COMPLETE_GUIDE.md`
2. راجع `docs/FILTER_BY_PROJECT_EXAMPLE.md`
3. تحقق من console.log للأخطاء
4. تأكد من وجود صلاحيات للمستخدم في قاعدة البيانات
