import React, { useState, useEffect } from 'react';
import { Payment, Customer } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils/currencyFormatter';
import { paymentsService, customersService } from '../../src/services/supabaseService';
import { CreditCardIcon, PrinterIcon } from '../shared/Icons';

const Payments: React.FC = () => {
    const { addToast } = useToast();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
    const [customerPayments, setCustomerPayments] = useState<Payment[]>([]);
    const [showCustomerPayments, setShowCustomerPayments] = useState(false);

    useEffect(() => {
        loadPayments();
        loadCustomers();
        
        const subscription = paymentsService.subscribe((data) => {
            const sortedPayments = data.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
            setPayments(sortedPayments);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const loadPayments = async () => {
        try {
            setLoading(true);
            const data = await paymentsService.getAll();
            const sortedPayments = data.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
            setPayments(sortedPayments);
        } catch (error) {
            console.error('Error loading payments:', error);
            addToast('خطأ في تحميل الدفعات', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadCustomers = async () => {
        try {
            const data = await customersService.getAll();
            setCustomers(data);
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    };

    const handleViewCustomerPayments = async (customerId: string) => {
        try {
            const data = await paymentsService.getByCustomerId(customerId);
            setCustomerPayments(data);
            setSelectedCustomer(customerId);
            setShowCustomerPayments(true);
        } catch (error) {
            console.error('Error loading customer payments:', error);
            addToast('خطأ في تحميل الدفعات', 'error');
        }
    };

    const handlePrint = () => {
        if (showCustomerPayments && selectedCustomer) {
            const customer = customers.find(c => c.id === selectedCustomer);
            const printWindow = window.open('', '', 'height=600,width=800');
            if (printWindow) {
                const totalPaid = customerPayments.reduce((sum, p) => sum + p.amount, 0);
                
                // Format currency for print
                const formatForPrint = (value: number): string => {
                    return new Intl.NumberFormat('ar-SA', {
                        style: 'currency',
                        currency: 'SAR',
                        minimumFractionDigits: 2,
                    }).format(value);
                };
                
                const paymentRows = customerPayments.map(p => `
                    <tr>
                        <td>${p.paymentDate}</td>
                        <td>${p.unitName}</td>
                        <td>${formatForPrint(p.amount)}</td>
                        <td>${formatForPrint(p.unitPrice)}</td>
                        <td>${formatForPrint(p.remainingAmount)}</td>
                    </tr>
                `).join('');
                
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html dir="rtl">
                    <head>
                        <meta charset="UTF-8">
                        <title>كشف حساب العميل</title>
                        <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body { 
                                font-family: 'Arial', sans-serif; 
                                direction: rtl; 
                                padding: 20px;
                                background-color: #f9f9f9;
                            }
                            .container { 
                                max-width: 900px; 
                                margin: 0 auto;
                                background-color: white;
                                padding: 30px;
                                border-radius: 8px;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                            }
                            .header { 
                                text-align: center; 
                                margin-bottom: 30px;
                                border-bottom: 2px solid #333;
                                padding-bottom: 20px;
                            }
                            .header h2 { 
                                font-size: 24px;
                                font-weight: bold;
                                margin-bottom: 15px;
                                color: #333;
                            }
                            .header p { 
                                font-size: 14px;
                                margin: 5px 0;
                                color: #666;
                            }
                            .header strong { 
                                color: #333;
                                display: inline-block;
                                margin-left: 10px;
                            }
                            table { 
                                width: 100%; 
                                border-collapse: collapse;
                                margin: 20px 0;
                            }
                            th { 
                                background-color: #2c3e50;
                                color: white;
                                padding: 15px;
                                text-align: right;
                                font-weight: bold;
                                font-size: 14px;
                                border: 1px solid #34495e;
                            }
                            td { 
                                padding: 12px 15px;
                                text-align: right;
                                border: 1px solid #ddd;
                                font-size: 13px;
                                color: #333;
                            }
                            tbody tr:nth-child(even) {
                                background-color: #f5f5f5;
                            }
                            tbody tr:hover {
                                background-color: #eff3f5;
                            }
                            .total-section { 
                                margin-top: 30px;
                                padding-top: 20px;
                                border-top: 2px solid #2c3e50;
                                text-align: left;
                            }
                            .total-section p {
                                font-size: 16px;
                                font-weight: bold;
                                color: #27ae60;
                            }
                            .footer {
                                margin-top: 30px;
                                text-align: center;
                                font-size: 12px;
                                color: #999;
                                border-top: 1px solid #ddd;
                                padding-top: 15px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h2>كشف حساب العميل</h2>
                                <p><strong>اسم العميل:</strong> ${customer?.name || 'غير محدد'}</p>
                                <p><strong>البريد الإلكتروني:</strong> ${customer?.email || 'غير محدد'}</p>
                                <p><strong>الهاتف:</strong> ${customer?.phone || 'غير محدد'}</p>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>التاريخ</th>
                                        <th>الوحدة</th>
                                        <th>المبلغ المدفوع</th>
                                        <th>سعر الوحدة</th>
                                        <th>المبلغ المتبقي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${paymentRows}
                                </tbody>
                            </table>
                            <div class="total-section">
                                <p>إجمالي المدفوع: ${formatForPrint(totalPaid)}</p>
                            </div>
                            <div class="footer">
                                <p>تم الطباعة في: ${new Date().toLocaleDateString('ar-SA')}</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `);
                printWindow.document.close();
                printWindow.print();
            }
        } else {
            window.print();
        }
    };

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">سجل الدفعات</h2>
                <button onClick={handlePrint} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center gap-2">
                    <PrinterIcon className="h-5 w-5" />
                    طباعة
                </button>
            </div>

            {showCustomerPayments && selectedCustomer ? (
                <div>
                    <button onClick={() => setShowCustomerPayments(false)} className="mb-4 px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg">العودة</button>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-700 mb-6">
                        <div className="p-6">
                            <h3 className="text-xl font-bold mb-4">دفعات العميل</h3>
                            {customerPayments.length > 0 ? (
                                <table className="w-full text-right">
                                    <thead>
                                        <tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
                                            <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">تاريخ الدفعة</th>
                                            <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الوحدة</th>
                                            <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">سعر الوحدة</th>
                                            <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المبلغ المدفوع</th>
                                            <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المبلغ المتبقي</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customerPayments.map(payment => (
                                            <tr key={payment.id} className="border-b border-slate-200 dark:border-slate-700">
                                                <td className="p-4 text-slate-600 dark:text-slate-300">{payment.paymentDate}</td>
                                                <td className="p-4 font-medium text-slate-800 dark:text-slate-100">{payment.unitName}</td>
                                                <td className="p-4 font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(payment.unitPrice)}</td>
                                                <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(payment.amount)}</td>
                                                <td className="p-4 font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(payment.remainingAmount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-slate-600 dark:text-slate-300">لا توجد دفعات لهذا العميل</p>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="mb-6 bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-slate-200 dark:border-slate-700">
                        <label className="block mb-4">
                            <span className="text-slate-700 dark:text-slate-200 font-medium mb-2 block">البحث عن دفعات العميل</span>
                            <select 
                                onChange={(e) => e.target.value && handleViewCustomerPayments(e.target.value)}
                                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
                            >
                                <option value="">اختر عميل</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </label>
                    </div>

                    {payments.length > 0 ? (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-right">
                                <thead>
                                    <tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
                                        <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">تاريخ الدفعة</th>
                                        <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">العميل</th>
                                        <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الوحدة</th>
                                        <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المبلغ المدفوع</th>
                                        <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المبلغ المتبقي</th>
                                        <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map(payment => (
                                        <tr key={payment.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                                            <td className="p-4 text-slate-600 dark:text-slate-300">{payment.paymentDate}</td>
                                            <td className="p-4 font-medium text-slate-800 dark:text-slate-100">{payment.customerName}</td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300">{payment.unitName}</td>
                                            <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(payment.amount)}</td>
                                            <td className="p-4 font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(payment.remainingAmount)}</td>
                                            <td className="p-4">
                                                <button onClick={() => handleViewCustomerPayments(payment.customerId)} className="text-primary-600 hover:underline font-semibold">عرض الكل</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            <CreditCardIcon className="mx-auto h-12 w-12 text-slate-400" />
                            <h3 className="mt-2 text-lg font-medium text-slate-900 dark:text-slate-100">لا توجد دفعات</h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">لم يتم تسجيل أي دفعات من العملاء بعد.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Payments;