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
  unitSaleId?: string; // رابط إلى جدول unit_sales
  // حقول خطة الدفع الجديدة
  paymentPlanYears?: 4 | 5;  // 4 سنوات أو 5 سنوات
  paymentFrequencyMonths?: 1 | 2 | 3 | 4 | 5 | 6 | 12;  // شهري أو كل 2/3/4/5/6/12 أشهر
  paymentStartDate?: string;  // تاريخ بدء الدفعات
  monthlyAmount?: number;  // المبلغ الشهري المحسوب
  installmentAmount?: number;  // مبلغ الدفعة الواحدة
  totalInstallments?: number;  // إجمالي عدد الدفعات
}

// الدفعات المجدولة
export interface ScheduledPayment {
  id: string;
  bookingId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'partially_paid';
  paidAmount?: number;
  paidDate?: string;
  paymentId?: string;
  notificationSent?: boolean;
  notificationSentAt?: string;
  notes?: string;
  attachment_id?: string; // رابط إلى جدول payment_attachments
  // بيانات مضافة من JOIN
  unitName?: string;
  customerName?: string;
  customerPhone?: string;
  daysUntilDue?: number;
  urgency?: 'متأخرة' | 'اليوم' | 'قريباً' | 'مجدولة';
}

// إشعارات الدفعات
export interface PaymentNotification {
  id: string;
  scheduledPaymentId: string;
  bookingId: string;
  customerName: string;
  customerPhone: string;
  unitName: string;
  amountDue: number;
  dueDate: string;
  notificationType: 'reminder' | 'due_today' | 'overdue';
  isRead: boolean;
  userId?: string;
  createdAt: string;
}

export interface Payment {
    id: string;
    bookingId: string;
    amount: number;
    paymentDate: string;
    paymentType: 'booking' | 'installment' | 'final' | 'extra'; // نوع الدفعة (extra = دفعة إضافية خارج الخطة)
    accountId?: string;
    accountName?: string;
    receiptNumber?: string;
    scheduledPaymentId?: string;
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
  name?: string;
  file_name: string;
  fileName?: string;
  storage_path: string;
  storagePath?: string;
  file_type?: string;
  fileType?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  folderId?: string;
  categoryId?: string;
  projectId?: string;
  description?: string;
  tags?: string[];
  uploaded_at: string;
  customer_id?: string;
  booking_id?: string;
  publicUrl?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
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
    projectId?: string;
    sale_id?: string;
    uploadedAt?: string;
    storagePath?: string;
    signedUrl?: string | null;
    hasError?: boolean;
    isLoadingUrl?: boolean;
    isDuplicate?: boolean;
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
    description?: string;
    projectId?: string | null;  // إذا كان null فهي فئة عامة مشتركة
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
    projectName?: string;  // اسم المشروع (للعرض - يأتي من JOIN)
    phone?: string;
    email?: string;
    hireDate?: string;
    isActive?: boolean;
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

// ============================================================================
// نظام الدفعات المؤجلة (منفصل عن الحركات المالية)
// ============================================================================

/** الحساب الآجل / الدين */
export interface DeferredPayment {
    id: string;
    description: string;       // وصف الحساب (مثال: "دين مورد البناء")
    projectId: string;         // المشروع المرتبط
    projectName?: string;      // اسم المشروع (للعرض - من JOIN)
    vendorId?: string;         // المورد (اختياري)
    vendorName?: string;       // اسم المورد (للعرض)
    totalAmount: number;       // المبلغ الإجمالي المستحق
    amountPaid: number;        // إجمالي المدفوع حتى الآن
    dueDate?: string;          // تاريخ الاستحقاق (اختياري)
    status: 'Pending' | 'Partially Paid' | 'Paid';
    notes?: string;            // ملاحظات إضافية
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
}

/** دفعة/قسط من الحساب الآجل */
export interface DeferredPaymentInstallment {
    id: string;
    deferredPaymentId: string; // الحساب الآجل المرتبط
    paymentDate: string;       // تاريخ الدفع
    amount: number;            // المبلغ المدفوع
    accountId: string;         // الحساب المسحوب منه (صندوق/بنك)
    accountName?: string;      // اسم الحساب (للعرض)
    notes?: string;            // ملاحظات
    receiptNumber?: string;    // رقم الإيصال
    createdAt?: string;
    createdBy?: string;
}

export interface Budget {
    id: string;
    categoryId: string;
    categoryName: string;
    amount: number;
}

// ============================================================================
// أنواع الدفعات والمرفقات
// ============================================================================

/** الدفعات الإضافية */
export interface ExtraPayment {
  id: string;
  bookingId: string;
  amount: number;
  paymentDate: string;
  paymentType: string;
  description?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  // بيانات من JOIN
  projectId?: string;
  projectName?: string;
  customerName?: string;
  customerPhone?: string;
  unitName?: string;
}

/** مرفقات الدفعات */
export interface PaymentAttachment {
  id: string;
  paymentId: string;
  fileName: string;
  filePath: string;
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  createdAt?: string;
}

// ============================================================================
// أنواع المستندات
// ============================================================================

/** مجلد المستندات */
export interface DocumentFolder {
  id: string;
  name: string;
  parentId?: string;
  projectId?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

/** تصنيف المستندات */
export interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
  createdAt?: string;
}

/** بيانات الملف */
export interface FileMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
}

// ============================================================================
// سجل النشاطات
// ============================================================================

/** سجل النشاط */
export interface ActivityLog {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  interfaceMode?: 'projects' | 'expenses';
  timestamp?: string;
  createdAt?: string;
}

export interface ActivityLogEntry {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  interface_mode?: 'projects' | 'expenses'; // لتحديد الواجهة (مبيعات أو محاسبة)
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
  projectId?: string;      // معرف المشروع المرتبط
  projectName?: string;    // اسم المشروع (للعرض)
  description?: string;    // وصف الحساب
  isActive?: boolean;      // هل الحساب نشط
  createdAt?: string;      // تاريخ الإنشاء
}

export interface Transaction {
  id: string;
  accountId: string;
  accountName: string;
  type: 'Deposit' | 'Withdrawal';
  date: string;
  description: string;
  amount: number;
  projectId?: string | null;
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

// ============================================================================
// نظام القيد المزدوج (Double-Entry Bookkeeping)
// ============================================================================

/** أنواع الحسابات في دليل الحسابات */
export type AccountCategory = 
  | 'asset'      // أصول (الصندوق، البنك، ذمم العملاء)
  | 'liability'  // التزامات (ذمم الموردين، قروض)
  | 'equity'     // حقوق الملكية (رأس المال)
  | 'revenue'    // إيرادات (مبيعات)
  | 'expense';   // مصروفات

/** دليل الحسابات (Chart of Accounts) */
export interface ChartOfAccount {
  id: string;
  code: string;           // رمز الحساب (مثل: 1001, 2001)
  name: string;           // اسم الحساب
  nameEn?: string;        // الاسم بالإنجليزية
  category: AccountCategory;
  parentId?: string;      // للحسابات الفرعية
  level: number;          // مستوى التسلسل (1 = رئيسي)
  isActive: boolean;
  description?: string;
  normalBalance: 'debit' | 'credit'; // الرصيد الطبيعي
  currentBalance: number; // الرصيد الحالي
  projectId?: string;     // اختياري - لربطه بمشروع معين
  createdAt?: string;
  updatedAt?: string;
}

/** القيد اليومي (Journal Entry) */
export interface JournalEntry {
  id: string;
  entryNumber: string;    // رقم القيد (تسلسلي)
  date: string;
  description: string;
  referenceType?: 'payment' | 'expense' | 'sale' | 'salary' | 'manual' | 'deferred';
  referenceId?: string;   // رابط للمعاملة الأصلية
  status: 'draft' | 'posted' | 'reversed';
  totalDebit: number;
  totalCredit: number;
  projectId?: string;
  createdBy?: string;
  createdAt?: string;
  postedAt?: string;
  postedBy?: string;
  reversedEntryId?: string; // إذا كان قيد عكسي
  lines?: JournalEntryLine[];
}

/** سطر القيد (Journal Entry Line) */
export interface JournalEntryLine {
  id: string;
  entryId: string;
  accountId: string;
  accountCode?: string;   // للعرض
  accountName?: string;   // للعرض
  debit: number;
  credit: number;
  description?: string;
  costCenter?: string;    // مركز التكلفة (اختياري)
}

/** ملخص الحساب للتقارير */
export interface AccountSummary {
  accountId: string;
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
}

/** ميزان المراجعة */
export interface TrialBalance {
  date: string;
  accounts: AccountSummary[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}