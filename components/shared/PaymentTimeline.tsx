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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 pt-20">
            <div className="glass-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-white/20">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-700/90 to-slate-600/90 p-6 text-white">
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
                                className="h-full bg-gradient-to-r from-emerald-500/70 to-emerald-400/70 transition-all duration-500"
                                style={{ width: `${Math.min(percentagePaid, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4 p-6 bg-slate-800/30">
                    <div className="bg-slate-700/40 backdrop-blur-sm rounded-xl p-4 border border-slate-600/30">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <BanknotesIcon className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">سعر الوحدة</p>
                                <p className="text-lg font-bold text-white">{formatCurrency(unitPrice)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-700/40 backdrop-blur-sm rounded-xl p-4 border border-slate-600/30">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <CheckCircleIcon className="w-6 h-6 text-emerald-400/80" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">المدفوع</p>
                                <p className="text-lg font-bold text-emerald-400/90">{formatCurrency(totalPaid)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-700/40 backdrop-blur-sm rounded-xl p-4 border border-slate-600/30">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 rounded-lg">
                                <CreditCardIcon className="w-6 h-6 text-amber-400/80" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">المتبقي</p>
                                <p className="text-lg font-bold text-amber-400/80">{formatCurrency(remaining)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="p-6 overflow-y-auto max-h-[45vh]">
                    <div className="relative">
                        {/* Vertical Line */}
                        <div className="absolute right-[27px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-500/50 via-slate-600/50 to-slate-700/50" />

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
                                                ? 'bg-gradient-to-br from-blue-600/70 to-blue-700/70' 
                                                : payment.paymentType === 'final'
                                                ? 'bg-gradient-to-br from-emerald-600/70 to-emerald-700/70'
                                                : 'bg-gradient-to-br from-slate-500/70 to-slate-600/70'
                                        }`}>
                                            {payment.paymentType === 'booking' ? (
                                                <CreditCardIcon className="w-7 h-7 text-white" />
                                            ) : (
                                                <BanknotesIcon className="w-7 h-7 text-white" />
                                            )}
                                        </div>

                                        {/* Payment Card */}
                                        <div className="bg-slate-700/40 backdrop-blur-sm rounded-xl p-5 shadow-md border border-slate-600/30 hover:bg-slate-700/50 transition-all">
                                            {/* Payment Type Badge */}
                                            <div className="flex items-start justify-between mb-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    payment.paymentType === 'booking'
                                                        ? 'bg-blue-500/10 text-blue-300/80'
                                                        : payment.paymentType === 'final'
                                                        ? 'bg-emerald-500/10 text-emerald-300/80'
                                                        : 'bg-slate-500/20 text-slate-300/80'
                                                }`}>
                                                    {payment.paymentType === 'booking' 
                                                        ? '🎯 دفعة الحجز' 
                                                        : payment.paymentType === 'final'
                                                        ? '✅ دفعة نهائية'
                                                        : `📝 قسط ${index}`}
                                                </span>
                                                <span className="text-2xl font-bold text-slate-200">
                                                    {formatCurrency(payment.amount)}
                                                </span>
                                            </div>

                                            {/* Payment Details */}
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <CalendarIcon className="w-4 h-4" />
                                                    <span>{new Date(payment.paymentDate).toLocaleDateString('ar-IQ')}</span>
                                                </div>
                                                {payment.accountName && (
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <BanknotesIcon className="w-4 h-4" />
                                                        <span>{payment.accountName}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Notes */}
                                            {payment.notes && (
                                                <div className="mt-3 p-3 bg-slate-800/30 rounded-lg border border-slate-600/20">
                                                    <p className="text-sm text-slate-400">
                                                        💬 {payment.notes}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Cumulative Info */}
                                            <div className="mt-4 pt-4 border-t border-slate-600/20 grid grid-cols-2 gap-4 text-xs">
                                                <div>
                                                    <span className="text-slate-500">إجمالي المدفوع حتى الآن</span>
                                                    <p className="text-emerald-400/70 font-bold mt-1">
                                                        {formatCurrency(cumulativePaid)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">المتبقي بعد هذه الدفعة</span>
                                                    <p className={`font-bold mt-1 ${
                                                        remainingAfter === 0 
                                                            ? 'text-emerald-400/70' 
                                                            : 'text-amber-400/70'
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
                            <div className="relative pr-16 mt-6">
                                {/* Empty space for alignment with timeline dots */}
                                <div className="absolute right-0 w-14 h-14" />
                                
                                <div className="bg-slate-700/40 rounded-lg p-4 text-center border border-emerald-500/20 flex items-center justify-center gap-3">
                                    <CheckCircleIcon className="w-8 h-8 text-emerald-400/70" />
                                    <div className="text-right">
                                        <h3 className="text-lg font-bold text-slate-200">تم سداد كامل المبلغ ✓</h3>
                                        <p className="text-sm text-slate-400">تمت جميع الدفعات بنجاح</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-800/30 border-t border-slate-600/20">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-500">
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
