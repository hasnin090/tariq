import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { Expense, ExpenseCategory, Project, Account, Transaction, SaleDocument } from '../../../types.ts';
import { useAuth } from '../../../contexts/AuthContext.tsx';
import { useToast } from '../../../contexts/ToastContext.tsx';
import { useProject } from '../../../contexts/ProjectContext';
import ProjectSelector from '../../shared/ProjectSelector';
import logActivity from '../../../utils/activityLogger.ts';
import { formatCurrency } from '../../../utils/currencyFormatter.ts';
import { expensesService, expenseCategoriesService, projectsService, transactionsService, accountsService, documentsService } from '../../../src/services/supabaseService.ts';
import ConfirmModal from '../../shared/ConfirmModal.tsx';
import { CloseIcon, ReceiptIcon, FileIcon, EyeIcon, PaperClipIcon, FilterIcon, XCircleIcon, PrinterIcon } from '../../shared/Icons.tsx';
import EmptyState from '../../shared/EmptyState.tsx';
import { useButtonPermissions } from '../../../hooks/useButtonPermission';
import AmountInput from '../../shared/AmountInput';

const AttachmentViewerModal: React.FC<{ document: SaleDocument | null, onClose: () => void }> = ({ document, onClose }) => {
    if (!document) return null;

    // Use signedUrl if available (from storage), otherwise use base64 content
    const url = (document as any).signedUrl || (document.content ? `data:${document.mimeType};base64,${document.content}` : '');

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex justify-center items-center p-4 pt-20 animate-drawer-overlay-show" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col animate-fade-in-scale-up" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{document.name || document.fileName}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <CloseIcon className="h-6 w-6"/>
                    </button>
                </div>
                <div className="flex-grow p-4 overflow-auto text-center">
                    {!url ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <FileIcon mimeType={document.mimeType} className="h-24 w-24 text-slate-400" />
                            <p className="mt-4 text-slate-600 dark:text-slate-300">لا يمكن تحميل هذا الملف.</p>
                        </div>
                    ) : document.mimeType?.startsWith('image/') ? (
                        <img src={url} alt={document.name} className="max-w-full max-h-full mx-auto object-contain" />
                    ) : document.mimeType === 'application/pdf' ? (
                        <iframe src={url} title={document.name} className="w-full h-full" />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                            <FileIcon mimeType={document.mimeType} className="h-24 w-24 text-slate-400" />
                            <p className="mt-4 text-slate-600 dark:text-slate-300">لا يمكن عرض هذا النوع من الملفات.</p>
                            <a href={url} download={document.name} className="mt-4 bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-sm">
                                تحميل الملف
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ColumnToggler: React.FC<{
    visibleColumns: { [key: string]: boolean };
    onToggle: (column: string) => void;
}> = ({ visibleColumns, onToggle }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const columns = [
        { key: 'date', label: 'التاريخ' },
        { key: 'description', label: 'الوصف' },
        { key: 'category', label: 'الفئة' },
        { key: 'project', label: 'المشروع' },
        { key: 'amount', label: 'المبلغ' },
        { key: 'attachments', label: 'المرفقات' },
        { key: 'actions', label: 'إجراءات' },
    ];

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-semibold border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm flex items-center gap-2"
            >
                <EyeIcon className="h-5 w-5" />
                <span>عرض الأعمدة</span>
            </button>
            {isOpen && (
                <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black dark:ring-slate-700 ring-opacity-5 z-20">
                    <div className="py-1">
                        {columns.map(col => (
                            <label key={col.key} className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                                <input
                                    type="checkbox"
                                    checked={!!visibleColumns[col.key]}
                                    onChange={() => onToggle(col.key)}
                                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span>{col.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export const Expenses: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const { activeProject, availableProjects, setActiveProject } = useProject();
    const { canShow } = useButtonPermissions();
    
    const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
    const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
    const [viewingAttachment, setViewingAttachment] = useState<SaleDocument | null>(null);
    const [expenseHasDocumentsById, setExpenseHasDocumentsById] = useState<Record<string, boolean>>({});
    const [showFilters, setShowFilters] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        categoryId: '',
        projectId: '',
        minAmount: '',
        maxAmount: '',
    });

    const [currentPage, setCurrentPage] = useState(1);
    const suppressNextPageResetRef = useRef(false);
    
    // GSAP Table Animation Ref
    const tableBodyRef = useRef<HTMLTableSectionElement>(null);
    const hasAnimated = useRef(false);
    const ITEMS_PER_PAGE = 100;
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    const canEdit = canShow('expenses', 'edit');
    const canDelete = canShow('expenses', 'delete');
    const canAdd = canShow('expenses', 'add');

    const [visibleColumns, setVisibleColumns] = useState(() => {
        const saved = localStorage.getItem('expenseVisibleColumns');
        return saved ? JSON.parse(saved) : {
            date: true,
            description: true,
            category: true,
            project: true,
            amount: true,
            attachments: true,
            actions: true,
        };
    });

    useEffect(() => {
        localStorage.setItem('expenseVisibleColumns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    const handleToggleColumn = (column: string) => {
        setVisibleColumns((prev: any) => ({ ...prev, [column]: !prev[column] }));
    };

    // ✅ المشروع المخصص للمستخدم (يُحفظ في متغير لاستخدامه في الفلترة)
    const userAssignedProjectId = currentUser?.assignedProjectId;

    // ✅ تتبع آخر مشروع تم تحميله لتجنب إعادة التحميل غير الضرورية
    // استخدام رمز خاص للدلالة على "لم يتم التحميل بعد"
    const INITIAL_LOAD = Symbol('INITIAL_LOAD');
    const lastLoadedProjectRef = useRef<string | null | typeof INITIAL_LOAD>(INITIAL_LOAD);

    useEffect(() => {
        const currentProjectId = userAssignedProjectId || activeProject?.id || null;
        
        // ✅ تجنب إعادة التحميل إذا لم يتغير المشروع (ولكن السماح بالتحميل الأول)
        if (lastLoadedProjectRef.current !== INITIAL_LOAD && lastLoadedProjectRef.current === currentProjectId) {
            console.log('⏭️ Skipping reload - same project:', currentProjectId);
            return;
        }
        
        lastLoadedProjectRef.current = currentProjectId;
        
        const fetchExpenses = async () => {
            try {
                let expensesData = await expensesService.getAll();
                console.log('📊 Expenses - Total fetched:', expensesData.length);
                
                // ✅ فلترة صارمة: حسب المشروع المخصص للمستخدم أو المشروع النشط
                const filterProjectId = userAssignedProjectId || activeProject?.id;
                console.log('📊 Expenses - Filter project:', {
                    userAssignedProjectId,
                    activeProjectId: activeProject?.id,
                    activeProjectName: activeProject?.name,
                    finalFilterProjectId: filterProjectId
                });
                
                if (filterProjectId) {
                    expensesData = expensesData.filter(e => e.projectId === filterProjectId);
                    console.log('📊 Expenses - After project filter:', expensesData.length);
                }

                // Sort based on sortOrder
                const sorted = sortOrder === 'newest' 
                    ? expensesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    : expensesData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setAllExpenses(sorted);
            } catch (error) {
                addToast('Failed to fetch expenses.', 'error');
            }
        };

        const fetchRelatedData = async () => {
            try {
                // جلب الفئات حسب المشروع النشط (بما في ذلك الفئات العامة)
                const projectIdForCategories = userAssignedProjectId || activeProject?.id || null;
                
                const [categoriesData, projectsData, accountsData] = await Promise.all([
                    expenseCategoriesService.getByProject(projectIdForCategories),
                    projectsService.getAll(),
                    accountsService.getAll(),
                ]);
                setCategories(categoriesData);
                setProjects(projectsData);
                setAccounts(accountsData);
            } catch (error) {
                addToast('Failed to fetch related data.', 'error');
            }
        };

        fetchExpenses();
        fetchRelatedData();

        const expenseSubscription = expensesService.subscribe((newExpenses) => {
            // ✅ فلترة صارمة حسب المشروع المخصص للمستخدم أو النشط
            let filtered = newExpenses;
            const filterProjectId = userAssignedProjectId || activeProject?.id;
            if (filterProjectId) {
                filtered = newExpenses.filter(e => e.projectId === filterProjectId);
            }
            
            const sorted = sortOrder === 'newest'
                ? filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                : filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setAllExpenses(sorted);
        });

        return () => {
            expenseSubscription.unsubscribe();
        };
    }, [userAssignedProjectId, addToast, sortOrder, activeProject]);

    // ✅ حالة للاحتفاظ بـ ID العنصر المطلوب عرضه من البحث
    const [searchTargetId, setSearchTargetId] = useState<string | null>(null);
    
    // ✅ قراءة searchFocus من sessionStorage عند كل تغيير (باستخدام custom event)
    useEffect(() => {
        const checkSearchFocus = () => {
            const searchFocusStr = sessionStorage.getItem('searchFocus');
            console.log('🔎 Checking searchFocus in Expenses:', searchFocusStr);
            if (searchFocusStr) {
                try {
                    const searchFocus = JSON.parse(searchFocusStr);
                    const currentProjectId = userAssignedProjectId || activeProject?.id;
                    const targetProjectId = searchFocus.projectId as string | undefined;

                    if (searchFocus.page !== 'expenses' || !searchFocus.id) return;

                    // ✅ للمستخدمين ذوي مشروع مخصص: لا يمكن التنقل خارج مشروعهم
                    if (userAssignedProjectId && targetProjectId && targetProjectId !== userAssignedProjectId) {
                        addToast('لا يمكن فتح حركة مالية ضمن مشروع آخر.', 'error');
                        return;
                    }

                    // ✅ للـ Admin: إذا كان هناك مشروع محدد في النتيجة ومشروع نشط مختلف، بدّل المشروع
                    if (!userAssignedProjectId && targetProjectId && currentProjectId && targetProjectId !== currentProjectId) {
                        const nextProject = availableProjects.find(p => p.id === targetProjectId) || null;
                        setActiveProject(nextProject);
                    }

                    console.log('🎯 Found search target:', searchFocus.id);
                    setSearchTargetId(searchFocus.id);
                    setSkipFilters(true); // تجاوز الفلاتر مؤقتاً
                } catch (e) {
                    console.error('Error parsing searchFocus:', e);
                }
            }
        };
        
        // فحص فوري عند التحميل
        checkSearchFocus();
        
        // الاستماع لحدث مخصص يُطلق من Header عند النقر على نتيجة البحث
        const handleSearchNavigate = (e: CustomEvent) => {
            console.log('📣 Received searchNavigate event:', e.detail);
            const currentProjectId = userAssignedProjectId || activeProject?.id;
            const targetProjectId = e.detail?.projectId as string | undefined;

            if (e.detail?.page !== 'expenses' || !e.detail?.id) return;

            // ✅ للمستخدمين ذوي مشروع مخصص: لا يمكن التنقل خارج مشروعهم
            if (userAssignedProjectId && targetProjectId && targetProjectId !== userAssignedProjectId) {
                addToast('لا يمكن فتح حركة مالية ضمن مشروع آخر.', 'error');
                return;
            }

            // ✅ للـ Admin: إذا كانت النتيجة ضمن مشروع محدد ومشروع نشط مختلف، بدّل المشروع
            if (!userAssignedProjectId && targetProjectId && currentProjectId && targetProjectId !== currentProjectId) {
                const nextProject = availableProjects.find(p => p.id === targetProjectId) || null;
                setActiveProject(nextProject);
            }

            setSearchTargetId(e.detail.id);
            setSkipFilters(true); // تجاوز الفلاتر مؤقتاً
        };
        
        window.addEventListener('searchNavigate', handleSearchNavigate as EventListener);
        
        return () => {
            window.removeEventListener('searchNavigate', handleSearchNavigate as EventListener);
        };
    }, [activeProject?.id, userAssignedProjectId, addToast, availableProjects, setActiveProject]);

    // ✅ حالة للبحث والتنقل
    const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
    const [skipFilters, setSkipFilters] = useState(false);

    useEffect(() => {
        // تطبيق الفلاتر على المصروفات
        let filtered = allExpenses;
        
        // ✅ دائماً نفلتر حسب المشروع المخصص للمستخدم (لا يُتجاوز أبداً)
        if (userAssignedProjectId) {
            filtered = filtered.filter(expense => expense.projectId === userAssignedProjectId);
        }
        
        // إذا كنا نبحث عن عنصر معين، نتجاوز الفلاتر الأخرى (لكن ليس فلتر المشروع)
        if (searchTargetId && skipFilters) {
            // نبقي على المصروفات المفلترة حسب المشروع فقط
            console.log('🔍 Skipping other filters for search target:', searchTargetId);
        } else {
            filtered = filtered.filter(expense => {
                const expenseDate = new Date(expense.date);
                const startDate = filters.startDate ? new Date(filters.startDate) : null;
                const endDate = filters.endDate ? new Date(filters.endDate) : null;
                
                if(startDate && expenseDate < startDate) return false;
                if(endDate && expenseDate > endDate) return false;
                if(filters.categoryId && expense.categoryId !== filters.categoryId) return false;
                if(filters.projectId && expense.projectId !== filters.projectId) return false;
                if(filters.minAmount && expense.amount < parseFloat(filters.minAmount)) return false;
                if(filters.maxAmount && expense.amount > parseFloat(filters.maxAmount)) return false;
                
                // Search filter - البحث في حقول متعددة
                if(searchQuery) {
                    const term = searchQuery.toLowerCase();
                    const matchDescription = expense.description?.toLowerCase().includes(term);
                    const matchCategory = expense.categoryName?.toLowerCase().includes(term);
                    const matchAmount = expense.amount?.toString().includes(term);
                    const matchNotes = expense.notes?.toLowerCase().includes(term);
                    const matchDate = expense.date?.includes(term);
                    
                    if (!matchDescription && !matchCategory && !matchAmount && !matchNotes && !matchDate) {
                        return false;
                    }
                }
                
                // Filter by activeProject (للمستخدمين غير المخصصين)
                if (!userAssignedProjectId && activeProject && expense.projectId !== activeProject.id) {
                    return false;
                }
        
                return true;
            });
        }
        
        setFilteredExpenses(filtered);
        console.log('📋 FilteredExpenses updated:', filtered.length, 'items, searchTargetId:', searchTargetId, 'skipFilters:', skipFilters);
        
        // لا نعيد تعيين الصفحة إذا كان هناك searchTargetId نشط
        if (!searchTargetId) {
            if (suppressNextPageResetRef.current) {
                console.log('📄 Skipping page reset (suppressed)');
                suppressNextPageResetRef.current = false;
            } else {
                console.log('📄 Resetting to page 1 (no searchTargetId)');
                setCurrentPage(1);
            }
        } else {
            console.log('📄 NOT resetting page because searchTargetId exists:', searchTargetId);
        }
    }, [filters, allExpenses, activeProject, userAssignedProjectId, searchQuery, searchTargetId, skipFilters]);

    // ✅ التعامل مع البحث والتنقل للعنصر المحدد
    
    useEffect(() => {
        if (!searchTargetId) return;
        
        const handleSearchNavigation = () => {
            // هذا التنقل يجب أن يكون ضمن نفس المشروع المعروض فقط.
            // ننتظر تحميل بيانات المشروع الحالي ثم نحدد الصفحة ونقوم بالتمرير.
            if (allExpenses.length === 0) {
                console.log('⏳ Waiting for expenses to load...');
                return;
            }

            // ✅ في حالة تبديل المشروع (Admin) قد تكون القائمة الحالية من مشروع سابق
            if (!userAssignedProjectId && activeProject && allExpenses.length > 0) {
                const listProjectId = allExpenses[0]?.projectId;
                if (listProjectId && listProjectId !== activeProject.id) {
                    console.log('⏳ Waiting for expenses list refresh after project switch...', {
                        activeProjectId: activeProject.id,
                        listProjectId,
                    });
                    return;
                }
            }

            const targetExpense = allExpenses.find(e => e.id === searchTargetId);

            if (!targetExpense) {
                console.log('❌ Expense not found in current project list:', searchTargetId);
                addToast('لم يتم العثور على الحركة المالية ضمن البيانات الحالية.', 'error');
                setSearchTargetId(null);
                setSkipFilters(false);
                sessionStorage.removeItem('searchFocus');
                return;
            }

            console.log('✅ Found expense:', targetExpense.description);
            
            // إذا skipFilters=true، نبحث في allExpenses مباشرة
            // وإلا نبحث في filteredExpenses
            const searchList = skipFilters ? allExpenses : filteredExpenses;
            const expenseIndex = searchList.findIndex(e => e.id === searchTargetId);
            
            if (expenseIndex === -1) {
                console.log('⚠️ Expense not in current list, skipFilters:', skipFilters);
                // إذا لم نجده ولم نكن نتجاوز الفلاتر، نفعّل تجاوز الفلاتر
                if (!skipFilters) {
                    console.log('🔄 Enabling skipFilters...');
                    setSkipFilters(true);
                }
                return;
            }
            
            // حساب رقم الصفحة
            const targetPage = Math.floor(expenseIndex / ITEMS_PER_PAGE) + 1;
            console.log('✅ Setting page to:', targetPage, 'for expense index:', expenseIndex, 'in list of', searchList.length);
            console.log('📊 Current page BEFORE setCurrentPage:', currentPage);
            
            // ✅ استخدام setTimeout لضمان أن React يُعالج تغيير الصفحة قبل أي شيء آخر
            setTimeout(() => {
                setCurrentPage(targetPage);
                console.log('📊 Called setCurrentPage with:', targetPage);
                
                // حفظ ID للتمرير بعد تأخير إضافي
                setTimeout(() => {
                    setPendingScrollId(searchTargetId);
                }, 100);
            }, 0);
            
            // مسح searchFocus من sessionStorage
            sessionStorage.removeItem('searchFocus');
        };
        
        handleSearchNavigation();
    }, [searchTargetId, filteredExpenses, allExpenses, skipFilters, activeProject, userAssignedProjectId, addToast]);

    const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE);
    const paginatedExpenses = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        console.log('📄 Paginating: currentPage=', currentPage, 'startIndex=', startIndex, 'total=', filteredExpenses.length);
        return filteredExpenses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [currentPage, filteredExpenses]);

    // ✅ المرحلة 2: التمرير للعنصر بعد تحديث الصفحة
    useEffect(() => {
        if (!pendingScrollId || paginatedExpenses.length === 0) return;
        
        // التأكد من أن العنصر موجود في الصفحة الحالية
        const targetExpense = paginatedExpenses.find(e => e.id === pendingScrollId);
        const isInCurrentPage = !!targetExpense;
        console.log('🎯 Scroll check - pendingScrollId:', pendingScrollId);
        console.log('🎯 Target expense found:', targetExpense?.description);
        console.log('🎯 isInCurrentPage:', isInCurrentPage);
        console.log('🎯 Current page number:', currentPage);
        console.log('🎯 Current page expenses count:', paginatedExpenses.length);
        
        if (!isInCurrentPage) {
            // ✅ إذا العنصر ليس في الصفحة الحالية، نعيد حساب الصفحة الصحيحة
            const searchList = skipFilters ? allExpenses : filteredExpenses;
            const expenseIndex = searchList.findIndex(e => e.id === pendingScrollId);
            if (expenseIndex !== -1) {
                const correctPage = Math.floor(expenseIndex / ITEMS_PER_PAGE) + 1;
                console.log('🔄 Recalculating page: index=', expenseIndex, 'correctPage=', correctPage);
                if (correctPage !== currentPage) {
                    setCurrentPage(correctPage);
                    return; // سيتم إعادة تشغيل هذا الـ effect بعد تحديث الصفحة
                }
            }
            console.log('⚠️ Element not in current page, waiting for re-render...');
            return;
        }
        
        const scrollToElement = () => {
            const element = document.getElementById(`item-${pendingScrollId}`) || 
                           document.querySelector(`[data-id="${pendingScrollId}"]`);
            console.log('🎯 Trying to scroll to element:', element);
            console.log('🎯 Element ID searched:', `item-${pendingScrollId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('search-highlight');
                setTimeout(() => element.classList.remove('search-highlight'), 3000);
                // مسح الحالات بعد التمرير بنجاح
                suppressNextPageResetRef.current = true;
                setSearchTargetId(null);
                setPendingScrollId(null);
                setSkipFilters(false); // إعادة تفعيل الفلاتر
                console.log('✅ Scroll completed successfully to:', targetExpense?.description);
            } else {
                // محاولة أخرى بعد وقت أطول
                setTimeout(() => {
                    const el = document.getElementById(`item-${pendingScrollId}`) || 
                               document.querySelector(`[data-id="${pendingScrollId}"]`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('search-highlight');
                        setTimeout(() => el.classList.remove('search-highlight'), 3000);
                        console.log('✅ Scroll completed on retry!');
                    } else {
                        console.log('❌ Element still not found after retry');
                    }
                    if (el) {
                        suppressNextPageResetRef.current = true;
                    }
                    setSearchTargetId(null);
                    setPendingScrollId(null);
                    setSkipFilters(false); // إعادة تفعيل الفلاتر
                }, 300);
            }
        };
        
        // انتظار للتأكد من رسم العنصر في DOM
        const timer = setTimeout(scrollToElement, 200);
        return () => clearTimeout(timer);
    }, [pendingScrollId, paginatedExpenses, currentPage, skipFilters, allExpenses, filteredExpenses]);

    // ✅ تحسين الأداء: تأجيل فحص المرفقات مع debounce وتخزين مؤقت
    useEffect(() => {
        if (!visibleColumns.attachments) return;

        const ids = paginatedExpenses
            .map(e => e.id)
            .filter(id => id && !id.startsWith('temp_'));

        if (ids.length === 0) return;

        // ✅ فحص الـ cache أولاً - تجنب الاستعلامات المتكررة
        const uncachedIds = ids.filter(id => !(id in expenseHasDocumentsById));
        if (uncachedIds.length === 0) return; // كل البيانات موجودة في الـ cache

        let cancelled = false;
        // ✅ Debounce: تأخير 300ms لتجنب الاستعلامات المتعددة عند التنقل السريع
        const timer = setTimeout(async () => {
            try {
                const idsWithDocs = await documentsService.getExpenseIdsWithDocuments(uncachedIds);
                if (cancelled) return;
                setExpenseHasDocumentsById(prev => {
                    const next = { ...prev };
                    for (const id of uncachedIds) {
                        next[id] = idsWithDocs.has(id);
                    }
                    return next;
                });
            } catch {
                // Keep UI stable if the check fails.
            }
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [paginatedExpenses, visibleColumns.attachments, expenseHasDocumentsById]);

    const handleViewFirstAttachment = async (expense: Expense) => {
        try {
            const inlineDoc = expense.documents?.[0];
            if (inlineDoc) {
                setViewingAttachment(inlineDoc);
                return;
            }

            const docs = await documentsService.getForExpense(expense.id);
            if (!docs || docs.length === 0) {
                setExpenseHasDocumentsById(prev => ({ ...prev, [expense.id]: false }));
                addToast('لا توجد مرفقات لهذه الحركة', 'error');
                return;
            }

            setExpenseHasDocumentsById(prev => ({ ...prev, [expense.id]: true }));

            const first = docs[0];
            const signedUrl = await documentsService.getSignedUrl(first.storagePath);

            const docForViewer: SaleDocument = {
                id: first.id,
                name: first.fileName,
                fileName: first.fileName,
                mimeType: first.fileType || 'application/octet-stream',
                storagePath: first.storagePath,
                // @ts-expect-error - viewer supports signedUrl as an optional runtime field
                signedUrl,
            };
            setViewingAttachment(docForViewer);
        } catch (error) {
            addToast('تعذر تحميل المرفق. حاول مرة أخرى.', 'error');
        }
    };

    const totalExpensesAmount = useMemo(() => {
        return filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    }, [filteredExpenses]);

    // 🎬 GSAP Table Animation - runs only once
    useLayoutEffect(() => {
        if (tableBodyRef.current && paginatedExpenses.length > 0 && !hasAnimated.current) {
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
    }, [paginatedExpenses]);



    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({...prev, [name]: value}));
    };
    
    const clearFilters = () => {
        setFilters({
            startDate: '',
            endDate: '',
            categoryId: '',
            projectId: '',
            minAmount: '',
            maxAmount: '',
        });
        setSearchQuery('');
    };

    const handlePrint = () => {
        if (!filteredExpenses.length) {
            addToast('لا توجد بيانات للطباعة حسب الفلاتر الحالية', 'error');
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

        const projectName = (() => {
            if (currentUser?.assignedProjectId) {
                return projects.find(p => p.id === currentUser.assignedProjectId)?.name || '—';
            }
            if (activeProject?.name) return String(activeProject.name);
            if (filters.projectId) return projects.find(p => p.id === filters.projectId)?.name || '—';
            return 'كل المشاريع';
        })();

        const categoryName = filters.categoryId
            ? (categories.find(c => c.id === filters.categoryId)?.name || '—')
            : 'كل الفئات';

        const dateRange = (() => {
            const start = filters.startDate ? new Date(filters.startDate).toLocaleDateString('ar-SA') : '';
            const end = filters.endDate ? new Date(filters.endDate).toLocaleDateString('ar-SA') : '';
            if (start && end) return `${start} - ${end}`;
            if (start) return `من ${start}`;
            if (end) return `حتى ${end}`;
            return '—';
        })();

        const rows = filteredExpenses
            .map(exp => {
                const cat = categories.find(c => c.id === exp.categoryId)?.name || '—';
                const proj = projects.find(p => p.id === exp.projectId)?.name || '—';
                return `
                    <tr>
                        <td class="nowrap">${escapeHtml(exp.date)}</td>
                        <td>${escapeHtml(exp.description)}</td>
                        <td>${escapeHtml(cat)}</td>
                        <td>${escapeHtml(proj)}</td>
                        <td class="nowrap">${formatForPrint(exp.amount)}</td>
                    </tr>
                `;
            })
            .join('');

        const html = `
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8" />
                <title>تقرير الحركات المالية</title>
                <style>${baseStyles}</style>
            </head>
            <body>
                <div class="sheet">
                    <div class="header">
                        <div class="brandbar"></div>
                        <div class="title">تقرير الحركات المالية (المصروفات)</div>
                        <div class="subtitle">تاريخ الطباعة: ${escapeHtml(new Date().toLocaleString('ar-SA'))}</div>
                        <div class="meta">
                            <div><b>المشروع:</b> ${escapeHtml(projectName)}</div>
                            <div><b>نوع المصروف:</b> ${escapeHtml(categoryName)}</div>
                            <div><b>الفترة:</b> ${escapeHtml(dateRange)}</div>
                            <div><b>عدد السجلات:</b> ${filteredExpenses.length}</div>
                        </div>
                    </div>

                    <div class="summary">
                        <div class="card"><b>إجمالي المصروفات:</b> ${formatForPrint(totalExpensesAmount)}</div>
                        <div class="card"><b>البحث:</b> ${escapeHtml(searchQuery?.trim() ? searchQuery.trim() : '—')}</div>
                    </div>

                    <div class="section">
                        <div class="section-title">تفاصيل الحركات</div>
                        <table>
                            <thead>
                                <tr>
                                    <th>التاريخ</th>
                                    <th>الوصف</th>
                                    <th>الفئة</th>
                                    <th>المشروع</th>
                                    <th>المبلغ</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows || '<tr><td colspan="5">لا توجد بيانات للطباعة</td></tr>'}
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

    const handleOpenModal = (expense: Expense | null) => {
        setEditingExpense(expense);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingExpense(null);
        setIsModalOpen(false);
    };

    const handleSave = async (expenseData: Omit<Expense, 'id'>) => {
        setIsSaving(true);
        try {
            if (editingExpense) {
                // Optimistic update
                setAllExpenses(prev => prev.map(exp => 
                    exp.id === editingExpense.id ? { ...exp, ...expenseData } : exp
                ));
                
                // Remove documents field before updating expense (documents are stored separately)
                const { documents, ...expenseDataWithoutDocs } = expenseData;
                
                const updatedExpense = await expensesService.update(editingExpense.id, expenseDataWithoutDocs);
                // Only update transaction if it exists and user is not assigned to a project
                if (updatedExpense && updatedExpense.transactionId && !currentUser?.assignedProjectId) {
                    // جلب صندوق المشروع تلقائياً إذا كان هناك مشروع محدد
                    let accountId = expenseData.accountId;
                    if (expenseData.projectId && !accountId) {
                        const projectCashbox = await accountsService.getOrCreateProjectCashbox(expenseData.projectId);
                        accountId = projectCashbox.id;
                    }
                    
                    await transactionsService.update(updatedExpense.transactionId, {
                        accountId: accountId,
                        accountName: '', // Account name will be populated by the backend
                        date: expenseData.date,
                        description: expenseData.description,
                        amount: expenseData.amount,
                        projectId: expenseData.projectId || null,
                    });
                }
                addToast(`تم تحديث الحركة المالية "${expenseData.description}" بمبلغ ${formatCurrency(expenseData.amount)} بنجاح`, 'success');
                logActivity('Update Expense', `Updated expense: ${expenseData.description} (Amount: ${expenseData.amount})`, 'expenses');
            } else {
                // جلب صندوق المشروع تلقائياً إذا كان هناك مشروع محدد ولم يتم تحديد حساب
                let accountId = expenseData.accountId;
                if (expenseData.projectId && !accountId) {
                    const projectCashbox = await accountsService.getOrCreateProjectCashbox(expenseData.projectId);
                    accountId = projectCashbox.id;
                }
                
                // تحقق من وجود حساب فقط إذا لم يكن المستخدم مرتبط بمشروع
                if (!currentUser?.assignedProjectId && !accountId) {
                    addToast('لا يوجد صندوق للمشروع. يرجى إنشاء صندوق أولاً.', 'error');
                    setIsSaving(false);
                    return;
                }
                
                // تحديث accountId في البيانات
                const expenseDataWithAccount = { ...expenseData, accountId };
                
                // Optimistic update - add temporary expense immediately
                const tempId = `temp_${Date.now()}`;
                const tempExpense = { ...expenseDataWithAccount, id: tempId };
                setAllExpenses(prev => [tempExpense, ...prev]);
                
                let newTransaction = null;
                
                // إنشاء الحركة المالية - تخصم من صندوق المشروع تلقائياً
                if (accountId) {
                    newTransaction = await transactionsService.create({
                        accountId: accountId,
                        accountName: '', // Account name will be populated by the backend
                        type: 'Withdrawal',
                        date: expenseData.date,
                        description: expenseData.description,
                        amount: expenseData.amount,
                        projectId: expenseData.projectId || null,
                        sourceType: 'Expense',
                    });

                    if (!newTransaction) {
                        throw new Error("Failed to create transaction");
                    }
                }

                // Remove documents field before creating expense (documents are stored separately)
                const { documents, ...expenseDataWithoutDocs } = expenseData;

                // Then create expense and link it to the transaction (if exists)
                const newExpense = await expensesService.create({ 
                    ...expenseDataWithoutDocs, 
                    transactionId: newTransaction?.id || null 
                });

                // Update transaction with the sourceId (if transaction exists)
                if (newTransaction) {
                    await transactionsService.update(newTransaction.id, { sourceId: newExpense.id });
                }

                // Upload document if exists
                if (documents && documents.length > 0 && documents[0].content) {
                    try {
                        await documentsService.uploadForExpense(
                            newExpense.id,
                            documents[0].fileName || documents[0].name,
                            documents[0].content,
                            documents[0].mimeType,
                            newExpense.projectId
                        );
                        // Add document to the new expense
                        newExpense.documents = documents;
                    } catch (docError) {
                        console.error('Error uploading document:', docError);
                        // Don't fail the whole operation if document upload fails
                    }
                }

                // Replace temp expense with real one
                setAllExpenses(prev => prev.map(exp => 
                    exp.id === tempId ? newExpense : exp
                ));

                addToast(`تمت إضافة الحركة المالية "${newExpense.description}" بمبلغ ${formatCurrency(newExpense.amount)} بنجاح إلى قاعدة البيانات`, 'success');
                logActivity('Add Expense', `Added expense: ${newExpense.description} (Amount: ${newExpense.amount}, ID: ${newExpense.id})`, 'expenses');
            }
            handleCloseModal();
        } catch (error) {
            console.error('Error saving expense:', error);
            // Remove temp expense on error
            if (!editingExpense) {
                setAllExpenses(prev => prev.filter(exp => !exp.id.startsWith('temp_')));
            }
            const operation = editingExpense ? 'تحديث' : 'إضافة';
            const errorMessage = error?.message || 'حدث خطأ غير متوقع';
            addToast(`فشل ${operation} الحركة المالية. السبب: ${errorMessage}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

     const handleDeleteRequest = (expense: Expense) => {
        setExpenseToDelete(expense);
    };

    const confirmDelete = async () => {
        if (expenseToDelete) {
            const expenseId = expenseToDelete.id;
            const expenseDescription = expenseToDelete.description;
            const expenseAmount = expenseToDelete.amount;
            const transactionId = expenseToDelete.transactionId;
            
            try {
                // Close modal first
                setExpenseToDelete(null);
                
                // Start delete animation
                setDeletingId(expenseId);
                
                // Delete from database first (before updating UI)
                if (transactionId) {
                    await transactionsService.delete(transactionId);
                }
                await expensesService.delete(expenseId);
                
                // ✅ تحديث الحالة المحلية فوراً لإزالة الحركة من الواجهة
                setAllExpenses(prev => prev.filter(e => e.id !== expenseId));
                
                // Wait for animation
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Precise success message
                addToast(`تم حذف الحركة المالية "${expenseDescription}" بمبلغ ${formatCurrency(expenseAmount)} بنجاح من قاعدة البيانات`, 'success');
                logActivity('Delete Expense', `Deleted expense: ${expenseDescription} (Amount: ${expenseAmount}, ID: ${expenseId})`, 'expenses');
                
            } catch (error) {
                console.error('Error deleting expense:', error);
                const errorMessage = error?.message || 'حدث خطأ غير متوقع';
                addToast(`فشل حذف الحركة المالية "${expenseDescription}". السبب: ${errorMessage}`, 'error');
                // ✅ في حالة الخطأ، أعد تحميل البيانات لاستعادة الحالة الصحيحة
                const data = await expensesService.getAll();
                setAllExpenses(data);
            } finally {
                setDeletingId(null);
            }
        }
    };
    
    const inputStyle = "w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 text-sm";
    const selectStyle = `${inputStyle} bg-white dark:bg-slate-700`;
    
    const FilterBar = () => (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl mb-6 border border-slate-200 dark:border-slate-700">
            {/* Search Bar - محسّن */}
            <div className="mb-4">
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="🔍 البحث في الوصف، الفئة، المبلغ، التاريخ..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        className={`${inputStyle} text-base pl-10`}
                    />
                    {searchQuery && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs bg-primary-500 text-white px-2 py-1 rounded-full">
                            {filteredExpenses.length} نتيجة
                        </span>
                    )}
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <select name="categoryId" value={filters.categoryId} onChange={handleFilterChange} className={selectStyle}>
                    <option value="">كل الفئات</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className={inputStyle} title="تاريخ البدء" />
                <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className={inputStyle} title="تاريخ الانتهاء" />
                <input type="number" name="minAmount" placeholder="أقل مبلغ" value={filters.minAmount} onChange={handleFilterChange} className={inputStyle} />
                <input type="number" name="maxAmount" placeholder="أعلى مبلغ" value={filters.maxAmount} onChange={handleFilterChange} className={inputStyle} />
            </div>
            <div className="mt-4 flex justify-end">
                <button onClick={clearFilters} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-400">
                    <XCircleIcon className="h-5 w-5" />
                    <span>مسح الفلاتر والبحث</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="container mx-auto">
             <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">الحركات المالية (المصروفات)</h2>
                    <div className="flex items-center gap-4 mt-2">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            العدد الكلي: <span className="font-bold text-primary-600 dark:text-primary-400">{allExpenses.length}</span>
                        </p>
                        {filteredExpenses.length !== allExpenses.length && (
                            <>
                                <span className="text-slate-300 dark:text-slate-600">|</span>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    المعروض: <span className="font-bold text-primary-600 dark:text-primary-400">{filteredExpenses.length}</span>
                                </p>
                            </>
                        )}
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            المجموع: <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(totalExpensesAmount)}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <select 
                        value={sortOrder} 
                        onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                        className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-semibold border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm cursor-pointer"
                    >
                        <option value="newest">الأحدث أولاً</option>
                        <option value="oldest">الأقدم أولاً</option>
                    </select>
                    <button onClick={() => setShowFilters(prev => !prev)} className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-semibold border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm flex items-center gap-2">
                        <FilterIcon className="h-5 w-5" />
                        <span>تصفية</span>
                    </button>
                    {filteredExpenses.length > 0 && (
                        <button
                            onClick={handlePrint}
                            className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-semibold border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm flex items-center gap-2"
                        >
                            <PrinterIcon className="h-5 w-5" />
                            <span>طباعة</span>
                        </button>
                    )}
                    <ColumnToggler visibleColumns={visibleColumns} onToggle={handleToggleColumn} />
                    {canAdd && (
                        <button 
                            onClick={() => handleOpenModal(null)} 
                            disabled={!currentUser?.assignedProjectId && !activeProject}
                            className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!currentUser?.assignedProjectId && !activeProject ? 'يرجى تحديد مشروع أولاً' : ''}
                        >
                            إضافة حركة
                        </button>
                    )}
                </div>
            </div>
            
            {!currentUser?.assignedProjectId && (
                <ProjectSelector 
                    projects={availableProjects} 
                    activeProject={activeProject} 
                    onSelectProject={setActiveProject} 
                />
            )}
            
            {showFilters && <FilterBar />}
             {filteredExpenses.length > 0 ? (
                <>
                    <div className="glass-card overflow-hidden">
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                            <table className="w-full text-right min-w-[720px] sm:min-w-[900px] border-collapse table-fixed text-xs sm:text-sm">
                            <thead>
                                <tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
                                {visibleColumns.date && <th className="sticky top-0 z-10 p-2 sm:p-3 font-bold text-sm text-slate-700 dark:text-slate-200 border-l border-slate-200 dark:border-slate-600 first:border-l-0 w-28 sm:w-32 whitespace-nowrap bg-slate-100 dark:bg-slate-700">التاريخ</th>}
                                {visibleColumns.description && <th className="sticky top-0 z-10 p-2 sm:p-3 font-bold text-sm text-slate-700 dark:text-slate-200 border-l border-slate-200 dark:border-slate-600 first:border-l-0 w-[40%] bg-slate-100 dark:bg-slate-700">تفاصيل الحركة المالية</th>}
                                {visibleColumns.category && <th className="sticky top-0 z-10 p-2 sm:p-3 font-bold text-sm text-slate-700 dark:text-slate-200 border-l border-slate-200 dark:border-slate-600 first:border-l-0 w-36 sm:w-44 bg-slate-100 dark:bg-slate-700">الفئة</th>}
                                {visibleColumns.project && <th className="sticky top-0 z-10 p-2 sm:p-3 font-bold text-sm text-slate-700 dark:text-slate-200 border-l border-slate-200 dark:border-slate-600 first:border-l-0 w-40 sm:w-48 bg-slate-100 dark:bg-slate-700">المشروع</th>}
                                {visibleColumns.amount && <th className="sticky top-0 z-10 p-2 sm:p-3 font-bold text-sm text-slate-700 dark:text-slate-200 border-l border-slate-200 dark:border-slate-600 first:border-l-0 w-32 sm:w-40 whitespace-nowrap bg-slate-100 dark:bg-slate-700">المبلغ</th>}
                                {visibleColumns.attachments && <th className="sticky top-0 z-10 p-2 sm:p-3 font-bold text-sm text-slate-700 dark:text-slate-200 border-l border-slate-200 dark:border-slate-600 first:border-l-0 w-20 sm:w-28 text-center bg-slate-100 dark:bg-slate-700">المرفقات</th>}
                                {visibleColumns.actions && (canEdit || canDelete) && <th className="sticky top-0 z-10 p-2 sm:p-3 font-bold text-sm text-slate-700 dark:text-slate-200 border-l border-slate-200 dark:border-slate-600 first:border-l-0 w-28 sm:w-32 bg-slate-100 dark:bg-slate-700">إجراءات</th>}
                                </tr>
                            </thead>
                            <tbody ref={tableBodyRef}>
                                {paginatedExpenses.map(exp => (
                                    <tr key={exp.id} data-id={exp.id} id={`item-${exp.id}`} className={`border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-300 ${
                                        deletingId === exp.id ? 'opacity-0 scale-95 bg-rose-50 dark:bg-rose-900/20' : 'opacity-100 scale-100'
                                    } ${
                                        exp.id.startsWith('temp_') ? 'animate-pulse bg-primary-50 dark:bg-primary-900/20' : ''
                                    }`}>
                                        {visibleColumns.date && <td className="p-2 sm:p-3 text-sm text-slate-600 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700 first:border-l-0 whitespace-nowrap align-top">{exp.date}</td>}
                                        {visibleColumns.description && (
                                            <td className="p-2 sm:p-3 text-[11px] sm:text-xs text-slate-800 dark:text-slate-100 border-l border-slate-200 dark:border-slate-700 first:border-l-0 align-top">
                                                <div
                                                    className="w-full whitespace-normal break-words leading-5 max-h-14 sm:max-h-16 overflow-hidden"
                                                    title={exp.description}
                                                >
                                                    {exp.description}
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.category && (
                                            <td className="p-2 sm:p-3 text-sm text-slate-600 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700 first:border-l-0 align-top">
                                                <div className="truncate" title={categories.find(c=>c.id === exp.categoryId)?.name || '-'}>
                                                    {categories.find(c=>c.id === exp.categoryId)?.name || '-'}
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.project && (
                                            <td className="p-2 sm:p-3 text-sm text-slate-600 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700 first:border-l-0 align-top">
                                                <div className="truncate" title={projects.find(p=>p.id === exp.projectId)?.name || '-'}>
                                                    {projects.find(p=>p.id === exp.projectId)?.name || '-'}
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.amount && <td className="p-2 sm:p-3 text-sm font-semibold text-rose-600 dark:text-rose-400 border-l border-slate-200 dark:border-slate-700 first:border-l-0 whitespace-nowrap align-top">{formatCurrency(exp.amount)}</td>}
                                        {visibleColumns.attachments && <td className="p-2 sm:p-3 text-center border-l border-slate-200 dark:border-slate-700 first:border-l-0 align-top">
                                            {((exp.documents && exp.documents.length > 0) || expenseHasDocumentsById[exp.id]) && (
                                                <button onClick={() => handleViewFirstAttachment(exp)} className="text-primary-600 hover:text-primary-800 p-2 rounded-full hover:bg-primary-100 dark:hover:bg-primary-500/10" title="عرض المرفق">
                                                    <PaperClipIcon className="h-5 w-5" />
                                                </button>
                                            )}
                                        </td>}
                                        {visibleColumns.actions && (canEdit || canDelete) && (
                                        <td className="p-2 sm:p-3 whitespace-nowrap border-l border-slate-200 dark:border-slate-700 first:border-l-0 align-top">
                                            {canEdit && (
                                                <button onClick={() => handleOpenModal(exp)} className="text-primary-600 dark:text-primary-400 hover:underline font-semibold ml-4">تعديل</button>
                                            )}
                                            {canDelete && (
                                            <button onClick={() => handleDeleteRequest(exp)} className="text-rose-600 dark:text-rose-400 hover:underline font-semibold">حذف</button>
                                            )}
                                        </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    </div>
                     {totalPages > 1 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    )}
                </>
            ) : (
                allExpenses.length > 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700">
                        <FilterIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <h3 className="mt-2 text-lg font-medium text-slate-900 dark:text-slate-100">لا توجد نتائج مطابقة</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">حاول تعديل الفلاتر أو مسحها لعرض المزيد من النتائج.</p>
                    </div>
                ) : (
                     <EmptyState
                        Icon={ReceiptIcon}
                        title="لا توجد حركات مالية"
                        message="ابدأ بتسجيل مصروفاتك لتتبع نفقاتك."
                        actionButton={canAdd ? { text: 'إضافة حركة', onClick: () => handleOpenModal(null) } : undefined}
                    />
                )
            )}
            {isModalOpen && <ExpensePanel expense={editingExpense} categories={categories} projects={projects} accounts={accounts} onClose={handleCloseModal} onSave={handleSave} isSaving={isSaving} />}
            <ConfirmModal isOpen={!!expenseToDelete} onClose={() => setExpenseToDelete(null)} onConfirm={confirmDelete} title="تأكيد الحذف" message="هل أنت متأكد من حذف هذه الحركة المالية؟" />
            <AttachmentViewerModal document={viewingAttachment} onClose={() => setViewingAttachment(null)} />
        </div>
    );
};


interface PanelProps {
    expense: Expense | null;
    categories: ExpenseCategory[];
    projects: Project[];
    accounts: Account[];
    onClose: () => void;
    onSave: (data: Omit<Expense, 'id'>) => void;
    isSaving: boolean;
}

const ExpensePanel: React.FC<PanelProps> = ({ expense, categories, projects, accounts, onClose, onSave, isSaving }) => {
    const { addToast } = useToast();
    const { currentUser } = useAuth();
    const { activeProject } = useProject();
    const [formData, setFormData] = useState({
        date: expense?.date || new Date().toISOString().split('T')[0],
        description: expense?.description || '',
        amount: expense?.amount || 0,
        categoryId: expense?.categoryId || '',
        projectId: expense?.projectId || currentUser?.assignedProjectId || activeProject?.id || '',
        accountId: expense?.accountId || '',
    });
    const [document, setDocument] = useState<SaleDocument | null>(expense?.documents?.[0] || null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const newDoc: SaleDocument = {
                    id: `doc_${Date.now()}`,
                    name: file.name,
                    type: 'إيصال/فاتورة',
                    fileName: file.name,
                    content: (loadEvent.target?.result as string).split(',')[1], // Base64 content
                    mimeType: file.type,
                };
                setDocument(newDoc);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const accountRequired = !currentUser?.assignedProjectId;
        if (!formData.description || formData.amount <= 0 || !formData.categoryId || (accountRequired && !formData.accountId)) {
            addToast('يرجى ملء الحقول الإلزامية.', 'error');
            return;
        }
        const expenseData = { ...formData, documents: document ? [document] : [] };
        onSave(expenseData as Omit<Expense, 'id'>);
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'amount' ? Number(value) : value,
        }));
    };
    
    const inputStyle = "w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200";
    const selectStyle = `${inputStyle} bg-white dark:bg-slate-700`;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4 pt-20 animate-drawer-overlay-show" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl animate-fade-in-scale-up" onClick={e => e.stopPropagation()}>
                 <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start"><h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{expense ? 'تعديل' : 'إضافة'} حركة</h2><button type="button" onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><CloseIcon className="h-6 w-6"/></button></div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <input type="text" name="description" placeholder="الوصف" value={formData.description} onChange={handleChange} className={inputStyle} required />
                        <div className="grid grid-cols-2 gap-4">
                            <input type="date" name="date" value={formData.date} onChange={handleChange} className={inputStyle} required />
                            <AmountInput
                                value={formData.amount || ''}
                                onValueChange={(amount) => setFormData(prev => ({ ...prev, amount: amount === '' ? 0 : amount }))}
                                className={inputStyle}
                                placeholder="المبلغ"
                            />
                        </div>
                        {!currentUser?.assignedProjectId && (
                            <select name="accountId" value={formData.accountId} onChange={handleChange} className={selectStyle} required>
                                <option value="">اختر الحساب</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type === 'Bank' ? 'بنك' : 'نقدي'})</option>)}
                            </select>
                        )}
                        <select name="categoryId" value={formData.categoryId} onChange={handleChange} className={selectStyle} required><option value="">اختر فئة</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                        {currentUser?.assignedProjectId ? (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                                    المشروع: {projects.find(p => p.id === currentUser.assignedProjectId)?.name || 'غير محدد'}
                                </p>
                            </div>
                        ) : formData.projectId ? (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg p-3">
                                <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium">
                                    المشروع المحدد: {projects.find(p => p.id === formData.projectId)?.name || 'غير محدد'}
                                </p>
                            </div>
                        ) : (
                            <select name="projectId" value={formData.projectId} onChange={handleChange} className={selectStyle}><option value="">اختر مشروع (اختياري)</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">إرفاق مستند (اختياري)</label>
                            <input type="file" onChange={handleFileChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-500/10 dark:file:text-primary-300 dark:hover:file:bg-primary-500/20"/>
                            {document && (
                                <div className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                    <FileIcon mimeType={document.mimeType} className="h-5 w-5" />
                                    <span>{document.name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4"><button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold" disabled={isSaving}>إلغاء</button><button type="submit" className="bg-primary-600 text-white px-8 py-2 rounded-lg hover:bg-primary-700 font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 justify-center" disabled={isSaving}>{isSaving ? <><svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>جاري الحفظ...</> : 'حفظ'}</button></div>
                </form>
            </div>
        </div>
    )
};

const Pagination: React.FC<{
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
    return (
        <nav className="flex flex-wrap justify-center items-center gap-2 mt-6 p-4" aria-label="Pagination">
            {/* زر الأولى */}
            <button
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                الأولى
            </button>
            
            {/* زر السابق */}
            <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                السابق
            </button>
            
            {/* أرقام الصفحات - عرض 5 صفحات كحد أقصى */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                    // إذا كان إجمالي الصفحات 5 أو أقل، اعرضهم جميعاً
                    pageNum = i + 1;
                } else if (currentPage <= 3) {
                    // إذا كنا في بداية القائمة، اعرض أول 5 صفحات
                    pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                    // إذا كنا في نهاية القائمة، اعرض آخر 5 صفحات
                    pageNum = totalPages - 4 + i;
                } else {
                    // في الوسط، اعرض الصفحة الحالية في المنتصف
                    pageNum = currentPage - 2 + i;
                }
                return (
                    <button
                        key={pageNum}
                        onClick={() => onPageChange(pageNum)}
                        className={`px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${
                            currentPage === pageNum
                                ? 'bg-primary-600 text-white border-primary-600'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                        aria-current={currentPage === pageNum ? 'page' : undefined}
                    >
                        {pageNum}
                    </button>
                );
            })}
            
            {/* زر التالي */}
            <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                التالي
            </button>
            
            {/* زر الأخيرة */}
            <button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                الأخيرة
            </button>
        </nav>
    );
};