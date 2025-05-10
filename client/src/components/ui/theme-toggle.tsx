import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ui/theme-provider";
import { useTranslation } from "react-i18next";

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    // أولاً قم بتطبيق الكلاس على العنصر الجذري للمستند
    const root = window.document.documentElement;
    if (theme === "light") {
      root.classList.remove("light");
      root.classList.add("dark");
      setTheme("dark");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      setTheme("light");
    }
    // قم بتحديث التخزين المحلي
    localStorage.setItem("theme", theme === "light" ? "dark" : "light");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start flex items-center text-sm"
      onClick={toggleTheme}
    >
      {theme === "light" ? (
        <>
          <Moon className="mr-2 h-4 w-4" />
          <span>{t('dark_mode')}</span>
        </>
      ) : (
        <>
          <Sun className="mr-2 h-4 w-4" />
          <span>{t('light_mode')}</span>
        </>
      )}
    </Button>
  );
}
