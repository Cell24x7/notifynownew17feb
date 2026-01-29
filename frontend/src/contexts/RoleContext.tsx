import { createContext, useContext, ReactNode, useState } from 'react';

export type UserRole = 'admin' | 'manager' | 'agent';

export interface Permission {
  id: string;
  label: string;
}

export interface FeatureAccess {
  [key: string]: boolean;
}

interface RoleContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  userPermissions: string[];
  setUserPermissions: (permissions: string[]) => void;
  featureAccess: FeatureAccess;
  setFeatureAccess: (access: FeatureAccess) => void;
  hasPermission: (permissionId: string) => boolean;
  hasFeatureAccess: (featureId: string) => boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const rolePermissions: Record<UserRole, string[]> = {
  admin: [
    'view_chats',
    'reply_chats',
    'manage_campaigns',
    'edit_automations',
    'manage_integrations',
    'access_billing',
    'manage_settings',
    'manage_users',
    'manage_roles',
    'manage_features',
  ],
  manager: ['view_chats', 'reply_chats', 'manage_campaigns', 'edit_automations'],
  agent: ['view_chats', 'reply_chats'],
};

// Default feature access - only RCS visible initially
export const defaultFeatureAccess: FeatureAccess = {
  rcs: true,
  sms: false,
  whatsapp: false,
  instagram: false,
  facebook: false,
  email: false,
  voicebot: false,
  channels: true,
  users: false,
  roles: false,
  wallet: false,
  language: false,
  security: false,
  notifications: false,
  theme: false,
  files: false,
};

export function RoleProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole>('agent');
  const [userPermissions, setUserPermissions] = useState<string[]>(rolePermissions['agent']);
  const [featureAccess, setFeatureAccess] = useState<FeatureAccess>(defaultFeatureAccess);

  const hasPermission = (permissionId: string): boolean => {
    return userPermissions.includes(permissionId);
  };

  const hasFeatureAccess = (featureId: string): boolean => {
    return featureAccess[featureId] ?? false;
  };

  return (
    <RoleContext.Provider
      value={{
        userRole,
        setUserRole,
        userPermissions,
        setUserPermissions,
        featureAccess,
        setFeatureAccess,
        hasPermission,
        hasFeatureAccess,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
