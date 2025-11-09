import { User, Unit, Customer, UnitType, ExpenseCategory, Vendor, Project, Employee, Account, UnitStatus } from './types.ts';

const initialUsers: User[] = [
  { id: 'user_1', name: 'Admin User', password: '123', role: 'Admin' },
  { id: 'user_2', name: 'Sales User', password: '123', role: 'Sales', permissions: { canView: true, canEdit: false, canDelete: false } },
  { id: 'user_3', name: 'Accounting User', password: '123', role: 'Accounting', permissions: { canView: true, canEdit: false, canDelete: false } },
];

const initialUnitTypes: UnitType[] = [
    { id: 'ut_1', name: 'شقة سكنية' },
    { id: 'ut_2', name: 'فيلا مستقلة' },
    { id: 'ut_3', name: 'وحدة تجارية' },
];

const initialUnitStatuses: UnitStatus[] = [
    { id: 'us_1', name: 'Available', isSystem: true },
    { id: 'us_2', name: 'Booked', isSystem: true },
    { id: 'us_3', name: 'Sold', isSystem: true },
];

const initialUnits: Unit[] = [
  { id: 'u_1', name: 'Apartment A-101', type: 'شقة سكنية', status: 'Available', price: 1200000 },
  { id: 'u_2', name: 'Villa V-05', type: 'فيلا مستقلة', status: 'Sold', price: 3500000 },
  { id: 'u_3', name: 'Shop S-G02', type: 'وحدة تجارية', status: 'Available', price: 850000 },
  { id: 'u_4', name: 'Apartment B-204', type: 'شقة سكنية', status: 'Booked', price: 1350000, customerId: 'c_2', customerName: 'فاطمة علي' },
];

const initialCustomers: Customer[] = [
  { id: 'c_1', name: 'أحمد محمود', phone: '01012345678', email: 'ahmed@example.com' },
  { id: 'c_2', name: 'فاطمة علي', phone: '01298765432', email: 'fatima@example.com' },
];

const initialExpenseCategories: ExpenseCategory[] = [
    { id: 'cat_1', name: 'رواتب' },
    { id: 'cat_2', name: 'تسويق وإعلان' },
    { id: 'cat_3', name: 'صيانة ومرافق' },
    { id: 'cat_4', name: 'مواد بناء' },
    { id: 'cat_0', name: 'عام' },
];

const initialVendors: Vendor[] = [
    { id: 'ven_1', name: 'شركة الأجهزة الحديثة', contactPerson: 'محمد علي', phone: '01123456789' },
    { id: 'ven_2', name: 'مقاولات البناء المتحدة', contactPerson: 'خالد إبراهيم', phone: '01234567890' },
];

const initialProjects: Project[] = [
    { id: 'proj_1', name: 'مشروع أبراج النيل', description: 'بناء وتطوير مجمع سكني فاخر على كورنيش النيل.', assignedUserId: 'user_3' },
    { id: 'proj_2', name: 'تجديد المبنى الإداري', description: 'تحديث وتطوير المبنى الإداري الرئيسي للشركة.' },
];

const initialEmployees: Employee[] = [
    { id: 'emp_1', name: 'علي حسن', position: 'مدير مبيعات', salary: 12000 },
    { id: 'emp_2', name: 'سارة كامل', position: 'محاسبة', salary: 8500 },
];

const initialAccounts: Account[] = [
    { id: 'acc_1', name: 'الحساب البنكي الرئيسي', type: 'Bank', initialBalance: 150000 },
    { id: 'acc_2', name: 'خزينة المكتب', type: 'Cash', initialBalance: 7500 },
];

export const initializeLocalStorage = () => {
    if (!localStorage.getItem('users')) localStorage.setItem('users', JSON.stringify(initialUsers));
    if (!localStorage.getItem('unitTypes')) localStorage.setItem('unitTypes', JSON.stringify(initialUnitTypes));
    if (!localStorage.getItem('unitStatuses')) localStorage.setItem('unitStatuses', JSON.stringify(initialUnitStatuses));
    if (!localStorage.getItem('units')) localStorage.setItem('units', JSON.stringify(initialUnits));
    if (!localStorage.getItem('customers')) localStorage.setItem('customers', JSON.stringify(initialCustomers));
    if (!localStorage.getItem('expenseCategories')) localStorage.setItem('expenseCategories', JSON.stringify(initialExpenseCategories));
    if (!localStorage.getItem('vendors')) localStorage.setItem('vendors', JSON.stringify(initialVendors));
    if (!localStorage.getItem('projects')) localStorage.setItem('projects', JSON.stringify(initialProjects));
    if (!localStorage.getItem('employees')) localStorage.setItem('employees', JSON.stringify(initialEmployees));
    if (!localStorage.getItem('accounts')) localStorage.setItem('accounts', JSON.stringify(initialAccounts));
    
    // Initialize empty arrays for transactional data
    if (!localStorage.getItem('bookings')) localStorage.setItem('bookings', '[]');
    if (!localStorage.getItem('payments')) localStorage.setItem('payments', '[]');
    if (!localStorage.getItem('unitSales')) localStorage.setItem('unitSales', '[]');
    if (!localStorage.getItem('expenses')) localStorage.setItem('expenses', '[]');
    if (!localStorage.getItem('deferredPayments')) localStorage.setItem('deferredPayments', '[]');
    if (!localStorage.getItem('deferredPaymentInstallments')) localStorage.setItem('deferredPaymentInstallments', '[]');
    if (!localStorage.getItem('budgets')) localStorage.setItem('budgets', '[]');
    if (!localStorage.getItem('activityLog')) localStorage.setItem('activityLog', '[]');
    if (!localStorage.getItem('transactions')) localStorage.setItem('transactions', '[]');
    if (!localStorage.getItem('projectTransactions')) localStorage.setItem('projectTransactions', '[]');
    if (!localStorage.getItem('accountingDocuments')) localStorage.setItem('accountingDocuments', '[]');
    
    // Initialize system settings
    if (!localStorage.getItem('systemCurrency')) localStorage.setItem('systemCurrency', 'IQD');
    if (!localStorage.getItem('systemDecimalPlaces')) localStorage.setItem('systemDecimalPlaces', '2');
};