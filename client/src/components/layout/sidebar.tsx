import React from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { useAuthContext } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, 
  Settings, 
  BarChart2, 
  Users, 
  Globe, 
  LogOut, 
  X,
  PackageSearch,
  Truck,
  FileText,
  DollarSign,
  PieChart,
  UserCog,
  Store,
  Tag,
  Moon,
  Sun
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

export default function Sidebar({ isOpen, onClose, isAdmin }: SidebarProps) {
  const { t } = useTranslation();
  const [location, navigate] = useLocation();
  const { toggleLanguage, language } = useLocale();
  const { logout } = useAuthContext();

  // القائمة الجانبية المحسنة مع أيقونات أكثر ووصف مختصر
  const navItems = [
    {
      title: t('sales'),
      icon: <ShoppingCart className="h-5 w-5" />,
      description: t('create_invoice'),
      href: '/',
      adminOnly: false
    },
    {
      title: t('invoices'),
      icon: <FileText className="h-5 w-5" />,
      description: t('invoice_management'),
      href: '/invoices',
      adminOnly: false // تعديل: إظهارها للكاشير أيضاً
    },
    {
      title: t('customers'),
      icon: <Users className="h-5 w-5" />,
      description: t('customer_management'),
      href: '/customers',
      adminOnly: true // تعديل: إخفاؤها عن الكاشير
    },
    {
      title: t('management'),
      icon: <Settings className="h-5 w-5" />,
      description: t('system_settings'),
      href: '/management',
      adminOnly: true
    },
    {
      title: t('reports'),
      icon: <BarChart2 className="h-5 w-5" />,
      description: t('view_reports'),
      href: '/reports',
      adminOnly: true // تعديل: إخفاؤها عن الكاشير
    }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // تحقق من اتجاه الواجهة للدعم المناسب للغة العربية
  const rtlEnabled = language === 'ar';
  const marginClass = rtlEnabled ? "ml-2" : "mr-2";
  const transformDirection = rtlEnabled ? "translate-x-full" : "-translate-x-full";

  return (
    <>
      {/* Mobile backdrop with تأثير تلاشي */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar with تحسينات بصرية */}
      <div 
        className={cn(
          "w-72 bg-card shadow-xl transition-all duration-300 transform h-full fixed md:relative z-30",
          isOpen ? "translate-x-0" : `${transformDirection} md:translate-x-0`,
          "flex flex-col"
        )}
        dir={rtlEnabled ? "rtl" : "ltr"}
      >
        {/* Header with تصميم محسن */}
        <div className="bg-gradient-to-r from-primary/20 to-secondary/20 dark:from-primary/10 dark:to-secondary/10 p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-gradient-to-br from-primary to-secondary text-primary-foreground p-2 rounded-md shadow-md">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mx-2">Sales Ghazy</h1>
            </div>
            <button 
              onClick={onClose} 
              className="md:hidden bg-primary/10 hover:bg-primary/20 rounded-full p-1 text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* User info section جديد */}
        <div className="p-4 border-b border-border bg-gradient-to-r from-muted/40 to-muted/10">
          <div className="flex items-center mb-1">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/80 to-secondary/80 flex items-center justify-center text-white shadow-md">
              <span className="font-bold text-lg">
                {isAdmin ? 'A' : 'U'}
              </span>
            </div>
            <div className={`${marginClass} flex-1 overflow-hidden`}>
              <p className="font-medium text-base truncate">{isAdmin ? 'Admin' : 'User'}</p>
              <p className="text-xs text-muted-foreground truncate bg-muted/40 py-0.5 px-2 rounded-full inline-block mt-1">
                {isAdmin ? t('admin') : t('user')}
              </p>
            </div>
          </div>
        </div>
        
        {/* Navigation with تصميم محسن وحركة */}
        <nav className="p-4 flex-1 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              // Skip admin-only items for non-admin users
              if (item.adminOnly && !isAdmin) return null;
              
              const isActive = location === item.href || 
                (item.href !== '/' && location.startsWith(item.href));
              
              return (
                <div 
                  key={item.href}
                  className={cn(
                    "flex flex-col w-full p-3 rounded-lg transition-all card-hover cursor-pointer", 
                    isActive 
                      ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-md" 
                      : "hover:bg-muted hover:shadow-sm"
                  )}
                  onClick={() => {
                    navigate(item.href);
                    onClose();
                  }}
                >
                  <div className="flex items-center">
                    <div className={cn(
                      "rounded-full p-2 shadow-sm",
                      isActive 
                        ? "bg-white text-primary" 
                        : "bg-gradient-to-br from-primary/10 to-secondary/10" 
                    )}>
                      {item.icon}
                    </div>
                    <div className={`${marginClass} flex-1`}>
                      <span className="font-medium block">{item.title}</span>
                      <span className="text-xs opacity-80 block">{item.description}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </nav>
        
        {/* Footer with تصميم محسن */}
        <div className="border-t border-border p-4 bg-card">
          <div className="mb-4 flex items-center justify-between bg-muted/30 rounded-md p-2">
            <span className="text-sm font-medium">{t('theme')}</span>
            <ThemeToggle />
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-between mb-3 p-2 h-10 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 border-blue-200 dark:border-blue-800 hover:bg-blue-100/20"
            onClick={toggleLanguage}
          >
            <div className="flex items-center">
              <Globe className={`h-4 w-4 ${marginClass} text-blue-500`} />
              <span className="font-medium">{t('language')}</span>
            </div>
            <span className="text-xs bg-gradient-to-r from-blue-500/10 to-indigo-500/10 px-2 py-1 rounded-full border border-blue-200 dark:border-blue-800 font-medium text-blue-700 dark:text-blue-300">
              {language === 'en' ? 'العربية' : 'English'}
            </span>
          </Button>
          
          <Button 
            variant="destructive" 
            size="sm" 
            className="w-full justify-start p-2 h-10 bg-gradient-to-r from-red-500 to-pink-500 shadow-md hover:shadow-lg transition-all"
            onClick={handleLogout}
          >
            <LogOut className={`h-4 w-4 ${marginClass}`} />
            <span className="font-medium">{t('logout')}</span>
          </Button>
        </div>
      </div>
    </>
  );
}
