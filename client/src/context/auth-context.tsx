import { createContext, useContext, useState, ReactNode } from "react";
import { ref, get, child } from "firebase/database";
import { database } from "@/lib/firebase"; // ✅ استخدم الاتصال الجاهزfirebase.ts فيه إعدادات الاتصال
import { useTranslation } from 'react-i18next';

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

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const dbRef = ref(database);

      const snapshot = await get(child(dbRef, `users/${username}`));
      if (snapshot.exists()) {
        const userData = snapshot.val();
        if (userData.password === password) {
          setUser({
            id: username,
            email: username,
            name: userData.name || username,
            role: userData.role || 'cashier',
            lastLogin: new Date()
          });
          return true;
        } else {
          console.warn("كلمة المرور غير صحيحة");
        }
      } else {
        console.warn("المستخدم غير موجود");
      }
      return false;
    } catch (error) {
      console.error("خطأ أثناء تسجيل الدخول:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
