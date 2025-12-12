import React from 'react';
import { Payment } from '../../types';
import { formatCurrency } from '../../utils/currencyFormatter';
import { CheckCircleIcon, CreditCardIcon, CalendarIcon, BanknotesIcon } from '../shared/Icons';

interface PaymentTimelineProps {
    payments: Payment[];
    unitPrice: number;
    onClose: () => void;
}

const PaymentTimeline: React.FC<PaymentTimelineProps> = ({ payments, unitPrice, onClose }) => {
    // ترتيب الدفعات حسب التاريخ
    const sortedPayments = [...payments].sort((a, b) => 
        new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
    );

    // حساب الإجمالي
    const totalPaid = sortedPayments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = unitPrice - totalPaid;
    const percentagePaid = (totalPaid / unitPrice) * 100;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">تفاصيل الدفعات</h2>
                            {sortedPayments.length > 0 && (
                                <div className="text-blue-100 space-y-1">
                                    <p className="text-sm">العميل: {sortedPayments[0].customerName}</p>
                                    <p className="text-sm">الوحدة: {sortedPayments[0].unitName}</p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6">
                        <div className="flex justify-between text-sm mb-2">
                            <span>تم الدفع: {percentagePaid.toFixed(1)}%</span>
                            <span>{formatCurrency(totalPaid)} من {formatCurrency(unitPrice)}</span>
                        </div>
                        <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-all duration-500"
                                style={{ width: `${Math.min(percentagePaid, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4 p-6 bg-slate-50 dark:bg-slate-900/50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                                <BanknotesIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">سعر الوحدة</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(unitPrice)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
                                <CheckCircleIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">إجمالي المدفوع</p>
                                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalPaid)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
                                <CreditCardIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">المتبقي</p>
                                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatCurrency(remaining)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="p-6 overflow-y-auto max-h-[50vh]">
                    <div className="relative">
                        {/* Vertical Line */}
                        <div className="absolute right-[27px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-emerald-500 to-slate-300" />

                        {/* Payments List */}
                        <div className="space-y-6">
                            {sortedPayments.map((payment, index) => {
                                const cumulativePaid = sortedPayments
                                    .slice(0, index + 1)
                                    .reduce((sum, p) => sum + p.amount, 0);
                                const remainingAfter = unitPrice - cumulativePaid;

                                return (
                                    <div key={payment.id} className="relative pr-16">
                                        {/* Timeline Dot */}
                                        <div className={`absolute right-0 w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${
                                            payment.paymentType === 'booking' 
                                                ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                                                : payment.paymentType === 'final'
                                                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                                                : 'bg-gradient-to-br from-indigo-500 to-indigo-600'
                                        }`}>
                                            {payment.paymentType === 'booking' ? (
                                                <CreditCardIcon className="w-7 h-7 text-white" />
                                            ) : (
                                                <BanknotesIcon className="w-7 h-7 text-white" />
                                            )}
                                        </div>

                                        {/* Payment Card */}
                                        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-md border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                                            {/* Payment Type Badge */}
                                            <div className="flex items-start justify-between mb-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    payment.paymentType === 'booking'
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                                                        : payment.paymentType === 'final'
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                                                }`}>
                                                    {payment.paymentType === 'booking' 
                                                        ? '🎯 دفعة الحجز' 
                                                        : payment.paymentType === 'final'
                                                        ? '✅ دفعة نهائية'
                                                        : `📝 قسط ${index}`}
                                                </span>
                                                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                                                    {formatCurrency(payment.amount)}
                                                </span>
                                            </div>

                                            {/* Payment Details */}
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                    <CalendarIcon className="w-4 h-4" />
                                                    <span>{new Date(payment.paymentDate).toLocaleDateString('ar-IQ')}</span>
                                                </div>
                                                {payment.accountName && (
                                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                        <BanknotesIcon className="w-4 h-4" />
                                                        <span>{payment.accountName}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Notes */}
                                            {payment.notes && (
                                                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                                        💬 {payment.notes}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Cumulative Info */}
                                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-4 text-xs">
                                                <div>
                                                    <span className="text-slate-500 dark:text-slate-400">إجمالي المدفوع حتى الآن</span>
                                                    <p className="text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                                                        {formatCurrency(cumulativePaid)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 dark:text-slate-400">المتبقي بعد هذه الدفعة</span>
                                                    <p className={`font-bold mt-1 ${
                                                        remainingAfter === 0 
                                                            ? 'text-emerald-600 dark:text-emerald-400' 
                                                            : 'text-amber-600 dark:text-amber-400'
                                                    }`}>
                                                        {remainingAfter === 0 ? '✅ مكتمل' : formatCurrency(remainingAfter)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Completion Message */}
                        {remaining === 0 && (
                            <div className="mt-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 text-white text-center">
                                <CheckCircleIcon className="w-16 h-16 mx-auto mb-3" />
                                <h3 className="text-2xl font-bold mb-2">تم سداد كامل المبلغ! 🎉</h3>
                                <p className="text-emerald-100">تمت جميع الدفعات بنجاح</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            عدد الدفعات: <span className="font-bold">{sortedPayments.length}</span>
                        </p>
                        <button
                            onClick={onClose}
                            className="btn-secondary"
                        >
                            إغلاق
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentTimeline;
