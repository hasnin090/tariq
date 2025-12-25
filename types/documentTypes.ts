// ============================================================================
// Document Categories & Types
// ============================================================================

export type DocumentCategory = 
  | 'invoice'        // فواتير
  | 'contract'       // عقود
  | 'report'         // تقارير
  | 'receipt'        // إيصالات
  | 'proposal'       // عروض أسعار
  | 'correspondence' // مراسلات
  | 'legal'          // مستندات قانونية
  | 'identity'       // وثائق هوية
  | 'deed'           // صكوك
  | 'other';         // أخرى

export interface DocumentMetadata {
  id: string;
  name: string;
  category: DocumentCategory;
  file_path: string;
  file_size: number;
  file_type: string; // 'application/pdf', 'image/jpeg', etc.
  uploaded_at: string;
  uploaded_by: string;
  project_id?: string;
  booking_id?: string;
  payment_id?: string;
  expense_id?: string;
  tags?: string[];
  description?: string;
  expiry_date?: string; // تاريخ انتهاء الصلاحية
  is_expired?: boolean;
}

export interface DocumentStats {
  total: number;
  byCategory: Record<DocumentCategory, number>;
  totalSize: number; // in bytes
  recentUploads: number; // last 7 days
}

// ============================================================================
// Document Category Utilities
// ============================================================================

export const DOCUMENT_CATEGORIES: Record<DocumentCategory, {
  label: string;
  icon: string;
  color: string;
  description: string;
}> = {
  invoice: {
    label: 'فاتورة',
    icon: '📄',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    description: 'فواتير البيع والشراء'
  },
  contract: {
    label: 'عقد',
    icon: '📋',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    description: 'عقود العمل والاتفاقيات'
  },
  report: {
    label: 'تقرير',
    icon: '📊',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    description: 'التقارير المالية والإدارية'
  },
  receipt: {
    label: 'إيصال',
    icon: '🧾',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    description: 'إيصالات الدفع والاستلام'
  },
  proposal: {
    label: 'عرض سعر',
    icon: '💼',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    description: 'عروض الأسعار والمقترحات'
  },
  correspondence: {
    label: 'مراسلة',
    icon: '✉️',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
    description: 'المراسلات والخطابات'
  },
  legal: {
    label: 'قانوني',
    icon: '⚖️',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    description: 'المستندات القانونية'
  },
  identity: {
    label: 'هوية',
    icon: '🪪',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    description: 'وثائق الهوية والجوازات'
  },
  deed: {
    label: 'صك',
    icon: '📜',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    description: 'الصكوك والسندات'
  },
  other: {
    label: 'أخرى',
    icon: '📁',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-400',
    description: 'مستندات متنوعة'
  }
};

/**
 * Auto-detect document category based on filename/extension
 */
export function detectDocumentCategory(filename: string): DocumentCategory {
  const lower = filename.toLowerCase();
  
  if (lower.includes('invoice') || lower.includes('فاتورة')) {
    return 'invoice';
  }
  if (lower.includes('contract') || lower.includes('عقد')) {
    return 'contract';
  }
  if (lower.includes('report') || lower.includes('تقرير')) {
    return 'report';
  }
  if (lower.includes('receipt') || lower.includes('إيصال') || lower.includes('ايصال')) {
    return 'receipt';
  }
  if (lower.includes('proposal') || lower.includes('عرض')) {
    return 'proposal';
  }
  if (lower.includes('letter') || lower.includes('خطاب')) {
    return 'correspondence';
  }
  if (lower.includes('legal') || lower.includes('قانون')) {
    return 'legal';
  }
  if (lower.includes('id') || lower.includes('هوية') || lower.includes('جواز') || lower.includes('passport')) {
    return 'identity';
  }
  if (lower.includes('deed') || lower.includes('صك') || lower.includes('سند')) {
    return 'deed';
  }
  
  return 'other';
}

/**
 * Get file icon based on file type
 */
export function getFileIcon(fileType: string): string {
  if (fileType.includes('pdf')) return '📕';
  if (fileType.includes('image')) return '🖼️';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('zip') || fileType.includes('compressed')) return '📦';
  return '📄';
}

/**
 * Format file size to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if file type is supported for preview
 */
export function canPreviewFile(fileType: string): boolean {
  const previewableTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  return previewableTypes.includes(fileType);
}

/**
 * Get category statistics from documents
 */
export function calculateDocumentStats(documents: DocumentMetadata[]): DocumentStats {
  const stats: DocumentStats = {
    total: documents.length,
    byCategory: {
      invoice: 0,
      contract: 0,
      report: 0,
      receipt: 0,
      proposal: 0,
      correspondence: 0,
      legal: 0,
      identity: 0,
      deed: 0,
      other: 0
    },
    totalSize: 0,
    recentUploads: 0
  };

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  documents.forEach(doc => {
    if (stats.byCategory[doc.category] !== undefined) {
      stats.byCategory[doc.category]++;
    } else {
      stats.byCategory.other++;
    }
    stats.totalSize += doc.file_size;
    
    const uploadDate = new Date(doc.uploaded_at);
    if (uploadDate >= sevenDaysAgo) {
      stats.recentUploads++;
    }
  });

  return stats;
}

/**
 * Check if document is expired
 */
export function isDocumentExpired(expiryDate?: string): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
}

/**
 * Check if document is expiring soon (within 30 days)
 */
export function isDocumentExpiringSoon(expiryDate?: string, daysThreshold: number = 30): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const today = new Date();
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= daysThreshold;
}

/**
 * Get expiry status badge info
 */
export function getExpiryStatusBadge(expiryDate?: string): {
  text: string;
  color: string;
  icon: string;
} | null {
  if (!expiryDate) return null;
  
  if (isDocumentExpired(expiryDate)) {
    return {
      text: 'منتهي',
      color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      icon: '⚠️'
    };
  }
  
  if (isDocumentExpiringSoon(expiryDate, 7)) {
    return {
      text: 'ينتهي قريباً',
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      icon: '⏰'
    };
  }
  
  if (isDocumentExpiringSoon(expiryDate, 30)) {
    return {
      text: 'ينتهي خلال شهر',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      icon: '📅'
    };
  }
  
  return {
    text: 'ساري',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: '✓'
  };
}
