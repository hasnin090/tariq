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
  scheduledPayments?: ScheduledPaymentInfo[]; // إضافة الأقساط المجدولة
}

export interface ScheduledPaymentInfo {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  paidDate?: string;
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

  // رقم العقد
  const contractNumber = `CNT-${new Date(booking.date).getFullYear()}-${booking.id.slice(0, 6).toUpperCase()}`;

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>عقد حجز وحدة سكنية - ${booking.customer.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 10mm; }
    body {
      font-family: 'Segoe UI', 'Tahoma', 'Traditional Arabic', Arial, sans-serif;
      direction: rtl;
      padding: 0;
      line-height: 1.8;
      color: #333;
      background: #fff;
      font-size: 14px;
    }
    
    /* Container */
    .contract-container {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      border: 3px solid #1a365d;
      border-radius: 8px;
      overflow: hidden;
    }
    
    /* Header */
    .header {
      background: linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #1a365d 100%);
      color: #fff;
      padding: 25px 30px;
      text-align: center;
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #d69e2e, #f6e05e, #d69e2e);
    }
    .company-name {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 5px;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
    }
    .company-name-en {
      font-size: 14px;
      color: #cbd5e0;
      letter-spacing: 2px;
    }
    .contract-title {
      font-size: 22px;
      font-weight: bold;
      margin-top: 15px;
      padding: 10px 30px;
      background: rgba(255,255,255,0.1);
      border-radius: 25px;
      display: inline-block;
    }
    
    /* Contract Info Bar */
    .contract-info-bar {
      background: #f7fafc;
      border-bottom: 2px solid #e2e8f0;
      padding: 15px 30px;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 15px;
    }
    .contract-info-item {
      text-align: center;
    }
    .contract-info-label {
      font-size: 11px;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .contract-info-value {
      font-size: 14px;
      font-weight: bold;
      color: #1a365d;
      margin-top: 3px;
    }
    
    /* Content */
    .content {
      padding: 25px 30px;
    }
    
    /* Section */
    .section {
      margin-bottom: 25px;
      background: #fafafa;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .section-header {
      background: linear-gradient(90deg, #2c5282, #3182ce);
      color: #fff;
      padding: 10px 20px;
      font-size: 16px;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section-header .icon {
      width: 24px;
      height: 24px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }
    .section-body {
      padding: 20px;
    }
    
    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .info-item.full-width {
      grid-column: 1 / -1;
    }
    .info-label {
      font-weight: bold;
      color: #4a5568;
      min-width: 100px;
      flex-shrink: 0;
    }
    .info-label::after {
      content: ':';
    }
    .info-value {
      color: #1a202c;
      font-weight: 500;
    }
    .info-value.highlight {
      color: #2c5282;
      font-weight: bold;
      font-size: 16px;
    }
    
    /* Parties Section */
    .parties-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    .party-box {
      background: #fff;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .party-box.seller {
      border-color: #3182ce;
    }
    .party-box.buyer {
      border-color: #38a169;
    }
    .party-title {
      font-size: 12px;
      color: #718096;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .party-name {
      font-size: 18px;
      font-weight: bold;
      color: #1a202c;
    }
    .party-subtitle {
      font-size: 12px;
      color: #718096;
      margin-top: 5px;
    }
    
    /* Financial Summary */
    .financial-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-top: 15px;
    }
    .financial-item {
      background: #fff;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .financial-item.total {
      border-color: #3182ce;
      background: linear-gradient(135deg, #ebf8ff 0%, #fff 100%);
    }
    .financial-item.paid {
      border-color: #38a169;
      background: linear-gradient(135deg, #f0fff4 0%, #fff 100%);
    }
    .financial-item.remaining {
      border-color: #d69e2e;
      background: linear-gradient(135deg, #fffff0 0%, #fff 100%);
    }
    .financial-label {
      font-size: 11px;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .financial-value {
      font-size: 20px;
      font-weight: bold;
      margin-top: 5px;
    }
    .financial-item.total .financial-value { color: #2c5282; }
    .financial-item.paid .financial-value { color: #276749; }
    .financial-item.remaining .financial-value { color: #975a16; }
    
    /* Installments Table */
    .installments-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 13px;
    }
    .installments-table th {
      background: #2c5282;
      color: #fff;
      padding: 12px 10px;
      text-align: center;
      font-weight: bold;
    }
    .installments-table th:first-child { border-radius: 8px 0 0 0; }
    .installments-table th:last-child { border-radius: 0 8px 0 0; }
    .installments-table td {
      padding: 10px;
      text-align: center;
      border-bottom: 1px solid #e2e8f0;
    }
    .installments-table tr:nth-child(even) { background: #f7fafc; }
    .installments-table tr:hover { background: #edf2f7; }
    .status-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
    }
    .status-paid { background: #c6f6d5; color: #276749; }
    .status-pending { background: #fef3c7; color: #975a16; }
    .status-overdue { background: #fed7d7; color: #c53030; }
    .installments-table tfoot td {
      background: #edf2f7;
      font-weight: bold;
      border-top: 2px solid #2c5282;
    }
    
    /* Terms */
    .terms-list {
      list-style: none;
      padding: 0;
      counter-reset: terms;
    }
    .terms-list li {
      position: relative;
      padding: 10px 15px 10px 0;
      margin-bottom: 10px;
      background: #fff;
      border-radius: 5px;
      border-right: 4px solid #3182ce;
      counter-increment: terms;
    }
    .terms-list li::before {
      content: counter(terms) '.';
      position: absolute;
      right: -25px;
      top: 10px;
      width: 20px;
      height: 20px;
      background: #3182ce;
      color: #fff;
      border-radius: 50%;
      font-size: 11px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    /* Signatures */
    .signatures-section {
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px dashed #e2e8f0;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 50px;
      padding: 0 30px;
    }
    .signature-box {
      text-align: center;
    }
    .signature-label {
      font-weight: bold;
      color: #4a5568;
      margin-bottom: 10px;
    }
    .signature-line {
      border-bottom: 2px solid #1a365d;
      height: 60px;
      margin-bottom: 8px;
      background: linear-gradient(to bottom, transparent 90%, #f7fafc 100%);
    }
    .signature-name {
      font-size: 12px;
      color: #718096;
    }
    
    /* Footer */
    .footer {
      background: #1a365d;
      color: #fff;
      padding: 15px 30px;
      text-align: center;
      font-size: 12px;
      margin-top: 30px;
    }
    .footer-contact {
      display: flex;
      justify-content: center;
      gap: 30px;
      flex-wrap: wrap;
    }
    .footer-contact span {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    @media print {
      body { padding: 0; }
      .contract-container { border: none; }
    }
  </style>
</head>
<body>
  <div class="contract-container">
    <!-- Header -->
    <div class="header">
      <div class="company-name">${company.name}</div>
      <div class="company-name-en">${company.nameEn || 'TARIQ AL-AMARAH COMPANY'}</div>
      <div class="contract-title">📋 عقد حجز وحدة سكنية</div>
    </div>
    
    <!-- Contract Info Bar -->
    <div class="contract-info-bar">
      <div class="contract-info-item">
        <div class="contract-info-label">رقم العقد</div>
        <div class="contract-info-value">${contractNumber}</div>
      </div>
      <div class="contract-info-item">
        <div class="contract-info-label">تاريخ التحرير</div>
        <div class="contract-info-value">${formatDate(booking.date)}</div>
      </div>
      <div class="contract-info-item">
        <div class="contract-info-label">صلاحية الحجز</div>
        <div class="contract-info-value">${formatDate(expiryDate.toISOString())}</div>
      </div>
      <div class="contract-info-item">
        <div class="contract-info-label">المشروع</div>
        <div class="contract-info-value">${projectName}</div>
      </div>
    </div>
    
    <div class="content">
      <!-- Parties Section -->
      <div class="section">
        <div class="section-header">
          <span class="icon">👥</span>
          أطراف العقد
        </div>
        <div class="section-body">
          <div class="parties-grid">
            <div class="party-box seller">
              <div class="party-title">الطرف الأول (البائع)</div>
              <div class="party-name">${company.name}</div>
              <div class="party-subtitle">المالكة لمشروع ${projectName}</div>
            </div>
            <div class="party-box buyer">
              <div class="party-title">الطرف الثاني (المشتري)</div>
              <div class="party-name">${booking.customer.name}</div>
              <div class="party-subtitle">هاتف: ${booking.customer.phone || '---'}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Unit Details -->
      <div class="section">
        <div class="section-header">
          <span class="icon">🏠</span>
          تفاصيل الوحدة السكنية
        </div>
        <div class="section-body">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">رقم الوحدة</span>
              <span class="info-value highlight">${booking.unit.name}</span>
            </div>
            <div class="info-item">
              <span class="info-label">نوع الوحدة</span>
              <span class="info-value">${booking.unit.type || 'سكني'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">المساحة</span>
              <span class="info-value">${booking.unit.area ? booking.unit.area + ' م²' : '---'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">الموقع</span>
              <span class="info-value">${booking.unit.building || 'واسط / الزبيدية'}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Financial Details -->
      <div class="section">
        <div class="section-header">
          <span class="icon">💰</span>
          التفاصيل المالية
        </div>
        <div class="section-body">
          <div class="financial-summary">
            <div class="financial-item total">
              <div class="financial-label">إجمالي قيمة الوحدة</div>
              <div class="financial-value">${formatCurrency(booking.totalPrice)}</div>
            </div>
            <div class="financial-item paid">
              <div class="financial-label">مبلغ الحجز (العربون)</div>
              <div class="financial-value">${formatCurrency(booking.downPayment)}</div>
            </div>
            <div class="financial-item remaining">
              <div class="financial-label">المبلغ المتبقي</div>
              <div class="financial-value">${formatCurrency(booking.remainingAmount)}</div>
            </div>
          </div>
          
          <div class="info-grid" style="margin-top: 20px;">
            <div class="info-item">
              <span class="info-label">طريقة السداد</span>
              <span class="info-value highlight">${paymentMethodDisplay}</span>
            </div>
            ${isInstallment ? `
            <div class="info-item">
              <span class="info-label">عدد الأقساط</span>
              <span class="info-value highlight">${booking.installmentsCount} قسط</span>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
      
      ${booking.scheduledPayments && booking.scheduledPayments.length > 0 ? `
      <!-- Installments Schedule -->
      <div class="section">
        <div class="section-header">
          <span class="icon">📅</span>
          جدول الأقساط (${booking.scheduledPayments.length} قسط)
        </div>
        <div class="section-body" style="padding: 15px;">
          <table class="installments-table">
            <thead>
              <tr>
                <th>القسط</th>
                <th>تاريخ الاستحقاق</th>
                <th>المبلغ</th>
                <th>الحالة</th>
                <th>تاريخ الدفع</th>
              </tr>
            </thead>
            <tbody>
              ${booking.scheduledPayments.map(payment => `
                <tr>
                  <td><strong>#${payment.installmentNumber}</strong></td>
                  <td>${formatDateShort(payment.dueDate)}</td>
                  <td><strong>${formatCurrency(payment.amount)}</strong></td>
                  <td>
                    <span class="status-badge ${payment.status === 'paid' ? 'status-paid' : payment.status === 'overdue' ? 'status-overdue' : 'status-pending'}">
                      ${payment.status === 'paid' ? '✓ مدفوع' : payment.status === 'overdue' ? '⚠ متأخر' : '⏳ معلق'}
                    </span>
                  </td>
                  <td>${payment.paidDate ? formatDateShort(payment.paidDate) : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2">الإجمالي</td>
                <td><strong>${formatCurrency(booking.scheduledPayments.reduce((sum, p) => sum + p.amount, 0))}</strong></td>
                <td colspan="2">
                  ${booking.scheduledPayments.filter(p => p.status === 'paid').length} مدفوع / 
                  ${booking.scheduledPayments.filter(p => p.status !== 'paid').length} متبقي
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      ` : ''}
      
      <!-- Terms -->
      <div class="section">
        <div class="section-header">
          <span class="icon">📜</span>
          الشروط والأحكام
        </div>
        <div class="section-body">
          <ul class="terms-list">
            <li>يعتبر هذا العقد حجزاً مبدئياً ولا يعد عقداً نهائياً للبيع إلا بعد استكمال جميع الإجراءات القانونية.</li>
            <li>يلتزم المشتري باستكمال الدفعة الأولى وتوقيع العقد النهائي خلال فترة صلاحية الحجز المذكورة أعلاه.</li>
            <li>في حال تراجع المشتري عن الحجز، يتم استقطاع 10% من مبلغ الحجز كرسوم إدارية.</li>
            <li>تلتزم الشركة بتسليم الوحدة حسب المواصفات المتفق عليها وفي الموعد المحدد.</li>
            <li>أي نزاع ينشأ عن هذا العقد يتم حله ودياً، وفي حال تعذر ذلك يُحال للمحاكم المختصة.</li>
          </ul>
        </div>
      </div>
      
      <!-- Signatures -->
      <div class="signatures-section">
        <div class="signatures-grid">
          <div class="signature-box">
            <div class="signature-label">توقيع الطرف الأول (البائع)</div>
            <div class="signature-line"></div>
            <div class="signature-name">${company.name}</div>
          </div>
          <div class="signature-box">
            <div class="signature-label">توقيع الطرف الثاني (المشتري)</div>
            <div class="signature-line"></div>
            <div class="signature-name">${booking.customer.name}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-contact">
        <span>📍 ${company.address}</span>
        <span>📞 ${company.phone}</span>
        <span>✉️ ${company.email}</span>
      </div>
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
