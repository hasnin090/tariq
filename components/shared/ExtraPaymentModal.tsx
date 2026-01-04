import React, { useEffect, useMemo, useState } from 'react';
import { X, DollarSign, Calendar, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';
import { formatCurrency } from '../../utils/currencyFormatter';

interface ExtraPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: () => void;
  bookingId: string;
  unitSaleId: string;
  customerId: string;
  customerName: string;
  remainingBalance: number;
  pendingInstallments: number;
  projectId?: string;
  currentPaymentPlanYears?: 4 | 5;
  currentPaymentFrequencyMonths?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  currentPaymentStartDate?: string;
  // وضع "إعادة احتساب فقط" - عندما تكون الدفعة محفوظة مسبقاً
  skipPaymentCreation?: boolean;
  prefilledAmount?: number;
}

type RescheduleType = 'reduce_amount' | 'new_plan';

const ExtraPaymentModal: React.FC<ExtraPaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentComplete,
  bookingId,
  unitSaleId,
  customerId,
  customerName,
  remainingBalance,
  pendingInstallments,
  projectId,
  currentPaymentPlanYears,
  currentPaymentFrequencyMonths,
  currentPaymentStartDate,
  skipPaymentCreation = false,
  prefilledAmount = 0,
}) => {
  const [amount, setAmount] = useState<string>(skipPaymentCreation && prefilledAmount > 0 ? String(prefilledAmount) : '');
  const [paymentMethod, setPaymentMethod] = useState<string>('نقدي');
  const [notes, setNotes] = useState<string>('');
  const [rescheduleType, setRescheduleType] = useState<RescheduleType>('reduce_amount');

  const [trueRemainingBalance, setTrueRemainingBalance] = useState<number | null>(null);
  const [calculatingRemaining, setCalculatingRemaining] = useState(false);

  // خيارات الخطة الجديدة (مطابقة لخيارات الحجز)
  const [paymentPlanYears, setPaymentPlanYears] = useState<4 | 5>(currentPaymentPlanYears || 5);
  const [paymentFrequencyMonths, setPaymentFrequencyMonths] = useState<1 | 2 | 3 | 4 | 5 | 6 | 12>(
    currentPaymentFrequencyMonths || 1
  );
  const [startDate, setStartDate] = useState<string>(
    currentPaymentStartDate || new Date().toISOString().split('T')[0]
  );

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRescheduleOptions, setShowRescheduleOptions] = useState(skipPaymentCreation);

  // عند فتح المودال في وضع "إعادة احتساب فقط"، اعرض الخيارات مباشرة
  useEffect(() => {
    if (isOpen && skipPaymentCreation && prefilledAmount > 0) {
      setAmount(String(prefilledAmount));
      setShowRescheduleOptions(true);
    }
  }, [isOpen, skipPaymentCreation, prefilledAmount]);

  if (!isOpen) return null;

  // Compute true remaining so UI is consistent with ledger (payments table)
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const run = async () => {
      try {
        setCalculatingRemaining(true);
        setTrueRemainingBalance(null);

        const [{ data: bookingRow, error: bookingFetchError }, { data: scheduledRows, error: scheduledFetchError }] = await Promise.all([
          supabase
            .from('bookings')
            .select('id, unit_id, units(price)')
            .eq('id', bookingId)
            .single(),
          supabase
            .from('scheduled_payments')
            .select('status, amount, paid_amount, payment_id')
            .eq('booking_id', bookingId),
        ]);
        if (bookingFetchError) throw bookingFetchError;
        if (scheduledFetchError) throw scheduledFetchError;

        const unitPrice = Number((bookingRow as any)?.units?.price || 0);
        const scheduledPayments = (scheduledRows || []) as any[];
        
        // حساب الدفعات القديمة التي ليس لها payment_id وليست مغطاة بدفعات إضافية
        // ملاحظة: الأقساط المغطاة بدفعات إضافية لها payment_id = 'extra_payment_covered'
        // والأقساط القديمة جداً (قبل نظام الدفعات) قد يكون لها paid_amount > 0 بدون payment_id
        const paidScheduledLegacy = scheduledPayments
          .filter(sp => sp.status === 'paid' && !sp.payment_id && sp.payment_id !== 'extra_payment_covered')
          .reduce((sum, sp) => sum + Number(sp.paid_amount || 0), 0); // لا نستخدم sp.amount كـ fallback

        const { data: paymentsForBooking, error: paymentsFetchError } = await supabase
          .from('payments')
          .select('amount')
          .eq('booking_id', bookingId);
        if (paymentsFetchError) throw paymentsFetchError;

        const paidFromPayments = (paymentsForBooking || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        const totalPaid = paidFromPayments + paidScheduledLegacy;
        const computedRemaining = unitPrice - totalPaid;

        if (!cancelled) setTrueRemainingBalance(computedRemaining);
      } catch (e: any) {
        // Fallback to provided remainingBalance (best-effort)
        if (!cancelled) setTrueRemainingBalance(remainingBalance);
      } finally {
        if (!cancelled) setCalculatingRemaining(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, bookingId, remainingBalance]);

  const effectiveRemainingBalance = useMemo(() => {
    if (trueRemainingBalance === null || Number.isNaN(trueRemainingBalance)) return remainingBalance;
    return trueRemainingBalance;
  }, [trueRemainingBalance, remainingBalance]);

  const paymentAmount = parseFloat(amount) || 0;
  const newRemainingBalance = effectiveRemainingBalance - paymentAmount;

  const previewNewPlanInstallments = Math.ceil((paymentPlanYears * 12) / paymentFrequencyMonths);
  const previewNewPlanInstallmentAmount = newRemainingBalance > 0
    ? newRemainingBalance / previewNewPlanInstallments
    : 0;

  const previewReduceAmountInstallmentAmount = newRemainingBalance > 0
    ? newRemainingBalance / Math.max(1, pendingInstallments)
    : 0;

  const handleAmountChange = (value: string) => {
    // السماح بالأرقام والفاصلة العشرية فقط
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError(null);
      
      // إظهار خيارات إعادة الجدولة إذا كان المبلغ صحيح
      const amt = parseFloat(value) || 0;
      // Show options whenever user enters a valid amount that doesn't exceed remaining.
      // (We compute remaining from the ledger; caller value may be stale.)
      const remaining = effectiveRemainingBalance;
      setShowRescheduleOptions(amt > 0 && amt <= remaining);
    }
  };

  const handleSubmit = async () => {
    // التحقق من صحة البيانات
    if (paymentAmount <= 0) {
      setError('الرجاء إدخال مبلغ صحيح');
      return;
    }

    if (paymentAmount > effectiveRemainingBalance) {
      setError('المبلغ المدخل أكبر من المبلغ المتبقي');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];

      // 0) جلب بيانات الحجز/سعر الوحدة + الأقساط الحالية
      const [{ data: bookingRow, error: bookingFetchError }, { data: scheduledRows, error: scheduledFetchError }] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, unit_id, payment_plan_years, payment_frequency_months, payment_start_date, units(price)')
          .eq('id', bookingId)
          .single(),
        supabase
          .from('scheduled_payments')
          .select('*')
          .eq('booking_id', bookingId)
          .order('installment_number', { ascending: true }),
      ]);

      if (bookingFetchError) throw bookingFetchError;
      if (scheduledFetchError) throw scheduledFetchError;

      const unitPrice = (bookingRow as any)?.units?.price || 0;
      const scheduledPayments = (scheduledRows || []) as any[];

      // 1) إنشاء سجل الدفعة الإضافية في payments (ليصبح مصدر الحقيقة للمدفوع)
      // تخطي إذا كانت الدفعة محفوظة مسبقاً (skipPaymentCreation)
      if (!skipPaymentCreation) {
        const paymentId = crypto.randomUUID();
        const { error: paymentInsertError } = await supabase
          .from('payments')
          .insert({
            id: paymentId,
            booking_id: bookingId,
            amount: paymentAmount,
            payment_date: today,
            payment_type: 'extra', // ✅ نوع 'extra' لتجنب trigger الربط التلقائي بالأقساط
            notes: notes || 'دفعة إضافية خارج الخطة',
          });
        if (paymentInsertError) throw paymentInsertError;

        // إنشاء سجل الدفعة الإضافية في extra_payments
        const extraPaymentId = crypto.randomUUID();
        const { error: insertError } = await supabase
          .from('extra_payments')
          .insert({
            id: extraPaymentId,
            unit_sale_id: unitSaleId,
            customer_id: customerId,
            amount: paymentAmount,
            payment_date: today,
            payment_method: paymentMethod,
            notes: notes || null,
            project_id: projectId || null,
            reschedule_type: 'manual',
            new_installment_count: rescheduleType === 'new_plan' ? previewNewPlanInstallments : pendingInstallments,
            new_installment_period: 'monthly'
          });
        if (insertError) {
          throw new Error('فشل في حفظ الدفعة الإضافية');
        }
      }

      // 2) إعادة جدولة الأقساط (من داخل الواجهة) مع الحفاظ على الأقساط المدفوعة

      // حساب الدفعات القديمة التي ليس لها payment_id وليست مغطاة بدفعات إضافية
      // ملاحظة: الأقساط المغطاة بدفعات إضافية لها payment_id = 'extra_payment_covered'
      const paidScheduledLegacy = scheduledPayments
        .filter(sp => sp.status === 'paid' && !sp.payment_id && sp.payment_id !== 'extra_payment_covered')
        .reduce((sum, sp) => sum + Number(sp.paid_amount || 0), 0); // لا نستخدم sp.amount كـ fallback

      const { data: paymentsForBooking, error: paymentsFetchError } = await supabase
        .from('payments')
        .select('amount')
        .eq('booking_id', bookingId);
      if (paymentsFetchError) throw paymentsFetchError;

      const paidFromPayments = (paymentsForBooking || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      const totalPaid = paidFromPayments + paidScheduledLegacy;
      const remainingAfterAll = unitPrice - totalPaid;

      const paidInstallments = scheduledPayments.filter(sp => sp.status === 'paid');
      const unpaidInstallments = scheduledPayments.filter(sp => sp.status !== 'paid');
      const maxPaidInstallmentNumber = paidInstallments.reduce((max, sp) => Math.max(max, Number(sp.installment_number || 0)), 0);

      // إذا تم تسديد كل المبلغ
      if (remainingAfterAll <= 0) {
        // ملاحظة مهمة: عند تسديد المبلغ الكامل، الدفعة الإضافية مسجلة بالفعل في جدول payments
        // لذلك نعلّم الأقساط كمدفوعة بدون تسجيل paid_amount لتجنب الحساب المزدوج
        // نضع paid_amount = 0 لأن المبلغ الفعلي موجود في جدول payments
        // ونضع payment_id = 'extra_payment_covered' كعلامة أن هذا القسط غُطي بدفعة إضافية
        for (const sp of unpaidInstallments) {
          const { error: markPaidError } = await supabase
            .from('scheduled_payments')
            .update({
              status: 'paid',
              paid_amount: 0, // لا نضيف مبلغ لأنه محسوب بالفعل في payments
              paid_date: today,
              payment_id: 'extra_payment_covered', // علامة أن هذا القسط غُطي بدفعة إضافية
              updated_at: new Date().toISOString(),
            })
            .eq('id', sp.id);
          if (markPaidError) throw markPaidError;
        }
      } else if (rescheduleType === 'reduce_amount') {
        // توزيع الرصيد المتبقي على نفس الأقساط المتبقية (نفس العدد ونفس التواريخ)
        const count = unpaidInstallments.length;
        if (count > 0) {
          const base = Math.round((remainingAfterAll / count) * 100) / 100;
          let accumulated = 0;

          for (let i = 0; i < unpaidInstallments.length; i++) {
            const sp = unpaidInstallments[i];
            let newAmount = base;
            if (i === unpaidInstallments.length - 1) {
              newAmount = Math.round((remainingAfterAll - accumulated) * 100) / 100;
            }
            accumulated += newAmount;

            const { error: upError } = await supabase
              .from('scheduled_payments')
              .update({ amount: newAmount, updated_at: new Date().toISOString() })
              .eq('id', sp.id);
            if (upError) throw upError;
          }
        }
      } else {
        // إنشاء خطة جديدة للمتبقي (حسب 4/5 سنوات + تكرار بالأشهر)
        const newCount = previewNewPlanInstallments;
        // حذف الأقساط غير المدفوعة الحالية
        if (unpaidInstallments.length > 0) {
          const { error: deleteError } = await supabase
            .from('scheduled_payments')
            .delete()
            .eq('booking_id', bookingId)
            .neq('status', 'paid');
          if (deleteError) throw deleteError;
        }

        const scheduledToInsert: any[] = [];
        let currentDate = new Date(startDate);
        let totalScheduled = 0;

        for (let i = 1; i <= newCount; i++) {
          let installmentAmount = Math.round((remainingAfterAll / newCount) * 100) / 100;
          if (i === newCount) {
            installmentAmount = Math.round((remainingAfterAll - totalScheduled) * 100) / 100;
          }
          totalScheduled += installmentAmount;

          scheduledToInsert.push({
            booking_id: bookingId,
            installment_number: maxPaidInstallmentNumber + i,
            due_date: currentDate.toISOString().split('T')[0],
            amount: installmentAmount,
            status: 'pending',
            paid_amount: 0,
            notification_sent: false,
            updated_at: new Date().toISOString(),
          });

          currentDate.setMonth(currentDate.getMonth() + paymentFrequencyMonths);
        }

        if (scheduledToInsert.length > 0) {
          const { error: insError } = await supabase
            .from('scheduled_payments')
            .insert(scheduledToInsert);
          if (insError) throw insError;
        }

        // تحديث بيانات الخطة على الحجز لتعكس الاختيارات الجديدة
        const totalMonths = paymentPlanYears * 12;
        const monthlyAmount = Math.round((remainingAfterAll / totalMonths) * 100) / 100;
        const installmentAmount = Math.round((monthlyAmount * paymentFrequencyMonths) * 100) / 100;

        const { error: bookingUpdateError } = await supabase
          .from('bookings')
          .update({
            payment_plan_years: paymentPlanYears,
            payment_frequency_months: paymentFrequencyMonths,
            payment_start_date: startDate,
            monthly_amount: monthlyAmount,
            installment_amount: installmentAmount,
            total_installments: maxPaidInstallmentNumber + newCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', bookingId);
        if (bookingUpdateError) throw bookingUpdateError;
      }

      // 3. تسجيل النشاط (فقط إذا لم يتم تخطي إنشاء الدفعة)
      if (!skipPaymentCreation) {
        await supabase.from('activity_logs').insert({
          id: crypto.randomUUID(),
          action: 'extra_payment',
          table_name: 'extra_payments',
          record_id: bookingId,
          details: {
            customer_name: customerName,
            amount: paymentAmount,
            reschedule_type: rescheduleType,
            remaining_balance: newRemainingBalance,
            booking_id: bookingId,
            payment_plan_years: paymentPlanYears,
            payment_frequency_months: paymentFrequencyMonths,
          },
          project_id: projectId
        });
      } else {
        // تسجيل نشاط إعادة الاحتساب فقط
        await supabase.from('activity_logs').insert({
          id: crypto.randomUUID(),
          action: 'reschedule_payments',
          table_name: 'scheduled_payments',
          record_id: bookingId,
          details: {
            customer_name: customerName,
            amount: paymentAmount,
            reschedule_type: rescheduleType,
            remaining_balance: newRemainingBalance,
            booking_id: bookingId,
            payment_plan_years: paymentPlanYears,
            payment_frequency_months: paymentFrequencyMonths,
          },
          project_id: projectId
        });
      }

      // نجح الحفظ
      onPaymentComplete();
      onClose();
    } catch (err: any) {
      console.error('Extra payment error:', err);
      setError(err.message || 'حدث خطأ أثناء معالجة الدفعة');
    } finally {
      setProcessing(false);
    }
  };

  // حساب تفاصيل الخطة للعرض
  const planDetails = useMemo(() => {
    if (newRemainingBalance <= 0) return null;
    
    if (rescheduleType === 'reduce_amount') {
      return {
        installments: pendingInstallments,
        installmentAmount: previewReduceAmountInstallmentAmount,
        totalAmount: newRemainingBalance,
      };
    } else {
      return {
        installments: previewNewPlanInstallments,
        installmentAmount: previewNewPlanInstallmentAmount,
        totalAmount: newRemainingBalance,
      };
    }
  }, [rescheduleType, newRemainingBalance, pendingInstallments, previewReduceAmountInstallmentAmount, previewNewPlanInstallments, previewNewPlanInstallmentAmount]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">دفعة إضافية خارج الخطة</h3>
              <p className="text-sm text-slate-400 mt-0.5">العميل: <span className="text-amber-400">{customerName}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            disabled={processing || calculatingRemaining}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* القسم 1: معلومات الرصيد الحالي */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl p-4 text-center">
              <p className="text-xs text-blue-300 mb-1">المبلغ المتبقي</p>
              <p className="text-xl font-bold text-blue-400">
                {calculatingRemaining ? '...' : formatCurrency(effectiveRemainingBalance)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-4 text-center">
              <p className="text-xs text-purple-300 mb-1">الأقساط المعلقة</p>
              <p className="text-2xl font-bold text-purple-400">{pendingInstallments}</p>
              <p className="text-xs text-purple-300/70">قسط</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-4 text-center">
              <p className="text-xs text-emerald-300 mb-1">بعد الدفعة</p>
              <p className={`text-2xl font-bold ${newRemainingBalance <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {paymentAmount > 0 ? formatCurrency(newRemainingBalance) : '—'}
              </p>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* القسم 2: مبلغ الدفعة وطريقة الدفع */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="bg-slate-800/50 rounded-xl p-5 border border-white/5">
            <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              بيانات الدفعة
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">مبلغ الدفعة الإضافية <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="أدخل المبلغ"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  disabled={processing}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">طريقة الدفع</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  disabled={processing}
                >
                  <option value="نقدي">💵 نقدي</option>
                  <option value="تحويل بنكي">🏦 تحويل بنكي</option>
                  <option value="شيك">📄 شيك</option>
                  <option value="بطاقة ائتمان">💳 بطاقة ائتمان</option>
                </select>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* القسم 3: خيارات إعادة الجدولة */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {showRescheduleOptions && newRemainingBalance > 0 && (
            <div className="bg-slate-800/50 rounded-xl p-5 border border-white/5">
              <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-400" />
                إعادة جدولة الأقساط المتبقية
              </h4>

              {/* الخيارات */}
              <div className="space-y-3">
                {/* الخيار 1: تقليل مبلغ الأقساط */}
                <label 
                  className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    rescheduleType === 'reduce_amount' 
                      ? 'border-amber-500 bg-amber-500/10' 
                      : 'border-slate-600 hover:border-slate-500 bg-slate-700/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="rescheduleType"
                      checked={rescheduleType === 'reduce_amount'}
                      onChange={() => setRescheduleType('reduce_amount')}
                      className="mt-1 w-4 h-4 text-amber-500 focus:ring-amber-500"
                      disabled={processing}
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-white">تقليل مبلغ كل قسط (مستحسن)</p>
                      <p className="text-sm text-slate-400 mt-1">
                        توزيع المبلغ المتبقي على نفس عدد الأقساط الحالية مع الحفاظ على التواريخ
                      </p>
                      {rescheduleType === 'reduce_amount' && (
                        <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">عدد الأقساط:</span>
                            <span className="text-white font-semibold">{pendingInstallments} قسط</span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-slate-400">القسط الجديد:</span>
                            <span className="text-amber-400 font-semibold">{formatCurrency(previewReduceAmountInstallmentAmount)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </label>

                {/* الخيار 2: خطة جديدة */}
                <label 
                  className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    rescheduleType === 'new_plan' 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-slate-600 hover:border-slate-500 bg-slate-700/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="rescheduleType"
                      checked={rescheduleType === 'new_plan'}
                      onChange={() => setRescheduleType('new_plan')}
                      className="mt-1 w-4 h-4 text-blue-500 focus:ring-blue-500"
                      disabled={processing}
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-white">إنشاء خطة جديدة</p>
                      <p className="text-sm text-slate-400 mt-1">
                        حذف الأقساط القديمة وإنشاء خطة دفع جديدة بتواريخ ومدة مختلفة
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {/* خيارات الخطة الجديدة */}
              {rescheduleType === 'new_plan' && (
                <div className="mt-4 p-4 bg-slate-700/30 rounded-xl border border-slate-600 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">مدة الخطة</label>
                      <select
                        value={paymentPlanYears}
                        onChange={(e) => setPaymentPlanYears(Number(e.target.value) as 4 | 5)}
                        className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                        disabled={processing}
                      >
                        <option value={4}>4 سنوات</option>
                        <option value={5}>5 سنوات</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">تكرار الدفع</label>
                      <select
                        value={paymentFrequencyMonths}
                        onChange={(e) => setPaymentFrequencyMonths(Number(e.target.value) as any)}
                        className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                        disabled={processing}
                      >
                        <option value={1}>شهري</option>
                        <option value={2}>كل شهرين</option>
                        <option value={3}>كل 3 أشهر</option>
                        <option value={6}>كل 6 أشهر</option>
                        <option value={12}>سنوي</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">تاريخ البدء</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                        disabled={processing}
                      />
                    </div>
                  </div>

                  {/* ملخص الخطة الجديدة */}
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-300">عدد الأقساط الجديدة:</span>
                      <span className="text-white font-semibold">{previewNewPlanInstallments} قسط</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-blue-300">مبلغ كل قسط:</span>
                      <span className="text-blue-400 font-semibold">{formatCurrency(previewNewPlanInstallmentAmount)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* القسم 4: ملخص العملية */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {paymentAmount > 0 && planDetails && (
            <div className="bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 border border-emerald-500/30 rounded-xl p-4">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                ملخص العملية
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-400">الدفعة الإضافية</p>
                  <p className="text-lg font-bold text-amber-400">{paymentAmount.toLocaleString()}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-400">المتبقي للتقسيط</p>
                  <p className="text-lg font-bold text-purple-400">{planDetails.totalAmount.toLocaleString()}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-400">عدد الأقساط</p>
                  <p className="text-lg font-bold text-blue-400">{planDetails.installments}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-400">مبلغ القسط</p>
                  <p className="text-lg font-bold text-emerald-400">{planDetails.installmentAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* ملاحظات */}
          <div>
            <label className="block text-sm text-slate-300 mb-2">ملاحظات (اختياري)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="أي ملاحظات إضافية..."
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              disabled={processing}
            />
          </div>

          {/* رسالة خطأ */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          )}

          {/* تنبيه السداد الكامل */}
          {paymentAmount >= effectiveRemainingBalance && paymentAmount > 0 && (
            <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🎉</span>
              </div>
              <div>
                <p className="font-semibold text-emerald-400">سداد كامل!</p>
                <p className="text-sm text-emerald-300/80 mt-0.5">
                  هذا المبلغ سيسدد كامل المبلغ المتبقي وسيتم تحديث جميع الأقساط كمدفوعة.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10 bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-slate-400 hover:text-white transition-colors"
            disabled={processing}
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={processing || paymentAmount <= 0}
            className="px-8 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-semibold shadow-lg shadow-amber-500/20"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري المعالجة...
              </>
            ) : (
              <>
                <DollarSign className="w-5 h-5" />
                تأكيد الدفعة وإعادة الجدولة
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExtraPaymentModal;
