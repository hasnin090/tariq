import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (username: string, password: string, name: string, role: 'Admin' | 'Sales' | 'Accounting') => Promise<{ error: Error | null }>;
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
      // Fetch user from database
      const { supabase } = await import('../src/lib/supabase');
      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, username, email, role, password')
        .eq('username', username)
        .single();

      if (error || !user) {
        console.error('Login error:', error);
        return { error: new Error('اسم المستخدم غير موجود') };
      }

      // Check if password field exists
      if (!user.password) {
        console.error('Password field missing for user:', username);
        return { error: new Error('خطأ في إعدادات المستخدم. الرجاء التواصل مع المدير.') };
      }

      // Note: In production, password should be hashed and verified securely on the server
      // For now, we're doing simple comparison (THIS IS NOT SECURE FOR PRODUCTION)
      if (user.password !== password) {
        return { error: new Error('كلمة المرور غير صحيحة') };
      }

      // Add permissions based on role
      const userWithPermissions = {
        ...user,
        permissions: user.role === 'Admin'
          ? { canView: true, canEdit: true, canDelete: true }
          : { canView: true, canEdit: false, canDelete: false }
      };

      setCurrentUser(userWithPermissions);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userWithPermissions));

      return { error: null };
    } catch (error) {
      console.error('Login exception:', error);
      return { error: error as Error };
    }
  };

  const signUp = async (username: string, password: string, name: string, role: 'Admin' | 'Sales' | 'Accounting') => {
    try {
      const { usersService } = await import('../src/services/supabaseService');

      // Create new user
      const newUser = await usersService.create({
        name,
        username,
        role,
        password,
        email: undefined
      });

      // Auto-login after signup
      setCurrentUser(newUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));

      return { error: null };
    } catch (error) {
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
    signUp,
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