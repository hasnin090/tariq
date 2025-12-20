import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ExpenseCategory, Expense, Project } from '../../../types';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { TagIcon, BriefcaseIcon, ArrowRightIcon, PrinterIcon } from '../../shared/Icons';
import { expensesService, expenseCategoriesService, projectsService } from '../../../src/services/supabaseService';

const CategoryAccounting: React.FC = () => {
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    
    // GSAP Table Animation Ref
    const tableBodyRef = useRef<HTMLTableSectionElement>(null);
    const hasAnimated = useRef(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Fetch all data from Supabase
            const [categoriesData, expensesData, projectsData] = await Promise.all([
                expenseCategoriesService.getAll(),
                expensesService.getAll(),
                projectsService.getAll()
            ]);
            
            setCategories(categoriesData as ExpenseCategory[]);
            setExpenses(expensesData);
            setProjects(projectsData);
        } catch (error) {
            console.error('Error loading category accounting data:', error);
        }
    };

    const categoryData = useMemo(() => {
        const categoryMap = new Map<string, { name: string; totalAmount: number; transactionCount: number }>();
        categories.forEach(c => categoryMap.set(c.id, { name: c.name, totalAmount: 0, transactionCount: 0 }));
        const uncategorized = { name: 'غير مصنفة', totalAmount: 0, transactionCount: 0 };

        for (const expense of expenses) {
            // تحقق من أن المصروف له فئة صحيحة وموجودة
            const hasValidCategory = expense.categoryId && 
                                    expense.categoryId !== '' && 
                                    categoryMap.has(expense.categoryId);
            
            if (hasValidCategory) {
                const category = categoryMap.get(expense.categoryId)!;
                category.totalAmount += expense.amount;
                category.transactionCount++;
            } else {
                // جميع المصروفات بدون فئة صحيحة تذهب إلى "غير مصنفة"
                uncategorized.totalAmount += expense.amount;
                uncategorized.transactionCount++;
            }
        }
        
        const results = Array.from(categoryMap.entries())
            .map(([id, data]) => ({ categoryId: id, ...data }));
        
        if (uncategorized.transactionCount > 0) {
            results.push({ categoryId: 'uncategorized', ...uncategorized });
        }

        return results
            .filter(c => c.transactionCount > 0)
            .sort((a, b) => b.totalAmount - a.totalAmount);

    }, [categories, expenses]);
    
    const selectedCategory = useMemo(() => {
        if (!selectedCategoryId) return null;
        return categoryData.find(c => c.categoryId === selectedCategoryId);
    }, [selectedCategoryId, categoryData]);

    const filteredTransactions = useMemo(() => {
        if (!selectedCategory) return [];
        
        let txs = expenses.filter(expense => {
            if (selectedCategoryId === 'uncategorized') {
                // المصروفات غير المصنفة: بدون categoryId أو categoryId غير موجود في القائمة
                return !expense.categoryId || expense.categoryId === '' || !categories.some(c => c.id === expense.categoryId);
            }
            return expense.categoryId === selectedCategoryId;
        });

        if (selectedProjectId) {
            txs = txs.filter(tx => tx.projectId === selectedProjectId);
        }

        return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedCategory, selectedProjectId, expenses, categories]);

    // 🎬 GSAP Table Animation - runs only once
    useLayoutEffect(() => {
        if (tableBodyRef.current && filteredTransactions.length > 0 && !hasAnimated.current) {
            hasAnimated.current = true;
            const rows = tableBodyRef.current.querySelectorAll('tr');
            gsap.fromTo(rows,
                { opacity: 0, y: 15, x: -10 },
                {
                    opacity: 1,
                    y: 0,
                    x: 0,
                    duration: 0.35,
                    stagger: 0.04,
                    ease: "power2.out",
                    delay: 0.1
                }
            );
        }
    }, [filteredTransactions]);
    
    const handleSelectCategory = (categoryId: string) => {
        setSelectedCategoryId(categoryId);
        setSelectedProjectId(''); // Reset project filter
    };

    const handleClearCategory = () => {
        setSelectedCategoryId(null);
    };

    const handlePrintLedger = () => {
        if (!selectedCategory) return;

        if (!filteredTransactions.length) {
            return;
        }

        const currencyCode = (localStorage.getItem('systemCurrency') || 'IQD').toUpperCase();
        const decimalPlaces = Number.parseInt(localStorage.getItem('systemDecimalPlaces') || '2', 10);
        const safeDecimalPlaces = Number.isFinite(decimalPlaces) ? Math.max(0, Math.min(6, decimalPlaces)) : 2;

        const formatForPrint = (value: number): string => {
            try {
                return new Intl.NumberFormat('ar-SA', {
                    style: 'currency',
                    currency: /^[A-Z]{3}$/.test(currencyCode) ? currencyCode : 'IQD',
                    minimumFractionDigits: safeDecimalPlaces,
                    maximumFractionDigits: safeDecimalPlaces,
                }).format(value);
            } catch {
                return `${value}`;
            }
        };

        const escapeHtml = (value: unknown): string => {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        };

        const accentName = (localStorage.getItem('accentColor') || 'emerald').toLowerCase();
        const accentPaletteByName: Record<string, { accent600: string; accent700: string; accent50: string; accent100: string }> = {
            emerald: { accent600: '#059669', accent700: '#047857', accent50: '#ecfdf5', accent100: '#d1fae5' },
            teal: { accent600: '#0d9488', accent700: '#0f766e', accent50: '#f0fdfa', accent100: '#ccfbf1' },
            cyan: { accent600: '#0891b2', accent700: '#0e7490', accent50: '#ecfeff', accent100: '#cffafe' },
            blue: { accent600: '#2563eb', accent700: '#1d4ed8', accent50: '#eff6ff', accent100: '#dbeafe' },
            indigo: { accent600: '#4f46e5', accent700: '#4338ca', accent50: '#eef2ff', accent100: '#e0e7ff' },
            purple: { accent600: '#7c3aed', accent700: '#6d28d9', accent50: '#faf5ff', accent100: '#f3e8ff' },
            rose: { accent600: '#e11d48', accent700: '#be123c', accent50: '#fff1f2', accent100: '#ffe4e6' },
            amber: { accent600: '#d97706', accent700: '#b45309', accent50: '#fffbeb', accent100: '#fef3c7' },
        };
        const accent = accentPaletteByName[accentName] || accentPaletteByName.emerald;

        const baseStyles = `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            :root { --accent-600: ${accent.accent600}; --accent-700: ${accent.accent700}; --accent-50: ${accent.accent50}; --accent-100: ${accent.accent100}; }
            @page { size: A4; margin: 12mm; }
            body { font-family: Arial, sans-serif; direction: rtl; color: #0f172a; background: #ffffff; }
            .sheet { border: 2px solid var(--accent-700); border-radius: 10px; padding: 14px; }
            .header { padding-bottom: 10px; border-bottom: 2px solid var(--accent-700); margin-bottom: 14px; }
            .brandbar { height: 8px; background: var(--accent-700); border-radius: 999px; margin-bottom: 10px; }
            .title { font-size: 18px; font-weight: 800; color: var(--accent-700); margin-bottom: 6px; }
            .subtitle { font-size: 12px; color: #475569; margin-top: 2px; }
            .meta { display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 12px; color: #334155; margin-top: 8px; }
            .meta b { color: #0f172a; }
            .section { margin-top: 12px; break-inside: avoid; }
            .section-title { font-size: 13px; font-weight: 800; color: #0f172a; background: var(--accent-50); border: 1px solid var(--accent-100); padding: 8px 10px; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #cbd5e1; }
            thead { display: table-header-group; }
            th { background: var(--accent-700); color: #fff; padding: 9px 8px; text-align: right; font-size: 12px; border: 1px solid var(--accent-700); }
            td { padding: 9px 8px; text-align: right; font-size: 12px; border: 1px solid #cbd5e1; color: #0f172a; vertical-align: top; }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .summary { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; }
            .summary .card { border: 1px solid var(--accent-100); background: var(--accent-50); border-radius: 10px; padding: 10px; }
            .summary .card b { color: var(--accent-700); }
            .footer { margin-top: 14px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 11px; color: #475569; text-align: center; }
            .nowrap { white-space: nowrap; }
            @media print { a { color: inherit; text-decoration: none; } }
        `;

        const projectName = selectedProjectId
            ? (projects.find(p => p.id === selectedProjectId)?.name || '—')
            : 'كل المشاريع';

        const totalAmount = filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

        const rows = filteredTransactions
            .map(tx => {
                const proj = projects.find(p => p.id === tx.projectId)?.name || '—';
                return `
                    <tr>
                        <td class="nowrap">${escapeHtml(tx.date)}</td>
                        <td>${escapeHtml(tx.description)}</td>
                        <td>${escapeHtml(proj)}</td>
                        <td class="nowrap">${formatForPrint(tx.amount)}</td>
                    </tr>
                `;
            })
            .join('');

        const html = `
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8" />
                <title>دفتر الأستاذ</title>
                <style>${baseStyles}</style>
            </head>
            <body>
                <div class="sheet">
                    <div class="header">
                        <div class="brandbar"></div>
                        <div class="title">دفتر الأستاذ: ${escapeHtml(selectedCategory.name)}</div>
                        <div class="subtitle">تاريخ الطباعة: ${escapeHtml(new Date().toLocaleString('ar-SA'))}</div>
                        <div class="meta">
                            <div><b>نوع المصروف:</b> ${escapeHtml(selectedCategory.name)}</div>
                            <div><b>المشروع:</b> ${escapeHtml(projectName)}</div>
                            <div><b>عدد الحركات:</b> ${filteredTransactions.length}</div>
                        </div>
                    </div>

                    <div class="summary">
                        <div class="card"><b>إجمالي المصروفات:</b> ${formatForPrint(totalAmount)}</div>
                        <div class="card"><b>ملاحظة:</b> هذا التقرير يعتمد على الفلاتر الحالية داخل دفتر الأستاذ</div>
                    </div>

                    <div class="section">
                        <div class="section-title">تفاصيل الحركات</div>
                        <table>
                            <thead>
                                <tr>
                                    <th>التاريخ</th>
                                    <th>الوصف</th>
                                    <th>المشروع</th>
                                    <th>المبلغ</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows || '<tr><td colspan="4">لا توجد بيانات للطباعة</td></tr>'}
                            </tbody>
                        </table>
                    </div>

                    <div class="footer">
                        <div>التوقيع/الختم: ____________________</div>
                        <div>تم إنشاء هذا التقرير من النظام</div>
                    </div>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '', 'height=800,width=1100');
        if (!printWindow) return;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    if (selectedCategory) {
        return (
            <div className="container mx-auto animate-fade-in-scale-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                        دفتر الأستاذ: {selectedCategory.name}
                    </h2>
                    <div className="flex items-center gap-3">
                        {filteredTransactions.length > 0 && (
                            <button
                                onClick={handlePrintLedger}
                                className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-semibold border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm flex items-center gap-2"
                            >
                                <PrinterIcon className="h-5 w-5" />
                                <span>طباعة</span>
                            </button>
                        )}
                        <button 
                            onClick={handleClearCategory}
                            className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        >
                            <span>العودة لجميع الفئات</span>
                            <ArrowRightIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="mb-6">
                    <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all min-w-[250px] font-medium"
                    >
                        <option value="">عرض كل المشاريع</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                        <table className="w-full text-right min-w-[800px]">
                            <thead>
                                <tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
                                    <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">التاريخ</th>
                                    <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الوصف</th>
                                    <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المشروع</th>
                                    <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المبلغ</th>
                                </tr>
                            </thead>
                            <tbody ref={tableBodyRef}>
                                {filteredTransactions.map(expense => (
                                    <tr key={expense.id} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                                        <td className="p-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">{expense.date}</td>
                                        <td className="p-4 font-medium text-slate-800 dark:text-slate-100">
                                            <div className="max-w-md truncate" title={expense.description}>
                                                {expense.description}
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300">{projects.find(p => p.id === expense.projectId)?.name || '—'}</td>
                                        <td className="p-4 font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">{formatCurrency(expense.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredTransactions.length === 0 && (
                        <div className="text-center py-12 px-4">
                            <svg className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">لا توجد حركات تطابق الفلتر المحدد</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">دفتر الأستاذ</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {categoryData.map(cat => (
                    <button 
                        key={cat.categoryId} 
                        onClick={() => handleSelectCategory(cat.categoryId)}
                        className="text-right p-5 rounded-2xl backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-white/10 hover:shadow-lg hover:shadow-black/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 p-3 rounded-xl backdrop-blur-sm bg-white/30 dark:bg-white/10 border border-white/20">
                                <TagIcon className="h-6 w-6 text-slate-700 dark:text-slate-200" />
                            </div>
                            <div className="flex-grow">
                                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-1">{cat.name}</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">إجمالي المصروفات:</p>
                                <p className="font-bold text-2xl text-rose-600 dark:text-rose-400 mb-1">{formatCurrency(cat.totalAmount)}</p>
                                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{`(${cat.transactionCount} حركة مالية)`}</p>
                            </div>
                        </div>
                    </button>
                ))}
                {categoryData.length === 0 && (
                     <div className="md:col-span-2 lg:col-span-3 xl:col-span-4 text-center p-12 backdrop-blur-xl bg-white/10 dark:bg-white/5 rounded-2xl border-2 border-dashed border-white/20 dark:border-white/10">
                        <TagIcon className="mx-auto h-16 w-16 text-slate-400 dark:text-slate-500 mb-4" />
                        <h4 className="mt-2 font-semibold text-slate-800 dark:text-slate-200">لا توجد حركات مالية</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">ابدأ بإضافة الحركات المالية لتظهر هنا.</p>
                   </div>
                )}
            </div>
        </div>
    );
};

export default CategoryAccounting;
