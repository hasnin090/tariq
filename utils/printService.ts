/**
 * 🖨️ Print Service
 * خدمة الطباعة الشاملة - عقود، فواتير، إيصالات، تقارير
 */

import jsPDF from 'jspdf';
import { formatCurrency } from './currencyFormatter';

// ==================== Types ====================

export interface PrintSettings {
  paperSize: 'a4' | 'a5' | 'letter';
  orientation: 'portrait' | 'landscape';
  margin: number;
  fontSize: number;
  showLogo: boolean;
  showWatermark: boolean;
  copies: number;
}

export interface CompanyInfo {
  name: string;
  nameEn?: string;
  logo?: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  taxNumber?: string;
  commercialRegister?: string;
}

export interface CustomerInfo {
  id: string;
  name: string;
  phone: string;
  email?: string;
  nationalId?: string;
  address?: string;
}

export interface UnitInfo {
  id: string;
  name: string;
  type: string;
  area?: number;
  price: number;
  projectName: string;
  building?: string;
  floor?: string;
}

export interface BookingInfo {
  id: string;
  date: string;
  customer: CustomerInfo;
  unit: UnitInfo;
  totalPrice: number;
  downPayment: number;
  remainingAmount: number;
  paymentMethod: string;
  installmentsCount?: number;
  notes?: string;
}

export interface PaymentInfo {
  id: string;
  date: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  bookingId: string;
  customerName: string;
  unitName: string;
  receiptNumber: string;
}

export interface InvoiceInfo {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  customer: CustomerInfo;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  status: 'pending' | 'paid' | 'partial' | 'overdue';
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// ==================== Default Settings ====================

const DEFAULT_SETTINGS: PrintSettings = {
  paperSize: 'a4',
  orientation: 'portrait',
  margin: 20,
  fontSize: 12,
  showLogo: true,
  showWatermark: false,
  copies: 1
};

const DEFAULT_COMPANY: CompanyInfo = {
  name: 'شركة طريق العامرة',
  nameEn: 'Tariq Al-Amarah Co.',
  address: 'جمهورية العراق',
  phone: '+964',
  email: 'info@tariq-alamara.com'
};

// ==================== Helpers ====================

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatDateShort = (date: string): string => {
  return new Date(date).toLocaleDateString('ar-IQ');
};

const generateReceiptNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `REC-${year}${month}-${random}`;
};

const generateInvoiceNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
};

// ==================== HTML Templates ====================

/**
 * قالب العقد
 */
export const generateContractHTML = (
  booking: BookingInfo,
  company: CompanyInfo = DEFAULT_COMPANY
): string => {
  const projectName = booking.unit.projectName?.trim() || 'مجمع الحميدية السكني';
  // حساب تاريخ انتهاء صلاحية الحجز (20 يوم من تاريخ الحجز)
  const bookingDate = new Date(booking.date);
  const expiryDate = new Date(bookingDate);
  expiryDate.setDate(expiryDate.getDate() + 20);
  
  // تحديد إذا كانت طريقة الدفع بالتقسيط أو كاش
  const isInstallment = booking.installmentsCount && booking.installmentsCount > 1;
  const paymentMethodDisplay = isInstallment ? 'أقساط' : 'كاش';

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>نموذج حجز وحدة سكنية - ${booking.customer.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 15mm; }
    body {
      font-family: 'Traditional Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
      direction: rtl;
      padding: 30px;
      line-height: 2;
      color: #000;
      background: #fff;
    }
    .header {
      text-align: center;
      border-bottom: 3px double #000;
      padding-bottom: 15px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #000;
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .section {
      margin: 25px 0;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
      text-decoration: underline;
    }
    .info-row {
      margin: 12px 0;
      line-height: 2.2;
    }
    .label {
      font-weight: bold;
    }
    .value {
      display: inline-block;
    }
    .terms-list {
      list-style: decimal;
      padding-right: 30px;
      line-height: 2.5;
    }
    .terms-list li {
      margin: 8px 0;
    }
    .signatures {
      margin-top: 60px;
      display: flex;
      justify-content: space-between;
      padding: 0 50px;
    }
    .signature-box {
      text-align: center;
      min-width: 200px;
    }
    .signature-line {
      border-bottom: 1px solid #000;
      height: 50px;
      margin-bottom: 8px;
    }
    .signature-label {
      font-weight: bold;
    }
    @media print {
      body { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>نموذج حجز وحدة سكنية</h1>
  </div>

  <div class="section">
    <div class="section-title">بيانات الطرفين:</div>
    <div class="info-row">
      <span class="label">• البائع:</span>
      <span class="value">شركة طريق العامرة المالكة مشروع ${projectName}</span>
    </div>
    <div class="info-row">
      <span class="label">• المشتري:</span>
      <span class="value">${booking.customer.name}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">وصف الوحدة السكنية:</div>
    <div class="info-row">
      <span class="label">• المشروع:</span>
      <span class="value">${projectName}</span>
    </div>
    <div class="info-row">
      <span class="label">• رقم الوحدة:</span>
      <span class="value">${booking.unit.name}</span>
    </div>
    <div class="info-row">
      <span class="label">• المساحة:</span>
      <span class="value">${booking.unit.area ? booking.unit.area + ' م²' : booking.unit.type}</span>
    </div>
    <div class="info-row">
      <span class="label">• المدينة/الحي:</span>
      <span class="value">واسط / الزبيدية</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">تفاصيل الحجز المالي:</div>
    <div class="info-row">
      <span class="label">• إجمالي قيمة الوحدة:</span>
      <span class="value">${formatCurrency(booking.totalPrice)}</span>
    </div>
    <div class="info-row">
      <span class="label">• مبلغ الحجز (العربون):</span>
      <span class="value">${formatCurrency(booking.downPayment)}</span>
    </div>
    <div class="info-row">
      <span class="label">• طريقة السداد:</span>
      <span class="value">${paymentMethodDisplay}</span>
    </div>
    <div class="info-row">
      <span class="label">• تاريخ انتهاء صلاحية الحجز:</span>
      <span class="value">${formatDate(expiryDate.toISOString())} (20 يوم بعد الحجز)</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">الشروط والأحكام:</div>
    <ol class="terms-list">
      <li>يعتبر هذا النموذج حجزاً مبدئياً ولا يعد عقداً للبيع إلا بعد استكمال الإجراءات.</li>
      <li>يلتزم المشتري باستكمال الدفعة الأولى وتوقيع العقد النهائي في موعد أقصاه التاريخ المذكور أعلاه.</li>
      <li>في حال تراجع المشتري، تخضع استرداد قيمة العربون لسياسة الشركة المتمثلة في (استقطاع 10% من دفع الحجز عند إلغاء الحجز).</li>
    </ol>
  </div>

  <div class="signatures">
    <div class="signature-box">
      <div class="signature-line"></div>
      <div class="signature-label">توقيع المشتري: ...........................</div>
    </div>
    <div class="signature-box">
      <div class="signature-line"></div>
      <div class="signature-label">توقيع البائع: ...........................</div>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * قالب إيصال الدفع
 */
export const generateReceiptHTML = (
  payment: PaymentInfo,
  company: CompanyInfo = DEFAULT_COMPANY
): string => {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>إيصال دفع - ${payment.receiptNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A5; margin: 10mm; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      direction: rtl;
      padding: 30px;
      line-height: 1.6;
      color: #1a1a2e;
      background: #fff;
      max-width: 500px;
      margin: 0 auto;
    }
    .receipt {
      border: 2px solid #10b981;
      border-radius: 16px;
      overflow: hidden;
    }
    .receipt-header {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      text-align: center;
      padding: 20px;
    }
    .receipt-header h1 {
      font-size: 24px;
      margin-bottom: 5px;
    }
    .receipt-header .receipt-number {
      font-size: 14px;
      opacity: 0.9;
    }
    .receipt-body {
      padding: 25px;
    }
    .amount-box {
      background: #f0fdf4;
      border: 2px dashed #10b981;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 20px 0;
    }
    .amount-label {
      color: #059669;
      font-size: 14px;
      margin-bottom: 5px;
    }
    .amount-value {
      font-size: 32px;
      font-weight: bold;
      color: #047857;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #6b7280;
    }
    .info-value {
      font-weight: 600;
      color: #1f2937;
    }
    .receipt-footer {
      background: #f9fafb;
      padding: 15px 25px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    .stamp {
      display: inline-block;
      border: 3px solid #10b981;
      border-radius: 50%;
      padding: 15px;
      margin-top: 15px;
      color: #10b981;
      font-weight: bold;
    }
    @media print {
      body { padding: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-header">
      <h1>✓ إيصال استلام</h1>
      <div class="receipt-number">رقم الإيصال: ${payment.receiptNumber}</div>
    </div>

    <div class="receipt-body">
      <div class="amount-box">
        <div class="amount-label">المبلغ المستلم</div>
        <div class="amount-value">${formatCurrency(payment.amount)}</div>
      </div>

      <div class="info-row">
        <span class="info-label">التاريخ:</span>
        <span class="info-value">${formatDate(payment.date)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">اسم العميل:</span>
        <span class="info-value">${payment.customerName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">الوحدة:</span>
        <span class="info-value">${payment.unitName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">طريقة الدفع:</span>
        <span class="info-value">${payment.paymentMethod}</span>
      </div>
      ${payment.referenceNumber ? `
      <div class="info-row">
        <span class="info-label">رقم المرجع:</span>
        <span class="info-value">${payment.referenceNumber}</span>
      </div>
      ` : ''}

      <div style="text-align: center; margin-top: 20px;">
        <div class="stamp">تم الدفع</div>
      </div>
    </div>

    <div class="receipt-footer">
      <p>${company.name}</p>
      <p>${company.phone} | ${company.email}</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * قالب الفاتورة
 */
export const generateInvoiceHTML = (
  invoice: InvoiceInfo,
  company: CompanyInfo = DEFAULT_COMPANY
): string => {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>فاتورة - ${invoice.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 15mm; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      direction: rtl;
      padding: 40px;
      line-height: 1.6;
      color: #1a1a2e;
      background: #fff;
    }
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #6366f1;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .company-info h1 {
      color: #6366f1;
      font-size: 24px;
      margin-bottom: 5px;
    }
    .company-info p {
      color: #6b7280;
      font-size: 14px;
    }
    .invoice-title {
      text-align: left;
    }
    .invoice-title h2 {
      font-size: 32px;
      color: #1f2937;
    }
    .invoice-number {
      background: #6366f1;
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 14px;
      display: inline-block;
      margin-top: 5px;
    }
    .status-badge {
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      display: inline-block;
      margin-top: 10px;
    }
    .status-pending { background: #fef3c7; color: #b45309; }
    .status-paid { background: #d1fae5; color: #047857; }
    .status-partial { background: #dbeafe; color: #1d4ed8; }
    .status-overdue { background: #fee2e2; color: #dc2626; }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin: 30px 0;
    }
    .party-box {
      background: #f8fafc;
      border-radius: 12px;
      padding: 20px;
    }
    .party-title {
      color: #6366f1;
      font-weight: bold;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    .party-box p {
      margin: 5px 0;
      color: #4b5563;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
    }
    .items-table th {
      background: #6366f1;
      color: white;
      padding: 12px;
      text-align: right;
    }
    .items-table th:first-child {
      border-radius: 0 8px 0 0;
    }
    .items-table th:last-child {
      border-radius: 8px 0 0 0;
    }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .items-table tr:nth-child(even) {
      background: #f9fafb;
    }
    .totals {
      display: flex;
      justify-content: flex-end;
    }
    .totals-box {
      width: 300px;
      background: #f8fafc;
      border-radius: 12px;
      padding: 20px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .total-row:last-child {
      border-bottom: none;
      font-size: 18px;
      font-weight: bold;
      color: #6366f1;
      padding-top: 15px;
      margin-top: 10px;
      border-top: 2px solid #6366f1;
    }
    .notes {
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 12px;
      padding: 15px;
      margin-top: 30px;
    }
    .notes-title {
      color: #b45309;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="invoice-header">
    <div class="company-info">
      <h1>${company.name}</h1>
      <p>${company.address}</p>
      <p>${company.phone} | ${company.email}</p>
      ${company.taxNumber ? `<p>الرقم الضريبي: ${company.taxNumber}</p>` : ''}
    </div>
    <div class="invoice-title">
      <h2>فاتورة</h2>
      <div class="invoice-number">${invoice.invoiceNumber}</div>
      <div class="status-badge status-${invoice.status}">
        ${invoice.status === 'paid' ? 'مدفوعة' : 
          invoice.status === 'pending' ? 'معلقة' : 
          invoice.status === 'partial' ? 'مدفوعة جزئياً' : 'متأخرة'}
      </div>
    </div>
  </div>

  <div class="parties">
    <div class="party-box">
      <div class="party-title">📅 تفاصيل الفاتورة</div>
      <p><strong>تاريخ الإصدار:</strong> ${formatDate(invoice.date)}</p>
      ${invoice.dueDate ? `<p><strong>تاريخ الاستحقاق:</strong> ${formatDate(invoice.dueDate)}</p>` : ''}
    </div>
    <div class="party-box">
      <div class="party-title">👤 العميل</div>
      <p><strong>${invoice.customer.name}</strong></p>
      <p>${invoice.customer.phone}</p>
      ${invoice.customer.email ? `<p>${invoice.customer.email}</p>` : ''}
      ${invoice.customer.address ? `<p>${invoice.customer.address}</p>` : ''}
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>#</th>
        <th>الوصف</th>
        <th>الكمية</th>
        <th>سعر الوحدة</th>
        <th>الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.description}</td>
          <td>${item.quantity}</td>
          <td>${formatCurrency(item.unitPrice)}</td>
          <td>${formatCurrency(item.total)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="total-row">
        <span>المجموع الفرعي:</span>
        <span>${formatCurrency(invoice.subtotal)}</span>
      </div>
      ${invoice.tax > 0 ? `
      <div class="total-row">
        <span>الضريبة (15%):</span>
        <span>${formatCurrency(invoice.tax)}</span>
      </div>
      ` : ''}
      ${invoice.discount > 0 ? `
      <div class="total-row">
        <span>الخصم:</span>
        <span>- ${formatCurrency(invoice.discount)}</span>
      </div>
      ` : ''}
      <div class="total-row">
        <span>الإجمالي النهائي:</span>
        <span>${formatCurrency(invoice.total)}</span>
      </div>
    </div>
  </div>

  ${invoice.notes ? `
  <div class="notes">
    <div class="notes-title">📝 ملاحظات</div>
    <p>${invoice.notes}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>${company.name} | ${company.phone} | ${company.email}</p>
    <p>شكراً لتعاملكم معنا</p>
  </div>
</body>
</html>
  `;
};

/**
 * قالب كشف حساب العميل
 */
export const generateAccountStatementHTML = (
  customer: CustomerInfo,
  transactions: Array<{
    date: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }>,
  company: CompanyInfo = DEFAULT_COMPANY
): string => {
  const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
  const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);
  const finalBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : 0;

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>كشف حساب - ${customer.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 15mm; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      direction: rtl;
      padding: 40px;
      line-height: 1.6;
      color: #1a1a2e;
      background: #fff;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #0891b2;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #0891b2;
      font-size: 28px;
    }
    .customer-info {
      background: #f0f9ff;
      border: 1px solid #0891b2;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    .customer-info h3 {
      color: #0891b2;
      margin-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background: #0891b2;
      color: white;
      padding: 12px;
      text-align: right;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    tr:nth-child(even) {
      background: #f9fafb;
    }
    .debit { color: #dc2626; }
    .credit { color: #16a34a; }
    .summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 30px 0;
    }
    .summary-box {
      text-align: center;
      padding: 20px;
      border-radius: 12px;
    }
    .summary-box.debit {
      background: #fee2e2;
      border: 1px solid #fecaca;
    }
    .summary-box.credit {
      background: #d1fae5;
      border: 1px solid #a7f3d0;
    }
    .summary-box.balance {
      background: #dbeafe;
      border: 1px solid #93c5fd;
    }
    .summary-label {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 5px;
    }
    .summary-value {
      font-size: 24px;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 كشف حساب</h1>
    <p style="color: #6b7280; margin-top: 5px;">${company.name}</p>
  </div>

  <div class="customer-info">
    <h3>👤 بيانات العميل</h3>
    <p><strong>الاسم:</strong> ${customer.name}</p>
    <p><strong>الهاتف:</strong> ${customer.phone}</p>
    ${customer.email ? `<p><strong>البريد:</strong> ${customer.email}</p>` : ''}
    <p><strong>تاريخ الكشف:</strong> ${formatDate(new Date().toISOString())}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>التاريخ</th>
        <th>البيان</th>
        <th>مدين</th>
        <th>دائن</th>
        <th>الرصيد</th>
      </tr>
    </thead>
    <tbody>
      ${transactions.map(t => `
        <tr>
          <td>${formatDateShort(t.date)}</td>
          <td>${t.description}</td>
          <td class="debit">${t.debit > 0 ? formatCurrency(t.debit) : '-'}</td>
          <td class="credit">${t.credit > 0 ? formatCurrency(t.credit) : '-'}</td>
          <td>${formatCurrency(t.balance)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-box debit">
      <div class="summary-label">إجمالي المدين</div>
      <div class="summary-value debit">${formatCurrency(totalDebit)}</div>
    </div>
    <div class="summary-box credit">
      <div class="summary-label">إجمالي الدائن</div>
      <div class="summary-value credit">${formatCurrency(totalCredit)}</div>
    </div>
    <div class="summary-box balance">
      <div class="summary-label">الرصيد النهائي</div>
      <div class="summary-value" style="color: ${finalBalance >= 0 ? '#16a34a' : '#dc2626'}">
        ${formatCurrency(Math.abs(finalBalance))} ${finalBalance >= 0 ? '(دائن)' : '(مدين)'}
      </div>
    </div>
  </div>

  <div class="footer">
    <p>${company.name} | ${company.phone} | ${company.email}</p>
    <p>تم إنشاء هذا الكشف إلكترونياً</p>
  </div>
</body>
</html>
  `;
};

// ==================== Print Functions ====================

/**
 * فتح نافذة الطباعة
 */
export const openPrintWindow = (html: string): void => {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    
    // انتظار تحميل الصفحة ثم الطباعة
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  }
};

/**
 * تحويل HTML إلى PDF
 */
export const htmlToPDF = (html: string, filename: string): void => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${filename}</title>
      </head>
      <body>
        ${html}
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
};

/**
 * طباعة عقد
 */
export const printContract = (booking: BookingInfo, company?: CompanyInfo): void => {
  const html = generateContractHTML(booking, company);
  openPrintWindow(html);
};

/**
 * طباعة إيصال
 */
export const printReceipt = (payment: PaymentInfo, company?: CompanyInfo): void => {
  const html = generateReceiptHTML(payment, company);
  openPrintWindow(html);
};

/**
 * طباعة فاتورة
 */
export const printInvoice = (invoice: InvoiceInfo, company?: CompanyInfo): void => {
  const html = generateInvoiceHTML(invoice, company);
  openPrintWindow(html);
};

/**
 * طباعة كشف حساب
 */
export const printAccountStatement = (
  customer: CustomerInfo,
  transactions: Array<{
    date: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }>,
  company?: CompanyInfo
): void => {
  const html = generateAccountStatementHTML(customer, transactions, company);
  openPrintWindow(html);
};

// ==================== Export Functions ====================

export {
  generateReceiptNumber,
  generateInvoiceNumber,
  DEFAULT_SETTINGS,
  DEFAULT_COMPANY
};
