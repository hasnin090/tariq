import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
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

    // Database connection check
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
        connectionCheckInterval.current = setInterval(checkConnection, 10000);

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

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setSearchResults([]);
            return;
        }

        const fetchResults = async () => {
            const term = searchTerm.toLowerCase();
            const [units, customers, bookings, expenses, payments] = await Promise.all([
                unitsService.getAll(),
                customersService.getAll(),
                bookingsService.getAll(),
                expensesService.getAll(),
                paymentsService.getAll(),
            ]);

            const results: SearchResult[] = [];

            units.filter(u => u.name.toLowerCase().includes(term)).forEach(u => results.push({ id: u.id, name: u.name, type: 'unit', page: 'units' }));
            customers.filter(c => c.name.toLowerCase().includes(term)).forEach(c => results.push({ id: c.id, name: c.name, type: 'customer', page: 'customers' }));
            bookings.filter(b => b.unitName.toLowerCase().includes(term) || b.customerName.toLowerCase().includes(term)).forEach(b => results.push({ id: b.id, name: `${b.unitName} - ${b.customerName}`, type: 'booking', page: 'bookings' }));
            expenses.filter(e => e.description.toLowerCase().includes(term)).forEach(e => results.push({ id: e.id, name: e.description, type: 'expense', page: 'expenses' }));
            payments.filter(p => p.unitName.toLowerCase().includes(term) || p.customerName.toLowerCase().includes(term)).forEach(p => results.push({ id: p.id, name: `${p.unitName} - ${p.customerName}`, type: 'payment', page: 'payments' }));

            setSearchResults(results.slice(0, 7));
        };

        fetchResults();
    }, [searchTerm]);
    
    const handleResultClick = (result: SearchResult) => {
        const targetMode = ['units', 'customers', 'bookings', 'payments'].includes(result.page) ? 'projects' : 'expenses';
        if (interfaceMode !== targetMode) setInterfaceMode(targetMode);
        
        sessionStorage.setItem('searchFocus', JSON.stringify({ page: result.page, id: result.id }));
        setActivePage(result.page);
        
        setSearchTerm('');
        setSearchResults([]);
        setIsSearchFocused(false);
    };

    const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
    const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
    const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;

    return (
        <header className="sticky top-0 z-30 glass-card border-b border-white/10 shadow-xl no-print transition-all duration-300">
            <div className="h-20 flex items-center justify-between px-6 mx-auto gap-6">
                
                <div className="flex items-center gap-4">
                    <button onClick={onToggleSidebar} className="lg:hidden text-slate-400 p-2 -mr-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <MenuIcon />
                    </button>
                    {currentUser?.role === 'Admin' && (
                        <div className="hidden sm:flex items-center bg-slate-700/30 p-1 rounded-xl border border-slate-600/30 shadow-sm backdrop-blur-sm">
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
                     <h1 className="text-lg font-semibold text-slate-200 hidden md:block whitespace-nowrap">
                        {pageName}
                    </h1>
                </div>

                <div className="flex items-center gap-4">
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
                                        connectionLatency && connectionLatency <= 160 ? 'text-emerald-500' : 
                                        connectionLatency && connectionLatency <= 200 ? 'text-green-500' : 
                                        connectionLatency && connectionLatency <= 250 ? 'text-amber-500' : 
                                        'text-rose-500'
                                    }`} fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
                                    </svg>
                                    {connectionLatency && connectionLatency > 250 && (
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
                                    <svg className="h-6 w-6 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
                                        <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-56 glass-card rounded-xl shadow-2xl border border-white/10 p-4 z-50 animate-fade-in-scale-up">
                                <div className="text-center">
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">حالة الاتصال</p>
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500' : connectionStatus === 'disconnected' ? 'bg-rose-500' : 'bg-amber-500'} animate-pulse`}></div>
                                        <span className={`text-sm font-semibold ${connectionStatus === 'connected' ? 'text-emerald-600 dark:text-emerald-400' : connectionStatus === 'disconnected' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                            {connectionStatus === 'connected' ? 'متصل' : connectionStatus === 'disconnected' ? 'غير متصل' : 'جاري الفحص...'}
                                        </span>
                                    </div>
                                    {connectionLatency !== null && (
                                        <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                            <p className="text-xs text-slate-600 dark:text-slate-300">زمن الاستجابة</p>
                                            <p className={`text-lg font-bold ${
                                                connectionLatency <= 160 ? 'text-emerald-600 dark:text-emerald-400' : 
                                                connectionLatency <= 200 ? 'text-green-600 dark:text-green-400' : 
                                                connectionLatency <= 250 ? 'text-amber-600 dark:text-amber-400' : 
                                                'text-rose-600 dark:text-rose-400'
                                            }`}>
                                                {connectionLatency} ms
                                            </p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                                {connectionLatency <= 160 ? 'ممتاز' : connectionLatency <= 200 ? 'جيد' : connectionLatency <= 250 ? 'متوسط' : 'بطيء'}
                                            </p>
                                        </div>
                                    )}
                                    {connectionStatus === 'disconnected' && (
                                        <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">⚠️ تحقق من اتصال الإنترنت</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative w-full max-w-xs hidden sm:block" ref={searchRef}>
                         <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                           <SearchIcon />
                        </div>
                        <input
                            type="text"
                            placeholder="بحث سريع..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            className="w-full pr-10 pl-3 py-2.5 border border-slate-600/30 rounded-xl bg-slate-700/40 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50 text-slate-100 placeholder:text-slate-500 transition-all duration-200 shadow-sm backdrop-blur-sm"
                        />
                         {isSearchFocused && searchResults.length > 0 && (
                            <div className="absolute top-full mt-2 w-full glass-card rounded-xl shadow-2xl border border-white/10 text-right max-h-80 overflow-y-auto z-50">
                                <ul className="py-2">
                                    {searchResults.map(result => (
                                        <li key={`${result.type}-${result.id}`}>
                                            <button onClick={() => handleResultClick(result)} className="w-full text-right px-4 py-3 search-result-hover transition-colors duration-200 flex items-center justify-between group">
                                                <div>
                                                    <p className="font-semibold text-slate-200 search-result-text transition-colors">{result.name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{result.type}</p>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-accent">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    
                    <button 
                        onClick={() => setActivePage('notifications')}
                        className="text-slate-400 p-2.5 rounded-xl hover:bg-slate-700/50 transition-all duration-200 ease-in-out border border-transparent hover:border-slate-600/30 relative group hover:scale-[1.02] active:scale-[0.98]"
                        onMouseEnter={(e) => {
                            const bell = e.currentTarget.querySelector('.bell-icon');
                            bell?.classList.add('animate-bell-ring');
                            setTimeout(() => bell?.classList.remove('animate-bell-ring'), 1000);
                        }}
                    >
                        <BellIcon className="h-6 w-6 bell-icon transition-transform duration-300 group-hover:rotate-12"/>
                        {unreadNotifications > 0 && (
                            <>
                                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-800 animate-pulse"></span>
                                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                            </>
                        )}
                    </button>

                    <div className="relative" ref={userMenuRef}>
                        <button onClick={() => setIsUserMenuVisible(prev => !prev)} className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-slate-700/40 transition-colors border border-transparent hover:border-slate-600/30">
                             <div className="w-9 h-9 bg-gradient-to-tr from-primary-500/80 to-purple-600/80 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md ring-2 ring-slate-700/50">
                                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <div className="hidden md:block text-right">
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
                            <div className="absolute top-full mt-2 w-56 glass-card rounded-2xl shadow-2xl border border-white/10 text-right left-0 animate-fade-in-scale-up overflow-hidden z-50">
                                <div className="p-4 border-b border-slate-600/30 bg-slate-700/30">
                                    <p className="text-sm font-bold text-slate-100">{currentUser?.name}</p>
                                    <p className="text-xs text-slate-400">{currentUser?.email}</p>
                                </div>
                                <ul className="p-2">
                                    <li>
                                        <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors duration-200 font-medium">
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