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
      adminOnly: false
    },
    {
      title: t('customers'),
      icon: <Users className="h-5 w-5" />,
      description: t('customer_management'),
      href: '/customers',
      adminOnly: false
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
      adminOnly: false
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
        <div className="bg-primary/10 dark:bg-primary/5 p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-primary text-primary-foreground p-2 rounded-md">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold gradient-heading mx-2">Sales Ghazy</h1>
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
        <div className="p-4 border-b border-border bg-muted/40">
          <div className="flex items-center mb-1">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <span className="font-bold">
                {isAdmin ? 'A' : 'U'}
              </span>
            </div>
            <div className={`${marginClass} flex-1 overflow-hidden`}>
              <p className="font-medium truncate">{isAdmin ? 'Admin' : 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">
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
                <Link key={item.href} href={item.href}>
                  <a 
                    className={cn(
                      "flex flex-col w-full p-3 rounded-md transition-all card-hover",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-md" 
                        : "hover:bg-muted"
                    )}
                    onClick={() => onClose()}
                  >
                    <div className="flex items-center">
                      <div className={cn(
                        "rounded-md p-2",
                        isActive 
                          ? "bg-primary-foreground/20" 
                          : "bg-primary/10"
                      )}>
                        {item.icon}
                      </div>
                      <div className={`${marginClass} flex-1`}>
                        <span className="font-medium block">{item.title}</span>
                        <span className="text-xs opacity-80 block">{item.description}</span>
                      </div>
                    </div>
                  </a>
                </Link>
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
            className="w-full justify-between mb-3 p-2 h-10"
            onClick={toggleLanguage}
          >
            <div className="flex items-center">
              <Globe className={`h-4 w-4 ${marginClass}`} />
              <span>{t('language')}</span>
            </div>
            <span className="text-xs bg-muted px-2 py-1 rounded-md">
              {language === 'en' ? 'العربية' : 'English'}
            </span>
          </Button>
          
          <Button 
            variant="destructive" 
            size="sm" 
            className="w-full justify-start p-2 h-10 btn-glow"
            onClick={handleLogout}
          >
            <LogOut className={`h-4 w-4 ${marginClass}`} />
            <span>{t('logout')}</span>
          </Button>
        </div>
      </div>
    </>
  );
}
