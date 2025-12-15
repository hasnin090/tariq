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
import { CloseIcon, ReceiptIcon, FileIcon, EyeIcon, PaperClipIcon, FilterIcon, XCircleIcon } from '../../shared/Icons.tsx';
import EmptyState from '../../shared/EmptyState.tsx';
import { useButtonPermissions } from '../../../hooks/useButtonPermission';

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
    
    // GSAP Table Animation Ref
    const tableBodyRef = useRef<HTMLTableSectionElement>(null);
    const hasAnimated = useRef(false);
    const ITEMS_PER_PAGE = 100;
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    const canEdit = currentUser?.role === 'Admin' || canShow('expenses', 'edit');
    const canDelete = currentUser?.role === 'Admin' || canShow('expenses', 'delete');
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

    useEffect(() => {
        const fetchExpenses = async () => {
            try {
                let expensesData = await expensesService.getAll();
                if (currentUser?.assignedProjectId) {
                    expensesData = expensesData.filter(e => e.projectId === currentUser.assignedProjectId);
                }
                
                // Load documents for each expense
                const expensesWithDocs = await Promise.all(expensesData.map(async (expense) => {
                    try {
                        const docs = await documentsService.getForExpense(expense.id);
                        if (docs && docs.length > 0) {
                            // Get signed URL for viewing
                            const signedUrl = await documentsService.getSignedUrl(docs[0].storagePath);
                            return {
                                ...expense,
                                documents: docs.map(d => ({
                                    id: d.id,
                                    name: d.fileName,
                                    fileName: d.fileName,
                                    mimeType: d.fileType || 'application/octet-stream',
                                    storagePath: d.storagePath,
                                    signedUrl,
                                }))
                            };
                        }
                    } catch (docError) {
                        // Ignore document loading errors
                    }
                    return expense;
                }));
                
                // Sort based on sortOrder
                const sorted = sortOrder === 'newest' 
                    ? expensesWithDocs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    : expensesWithDocs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setAllExpenses(sorted);
            } catch (error) {
                addToast('Failed to fetch expenses.', 'error');
            }
        };

        const fetchRelatedData = async () => {
            try {
                const [categoriesData, projectsData, accountsData] = await Promise.all([
                    expenseCategoriesService.getAll(),
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
            const sorted = sortOrder === 'newest'
                ? newExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                : newExpenses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setAllExpenses(sorted);
        });

        return () => {
            expenseSubscription.unsubscribe();
        };
    }, [currentUser, addToast, sortOrder]);

    useEffect(() => {
        const filtered = allExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            const startDate = filters.startDate ? new Date(filters.startDate) : null;
            const endDate = filters.endDate ? new Date(filters.endDate) : null;
            
            if(startDate && expenseDate < startDate) return false;
            if(endDate && expenseDate > endDate) return false;
            if(filters.categoryId && expense.categoryId !== filters.categoryId) return false;
            if(filters.projectId && expense.projectId !== filters.projectId) return false;
            if(filters.minAmount && expense.amount < parseFloat(filters.minAmount)) return false;
            if(filters.maxAmount && expense.amount > parseFloat(filters.maxAmount)) return false;
            
            // Search filter
            if(searchQuery && !expense.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            
            // Filter by activeProject for non-assigned users, or by assignedProjectId for assigned users
            if (currentUser?.assignedProjectId) {
                if (expense.projectId !== currentUser.assignedProjectId) return false;
            } else if (activeProject && expense.projectId !== activeProject.id) {
                return false;
            }
    
            return true;
        });
        setFilteredExpenses(filtered);
        setCurrentPage(1); // Reset to first page when filters change
    }, [filters, allExpenses, activeProject, currentUser, searchQuery]);

    const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE);
    const paginatedExpenses = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredExpenses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [currentPage, filteredExpenses]);

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
                    await transactionsService.update(updatedExpense.transactionId, {
                        accountId: expenseData.accountId,
                        accountName: '', // Account name will be populated by the backend
                        date: expenseData.date,
                        description: expenseData.description,
                        amount: expenseData.amount,
                    });
                }
                addToast(`تم تحديث الحركة المالية "${expenseData.description}" بمبلغ ${formatCurrency(expenseData.amount)} بنجاح`, 'success');
                logActivity('Update Expense', `Updated expense: ${expenseData.description} (Amount: ${expenseData.amount})`, 'expenses');
            } else {
                if (!currentUser?.assignedProjectId && !expenseData.accountId) {
                    addToast('الحساب المحدد غير صالح.', 'error');
                    setIsSaving(false);
                    return;
                }
                
                // Optimistic update - add temporary expense immediately
                const tempId = `temp_${Date.now()}`;
                const tempExpense = { ...expenseData, id: tempId };
                setAllExpenses(prev => [tempExpense, ...prev]);
                
                let newTransaction = null;
                
                // Only create transaction if user is not assigned to a project (expenses for project users deduct from project revenue)
                if (!currentUser?.assignedProjectId && expenseData.accountId) {
                    newTransaction = await transactionsService.create({
                        accountId: expenseData.accountId,
                        accountName: '', // Account name will be populated by the backend
                        type: 'Withdrawal',
                        date: expenseData.date,
                        description: expenseData.description,
                        amount: expenseData.amount,
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
                            documents[0].mimeType
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
                
                // Wait for animation - the subscription will automatically update allExpenses
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Precise success message
                addToast(`تم حذف الحركة المالية "${expenseDescription}" بمبلغ ${formatCurrency(expenseAmount)} بنجاح من قاعدة البيانات`, 'success');
                logActivity('Delete Expense', `Deleted expense: ${expenseDescription} (Amount: ${expenseAmount}, ID: ${expenseId})`, 'expenses');
                
            } catch (error) {
                console.error('Error deleting expense:', error);
                const errorMessage = error?.message || 'حدث خطأ غير متوقع';
                addToast(`فشل حذف الحركة المالية "${expenseDescription}". السبب: ${errorMessage}`, 'error');
                // No need to revert since we didn't remove from UI yet
            } finally {
                setDeletingId(null);
            }
        }
    };
    
    const inputStyle = "w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 text-sm";
    const selectStyle = `${inputStyle} bg-white dark:bg-slate-700`;
    
    const FilterBar = () => (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl mb-6 border border-slate-200 dark:border-slate-700">
            {/* Search Bar */}
            <div className="mb-4">
                <input 
                    type="text" 
                    placeholder="🔍 البحث في الوصف..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className={`${inputStyle} text-base`}
                />
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
                    <ColumnToggler visibleColumns={visibleColumns} onToggle={handleToggleColumn} />
                    {canAdd && (
                        <button onClick={() => handleOpenModal(null)} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-sm">
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
                            <table className="w-full text-right min-w-[800px]">
                            <thead><tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
                                {visibleColumns.date && <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">التاريخ</th>}
                                {visibleColumns.description && <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الوصف</th>}
                                {visibleColumns.category && <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الفئة</th>}
                                {visibleColumns.project && <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المشروع</th>}
                                {visibleColumns.amount && <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المبلغ</th>}
                                {visibleColumns.attachments && <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المرفقات</th>}
                                {visibleColumns.actions && (canEdit || canDelete) && <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">إجراءات</th>}
                            </tr></thead>
                            <tbody ref={tableBodyRef}>
                                {paginatedExpenses.map(exp => (
                                    <tr key={exp.id} className={`border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-300 ${
                                        deletingId === exp.id ? 'opacity-0 scale-95 bg-rose-50 dark:bg-rose-900/20' : 'opacity-100 scale-100'
                                    } ${
                                        exp.id.startsWith('temp_') ? 'animate-pulse bg-primary-50 dark:bg-primary-900/20' : ''
                                    }`}>
                                        {visibleColumns.date && <td className="p-4 text-slate-600 dark:text-slate-300">{exp.date}</td>}
                                        {visibleColumns.description && <td className="p-4 font-medium text-slate-800 dark:text-slate-100"><div className="max-w-xs truncate" title={exp.description}>{exp.description}</div></td>}
                                        {visibleColumns.category && <td className="p-4 text-slate-600 dark:text-slate-300">{categories.find(c=>c.id === exp.categoryId)?.name || '-'}</td>}
                                        {visibleColumns.project && <td className="p-4 text-slate-600 dark:text-slate-300">{projects.find(p=>p.id === exp.projectId)?.name || '-'}</td>}
                                        {visibleColumns.amount && <td className="p-4 font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(exp.amount)}</td>}
                                        {visibleColumns.attachments && <td className="p-4 text-center">
                                            {exp.documents && exp.documents.length > 0 && (
                                                <button onClick={() => setViewingAttachment(exp.documents![0])} className="text-primary-600 hover:text-primary-800 p-2 rounded-full hover:bg-primary-100 dark:hover:bg-primary-500/10" title="عرض المرفق">
                                                    <PaperClipIcon className="h-5 w-5" />
                                                </button>
                                            )}
                                        </td>}
                                        {visibleColumns.actions && (canEdit || canDelete) && (
                                        <td className="p-4 whitespace-nowrap">
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
    const [formData, setFormData] = useState({
        date: expense?.date || new Date().toISOString().split('T')[0],
        description: expense?.description || '',
        amount: expense?.amount || 0,
        categoryId: expense?.categoryId || '',
        projectId: expense?.projectId || currentUser?.assignedProjectId || '',
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
                            <input type="number" name="amount" placeholder="المبلغ" value={formData.amount || ''} onChange={handleChange} className={inputStyle} required min="0.01" step="0.01" />
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
    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <nav className="flex flex-wrap justify-center items-center gap-2 mt-6 p-4" aria-label="Pagination">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                السابق
            </button>
            
            {pageNumbers.map(number => (
                <button
                    key={number}
                    onClick={() => onPageChange(number)}
                    className={`px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${
                        currentPage === number
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                    aria-current={currentPage === number ? 'page' : undefined}
                >
                    {number}
                </button>
            ))}
            
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                التالي
            </button>
        </nav>
    );
};