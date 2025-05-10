import React from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { useAuthContext } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

import {
  ShoppingCart,
  Settings,
  BarChart2,
  Users,
  Moon,
  Sun,
  Globe,
  LogOut,
  X
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

  const navItems = [
    {
      title: t('sales'),
      icon: <ShoppingCart className="mr-2 h-5 w-5" />,
      href: '/',
      adminOnly: false
    },
    {
      title: t('management'),
      icon: <Settings className="mr-2 h-5 w-5" />,
      href: '/management',
      adminOnly: true
    },
    {
      title: t('reports'),
      icon: <BarChart2 className="mr-2 h-5 w-5" />,
      href: '/reports',
      adminOnly: false
    },
    {
      title: t('customers'),
      icon: <Users className="mr-2 h-5 w-5" />,
      href: '/customers',
      adminOnly: true
    }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <div 
        className={cn(
          "w-64 bg-white dark:bg-neutral-800 shadow-md transition-all duration-300 transform h-full fixed md:relative z-30",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          "flex flex-col"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <ShoppingCart className="text-primary h-5 w-5 mr-2" />
            <h1 className="text-xl font-bold">Sales Ghazy</h1>
          </div>
          <button 
            onClick={onClose} 
            className="md:hidden text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 flex-1">
          <ul className="space-y-2">
            {navItems.map((item) => {
              // Skip admin-only items for non-admin users
              if (item.adminOnly && !isAdmin) return null;
              
              const isActive = location === item.href || 
                (item.href !== '/' && location.startsWith(item.href));
              
              return (
                <li key={item.href}>
                  <Link href={item.href}>
                    <a 
                      className={cn(
                        "flex items-center w-full p-2 rounded-md transition-colors",
                        isActive 
                          ? "bg-primary text-white" 
                          : "hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      )}
                      onClick={() => onClose()}
                    >
                      {item.icon}
                      <span>{item.title}</span>
                    </a>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Footer */}
        <div className="border-t border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <ThemeToggle />
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start flex items-center text-sm text-neutral-600 dark:text-neutral-300 hover:text-primary dark:hover:text-primary"
              onClick={toggleLanguage}
            >
              <Globe className="mr-2 h-4 w-4" />
              <span>{language === 'en' ? 'العربية' : 'English'}</span>
            </Button>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start flex items-center text-sm text-destructive hover:bg-destructive hover:bg-opacity-10"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{t('logout')}</span>
          </Button>
        </div>
      </div>
    </>
  );
}
