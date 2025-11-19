import React from 'react';
import { InterfaceMode } from '../types.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { 
    HomeIcon, BuildingIcon, UsersIcon, CreditCardIcon, TrendingUpIcon, 
    DocumentTextIcon, ChartBarIcon, CogIcon, UserGroupIcon, ReceiptIcon, 
    TagIcon, CalendarIcon, BriefcaseIcon, CalculatorIcon, ArchiveIcon, 
    CollectionIcon, DocumentReportIcon, ClockIcon, BanknotesIcon
} from './shared/Icons.tsx';

interface NavLinkProps {
    icon: React.ReactElement;
    label: string;
    page: string;
    activePage: string;
    onClick: (page: string) => void;
}

const NavLink: React.FC<NavLinkProps> = ({ icon, label, page, activePage, onClick }) => {
    const isActive = activePage === page;
    return (
        <li className="mb-1">
            <button
                onClick={() => onClick(page)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 mx-auto rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden ${
                    isActive 
                    ? 'bg-gradient-to-l from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/25 translate-x-[-4px]' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-100 hover:translate-x-[-4px]'
                }`}
            >
                <div className={`p-2 rounded-lg transition-colors duration-300 ${isActive ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                    {React.cloneElement<{ className: string }>(icon, { className: `h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}` })}
                </div>
                <span className="relative z-10">{label}</span>
                {isActive && (
                    <div className="absolute inset-y-0 right-0 w-1 bg-white/50 rounded-l-full"></div>
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

    const projectsLinks = [
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

    const expensesLinks = [
        { icon: <HomeIcon />, label: 'لوحة التحكم', page: 'expense_dashboard', adminOnly: false },
        { icon: <ReceiptIcon />, label: 'الحركات المالية', page: 'expenses', adminOnly: false },
        { icon: <BanknotesIcon />, label: 'الصندوق وحساب البنك', page: 'treasury', adminOnly: true },
        { icon: <CalendarIcon />, label: 'الدفعات الآجلة', page: 'deferred-payments', adminOnly: true },
        { icon: <UsersIcon />, label: 'الموظفين', page: 'employees', adminOnly: true },
        { icon: <BriefcaseIcon />, label: 'إدارة المشاريع', page: 'projects', adminOnly: true },
        { icon: <ChartBarIcon />, label: 'محاسبة المشاريع', page: 'projects-accounting', adminOnly: true },
        { icon: <TagIcon />, label: 'دفتر الأستاذ', page: 'category-accounting', adminOnly: true },
        { icon: <ArchiveIcon />, label: 'المستندات', page: 'documents-accounting', adminOnly: true },
        { icon: <ClockIcon />, label: 'سجل النشاطات', page: 'activity-log', adminOnly: true },
        { icon: <ArchiveIcon />, label: 'الأرشيف العام', page: 'general-archive', adminOnly: false },
    ];
    
    const systemLinks = [
        { icon: <CogIcon />, label: 'تخصيص', page: 'customization', adminOnly: true },
        { icon: <UserGroupIcon />, label: 'المستخدمون', page: 'users', adminOnly: true },
    ];
    
    let linksToShow: typeof projectsLinks = [];
    let sectionTitle = '';
    let systemTitle = '';

    if (currentUser?.role === 'Sales') {
        linksToShow = projectsLinks;
        sectionTitle = 'إدارة المبيعات';
        systemTitle = 'نظام عقاري';
    } else if (currentUser?.role === 'Accounting') {
        linksToShow = expensesLinks;
        sectionTitle = 'الإدارة المحاسبية';
        systemTitle = 'نظام محاسبي';
    } else if (isAdmin) {
        linksToShow = interfaceMode === 'projects' ? projectsLinks : expensesLinks;
        sectionTitle = interfaceMode === 'projects' ? 'إدارة المبيعات' : 'الإدارة المحاسبية';
        systemTitle = interfaceMode === 'projects' ? 'نظام عقاري' : 'نظام محاسبي';
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
            <aside className={`fixed lg:relative inset-y-0 right-0 w-72 bg-slate-900/95 backdrop-blur-2xl border-l border-white/5 flex-shrink-0 flex flex-col h-screen z-40 transition-transform duration-300 ease-out shadow-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
                
                {/* Logo Area */}
                <div className="h-24 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-600/20 to-transparent opacity-50"></div>
                    <div className="relative z-10 text-center">
                        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 tracking-tight">{systemTitle}</h1>
                        <p className="text-xs text-primary-400 font-medium mt-1 tracking-widest uppercase opacity-80">لوحة التحكم المتطورة</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    <div className="mb-6">
                        <h2 className="px-4 pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                            {sectionTitle}
                        </h2>
                        <ul className="space-y-1">
                            {linksToShow.filter(link => !link.adminOnly || isAdmin).map(link => (
                                <NavLink key={link.page} {...link} activePage={activePage} onClick={setActivePage} />
                            ))}
                        </ul>
                    </div>

                    {isAdmin && (
                        <div>
                            <h2 className="px-4 pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                النظام
                            </h2>
                            <ul className="space-y-1">
                                {systemLinks.filter(link => !link.adminOnly || isAdmin).map(link => (
                                    <NavLink key={link.page} {...link} activePage={activePage} onClick={setActivePage} />
                                ))}
                            </ul>
                        </div>
                    )}
                </nav>

                {/* User Profile Summary (Optional Footer) */}
                <div className="p-4 border-t border-white/5 bg-black/20">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg">
                            {currentUser?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{currentUser?.username}</p>
                            <p className="text-xs text-slate-400 truncate">{currentUser?.role === 'Admin' ? 'مدير النظام' : currentUser?.role}</p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;