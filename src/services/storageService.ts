import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'payment-attachments';

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
   */
  async ensureBucketExists(): Promise<boolean> {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      
      const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
      
      if (!bucketExists) {
        const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
          public: false,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ]
        });

        if (error) {
          console.error('Error creating bucket:', error);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error checking bucket:', error);
      return false;
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
      const attachmentId = crypto.randomUUID();
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
}

export const storageService = new StorageService();
