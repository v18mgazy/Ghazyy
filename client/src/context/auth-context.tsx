import { createContext, useContext, useState, ReactNode } from "react";
import { ref, get } from "firebase/database";
import { database } from "@/lib/firebase";
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
      const dbRef = ref(database, 'users');
      const snapshot = await get(dbRef);

      if (snapshot.exists()) {
        const usersData = snapshot.val();

        const matchedKey = Object.keys(usersData).find((key) => {
          const u = usersData[key];
          return (
            u.username === username &&
            u.password === password &&
            u.status === 'active'
          );
        });

        if (matchedKey) {
          const matchedUser = usersData[matchedKey];
          setUser({
            id: matchedUser.id?.toString() || matchedKey,
            email: matchedUser.username,
            name: matchedUser.name || matchedUser.username,
            role: matchedUser.role || 'cashier',
            lastLogin: new Date()
          });
          return true;
        } else {
          console.warn("بيانات الدخول غير صحيحة أو الحساب غير نشط");
        }
      } else {
        console.warn("لم يتم العثور على مستخدمين");
      }

      return false;
    } catch (error) {
      console.error("خطأ أثناء محاولة تسجيل الدخول:", error);
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
