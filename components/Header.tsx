import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { InterfaceMode, Project } from '../types';
import { pageNames } from '../utils/pageNames';
import { projectsService } from '../src/services/supabaseService';
import { CalendarIcon, BriefcaseIcon, BellIcon } from './shared/Icons';
import { supabase } from '../src/lib/supabase';
import InlineSearch from './shared/InlineSearch';
import ConnectionIndicator from './shared/ConnectionIndicator';

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
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentDate, setCurrentDate] = useState('الثلاثاء، 4 نوفمبر 2025');
    const userMenuRef = useRef<HTMLDivElement>(null);
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
                        <>
                            {/* ✅ نسخة الموبايل - أيقونات فقط */}
                            <div className="flex md:hidden items-center bg-slate-700/30 p-1 rounded-lg border border-slate-600/30 shadow-sm backdrop-blur-sm">
                                <button 
                                    onClick={() => setInterfaceMode('projects')}
                                    className={`p-2 rounded-md transition-all duration-200 ${interfaceMode === 'projects' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                                    title="إدارة المبيعات"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                </button>
                                <button 
                                    onClick={() => setInterfaceMode('expenses')}
                                    className={`p-2 rounded-md transition-all duration-200 ${interfaceMode === 'expenses' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                                    title="الإدارة المحاسبية"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                </button>
                            </div>
                            {/* ✅ نسخة الديسكتوب - مع النص */}
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
                        </>
                    )}
                     <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-200 hidden sm:block truncate max-w-[150px] sm:max-w-[200px] lg:max-w-none">
                        {pageName}
                    </h1>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 flex-shrink-0">
                    {/* Connection Status Indicator - مؤشر حالة الاتصال المحسن */}
                    <ConnectionIndicator showLatency={true} />

                    {/* 🔍 البحث الاحترافي المدمج */}
                    <InlineSearch
                        projectId={currentUser?.assignedProjectId || activeProject?.id || null}
                        projectName={activeProject?.name || (currentUser?.assignedProjectId ? projects.find(p => p.id === currentUser.assignedProjectId)?.name : undefined)}
                        interfaceMode={interfaceMode}
                        onNavigate={(type, id) => {
                            // التنقل للصفحة المناسبة
                            if (type === 'expense') {
                                setActivePage('expenses');
                            }
                            else if (type === 'payment') {
                                setActivePage('payments');
                            }
                            else if (type === 'booking') {
                                setActivePage('bookings');
                            }
                        }}
                        setActivePage={(page) => {
                            setActivePage(page);
                        }}
                    />
                
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
