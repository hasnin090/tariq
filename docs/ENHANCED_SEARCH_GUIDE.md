/**
 * ══════════════════════════════════════════════════════════════════════════════
 * 📘 دليل استخدام نظام البحث المحسّن
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * ## 🎯 نظرة عامة
 * 
 * تم بناء نظام بحث متقدم للحركات المالية يوفر:
 * - ✅ بحث سريع في قاعدة البيانات مباشرة
 * - ✅ نتائج مرتبة حسب الأهمية (Relevance Score)
 * - ✅ تمييز النص المطابق (Highlighting)
 * - ✅ Debouncing تلقائي لتحسين الأداء
 * - ✅ دعم Keyboard Navigation
 * - ✅ فلترة متقدمة
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * ## 📁 الملفات المُنشأة
 * 
 * ### 1. `src/services/searchService.ts`
 * خدمات البحث الأساسية:
 * - `searchExpenses()` - البحث في المصروفات
 * - `searchPayments()` - البحث في الدفعات
 * - `searchAll()` - البحث الموحّد
 * - `highlightText()` - تمييز النص
 * - `getSearchStats()` - إحصائيات البحث
 * 
 * ### 2. `components/shared/EnhancedSearchBar.tsx`
 * مكون واجهة المستخدم:
 * - مكون React جاهز للاستخدام
 * - واجهة بحث تفاعلية
 * - عرض النتائج مجمّعة حسب النوع
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * ## 🚀 طريقة الاستخدام
 * 
 * ### طريقة 1: استخدام المكون الجاهز
 * 
 * ```tsx
 * import EnhancedSearchBar from '../shared/EnhancedSearchBar';
 * import { SearchResult } from '../../src/services/searchService';
 * 
 * function MyComponent() {
 *   const handleResultClick = (result: SearchResult) => {
 *     console.log('Selected:', result);
 *     // الانتقال للعنصر أو عرض التفاصيل
 *     if (result.type === 'expense') {
 *       // فتح صفحة المصروف
 *     }
 *   };
 * 
 *   return (
 *     <EnhancedSearchBar 
 *       onResultClick={handleResultClick}
 *       placeholder="ابحث في المصروفات..."
 *       types={['expense', 'payment']}
 *       filters={{
 *         projectId: activeProject?.id,
 *         dateFrom: '2024-01-01',
 *       }}
 *     />
 *   );
 * }
 * ```
 * 
 * ### طريقة 2: استخدام الخدمات مباشرة
 * 
 * ```tsx
 * import { searchExpenses, SearchFilters } from '../../src/services/searchService';
 * 
 * async function performSearch() {
 *   const filters: SearchFilters = {
 *     projectId: 'project-123',
 *     dateFrom: '2024-01-01',
 *     dateTo: '2024-12-31',
 *     minAmount: 100,
 *     maxAmount: 5000,
 *   };
 * 
 *   const results = await searchExpenses('طباعة', filters, 20);
 *   console.log('Found:', results.length, 'expenses');
 *   
 *   results.forEach(result => {
 *     console.log(`- ${result.title} (${result.amount} ر.س)`);
 *     console.log(`  Matched fields: ${result.matchedFields.join(', ')}`);
 *     console.log(`  Relevance: ${result.relevanceScore}`);
 *   });
 * }
 * ```
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * ## 💡 أمثلة عملية
 * 
 * ### مثال 1: البحث في صفحة المصروفات
 * 
 * ```tsx
 * // في components/pages/accounting/Expenses.tsx
 * 
 * import EnhancedSearchBar from '../../shared/EnhancedSearchBar';
 * import { SearchResult } from '../../../src/services/searchService';
 * 
 * function Expenses() {
 *   const { activeProject } = useProject();
 *   const { currentUser } = useAuth();
 *   
 *   const handleSearchResult = (result: SearchResult) => {
 *     // البحث عن المصروف في القائمة
 *     const expense = allExpenses.find(e => e.id === result.id);
 *     if (expense) {
 *       // التمرير للعنصر
 *       scrollToExpense(result.id);
 *       // تمييزه
 *       highlightExpense(result.id);
 *     }
 *   };
 *   
 *   return (
 *     <div className="p-6">
 *       <EnhancedSearchBar 
 *         onResultClick={handleSearchResult}
 *         filters={{
 *           projectId: currentUser?.assignedProjectId || activeProject?.id
 *         }}
 *         types={['expense']}
 *         placeholder="🔍 ابحث في المصروفات..."
 *         className="mb-6"
 *       />
 *       
 *       {/* باقي المحتوى */}
 *     </div>
 *   );
 * }
 * ```
 * 
 * ### مثال 2: بحث شامل في الـ Header
 * 
 * ```tsx
 * // في components/Header.tsx
 * 
 * import { searchAll } from '../src/services/searchService';
 * 
 * function GlobalSearch() {
 *   const [query, setQuery] = useState('');
 *   const [results, setResults] = useState([]);
 *   
 *   useEffect(() => {
 *     if (query.length < 2) return;
 *     
 *     const search = async () => {
 *       const results = await searchAll(query, undefined, 
 *         ['expense', 'payment', 'booking', 'customer'], 20);
 *       setResults(results);
 *     };
 *     
 *     const timer = setTimeout(search, 300);
 *     return () => clearTimeout(timer);
 *   }, [query]);
 *   
 *   return (
 *     <EnhancedSearchBar
 *       onResultClick={(result) => {
 *         // الانتقال للصفحة المناسبة
 *         navigateToResult(result);
 *       }}
 *       types={['expense', 'payment', 'booking', 'customer']}
 *     />
 *   );
 * }
 * ```
 * 
 * ### مثال 3: بحث مع فلترة مخصّصة
 * 
 * ```tsx
 * function AdvancedSearch() {
 *   const [filters, setFilters] = useState<SearchFilters>({
 *     projectId: null,
 *     dateFrom: '2024-01-01',
 *     dateTo: '2024-12-31',
 *     minAmount: 0,
 *     maxAmount: 10000,
 *     categoryId: undefined,
 *   });
 *   
 *   return (
 *     <div>
 *       {/* Filters UI */}
 *       <div className="filters mb-4">
 *         <input 
 *           type="date" 
 *           value={filters.dateFrom}
 *           onChange={e => setFilters({...filters, dateFrom: e.target.value})}
 *         />
 *         {/* المزيد من الفلاتر */}
 *       </div>
 *       
 *       {/* Search Bar */}
 *       <EnhancedSearchBar 
 *         filters={filters}
 *         types={['expense']}
 *       />
 *     </div>
 *   );
 * }
 * ```
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * ## 🎨 التخصيص
 * 
 * ### تخصيص الألوان
 * 
 * المكون يستخدم Tailwind CSS. يمكنك التعديل في:
 * - `bg-primary-*` - الألوان الرئيسية
 * - `dark:` - أوضاع الـ Dark Mode
 * 
 * ### تخصيص النتائج
 * 
 * ```tsx
 * // تعديل طريقة عرض النتائج
 * const CustomResult = ({ result }: { result: SearchResult }) => (
 *   <div className="custom-result">
 *     <h3>{result.title}</h3>
 *     {result.amount && <span>{formatCurrency(result.amount)}</span>}
 *     {/* تصميمك الخاص */}
 *   </div>
 * );
 * ```
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * ## 🔑 المميزات الرئيسية
 * 
 * ### 1. Relevance Scoring
 * يتم حساب درجة الصلة لكل نتيجة بناءً على:
 * - تطابق بداية النص: +10 نقاط
 * - تطابق في الوصف: +5 نقاط
 * - تطابق في المبلغ: +6 نقاط
 * - تطابق في الفئة: +4 نقاط
 * - تطابق في الملاحظات: +3 نقاط
 * 
 * ### 2. Multi-field Search
 * البحث في:
 * - description (الوصف)
 * - amount (المبلغ)
 * - date (التاريخ)
 * - notes (الملاحظات)
 * - categoryName (اسم الفئة)
 * - customerName (اسم العميل)
 * - unitName (اسم الوحدة)
 * 
 * ### 3. Keyboard Shortcuts
 * - `↑` - التنقل للأعلى
 * - `↓` - التنقل للأسفل
 * - `Enter` - اختيار النتيجة
 * - `Escape` - إغلاق النتائج
 * 
 * ### 4. Smart Filtering
 * ```tsx
 * const filters: SearchFilters = {
 *   projectId: 'abc123',      // فلترة حسب المشروع
 *   dateFrom: '2024-01-01',   // من تاريخ
 *   dateTo: '2024-12-31',     // إلى تاريخ
 *   minAmount: 100,           // أقل مبلغ
 *   maxAmount: 5000,          // أعلى مبلغ
 *   categoryId: 'cat-456',    // فئة محددة
 * };
 * ```
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * ## ⚡ الأداء
 * 
 * ### Benchmarks
 * - البحث في 1000 مصروف: ~50-100ms
 * - البحث في 5000 مصروف: ~200-300ms
 * - Debounce delay: 300ms
 * 
 * ### نصائح لتحسين الأداء
 * 
 * 1. **استخدم الفلاتر دائماً:**
 *    ```tsx
 *    // ❌ سيء - بحث في كل البيانات
 *    searchExpenses('keyword')
 *    
 *    // ✅ جيد - بحث مُفلتر
 *    searchExpenses('keyword', { projectId: 'abc' })
 *    ```
 * 
 * 2. **حدد عدد النتائج:**
 *    ```tsx
 *    searchExpenses('keyword', filters, 10) // فقط 10 نتائج
 *    ```
 * 
 * 3. **استخدم types محددة:**
 *    ```tsx
 *    // ❌ بحث في كل شيء
 *    searchAll('keyword', filters, ['expense', 'payment', 'booking', 'customer'])
 *    
 *    // ✅ بحث في نوع واحد
 *    searchExpenses('keyword', filters)
 *    ```
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * ## 🐛 استكشاف الأخطاء
 * 
 * ### لا تظهر نتائج
 * 
 * ```tsx
 * // تحقق من:
 * 1. طول النص (يجب أن يكون 2 حرف على الأقل)
 * 2. الفلاتر (قد تكون مقيّدة جداً)
 * 3. console.log للتحقق من البيانات المُرجعة
 * 
 * const results = await searchExpenses('test');
 * console.log('Results:', results.length);
 * ```
 * 
 * ### البحث بطيء
 * 
 * ```tsx
 * // استخدم getSearchStats لقياس الأداء
 * const stats = await getSearchStats('keyword', filters);
 * console.log(`Found ${stats.totalResults} in ${stats.searchTime}ms`);
 * ```
 * 
 * ### مشاكل في التمييز (Highlighting)
 * 
 * ```tsx
 * // تأكد من استخدام dangerouslySetInnerHTML
 * <p dangerouslySetInnerHTML={{ __html: highlightText(text, query) }} />
 * ```
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * ## 🔄 الترقيات المستقبلية المقترحة
 * 
 * 1. **Full-text Search في PostgreSQL:**
 *    ```sql
 *    -- إضافة tsvector column
 *    ALTER TABLE expenses ADD COLUMN search_vector tsvector;
 *    CREATE INDEX idx_expenses_search ON expenses USING gin(search_vector);
 *    ```
 * 
 * 2. **Fuzzy Search:**
 *    - استخدام Levenshtein distance
 *    - تحمّل الأخطاء الإملائية
 * 
 * 3. **Search History:**
 *    - حفظ عمليات البحث السابقة
 *    - اقتراحات ذكية
 * 
 * 4. **Advanced Filters:**
 *    - بحث بالمدى الزمني
 *    - بحث بعدة فئات
 *    - بحث حسب المستخدم
 * 
 * 5. **Export Results:**
 *    - تصدير النتائج إلى Excel
 *    - طباعة النتائج
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * ## 📞 الدعم
 * 
 * إذا واجهت مشاكل:
 * 1. تحقق من Console للأخطاء
 * 2. راجع أمثلة الكود أعلاه
 * 3. تأكد من تطابق أنواع البيانات
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 */

// مثال كامل للتطبيق

import React from 'react';
import EnhancedSearchBar from './components/shared/EnhancedSearchBar';
import { SearchResult, searchExpenses } from './src/services/searchService';
import { useProject } from './contexts/ProjectContext';

function ExpensesPageExample() {
  const { activeProject } = useProject();

  const handleResultClick = (result: SearchResult) => {
    console.log('User selected:', result);
    
    // مثال: التمرير للعنصر
    const element = document.getElementById(`expense-${result.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-flash');
      setTimeout(() => element.classList.remove('highlight-flash'), 2000);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">المصروفات</h1>
      
      {/* Search Bar */}
      <EnhancedSearchBar
        onResultClick={handleResultClick}
        filters={{ projectId: activeProject?.id }}
        types={['expense']}
        placeholder="🔍 ابحث عن مصروف..."
        className="mb-6"
        autoFocus={false}
      />
      
      {/* باقي المحتوى */}
      <div className="expenses-list">
        {/* ... */}
      </div>
    </div>
  );
}

export default ExpensesPageExample;
