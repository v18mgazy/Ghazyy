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
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Simple direct authentication for testing
  const login = async (username: string, password: string) => {
    setLoading(true);
    console.log("تسجيل الدخول باستخدام:", username, password);
    
    try {
      // التحقق من بيانات تسجيل الدخول
      if (username === 'admin' && password === '503050') {
        console.log("بيانات المستخدم صحيحة - تسجيل دخول ادمن");
        
        setUser({
          id: '1',
          email: 'admin@example.com',
          name: 'مدير النظام',
          role: 'admin'
        });
        
        return true;
      } 
      else if (username === 'cashier' && password === '123456') {
        console.log("بيانات المستخدم صحيحة - تسجيل دخول كاشير");
        
        setUser({
          id: '2',
          email: 'cashier@example.com',
          name: 'كاشير',
          role: 'cashier'
        });
        
        return true;
      }
      
      console.log("بيانات المستخدم غير صحيحة");
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