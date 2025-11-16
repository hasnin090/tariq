export type InterfaceMode = 'projects' | 'expenses';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'Admin' | 'Sales' | 'Accounting';
  permissions?: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
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
    customerId?: string;
    customerName?: string;
    unitId?: string;
    unitName?: string;
    amount: number;
    paymentDate: string;
    unitPrice: number;
    remainingAmount: number;
    accountId?: string;
    transactionId?: string;
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
    id: string;
    name: string;
    type?: string;
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
    assignedUserId?: string;
}

export interface Employee {
    id: string;
    name: string;
    position: string;
    salary: number;
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
    transactionId?: string;
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
    assignedProjectId?: string;
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