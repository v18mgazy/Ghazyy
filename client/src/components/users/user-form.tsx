import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Loader2 } from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';

interface User {
  id?: string;
  username: string;
  password?: string;
  name: string;
  role: string;
  status: string;
}

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
  user?: User;
  isLoading?: boolean;
}

export default function UserForm({ 
  open, 
  onClose, 
  onSave, 
  user, 
  isLoading = false 
}: UserFormProps) {
  const { t } = useTranslation();
  const isEditing = !!user?.id;
  
  const [formData, setFormData] = useState<User>({
    username: '',
    password: '',
    name: '',
    role: 'cashier',
    status: 'active'
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (user) {
      // When editing, don't populate the password field
      setFormData({
        ...user,
        password: ''
      });
      setConfirmPassword('');
    } else {
      setFormData({
        username: '',
        password: '',
        name: '',
        role: 'cashier',
        status: 'active'
      });
      setConfirmPassword('');
    }
    setPasswordError('');
  }, [user, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData({
      ...formData,
      [id]: value
    });

    // Clear password error when user types in password field
    if (id === 'password' || id === 'confirmPassword') {
      setPasswordError('');
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    setPasswordError('');
  };

  const handleRoleChange = (value: string) => {
    setFormData({
      ...formData,
      role: value
    });
  };

  const handleStatusChange = (value: string) => {
    setFormData({
      ...formData,
      status: value
    });
  };

  const validateForm = () => {
    // Username validation
    if (!formData.username || formData.username.length < 3) {
      return t('username_length_error');
    }

    // Name validation
    if (!formData.name || formData.name.length < 2) {
      return t('name_length_error');
    }

    // Password validation for new users
    if (!isEditing && (!formData.password || formData.password.length < 6)) {
      return t('password_length_error');
    }

    // Password validation when provided (optional for edits)
    if (formData.password && formData.password.length < 6) {
      return t('password_length_error');
    }

    // Password confirmation
    if (formData.password && formData.password !== confirmPassword) {
      return t('password_match_error');
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const error = validateForm();
    if (error) {
      setPasswordError(error);
      return;
    }

    // If editing and password is empty, don't update the password
    if (isEditing && !formData.password) {
      const { password, ...userData } = formData;
      onSave(userData);
    } else {
      onSave(formData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            {isEditing ? t('edit_user') : t('add_user')}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm font-medium">
              {t('full_name')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="username" className="text-sm font-medium">
              {t('username')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="username"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={isEditing} // Username can't be changed once created
            />
            {isEditing && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {t('username_cannot_be_changed')}
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="password" className="text-sm font-medium">
              {t('password')} {!isEditing && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required={!isEditing}
            />
            {isEditing && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {t('leave_empty_to_keep_current_password')}
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              {t('confirm_password')} {!isEditing && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              required={!isEditing || !!formData.password}
            />
          </div>
          
          {passwordError && (
            <div className="text-destructive text-sm">
              {passwordError}
            </div>
          )}
          
          <div>
            <Label htmlFor="role" className="text-sm font-medium">
              {t('role')} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.role}
              onValueChange={handleRoleChange}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder={t('select_role')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t('admin')}</SelectItem>
                <SelectItem value="cashier">{t('cashier')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="status" className="text-sm font-medium">
              {t('status')} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.status}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder={t('select_status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('active')}</SelectItem>
                <SelectItem value="inactive">{t('inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
            >
              {t('cancel')}
            </Button>
            <Button 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                t('save')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
