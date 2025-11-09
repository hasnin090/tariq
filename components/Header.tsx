import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { InterfaceMode, Unit, Customer, Booking, Expense, Payment, SearchResult, Project } from '../types.ts';
import { pageNames } from '../../utils/pageNames.ts';
import { CalendarIcon, BriefcaseIcon, BellIcon, MicrophoneIcon } from './shared/Icons.tsx';

const Header: React.FC<{
    activePage: string;
    interfaceMode: InterfaceMode;
    setInterfaceMode: (mode: InterfaceMode) => void;
    setActivePage: (page: string) => void;
    onToggleSidebar: () => void;
}> = ({ activePage, interfaceMode, setInterfaceMode, setActivePage, onToggleSidebar }) => {
    const { currentUser, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [isUserMenuVisible, setIsUserMenuVisible] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentDate, setCurrentDate] = useState('الثلاثاء، 4 نوفمبر 2025');
    const userMenuRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any | null>(null);
    
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
        setProjects(JSON.parse(localStorage.getItem('projects') || '[]'));
    }, []);

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn("Speech recognition not supported by this browser.");
            return;
        }
    
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'ar-EG';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
    
        recognition.onresult = (event: any) => {
            const voiceTranscript = event.results[0][0].transcript;
            setSearchTerm(voiceTranscript);
            setIsSearchFocused(true);
        };
    
        recognition.onerror = (event: any) => {
            console.error("Speech recognition error:", event.error);
            setIsListening(false);
        };
    
        recognition.onend = () => {
            setIsListening(false);
        };
    
        recognitionRef.current = recognition;
    
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const assignedProjectName = useMemo(() => {
        if (currentUser?.assignedProjectId) {
            return projects.find(p => p.id === currentUser.assignedProjectId)?.name;
        }
        return null;
    }, [currentUser, projects]);
    
    const handleVoiceSearch = useCallback(() => {
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    }, [isListening]);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setSearchResults([]);
            return;
        }

        const units: Unit[] = JSON.parse(localStorage.getItem('units') || '[]');
        const customers: Customer[] = JSON.parse(localStorage.getItem('customers') || '[]');
        const bookings: Booking[] = JSON.parse(localStorage.getItem('bookings') || '[]');
        const expenses: Expense[] = JSON.parse(localStorage.getItem('expenses') || '[]');
        const payments: Payment[] = JSON.parse(localStorage.getItem('payments') || '[]');

        const results: SearchResult[] = [];
        const term = searchTerm.toLowerCase();

        units.filter(u => u.name.toLowerCase().includes(term)).forEach(u => results.push({ id: u.id, name: u.name, type: 'unit', page: 'units' }));
        customers.filter(c => c.name.toLowerCase().includes(term)).forEach(c => results.push({ id: c.id, name: c.name, type: 'customer', page: 'customers' }));
        bookings.filter(b => b.unitName.toLowerCase().includes(term) || b.customerName.toLowerCase().includes(term)).forEach(b => results.push({ id: b.id, name: `${b.unitName} - ${b.customerName}`, type: 'booking', page: 'bookings' }));
        expenses.filter(e => e.description.toLowerCase().includes(term)).forEach(e => results.push({ id: e.id, name: e.description, type: 'expense', page: 'expenses' }));
        payments.filter(p => p.unitName.toLowerCase().includes(term) || p.customerName.toLowerCase().includes(term)).forEach(p => results.push({ id: p.id, name: `${p.unitName} - ${p.customerName}`, type: 'payment', page: 'payments' }));

        setSearchResults(results.slice(0, 7));
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
    const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
    const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
    const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
    const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;

    return (
        <header className="relative z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm no-print transition-colors duration-300">
            <div className="h-20 flex items-center justify-between px-6 mx-auto gap-6">
                
                <div className="flex items-center gap-4">
                    <button onClick={onToggleSidebar} className="lg:hidden text-slate-500 dark:text-slate-400 p-2 -mr-2">
                        <MenuIcon />
                    </button>
                    {currentUser?.role === 'Admin' && (
                        <div className="hidden sm:flex items-center bg-slate-200 dark:bg-slate-800 p-1 rounded-full">
                            <button 
                                onClick={() => setInterfaceMode('projects')}
                                className={`px-4 py-1.5 text-sm font-bold rounded-full transition-all duration-300 ${interfaceMode === 'projects' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'}`}
                            >
                                إدارة المبيعات
                            </button>
                             <button 
                                onClick={() => setInterfaceMode('expenses')}
                                className={`px-4 py-1.5 text-sm font-bold rounded-full transition-all duration-300 ${interfaceMode === 'expenses' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'}`}
                            >
                                الإدارة المحاسبية
                            </button>
                        </div>
                    )}
                     <h1 className="text-lg font-semibold text-slate-700 dark:text-slate-200 hidden md:block whitespace-nowrap">
                        {pageName}
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative w-full max-w-xs" ref={searchRef}>
                         <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                           <SearchIcon />
                        </div>
                        <input
                            type="text"
                            placeholder="بحث سريع..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            className="w-full pr-10 pl-10 py-2.5 border border-slate-300 dark:border-slate-700 rounded-full bg-slate-100 dark:bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 transition-colors duration-300"
                        />
                        {recognitionRef.current && (
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                               <button
                                    type="button"
                                    onClick={handleVoiceSearch}
                                    title="البحث الصوتي"
                                    className={`p-1 rounded-full transition-colors ${
                                        isListening
                                            ? 'text-white bg-rose-500 animate-pulse'
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                    }`}
                                >
                                    <MicrophoneIcon className="h-5 w-5" />
                                </button>
                            </div>
                        )}
                         {isSearchFocused && searchResults.length > 0 && (
                            <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 text-right max-h-80 overflow-y-auto">
                                <ul>
                                    {searchResults.map(result => (
                                        <li key={`${result.type}-${result.id}`}>
                                            <button onClick={() => handleResultClick(result)} className="w-full text-right px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200">
                                                <p className="font-semibold text-slate-800 dark:text-slate-200">{result.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{result.type}</p>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    
                    <button onClick={toggleTheme} className="text-slate-500 dark:text-slate-400 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                        {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                    </button>
                    
                    <button className="text-slate-500 dark:text-slate-400 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                        <BellIcon className="h-6 w-6"/>
                    </button>

                    <div className="relative" ref={userMenuRef}>
                        <button onClick={() => setIsUserMenuVisible(prev => !prev)} className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <div className="hidden sm:block text-right">
                                <span className="font-semibold text-slate-800 dark:text-slate-100 block leading-tight">{currentUser?.name}</span>
                                {assignedProjectName ? (
                                     <span className="text-xs text-primary-700 dark:text-primary-400 font-medium flex items-center justify-end gap-1 leading-tight">
                                        <BriefcaseIcon className="h-3 w-3" />
                                        {assignedProjectName}
                                    </span>
                                ) : (
                                    <span className="text-xs text-slate-500 dark:text-slate-400">{currentUser?.role}</span>
                                )}
                            </div>
                        </button>
                        {isUserMenuVisible && (
                            <div className="absolute top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 text-right left-0 animate-fade-in-scale-up">
                                <ul>
                                    <li>
                                        <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors duration-200">
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