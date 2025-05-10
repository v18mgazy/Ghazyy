import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'cashier';
}

export interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: false,
  login: async () => false,
  logout: async () => {}
});

export function useAuthContext() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Simple mock authentication for testing
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Accept any password for demo purposes
      if (email === 'admin@example.com') {
        setUser({
          id: '1',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin'
        });
        return true;
      } else if (email === 'cashier@example.com') {
        setUser({
          id: '2',
          email: 'cashier@example.com',
          name: 'Cashier User',
          role: 'cashier'
        });
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  const authValue: AuthContextType = {
    user,
    isAdmin,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}