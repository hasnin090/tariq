/**
 * usePagination Hook
 * Hook لإدارة الترقيم وتحسين الأداء عند التعامل مع بيانات كبيرة
 */

import { useState, useCallback, useMemo } from 'react';

export interface PaginationConfig {
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginationActions {
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  setPageSize: (size: number) => void;
  setTotalItems: (total: number) => void;
}

export interface PaginationHelpers<T> {
  paginatedData: T[];
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  pageRange: number[];
}

export type UsePaginationReturn<T> = PaginationState & PaginationActions & PaginationHelpers<T>;

/**
 * Hook للترقيم مع البيانات المحلية
 */
export function usePagination<T>(
  data: T[],
  config: PaginationConfig = {}
): UsePaginationReturn<T> {
  const {
    initialPage = 1,
    initialPageSize = 10,
    pageSizeOptions = [10, 25, 50, 100]
  } = config;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // حساب الفهارس
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  // البيانات المرقمة
  const paginatedData = useMemo(() => {
    return data.slice(startIndex, endIndex);
  }, [data, startIndex, endIndex]);

  // التحقق من وجود صفحات
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // حساب نطاق الصفحات للعرض (5 صفحات كحد أقصى)
  const pageRange = useMemo(() => {
    const range: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    
    // تعديل البداية إذا كانت النهاية قريبة من الحد الأقصى
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
  }, [currentPage, totalPages]);

  // الإجراءات
  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPreviousPage]);

  const firstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const lastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1); // العودة للصفحة الأولى عند تغيير الحجم
  }, []);

  const setTotalItems = useCallback(() => {
    // للاستخدام مع الترقيم من الخادم
    // لا تفعل شيء للبيانات المحلية
  }, []);

  return {
    // State
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    // Actions
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    setPageSize,
    setTotalItems,
    // Helpers
    paginatedData,
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    pageRange
  };
}

/**
 * Hook للترقيم من الخادم (Server-side pagination)
 */
export interface ServerPaginationConfig extends PaginationConfig {
  onPageChange?: (page: number, pageSize: number) => void;
}

export function useServerPagination(
  totalItems: number,
  config: ServerPaginationConfig = {}
): Omit<UsePaginationReturn<never>, 'paginatedData'> {
  const {
    initialPage = 1,
    initialPageSize = 10,
    onPageChange
  } = config;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [total, setTotal] = useState(totalItems);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);

  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const pageRange = useMemo(() => {
    const range: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
  }, [currentPage, totalPages]);

  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
    onPageChange?.(validPage, pageSize);
  }, [totalPages, pageSize, onPageChange]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage, pageSize);
    }
  }, [hasNextPage, currentPage, pageSize, onPageChange]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage, pageSize);
    }
  }, [hasPreviousPage, currentPage, pageSize, onPageChange]);

  const firstPage = useCallback(() => {
    setCurrentPage(1);
    onPageChange?.(1, pageSize);
  }, [pageSize, onPageChange]);

  const lastPage = useCallback(() => {
    setCurrentPage(totalPages);
    onPageChange?.(totalPages, pageSize);
  }, [totalPages, pageSize, onPageChange]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1);
    onPageChange?.(1, size);
  }, [onPageChange]);

  const setTotalItems = useCallback((newTotal: number) => {
    setTotal(newTotal);
    // التأكد من أن الصفحة الحالية صالحة
    const newTotalPages = Math.max(1, Math.ceil(newTotal / pageSize));
    if (currentPage > newTotalPages) {
      setCurrentPage(newTotalPages);
    }
  }, [currentPage, pageSize]);

  return {
    currentPage,
    pageSize,
    totalItems: total,
    totalPages,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    setPageSize,
    setTotalItems,
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    pageRange
  };
}

export default usePagination;
