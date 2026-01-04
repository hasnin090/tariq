import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'payment-attachments';

// دالة لإنشاء UUID متوافقة مع جميع المتصفحات
function generateUUID(): string {
  // استخدام crypto.randomUUID إذا كان متاحاً
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // بديل للمتصفحات القديمة
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export interface UploadResult {
  success: boolean;
  attachmentId?: string;
  filePath?: string;
  error?: string;
}

export interface AttachmentMetadata {
  id: string;
  payment_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by?: string;
  uploaded_at: string;
}

/**
 * خدمة تخزين المرفقات في Supabase Storage
 */
class StorageService {
  /**
   * التأكد من وجود bucket للمرفقات
   * ملاحظة: يجب إنشاء الـ bucket من Supabase Dashboard أو عبر SQL
   * لأن الـ anon key لا يملك صلاحية إنشاء buckets
   */
  async ensureBucketExists(): Promise<boolean> {
    try {
      // فقط التحقق من وجود الـ bucket، لا نحاول إنشاءه
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.warn('Cannot list buckets (this is normal with anon key):', error.message);
        // نفترض أن الـ bucket موجود إذا لم نتمكن من التحقق
        return true;
      }
      
      const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
      
      if (!bucketExists) {
        console.warn(`Bucket "${BUCKET_NAME}" not found. Please create it from Supabase Dashboard or run the migration: setup-payment-attachments-storage.sql`);
        // لا نحاول إنشاءه لأن ذلك يتطلب صلاحيات service_role
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('Error checking bucket:', error);
      // نفترض أن الـ bucket موجود ونستمر
      return true;
    }
  }

  /**
   * رفع ملف إلى التخزين
   */
  async uploadFile(
    file: File,
    paymentId: string,
    userId?: string
  ): Promise<UploadResult> {
    try {
      // التحقق من حجم الملف (10MB)
      if (file.size > 10485760) {
        return {
          success: false,
          error: 'حجم الملف يتجاوز الحد المسموح (10MB)'
        };
      }

      // التحقق من نوع الملف
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!allowedTypes.includes(file.type)) {
        return {
          success: false,
          error: 'نوع الملف غير مدعوم. يُسمح فقط بـ: صور، PDF، Word'
        };
      }

      // التأكد من وجود bucket
      await this.ensureBucketExists();

      // إنشاء اسم ملف فريد
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${paymentId}_${timestamp}.${fileExt}`;
      const filePath = `${paymentId}/${fileName}`;

      // رفع الملف
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        return {
          success: false,
          error: 'فشل رفع الملف. حاول مرة أخرى.'
        };
      }

      // حفظ معلومات المرفق في قاعدة البيانات
      const attachmentId = generateUUID();
      const { error: dbError } = await supabase
        .from('payment_attachments')
        .insert({
          id: attachmentId,
          payment_id: paymentId,
          file_name: file.name,
          file_path: data.path,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: userId
        });

      if (dbError) {
        console.error('Database error:', dbError);
        // حذف الملف من التخزين إذا فشل حفظ البيانات
        await this.deleteFile(data.path);
        return {
          success: false,
          error: 'فشل حفظ معلومات المرفق'
        };
      }

      return {
        success: true,
        attachmentId,
        filePath: data.path
      };
    } catch (error) {
      console.error('Unexpected error:', error);
      return {
        success: false,
        error: 'حدث خطأ غير متوقع'
      };
    }
  }

  /**
   * الحصول على رابط عام مؤقت للملف
   */
  async getPublicUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('Error getting signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Unexpected error:', error);
      return null;
    }
  }

  /**
   * حذف ملف من التخزين
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error:', error);
      return false;
    }
  }

  /**
   * الحصول على جميع مرفقات دفعة معينة
   */
  async getPaymentAttachments(paymentId: string): Promise<AttachmentMetadata[]> {
    try {
      const { data, error } = await supabase
        .from('payment_attachments')
        .select('*')
        .eq('payment_id', paymentId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching attachments:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error:', error);
      return [];
    }
  }

  /**
   * حذف مرفق من قاعدة البيانات والتخزين
   */
  async deleteAttachment(attachmentId: string): Promise<boolean> {
    try {
      // الحصول على معلومات المرفق
      const { data: attachment, error: fetchError } = await supabase
        .from('payment_attachments')
        .select('file_path')
        .eq('id', attachmentId)
        .single();

      if (fetchError || !attachment) {
        console.error('Error fetching attachment:', fetchError);
        return false;
      }

      // حذف الملف من التخزين
      await this.deleteFile(attachment.file_path);

      // حذف السجل من قاعدة البيانات
      const { error: deleteError } = await supabase
        .from('payment_attachments')
        .delete()
        .eq('id', attachmentId);

      if (deleteError) {
        console.error('Error deleting attachment record:', deleteError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error:', error);
      return false;
    }
  }

  /**
   * تنزيل ملف
   */
  async downloadFile(filePath: string, fileName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(filePath);

      if (error || !data) {
        console.error('Download error:', error);
        return false;
      }

      // إنشاء رابط تنزيل
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Unexpected error:', error);
      return false;
    }
  }

  /**
   * الحصول على مرفقات جميع الأقساط المدفوعة لعميل معين مع معلومات تفصيلية
   */
  async getInstallmentAttachmentsForCustomer(customerId: string): Promise<{
    installmentNumber: number;
    dueDate: string;
    amount: number;
    paidDate: string;
    unitName: string;
    customerName: string;
    bookingId: string;
    attachment: AttachmentMetadata | null;
  }[]> {
    try {
      // جلب جميع الأقساط المدفوعة مع مرفقاتها
      const { data, error } = await supabase
        .from('scheduled_payments')
        .select(`
          id,
          installment_number,
          due_date,
          amount,
          paid_date,
          attachment_id,
          booking_id,
          bookings (
            customer_id,
            customers (name),
            units (unit_number)
          ),
          payment_attachments (
            id,
            payment_id,
            file_name,
            file_path,
            file_size,
            file_type,
            uploaded_at
          )
        `)
        .eq('status', 'paid')
        .not('attachment_id', 'is', null);

      if (error) {
        console.error('Error fetching installment attachments:', error);
        return [];
      }

      // فلترة حسب العميل
      const filtered = (data || []).filter((sp: any) => {
        const booking = sp.bookings as any;
        return booking?.customer_id === customerId;
      });

      return filtered.map((sp: any) => {
        const booking = sp.bookings as any;
        const attachment = sp.payment_attachments as any;
        return {
          installmentNumber: sp.installment_number,
          dueDate: sp.due_date,
          amount: sp.amount,
          paidDate: sp.paid_date,
          unitName: booking?.units?.unit_number || '',
          customerName: booking?.customers?.name || '',
          bookingId: sp.booking_id,
          attachment: attachment ? {
            id: attachment.id,
            payment_id: attachment.payment_id,
            file_name: attachment.file_name,
            file_path: attachment.file_path,
            file_size: attachment.file_size,
            file_type: attachment.file_type,
            uploaded_by: '',
            uploaded_at: attachment.uploaded_at
          } : null
        };
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      return [];
    }
  }

  /**
   * الحصول على جميع مرفقات الأقساط مجمعة حسب العميل والحجز
   * نبدأ من جدول payment_attachments لأن المرفقات مرتبطة بـ payment_id
   */
  async getAllInstallmentAttachments(): Promise<{
    customerId: string;
    customerName: string;
    bookings: {
      bookingId: string;
      unitName: string;
      installments: {
        installmentNumber: number;
        dueDate: string;
        amount: number;
        paidDate: string;
        attachment: AttachmentMetadata | null;
      }[];
    }[];
  }[]> {
    try {
      // أولاً: جلب جميع المرفقات
      const { data: attachments, error: attachmentsError } = await supabase
        .from('payment_attachments')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (attachmentsError) {
        console.error('Error fetching payment attachments:', attachmentsError);
        return [];
      }

      console.log('Fetched payment attachments:', attachments);

      if (!attachments || attachments.length === 0) {
        console.log('No payment attachments found');
        return [];
      }

      // ثانياً: جلب الأقساط المرتبطة
      const paymentIds = attachments.map(a => a.payment_id);
      const { data: scheduledPayments, error: paymentsError } = await supabase
        .from('scheduled_payments')
        .select(`
          id,
          installment_number,
          due_date,
          amount,
          paid_date,
          status,
          booking_id
        `)
        .in('id', paymentIds);

      if (paymentsError) {
        console.error('Error fetching scheduled payments:', paymentsError);
        return [];
      }

      console.log('Fetched scheduled payments:', scheduledPayments);

      // ثالثاً: جلب الحجوزات المرتبطة
      const bookingIds = [...new Set(scheduledPayments?.map(sp => sp.booking_id) || [])];
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          customer_id,
          customers (id, name),
          units (unit_number)
        `)
        .in('id', bookingIds);

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        return [];
      }

      console.log('Fetched bookings:', bookings);

      // إنشاء خرائط للوصول السريع
      const paymentsMap = new Map<string, any>();
      for (const sp of scheduledPayments || []) {
        paymentsMap.set(sp.id, sp);
      }

      const bookingsMap = new Map<string, any>();
      for (const b of bookings || []) {
        bookingsMap.set(b.id, b);
      }

      // تجميع البيانات حسب العميل والحجز
      const customersMap = new Map<string, {
        customerId: string;
        customerName: string;
        bookingsMap: Map<string, {
          bookingId: string;
          unitName: string;
          installments: any[];
        }>;
      }>();

      for (const attachment of attachments) {
        const scheduledPayment = paymentsMap.get(attachment.payment_id);
        if (!scheduledPayment) {
          console.log('No scheduled payment found for attachment:', attachment.id, 'payment_id:', attachment.payment_id);
          continue;
        }

        const booking = bookingsMap.get(scheduledPayment.booking_id);
        if (!booking) {
          console.log('No booking found for scheduled payment:', scheduledPayment.id, 'booking_id:', scheduledPayment.booking_id);
          continue;
        }

        const customerId = booking.customer_id;
        const customer = booking.customers;
        const unit = booking.units;
        const customerName = customer?.name || 'غير معروف';
        const bookingId = scheduledPayment.booking_id;
        const unitName = unit?.unit_number || 'غير معروف';

        if (!customerId) continue;

        if (!customersMap.has(customerId)) {
          customersMap.set(customerId, {
            customerId,
            customerName,
            bookingsMap: new Map()
          });
        }

        const customerData = customersMap.get(customerId)!;

        if (!customerData.bookingsMap.has(bookingId)) {
          customerData.bookingsMap.set(bookingId, {
            bookingId,
            unitName,
            installments: []
          });
        }

        customerData.bookingsMap.get(bookingId)!.installments.push({
          installmentNumber: scheduledPayment.installment_number,
          dueDate: scheduledPayment.due_date,
          amount: scheduledPayment.amount,
          paidDate: scheduledPayment.paid_date,
          attachment: {
            id: attachment.id,
            payment_id: attachment.payment_id,
            file_name: attachment.file_name,
            file_path: attachment.file_path,
            file_size: attachment.file_size,
            file_type: attachment.file_type,
            uploaded_by: '',
            uploaded_at: attachment.uploaded_at
          }
        });
      }

      // تحويل Map إلى Array
      const result = Array.from(customersMap.values()).map(customer => ({
        customerId: customer.customerId,
        customerName: customer.customerName,
        bookings: Array.from(customer.bookingsMap.values())
      }));

      console.log('Processed installment attachments result:', result);
      return result;
    } catch (error) {
      console.error('Unexpected error:', error);
      return [];
    }
  }
}

export const storageService = new StorageService();
