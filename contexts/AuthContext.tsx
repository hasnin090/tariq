import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, UserResourcePermission, UserMenuAccess, UserButtonAccess, UserProjectAssignment } from '../types';
import { verifyPassword } from '../utils/passwordUtils';
import { rateLimiter } from '../utils/rateLimiter';

// Extended user type with custom permissions
export interface AuthUser extends Omit<User, 'password'> {
  assignedProjectId?: string;
  customPermissions?: UserResourcePermission[];
  customMenuAccess?: UserMenuAccess[];
  customButtonAccess?: UserButtonAccess[];
  projectAssignments?: UserProjectAssignment[];
}

interface AuthContextType {
  currentUser: AuthUser | null;
  login: (username: string, password: string) => Promise<{ error: Error | null; user?: AuthUser }>;
  logout: () => Promise<void>;
  loading: boolean;
  refreshPermissions: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple authentication service using localStorage
const AUTH_STORAGE_KEY = 'auth_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to load custom permissions for a user
  const loadCustomPermissions = async (userId: string) => {
    try {
      const { userFullPermissionsService } = await import('../src/services/supabaseService');
      const fullPermissions = await userFullPermissionsService.getByUserId(userId);
      return fullPermissions;
    } catch (error) {
      console.error('Error loading custom permissions:', error);
      return null;
    }
  };

  // Function to refresh permissions (can be called after admin updates them)
  const refreshPermissions = async () => {
    if (!currentUser?.id) return;
    
    const permissions = await loadCustomPermissions(currentUser.id);
    if (permissions) {
      const updatedUser = {
        ...currentUser,
        customPermissions: permissions.resourcePermissions,
        customMenuAccess: permissions.menuAccess,
        customButtonAccess: permissions.buttonAccess,
        projectAssignments: permissions.projectAssignments,
      };
      setCurrentUser(updatedUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    }
  };

  useEffect(() => {
    // Check if user is logged in from localStorage
    const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
        
        // Refresh permissions from database on app load
        if (parsedUser?.id) {
          loadCustomPermissions(parsedUser.id).then(permissions => {
            if (permissions) {
              const updatedUser = {
                ...parsedUser,
                customPermissions: permissions.resourcePermissions,
                customMenuAccess: permissions.menuAccess,
                customButtonAccess: permissions.buttonAccess,
                projectAssignments: permissions.projectAssignments,
              };
              setCurrentUser(updatedUser);
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
            }
          });
        }
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
      
      // Load custom permissions from database
      let customPermissions = null;
      let customMenuAccess = null;
      let customButtonAccess = null;
      let projectAssignments = null;
      
      try {
        const { userFullPermissionsService } = await import('../src/services/supabaseService');
        const fullPermissions = await userFullPermissionsService.getByUserId(user.id);
        customPermissions = fullPermissions.resourcePermissions;
        customMenuAccess = fullPermissions.menuAccess;
        customButtonAccess = fullPermissions.buttonAccess;
        projectAssignments = fullPermissions.projectAssignments;
        
        // إذا توجد تعيينات مشاريع مخصصة، استخدم أول مشروع
        if (projectAssignments && projectAssignments.length > 0 && !assignedProjectId) {
          assignedProjectId = projectAssignments[0].projectId;
        }
      } catch (error) {
        console.error('Error loading custom permissions:', error);
      }
      
      // Add permissions based on role + custom permissions
      const userWithPermissions: AuthUser = {
        ...userWithoutPassword,
        assignedProjectId,
        permissions: user.role === 'Admin'
          ? { canView: true, canEdit: true, canDelete: true }
          : { canView: true, canEdit: false, canDelete: false },
        customPermissions: customPermissions || [],
        customMenuAccess: customMenuAccess || [],
        customButtonAccess: customButtonAccess || [],
        projectAssignments: projectAssignments || [],
      };

      // Return user without setting state - let Login component handle timing
      return { error: null, user: userWithPermissions };
    } catch (error) {
      console.error('Login exception:', error);
      return { error: error as Error };
    }
  };

  const setUser = (user: AuthUser | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
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
    refreshPermissions,
    setUser,
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