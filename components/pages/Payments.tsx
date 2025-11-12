import React, { useState, useEffect } from 'react';
import { Payment } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils/currencyFormatter';
import { paymentsService } from '../../src/services/supabaseService';
import { CreditCardIcon } from '../shared/Icons';

const Payments: React.FC = () => {
    const { addToast } = useToast();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPayments();
        
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

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">سجل الدفعات</h2>
            </div>

            {payments.length > 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">تاريخ الدفعة</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">العميل</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الوحدة</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المبلغ</th>
                                <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الحساب</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(payment => (
                                <tr key={payment.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{payment.paymentDate}</td>
                                    <td className="p-4 font-medium text-slate-800 dark:text-slate-100">{payment.customerName}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{payment.unitName}</td>
                                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(payment.amount)}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{/* Placeholder for account name */}-</td>
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
        </div>
    );
};

export default Payments;