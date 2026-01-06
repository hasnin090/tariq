import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { InterfaceMode, Unit, Customer, Booking, Expense, Payment, SearchResult, Project } from '../types';
import { pageNames } from '../utils/pageNames';
import { unitsService, customersService, bookingsService, expensesService, paymentsService, projectsService } from '../src/services/supabaseService';
import { CalendarIcon, BriefcaseIcon, BellIcon } from './shared/Icons';
import { supabase } from '../src/lib/supabase';

const Header: React.FC<{
    activePage: string;
    interfaceMode: InterfaceMode;
    setInterfaceMode: (mode: InterfaceMode) => void;
    setActivePage: (page: string) => void;
    onToggleSidebar: () => void;
}> = ({ activePage, interfaceMode, setInterfaceMode, setActivePage, onToggleSidebar }) => {
    const { currentUser, logout } = useAuth();
    const { activeProject } = useProject();
    const [isUserMenuVisible, setIsUserMenuVisible] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentDate, setCurrentDate] = useState('الثلاثاء، 4 نوفمبر 2025');
    const userMenuRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
    const [connectionLatency, setConnectionLatency] = useState<number | null>(null);
    const [showConnectionTooltip, setShowConnectionTooltip] = useState(false);
    const connectionCheckInterval = useRef<NodeJS.Timeout | null>(null);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    
    const pageName = useMemo(() => {
        let modeName = interfaceMode === 'projects' ? 'إدارة المبيعات' : 'الإدارة المحاسبية';
        const breadcrumb = pageNames[activePage] || 'الصفحة الرئيسية';
        return `${modeName} / ${breadcrumb}`;
    }, [activePage, interfaceMode]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
             if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuVisible(false);
            }
             if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const projectsData = await projectsService.getAll();
                setProjects(projectsData);
            } catch (error) {
                console.error("Failed to fetch projects", error);
            }
        };
        fetchProjects();
    }, []);

    // Database connection check - Real-time latency monitoring
    useEffect(() => {
        const checkConnection = async () => {
            const startTime = Date.now();
            try {
                const { error } = await supabase.from('projects').select('id').limit(1);
                const latency = Date.now() - startTime;
                
                if (error) {
                    setConnectionStatus('disconnected');
                    setConnectionLatency(null);
                } else {
                    setConnectionStatus('connected');
                    setConnectionLatency(latency);
                }
            } catch (error) {
                setConnectionStatus('disconnected');
                setConnectionLatency(null);
            }
        };

        checkConnection();
        // فحص كل 3 ثواني للحصول على قراءات آنية وحقيقية
        connectionCheckInterval.current = setInterval(checkConnection, 3000);

        return () => {
            if (connectionCheckInterval.current) {
                clearInterval(connectionCheckInterval.current);
            }
        };
    }, []);

    // Fetch unread notifications count
    useEffect(() => {
        const fetchNotifications = async () => {
            if (!currentUser?.id) return;
            try {
                const { data, error } = await supabase
                    .from('notifications')
                    .select('id')
                    .eq('user_id', currentUser.id)
                    .eq('is_read', false);
                
                if (!error && data) {
                    setUnreadNotifications(data.length);
                }
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Check every 30 seconds

        return () => clearInterval(interval);
    }, [currentUser]);

    const assignedProjectName = useMemo(() => {
        if (currentUser?.assignedProjectId) {
            return projects.find(p => p.id === currentUser.assignedProjectId)?.name;
        }
        return null;
    }, [currentUser, projects]);

    // تحديد أنواع البيانات للبحث حسب الصفحة الحالية
    const searchContext = useMemo(() => {
        const salesPages = ['dashboard', 'units', 'customers', 'bookings', 'payments', 'sales', 'sales-documents'];
        const expensePages = ['expense_dashboard', 'expenses', 'treasury', 'deferred-payments', 'employees', 'budgets', 'financial-reports', 'projects-accounting', 'category-accounting', 'documents-accounting'];
        
        // إذا كنا في صفحة محددة، نبحث في نوع البيانات المرتبط بها فقط
        switch (activePage) {
            case 'units': return ['units'];
            case 'customers': return ['customers'];
            case 'bookings': return ['bookings'];
            case 'payments': return ['payments'];
            case 'expenses': return ['expenses'];
            case 'employees': return ['employees'];
            case 'projects': 
            case 'projects-management': 
            case 'projects-accounting': return ['projects'];
            case 'sales':
            case 'sales-documents': return ['bookings', 'payments'];
            default:
                // إذا في وضع المبيعات نبحث في بيانات المبيعات
                if (interfaceMode === 'projects' || salesPages.includes(activePage)) {
                    return ['units', 'customers', 'bookings', 'payments'];
                }
                // إذا في وضع المحاسبة نبحث في بيانات المحاسبة
                if (interfaceMode === 'expenses' || expensePages.includes(activePage)) {
                    return ['expenses'];
                }
                return ['units', 'customers', 'bookings', 'expenses', 'payments'];
        }
    }, [activePage, interfaceMode]);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setSearchResults([]);
            return;
        }

        const fetchResults = async () => {
            try {
                const term = searchTerm.toLowerCase().trim();
                const results: SearchResult[] = [];

                // جلب البيانات حسب السياق فقط (لتحسين الأداء)
                const fetchPromises: Promise<any>[] = [];
                const fetchTypes: string[] = [];

                if (searchContext.includes('units')) {
                    fetchPromises.push(unitsService.getAll());
                    fetchTypes.push('units');
                }
                if (searchContext.includes('customers')) {
                    fetchPromises.push(customersService.getAll());
                    fetchTypes.push('customers');
                }
                if (searchContext.includes('bookings')) {
                    fetchPromises.push(bookingsService.getAll());
                    fetchTypes.push('bookings');
                }
                if (searchContext.includes('expenses')) {
                    fetchPromises.push(expensesService.getAll());
                    fetchTypes.push('expenses');
                }
                if (searchContext.includes('payments')) {
                    fetchPromises.push(paymentsService.getAll());
                    fetchTypes.push('payments');
                }

                const fetchedData = await Promise.all(fetchPromises);
                const dataMap: Record<string, any[]> = {};
                fetchTypes.forEach((type, index) => {
                    dataMap[type] = fetchedData[index] || [];
                });

                // البحث في الوحدات
                if (dataMap.units) {
                    dataMap.units
                        .filter((u: Unit) => u.name?.toLowerCase().includes(term) || (u.location && u.location.toLowerCase().includes(term)))
                        .slice(0, 5)
                        .forEach((u: Unit) => results.push({ 
                            id: u.id, 
                            name: u.name, 
                            type: 'وحدة', 
                            page: 'units' 
                        }));
                }

                // البحث في العملاء
                if (dataMap.customers) {
                    dataMap.customers
                        .filter((c: Customer) => 
                            c.name?.toLowerCase().includes(term) || 
                            (c.phone && c.phone.includes(term)) ||
                            (c.email && c.email.toLowerCase().includes(term))
                        )
                        .slice(0, 5)
                        .forEach((c: Customer) => results.push({ 
                            id: c.id, 
                            name: c.name, 
                            type: 'عميل', 
                            page: 'customers' 
                        }));
                }

                // البحث في الحجوزات
                if (dataMap.bookings) {
                    dataMap.bookings
                        .filter((b: Booking) => 
                            b.unitName?.toLowerCase().includes(term) || 
                            b.customerName?.toLowerCase().includes(term) ||
                            (b.notes && b.notes.toLowerCase().includes(term))
                        )
                        .slice(0, 5)
                        .forEach((b: Booking) => results.push({ 
                            id: b.id, 
                            name: `${b.unitName || ''} - ${b.customerName || ''}`, 
                            type: 'حجز', 
                            page: 'bookings' 
                        }));
                }

                // البحث في المصروفات (فلترة حسب المشروع النشط)
                if (dataMap.expenses) {
                    let filteredExpenses = dataMap.expenses;
                    
                    // فلترة حسب المشروع النشط إذا كان محدداً
                    if (activeProject) {
                        filteredExpenses = filteredExpenses.filter((e: Expense) => e.projectId === activeProject.id);
                    }
                    // أو فلترة حسب المشروع المخصص للمستخدم
                    else if (currentUser?.assignedProjectId) {
                        filteredExpenses = filteredExpenses.filter((e: Expense) => e.projectId === currentUser.assignedProjectId);
                    }
                    
                    filteredExpenses
                        .filter((e: Expense) => 
                            e.description?.toLowerCase().includes(term) ||
                            (e.categoryName && e.categoryName.toLowerCase().includes(term)) ||
                            (e.amount && e.amount.toString().includes(term)) ||
                            (e.notes && e.notes.toLowerCase().includes(term))
                        )
                        .slice(0, 10)
                        .forEach((e: Expense) => results.push({ 
                            id: e.id, 
                            name: `${e.description} (${e.amount?.toLocaleString()} ر.س)`, 
                            type: 'مصروف', 
                            page: 'expenses' 
                        }));
                }

                // البحث في الدفعات
                if (dataMap.payments) {
                    dataMap.payments
                        .filter((p: Payment) => 
                            p.unitName?.toLowerCase().includes(term) || 
                            p.customerName?.toLowerCase().includes(term) ||
                            (p.notes && p.notes.toLowerCase().includes(term))
                        )
                        .slice(0, 5)
                        .forEach((p: Payment) => results.push({ 
                            id: p.id, 
                            name: `${p.unitName || ''} - ${p.customerName || ''}`, 
                            type: 'دفعة', 
                            page: 'payments' 
                        }));
                }

                // ترتيب النتائج: الأكثر تطابقاً أولاً
                results.sort((a, b) => {
                    const aStartsWith = a.name?.toLowerCase().startsWith(term) ? 0 : 1;
                    const bStartsWith = b.name?.toLowerCase().startsWith(term) ? 0 : 1;
                    return aStartsWith - bStartsWith;
                });

                setSearchResults(results.slice(0, 10));
            } catch (error) {
                console.error('Search error:', error);
                setSearchResults([]);
            }
        };

        // تأخير البحث لتحسين الأداء (debounce)
        const debounceTimer = setTimeout(fetchResults, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchTerm, searchContext]);
    
    const handleResultClick = (result: SearchResult) => {
        console.log('🔍 Search result clicked:', result);
        
        // تحديد الوضع المستهدف
        const targetMode = ['units', 'customers', 'bookings', 'payments'].includes(result.page) ? 'projects' : 'expenses';
        
        // تغيير الوضع إذا لزم الأمر
        if (interfaceMode !== targetMode) {
            setInterfaceMode(targetMode);
        }
        
        // حفظ معلومات التركيز للصفحة المستهدفة
        const searchFocusData = { page: result.page, id: result.id };
        sessionStorage.setItem('searchFocus', JSON.stringify(searchFocusData));
        console.log('🔍 Saved searchFocus:', searchFocusData);
        
        // الانتقال للصفحة
        setActivePage(result.page);
        
        // إطلاق حدث مخصص لإعلام الصفحة المستهدفة (بعد تأخير أطول لضمان تحميل الصفحة والبيانات)
        setTimeout(() => {
            const event = new CustomEvent('searchNavigate', { detail: searchFocusData });
            window.dispatchEvent(event);
            console.log('📣 Dispatched searchNavigate event:', searchFocusData);
        }, 500);
        
        // مسح البحث
        setSearchTerm('');
        setSearchResults([]);
        setIsSearchFocused(false);
    };

    const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
    const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
    const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;

    return (
        <header className="sticky top-0 z-30 glass-card border-b border-white/10 shadow-xl no-print transition-all duration-300">
            <div className="h-16 sm:h-20 flex items-center justify-between px-3 sm:px-6 mx-auto gap-2 sm:gap-4 lg:gap-6">
                
                <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-shrink-0">
                    <button onClick={onToggleSidebar} className="lg:hidden text-slate-400 p-2 -mr-1 sm:-mr-2 hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0">
                        <MenuIcon />
                    </button>
                    {currentUser?.role === 'Admin' && (
                        <div className="hidden md:flex items-center bg-slate-700/30 p-1 rounded-xl border border-slate-600/30 shadow-sm backdrop-blur-sm">
                            <button 
                                onClick={() => setInterfaceMode('projects')}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all duration-200 ease-in-out relative overflow-hidden group mode-switcher-btn ${interfaceMode === 'projects' ? 'mode-active' : 'text-slate-400 hover:text-white hover:bg-slate-700/50 hover:scale-[1.01] active:scale-100'}`}
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                    إدارة المبيعات
                                </span>
                                {interfaceMode === 'projects' && (
                                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></span>
                                )}
                            </button>
                             <button 
                                onClick={() => setInterfaceMode('expenses')}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all duration-200 ease-in-out relative overflow-hidden group mode-switcher-btn ${interfaceMode === 'expenses' ? 'mode-active' : 'text-slate-400 hover:text-white hover:bg-slate-700/50 hover:scale-[1.01] active:scale-100'}`}
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                    الإدارة المحاسبية
                                </span>
                                {interfaceMode === 'expenses' && (
                                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></span>
                                )}
                            </button>
                        </div>
                    )}
                     <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-200 hidden sm:block truncate max-w-[150px] sm:max-w-[200px] lg:max-w-none">
                        {pageName}
                    </h1>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 flex-shrink-0">
                    {/* Connection Status Indicator */}
                    <div className="relative">
                        <button
                            onClick={async () => {
                                setConnectionStatus('checking');
                                const startTime = Date.now();
                                try {
                                    const { error } = await supabase.from('projects').select('id').limit(1);
                                    const latency = Date.now() - startTime;
                                    if (error) {
                                        setConnectionStatus('disconnected');
                                        setConnectionLatency(null);
                                    } else {
                                        setConnectionStatus('connected');
                                        setConnectionLatency(latency);
                                    }
                                } catch (error) {
                                    setConnectionStatus('disconnected');
                                    setConnectionLatency(null);
                                }
                            }}
                            onMouseEnter={() => setShowConnectionTooltip(true)}
                            onMouseLeave={() => setShowConnectionTooltip(false)}
                            className="p-2.5 rounded-xl transition-all duration-200 ease-in-out border hover:scale-[1.02] active:scale-[0.98] relative group border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                            title="التحقق من الاتصال"
                        >
                            {connectionStatus === 'connected' && (
                                <div className="relative">
                                    <svg className={`h-6 w-6 ${
                                        connectionLatency && connectionLatency <= 250 ? 'text-emerald-500' : 
                                        connectionLatency && connectionLatency <= 300 ? 'text-amber-500' : 
                                        'text-rose-500'
                                    }`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M2 20h.01" />
                                        <path d="M7 20v-4" className={connectionLatency && connectionLatency <= 300 ? 'opacity-100' : 'opacity-30'} />
                                        <path d="M12 20v-8" className={connectionLatency && connectionLatency <= 250 ? 'opacity-100' : 'opacity-30'} />
                                        <path d="M17 20v-12" className={connectionLatency && connectionLatency <= 220 ? 'opacity-100' : 'opacity-30'} />
                                        <path d="M22 20v-16" className={connectionLatency && connectionLatency <= 180 ? 'opacity-100' : 'opacity-30'} />
                                    </svg>
                                    {connectionLatency && connectionLatency > 300 && (
                                        <span className="absolute -top-1 -right-1 flex items-center justify-center">
                                            <svg className="h-3 w-3 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </span>
                                    )}
                                </div>
                            )}
                            {connectionStatus === 'disconnected' && (
                                <div className="relative">
                                    <svg className="h-6 w-6 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M2 20h.01" />
                                        <path d="M7 20v-4" className="opacity-30" />
                                        <path d="M12 20v-8" className="opacity-30" />
                                        <path d="M17 20v-12" className="opacity-30" />
                                        <path d="M22 20v-16" className="opacity-30" />
                                        <line x1="4" y1="4" x2="20" y2="20" strokeWidth="2.5" />
                                    </svg>
                                    <span className="absolute -top-1 -right-1 flex items-center justify-center">
                                        <svg className="h-3.5 w-3.5 text-rose-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                </div>
                            )}
                            {connectionStatus === 'checking' && (
                                <svg className="h-6 w-6 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                        </button>
                        {showConnectionTooltip && (
                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-slate-800 dark:bg-slate-900 rounded-lg shadow-xl border border-slate-700 p-3 z-50 animate-fade-in-scale-up">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-slate-400">حالة الاتصال</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500' : connectionStatus === 'disconnected' ? 'bg-rose-500' : 'bg-amber-500'} animate-pulse`}></div>
                                        <span className={`text-xs font-medium ${connectionStatus === 'connected' ? 'text-emerald-400' : connectionStatus === 'disconnected' ? 'text-rose-400' : 'text-amber-400'}`}>
                                            {connectionStatus === 'connected' ? 'متصل' : connectionStatus === 'disconnected' ? 'غير متصل' : 'جاري...'}
                                        </span>
                                    </div>
                                </div>
                                {connectionLatency !== null && (
                                    <>
                                        <div className="flex items-baseline justify-center gap-1 mb-2">
                                            <span className={`text-3xl font-bold tabular-nums transition-all duration-300 ${
                                                connectionLatency <= 250 ? 'text-emerald-400' : 
                                                connectionLatency <= 300 ? 'text-amber-400' : 
                                                'text-rose-400'
                                            }`}>
                                                {connectionLatency}
                                            </span>
                                            <span className="text-sm text-slate-500">ms</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                                            <span>{connectionLatency <= 250 ? 'ممتاز' : connectionLatency <= 300 ? 'متوسط' : 'بطيء'}</span>
                                            <span>⟳ 3s</span>
                                        </div>
                                    </>
                                )}
                                {connectionStatus === 'disconnected' && (
                                    <p className="text-xs text-rose-400 text-center">⚠️ تحقق من الاتصال</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="relative w-32 sm:w-40 md:w-48 lg:w-64 hidden sm:block" ref={searchRef}>
                         <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3 pointer-events-none">
                           <SearchIcon />
                        </div>
                        <input
                            type="text"
                            placeholder={`بحث في ${
                                activePage === 'units' ? 'الوحدات' :
                                activePage === 'customers' ? 'العملاء' :
                                activePage === 'bookings' ? 'الحجوزات' :
                                activePage === 'payments' ? 'الدفعات' :
                                activePage === 'expenses' ? 'المصروفات' :
                                interfaceMode === 'projects' ? 'المبيعات' : 'المحاسبة'
                            }...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            className="w-full pr-8 sm:pr-10 pl-2 sm:pl-3 py-2 sm:py-2.5 text-sm border border-slate-600/30 rounded-xl bg-slate-700/40 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50 text-slate-100 placeholder:text-slate-500 transition-all duration-200 shadow-sm backdrop-blur-sm"
                        />
                         {isSearchFocused && searchTerm.trim() !== '' && (
                            <div className="absolute top-full mt-2 w-full min-w-[320px] bg-slate-800 rounded-xl shadow-2xl border border-slate-600/50 text-right max-h-96 overflow-y-auto z-50">
                                {searchResults.length > 0 ? (
                                    <>
                                        <div className="px-4 py-2.5 border-b border-slate-700 bg-slate-900/80">
                                            <p className="text-xs text-slate-300 font-medium">
                                                {searchResults.length} نتيجة في {
                                                    activePage === 'units' ? 'الوحدات' :
                                                    activePage === 'customers' ? 'العملاء' :
                                                    activePage === 'bookings' ? 'الحجوزات' :
                                                    activePage === 'payments' ? 'الدفعات' :
                                                    activePage === 'expenses' ? 'المصروفات' :
                                                    interfaceMode === 'projects' ? 'المبيعات' : 'المحاسبة'
                                                }
                                            </p>
                                        </div>
                                        <ul className="py-1">
                                            {searchResults.map(result => (
                                                <li key={`${result.type}-${result.id}`} className="border-b border-slate-700/50 last:border-0">
                                                    <button onClick={() => handleResultClick(result)} className="w-full text-right px-4 py-3 transition-colors duration-200 flex items-center justify-between group hover:bg-slate-700 bg-slate-800">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-white text-sm truncate">{result.name}</p>
                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                <span className={`text-[11px] px-2.5 py-1 rounded-md font-medium ${
                                                                    result.type === 'وحدة' ? 'bg-blue-600 text-white' :
                                                                    result.type === 'عميل' ? 'bg-green-600 text-white' :
                                                                    result.type === 'حجز' ? 'bg-purple-600 text-white' :
                                                                    result.type === 'مصروف' ? 'bg-rose-600 text-white' :
                                                                    result.type === 'دفعة' ? 'bg-amber-600 text-white' :
                                                                    'bg-slate-600 text-white'
                                                                }`}>
                                                                    {result.type}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="opacity-50 group-hover:opacity-100 transition-opacity text-primary-400 mr-2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                                        </div>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                ) : (
                                    <div className="px-4 py-8 text-center bg-slate-800">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        <p className="text-slate-300 text-sm font-medium">لا توجد نتائج لـ "{searchTerm}"</p>
                                        <p className="text-slate-500 text-xs mt-1">جرب البحث بكلمات مختلفة</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <button 
                        onClick={() => setActivePage('notifications')}
                        className="text-slate-400 p-1.5 sm:p-2.5 rounded-xl hover:bg-slate-700/50 transition-all duration-200 ease-in-out border border-transparent hover:border-slate-600/30 relative group hover:scale-[1.02] active:scale-[0.98]"
                        onMouseEnter={(e) => {
                            const bell = e.currentTarget.querySelector('.bell-icon');
                            bell?.classList.add('animate-bell-ring');
                            setTimeout(() => bell?.classList.remove('animate-bell-ring'), 1000);
                        }}
                    >
                        <BellIcon className="h-5 w-5 sm:h-6 sm:w-6 bell-icon transition-transform duration-300 group-hover:rotate-12"/>
                        {unreadNotifications > 0 && (
                            <>
                                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-800 animate-pulse"></span>
                                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                            </>
                        )}
                    </button>

                    <div className="relative" ref={userMenuRef}>
                        <button onClick={() => setIsUserMenuVisible(prev => !prev)} className="flex items-center gap-1 sm:gap-3 pl-1 sm:pl-2 pr-1 py-1 rounded-full hover:bg-slate-700/40 transition-colors border border-transparent hover:border-slate-600/30">
                             <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-tr from-primary-500/80 to-purple-600/80 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-lg shadow-md ring-2 ring-slate-700/50">
                                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <div className="hidden lg:block text-right">
                                <span className="font-semibold text-slate-200 block leading-tight text-sm">{currentUser?.name}</span>
                                {assignedProjectName ? (
                                     <span className="text-[10px] text-accent font-medium flex items-center justify-end gap-1 leading-tight mt-0.5">
                                        <BriefcaseIcon className="h-3 w-3" />
                                        {assignedProjectName}
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">{currentUser?.role}</span>
                                )}
                            </div>
                        </button>
                        {isUserMenuVisible && (
                            <div className="absolute top-full mt-2 w-56 bg-slate-800 rounded-2xl shadow-2xl border border-slate-600/50 text-right left-0 animate-fade-in-scale-up overflow-hidden z-50">
                                <div className="p-4 border-b border-slate-600/50 bg-slate-700/80">
                                    <p className="text-sm font-bold text-slate-100">{currentUser?.name}</p>
                                    <p className="text-xs text-slate-400">{currentUser?.email}</p>
                                </div>
                                <ul className="p-2 bg-slate-800">
                                    <li>
                                        <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/20 rounded-xl transition-colors duration-200 font-medium">
                                            <LogoutIcon />
                                            <span>تسجيل الخروج</span>
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </header>
    );
};

export default Header;