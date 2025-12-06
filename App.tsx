import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { InterfaceMode } from './types';
import Sidebar from './components/Sidebar';
// FIX: Corrected import paths for components.
import Header from './components/Header';
import Login from './components/pages/Login';
import { useScrollProgress } from './utils/scrollAnimations';
import { canAccessPage, getDefaultPage } from './utils/permissions';
import { ProtectedRoute } from './components/shared/ProtectedRoute';

// Projects Interface Pages
import Dashboard from './components/pages/Dashboard';
import Units from './components/pages/Units';
import Customers from './components/pages/Customers';
import { Bookings } from './components/pages/Bookings';
import Payments from './components/pages/Payments';
import UnitSales from './components/pages/UnitSales';
import SalesDocuments from './components/pages/SalesDocuments';
import Reports from './components/pages/Reports';
import FinancialSummary from './components/pages/FinancialSummary';
import Customization from './components/pages/Customization';
import Users from './components/pages/Users';
import Notifications from './components/pages/Notifications';
import ProjectUserManagement from './components/pages/ProjectUserManagement';
import ProjectsManagement from './components/pages/ProjectsManagement';
import BookingsArchive from './components/pages/BookingsArchive';
import GeneralArchive from './components/pages/GeneralArchive';
import DataImport from './components/pages/DataImport';

// Expenses Interface Pages
import FinancialDashboard from './components/pages/expenses/FinancialDashboard';
import { Expenses } from './components/pages/expenses/Expenses';
import Treasury from './components/pages/expenses/Treasury';
import DeferredPayments from './components/pages/expenses/DeferredPayments';
import Employees from './components/pages/expenses/Employees';
import Projects from './components/pages/expenses/Projects';
import ProjectsAccounting from './components/pages/expenses/ProjectsAccounting';
import CategoryAccounting from './components/pages/expenses/CategoryAccounting';
import DocumentsAccounting from './components/pages/expenses/DocumentsAccounting';
import ActivityLog from './components/pages/expenses/ActivityLog';


const App: React.FC = () => {
  const { currentUser } = useAuth();
  const scrollProgress = useScrollProgress();
  
  const [interfaceMode, setInterfaceMode] = useState<InterfaceMode>(() => {
    if (currentUser?.role === 'Sales') return 'projects';
    if (currentUser?.role === 'Accounting') return 'expenses';
    return (sessionStorage.getItem('interfaceMode') as InterfaceMode) || 'projects';
  });

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
        
        console.log('🎨 Loading accent color:', colorToUse);
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
          console.warn(`Invalid currency code detected: "${currentCurrency}", fixing to IQD`);
          
          // Fix in database
          await settingsService.set('systemCurrency', 'IQD');
          
          // Fix in localStorage
          localStorage.removeItem('systemCurrency');
          localStorage.setItem('systemCurrency', 'IQD');
          
          // Refresh currency cache
          const { refreshCurrencyCache } = await import('./utils/currencyFormatter');
          await refreshCurrencyCache();
          
          console.log('✅ Currency fixed to IQD');
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

  const renderPage = () => {
    // التحقق من صلاحية الوصول للصفحة
    if (currentUser && !canAccessPage(currentUser.role, activePage)) {
      // إعادة التوجيه للصفحة الافتراضية إذا لم يكن لديه صلاحية
      const defaultPage = getDefaultPage(currentUser.role);
      setActivePage(defaultPage);
      return null;
    }

    switch (activePage) {
      // Projects
      case 'dashboard': return <Dashboard />;
      case 'units': return <Units />;
      case 'customers': return <Customers />;
      case 'bookings': return <Bookings />;
      case 'payments': return <Payments />;
      case 'sales': return <UnitSales />;
      case 'sales-documents': return <SalesDocuments />;
      case 'reports': return <Reports />;
      case 'financial-summary': return <FinancialSummary />;
      
      // Expenses
      case 'expense_dashboard': return <FinancialDashboard />;
      case 'expenses': return <Expenses />;
      case 'treasury': return <Treasury />;
      case 'deferred-payments': return <DeferredPayments />;
      case 'employees': return <Employees />;
      case 'projects': return <Projects />;
      case 'projects-accounting': return <ProjectsAccounting />;
      case 'category-accounting': return <CategoryAccounting />;
      case 'documents-accounting': return <DocumentsAccounting />;
      case 'activity-log': return <ActivityLog />;

      // System - Protected Pages
      case 'customization': 
        return (
          <ProtectedRoute allowedRoles={['Admin']}>
            <Customization />
          </ProtectedRoute>
        );
      
      case 'users': 
        return (
          <ProtectedRoute allowedRoles={['Admin']}>
            <Users />
          </ProtectedRoute>
        );
      
      case 'notifications': return <Notifications />;
      
      case 'project-user-management': 
        return (
          <ProtectedRoute allowedRoles={['Admin']}>
            <ProjectUserManagement />
          </ProtectedRoute>
        );
      
      case 'projects-management': 
        return (
          <ProtectedRoute allowedRoles={['Admin']}>
            <ProjectsManagement />
          </ProtectedRoute>
        );
      
      // Archive
      case 'bookings-archive': return <BookingsArchive />;
      case 'general-archive': return <GeneralArchive />;
      
      // Admin Tools
      case 'data-import': 
        return (
          <ProtectedRoute allowedRoles={['Admin']}>
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
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none z-0"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none z-0"></div>
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
        
        <main className="flex-1 flex flex-col h-screen relative z-0">
          {/* Background Pattern Overlay */}
          <div className="absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMCwgMCwgMCwgMC4wNSkiLz48L3N2Zz4=')]"></div>
          
          <Header
            activePage={activePage}
            interfaceMode={interfaceMode}
            setInterfaceMode={handleSetInterfaceMode}
            setActivePage={setActivePage}
            onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          />
          <div className="flex-1 overflow-y-auto p-6 relative z-10 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
            {renderPage()}
          </div>
        </main>
      </div>
    </ProjectProvider>
  );
};

export default App;