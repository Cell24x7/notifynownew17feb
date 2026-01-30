import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_URL = 'http://localhost:5000';  // change only if your backend port is different

interface User {
  id: string;
  name: string;
  email: string;
  company?: string;
  role?: 'user' | 'admin' | 'superadmin';
  contact_phone?: string;
  profile_picture?: string;
  plan_id?: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, company: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setUser({
          id: decoded.id?.toString() || '',
          name: decoded.name || decoded.email?.split('@')[0] || 'User',
          email: decoded.email || '',
          company: decoded.company,
          role: decoded.role,
        });
      } catch (err) {
        console.error('Invalid token on load:', err);
        localStorage.removeItem('authToken');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, { identifier: email, password });

      const { success, token, user: userData } = response.data;

      if (success && token) {
        localStorage.setItem('authToken', token);
        setUser({
          id: userData.id?.toString() || '',
          name: userData.name || userData.email?.split('@')[0] || 'User',
          email: userData.email || '',
          company: userData.company,
          role: userData.role,
        });
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Login failed:', err.response?.data || err.message);
      return false;
    }
  };

  const signup = async (
    name: string,
    company: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/signup`, {
        name,
        company,
        email,
        password,
      });

      const { success, token, user: userData } = response.data;

      if (success && token) {
        localStorage.setItem('authToken', token);
        setUser({
          id: userData.id?.toString() || '',
          name: userData.name || userData.email?.split('@')[0] || 'User',
          email: userData.email || '',
          company: userData.company,
          role: userData.role || 'user',
        });
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Signup failed:', err.response?.data || err.message);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('authToken');
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...userData } as User : null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};