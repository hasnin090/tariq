import React, { useState } from 'react';
import { X, Upload, FileText, Image, File, Loader2, AlertCircle } from 'lucide-react';
import { storageService } from '../../src/services/storageService';

interface PaymentAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (attachmentId: string) => void;
  paymentId: string;
  paymentAmount: number;
  installmentNumber?: number;
  customerName?: string;
  unitName?: string;
  requireAttachment?: boolean; // جعل المرفق إجبارياً
}

const PaymentAttachmentModal: React.FC<PaymentAttachmentModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
  paymentId,
  paymentAmount,
  installmentNumber,
  customerName,
  unitName,
  requireAttachment = true // المرفق إجباري افتراضياً
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('الرجاء اختيار ملف أولاً');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const result = await storageService.uploadFile(selectedFile, paymentId);

      if (result.success && result.attachmentId) {
        onUploadComplete(result.attachmentId);
        onClose();
      } else {
        setError(result.error || 'فشل رفع الملف');
      }
    } catch (err) {
      setError('حدث خطأ أثناء رفع الملف');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = () => {
    // السماح بالتخطي فقط إذا لم يكن المرفق إجبارياً
    if (requireAttachment) {
      setError('يجب رفع وصل التسديد قبل إتمام العملية');
      return;
    }
    onUploadComplete('');
    onClose();
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-8 h-8 text-blue-500" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="w-8 h-8 text-red-500" />;
    } else {
      return <File className="w-8 h-8 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">رفع وصل التسديد</h3>
            <p className="text-sm text-gray-500 mt-1">
              {installmentNumber && `القسط رقم: ${installmentNumber}`}
              {customerName && ` • ${customerName}`}
              {unitName && ` • ${unitName}`}
            </p>
            <p className="text-sm text-emerald-600 font-medium mt-1">
              المبلغ: {paymentAmount.toLocaleString()} ر.س
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={uploading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {!selectedFile ? (
              <>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  اسحب الملف هنا أو اضغط للاختيار
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  الأنواع المدعومة: صور، PDF، Word (حتى 10MB)
                </p>
                <label className="inline-block">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                  <span className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer transition-colors">
                    اختيار ملف
                  </span>
                </label>
              </>
            ) : (
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  {getFileIcon(selectedFile.type)}
                  <div className="text-right">
                    <p className="font-medium text-gray-900 text-sm">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-red-500 hover:text-red-700"
                  disabled={uploading}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Info */}
          <div className={`mt-4 p-3 border rounded-lg ${requireAttachment ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
            {requireAttachment ? (
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  <strong>مطلوب:</strong> يجب رفع وصل التسديد لإتمام عملية تسديد القسط.
                </p>
              </div>
            ) : (
              <p className="text-sm text-blue-800">
                💡 رفع المرفق اختياري. يمكنك التخطي والمتابعة بدون رفع ملف.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          {!requireAttachment && (
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              disabled={uploading}
            >
              تخطي
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg transition-colors"
            disabled={uploading}
          >
            إلغاء
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الرفع...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                رفع وتسديد القسط
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentAttachmentModal;
