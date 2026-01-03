import React, { useState, useMemo } from 'react';
import {
  printContract,
  printReceipt,
  printInvoice,
  printAccountStatement,
  generateContractHTML,
  generateReceiptHTML,
  generateInvoiceHTML,
  generateAccountStatementHTML,
  generateReceiptNumber,
  generateInvoiceNumber,
  BookingInfo,
  PaymentInfo,
  InvoiceInfo,
  CustomerInfo,
  CompanyInfo
} from '../../utils/printService';
import { CloseIcon, SpinnerIcon } from './Icons';
import Modal from './Modal';

// ==================== Print Preview Modal ====================

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  htmlContent: string;
  onPrint: () => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  htmlContent,
  onPrint
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="full" noPadding>
      <div className="flex flex-col h-full">
        {/* Preview Frame */}
        <div className="flex-1 p-2 sm:p-3">
          <div className="h-full min-h-[85vh] bg-gray-100 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            <iframe
              srcDoc={htmlContent}
              className="w-full h-full bg-white"
              title="Print Preview"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t border-white/20 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={onPrint}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            طباعة
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ==================== Print Button Components ====================

interface PrintContractButtonProps {
  booking: BookingInfo;
  company?: CompanyInfo;
  variant?: 'button' | 'icon' | 'menu-item';
  className?: string;
}

export const PrintContractButton: React.FC<PrintContractButtonProps> = ({
  booking,
  company,
  variant = 'button',
  className = ''
}) => {
  // طباعة مباشرة بدون نافذة معاينة
  const handlePrint = () => {
    printContract(booking, company);
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handlePrint}
        className={`p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors ${className}`}
        title="طباعة العقد"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>
    );
  }

  if (variant === 'menu-item') {
    return (
      <button
        onClick={handlePrint}
        className={`w-full flex items-center gap-2 px-4 py-2 text-right text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${className}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        طباعة العقد
      </button>
    );
  }

  return (
    <button
      onClick={handlePrint}
      className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors ${className}`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      طباعة العقد
    </button>
  );
};

interface PrintReceiptButtonProps {
  payment: PaymentInfo;
  company?: CompanyInfo;
  variant?: 'button' | 'icon' | 'menu-item';
  className?: string;
}

export const PrintReceiptButton: React.FC<PrintReceiptButtonProps> = ({
  payment,
  company,
  variant = 'button',
  className = ''
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const paymentWithReceipt = useMemo(() => ({
    ...payment,
    receiptNumber: payment.receiptNumber || generateReceiptNumber()
  }), [payment]);
  const htmlContent = useMemo(() => generateReceiptHTML(paymentWithReceipt, company), [paymentWithReceipt, company]);

  const handlePrint = () => {
    printReceipt(paymentWithReceipt, company);
    setShowPreview(false);
  };

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => setShowPreview(true)}
          className={`p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors ${className}`}
          title="طباعة الإيصال"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
        </button>
        <PrintPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          title="معاينة الإيصال"
          htmlContent={htmlContent}
          onPrint={handlePrint}
        />
      </>
    );
  }

  if (variant === 'menu-item') {
    return (
      <>
        <button
          onClick={() => setShowPreview(true)}
          className={`w-full flex items-center gap-2 px-4 py-2 text-right text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${className}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          طباعة إيصال
        </button>
        <PrintPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          title="معاينة الإيصال"
          htmlContent={htmlContent}
          onPrint={handlePrint}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowPreview(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors ${className}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        طباعة إيصال
      </button>
      <PrintPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="معاينة الإيصال"
        htmlContent={htmlContent}
        onPrint={handlePrint}
      />
    </>
  );
};

interface PrintInvoiceButtonProps {
  invoice: InvoiceInfo;
  company?: CompanyInfo;
  variant?: 'button' | 'icon' | 'menu-item';
  className?: string;
}

export const PrintInvoiceButton: React.FC<PrintInvoiceButtonProps> = ({
  invoice,
  company,
  variant = 'button',
  className = ''
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const invoiceWithNumber = useMemo(() => ({
    ...invoice,
    invoiceNumber: invoice.invoiceNumber || generateInvoiceNumber()
  }), [invoice]);
  const htmlContent = useMemo(() => generateInvoiceHTML(invoiceWithNumber, company), [invoiceWithNumber, company]);

  const handlePrint = () => {
    printInvoice(invoiceWithNumber, company);
    setShowPreview(false);
  };

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => setShowPreview(true)}
          className={`p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors ${className}`}
          title="طباعة الفاتورة"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
        </button>
        <PrintPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          title="معاينة الفاتورة"
          htmlContent={htmlContent}
          onPrint={handlePrint}
        />
      </>
    );
  }

  if (variant === 'menu-item') {
    return (
      <>
        <button
          onClick={() => setShowPreview(true)}
          className={`w-full flex items-center gap-2 px-4 py-2 text-right text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${className}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
          طباعة فاتورة
        </button>
        <PrintPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          title="معاينة الفاتورة"
          htmlContent={htmlContent}
          onPrint={handlePrint}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowPreview(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors ${className}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
        طباعة فاتورة
      </button>
      <PrintPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="معاينة الفاتورة"
        htmlContent={htmlContent}
        onPrint={handlePrint}
      />
    </>
  );
};

// ==================== Quick Print Dropdown ====================

interface QuickPrintMenuProps {
  booking?: BookingInfo;
  payment?: PaymentInfo;
  invoice?: InvoiceInfo;
  customer?: CustomerInfo;
  transactions?: Array<{
    date: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  company?: CompanyInfo;
}

export const QuickPrintMenu: React.FC<QuickPrintMenuProps> = ({
  booking,
  payment,
  invoice,
  customer,
  transactions,
  company
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [previewType, setPreviewType] = useState<'contract' | 'receipt' | 'invoice' | 'statement' | null>(null);

  const getPreviewContent = () => {
    switch (previewType) {
      case 'contract':
        return booking ? generateContractHTML(booking, company) : '';
      case 'receipt':
        return payment ? generateReceiptHTML({ ...payment, receiptNumber: payment.receiptNumber || generateReceiptNumber() }, company) : '';
      case 'invoice':
        return invoice ? generateInvoiceHTML({ ...invoice, invoiceNumber: invoice.invoiceNumber || generateInvoiceNumber() }, company) : '';
      case 'statement':
        return customer && transactions ? generateAccountStatementHTML(customer, transactions, company) : '';
      default:
        return '';
    }
  };

  const handlePrint = () => {
    switch (previewType) {
      case 'contract':
        if (booking) printContract(booking, company);
        break;
      case 'receipt':
        if (payment) printReceipt({ ...payment, receiptNumber: payment.receiptNumber || generateReceiptNumber() }, company);
        break;
      case 'invoice':
        if (invoice) printInvoice({ ...invoice, invoiceNumber: invoice.invoiceNumber || generateInvoiceNumber() }, company);
        break;
      case 'statement':
        if (customer && transactions) printAccountStatement(customer, transactions, company);
        break;
    }
    setPreviewType(null);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        طباعة
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-20 overflow-hidden">
            {booking && (
              <button
                onClick={() => { setPreviewType('contract'); setIsOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-right text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="text-lg">📋</span>
                طباعة عقد
              </button>
            )}
            {payment && (
              <button
                onClick={() => { setPreviewType('receipt'); setIsOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-right text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="text-lg">🧾</span>
                طباعة إيصال
              </button>
            )}
            {invoice && (
              <button
                onClick={() => { setPreviewType('invoice'); setIsOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-right text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="text-lg">📄</span>
                طباعة فاتورة
              </button>
            )}
            {customer && transactions && (
              <button
                onClick={() => { setPreviewType('statement'); setIsOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-right text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="text-lg">📊</span>
                كشف حساب
              </button>
            )}
          </div>
        </>
      )}

      <PrintPreviewModal
        isOpen={!!previewType}
        onClose={() => setPreviewType(null)}
        title={
          previewType === 'contract' ? 'معاينة العقد' :
          previewType === 'receipt' ? 'معاينة الإيصال' :
          previewType === 'invoice' ? 'معاينة الفاتورة' :
          'معاينة كشف الحساب'
        }
        htmlContent={getPreviewContent()}
        onPrint={handlePrint}
      />
    </div>
  );
};

export default {
  PrintPreviewModal,
  PrintContractButton,
  PrintReceiptButton,
  PrintInvoiceButton,
  QuickPrintMenu
};
