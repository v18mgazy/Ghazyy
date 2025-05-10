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

  // Simple direct authentication for testing
  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      console.log("Auth Context: محاولة تسجيل الدخول باستخدام:", { username, password });
      
      // التحقق من صحة بيانات تسجيل الدخول
      if (username === 'admin' && password === '503050') {
        console.log("Auth Context: البيانات صحيحة، إعداد المستخدم...");
        
        // تعيين بيانات المستخدم بعد نجاح تسجيل الدخول
        setUser({
          id: '1',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin'
        });
        
        console.log("Auth Context: تم تعيين المستخدم بنجاح، إرجاع true");
        return true;
      } else if (username === 'cashier' && password === '123456') {
        console.log("Auth Context: بيانات الكاشير صحيحة");
        
        setUser({
          id: '2',
          email: 'cashier@example.com',
          name: 'Cashier User',
          role: 'cashier'
        });
        
        return true;
      }
      
      console.log("Auth Context: البيانات غير صحيحة، إرجاع false");
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