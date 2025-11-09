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

const NavLink: React.FC<NavLinkProps> = ({ icon, label, page, activePage, onClick }) => (
    <li>
        <button
            onClick={() => onClick(page)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors duration-200 ${
                activePage === page 
                ? 'bg-primary-600 text-white' 
                : 'text-slate-300 hover:bg-primary-800 hover:text-white'
            }`}
        >
            {/* FIX: Corrected React.cloneElement call by providing a generic type argument to resolve a TypeScript error where the `className` prop was not recognized. */}
            {React.cloneElement<{ className: string }>(icon, { className: 'h-5 w-5' })}
            <span>{label}</span>
        </button>
    </li>
);

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
                className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            ></div>
            <aside className={`fixed lg:relative inset-y-0 right-0 w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col h-screen z-40 transition-transform duration-300 ease-in-out lg:translate-x-0 no-print ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-20 flex items-center justify-center border-b border-slate-800">
                    <h1 className="text-2xl font-bold text-white">{systemTitle}</h1>
                </div>
                <nav className="flex-1 overflow-y-auto p-4">
                    <h2 className="px-4 pb-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
                        {sectionTitle}
                    </h2>
                    <ul className="space-y-2">
                        {linksToShow.filter(link => !link.adminOnly || isAdmin).map(link => (
                             <NavLink key={link.page} {...link} activePage={activePage} onClick={setActivePage} />
                        ))}
                         {isAdmin && (
                            <>
                             <li className="pt-4 pb-2 px-4 text-xs text-slate-500 font-semibold uppercase">النظام</li>
                                {systemLinks.filter(link => !link.adminOnly || isAdmin).map(link => (
                                    <NavLink key={link.page} {...link} activePage={activePage} onClick={setActivePage} />
                                ))}
                            </>
                        )}
                    </ul>
                </nav>
            </aside>
        </>
    );
};

export default Sidebar;