import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getDirectionFromLanguage } from '@/lib/utils';

export function useLocale() {
  const { i18n } = useTranslation();
  const [direction, setDirection] = useState(getDirectionFromLanguage(i18n.language));

  useEffect(() => {
    // Update direction when language changes
    setDirection(getDirectionFromLanguage(i18n.language));
    
    // Update HTML attributes for RTL support
    document.documentElement.dir = getDirectionFromLanguage(i18n.language);
    document.documentElement.lang = i18n.language;
    
    // Store the language preference
    localStorage.setItem('language', i18n.language);
  }, [i18n.language]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  };

  return {
    language: i18n.language,
    direction,
    isRTL: direction === 'rtl',
    toggleLanguage
  };
}
