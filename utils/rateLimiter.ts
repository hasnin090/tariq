/**
 * Rate Limiter لحماية تسجيل الدخول من هجمات Brute Force
 */

interface LoginAttempt {
  username: string;
  timestamp: number;
  ip?: string;
}

const MAX_ATTEMPTS = 5; // عدد المحاولات المسموحة
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 دقيقة بالميلي ثانية
const ATTEMPT_WINDOW = 5 * 60 * 1000; // نافذة 5 دقائق

class RateLimiter {
  private attempts: Map<string, LoginAttempt[]> = new Map();

  /**
   * تسجيل محاولة تسجيل دخول فاشلة
   */
  recordFailedAttempt(username: string): void {
    const now = Date.now();
    const userAttempts = this.attempts.get(username) || [];
    
    // حذف المحاولات القديمة (خارج نافذة الـ 5 دقائق)
    const recentAttempts = userAttempts.filter(
      attempt => now - attempt.timestamp < ATTEMPT_WINDOW
    );
    
    // إضافة المحاولة الجديدة
    recentAttempts.push({ username, timestamp: now });
    this.attempts.set(username, recentAttempts);
    
    // حفظ في localStorage كـ backup
    this.saveToStorage();
  }

  /**
   * التحقق من إمكانية تسجيل الدخول
   */
  canAttemptLogin(username: string): { allowed: boolean; remainingTime?: number; attemptsLeft?: number } {
    const now = Date.now();
    const userAttempts = this.attempts.get(username) || [];
    
    // حذف المحاولات القديمة
    const recentAttempts = userAttempts.filter(
      attempt => now - attempt.timestamp < ATTEMPT_WINDOW
    );
    
    this.attempts.set(username, recentAttempts);
    
    // التحقق من الحظر
    if (recentAttempts.length >= MAX_ATTEMPTS) {
      const oldestAttempt = recentAttempts[0];
      const lockoutEnd = oldestAttempt.timestamp + LOCKOUT_DURATION;
      
      if (now < lockoutEnd) {
        const remainingTime = Math.ceil((lockoutEnd - now) / 1000 / 60); // بالدقائق
        return { allowed: false, remainingTime };
      } else {
        // انتهى وقت الحظر، امسح المحاولات
        this.attempts.delete(username);
        this.saveToStorage();
        return { allowed: true, attemptsLeft: MAX_ATTEMPTS };
      }
    }
    
    const attemptsLeft = MAX_ATTEMPTS - recentAttempts.length;
    return { allowed: true, attemptsLeft };
  }

  /**
   * مسح محاولات المستخدم بعد تسجيل دخول ناجح
   */
  clearAttempts(username: string): void {
    this.attempts.delete(username);
    this.saveToStorage();
  }

  /**
   * حفظ في localStorage
   */
  private saveToStorage(): void {
    try {
      const data = Array.from(this.attempts.entries());
      localStorage.setItem('login_attempts', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save rate limiter data:', error);
    }
  }

  /**
   * استرجاع من localStorage
   */
  loadFromStorage(): void {
    try {
      const data = localStorage.getItem('login_attempts');
      if (data) {
        const entries = JSON.parse(data);
        this.attempts = new Map(entries);
        
        // حذف البيانات القديمة
        const now = Date.now();
        this.attempts.forEach((attempts, username) => {
          const recent = attempts.filter(
            attempt => now - attempt.timestamp < LOCKOUT_DURATION
          );
          if (recent.length === 0) {
            this.attempts.delete(username);
          } else {
            this.attempts.set(username, recent);
          }
        });
        this.saveToStorage();
      }
    } catch (error) {
      console.error('Failed to load rate limiter data:', error);
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();
rateLimiter.loadFromStorage();
