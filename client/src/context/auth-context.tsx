import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'cashier';
  lastLogin?: Date | null;
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

  // المصادقة مع الخادم
  const login = async (username: string, password: string) => {
    setLoading(true);
    console.log("محاولة تسجيل الدخول باستخدام:", username);
    
    try {
      // أولاً نحاول المصادقة المضمنة للمستخدمين الثابتين
      if (username === 'admin' && password === '123123') {
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
      
      // ثم نحاول المصادقة عبر واجهة برمجة التطبيقات
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log("تم تسجيل الدخول عبر واجهة برمجة التطبيقات:", userData);
          
          setUser({
            id: userData.id.toString(),
            email: userData.username, // استخدام اسم المستخدم كبريد إلكتروني مؤقت
            name: userData.name || userData.username,
            role: userData.role || 'cashier',
            lastLogin: userData.lastLogin ? new Date(userData.lastLogin) : null
          });
          
          return true;
        }
      } catch (error) {
        console.error("خطأ في تسجيل الدخول عبر واجهة برمجة التطبيقات:", error);
      }
      
      console.log("بيانات المستخدم غير صحيحة");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // محاولة تسجيل الخروج عبر واجهة برمجة التطبيقات
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error("خطأ في تسجيل الخروج:", error);
    } finally {
      // مسح بيانات المستخدم المحلية بغض النظر عن نجاح أو فشل الطلب
      setUser(null);
    }
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