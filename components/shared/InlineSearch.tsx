/**
 * ══════════════════════════════════════════════════════════════════════════════
 * 🔍 نظام البحث الاحترافي المتخصص
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * ✅ فصل البحث حسب الواجهة:
 *    - واجهة الحسابات (expenses): البحث في المصروفات فقط
 *    - واجهة المبيعات (projects): البحث في الدفعات والحجوزات
 * 
 * ✅ إمكانيات متقدمة:
 *    - تحديد النتائج للتعديل المباشر
 *    - طباعة النتائج المحددة
 *    - تصدير للإكسل
 *    - الانتقال للحركة المالية مباشرة
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../src/lib/supabase';
import { formatCurrency } from '../../utils/currencyFormatter';
import { InterfaceMode } from '../../types';

interface InlineSearchProps {
  projectId?: string | null;
  projectName?: string;
  interfaceMode: InterfaceMode;
  setActivePage: (page: string) => void;
  onNavigate?: (type: 'expense' | 'payment' | 'booking', id: string) => void;
}

interface ExpenseResult {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  category_name: string;
  project_name?: string;
  selected?: boolean;
}

interface PaymentResult {
  id: string;
  amount: number;
  payment_date: string;
  notes: string;
  customer_name: string;
  unit_number: string;
  project_name?: string;
  selected?: boolean;
}

interface BookingResult {
  id: string;
  booking_date: string;
  amount_paid: number;
  status: string;
  customer_name: string;
  unit_number: string;
  unit_price: number;
  project_name?: string;
  selected?: boolean;
}

const InlineSearch: React.FC<InlineSearchProps> = ({
  projectId,
  projectName,
  interfaceMode,
  setActivePage,
  onNavigate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expenseResults, setExpenseResults] = useState<ExpenseResult[]>([]);
  const [paymentResults, setPaymentResults] = useState<PaymentResult[]>([]);
  const [bookingResults, setBookingResults] = useState<BookingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'payments' | 'bookings'>(
    interfaceMode === 'expenses' ? 'expenses' : 'payments'
  );
  const [searchTime, setSearchTime] = useState(0);
  const [selectAll, setSelectAll] = useState(false);
  const [searchAllProjects, setSearchAllProjects] = useState(false); // ✅ البحث في جميع المشاريع
  
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // تحديد نوع البحث بناءً على الواجهة
  const searchMode = interfaceMode === 'expenses' ? 'accounting' : 'sales';

  // إغلاق وتنظيف
  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setExpenseResults([]);
    setPaymentResults([]);
    setBookingResults([]);
    setSelectAll(false);
    setSearchAllProjects(false); // ✅ إعادة تعيين عند الإغلاق
  };

  // فتح البحث بـ Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setActiveTab(interfaceMode === 'expenses' ? 'expenses' : 'payments');
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, interfaceMode]);

  // البحث
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setExpenseResults([]);
      setPaymentResults([]);
      setBookingResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const start = performance.now();
    const searchLower = searchQuery.trim().toLowerCase();
    
    // ✅ تحديد هل نفلتر حسب المشروع أم لا
    const effectiveProjectId = searchAllProjects ? null : projectId;

    try {
      // ═══════════════════════════════════════════════════════════════════════
      // 🧾 واجهة الحسابات - البحث في المصروفات فقط
      // ═══════════════════════════════════════════════════════════════════════
      if (searchMode === 'accounting') {
        let expQuery = supabase
          .from('expenses')
          .select(`id, description, amount, expense_date, project_id, expense_categories(name), projects(name)`)
          .order('expense_date', { ascending: false })
          .limit(1000); // ✅ زيادة الحد لضمان شمولية البحث
        
        if (effectiveProjectId) {
          expQuery = expQuery.eq('project_id', effectiveProjectId);
        }
        
        const { data: expData } = await expQuery;
        
        if (expData) {
          const filtered = expData.filter((e: any) => {
            const desc = (e.description || '').toLowerCase();
            const category = (e.expense_categories?.name || '').toLowerCase();
            const amount = String(e.amount || '');
            return desc.includes(searchLower) || category.includes(searchLower) || amount.includes(searchQuery.trim());
          });
          
          setExpenseResults(filtered.map((e: any) => ({
            id: e.id,
            description: e.description || 'بدون وصف',
            amount: e.amount,
            expense_date: e.expense_date,
            category_name: e.expense_categories?.name || 'بدون فئة',
            project_name: e.projects?.name || '',
            selected: false
          })));
        }
        
        // مسح نتائج الأقسام الأخرى في واجهة الحسابات
        setPaymentResults([]);
        setBookingResults([]);
      }
      // ═══════════════════════════════════════════════════════════════════════
      // 💼 واجهة المبيعات - البحث في الدفعات والحجوزات فقط
      // ═══════════════════════════════════════════════════════════════════════
      else {
        // مسح المصروفات في واجهة المبيعات
        setExpenseResults([]);
        
        // البحث في الدفعات
        const { data: payData } = await supabase
          .from('payments')
          .select(`
            id, amount, payment_date, notes,
            bookings(customers(name, phone), units(unit_number, project_id, projects(name)))
          `)
          .order('payment_date', { ascending: false })
          .limit(1000); // ✅ زيادة الحد لضمان شمولية البحث

        if (payData) {
          let filtered = payData as any[];
          
          // ✅ تصفية حسب المشروع فقط إذا لم يكن البحث في جميع المشاريع
          if (effectiveProjectId) {
            filtered = filtered.filter(p => p.bookings?.units?.project_id === effectiveProjectId);
          }
          
          filtered = filtered.filter(p => {
            const customerName = (p.bookings?.customers?.name || '').toLowerCase();
            const customerPhone = (p.bookings?.customers?.phone || '').toLowerCase();
            const unitNumber = (p.bookings?.units?.unit_number || '').toLowerCase();
            const notes = (p.notes || '').toLowerCase();
            const amount = String(p.amount || '');
            return customerName.includes(searchLower) || 
                   customerPhone.includes(searchLower) ||
                   unitNumber.includes(searchLower) || 
                   notes.includes(searchLower) ||
                   amount.includes(searchQuery.trim());
          });
          
          setPaymentResults(filtered.map((p: any) => ({
            id: p.id,
            amount: p.amount,
            payment_date: p.payment_date,
            notes: p.notes || '',
            customer_name: p.bookings?.customers?.name || 'غير محدد',
            unit_number: p.bookings?.units?.unit_number || '',
            project_name: p.bookings?.units?.projects?.name || '',
            selected: false
          })));
        }

        // البحث في الحجوزات
        const { data: bookData } = await supabase
          .from('bookings')
          .select(`
            id, booking_date, amount_paid, status,
            customers(name, phone), units(unit_number, price, project_id, projects(name))
          `)
          .order('booking_date', { ascending: false })
          .limit(1000); // ✅ زيادة الحد لضمان شمولية البحث

        if (bookData) {
          let filtered = bookData as any[];
          
          // ✅ تصفية حسب المشروع فقط إذا لم يكن البحث في جميع المشاريع
          if (effectiveProjectId) {
            filtered = filtered.filter(b => b.units?.project_id === effectiveProjectId);
          }
          
          filtered = filtered.filter(b => {
            const customerName = (b.customers?.name || '').toLowerCase();
            const customerPhone = (b.customers?.phone || '').toLowerCase();
            const unitNumber = (b.units?.unit_number || '').toLowerCase();
            const amount = String(b.amount_paid || '');
            return customerName.includes(searchLower) || 
                   customerPhone.includes(searchLower) ||
                   unitNumber.includes(searchLower) ||
                   amount.includes(searchQuery.trim());
          });
          
          setBookingResults(filtered.map((b: any) => ({
            id: b.id,
            booking_date: b.booking_date,
            amount_paid: b.amount_paid || 0,
            status: b.status,
            customer_name: b.customers?.name || 'غير محدد',
            unit_number: b.units?.unit_number || '',
            unit_price: b.units?.price || 0,
            project_name: b.units?.projects?.name || '',
            selected: false
          })));
        }
      }

      setSearchTime(Math.round(performance.now() - start));
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, searchMode, searchAllProjects]); // ✅ إضافة searchAllProjects للتبعيات

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(query), 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, performSearch]);

  // إعادة تعيين selectAll عند تغيير النتائج
  useEffect(() => {
    setSelectAll(false);
  }, [expenseResults.length, paymentResults.length, bookingResults.length]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎯 وظائف التحديد والطباعة والتصدير
  // ═══════════════════════════════════════════════════════════════════════════
  
  // تحديد/إلغاء تحديد الكل
  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    if (searchMode === 'accounting') {
      setExpenseResults(prev => prev.map(e => ({ ...e, selected: newSelectAll })));
    } else {
      if (activeTab === 'payments') {
        setPaymentResults(prev => prev.map(p => ({ ...p, selected: newSelectAll })));
      } else {
        setBookingResults(prev => prev.map(b => ({ ...b, selected: newSelectAll })));
      }
    }
  };

  // تحديد عنصر واحد
  const toggleSelect = (type: string, id: string) => {
    if (type === 'expense') {
      setExpenseResults(prev => prev.map(e => e.id === id ? { ...e, selected: !e.selected } : e));
    } else if (type === 'payment') {
      setPaymentResults(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
    } else {
      setBookingResults(prev => prev.map(b => b.id === id ? { ...b, selected: !b.selected } : b));
    }
    setSelectAll(false);
  };

  // الحصول على العناصر المحددة
  const getSelectedItems = () => {
    if (searchMode === 'accounting') {
      return expenseResults.filter(e => e.selected);
    } else if (activeTab === 'payments') {
      return paymentResults.filter(p => p.selected);
    } else {
      return bookingResults.filter(b => b.selected);
    }
  };

  // الانتقال للصفحة مع تحديد العنصر
  const handleNavigateToItem = (type: string, id: string) => {
    console.log('🔍 handleNavigateToItem called:', { type, id });
    
    // تحديد الصفحة المستهدفة
    const pageMap: Record<string, string> = {
      'expense': 'expenses',
      'payment': 'payments',
      'booking': 'bookings'
    };
    
    const targetPage = pageMap[type] || type;
    console.log('🎯 Target page:', targetPage);
    
    // استخدام نظام searchFocus الموجود للتمييز والتمرير
    const searchFocus = {
      page: targetPage,
      id: id,
      projectId: projectId,
      timestamp: Date.now()
    };
    
    // ✅ حفظ في sessionStorage أولاً
    sessionStorage.setItem('searchFocus', JSON.stringify(searchFocus));
    sessionStorage.setItem('activePage', targetPage);
    console.log('💾 Saved searchFocus to sessionStorage:', searchFocus);
    
    // ✅ الحل: استدعاء setActivePage قبل إغلاق النافذة
    // هذا يضمن أن الـ reference صحيح قبل أن يُعاد رسم المكون
    if (typeof setActivePage === 'function') {
      console.log('✅ Calling setActivePage BEFORE close:', targetPage);
      setActivePage(targetPage);
    }
    
    // ✅ استدعاء onNavigate أيضاً قبل الإغلاق
    if (typeof onNavigate === 'function') {
      console.log('✅ Calling onNavigate BEFORE close');
      onNavigate(type as 'expense' | 'payment' | 'booking', id);
    }
    
    // ✅ إغلاق النافذة بعد التنقل (بتأخير صغير)
    setTimeout(() => {
      handleClose();
      
      // إطلاق الحدث بعد تأخير إضافي
      setTimeout(() => {
        console.log('📣 Dispatching searchNavigate event');
        window.dispatchEvent(new CustomEvent('searchNavigate', { 
          detail: searchFocus 
        }));
      }, 300);
    }, 50);
  };

  // طباعة النتائج المحددة
  const handlePrint = () => {
    const selected = getSelectedItems();
    if (selected.length === 0) {
      alert('الرجاء تحديد عناصر للطباعة أولاً');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const title = searchMode === 'accounting' ? 'تقرير المصروفات' : 
                  activeTab === 'payments' ? 'تقرير الدفعات' : 'تقرير الحجوزات';
    
    const total = selected.reduce((sum, item: any) => {
      return sum + (item.amount || item.amount_paid || 0);
    }, 0);

    let tableHeaders = '';
    let tableRows = '';

    if (searchMode === 'accounting') {
      tableHeaders = '<th>التاريخ</th><th>الوصف</th><th>الفئة</th><th>المبلغ</th>';
      tableRows = (selected as ExpenseResult[]).map(e => `
        <tr>
          <td>${new Date(e.expense_date).toLocaleDateString('ar-EG')}</td>
          <td>${e.description}</td>
          <td>${e.category_name}</td>
          <td class="amount">${formatCurrency(e.amount)}</td>
        </tr>
      `).join('');
    } else if (activeTab === 'payments') {
      tableHeaders = '<th>التاريخ</th><th>العميل</th><th>الوحدة</th><th>ملاحظات</th><th>المبلغ</th>';
      tableRows = (selected as PaymentResult[]).map(p => `
        <tr>
          <td>${new Date(p.payment_date).toLocaleDateString('ar-EG')}</td>
          <td>${p.customer_name}</td>
          <td>${p.unit_number}</td>
          <td>${p.notes || '-'}</td>
          <td class="amount">${formatCurrency(p.amount)}</td>
        </tr>
      `).join('');
    } else {
      tableHeaders = '<th>التاريخ</th><th>العميل</th><th>الوحدة</th><th>سعر الوحدة</th><th>المدفوع</th><th>الحالة</th>';
      tableRows = (selected as BookingResult[]).map(b => `
        <tr>
          <td>${new Date(b.booking_date).toLocaleDateString('ar-EG')}</td>
          <td>${b.customer_name}</td>
          <td>${b.unit_number}</td>
          <td>${formatCurrency(b.unit_price)}</td>
          <td class="amount">${formatCurrency(b.amount_paid)}</td>
          <td>${b.status === 'Active' ? 'نشط' : b.status === 'Completed' ? 'مكتمل' : b.status}</td>
        </tr>
      `).join('');
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 20px; background: #fff; }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
          .header h1 { font-size: 24px; color: #1e293b; margin-bottom: 10px; }
          .header .project-name { font-size: 16px; color: #64748b; }
          .header .date { font-size: 14px; color: #94a3b8; margin-top: 5px; }
          .search-query { background: #f1f5f9; padding: 10px 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 12px 15px; text-align: right; border-bottom: 1px solid #e2e8f0; }
          th { background: #f8fafc; font-weight: 600; color: #475569; }
          tr:hover { background: #f8fafc; }
          .amount { font-weight: 600; color: #059669; direction: ltr; text-align: right; }
          .footer { margin-top: 20px; padding-top: 15px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; }
          .total { font-size: 18px; font-weight: 700; color: #1e293b; }
          .total span { color: #059669; }
          .count { font-size: 14px; color: #64748b; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 ${title}</h1>
          ${projectName ? `<p class="project-name">🏢 ${projectName}</p>` : ''}
          <p class="date">📅 ${new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div class="search-query">🔍 نتائج البحث عن: <strong>"${query}"</strong></div>
        <table>
          <thead><tr>${tableHeaders}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="footer">
          <div class="total">الإجمالي: <span>${formatCurrency(total)}</span></div>
          <div class="count">عدد العناصر: ${selected.length}</div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // تصدير للإكسل (CSV)
  const handleExportExcel = () => {
    const selected = getSelectedItems();
    if (selected.length === 0) {
      alert('الرجاء تحديد عناصر للتصدير أولاً');
      return;
    }

    let csvContent = '\ufeff'; // BOM for Arabic
    
    if (searchMode === 'accounting') {
      csvContent += 'التاريخ,الوصف,الفئة,المبلغ\n';
      (selected as ExpenseResult[]).forEach(e => {
        csvContent += `${e.expense_date},"${e.description}","${e.category_name}",${e.amount}\n`;
      });
    } else if (activeTab === 'payments') {
      csvContent += 'التاريخ,العميل,الوحدة,ملاحظات,المبلغ\n';
      (selected as PaymentResult[]).forEach(p => {
        csvContent += `${p.payment_date},"${p.customer_name}","${p.unit_number}","${p.notes}",${p.amount}\n`;
      });
    } else {
      csvContent += 'التاريخ,العميل,الوحدة,سعر الوحدة,المدفوع,الحالة\n';
      (selected as BookingResult[]).forEach(b => {
        csvContent += `${b.booking_date},"${b.customer_name}","${b.unit_number}",${b.unit_price},${b.amount_paid},"${b.status}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${searchMode === 'accounting' ? 'expenses' : activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const totalResults = expenseResults.length + paymentResults.length + bookingResults.length;
  const selectedCount = getSelectedItems().length;

  const searchModal = isOpen && createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        className="fixed inset-4 md:inset-8 lg:inset-12 flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Search */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              {isLoading ? (
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && handleClose()}
                placeholder={searchMode === 'accounting' 
                  ? `البحث في المصروفات ${searchAllProjects ? '(جميع المشاريع)' : projectName ? `- ${projectName}` : ''}...`
                  : `البحث في الدفعات والحجوزات ${searchAllProjects ? '(جميع المشاريع)' : projectName ? `- ${projectName}` : ''}...`
                }
                className="w-full py-3 pl-4 pr-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-lg"
                autoComplete="off"
                autoFocus
              />
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Info Bar */}
          <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              {/* نوع البحث */}
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                searchMode === 'accounting' 
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
              }`}>
                {searchMode === 'accounting' ? '🧾 واجهة الحسابات' : '💼 واجهة المبيعات'}
              </span>
              
              {/* ✅ زر البحث في جميع المشاريع */}
              {projectId && (
                <button
                  onClick={() => {
                    setSearchAllProjects(!searchAllProjects);
                    // إعادة البحث عند التبديل
                    if (query.length >= 2) {
                      setTimeout(() => performSearch(query), 100);
                    }
                  }}
                  className={`text-sm font-medium px-3 py-1 rounded-full transition-all ${
                    searchAllProjects 
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 ring-2 ring-amber-400'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                  title={searchAllProjects ? 'البحث حالياً في جميع المشاريع' : 'البحث حالياً في المشروع المحدد فقط'}
                >
                  {searchAllProjects ? '🌐 كل المشاريع' : '📁 المشروع الحالي'}
                </button>
              )}
              
              {projectName && !searchAllProjects && (
                <span className="text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-3 py-1 rounded-full">
                  🏢 {projectName}
                </span>
              )}
              
              {query.length >= 2 && !isLoading && (
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {totalResults} نتيجة في {searchTime}ms
                </span>
              )}
            </div>
            
            {/* Action Buttons */}
            {totalResults > 0 && (
              <div className="flex items-center gap-2">
                {selectedCount > 0 && (
                  <span className="text-sm text-primary-600 dark:text-primary-400 font-medium">
                    ✓ {selectedCount} محدد
                  </span>
                )}
                <button
                  onClick={handlePrint}
                  disabled={selectedCount === 0}
                  className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  🖨️ طباعة
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={selectedCount === 0}
                  className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  📊 تصدير
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs - فقط في واجهة المبيعات */}
        {searchMode === 'sales' && query.length >= 2 && (
          <div className="flex border-b border-slate-200 dark:border-slate-700 px-4 flex-shrink-0">
            <button
              onClick={() => { setActiveTab('payments'); setSelectAll(false); }}
              className={`px-4 py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'payments'
                  ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500'
                  : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700'
              }`}
            >
              💳 الدفعات
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'payments' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-700'
              }`}>
                {paymentResults.length}
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('bookings'); setSelectAll(false); }}
              className={`px-4 py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'bookings'
                  ? 'text-blue-600 dark:text-blue-400 border-blue-500'
                  : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700'
              }`}
            >
              📋 الحجوزات
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'bookings' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-slate-700'
              }`}>
                {bookingResults.length}
              </span>
            </button>
          </div>
        )}

        {/* Results Table */}
        <div className="flex-1 overflow-auto p-4">
          {query.length < 2 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <svg className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-lg font-medium">
                {searchMode === 'accounting' ? 'البحث في المصروفات' : 'البحث في الدفعات والحجوزات'}
              </p>
              <p className="text-sm mt-1">
                {searchMode === 'accounting' 
                  ? 'ابحث بوصف المصروف، الفئة، أو المبلغ'
                  : 'ابحث باسم العميل، رقم الوحدة، أو المبلغ'
                }
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <span className="text-xs bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg">💡 اكتب حرفين على الأقل</span>
                <span className="text-xs bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg">⌨️ Ctrl+K لفتح البحث</span>
                <span className="text-xs bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg">🖨️ حدد النتائج للطباعة</span>
              </div>
            </div>
          ) : totalResults === 0 && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <svg className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium">لا توجد نتائج</p>
              <p className="text-sm mt-1">جرب كلمات بحث مختلفة</p>
            </div>
          ) : (
            <>
              {/* ═══════════════════════════════════════════════════════════════
                  جدول المصروفات - واجهة الحسابات فقط
              ═══════════════════════════════════════════════════════════════ */}
              {searchMode === 'accounting' && expenseResults.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                      <tr>
                        <th className="px-3 py-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">التاريخ</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">الوصف</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">الفئة</th>
                        {searchAllProjects && (
                          <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">المشروع</th>
                        )}
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">المبلغ</th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300 w-24">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {expenseResults.map((expense) => (
                        <tr 
                          key={expense.id}
                          className={`transition-colors ${expense.selected ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                        >
                          <td className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={expense.selected || false}
                              onChange={() => toggleSelect('expense', expense.id)}
                              className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {new Date(expense.expense_date).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">
                            {highlightText(expense.description, query)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {expense.category_name}
                            </span>
                          </td>
                          {searchAllProjects && (
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                                {expense.project_name || '—'}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3 text-rose-600 dark:text-rose-400 font-bold whitespace-nowrap">
                            {formatCurrency(expense.amount)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleNavigateToItem('expense', expense.id)}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                            >
                              فتح ←
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-900">
                      <tr>
                        <td colSpan={searchAllProjects ? 6 : 5} className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                          الإجمالي ({expenseResults.length} مصروف)
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {formatCurrency(expenseResults.reduce((sum, e) => sum + e.amount, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* حالة عدم وجود نتائج في واجهة الحسابات */}
              {searchMode === 'accounting' && expenseResults.length === 0 && query.length >= 2 && !isLoading && (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                  <p>لا توجد مصروفات مطابقة للبحث</p>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  جدول الدفعات - واجهة المبيعات
              ═══════════════════════════════════════════════════════════════ */}
              {searchMode === 'sales' && activeTab === 'payments' && paymentResults.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                      <tr>
                        <th className="px-3 py-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">التاريخ</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">العميل</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">الوحدة</th>
                        {searchAllProjects && (
                          <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">المشروع</th>
                        )}
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">ملاحظات</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">المبلغ</th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300 w-24">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {paymentResults.map((payment) => (
                        <tr 
                          key={payment.id}
                          className={`transition-colors ${payment.selected ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                        >
                          <td className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={payment.selected || false}
                              onChange={() => toggleSelect('payment', payment.id)}
                              className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {new Date(payment.payment_date).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">
                            {highlightText(payment.customer_name, query)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                              {payment.unit_number}
                            </span>
                          </td>
                          {searchAllProjects && (
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                                {payment.project_name || '—'}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                            {payment.notes || '-'}
                          </td>
                          <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleNavigateToItem('payment', payment.id)}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                            >
                              فتح ←
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-900">
                      <tr>
                        <td colSpan={searchAllProjects ? 6 : 5} className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                          الإجمالي ({paymentResults.length} دفعة)
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatCurrency(paymentResults.reduce((sum, p) => sum + p.amount, 0))}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  جدول الحجوزات - واجهة المبيعات
              ═══════════════════════════════════════════════════════════════ */}
              {searchMode === 'sales' && activeTab === 'bookings' && bookingResults.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                      <tr>
                        <th className="px-3 py-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">التاريخ</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">العميل</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">الوحدة</th>
                        {searchAllProjects && (
                          <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">المشروع</th>
                        )}
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">سعر الوحدة</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">المدفوع</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">الحالة</th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300 w-24">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {bookingResults.map((booking) => (
                        <tr 
                          key={booking.id}
                          className={`transition-colors ${booking.selected ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                        >
                          <td className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={booking.selected || false}
                              onChange={() => toggleSelect('booking', booking.id)}
                              className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {new Date(booking.booking_date).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">
                            {highlightText(booking.customer_name, query)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                              {booking.unit_number}
                            </span>
                          </td>
                          {searchAllProjects && (
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                                {booking.project_name || '—'}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {formatCurrency(booking.unit_price)}
                          </td>
                          <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
                            {formatCurrency(booking.amount_paid)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              booking.status === 'Active' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                              booking.status === 'Completed' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                              'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                            }`}>
                              {booking.status === 'Active' ? 'نشط' : booking.status === 'Completed' ? 'مكتمل' : booking.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleNavigateToItem('booking', booking.id)}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                            >
                              فتح ←
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-900">
                      <tr>
                        <td colSpan={searchAllProjects ? 6 : 5} className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                          الإجمالي ({bookingResults.length} حجز)
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatCurrency(bookingResults.reduce((sum, b) => sum + b.amount_paid, 0))}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Empty Tab States */}
              {searchMode === 'sales' && activeTab === 'payments' && paymentResults.length === 0 && (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                  <p>لا توجد دفعات مطابقة للبحث</p>
                </div>
              )}
              {searchMode === 'sales' && activeTab === 'bookings' && bookingResults.length === 0 && (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                  <p>لا توجد حجوزات مطابقة للبحث</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Help */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span>☑️ حدد العناصر للطباعة أو التصدير</span>
            <span>← اضغط "فتح" للانتقال والتعديل</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px]">Esc</kbd>
            <span>للإغلاق</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      {/* Search Button */}
      <button
        onClick={() => {
          setIsOpen(true);
          setActiveTab(interfaceMode === 'expenses' ? 'expenses' : 'payments');
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-slate-300 bg-slate-700/40 hover:bg-slate-700/60 rounded-xl border border-slate-600/30 transition-all duration-200 group"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="hidden md:inline text-sm">
          {interfaceMode === 'expenses' ? 'بحث المصروفات' : 'بحث الدفعات'}
        </span>
        <kbd className="hidden lg:inline-flex px-1.5 py-0.5 text-[10px] bg-slate-600/50 rounded border border-slate-500/30">Ctrl+K</kbd>
      </button>

      {searchModal}
    </>
  );
};

// تمييز النص المطابق
function highlightText(text: string, query: string): React.ReactNode {
  if (!text || !query || query.length < 2) return text;
  try {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-600/50 px-0.5 rounded">{part}</mark>
        : part
    );
  } catch (e) {
    return text;
  }
}

export default InlineSearch;
