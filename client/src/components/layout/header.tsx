import { useState } from 'react';
import { Bell, Menu, Calendar, ChevronDown, LogOut, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { useLocale } from '@/hooks/use-locale';
import { useAuthContext } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsDropdown } from '@/components/notifications/notifications-dropdown';
import { useToast } from '@/hooks/use-toast';

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
  const { logout } = useAuthContext();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Password change dialog state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  // Handle password change
  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: t('error'),
        description: t('passwords_dont_match'),
        variant: "destructive"
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: t('error'),
        description: t('password_too_short'),
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Call the API to change the password
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          currentPassword,
          newPassword
        }),
      });
      
      if (response.ok) {
        toast({
          title: t('success'),
          description: t('password_changed'),
        });
        
        // Close dialog and reset form
        setPasswordDialogOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const errorData = await response.json();
        toast({
          title: t('error'),
          description: errorData.error || t('error_changing_password'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: t('error'),
        description: t('password_change_failed'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
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

  // Render the password change dialog
  const renderPasswordChangeDialog = () => {
    return (
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('change_password')}</DialogTitle>
            <DialogDescription>
              {t('change_password_description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="current-password">{t('current_password')}</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="new-password">{t('new_password')}</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="confirm-password">{t('confirm_password')}</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setPasswordDialogOpen(false)}
              className="mt-2 sm:mt-0"
            >
              {t('cancel')}
            </Button>
            <Button 
              onClick={handlePasswordChange} 
              disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword}
              className="mt-2 sm:mt-0"
            >
              {isSubmitting ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
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
          
          {/* Space div for layout balance */}
          <div className="md:w-1/3"></div>
          
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
                <DropdownMenuItem onClick={() => setPasswordDialogOpen(true)}>
                  <KeyRound className={`h-4 w-4 ${marginClass}`} />
                  <span>{t('settings_account')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bell className={`h-4 w-4 ${marginClass}`} />
                  <span>{t('notifications')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                  <LogOut className={`h-4 w-4 ${marginClass}`} />
                  <span>{t('logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      {/* Render the password change dialog */}
      {renderPasswordChangeDialog()}
    </>
  );
}
