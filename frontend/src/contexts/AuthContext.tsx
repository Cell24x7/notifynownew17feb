import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL; // Using central config

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
  channels_enabled?: string[]; // Add this
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, company: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
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
          channels_enabled: decoded.channels_enabled || [],
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
          channels_enabled: typeof userData.channels_enabled === 'string' ? JSON.parse(userData.channels_enabled) : (userData.channels_enabled || []),
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
          channels_enabled: typeof userData.channels_enabled === 'string' ? JSON.parse(userData.channels_enabled) : (userData.channels_enabled || []),
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

  const refreshUser = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        const userData = response.data.user;
        setUser({
          ...userData,
          channels_enabled: typeof userData.channels_enabled === 'string' 
            ? JSON.parse(userData.channels_enabled) 
            : (userData.channels_enabled || [])
        });
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
    updateUser,
    refreshUser,
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