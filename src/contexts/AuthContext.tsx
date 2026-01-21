import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from 'react';

/* =======================
   TYPES
======================= */

export type Role = 'admin' | 'user' | 'reseller';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  company?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

/* =======================
   CONTEXT
======================= */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* =======================
   DEMO USERS (FRONTEND ONLY)
======================= */

const DEMO_USERS: {
  email: string;
  password: string;
  role: Role;
}[] = [
  { email: 'admin@cell24x7.com', password: '123456', role: 'admin' },
  { email: 'user@cell24x7.com', password: '123456', role: 'user' },
  { email: 'reseller@cell24x7.com', password: '123456', role: 'reseller' },
];

/* =======================
   PROVIDER
======================= */

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('cell24x7_user');
      return saved ? (JSON.parse(saved) as User) : null;
    } catch {
      return null;
    }
  });

  /* ---------- LOGIN (DEMO) ---------- */
  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      // Fake API delay
      await new Promise((res) => setTimeout(res, 800));

      const foundUser = DEMO_USERS.find(
        (u) => u.email === email && u.password === password
      );

      if (!foundUser) return false;

      const loggedInUser: User = {
        id: `demo-${foundUser.role}`,
        name: foundUser.role.toUpperCase(),
        email: foundUser.email,
        role: foundUser.role,
        company: 'Cell24x7',
      };

      setUser(loggedInUser);
      localStorage.setItem(
        'cell24x7_user',
        JSON.stringify(loggedInUser)
      );
      localStorage.setItem('cell24x7_token', 'demo-token');

      return true;
    },
    []
  );

  /* ---------- LOGOUT ---------- */
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('cell24x7_user');
    localStorage.removeItem('cell24x7_token');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/* =======================
   HOOK
======================= */

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
