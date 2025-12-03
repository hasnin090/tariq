import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { verifyPassword } from '../utils/passwordUtils';
import { rateLimiter } from '../utils/rateLimiter';

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple authentication service using localStorage
const AUTH_STORAGE_KEY = 'auth_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user', error);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      // التحقق من Rate Limiting
      const rateLimitCheck = rateLimiter.canAttemptLogin(username);
      if (!rateLimitCheck.allowed) {
        return { 
          error: new Error(
            `تم حظر تسجيل الدخول مؤقتاً. الرجاء المحاولة بعد ${rateLimitCheck.remainingTime} دقيقة`
          ) 
        };
      }

      // Fetch user from database
      const { supabase } = await import('../src/lib/supabase');
      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, username, email, role, password')
        .eq('username', username)
        .single();

      if (error || !user) {
        // تسجيل محاولة فاشلة
        rateLimiter.recordFailedAttempt(username);
        
        const attemptsLeft = rateLimitCheck.attemptsLeft! - 1;
        const message = attemptsLeft > 0 
          ? `اسم المستخدم غير موجود. المحاولات المتبقية: ${attemptsLeft}`
          : 'اسم المستخدم غير موجود';
        
        console.error('Login error:', error);
        return { error: new Error(message) };
      }

      // Check if password field exists
      if (!user.password) {
        rateLimiter.recordFailedAttempt(username);
        console.error('Password field missing for user:', username);
        return { error: new Error('خطأ في إعدادات المستخدم. الرجاء التواصل مع المدير.') };
      }

      // التحقق من كلمة المرور
      let isPasswordValid = false;
      let needsPasswordUpdate = false;
      
      // التحقق إذا كانت كلمة المرور مشفرة بـ bcrypt (تبدأ بـ $2a$ أو $2b$)
      const isBcryptHash = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
      
      if (isBcryptHash) {
        // كلمة مرور مشفرة - استخدام bcrypt للمقارنة
        isPasswordValid = await verifyPassword(password, user.password);
      } else {
        // كلمة مرور قديمة (نص عادي) - مقارنة مباشرة
        isPasswordValid = password === user.password;
        needsPasswordUpdate = isPasswordValid; // تحديث كلمة المرور إذا كانت صحيحة
      }
      
      if (!isPasswordValid) {
        // تسجيل محاولة فاشلة
        rateLimiter.recordFailedAttempt(username);
        
        const attemptsLeft = rateLimitCheck.attemptsLeft! - 1;
        const message = attemptsLeft > 0 
          ? `كلمة المرور غير صحيحة. المحاولات المتبقية: ${attemptsLeft}`
          : 'كلمة المرور غير صحيحة';
        
        return { error: new Error(message) };
      }

      // تسجيل دخول ناجح - مسح المحاولات الفاشلة
      rateLimiter.clearAttempts(username);

      // تحديث كلمة المرور إلى bcrypt إذا كانت نصاً عادياً
      if (needsPasswordUpdate) {
        try {
          const { hashPassword } = await import('../utils/passwordUtils');
          const hashedPassword = await hashPassword(password);
          
          await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('id', user.id);
          
          console.log('تم تحديث كلمة المرور بنجاح إلى bcrypt');
        } catch (error) {
          console.error('فشل تحديث كلمة المرور:', error);
          // لا نوقف تسجيل الدخول - فقط نسجل الخطأ
        }
      }

      // Find assigned project for this user
      let assignedProjectId = null;
      if (user.role === 'Accounting' || user.role === 'Sales') {
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq('assigned_user_id', user.id)
          .limit(1);
        
        if (projects && projects.length > 0) {
          assignedProjectId = projects[0].id;
        }
      }

      // Remove password from user object before storing (SECURITY)
      const { password: _, ...userWithoutPassword } = user;
      
      // Add permissions based on role
      const userWithPermissions = {
        ...userWithoutPassword,
        assignedProjectId,
        permissions: user.role === 'Admin'
          ? { canView: true, canEdit: true, canDelete: true }
          : { canView: true, canEdit: false, canDelete: false }
      };

      setCurrentUser(userWithPermissions);
      // Store user data WITHOUT password in localStorage
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userWithPermissions));

      return { error: null };
    } catch (error) {
      console.error('Login exception:', error);
      return { error: error as Error };
    }
  };

  const logout = async () => {
    try {
      setCurrentUser(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const value = {
    currentUser,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};