import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
// FIX: Add Project to imports to find assigned project on login.
import { User, AuthContextType, Project } from '../types.ts';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthContextType['currentUser']>(() => {
    try {
      const storedUser = sessionStorage.getItem('currentUser');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("Failed to parse user from session storage:", error);
      return null;
    }
  });

  const login = async (username: string, password?: string): Promise<boolean> => {
    const users: User[] = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.name === username && u.password === password);
    
    if (user) {
      // FIX: Find the project assigned to the user and add its ID to the currentUser object.
      const projects: Project[] = JSON.parse(localStorage.getItem('projects') || '[]');
      const assignedProject = projects.find(p => p.assignedUserId === user.id);

      const userToStore = { 
        id: user.id, 
        name: user.name, 
        role: user.role,
        assignedProjectId: assignedProject?.id,
        permissions: user.permissions,
      };

      setCurrentUser(userToStore);
      sessionStorage.setItem('currentUser', JSON.stringify(userToStore));
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('currentUser');
  };

  const value = {
    currentUser,
    login,
    logout,
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