import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../src/lib/supabase';
import { usersService } from '../src/services/supabaseService';

interface AppUser extends User {
  name: string;
  role: 'Admin' | 'Sales' | 'Accounting';
  assignedProjectId?: string;
}

interface AuthContextType {
  currentUser: AppUser | null;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, role: 'Admin' | 'Sales' | 'Accounting') => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async (sessionUser: User) => {
      try {
        const appUser = await usersService.getById(sessionUser.id);
        setCurrentUser({ ...sessionUser, ...appUser });
      } catch (error) {
        console.error("Failed to fetch user profile", error);
        // Fallback with default values if user profile doesn't exist in database
        setCurrentUser({ 
          ...sessionUser, 
          name: sessionUser.email?.split('@')[0] || 'User',
          role: 'Admin', // Default role
        } as AppUser);
      } finally {
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUser(session.user);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUser(session.user);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, name: string, role: 'Admin' | 'Sales' | 'Accounting') => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      
      if (error) return { error };
      
      if (data.user) {
        // Create user profile in users table
        const userProfile = {
          name,
          email,
          role,
          password: '',
        };
        await usersService.create({ ...userProfile, id: data.user.id } as any);
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
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