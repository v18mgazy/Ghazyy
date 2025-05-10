import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ui/theme-provider";
import { useTranslation } from "react-i18next";

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start flex items-center text-sm"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
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
