# ⚡ دليل البدء السريع - نظام البحث المحسّن

## 🎯 خطوات سريعة للتطبيق

### الخطوة 1: استيراد المكونات (في أي صفحة)

```tsx
import EnhancedSearchBar from '../shared/EnhancedSearchBar';
import { SearchResult } from '../../src/services/searchService';
import { useProject } from '../../contexts/ProjectContext';
```

### الخطوة 2: إضافة المكون للصفحة

```tsx
function YourPage() {
  const { activeProject } = useProject();
  
  const handleSearchResult = (result: SearchResult) => {
    // عند اختيار نتيجة من البحث
    console.log('Selected:', result);
    // يمكنك الانتقال للعنصر أو فتح modal، إلخ
  };
  
  return (
    <div>
      {/* أضف شريط البحث في أي مكان */}
      <EnhancedSearchBar 
        onResultClick={handleSearchResult}
        filters={{ projectId: activeProject?.id }}
        types={['expense', 'payment']}
        placeholder="🔍 ابحث..."
      />
      
      {/* باقي المحتوى */}
    </div>
  );
}
```

### الخطوة 3: جاهز! 🎉

---

## 📝 أمثلة سريعة

### مثال 1: في صفحة المصروفات

```tsx
// في components/pages/accounting/Expenses.tsx

<EnhancedSearchBar 
  onResultClick={(result) => {
    // ابحث عن المصروف وانتقل إليه
    const expense = allExpenses.find(e => e.id === result.id);
    if (expense) {
      scrollToExpense(result.id);
    }
  }}
  filters={{ projectId: activeProject?.id }}
  types={['expense']}
  placeholder="🔍 ابحث في المصروفات..."
  className="mb-6"
/>
```

### مثال 2: في الـ Header (بحث شامل)

```tsx
// في components/Header.tsx

<EnhancedSearchBar 
  onResultClick={(result) => {
    // انتقل للصفحة المناسبة
    if (result.type === 'expense') {
      setActivePage('expenses');
    } else if (result.type === 'payment') {
      setActivePage('payments');
    }
    // ثم التركيز على العنصر
  }}
  types={['expense', 'payment', 'booking', 'customer']}
  placeholder="🔍 بحث عام..."
/>
```

### مثال 3: بحث مع فلاتر مخصصة

```tsx
const [filters, setFilters] = useState({
  projectId: activeProject?.id,
  dateFrom: '2024-01-01',
  minAmount: 100,
});

<EnhancedSearchBar 
  filters={filters}
  types={['expense']}
/>
```

---

## 🎨 Props المتاحة

| Prop | النوع | الافتراضي | الوصف |
|------|-------|-----------|-------|
| `onResultClick` | `(result: SearchResult) => void` | - | دالة يتم استدعاؤها عند اختيار نتيجة |
| `filters` | `SearchFilters` | `{}` | فلاتر البحث (projectId, dateFrom, etc.) |
| `placeholder` | `string` | `"🔍 ابحث..."` | النص الظاهر في حقل البحث |
| `types` | `Array<'expense' \| 'payment' \| ...>` | `['expense', 'payment']` | أنواع البيانات المراد البحث فيها |
| `className` | `string` | `''` | فئات CSS إضافية |
| `autoFocus` | `boolean` | `false` | تركيز تلقائي عند التحميل |

---

## 🔑 الميزات الرئيسية

✅ **بحث فوري** - نتائج تظهر أثناء الكتابة  
✅ **ترتيب ذكي** - الأكثر تطابقاً أولاً  
✅ **تمييز النص** - النص المطابق يظهر مميزاً  
✅ **keyboard navigation** - استخدم ↑↓ Enter  
✅ **Responsive** - يعمل على جميع الأجهزة  
✅ **Dark Mode** - دعم كامل للوضع الليلي  

---

## 🚀 البدء الآن!

1. انسخ الكود من أحد الأمثلة أعلاه
2. عدّل حسب احتياجك
3. جرّب البحث!

---

## 📚 المزيد من المعلومات

راجع الدليل الكامل: [ENHANCED_SEARCH_GUIDE.md](ENHANCED_SEARCH_GUIDE.md)

---

**تم الإنشاء:** 2026-01-07  
**الحالة:** ✅ جاهز للاستخدام
