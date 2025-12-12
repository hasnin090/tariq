export type InterfaceMode = 'projects' | 'expenses';

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  password?: string;
  role: 'Admin' | 'Sales' | 'Accounting';
  permissions?: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
  projectAssignments?: ProjectAssignment[];
}

export interface Notification {
  id: string;
  type: 'password_reset' | 'general' | 'alert';
  user_id?: string;
  username?: string;
  message: string;
  is_read: boolean;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

export interface ProjectAssignment {
  projectId: string;
  projectName?: string;
  interfaceMode: 'projects' | 'expenses'; // sales or accounting
  assignedAt?: string;
}

// ============================================================================
// نظام الصلاحيات المتقدم
// ============================================================================

/** صلاحيات المستخدم على مورد معين */
export interface UserResourcePermission {
  id?: string;
  userId: string;
  resource: string; // customers, units, bookings, payments, etc.
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

/** القوائم المتاحة للمستخدم */
export interface UserMenuAccess {
  id?: string;
  userId: string;
  menuKey: string; // dashboard, customers, units, etc.
  isVisible: boolean;
}

/** الأزرار المتاحة للمستخدم في كل صفحة */
export interface UserButtonAccess {
  id?: string;
  userId: string;
  pageKey: string; // الصفحة
  buttonKey: string; // add, edit, delete, export, print, etc.
  isVisible: boolean;
}

/** ربط المستخدم بالمشاريع */
export interface UserProjectAssignment {
  id?: string;
  userId: string;
  projectId: string;
  projectName?: string;
  interfaceMode: 'projects' | 'expenses';
  assignedAt?: string;
  assignedBy?: string;
}

/** تعريف قائمة متاحة في النظام */
export interface MenuDefinition {
  key: string;
  label: string;
  icon?: string;
  interface: 'projects' | 'expenses' | 'both';
}

/** تعريف زر متاح في النظام */
export interface ButtonDefinition {
  key: string;
  label: string;
  page: string;
  interface?: 'projects' | 'expenses' | 'both';
}

/** إعدادات صلاحيات المستخدم الكاملة */
export interface UserFullPermissions {
  resourcePermissions: UserResourcePermission[];
  menuAccess: UserMenuAccess[];
  buttonAccess: UserButtonAccess[];
  projectAssignments: UserProjectAssignment[];
}

export interface UnitType {
  id: string;
  name: string;
}

export interface UnitStatus {
  id: string;
  name: string;
  isSystem?: boolean;
}

export interface Unit {
  id: string;
  name: string;
  type: string;
  status: string;
  price: number;
  customerId?: string;
  customerName?: string;
  projectId?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  documents?: Document[];
  unitId?: string;
  projectId?: string;
}

export interface Booking {
  id: string;
  unitId: string;
  unitName: string;
  customerId: string;
  customerName: string;
  bookingDate: string;
  amountPaid: number;
  status: 'Active' | 'Cancelled' | 'Completed';
  documents?: Document[];
  projectId?: string;
}

export interface Payment {
    id: string;
    bookingId: string;
    amount: number;
    paymentDate: string;
    paymentType: 'booking' | 'installment' | 'final'; // نوع الدفعة
    accountId?: string;
    accountName?: string;
    notes?: string;
    createdBy?: string;
    // البيانات التالية تأتي من JOIN مع جداول أخرى (غير مخزنة مباشرة)
    customerId?: string;
    customerName?: string;
    unitId?: string;
    unitName?: string;
    unitPrice?: number;
    totalPaidSoFar?: number; // إجمالي المدفوع حتى هذه الدفعة (تراكمي)
    remainingAmount?: number; // المتبقي بعد هذه الدفعة
    createdAt?: string;
    updatedAt?: string;
}

export interface Document {
  id: string;
  file_name: string;
  storage_path: string;
  file_type?: string;
  uploaded_at: string;
  customer_id?: string;
  booking_id?: string;
  publicUrl?: string;
}

export interface SaleDocument {
    id?: string;
    name: string;
    type: string;
    data?: string;
    fileName?: string;
    content?: string;
    mimeType?: string;
    expenseId?: string;
    sale_id?: string;
    uploadedAt?: string;
}

export interface UnitSaleRecord {
    id: string;
    unitId: string;
    unitName: string;
    customerId: string;
    customerName: string;
    salePrice: number;
    finalSalePrice: number;
    saleDate: string;
    documents: SaleDocument[];
    accountId: string;
    transactionId?: string;
    projectId?: string;
}


export interface ExpenseCategory {
    id: string;
    name: string;
}

export interface Vendor {
    id: string;
    name: string;
    contactPerson: string;
    phone: string;
}

export interface Project {
    id: string;
    name: string;
    description: string;
    assignedUserId?: string; // deprecated - for backward compatibility
    salesUserId?: string; // user assigned to sales interface
    accountingUserId?: string; // user assigned to accounting interface
    assignedUsers?: ProjectAssignment[]; // new multi-user support
}

export interface Employee {
    id: string;
    name: string;
    position: string;
    salary: number;
    projectId?: string;
}

export interface Expense {
    id: string;
    date: string;
    description: string;
    amount: number;
    categoryId: string;
    vendorId?: string;
    projectId?: string;
    documents?: SaleDocument[];
    accountId: string;
    transactionId?: string; // Used for linking, but not stored in expenses table
    deferredPaymentInstallmentId?: string;
    employeeId?: string;
}

export interface DeferredPayment {
    id: string;
    description: string;
    projectId: string;
    projectName: string;
    totalAmount: number;
    amountPaid: number;
    status: 'Pending' | 'Partially Paid' | 'Paid';
}

export interface DeferredPaymentInstallment {
    id: string;
    deferredPaymentId: string;
    paymentDate: string;
    amount: number;
    accountId: string;
    transactionId: string;
    expenseId: string;
}

export interface Budget {
    id: string;
    categoryId: string;
    categoryName: string;
    amount: number;
}

export interface ActivityLogEntry {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface SearchResult {
  id: string;
  name: string;
  type: string;
  page: string;
}

// FIX: Add `assignedProjectId` to the `currentUser` type to track project assignments.
export type AuthContextType = {
  currentUser: { 
    id: string; 
    name: string; 
    role: 'Admin' | 'Sales' | 'Accounting';
    assignedProjectId?: string; // deprecated
    projectAssignments?: ProjectAssignment[]; // new multi-project support
    permissions?: {
        canView: boolean;
        canEdit: boolean;
        canDelete: boolean;
    };
  } | null;
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;
};

export interface Account {
  id: string;
  name: string;
  type: 'Bank' | 'Cash';
  initialBalance: number;
}

export interface Transaction {
  id: string;
  accountId: string;
  accountName: string;
  type: 'Deposit' | 'Withdrawal';
  date: string;
  description: string;
  amount: number;
  sourceId?: string;
  sourceType?: 'Payment' | 'Sale' | 'Expense' | 'Manual' | 'Salary' | 'Deferred Payment';
}

export interface ProjectTransaction {
  id: string;
  projectId: string;
  date: string;
  type: 'Deposit' | 'Withdrawal';
  description: string;
  amount: number;
}