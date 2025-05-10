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
      variant="ghost"
      size="sm"
      className="text-sm"
      onClick={toggleTheme}
    >
      {isDarkMode() ? (
        <>
          <Sun className="mr-2 h-4 w-4" />
          <span>{t('light_mode')}</span>
        </>
      ) : (
        <>
          <Moon className="mr-2 h-4 w-4" />
          <span>{t('dark_mode')}</span>
        </>
      )}
    </Button>
  );
}
