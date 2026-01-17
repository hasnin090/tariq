import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, UserResourcePermission, UserMenuAccess, UserButtonAccess, UserProjectAssignment } from '../types';
import { supabase } from '../src/lib/supabase';
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

  // ✅ NEW: Function to load user data by user ID (for username-based login)
  const loadUserDataByUserId = async (userId: string): Promise<AuthUser | null> => {
    if (!userId || userId.trim() === '') {
      console.error('loadUserDataByUserId called with empty userId');
      return null;
    }
    
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, username, email, role')
        .eq('id', userId)
        .single();

      if (error || !user) {
        console.error('Error loading user data by ID:', error);
        return null;
      }

      // Find assigned project based on user role
      let assignedProjectId = null;
      if (user.role === 'Accounting' || user.role === 'Sales') {
        // البحث في الحقل المناسب حسب الدور
        const userIdField = user.role === 'Sales' ? 'sales_user_id' : 'accounting_user_id';
        
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq(userIdField, user.id)
          .limit(1);
        
        if (projects && projects.length > 0) {
          assignedProjectId = projects[0].id;
        }
        
        // إذا لم نجد، نبحث في assigned_user_id كخيار بديل
        if (!assignedProjectId) {
          const { data: fallbackProjects } = await supabase
            .from('projects')
            .select('id')
            .eq('assigned_user_id', user.id)
            .limit(1);
          
          if (fallbackProjects && fallbackProjects.length > 0) {
            assignedProjectId = fallbackProjects[0].id;
          }
        }
      }

      // ✅ Load custom permissions (button access, menu access, etc.)
      let customPermissions = null;
      let customMenuAccess = null;
      let customButtonAccess = null;
      let projectAssignments = null;
      
      try {
        const { userFullPermissionsService } = await import('../src/services/supabaseService');
        const fullPermissions = await userFullPermissionsService.getByUserId(user.id);
        customMenuAccess = fullPermissions.menuAccess;
        customButtonAccess = fullPermissions.buttonAccess;
        projectAssignments = fullPermissions.projectAssignments;
        customPermissions = fullPermissions.resourcePermissions;
        
        console.log('🔍 Loaded permissions for user (by userId):', user.username, {
          menuAccessCount: customMenuAccess?.length || 0,
          buttonAccessCount: customButtonAccess?.length || 0,
          buttonAccess: customButtonAccess,
          projectAssignmentsCount: projectAssignments?.length || 0,
          resourcePermissionsCount: customPermissions?.length || 0,
          role: user.role
        });
        
        if (projectAssignments && projectAssignments.length > 0 && !assignedProjectId) {
          assignedProjectId = projectAssignments[0].projectId;
        }
      } catch (error) {
        console.error('Error loading custom permissions:', error);
      }

      const finalCustomMenuAccess = customMenuAccess && customMenuAccess.length > 0 ? customMenuAccess : undefined;
      const finalCustomButtonAccess = customButtonAccess && customButtonAccess.length > 0 ? customButtonAccess : undefined;
      
      console.log('✅ Final user data (by userId) for:', user.username, {
        customMenuAccess: finalCustomMenuAccess,
        customButtonAccess: finalCustomButtonAccess,
        customButtonAccessLength: finalCustomButtonAccess?.length,
        role: user.role
      });
      
      return {
        ...user,
        assignedProjectId,
        permissions: user.role === 'Admin'
          ? { canView: true, canEdit: true, canDelete: true }
          : { canView: true, canEdit: false, canDelete: false },
        customPermissions: customPermissions || [],
        customMenuAccess: finalCustomMenuAccess,
        customButtonAccess: finalCustomButtonAccess,
        projectAssignments: projectAssignments || [],
      };
    } catch (error) {
      console.error('Error in loadUserDataByUserId:', error);
      return null;
    }
  };

  // Function to load user data from users table
  const loadUserData = async (authId: string): Promise<AuthUser | null> => {
    // التحقق من أن authId ليس فارغاً
    if (!authId || authId.trim() === '') {
      console.error('loadUserData called with empty authId');
      return null;
    }
    
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, username, email, role')
        .eq('auth_id', authId)
        .single();

      if (error || !user) {
        console.error('Error loading user data:', error);
        return null;
      }

      // Find assigned project based on user role
      let assignedProjectId = null;
      if (user.role === 'Accounting' || user.role === 'Sales') {
        // البحث في الحقل المناسب حسب الدور
        const userIdField = user.role === 'Sales' ? 'sales_user_id' : 'accounting_user_id';
        
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq(userIdField, user.id)
          .limit(1);
        
        if (projects && projects.length > 0) {
          assignedProjectId = projects[0].id;
        }
        
        // إذا لم نجد، نبحث في assigned_user_id كخيار بديل
        if (!assignedProjectId) {
          const { data: fallbackProjects } = await supabase
            .from('projects')
            .select('id')
            .eq('assigned_user_id', user.id)
            .limit(1);
          
          if (fallbackProjects && fallbackProjects.length > 0) {
            assignedProjectId = fallbackProjects[0].id;
          }
        }
      }

      // Load custom permissions
      let customPermissions = null;
      let customMenuAccess = null;
      let customButtonAccess = null;
      let projectAssignments = null;
      
      try {
        const { userFullPermissionsService } = await import('../src/services/supabaseService');
        const fullPermissions = await userFullPermissionsService.getByUserId(user.id);
        customMenuAccess = fullPermissions.menuAccess;
        customButtonAccess = fullPermissions.buttonAccess;
        projectAssignments = fullPermissions.projectAssignments;
        customPermissions = fullPermissions.resourcePermissions;
        
        // ✅ Detailed logging for debugging
        console.log('🔍 Loaded permissions for user:', user.username, {
          menuAccessCount: customMenuAccess?.length || 0,
          buttonAccessCount: customButtonAccess?.length || 0,
          buttonAccess: customButtonAccess, // ✅ Log full button access for debugging
          projectAssignmentsCount: projectAssignments?.length || 0,
          resourcePermissionsCount: customPermissions?.length || 0,
          role: user.role
        });
        
        if (projectAssignments && projectAssignments.length > 0 && !assignedProjectId) {
          assignedProjectId = projectAssignments[0].projectId;
        }
      } catch (error) {
        console.error('Error loading custom permissions:', error);
      }

      // ✅ CRITICAL FIX: Keep arrays even if empty - this signals "custom permissions exist but are empty"
      // which has different behavior than "no custom permissions at all"
      const finalCustomMenuAccess = customMenuAccess && customMenuAccess.length > 0 ? customMenuAccess : undefined;
      // ✅ For button access: if we loaded from DB (even empty), keep the array to signal custom permissions mode
      const finalCustomButtonAccess = customButtonAccess !== null ? (customButtonAccess.length > 0 ? customButtonAccess : undefined) : undefined;
      
      // ✅ Log final values with more details
      console.log('✅ Final user data for:', user.username, {
        customMenuAccess: finalCustomMenuAccess,
        customButtonAccess: finalCustomButtonAccess,
        customButtonAccessLength: finalCustomButtonAccess?.length,
        role: user.role
      });
      
      return {
        ...user,
        assignedProjectId,
        permissions: user.role === 'Admin'
          ? { canView: true, canEdit: true, canDelete: true }
          : { canView: true, canEdit: false, canDelete: false },
        customPermissions: customPermissions || [],
        customMenuAccess: finalCustomMenuAccess,
        customButtonAccess: finalCustomButtonAccess,
        projectAssignments: projectAssignments || [],
      };
    } catch (error) {
      console.error('Error in loadUserData:', error);
      return null;
    }
  };

  // Function to refresh permissions
  const refreshPermissions = async () => {
    if (!currentUser?.id) return;
    
    const permissions = await loadCustomPermissions(currentUser.id);
    if (permissions) {
      console.log('🔄 Refreshing permissions for:', currentUser.username, {
        menuAccessCount: permissions.menuAccess?.length || 0,
        buttonAccessCount: permissions.buttonAccess?.length || 0,
        projectAssignmentsCount: permissions.projectAssignments?.length || 0,
      });
      
      const updatedUser = {
        ...currentUser,
        customMenuAccess: permissions.menuAccess?.length > 0 ? permissions.menuAccess : undefined,
        customButtonAccess: permissions.buttonAccess?.length > 0 ? permissions.buttonAccess : undefined,
        projectAssignments: permissions.projectAssignments,
      };
      setCurrentUser(updatedUser);
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    // Check current session
    const initAuth = async () => {
      try {
        // أولاً: التحقق من جلسة Supabase Auth
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const userData = await loadUserData(session.user.id);
          if (userData) {
            setCurrentUser(userData);
            setLoading(false);
            return;
          }
        }

        // ثانياً: التحقق من الجلسة المحلية (للمستخدمين بدون Supabase Auth)
        const savedSession = localStorage.getItem('legacy_user_session');
        if (savedSession) {
          try {
            const { userId, timestamp } = JSON.parse(savedSession);
            // التحقق من صلاحية الجلسة (7 أيام)
            const sessionAge = Date.now() - timestamp;
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
            
            if (sessionAge < maxAge && userId) {
              // ✅ إعادة تحميل بيانات المستخدم مع الصلاحيات الكاملة
              console.log('🔄 Restoring legacy session for userId:', userId);
              
              const fullUserData = await loadUserDataByUserId(userId);
              
              if (fullUserData) {
                console.log('✅ Successfully restored user session with permissions:', {
                  username: fullUserData.username,
                  buttonAccessCount: fullUserData.customButtonAccess?.length || 0,
                  menuAccessCount: fullUserData.customMenuAccess?.length || 0,
                });
                setCurrentUser(fullUserData);
              } else {
                // إزالة الجلسة غير الصالحة
                console.warn('⚠️ Failed to restore user session, removing legacy session');
                localStorage.removeItem('legacy_user_session');
              }
            } else {
              // الجلسة منتهية الصلاحية
              localStorage.removeItem('legacy_user_session');
            }
          } catch (e) {
            localStorage.removeItem('legacy_user_session');
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth changes - معالجة محسنة
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        const userData = await loadUserData(session.user.id);
        if (userData) {
          setCurrentUser(userData);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        localStorage.removeItem('legacy_user_session');
      } else if (event === 'TOKEN_REFRESHED') {
        // ✅ الجلسة تم تجديدها بنجاح - لا حاجة لفعل شيء
        console.log('🔄 Token refreshed successfully');
      } else if (event === 'USER_UPDATED') {
        // ✅ تحديث بيانات المستخدم إذا تغيرت
        if (session?.user) {
          const userData = await loadUserData(session.user.id);
          if (userData) {
            setCurrentUser(userData);
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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

      // أولاً: جلب المستخدم من جدول users للحصول على email
      // البحث بـ username أو email (في حال أدخل المستخدم البريد الإلكتروني)
      const isEmail = username.includes('@');
      
      let userData = null;
      let userError = null;
      
      if (isEmail) {
        // البحث بالبريد الإلكتروني
        const result = await supabase
          .from('users')
          .select('id, email, auth_id')
          .eq('email', username)
          .maybeSingle();
        userData = result.data;
        userError = result.error;
      }
      
      // إذا لم يجد بالبريد أو لم يكن بريداً، ابحث باسم المستخدم
      if (!userData) {
        const result = await supabase
          .from('users')
          .select('id, email, auth_id')
          .eq('username', username)
          .maybeSingle();
        userData = result.data;
        userError = result.error;
      }

      if (userError || !userData) {
        rateLimiter.recordFailedAttempt(username);
        const attemptsLeft = rateLimitCheck.attemptsLeft! - 1;
        const message = attemptsLeft > 0 
          ? `اسم المستخدم غير موجود. المحاولات المتبقية: ${attemptsLeft}`
          : 'اسم المستخدم غير موجود';
        return { error: new Error(message) };
      }

      // التحقق من وجود auth_id (مستخدم مرتبط بـ Supabase Auth)
      if (!userData.auth_id) {
        // المستخدم لم يُرحّل بعد - استخدام المصادقة القديمة مؤقتاً
        return await legacyLogin(username, password, userData.id);
      }

      // تسجيل الدخول عبر Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: password
      });

      if (authError) {
        rateLimiter.recordFailedAttempt(username);
        const attemptsLeft = rateLimitCheck.attemptsLeft! - 1;
        
        let message = 'فشل تسجيل الدخول';
        if (authError.message.includes('Invalid login credentials')) {
          message = attemptsLeft > 0 
            ? `كلمة المرور غير صحيحة. المحاولات المتبقية: ${attemptsLeft}`
            : 'كلمة المرور غير صحيحة';
        }
        
        return { error: new Error(message) };
      }

      // تسجيل دخول ناجح
      rateLimiter.clearAttempts(username);

      // تحميل بيانات المستخدم
      const user = await loadUserData(authData.user.id);
      if (!user) {
        return { error: new Error('فشل تحميل بيانات المستخدم') };
      }

      return { error: null, user };
    } catch (error) {
      console.error('Login exception:', error);
      return { error: error as Error };
    }
  };

  // المصادقة القديمة للمستخدمين غير المُرحّلين
  const legacyLogin = async (username: string, password: string, userId: string) => {
    try {
      const { verifyPassword } = await import('../utils/passwordUtils');
      
      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, username, email, role, password')
        .eq('id', userId)
        .single();

      if (error || !user || !user.password) {
        return { error: new Error('خطأ في بيانات المستخدم') };
      }

      // التحقق من كلمة المرور
      const isBcryptHash = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
      let isPasswordValid = false;
      
      if (isBcryptHash) {
        isPasswordValid = await verifyPassword(password, user.password);
      } else {
        isPasswordValid = password === user.password;
      }

      if (!isPasswordValid) {
        return { error: new Error('كلمة المرور غير صحيحة') };
      }

      // ✅ تحميل المشروع المخصص للمستخدم حسب الدور
      let assignedProjectId = null;
      if (user.role === 'Accounting' || user.role === 'Sales') {
        // البحث في الحقل المناسب حسب الدور
        const userIdField = user.role === 'Sales' ? 'sales_user_id' : 'accounting_user_id';
        
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq(userIdField, user.id)
          .limit(1);
        
        if (projects && projects.length > 0) {
          assignedProjectId = projects[0].id;
        }
        
        // إذا لم نجد، نبحث في assigned_user_id كخيار بديل
        if (!assignedProjectId) {
          const { data: fallbackProjects } = await supabase
            .from('projects')
            .select('id')
            .eq('assigned_user_id', user.id)
            .limit(1);
          
          if (fallbackProjects && fallbackProjects.length > 0) {
            assignedProjectId = fallbackProjects[0].id;
          }
        }
      }

      // التحقق من وجود بريد إلكتروني صالح
      if (!user.email || user.email.trim() === '') {
        // ✅ المستخدم ليس لديه بريد إلكتروني - تحميل الصلاحيات بواسطة user.id مباشرة
        console.log('📧 User has no email, loading permissions directly by userId:', user.id);
        
        // ✅ جلب الصلاحيات الكاملة من قاعدة البيانات
        const fullUserData = await loadUserDataByUserId(user.id);
        
        if (fullUserData) {
          console.log('✅ Successfully loaded user with permissions (no email):', {
            username: fullUserData.username,
            buttonAccessCount: fullUserData.customButtonAccess?.length || 0,
            menuAccessCount: fullUserData.customMenuAccess?.length || 0,
          });
          
          // حفظ الجلسة المحلية
          localStorage.setItem('legacy_user_session', JSON.stringify({
            userId: user.id,
            timestamp: Date.now()
          }));
          
          return { error: null, user: fullUserData };
        }
        
        // ✅ Fallback: إذا فشل تحميل الصلاحيات، استخدم البيانات الأساسية
        console.warn('⚠️ Failed to load full permissions, using basic user data');
        const { password: _, ...userWithoutPassword } = user;
        const basicUser: AuthUser = {
          ...userWithoutPassword,
          assignedProjectId, // ✅ إضافة المشروع المخصص
          permissions: user.role === 'Admin'
            ? { canView: true, canEdit: true, canDelete: true }
            : { canView: true, canEdit: false, canDelete: false },
          customPermissions: [],
          customMenuAccess: undefined, // ✅ undefined لاستخدام صلاحيات الدور
          customButtonAccess: undefined, // ✅ undefined لاستخدام صلاحيات الدور
          projectAssignments: [],
        };
        // لا نستدعي setCurrentUser هنا - سيتم استدعاؤها من Login.tsx بعد الأنيميشن
        // حفظ الجلسة المحلية
        localStorage.setItem('legacy_user_session', JSON.stringify({
          userId: user.id,
          timestamp: Date.now()
        }));
        return { error: null, user: basicUser };
      }

      // إنشاء حساب Supabase Auth للمستخدم
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: user.email,
        password: password,
        options: {
          data: {
            name: user.name,
            username: user.username,
            role: user.role
          }
        }
      });

      let authUserId: string | null = null;

      if (signUpError) {
        // إذا كان الحساب موجود، حاول تسجيل الدخول
        if (signUpError.message.includes('already registered') || signUpError.status === 422) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: password
          });
          
          if (signInError) {
            console.error('Sign in error:', signInError);
            // متابعة بدون Supabase Auth - استخدام البيانات الأساسية
          } else if (signInData.user) {
            authUserId = signInData.user.id;
            // تحديث auth_id
            await supabase
              .from('users')
              .update({ auth_id: signInData.user.id })
              .eq('id', user.id);
          }
        } else {
          console.error('SignUp error:', signUpError);
        }
      } else if (authData.user) {
        authUserId = authData.user.id;
        // تحديث auth_id في جدول users
        await supabase
          .from('users')
          .update({ auth_id: authData.user.id })
          .eq('id', user.id);
      }

      // تحميل بيانات المستخدم فقط إذا كان لدينا authUserId صالح
      if (authUserId) {
        const fullUser = await loadUserData(authUserId);
        if (fullUser) {
          return { error: null, user: fullUser };
        }
      }
      
      // إذا فشل التحميل أو لا يوجد authUserId، استخدم البيانات الأساسية
      const { password: _, ...userWithoutPassword } = user;
      const basicUser: AuthUser = {
        ...userWithoutPassword,
        assignedProjectId, // ✅ إضافة المشروع المخصص
        permissions: user.role === 'Admin'
          ? { canView: true, canEdit: true, canDelete: true }
          : { canView: true, canEdit: false, canDelete: false },
        customPermissions: [],
        customMenuAccess: undefined, // ✅ undefined لاستخدام صلاحيات الدور
        customButtonAccess: undefined, // ✅ undefined لاستخدام صلاحيات الدور
        projectAssignments: [],
      };
      // لا نستدعي setCurrentUser هنا - سيتم استدعاؤها من Login.tsx بعد الأنيميشن
      // حفظ الجلسة المحلية إذا لم يكن هناك authUserId
      if (!authUserId) {
        localStorage.setItem('legacy_user_session', JSON.stringify({
          userId: user.id,
          timestamp: Date.now()
        }));
      }
      return { error: null, user: basicUser };
    } catch (error) {
      console.error('Legacy login error:', error);
      return { error: error as Error };
    }
  };

  const setUser = (user: AuthUser | null) => {
    setCurrentUser(user);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      // إزالة الجلسة المحلية أيضاً
      localStorage.removeItem('legacy_user_session');
      setCurrentUser(null);
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