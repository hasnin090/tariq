/**
 * 📱 Responsive Table - جدول متجاوب للموبايل
 * ====================================================================
 * مكون جدول يتحول إلى عرض البطاقات على الشاشات الصغيرة
 */

import React, { memo, useMemo, useCallback } from 'react';
import gsap from 'gsap';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  mobileHidden?: boolean;  // إخفاء في الموبايل
  mobilePriority?: number; // أولوية العرض في البطاقة (1 = أعلى)
}

export interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  cardClassName?: string;
  stickyHeader?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  mobileBreakpoint?: 'sm' | 'md' | 'lg'; // نقطة التحول للموبايل
  renderCardActions?: (item: T) => React.ReactNode;
  renderCardHeader?: (item: T) => React.ReactNode;
}

function ResponsiveTableInner<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  onRowClick,
  loading = false,
  emptyMessage = 'لا توجد بيانات',
  className = '',
  cardClassName = '',
  stickyHeader = true,
  striped = true,
  hoverable = true,
  compact = false,
  mobileBreakpoint = 'md',
  renderCardActions,
  renderCardHeader,
}: ResponsiveTableProps<T>) {

  // فرز الأعمدة حسب الأولوية للعرض في البطاقة
  const mobileColumns = useMemo(() => {
    return [...columns]
      .filter(col => !col.mobileHidden)
      .sort((a, b) => (a.mobilePriority || 99) - (b.mobilePriority || 99));
  }, [columns]);

  // الحصول على قيمة العمود
  const getCellValue = useCallback((item: T, column: Column<T>, index: number): React.ReactNode => {
    if (column.render) {
      return column.render(item, index);
    }
    const value = item[column.key as keyof T];
    return value !== undefined && value !== null ? String(value) : '-';
  }, []);

  // أنماط نقطة التحول
  const breakpointClasses = {
    sm: { table: 'hidden sm:block', cards: 'block sm:hidden' },
    md: { table: 'hidden md:block', cards: 'block md:hidden' },
    lg: { table: 'hidden lg:block', cards: 'block lg:hidden' },
  };

  // Skeleton Loading
  if (loading) {
    return (
      <div className={className}>
        {/* Desktop Skeleton */}
        <div className={breakpointClasses[mobileBreakpoint].table}>
          <div className="overflow-hidden rounded-xl border border-slate-700/50">
            <table className="w-full">
              <thead className="bg-slate-800/80">
                <tr>
                  {columns.map((col, i) => (
                    <th key={i} className={`px-4 py-3 text-right ${col.className || ''}`}>
                      <div className="h-4 bg-slate-700 rounded animate-pulse w-20" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="bg-slate-800/30">
                    {columns.map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-700/50 rounded animate-pulse" 
                          style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Skeleton */}
        <div className={breakpointClasses[mobileBreakpoint].cards}>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30 animate-pulse">
                <div className="h-5 bg-slate-700 rounded w-1/2 mb-3" />
                <div className="space-y-2">
                  <div className="h-3 bg-slate-700/50 rounded w-3/4" />
                  <div className="h-3 bg-slate-700/50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty State
  if (!data || data.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-slate-400 ${className}`}>
        <svg className="w-16 h-16 mb-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-lg font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* 🖥️ Desktop Table View */}
      <div className={breakpointClasses[mobileBreakpoint].table}>
        <div className="overflow-x-auto rounded-xl border border-slate-700/50 shadow-lg">
          <table className="w-full table-auto">
            <thead className={`bg-gradient-to-r from-slate-800 to-slate-800/90 text-slate-300 text-sm
              ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
              <tr>
                {columns.map((column, index) => (
                  <th 
                    key={index} 
                    className={`px-4 ${compact ? 'py-2' : 'py-3.5'} text-right font-semibold 
                      border-b border-slate-700/50 ${column.className || ''}`}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {data.map((item, rowIndex) => (
                <tr 
                  key={String(item[keyField])}
                  onClick={() => onRowClick?.(item)}
                  className={`
                    transition-all duration-200
                    ${striped && rowIndex % 2 === 0 ? 'bg-slate-800/20' : 'bg-slate-800/40'}
                    ${hoverable ? 'hover:bg-slate-700/50 cursor-pointer' : ''}
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                >
                  {columns.map((column, colIndex) => (
                    <td 
                      key={colIndex} 
                      className={`px-4 ${compact ? 'py-2' : 'py-3'} text-slate-200 text-sm
                        ${column.className || ''}`}
                    >
                      {getCellValue(item, column, rowIndex)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📱 Mobile Cards View */}
      <div className={breakpointClasses[mobileBreakpoint].cards}>
        <div className="space-y-3">
          {data.map((item, index) => (
            <div
              key={String(item[keyField])}
              onClick={() => onRowClick?.(item)}
              className={`
                bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 
                border border-slate-700/40 shadow-md
                transition-all duration-200
                ${hoverable ? 'hover:bg-slate-700/60 hover:border-slate-600/50 hover:shadow-lg active:scale-[0.99]' : ''}
                ${onRowClick ? 'cursor-pointer' : ''}
                ${cardClassName}
              `}
            >
              {/* Card Header */}
              {renderCardHeader ? (
                renderCardHeader(item)
              ) : (
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700/30">
                  <span className="font-semibold text-slate-100">
                    {getCellValue(item, mobileColumns[0], index)}
                  </span>
                  {mobileColumns[1] && (
                    <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded-lg">
                      {getCellValue(item, mobileColumns[1], index)}
                    </span>
                  )}
                </div>
              )}

              {/* Card Body */}
              <div className="space-y-2">
                {mobileColumns.slice(2).map((column, colIndex) => (
                  <div key={colIndex} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{column.header}:</span>
                    <span className="text-slate-200 font-medium">
                      {getCellValue(item, column, index)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Card Actions */}
              {renderCardActions && (
                <div className="mt-3 pt-3 border-t border-slate-700/30 flex items-center justify-end gap-2">
                  {renderCardActions(item)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// تغليف بـ memo لتحسين الأداء
export const ResponsiveTable = memo(ResponsiveTableInner) as typeof ResponsiveTableInner;

export default ResponsiveTable;
