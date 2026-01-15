/**
 * 🔌 Connection Indicator - مؤشر حالة الاتصال الاحترافي
 * ====================================================================
 * مكون عرض حالة الاتصال بقاعدة البيانات مع تأثيرات بصرية متقدمة
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import { connectionService, ConnectionState, ConnectionQuality } from '../../src/services/connectionService';

interface ConnectionIndicatorProps {
  compact?: boolean;
  showLatency?: boolean;
  className?: string;
}

const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = memo(({
  compact = false,
  showLatency = true,
  className = '',
}) => {
  const [state, setState] = useState<ConnectionState>(connectionService.getState());
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // تهيئة الخدمة إذا لم تكن مهيأة
    connectionService.initialize();
    
    // الاشتراك في التحديثات
    const unsubscribe = connectionService.subscribe(setState);
    
    return unsubscribe;
  }, []);

  const handleClick = useCallback(async () => {
    await connectionService.checkConnection();
  }, []);

  const handleRetry = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await connectionService.retry();
  }, []);

  // ألوان حسب الجودة
  const getQualityColors = (quality: ConnectionQuality) => {
    const colors = {
      excellent: { bg: 'bg-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/50' },
      good: { bg: 'bg-green-500', text: 'text-green-400', glow: 'shadow-green-500/50' },
      fair: { bg: 'bg-amber-500', text: 'text-amber-400', glow: 'shadow-amber-500/50' },
      poor: { bg: 'bg-orange-500', text: 'text-orange-400', glow: 'shadow-orange-500/50' },
      offline: { bg: 'bg-rose-500', text: 'text-rose-400', glow: 'shadow-rose-500/50' },
    };
    return colors[quality];
  };

  // نص حالة الجودة بالعربية
  const getQualityText = (quality: ConnectionQuality): string => {
    const texts = {
      excellent: 'ممتاز',
      good: 'جيد',
      fair: 'متوسط',
      poor: 'ضعيف',
      offline: 'غير متصل',
    };
    return texts[quality];
  };

  // أيقونة الإشارة حسب الجودة
  const SignalIcon = ({ quality }: { quality: ConnectionQuality }) => {
    const colors = getQualityColors(quality);
    const bars = quality === 'offline' ? 0 : 
                 quality === 'poor' ? 1 : 
                 quality === 'fair' ? 2 : 
                 quality === 'good' ? 3 : 4;

    return (
      <svg className={`h-5 w-5 sm:h-6 sm:w-6 ${colors.text}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20h.01" className={bars >= 0 ? 'opacity-100' : 'opacity-30'} />
        <path d="M7 20v-4" className={bars >= 1 ? 'opacity-100' : 'opacity-30'} />
        <path d="M12 20v-8" className={bars >= 2 ? 'opacity-100' : 'opacity-30'} />
        <path d="M17 20v-12" className={bars >= 3 ? 'opacity-100' : 'opacity-30'} />
        <path d="M22 20v-16" className={bars >= 4 ? 'opacity-100' : 'opacity-30'} />
        {quality === 'offline' && (
          <line x1="4" y1="4" x2="20" y2="20" className="text-rose-500" strokeWidth="2.5" />
        )}
      </svg>
    );
  };

  const colors = getQualityColors(state.quality);

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className={`relative p-1.5 rounded-lg transition-all duration-200 hover:bg-slate-700/50 ${className}`}
        title={`حالة الاتصال: ${getQualityText(state.quality)}`}
      >
        <div className={`w-2.5 h-2.5 rounded-full ${colors.bg} ${state.status === 'checking' ? 'animate-pulse' : ''}`} />
        {state.status === 'disconnected' && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full rounded-full ${colors.bg} opacity-75 animate-ping`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${colors.bg}`} />
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`p-2 sm:p-2.5 rounded-xl transition-all duration-200 ease-in-out border 
          hover:scale-[1.02] active:scale-[0.98] relative group
          ${state.status === 'disconnected' 
            ? 'border-rose-500/30 hover:border-rose-500/50 bg-rose-500/10' 
            : 'border-transparent hover:border-slate-600/30 hover:bg-slate-700/50'
          }`}
        title="التحقق من الاتصال"
      >
        {state.status === 'checking' || state.isRetrying ? (
          <svg className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <SignalIcon quality={state.quality} />
        )}

        {/* مؤشر التنبيه للاتصال السيء */}
        {(state.quality === 'poor' || state.quality === 'offline') && state.status !== 'checking' && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center">
            <span className={`absolute inline-flex h-3 w-3 rounded-full ${colors.bg} opacity-75 animate-ping`} />
            <svg className={`relative h-3 w-3 ${colors.text}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-52 sm:w-56 
          bg-slate-800 dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-700/50 
          p-3 sm:p-4 z-50 animate-fade-in-scale-up backdrop-blur-lg">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400">حالة الاتصال</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${colors.bg} ${
                state.status === 'checking' ? 'animate-pulse' : 'animate-pulse'
              }`} />
              <span className={`text-xs font-medium ${colors.text}`}>
                {state.status === 'checking' ? 'جاري الفحص...' : 
                 state.status === 'disconnected' ? 'غير متصل' :
                 state.status === 'slow' ? 'بطيء' :
                 state.status === 'unstable' ? 'غير مستقر' : 'متصل'}
              </span>
            </div>
          </div>

          {/* Latency Display */}
          {showLatency && state.latency !== null && (
            <>
              <div className="flex flex-col items-center mb-3">
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl sm:text-4xl font-bold tabular-nums transition-all duration-300 ${colors.text}`}>
                    {state.latency}
                  </span>
                  <span className="text-sm text-slate-500">ms</span>
                </div>
                
                {/* Quality Bar */}
                <div className="w-full mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${colors.bg} transition-all duration-500 ease-out rounded-full`}
                    style={{ 
                      width: `${Math.max(10, 100 - (state.latency / 5))}%` 
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${colors.bg}`} />
                  {getQualityText(state.quality)}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {state.lastChecked ? new Date(state.lastChecked).toLocaleTimeString('ar-IQ', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  }) : '--:--'}
                </span>
              </div>
            </>
          )}

          {/* Disconnected State */}
          {state.status === 'disconnected' && (
            <div className="text-center py-2">
              <p className="text-xs text-rose-400 mb-3">⚠️ لا يمكن الاتصال بالخادم</p>
              <button
                onClick={handleRetry}
                disabled={state.isRetrying}
                className={`w-full px-3 py-2 text-xs font-medium rounded-lg transition-all
                  ${state.isRetrying 
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                    : 'bg-primary-600 hover:bg-primary-700 text-white hover:scale-[1.02] active:scale-[0.98]'
                  }`}
              >
                {state.isRetrying ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    جاري إعادة المحاولة...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    إعادة المحاولة
                  </span>
                )}
              </button>
              {state.consecutiveFailures > 1 && (
                <p className="text-[10px] text-slate-500 mt-2">
                  {state.consecutiveFailures} محاولات فاشلة متتالية
                </p>
              )}
            </div>
          )}

          {/* Connection Tips */}
          {state.quality === 'poor' && state.status !== 'disconnected' && (
            <div className="mt-2 pt-2 border-t border-slate-700/50">
              <p className="text-[10px] text-slate-500 text-center">
                💡 الاتصال بطيء - تحقق من شبكة الإنترنت
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ConnectionIndicator.displayName = 'ConnectionIndicator';

export default ConnectionIndicator;
