import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { useAuthContext } from '@/context/auth-context';
import { useLocale } from '@/hooks/use-locale';
import Sidebar from './sidebar';
import Header from './header';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuthContext();
  const { direction } = useLocale();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Get current section name based on location
  const getCurrentSection = () => {
    if (location === '/') return t('sales');
    if (location.startsWith('/management')) return t('management');
    if (location.startsWith('/reports')) return t('reports');
    if (location.startsWith('/customers')) return t('customers');
    return '';
  };

  if (!user) {
    return null; // User is not authenticated, don't render the layout
  }

  return (
    <div className="flex h-screen overflow-hidden" dir={direction}>
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isAdmin={isAdmin}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={getCurrentSection()} 
          onMenuClick={() => setSidebarOpen(true)}
          username={user.name}
          isAdmin={isAdmin}
          userId={parseInt(user.id)}
        />

        {/* Main content container */}
        <main className="flex-1 overflow-y-auto p-4 bg-neutral-100 dark:bg-neutral-900">
          {children}
        </main>
      </div>

      {/* لا حاجة لمكون الإشعارات القديم حيث تم استبداله بمكون dropdown في الهيدر */}
    </div>
  );
}
