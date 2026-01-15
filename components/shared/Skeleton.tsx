/**
 * 💀 Skeleton Loaders - مكونات التحميل المتحركة
 * ====================================================================
 * مجموعة مكونات skeleton للتحميل بدلاً من spinners بسيطة
 */

import React, { memo } from 'react';

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

// ────────────────────────────────────────────────────────────────────
// 📄 Text Skeleton - نص
// ────────────────────────────────────────────────────────────────────
export const SkeletonText: React.FC<SkeletonProps & { 
  lines?: number; 
  lineHeight?: string;
  lastLineWidth?: string;
}> = memo(({ 
  className = '', 
  animate = true, 
  lines = 1, 
  lineHeight = 'h-4',
  lastLineWidth = '75%'
}) => (
  <div className={`space-y-2 ${className}`}>
    {[...Array(lines)].map((_, i) => (
      <div
        key={i}
        className={`${lineHeight} bg-slate-700/50 rounded ${animate ? 'animate-pulse' : ''}`}
        style={{ width: i === lines - 1 && lines > 1 ? lastLineWidth : '100%' }}
      />
    ))}
  </div>
));

SkeletonText.displayName = 'SkeletonText';

// ────────────────────────────────────────────────────────────────────
// 🟢 Avatar Skeleton - صورة رمزية
// ────────────────────────────────────────────────────────────────────
export const SkeletonAvatar: React.FC<SkeletonProps & { 
  size?: 'sm' | 'md' | 'lg' | 'xl';
}> = memo(({ className = '', animate = true, size = 'md' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div 
      className={`${sizes[size]} rounded-full bg-slate-700/50 ${animate ? 'animate-pulse' : ''} ${className}`} 
    />
  );
});

SkeletonAvatar.displayName = 'SkeletonAvatar';

// ────────────────────────────────────────────────────────────────────
// 📦 Card Skeleton - بطاقة
// ────────────────────────────────────────────────────────────────────
export const SkeletonCard: React.FC<SkeletonProps & {
  hasImage?: boolean;
  hasFooter?: boolean;
}> = memo(({ className = '', animate = true, hasImage = false, hasFooter = false }) => (
  <div className={`bg-slate-800/50 rounded-xl p-4 border border-slate-700/30 ${className}`}>
    {hasImage && (
      <div className={`h-32 bg-slate-700/50 rounded-lg mb-4 ${animate ? 'animate-pulse' : ''}`} />
    )}
    <div className="space-y-3">
      <div className={`h-5 bg-slate-700/50 rounded w-3/4 ${animate ? 'animate-pulse' : ''}`} />
      <div className={`h-4 bg-slate-700/30 rounded w-full ${animate ? 'animate-pulse' : ''}`} />
      <div className={`h-4 bg-slate-700/30 rounded w-2/3 ${animate ? 'animate-pulse' : ''}`} />
    </div>
    {hasFooter && (
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/30">
        <div className={`h-4 bg-slate-700/50 rounded w-20 ${animate ? 'animate-pulse' : ''}`} />
        <div className={`h-8 bg-slate-700/50 rounded w-24 ${animate ? 'animate-pulse' : ''}`} />
      </div>
    )}
  </div>
));

SkeletonCard.displayName = 'SkeletonCard';

// ────────────────────────────────────────────────────────────────────
// 📊 Table Row Skeleton - صف جدول
// ────────────────────────────────────────────────────────────────────
export const SkeletonTableRow: React.FC<SkeletonProps & {
  columns?: number;
}> = memo(({ className = '', animate = true, columns = 5 }) => (
  <tr className={`bg-slate-800/30 ${className}`}>
    {[...Array(columns)].map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div 
          className={`h-4 bg-slate-700/50 rounded ${animate ? 'animate-pulse' : ''}`}
          style={{ width: `${60 + Math.random() * 40}%` }}
        />
      </td>
    ))}
  </tr>
));

SkeletonTableRow.displayName = 'SkeletonTableRow';

// ────────────────────────────────────────────────────────────────────
// 📈 Stats Card Skeleton - بطاقة إحصائيات
// ────────────────────────────────────────────────────────────────────
export const SkeletonStatsCard: React.FC<SkeletonProps> = memo(({ 
  className = '', 
  animate = true 
}) => (
  <div className={`bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-700/30 ${className}`}>
    <div className="flex items-center justify-between mb-3">
      <div className={`h-4 bg-slate-700/50 rounded w-24 ${animate ? 'animate-pulse' : ''}`} />
      <div className={`w-10 h-10 bg-slate-700/50 rounded-lg ${animate ? 'animate-pulse' : ''}`} />
    </div>
    <div className={`h-8 bg-slate-700/50 rounded w-32 mb-2 ${animate ? 'animate-pulse' : ''}`} />
    <div className={`h-3 bg-slate-700/30 rounded w-20 ${animate ? 'animate-pulse' : ''}`} />
  </div>
));

SkeletonStatsCard.displayName = 'SkeletonStatsCard';

// ────────────────────────────────────────────────────────────────────
// 📋 List Item Skeleton - عنصر قائمة
// ────────────────────────────────────────────────────────────────────
export const SkeletonListItem: React.FC<SkeletonProps & {
  hasAvatar?: boolean;
  hasAction?: boolean;
}> = memo(({ className = '', animate = true, hasAvatar = true, hasAction = false }) => (
  <div className={`flex items-center gap-3 p-3 ${className}`}>
    {hasAvatar && (
      <div className={`w-10 h-10 rounded-full bg-slate-700/50 flex-shrink-0 ${animate ? 'animate-pulse' : ''}`} />
    )}
    <div className="flex-1 min-w-0">
      <div className={`h-4 bg-slate-700/50 rounded w-3/4 mb-2 ${animate ? 'animate-pulse' : ''}`} />
      <div className={`h-3 bg-slate-700/30 rounded w-1/2 ${animate ? 'animate-pulse' : ''}`} />
    </div>
    {hasAction && (
      <div className={`w-8 h-8 rounded-lg bg-slate-700/50 flex-shrink-0 ${animate ? 'animate-pulse' : ''}`} />
    )}
  </div>
));

SkeletonListItem.displayName = 'SkeletonListItem';

// ────────────────────────────────────────────────────────────────────
// 📱 Dashboard Skeleton - لوحة التحكم
// ────────────────────────────────────────────────────────────────────
export const SkeletonDashboard: React.FC<SkeletonProps> = memo(({ className = '', animate = true }) => (
  <div className={`space-y-6 ${className}`}>
    {/* Stats Row */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <SkeletonStatsCard key={i} animate={animate} />
      ))}
    </div>
    
    {/* Charts Row */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className={`bg-slate-800/50 rounded-xl p-6 border border-slate-700/30 h-64 ${animate ? 'animate-pulse' : ''}`}>
        <div className="h-4 bg-slate-700/50 rounded w-32 mb-4" />
        <div className="h-full bg-slate-700/30 rounded-lg" />
      </div>
      <div className={`bg-slate-800/50 rounded-xl p-6 border border-slate-700/30 h-64 ${animate ? 'animate-pulse' : ''}`}>
        <div className="h-4 bg-slate-700/50 rounded w-32 mb-4" />
        <div className="h-full bg-slate-700/30 rounded-lg" />
      </div>
    </div>

    {/* Table */}
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/30 overflow-hidden">
      <div className="p-4 border-b border-slate-700/30">
        <div className={`h-5 bg-slate-700/50 rounded w-40 ${animate ? 'animate-pulse' : ''}`} />
      </div>
      <table className="w-full">
        <thead className="bg-slate-800/80">
          <tr>
            {[...Array(5)].map((_, i) => (
              <th key={i} className="px-4 py-3 text-right">
                <div className={`h-4 bg-slate-700 rounded w-20 ${animate ? 'animate-pulse' : ''}`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/30">
          {[...Array(5)].map((_, i) => (
            <SkeletonTableRow key={i} columns={5} animate={animate} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
));

SkeletonDashboard.displayName = 'SkeletonDashboard';

// ────────────────────────────────────────────────────────────────────
// 📝 Form Skeleton - نموذج
// ────────────────────────────────────────────────────────────────────
export const SkeletonForm: React.FC<SkeletonProps & {
  fields?: number;
}> = memo(({ className = '', animate = true, fields = 4 }) => (
  <div className={`space-y-4 ${className}`}>
    {[...Array(fields)].map((_, i) => (
      <div key={i}>
        <div className={`h-4 bg-slate-700/50 rounded w-24 mb-2 ${animate ? 'animate-pulse' : ''}`} />
        <div className={`h-10 bg-slate-700/30 rounded-lg w-full ${animate ? 'animate-pulse' : ''}`} />
      </div>
    ))}
    <div className="flex justify-end gap-3 pt-4">
      <div className={`h-10 bg-slate-700/50 rounded-lg w-24 ${animate ? 'animate-pulse' : ''}`} />
      <div className={`h-10 bg-primary-600/50 rounded-lg w-32 ${animate ? 'animate-pulse' : ''}`} />
    </div>
  </div>
));

SkeletonForm.displayName = 'SkeletonForm';

// ────────────────────────────────────────────────────────────────────
// 🎨 Shimmer Effect Component
// ────────────────────────────────────────────────────────────────────
export const Shimmer: React.FC<{ className?: string; children?: React.ReactNode }> = memo(({ 
  className = '', 
  children 
}) => (
  <div className={`relative overflow-hidden ${className}`}>
    {children}
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  </div>
));

Shimmer.displayName = 'Shimmer';

// ────────────────────────────────────────────────────────────────────
// Export all
// ────────────────────────────────────────────────────────────────────
export const Skeleton = {
  Text: SkeletonText,
  Avatar: SkeletonAvatar,
  Card: SkeletonCard,
  TableRow: SkeletonTableRow,
  StatsCard: SkeletonStatsCard,
  ListItem: SkeletonListItem,
  Dashboard: SkeletonDashboard,
  Form: SkeletonForm,
};

export default Skeleton;
