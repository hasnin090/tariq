/**
 * 🔌 Connection Service - خدمة إدارة الاتصال بقاعدة البيانات
 * ====================================================================
 * خدمة متقدمة لمراقبة حالة الاتصال مع retry تلقائي وتخزين مؤقت
 */

import { supabase } from '../lib/supabase';

export type ConnectionStatus = 'connected' | 'disconnected' | 'checking' | 'slow' | 'unstable';

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

export interface ConnectionState {
  status: ConnectionStatus;
  quality: ConnectionQuality;
  latency: number | null;
  lastChecked: Date | null;
  consecutiveFailures: number;
  isRetrying: boolean;
}

export interface ConnectionConfig {
  checkInterval: number;        // فترة الفحص بالميلي ثانية
  retryAttempts: number;        // عدد محاولات إعادة الاتصال
  retryDelay: number;           // التأخير بين المحاولات
  slowThreshold: number;        // حد الاتصال البطيء (ms)
  fairThreshold: number;        // حد الاتصال المتوسط (ms)
  goodThreshold: number;        // حد الاتصال الجيد (ms)
}

const DEFAULT_CONFIG: ConnectionConfig = {
  checkInterval: 30000,         // 30 ثانية
  retryAttempts: 3,
  retryDelay: 2000,             // 2 ثانية
  slowThreshold: 500,
  fairThreshold: 300,
  goodThreshold: 150,
};

type ConnectionListener = (state: ConnectionState) => void;

class ConnectionService {
  private state: ConnectionState = {
    status: 'checking',
    quality: 'offline',
    latency: null,
    lastChecked: null,
    consecutiveFailures: 0,
    isRetrying: false,
  };

  private config: ConnectionConfig = DEFAULT_CONFIG;
  private listeners: Set<ConnectionListener> = new Set();
  private checkIntervalId: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private pendingRequests: Map<string, { resolve: Function; reject: Function; timestamp: number }> = new Map();

  /**
   * تهيئة خدمة الاتصال
   */
  initialize(config?: Partial<ConnectionConfig>): void {
    if (this.isInitialized) return;

    if (config) {
      this.config = { ...DEFAULT_CONFIG, ...config };
    }

    this.startPeriodicCheck();
    this.isInitialized = true;
    
    // فحص فوري عند التهيئة
    this.checkConnection();
  }

  /**
   * إيقاف خدمة الاتصال
   */
  destroy(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
    this.listeners.clear();
    this.isInitialized = false;
  }

  /**
   * الاشتراك في تحديثات حالة الاتصال
   */
  subscribe(listener: ConnectionListener): () => void {
    this.listeners.add(listener);
    // إرسال الحالة الحالية فوراً
    listener(this.state);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * الحصول على الحالة الحالية
   */
  getState(): ConnectionState {
    return { ...this.state };
  }

  /**
   * فحص الاتصال يدوياً
   */
  async checkConnection(): Promise<ConnectionState> {
    this.updateState({ status: 'checking' });

    const startTime = Date.now();
    
    try {
      const { error } = await supabase
        .from('projects')
        .select('id')
        .limit(1)
        .abortSignal(AbortSignal.timeout(10000)); // timeout 10 ثواني

      const latency = Date.now() - startTime;

      if (error) {
        return this.handleConnectionFailure();
      }

      return this.handleConnectionSuccess(latency);
    } catch (error) {
      return this.handleConnectionFailure();
    }
  }

  /**
   * محاولة إعادة الاتصال
   */
  async retry(): Promise<boolean> {
    if (this.state.isRetrying) return false;

    this.updateState({ isRetrying: true });

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      const result = await this.checkConnection();
      
      if (result.status === 'connected') {
        this.updateState({ isRetrying: false });
        return true;
      }

      if (attempt < this.config.retryAttempts) {
        await this.delay(this.config.retryDelay * attempt); // تأخير تصاعدي
      }
    }

    this.updateState({ isRetrying: false });
    return false;
  }

  /**
   * تنفيذ طلب مع retry تلقائي
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options?: { maxRetries?: number; onRetry?: (attempt: number) => void }
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? this.config.retryAttempts;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          options?.onRetry?.(attempt);
          await this.delay(this.config.retryDelay * attempt);
          await this.checkConnection(); // فحص الاتصال قبل المحاولة التالية
        }
      }
    }

    throw lastError;
  }

  /**
   * تحديد جودة الاتصال بناءً على زمن الاستجابة
   */
  private getQuality(latency: number): ConnectionQuality {
    if (latency <= this.config.goodThreshold) return 'excellent';
    if (latency <= this.config.fairThreshold) return 'good';
    if (latency <= this.config.slowThreshold) return 'fair';
    return 'poor';
  }

  /**
   * معالجة نجاح الاتصال
   */
  private handleConnectionSuccess(latency: number): ConnectionState {
    const quality = this.getQuality(latency);
    const status: ConnectionStatus = latency > this.config.slowThreshold ? 'slow' : 'connected';

    this.updateState({
      status,
      quality,
      latency,
      lastChecked: new Date(),
      consecutiveFailures: 0,
    });

    return this.state;
  }

  /**
   * معالجة فشل الاتصال
   */
  private handleConnectionFailure(): ConnectionState {
    const consecutiveFailures = this.state.consecutiveFailures + 1;
    const status: ConnectionStatus = consecutiveFailures >= 3 ? 'disconnected' : 'unstable';

    this.updateState({
      status,
      quality: 'offline',
      latency: null,
      lastChecked: new Date(),
      consecutiveFailures,
    });

    return this.state;
  }

  /**
   * بدء الفحص الدوري
   */
  private startPeriodicCheck(): void {
    this.checkIntervalId = setInterval(() => {
      this.checkConnection();
    }, this.config.checkInterval);
  }

  /**
   * تحديث الحالة وإشعار المستمعين
   */
  private updateState(updates: Partial<ConnectionState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  /**
   * إشعار جميع المستمعين
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  /**
   * تأخير بسيط
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// تصدير instance واحد (Singleton)
export const connectionService = new ConnectionService();

/**
 * Hook للاستخدام في React
 */
export function useConnection() {
  return connectionService;
}
