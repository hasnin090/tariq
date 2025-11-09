import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { InterfaceMode } from './types';
import Sidebar from './components/Sidebar';
// FIX: Corrected import paths for components.
import Header from './components/Header';
import Login from './components/pages/Login';

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

// Expenses Interface Pages
import ExpenseDashboard from './components/pages/expenses/ExpenseDashboard';
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
  
  const [interfaceMode, setInterfaceMode] = useState<InterfaceMode>(() => {
    if (currentUser?.role === 'Sales') return 'projects';
    if (currentUser?.role === 'Accounting') return 'expenses';
    return (sessionStorage.getItem('interfaceMode') as InterfaceMode) || 'projects';
  });

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
      case 'expense_dashboard': return <ExpenseDashboard />;
      case 'expenses': return <Expenses />;
      case 'treasury': return <Treasury />;
      case 'deferred-payments': return <DeferredPayments />;
      case 'employees': return <Employees />;
      case 'projects': return <Projects />;
      case 'projects-accounting': return <ProjectsAccounting />;
      case 'category-accounting': return <CategoryAccounting />;
      case 'documents-accounting': return <DocumentsAccounting />;
      case 'activity-log': return <ActivityLog />;

      // System
      case 'customization': return <Customization />;
      case 'users': return <Users />;
      
      default: return <Dashboard />;
    }
  };

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div dir="rtl" className="flex h-screen bg-slate-100 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-300 overflow-hidden">
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
      <main className="flex-1 flex flex-col h-screen">
        <Header
          activePage={activePage}
          interfaceMode={interfaceMode}
          setInterfaceMode={handleSetInterfaceMode}
          setActivePage={setActivePage}
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        />
        <div className="flex-1 overflow-y-auto p-6">
          {renderPage()}
        </div>
      </main>
    </div>
  );
};

export default App;