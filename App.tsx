import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { InterfaceMode } from './types';
import Sidebar from './components/Sidebar';
// FIX: Corrected import paths for components.
import Header from './components/Header';
import Login from './components/shared/Login';
import { useScrollProgress } from './utils/scrollAnimations';
import { canAccessPage, getDefaultPage } from './utils/permissions';
import { ProtectedRoute } from './components/shared/ProtectedRoute';

// ✅ Loading Component للصفحات
const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
      <span className="text-slate-400 text-sm">جارٍ التحميل...</span>
    </div>
  </div>
);

// ✅ Lazy Loading - صفحات المبيعات
const Dashboard = lazy(() => import('./components/pages/sales/Dashboard'));
const Units = lazy(() => import('./components/pages/sales/Units'));
const Customers = lazy(() => import('./components/pages/sales/Customers'));
const Bookings = lazy(() => import('./components/pages/sales/Bookings').then(m => ({ default: m.Bookings })));
const Payments = lazy(() => import('./components/pages/sales/Payments'));
const UnitSales = lazy(() => import('./components/pages/sales/UnitSales'));
const SalesDocuments = lazy(() => import('./components/pages/sales/SalesDocuments'));
const Customization = lazy(() => import('./components/pages/sales/Customization'));
const Users = lazy(() => import('./components/pages/sales/Users'));
const Notifications = lazy(() => import('./components/pages/sales/Notifications'));
const ProjectsManagement = lazy(() => import('./components/pages/sales/ProjectsManagement'));
const BookingsArchive = lazy(() => import('./components/pages/sales/BookingsArchive'));
const GeneralArchive = lazy(() => import('./components/pages/sales/GeneralArchive'));
const DataImport = lazy(() => import('./components/pages/sales/DataImport'));
const SalesActivityLog = lazy(() => import('./components/pages/sales/ActivityLog'));

// ✅ Lazy Loading - صفحات المحاسبة
const FinancialDashboard = lazy(() => import('./components/pages/accounting/FinancialDashboard'));
const Expenses = lazy(() => import('./components/pages/accounting/Expenses').then(m => ({ default: m.Expenses })));
const Treasury = lazy(() => import('./components/pages/accounting/Treasury'));
const DeferredPayments = lazy(() => import('./components/pages/accounting/DeferredPayments'));
const Employees = lazy(() => import('./components/pages/accounting/Employees'));
const Projects = lazy(() => import('./components/pages/accounting/Projects'));
const ProjectsAccounting = lazy(() => import('./components/pages/accounting/ProjectsAccounting'));
const CategoryAccounting = lazy(() => import('./components/pages/accounting/CategoryAccounting'));
const DocumentsAccounting = lazy(() => import('./components/pages/accounting/DocumentsAccounting'));
const ActivityLog = lazy(() => import('./components/pages/accounting/ActivityLog'));
const Budgets = lazy(() => import('./components/pages/accounting/Budgets'));
const FinancialReports = lazy(() => import('./components/pages/accounting/FinancialReports'));
const NotificationCenter = lazy(() => import('./components/pages/accounting/NotificationCenter'));


const App: React.FC = () => {
  const { currentUser } = useAuth();
  const scrollProgress = useScrollProgress();
  
  const [interfaceMode, setInterfaceMode] = useState<InterfaceMode>(() => {
    if (currentUser?.role === 'Sales') return 'projects';
    if (currentUser?.role === 'Accounting') return 'expenses';
    return (sessionStorage.getItem('interfaceMode') as InterfaceMode) || 'projects';
  });

  // تحديث interfaceMode عند تغيير المستخدم أو دوره
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'Sales') {
        setInterfaceMode('projects');
      } else if (currentUser.role === 'Accounting') {
        setInterfaceMode('expenses');
      }
      // Admin يحتفظ بآخر وضع اختاره
    }
  }, [currentUser?.id, currentUser?.role]);

  // Load accent color and clean up invalid currency on mount
  useEffect(() => {
    const loadAccentColor = async () => {
      try {
        const { settingsService } = await import('./src/services/supabaseService');
        
        // Try database first
        let savedColor = await settingsService.get('accentColor');
        
        // Fallback to localStorage
        if (!savedColor) {
          savedColor = localStorage.getItem('accentColor');
        }
        
        // Use saved color or default to amber
        const colorToUse = savedColor || 'amber';
        
        document.documentElement.setAttribute('data-accent-color', colorToUse);
        
        // Save to localStorage if not there
        if (!localStorage.getItem('accentColor')) {
          localStorage.setItem('accentColor', colorToUse);
        }
      } catch (error) {
        console.error('❌ Failed to load accent color:', error);
        // Fallback to amber
        document.documentElement.setAttribute('data-accent-color', 'amber');
      }
    };

    const cleanupCurrency = async () => {
      try {
        // Only run once per session
        const cleanupRan = sessionStorage.getItem('currency_cleanup_ran');
        if (cleanupRan) return;

        const { settingsService } = await import('./src/services/supabaseService');
        
        // Get current currency
        const currentCurrency = await settingsService.get('systemCurrency');
        
        // Check if valid ISO 4217 code (3 uppercase letters)
        const isValid = currentCurrency && /^[A-Z]{3}$/.test(currentCurrency);
        
        if (!isValid) {
          // Fix in database
          await settingsService.set('systemCurrency', 'IQD');
          
          // Fix in localStorage
          localStorage.removeItem('systemCurrency');
          localStorage.setItem('systemCurrency', 'IQD');
          
          // Refresh currency cache
          const { refreshCurrencyCache } = await import('./utils/currencyFormatter');
          await refreshCurrencyCache();
        }
        
        // Mark as done for this session
        sessionStorage.setItem('currency_cleanup_ran', 'true');
      } catch (error) {
        console.error('Failed to cleanup currency:', error);
      }
    };

    loadAccentColor();
    cleanupCurrency();
  }, []);

  const [activePage, setActivePage] = useState<string>(() => {
    const savedPage = sessionStorage.getItem('activePage');
    if (savedPage) return savedPage;
    if (currentUser?.role === 'Sales') return 'dashboard';
    if (currentUser?.role === 'Accounting') return 'expense_dashboard';
    return interfaceMode === 'projects' ? 'dashboard' : 'expense_dashboard';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    sessionStorage.setItem('interfaceMode', interfaceMode);
    sessionStorage.setItem('activePage', activePage);
  }, [interfaceMode, activePage]);
  
  const handleSetInterfaceMode = (mode: InterfaceMode) => {
    if (currentUser?.role !== 'Admin') return;
    setInterfaceMode(mode);
    setActivePage(mode === 'projects' ? 'dashboard' : 'expense_dashboard');
  };

  // التحقق من صلاحية الوصول للصفحة وإعادة التوجيه إذا لزم الأمر
  useEffect(() => {
    if (!currentUser) return;
    
    const customMenuAccess = (currentUser as any)?.customMenuAccess;
    let shouldRedirect = false;
    
    if (customMenuAccess && customMenuAccess.length > 0) {
      const menuItem = customMenuAccess.find((m: any) => m.menuKey === activePage);
      if (menuItem !== undefined) {
        if (!menuItem.isVisible) {
          shouldRedirect = true;
        }
      } else if (currentUser.role !== 'Admin') {
        shouldRedirect = true;
      }
    } else if (!canAccessPage(currentUser.role, activePage)) {
      shouldRedirect = true;
    }
    
    if (shouldRedirect) {
      const defaultPage = getDefaultPage(currentUser.role);
      if (defaultPage !== activePage) {
        setActivePage(defaultPage);
      }
    }
  }, [activePage, currentUser]);

  const renderPage = () => {
    switch (activePage) {
      // Projects
      case 'dashboard': return <Dashboard />;
      case 'units': return <Units />;
      case 'customers': return <Customers />;
      case 'bookings': return <Bookings />;
      case 'payments': return <Payments />;
      case 'sales': return <UnitSales />;
      case 'sales-documents': return <SalesDocuments />;
      
      // Expenses
      case 'expense_dashboard': return <FinancialDashboard />;
      case 'expenses': return <Expenses />;
      case 'treasury': return <Treasury />;
      case 'deferred-payments': return <DeferredPayments />;
      case 'employees': return <Employees />;
      case 'projects': return <ProjectsManagement />;
      case 'budgets': return <Budgets />;
      case 'financial-reports': return <FinancialReports />;
      case 'notification-center': return <NotificationCenter />;
      case 'projects-accounting': return <ProjectsAccounting />;
      case 'category-accounting': return <CategoryAccounting />;
      case 'documents-accounting': return <DocumentsAccounting />;
      case 'activity-log': return <ActivityLog />;

      // System - Protected Pages
      case 'projects-management': 
        return (
          <ProtectedRoute allowedRoles={['Admin']} pageKey="projects-management">
            <ProjectsManagement />
          </ProtectedRoute>
        );
      
      case 'customization': 
        return (
          <ProtectedRoute allowedRoles={['Admin']} pageKey="customization">
            <Customization />
          </ProtectedRoute>
        );
      
      case 'users': 
        return (
          <ProtectedRoute allowedRoles={['Admin']} pageKey="users">
            <Users />
          </ProtectedRoute>
        );
      
      case 'notifications': return <Notifications />;
      
      // Archive
      case 'bookings-archive': return <BookingsArchive />;
      case 'general-archive': return <GeneralArchive />;
      
      // Activity Logs
      case 'sales-activity-log': return <SalesActivityLog />;
      
      // Admin Tools
      case 'data-import': 
        return (
          <ProtectedRoute allowedRoles={['Admin']} pageKey="data-import">
            <DataImport />
          </ProtectedRoute>
        );
      
      default: return <Dashboard />;
    }
  };

  if (!currentUser) {
    return <Login />;
  }

  return (
    <ProjectProvider>
      <div dir="rtl" className="flex h-screen bg-slate-900 font-sans text-slate-100 overflow-hidden relative">
        {/* Background gradient - exactly like Login */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-0"></div>
        
        {/* Background Pattern - cubes like Login */}
        <div className="absolute inset-0 opacity-20 z-0" style={{backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')"}}></div>
        
        {/* Decorative Glow Effects - exactly like Login */}
        <div className="absolute top-1/4 left-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none z-0"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none z-0"></div>
        {/* Scroll Progress Bar */}
        <div 
          className="scroll-progress" 
          style={{ 
            width: `${scrollProgress}%`,
            transition: 'width 0.1s ease-out'
          }}
        />
        
        <Sidebar 
          activePage={activePage} 
          setActivePage={(page) => {
            setActivePage(page);
            setIsSidebarOpen(false);
          }} 
          interfaceMode={interfaceMode} 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        
        <main className="flex-1 flex flex-col h-screen min-w-0 relative z-0">
          {/* Background Pattern Overlay */}
          <div className="absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMCwgMCwgMCwgMC4wNSkiLz48L3N2Zz4=')]"></div>
          
          <Header
            activePage={activePage}
            interfaceMode={interfaceMode}
            setInterfaceMode={handleSetInterfaceMode}
            setActivePage={setActivePage}
            onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          />
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6 relative z-10 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
            <Suspense fallback={<PageLoader />}>
              {renderPage()}
            </Suspense>
          </div>
        </main>
      </div>
    </ProjectProvider>
  );
};

export default App;