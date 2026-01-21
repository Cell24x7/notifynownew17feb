// import React, { createContext, useContext, useState, useCallback } from 'react';

// interface User {
//   id: string;
//   name: string;
//   email: string;
//   company?: string;
// }

// interface AuthContextType {
//   user: User | null;
//   isAuthenticated: boolean;
//   login: (email: string, password: string) => Promise<boolean>;
//   logout: () => void;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// // 🔴 Apna backend URL yahan set karo
// const API_URL = 'http://localhost:5000/api';

// export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

//   const [user, setUser] = useState<User | null>(() => {
//     const savedUser = localStorage.getItem('cell24x7_user');
//     return savedUser ? JSON.parse(savedUser) : null;
//   });

//   // ✅ ONLY LOGIN (DATABASE MATCH)
//   const login = useCallback(async (email: string, password: string): Promise<boolean> => {
//     try {
//       const response = await fetch(`${API_URL}/login`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ email, password }),
//       });

//       const data = await response.json();

//       // ❌ Agar email/password match nahi hua
//       if (!response.ok) {
//         return false;
//       }

//       // ✅ Agar match ho gaya
//       const loggedInUser: User = {
//         id: data.user.id,
//         name: data.user.name,
//         email: data.user.email,
//         company: data.user.company,
//       };

//       setUser(loggedInUser);
//       localStorage.setItem('cell24x7_user', JSON.stringify(loggedInUser));
//       localStorage.setItem('cell24x7_token', data.token);

//       return true;
//     } catch (error) {
//       console.error('Login error:', error);
//       return false;
//     }
//   }, []);

//   // ✅ LOGOUT
//   const logout = useCallback(() => {
//     setUser(null);
//     localStorage.removeItem('cell24x7_user');
//     localStorage.removeItem('cell24x7_token');
//   }, []);

//   return (
//     <AuthContext.Provider
//       value={{
//         user,
//         isAuthenticated: !!user,
//         login,
//         logout,
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };




import React, { createContext, useContext, useState, useCallback } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  company?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 🔐 DEMO CREDENTIALS
const DEMO_EMAIL = 'demo@cell24x7.com';
const DEMO_PASSWORD = '123456';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('cell24x7_user');
    return saved ? JSON.parse(saved) : null;
  });

  // ✅ DEMO LOGIN (NO API)
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    // fake delay (API jaisa feel)
    await new Promise((res) => setTimeout(res, 1000));

    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      const demoUser: User = {
        id: 'demo-1',
        name: 'Demo User',
        email: DEMO_EMAIL,
        company: 'Cell24x7',
      };

      setUser(demoUser);
      localStorage.setItem('cell24x7_user', JSON.stringify(demoUser));
      localStorage.setItem('cell24x7_token', 'demo-token');

      return true;
    }

    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('cell24x7_user');
    localStorage.removeItem('cell24x7_token');
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
