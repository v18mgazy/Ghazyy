import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { useAuthContext } from '@/context/auth-context';
import { useLocation } from 'wouter';
import { ShoppingCart, Loader2, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const { t } = useTranslation();
  const { language, toggleLanguage } = useLocale();
  const { login } = useAuthContext();
  const [, navigate] = useLocation();

  const [darkMode, setDarkMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const success = await login(username, password);
      if (success) navigate('/');
      else setError(t('login_error'));
    } catch {
      setError(t('login_error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-gray-900 dark:to-gray-800 px-4 transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 space-y-6"
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span className="text-xl font-semibold text-gray-800 dark:text-white">
              Sales Ghazy
            </span>
          </div>
          <div className="flex space-x-2 rtl:space-x-reverse">
            <Button variant="ghost" size="sm" onClick={toggleLanguage}>
              {language === 'en' ? 'العربية' : 'English'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 text-right">
            {t('login')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-right">
            {t('enter_credentials')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 text-right">
            <div>
              <Label htmlFor="username" className="text-gray-700 dark:text-gray-300">
                {t('username')}
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('username_placeholder')}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                {t('password')}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('password_placeholder')}
                required
                className="mt-1"
              />
            </div>

            <div className="flex items-center rtl:flex-row-reverse space-x-2 rtl:space-x-reverse">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 text-blue-600"
              />
              <Label htmlFor="remember" className="text-sm text-gray-600 dark:text-gray-300">
                {t('remember_me')}
              </Label>
            </div>

            {error && (
              <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full py-5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 transition duration-300 text-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              ) : (
                t('login')
              )}
            </Button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
