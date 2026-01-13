# مثال تطبيقي: فلترة دفتر الأستاذ حسب المشروع

## 📝 الهدف
عند فتح صفحة دفتر الأستاذ، يجب أن يرى المستخدم فقط الحركات الخاصة بالمشروع المخصص له.

---

## 🔧 التطبيق

### الخطوة 1: تعديل صفحة دفتر الأستاذ

**الملف**: `components/pages/accounting/GeneralLedger.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { filterDataByUserProject } from '@/utils/permissions';

export const GeneralLedger = () => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadTransactions();
  }, [currentUser]);
  
  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      // جلب جميع الحركات من قاعدة البيانات
      const allTransactions = await transactionService.getAll();
      
      // إذا كان Admin، أظهر كل شيء
      if (currentUser.role === 'Admin') {
        setTransactions(allTransactions);
      } else {
        // فلترة حسب المشروع المخصص
        const filtered = await filterDataByUserProject(
          allTransactions,
          currentUser.id
        );
        setTransactions(filtered);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h1>دفتر الأستاذ</h1>
      
      {loading ? (
        <p>جاري التحميل...</p>
      ) : transactions.length === 0 ? (
        <p>لا توجد حركات لعرضها</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>البيان</th>
              <th>مدين</th>
              <th>دائن</th>
              <th>المشروع</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id}>
                <td>{tx.date}</td>
                <td>{tx.description}</td>
                <td>{tx.debit}</td>
                <td>{tx.credit}</td>
                <td>{tx.project_name}</td>
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

### الخطوة 2: تطبيق على صفحات أخرى

**مثال: صفحة المصروفات**

```typescript
// components/pages/accounting/Expenses.tsx
import { filterDataByUserProject, canShowButton } from '@/utils/permissions';

export const Expenses = () => {
  const { currentUser } = useAuth();
  const [expenses, setExpenses] = useState([]);
  
  // صلاحيات الأزرار
  const canAdd = canShowButton(currentUser.role, 'expenses', 'add', currentUser.customButtonAccess);
  const canEdit = canShowButton(currentUser.role, 'expenses', 'edit', currentUser.customButtonAccess);
  const canDelete = canShowButton(currentUser.role, 'expenses', 'delete', currentUser.customButtonAccess);
  
  const loadExpenses = async () => {
    const allExpenses = await expenseService.getAll();
    
    if (currentUser.role === 'Admin') {
      setExpenses(allExpenses);
    } else {
      const filtered = await filterDataByUserProject(allExpenses, currentUser.id);
      setExpenses(filtered);
    }
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>المصروفات</h1>
        {canAdd && (
          <button onClick={handleAddExpense}>
            إضافة مصروف
          </button>
        )}
      </div>
      
      <table>
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
                    <button onClick={() => handleEdit(expense)}>
                      تعديل
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => handleDelete(expense)}>
                      حذف
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

**مثال: صفحة العملاء**

```typescript
// components/pages/sales/Customers.tsx
import { filterDataByUserProject, canShowButton, canAccessProject } from '@/utils/permissions';

export const Customers = () => {
  const { currentUser } = useAuth();
  const [customers, setCustomers] = useState([]);
  
  const canAdd = canShowButton(currentUser.role, 'customers', 'add', currentUser.customButtonAccess);
  const canEdit = canShowButton(currentUser.role, 'customers', 'edit', currentUser.customButtonAccess);
  const canDelete = canShowButton(currentUser.role, 'customers', 'delete', currentUser.customButtonAccess);
  const canExport = canShowButton(currentUser.role, 'customers', 'export', currentUser.customButtonAccess);
  
  const loadCustomers = async () => {
    const allCustomers = await customerService.getAll();
    
    if (currentUser.role === 'Admin') {
      setCustomers(allCustomers);
    } else {
      const filtered = await filterDataByUserProject(allCustomers, currentUser.id);
      setCustomers(filtered);
    }
  };
  
  const handleAddCustomer = async (customerData) => {
    // التحقق من صلاحية الوصول للمشروع
    if (currentUser.role !== 'Admin') {
      const hasAccess = await canAccessProject(currentUser.id, customerData.project_id);
      if (!hasAccess) {
        alert('لا يمكنك إضافة عملاء لهذا المشروع');
        return;
      }
    }
    
    await customerService.create(customerData);
    loadCustomers();
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>العملاء</h1>
        <div className="flex gap-2">
          {canExport && (
            <button onClick={handleExport}>
              تصدير
            </button>
          )}
          {canAdd && (
            <button onClick={handleAddCustomer}>
              إضافة عميل
            </button>
          )}
        </div>
      </div>
      
      <table>
        {/* ... */}
      </table>
    </div>
  );
};
```

---

## 🎯 النتائج المتوقعة

### للمستخدم Admin:
- يرى **كل** الحركات والبيانات
- يرى **كل** الأزرار
- لا يتأثر بالفلترة

### للمستخدم Sales/Accounting:
- يرى **فقط** بيانات مشروعه المخصص
- يرى **فقط** الأزرار المسموحة له
- لا يستطيع الوصول لبيانات مشاريع أخرى

---

## ✅ الخلاصة

الآن كل صفحة تحتاج إلى:
1. استيراد `filterDataByUserProject` من `@/utils/permissions`
2. استخدامها لفلترة البيانات حسب مشروع المستخدم
3. استخدام `canShowButton` للتحكم في الأزرار
4. استخدام `canAccessProject` للتحقق من العمليات

هذا يضمن:
- ✅ الأمان: كل مستخدم يرى بياناته فقط
- ✅ الخصوصية: لا تسريب للبيانات
- ✅ التحكم: المدير يتحكم في كل شيء
