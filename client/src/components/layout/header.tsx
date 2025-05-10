import React from 'react';
import { Bell, User, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
  onNotificationsClick: () => void;
  username: string;
  isAdmin: boolean;
}

export default function Header({ 
  title, 
  onMenuClick, 
  onNotificationsClick, 
  username,
  isAdmin
}: HeaderProps) {
  const { t } = useTranslation();
  
  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="bg-white dark:bg-neutral-800 shadow-sm z-20">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            className="md:hidden text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-white mr-4"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-medium">{title}</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-neutral-500 dark:text-neutral-400 hidden md:inline">
            {t('welcome')}, {username} {isAdmin && `(${t('admin')})`}
          </span>
          
          <Button 
            variant="ghost" 
            size="icon"
            className="relative p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-white"
            onClick={onNotificationsClick}
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </Button>
          
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-neutral-200 dark:bg-neutral-700 text-sm">
              {getInitials(username)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
