import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * يحمي التطبيق من الانهيار الكامل عند حدوث خطأ في المكونات الفرعية
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // تسجيل الخطأ
    if (process.env.NODE_ENV === 'development') {
      console.group('❌ Error Boundary Caught an Error');
      console.error('Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // استدعاء callback إذا تم توفيره
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // إذا تم توفير fallback مخصص
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // واجهة الخطأ الافتراضية
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            {/* أيقونة الخطأ */}
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg 
                className="w-10 h-10 text-red-600" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>

            {/* العنوان */}
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              حدث خطأ غير متوقع
            </h2>

            {/* الوصف */}
            <p className="text-gray-600 mb-6">
              عذراً، حدث خطأ أثناء تحميل هذا الجزء من التطبيق. 
              يمكنك المحاولة مرة أخرى أو إعادة تحميل الصفحة.
            </p>

            {/* تفاصيل الخطأ (للتطوير فقط) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg text-right overflow-auto max-h-40">
                <p className="text-sm font-mono text-red-700 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            {/* أزرار الإجراء */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                حاول مرة أخرى
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                إعادة تحميل الصفحة
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

/**
 * Error Boundary للمكونات الصغيرة (مع رسالة بسيطة)
 */
export const SmallErrorBoundary: React.FC<{ children: ReactNode; componentName?: string }> = ({ 
  children, 
  componentName 
}) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
          <p className="text-red-600 text-sm">
            حدث خطأ في تحميل {componentName || 'هذا المكون'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-xs text-red-700 underline hover:no-underline"
          >
            إعادة تحميل
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * Error Boundary للجداول
 */
export const TableErrorBoundary: React.FC<{ children: ReactNode; tableName?: string }> = ({ 
  children,
  tableName 
}) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            تعذر تحميل {tableName || 'البيانات'}
          </h3>
          <p className="text-gray-600 mb-4">
            حدث خطأ أثناء تحميل الجدول. يرجى المحاولة مرة أخرى.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            إعادة المحاولة
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * Error Boundary للصفحات الكاملة
 */
export const PageErrorBoundary: React.FC<{ children: ReactNode; pageName?: string }> = ({ 
  children,
  pageName 
}) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              تعذر تحميل صفحة {pageName || 'المحتوى'}
            </h2>
            <p className="text-gray-600 mb-6">
              نعتذر عن هذا الخطأ. فريقنا يعمل على حل المشكلة.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                العودة
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};
