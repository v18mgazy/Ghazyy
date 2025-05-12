import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ui/theme-provider";
import { useTranslation } from "react-i18next";

export function ThemeToggle() {
  const { t } = useTranslation();
  
  // تطبيق آلية مباشرة لتبديل السمة بدلاً من استخدام useTheme
  const toggleTheme = () => {
    const root = window.document.documentElement;
    const isDark = root.classList.contains("dark");
    
    // القيام بالتبديل
    if (isDark) {
      root.classList.remove("dark");
      root.classList.add("light");
      localStorage.setItem("theme", "light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  // التحقق من الحالة الحالية
  const isDarkMode = () => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={`text-sm rounded-full p-2 ${
        isDarkMode() 
          ? "bg-indigo-950/30 border-indigo-800 hover:bg-indigo-900/50" 
          : "bg-amber-50 border-amber-200 hover:bg-amber-100/80"
      }`}
      onClick={toggleTheme}
    >
      {isDarkMode() ? (
        <>
          <Sun className="mr-2 h-5 w-5 text-amber-300" />
          <span className="font-medium text-indigo-100">{t('light_mode')}</span>
        </>
      ) : (
        <>
          <Moon className="mr-2 h-5 w-5 text-indigo-500" />
          <span className="font-medium text-amber-700">{t('dark_mode')}</span>
        </>
      )}
    </Button>
  );
}
