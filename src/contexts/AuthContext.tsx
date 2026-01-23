import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_URL = 'http://localhost:5000';  // agar backend port change kiya ho to yahan update kar dena

interface User {
  id: string;
  name: string;
  email: string;
  company?: string;
  role?: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, company: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setUser({
          id: decoded.id.toString(),
          name: decoded.name || decoded.email.split('@')[0],
          email: decoded.email,
          company: decoded.company,
          role: decoded.role,
        });
      } catch (err) {
        localStorage.removeItem('authToken');
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_URL}/api/login`, { email, password });
      const { token, user: userData } = response.data;
      if (token) {
        localStorage.setItem('authToken', token);
        setUser({
          id: userData.id.toString(),
          name: userData.name,
          email: userData.email,
          company: userData.company,
          role: userData.role,
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const signup = async (name: string, company: string, email: string, password: string): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_URL}/api/signup`, { name, company, email, password });
      const { token, user: userData } = response.data;
      if (token) {
        localStorage.setItem('authToken', token);
        setUser({
          id: userData.id.toString(),
          name: userData.name,
          email: userData.email,
          company: userData.company,
          role: userData.role || 'user',
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Signup error:', err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('authToken');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};