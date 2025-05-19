import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { useAuthContext } from '@/context/auth-context';
import { useLocale } from '@/hooks/use-locale';
import { ShoppingCart, BarChart, Package, Users, CreditCard, ArrowRight, Loader2, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuthContext();
  const [, navigate] = useLocation();
  const { toggleLanguage, language } = useLocale();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);

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
    } catch (err) {
      setError(t('login_error'));
    } finally {
      setIsLoading(false);
    }
  };

  // تأثيرات حركية
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-6xl bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* الجانب الأيسر - الرسوم التوضيحية */}
        <div className="hidden lg:flex bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-800 dark:to-blue-900 p-12 flex-col justify-between relative overflow-hidden">
          {/* شعار النظام */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center text-white"
          >
            <ShoppingCart className="h-8 w-8 mr-2" />
            <span className="text-2xl font-bold">Sales Ghazy</span>
          </motion.div>

          {/* محتوى الجانب الأيسر */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8 relative z-10"
          >
            <motion.h2 
              variants={itemVariants}
              className="text-4xl font-bold text-white"
            >
              {t('welcome_back')}
            </motion.h2>

            <motion.p 
              variants={itemVariants}
              className="text-blue-100 text-lg"
            >
              {t('login_description')}
            </motion.p>

            <motion.div 
              variants={itemVariants}
              className="grid grid-cols-2 gap-4"
            >
              <div className="flex items-center space-x-3 bg-blue-500/20 p-3 rounded-lg">
                <BarChart className="h-6 w-6 text-white" />
                <span className="text-white text-sm">تقارير المبيعات</span>
              </div>
              <div className="flex items-center space-x-3 bg-blue-500/20 p-3 rounded-lg">
                <Package className="h-6 w-6 text-white" />
                <span className="text-white text-sm">إدارة المخزون</span>
              </div>
              <div className="flex items-center space-x-3 bg-blue-500/20 p-3 rounded-lg">
                <Users className="h-6 w-6 text-white" />
                <span className="text-white text-sm">إدارة العملاء</span>
              </div>
              <div className="flex items-center space-x-3 bg-blue-500/20 p-3 rounded-lg">
                <CreditCard className="h-6 w-6 text-white" />
                <span className="text-white text-sm">الفواتير</span>
              </div>
            </motion.div>
          </motion.div>

          {/* موجات تصميمية */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 320" className="w-full">
              <path 
                fill="rgba(255,255,255,0.1)" 
                d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              ></path>
            </svg>
          </div>
        </div>

        {/* الجانب الأيمن - نموذج تسجيل الدخول */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <span className="text-xl font-semibold text-gray-800 dark:text-white">Sales Ghazy</span>
            </div>

            <div className="flex space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleLanguage}
                className="text-gray-600 dark:text-gray-300"
              >
                {language === 'en' ? 'العربية' : 'English'}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setDarkMode(!darkMode)}
                className="text-gray-600 dark:text-gray-300"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              {t('login_to_account')}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              {t('enter_credentials')}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-700 dark:text-gray-300">
                  {t('username')}
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="py-6 px-4 border-gray-300 dark:border-gray-600 focus-visible:ring-blue-500"
                  placeholder={t('username_placeholder')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                  {t('password')}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="py-6 px-4 border-gray-300 dark:border-gray-600 focus-visible:ring-blue-500"
                  placeholder={t('password_placeholder')}
                  required
                />
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-md text-sm"
                >
                  {error}
                </motion.div>
              )}

              <Button 
                type="submit" 
                className="w-full py-6 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 transition-colors duration-300"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t('logging_in')}
                  </>
                ) : (
                  <>
                    {t('login')} <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </motion.div>

          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('dont_have_account')}{' '}
            <button 
              className="text-blue-600 dark:text-blue-400 hover:underline"
              onClick={() => navigate('/register')}
            >
              {t('contact_admin')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}