import React, { useState, useEffect } from 'react';
import { InterfaceMode } from '../types.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { canAccessPage } from '../utils/permissions';
import { 
    HomeIcon, BuildingIcon, UsersIcon, CreditCardIcon, TrendingUpIcon, 
    DocumentTextIcon, ChartBarIcon, CogIcon, UserGroupIcon, ReceiptIcon, 
    TagIcon, CalendarIcon, BriefcaseIcon, CalculatorIcon, ArchiveIcon, 
    CollectionIcon, DocumentReportIcon, ClockIcon, BanknotesIcon, BellIcon
} from './shared/Icons.tsx';

interface NavLinkProps {
    icon: React.ReactElement;
    label: string;
    page: string;
    activePage: string;
    onClick: (page: string) => void;
    isEditMode?: boolean;
    onDragStart?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
    isDragging?: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ icon, label, page, activePage, onClick, isEditMode, onDragStart, onDragOver, onDrop, isDragging }) => {
    const isActive = activePage === page;
    const [isHovered, setIsHovered] = React.useState(false);
    
    return (
        <li 
            className="mb-1"
            draggable={isEditMode}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            <button
                onClick={() => !isEditMode && onClick(page)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 mx-auto rounded-xl text-sm font-medium transition-all duration-500 group relative overflow-hidden ${
                    isDragging ? 'opacity-30 scale-95' : ''
                } ${
                    isEditMode ? 'cursor-move border-2 border-dashed border-amber-500/50' : 'cursor-pointer'
                } ${
                    isActive && !isEditMode
                    ? 'sidebar-item-active translate-x-[-4px] scale-[1.02]' 
                    : 'text-slate-300 hover:bg-gradient-to-l hover:from-white/10 hover:to-white/5 hover:text-white hover:translate-x-[-3px]'
                }`}
            >
                {/* Animated Background Particles */}
                {(isActive || isHovered) && (
                    <>
                        <div className={`absolute top-0 left-0 w-2 h-2 bg-white/40 rounded-full blur-sm transition-all duration-700 ${isActive ? 'animate-ping' : ''}`} style={{ animationDelay: '0ms' }}></div>
                        <div className={`absolute bottom-2 right-4 w-1.5 h-1.5 bg-white/30 rounded-full blur-sm transition-all duration-700 ${isActive ? 'animate-ping' : ''}`} style={{ animationDelay: '200ms' }}></div>
                        <div className={`absolute top-3 right-12 w-1 h-1 bg-white/20 rounded-full blur-sm transition-all duration-700 ${isActive ? 'animate-ping' : ''}`} style={{ animationDelay: '400ms' }}></div>
                    </>
                )}
                
                {/* Gradient Glow Effect */}
                {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                )}
                
                <div className={`p-2 rounded-lg transition-all duration-500 transform flex items-center justify-center flex-shrink-0 ${
                    isActive 
                    ? 'bg-white/25 shadow-lg rotate-0 scale-105' 
                    : 'bg-white/5 group-hover:bg-white/15 group-hover:scale-105 group-hover:rotate-3'
                }`}>
                    {React.cloneElement<{ className: string }>(icon, { 
                        className: `h-5 w-5 flex-shrink-0 transition-all duration-500 ${
                            isActive 
                            ? 'text-white drop-shadow-lg' 
                            : 'text-slate-400 group-hover:text-white group-hover:drop-shadow-md'
                        }` 
                    })}
                </div>
                
                <span className={`relative z-10 transition-all duration-300 ${isActive ? 'font-bold' : 'font-medium'}`}>
                    {label}
                </span>
                
                {/* Drag Indicator */}
                {isEditMode && (
                    <div className="mr-auto flex gap-0.5">
                        <div className="w-1 h-1 rounded-full dot-accent"></div>
                        <div className="w-1 h-1 rounded-full dot-accent"></div>
                        <div className="w-1 h-1 rounded-full dot-accent"></div>
                    </div>
                )}
                
                {/* Active Indicator */}
                {isActive && (
                    <div className="absolute inset-y-0 right-0 w-1.5 bg-gradient-to-b from-white/60 via-white/80 to-white/60 rounded-l-full shadow-lg shadow-white/50 animate-pulse"></div>
                )}
                
                {/* Hover Indicator */}
                {!isActive && isHovered && (
                    <div className="absolute inset-y-0 right-0 w-0.5 bg-gradient-to-b from-transparent via-amber-400/50 to-transparent rounded-l-full"></div>
                )}
            </button>
        </li>
    );
};

interface SidebarProps {
    activePage: string;
    setActivePage: (page: string) => void;
    interfaceMode: InterfaceMode;
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, interfaceMode, isOpen, onClose }) => {
    const { currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'Admin';
    
    const [isEditMode, setIsEditMode] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const defaultProjectsLinks = [
        { icon: <HomeIcon />, label: 'لوحة التحكم', page: 'dashboard', adminOnly: false },
        { icon: <BuildingIcon />, label: 'الوحدات', page: 'units', adminOnly: false },
        { icon: <UsersIcon />, label: 'العملاء', page: 'customers', adminOnly: false },
        { icon: <DocumentTextIcon />, label: 'الحجوزات', page: 'bookings', adminOnly: false },
        { icon: <CreditCardIcon />, label: 'الدفعات', page: 'payments', adminOnly: false },
        { icon: <TrendingUpIcon />, label: 'المبيعات', page: 'sales', adminOnly: false },
        { icon: <ArchiveIcon />, label: 'مستندات البيع', page: 'sales-documents', adminOnly: true },
        { icon: <ChartBarIcon />, label: 'التقارير', page: 'reports', adminOnly: true },
        { icon: <CollectionIcon />, label: 'الملخص الشامل', page: 'financial-summary', adminOnly: true },
        { icon: <ArchiveIcon />, label: 'أرشيف الحجوزات', page: 'bookings-archive', adminOnly: false },
        { icon: <ArchiveIcon />, label: 'الأرشيف العام', page: 'general-archive', adminOnly: false },
    ];

    const defaultExpensesLinks = [
        { icon: <HomeIcon />, label: 'لوحة التحكم', page: 'expense_dashboard', adminOnly: false },
        { icon: <ReceiptIcon />, label: 'الحركات المالية', page: 'expenses', adminOnly: false },
        { icon: <BanknotesIcon />, label: 'الصندوق وحساب البنك', page: 'treasury', adminOnly: true },
        { icon: <CalendarIcon />, label: 'الدفعات الآجلة', page: 'deferred-payments', adminOnly: true },
        { icon: <UsersIcon />, label: 'الموظفين', page: 'employees', adminOnly: true },
        { icon: <CalculatorIcon />, label: 'الميزانيات', page: 'budgets', adminOnly: true },
        { icon: <ChartBarIcon />, label: 'محاسبة المشاريع', page: 'projects-accounting', adminOnly: true },
        { icon: <TagIcon />, label: 'دفتر الأستاذ', page: 'category-accounting', adminOnly: true },
        { icon: <ArchiveIcon />, label: 'المستندات', page: 'documents-accounting', adminOnly: true },
        { icon: <ClockIcon />, label: 'سجل النشاطات', page: 'activity-log', adminOnly: true },
        { icon: <ArchiveIcon />, label: 'الأرشيف العام', page: 'general-archive', adminOnly: false },
    ];
    
    const defaultSystemLinks = [
        { icon: <BriefcaseIcon />, label: 'إدارة المشاريع', page: 'projects-management', adminOnly: true },
        { icon: <CogIcon />, label: 'تخصيص', page: 'customization', adminOnly: true },
        { icon: <UserGroupIcon />, label: 'المستخدمون', page: 'users', adminOnly: true },
        { icon: <BellIcon />, label: 'الإشعارات', page: 'notifications', adminOnly: true },
        { icon: <BriefcaseIcon />, label: 'ربط المشاريع والمستخدمين', page: 'project-user-management', adminOnly: true },
        { icon: <DocumentTextIcon />, label: 'استيراد البيانات', page: 'data-import', adminOnly: true },
    ];

    // Load saved order from localStorage
    const getStorageKey = (type: 'projects' | 'expenses' | 'system') => {
        return `sidebar_order_${currentUser?.username || 'default'}_${type}`;
    };

    const [projectsLinks, setProjectsLinks] = useState<typeof defaultProjectsLinks>(defaultProjectsLinks);
    const [expensesLinks, setExpensesLinks] = useState<typeof defaultExpensesLinks>(defaultExpensesLinks);
    const [systemLinks, setSystemLinks] = useState<typeof defaultSystemLinks>(defaultSystemLinks);

    // Helper function to restore icons
    const restoreIcons = (savedData: any[], defaultLinks: typeof defaultProjectsLinks) => {
        return savedData.map(saved => {
            const defaultLink = defaultLinks.find(link => link.page === saved.page);
            return {
                ...saved,
                icon: defaultLink?.icon || <HomeIcon />
            };
        });
    };

    // Load saved order from localStorage when user is available
    useEffect(() => {
        if (currentUser?.username) {
            const savedProjects = localStorage.getItem(getStorageKey('projects'));
            const savedExpenses = localStorage.getItem(getStorageKey('expenses'));
            const savedSystem = localStorage.getItem(getStorageKey('system'));
            
            if (savedProjects) {
                const parsed = JSON.parse(savedProjects);
                setProjectsLinks(restoreIcons(parsed, defaultProjectsLinks));
            }
            if (savedExpenses) {
                const parsed = JSON.parse(savedExpenses);
                setExpensesLinks(restoreIcons(parsed, defaultExpensesLinks));
            }
            if (savedSystem) {
                const parsed = JSON.parse(savedSystem);
                setSystemLinks(restoreIcons(parsed, defaultSystemLinks));
            }
        }
    }, [currentUser?.username]);

    // Save order to localStorage when links change
    useEffect(() => {
        if (currentUser?.username) {
            const linkData = projectsLinks.map(link => ({ label: link.label, page: link.page, adminOnly: link.adminOnly }));
            localStorage.setItem(getStorageKey('projects'), JSON.stringify(linkData));
        }
    }, [projectsLinks, currentUser?.username]);

    useEffect(() => {
        if (currentUser?.username) {
            const linkData = expensesLinks.map(link => ({ label: link.label, page: link.page, adminOnly: link.adminOnly }));
            localStorage.setItem(getStorageKey('expenses'), JSON.stringify(linkData));
        }
    }, [expensesLinks, currentUser?.username]);

    useEffect(() => {
        if (currentUser?.username) {
            const linkData = systemLinks.map(link => ({ label: link.label, page: link.page, adminOnly: link.adminOnly }));
            localStorage.setItem(getStorageKey('system'), JSON.stringify(linkData));
        }
    }, [systemLinks, currentUser?.username]);

    // Drag and drop handlers
    const handleDragStart = (index: number, section: 'projects' | 'expenses' | 'system') => (e: React.DragEvent) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('section', section);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (dropIndex: number, section: 'projects' | 'expenses' | 'system') => (e: React.DragEvent) => {
        e.preventDefault();
        const dragSection = e.dataTransfer.getData('section');
        
        if (dragSection !== section || draggedIndex === null) return;

        const links = section === 'projects' ? projectsLinks : section === 'expenses' ? expensesLinks : systemLinks;
        const setLinks = section === 'projects' ? setProjectsLinks : section === 'expenses' ? setExpensesLinks : setSystemLinks;

        const newLinks = [...links];
        const draggedItem = newLinks[draggedIndex];
        newLinks.splice(draggedIndex, 1);
        newLinks.splice(dropIndex, 0, draggedItem);

        setLinks(newLinks);
        setDraggedIndex(null);
    };

    const resetOrder = () => {
        setProjectsLinks(defaultProjectsLinks);
        setExpensesLinks(defaultExpensesLinks);
        setSystemLinks(defaultSystemLinks);
        setIsEditMode(false);
    };
    
    let linksToShow: typeof defaultProjectsLinks = [];
    let sectionTitle = '';
    let systemTitle = '';
    let currentSection: 'projects' | 'expenses' = 'projects';

    if (currentUser?.role === 'Sales') {
        linksToShow = projectsLinks.filter(link => 
            currentUser && canAccessPage(currentUser.role, link.page)
        );
        sectionTitle = 'إدارة المبيعات';
        systemTitle = 'نظام عقاري';
        currentSection = 'projects';
    } else if (currentUser?.role === 'Accounting') {
        linksToShow = expensesLinks.filter(link => 
            currentUser && canAccessPage(currentUser.role, link.page)
        );
        sectionTitle = 'الإدارة المحاسبية';
        systemTitle = 'نظام محاسبي';
        currentSection = 'expenses';
    } else if (isAdmin) {
        linksToShow = interfaceMode === 'projects' ? projectsLinks : expensesLinks;
        // Admin يرى كل الصفحات
        sectionTitle = interfaceMode === 'projects' ? 'إدارة المبيعات' : 'الإدارة المحاسبية';
        systemTitle = interfaceMode === 'projects' ? 'نظام عقاري' : 'نظام محاسبي';
        currentSection = interfaceMode === 'projects' ? 'projects' : 'expenses';
    }

    return (
        <>
            {/* Overlay for mobile */}
            <div
                className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            ></div>
            
            {/* Sidebar Container */}
            <aside className={`fixed lg:relative inset-y-0 right-0 w-72 backdrop-blur-2xl bg-white/10 border-l border-white/20 flex-shrink-0 flex flex-col h-screen z-40 transition-transform duration-300 ease-out shadow-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
                
                {/* Logo Area */}
                <div className="h-24 flex items-center justify-center relative overflow-hidden border-b border-white/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-30"></div>
                    <div className="relative z-10 text-center px-4">
                        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 tracking-tight">{systemTitle}</h1>
                    </div>
                </div>

                {/* Edit Mode Toggle */}
                {isAdmin && (
                    <div className="px-4 pb-3">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsEditMode(!isEditMode)}
                                className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                                    isEditMode 
                                    ? 'bg-accent/20 text-accent border border-accent/50' 
                                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                                }`}
                            >
                                {isEditMode ? '✓ حفظ الترتيب' : '⚙ تعديل الترتيب'}
                            </button>
                            {isEditMode && (
                                <button
                                    onClick={resetOrder}
                                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500/30 transition-all duration-300"
                                    title="إعادة تعيين الترتيب الافتراضي"
                                >
                                    ↺
                                </button>
                            )}
                        </div>

                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    <div className="mb-6">
                        <h2 className="px-4 pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full dot-accent"></span>
                            {sectionTitle}
                        </h2>
                        <ul className="space-y-1">
                            {linksToShow.filter(link => !link.adminOnly || isAdmin).map((link, index) => (
                                <NavLink 
                                    key={link.page} 
                                    {...link} 
                                    activePage={activePage} 
                                    onClick={setActivePage}
                                    isEditMode={isEditMode}
                                    onDragStart={handleDragStart(index, currentSection)}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop(index, currentSection)}
                                    isDragging={draggedIndex === index}
                                />
                            ))}
                        </ul>
                    </div>

                    {/* قائمة النظام - مفلترة حسب الصلاحيات */}
                    {currentUser && systemLinks.filter(link => 
                        canAccessPage(currentUser.role, link.page)
                    ).length > 0 && (
                        <div>
                            <h2 className="px-4 pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full dot-accent"></span>
                                النظام
                            </h2>
                            <ul className="space-y-1">
                                {systemLinks.filter(link => 
                                    currentUser && canAccessPage(currentUser.role, link.page)
                                ).map((link, index) => (
                                    <NavLink 
                                        key={link.page} 
                                        {...link} 
                                        activePage={activePage} 
                                        onClick={setActivePage}
                                        isEditMode={isEditMode}
                                        onDragStart={handleDragStart(index, 'system')}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop(index, 'system')}
                                        isDragging={draggedIndex === index}
                                    />
                                ))}
                            </ul>
                        </div>
                    )}
                </nav>
            </aside>
        </>
    );
};

export default Sidebar;