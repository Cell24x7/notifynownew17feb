import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../config/axios';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL; // Using central config

interface User {
  id: string;
  name: string;
  email: string;
  company?: string;
  role?: 'user' | 'admin' | 'superadmin' | 'reseller';
  contact_phone?: string;
  profile_picture?: string;
  profile_image?: string;
  plan_id?: string;
  created_at?: string;
  channels_enabled?: string[];
  permissions?: any[];
  credits_available?: number;
  wallet_balance?: number;
  plan_name?: string;
  rcs_text_price?: number;
  rcs_rich_card_price?: number;
  rcs_carousel_price?: number;
  wa_marketing_price?: number;
  wa_utility_price?: number;
  wa_authentication_price?: number;
  rcs_config_id?: number;
  whatsapp_config_id?: number;
  actual_reseller_id?: number;
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
  authenticateWithToken: (token: string, userData: any) => void;
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
        let channels = decoded.channels_enabled || [];
        if (typeof channels === 'string') {
          try {
            channels = channels.startsWith('[') ? JSON.parse(channels) : channels.split(',').map((c: string) => c.trim());
          } catch (e) {
            channels = channels.split(',').map((c: string) => c.trim());
          }
        }

        setUser({
          id: decoded.id?.toString() || '',
          name: decoded.name || decoded.email?.split('@')[0] || 'User',
          email: decoded.email || '',
          company: decoded.company,
          role: decoded.role,
          channels_enabled: channels,
          permissions: decoded.permissions || [],
          credits_available: decoded.credits_available || 0,
          wallet_balance: decoded.wallet_balance || 0,
          rcs_text_price: decoded.rcs_text_price,
          rcs_rich_card_price: decoded.rcs_rich_card_price,
          rcs_carousel_price: decoded.rcs_carousel_price,
          wa_marketing_price: decoded.wa_marketing_price,
          wa_utility_price: decoded.wa_utility_price,
          wa_authentication_price: decoded.wa_authentication_price,
          rcs_config_id: decoded.rcs_config_id,
          whatsapp_config_id: decoded.whatsapp_config_id,
          actual_reseller_id: decoded.actual_reseller_id,
        });

        // CRITICAL: Hydrate from DB immediately because token might be stale or have broad defaults
        refreshUser(); 

      } catch (err) {
        console.error('Invalid token on load:', err);
        localStorage.removeItem('authToken');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await api.post(`/api/auth/login`, { identifier: email, password });

      const { success, token, user: userData } = response.data;

      if (success && token) {
        localStorage.setItem('authToken', token);

        // Ensure complex fields are parsed if they come as strings (though backend sends objects usually)
        const channels = typeof userData.channels_enabled === 'string'
          ? JSON.parse(userData.channels_enabled)
          : (userData.channels_enabled || []);

        const permissions = typeof userData.permissions === 'string'
          ? JSON.parse(userData.permissions)
          : (userData.permissions || []);

        setUser({
          id: userData.id?.toString() || '',
          name: userData.name || userData.email?.split('@')[0] || 'User',
          email: userData.email || '',
          company: userData.company,
          role: userData.role,
          channels_enabled: channels,
          permissions: permissions, // CRITICAL FIX: Set permissions immediately
          credits_available: userData.credits_available || 0,
          wallet_balance: userData.wallet_balance || 0,
          plan_name: userData.plan_name,
          rcs_text_price: userData.rcs_text_price,
          rcs_rich_card_price: userData.rcs_rich_card_price,
          rcs_carousel_price: userData.rcs_carousel_price,
          wa_marketing_price: userData.wa_marketing_price,
          wa_utility_price: userData.wa_utility_price,
          wa_authentication_price: userData.wa_authentication_price,
          rcs_config_id: userData.rcs_config_id,
          whatsapp_config_id: userData.whatsapp_config_id,
          actual_reseller_id: userData.actual_reseller_id,
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
      const response = await api.post(`/api/auth/signup`, {
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
          permissions: typeof userData.permissions === 'string' ? JSON.parse(userData.permissions) : (userData.permissions || []),
          credits_available: userData.credits_available || 0,
          wallet_balance: userData.wallet_balance || 0,
          rcs_text_price: userData.rcs_text_price,
          rcs_rich_card_price: userData.rcs_rich_card_price,
          rcs_carousel_price: userData.rcs_carousel_price,
          wa_marketing_price: userData.wa_marketing_price,
          wa_utility_price: userData.wa_utility_price,
          wa_authentication_price: userData.wa_authentication_price,
          rcs_config_id: userData.rcs_config_id,
          whatsapp_config_id: userData.whatsapp_config_id,
          actual_reseller_id: userData.actual_reseller_id,
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
    try {
      const response = await api.get(`/api/profile`);
      if (response.data.success) {
        const userData = response.data.user;
        setUser({
          ...userData,
          channels_enabled: typeof userData.channels_enabled === 'string'
            ? JSON.parse(userData.channels_enabled)
            : (userData.channels_enabled || []),
          permissions: typeof userData.permissions === 'string'
            ? JSON.parse(userData.permissions)
            : (userData.permissions || []),
          credits_available: userData.credits_available || 0,
          wallet_balance: userData.wallet_balance || 0,
          rcs_text_price: userData.rcs_text_price,
          rcs_rich_card_price: userData.rcs_rich_card_price,
          rcs_carousel_price: userData.rcs_carousel_price,
          wa_marketing_price: userData.wa_marketing_price,
          wa_utility_price: userData.wa_utility_price,
          wa_authentication_price: userData.wa_authentication_price,
          rcs_config_id: userData.rcs_config_id,
          whatsapp_config_id: userData.whatsapp_config_id,
          actual_reseller_id: userData.actual_reseller_id,
        });
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
  };

  const authenticateWithToken = (token: string, userData: any) => {
    localStorage.setItem('authToken', token);

    const channels = typeof userData.channels_enabled === 'string'
      ? JSON.parse(userData.channels_enabled)
      : (userData.channels_enabled || []);

    const permissions = typeof userData.permissions === 'string'
      ? JSON.parse(userData.permissions)
      : (userData.permissions || []);

    setUser({
      id: userData.id?.toString() || '',
      name: userData.name || userData.email?.split('@')[0] || 'User',
      email: userData.email || '',
      company: userData.company,
      role: userData.role,
      channels_enabled: channels,
      permissions: permissions,
      credits_available: userData.credits_available || 0,
      wallet_balance: userData.wallet_balance || 0,
      plan_name: userData.plan_name,
      rcs_text_price: userData.rcs_text_price,
      rcs_rich_card_price: userData.rcs_rich_card_price,
      rcs_carousel_price: userData.rcs_carousel_price,
      wa_marketing_price: userData.wa_marketing_price,
      wa_utility_price: userData.wa_utility_price,
      wa_authentication_price: userData.wa_authentication_price,
      rcs_config_id: userData.rcs_config_id,
      whatsapp_config_id: userData.whatsapp_config_id,
      actual_reseller_id: userData.actual_reseller_id,
    });
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
    authenticateWithToken,
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