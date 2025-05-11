import React, { useState } from 'react';
import { Bell, User, Menu, Search, Calendar, Clock, ChevronDown, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsDropdown } from '@/components/notifications/notifications-dropdown';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
  username: string;
  isAdmin: boolean;
  userId: number;
}

export default function Header({ 
  title, 
  onMenuClick, 
  username,
  isAdmin,
  userId
}: HeaderProps) {
  const { t } = useTranslation();
  const { language } = useLocale();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Get current date and time
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // تحقق من اتجاه الواجهة للدعم المناسب للغة العربية
  const rtlEnabled = language === 'ar';
  const marginClass = rtlEnabled ? "ml-3" : "mr-3";

  return (
    <header className="bg-card z-20 border-b border-border">
      <div className="flex items-center justify-between p-3">
        {/* Left side with title and menu button */}
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            className="md:hidden bg-primary/10 hover:bg-primary/20 rounded-full text-foreground mr-3"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div>
            <h2 className="text-xl font-bold gradient-heading">{title}</h2>
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 mr-1" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
        
        {/* Mobile search toggle */}
        <div className="md:hidden">
          <Button 
            variant="ghost" 
            size="icon"
            className="bg-muted/40 text-muted-foreground hover:text-foreground rounded-full"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            {isSearchOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Center search bar - hidden on mobile unless expanded */}
        <div className={cn(
          "absolute left-0 right-0 top-full bg-card p-2 border-b border-border md:static md:border-0 md:p-0 md:w-1/3 transition-all duration-300 z-10",
          isSearchOpen ? "block" : "hidden md:block"
        )}>
          <div className="relative max-w-md mx-auto md:mx-0 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              className="w-full pl-9 py-2 bg-muted/40 border-0 focus-visible:ring-1"
              placeholder={t('search')}
            />
          </div>
        </div>
        
        {/* Right side with user info */}
        <div className="flex items-center gap-1.5">
          {/* Notification dropdown */}
          <NotificationsDropdown userId={userId} />
          
          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 bg-muted/40 hover:bg-muted rounded-full pl-2 pr-3">
                <Avatar className="h-7 w-7 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {getInitials(username)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium line-clamp-1">{username}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {isAdmin ? t('admin') : t('user')}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('profile')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className={`h-4 w-4 ${marginClass}`} />
                <span>{t('settings_account')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell className={`h-4 w-4 ${marginClass}`} />
                <span>{t('notifications')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <span>{t('logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
