import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, Plus, Edit, Trash2, Lock, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { formatTimeAgo } from '@/lib/utils';
import UserForm from './user-form';
import { useLocale } from '@/hooks/use-locale';

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  status: string;
  lastLogin?: Date | null;
}

interface UserListProps {
  users: User[];
  isLoading: boolean;
  onAddUser: (user: Omit<User, 'id'> & { password: string }) => void;
  onEditUser: (user: Partial<User> & { id: string }) => void;
  onDeleteUser: (userId: string) => void;
  onResetPassword: (userId: string) => void;
}

export default function UserList({
  users,
  isLoading,
  onAddUser,
  onEditUser,
  onDeleteUser,
  onResetPassword
}: UserListProps) {
  const { t } = useTranslation();
  const { language } = useLocale();
  const [searchTerm, setSearchTerm] = useState('');
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userToReset, setUserToReset] = useState<string | null>(null);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddUser = () => {
    setSelectedUser(undefined);
    setUserFormOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserFormOpen(true);
  };

  const handleSaveUser = (user: any) => {
    if (user.id) {
      onEditUser(user);
    } else {
      onAddUser(user);
    }
    setUserFormOpen(false);
  };

  const handleDeleteUser = (userId: string) => {
    setUserToDelete(userId);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      onDeleteUser(userToDelete);
      setUserToDelete(null);
    }
  };

  const handleResetPassword = (userId: string) => {
    setUserToReset(userId);
  };

  const confirmResetPassword = () => {
    if (userToReset) {
      onResetPassword(userToReset);
      setUserToReset(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-primary-light bg-opacity-10 text-primary';
      case 'cashier':
        return 'bg-secondary-light bg-opacity-10 text-secondary';
      default:
        return 'bg-neutral-100 dark:bg-neutral-700';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success-light bg-opacity-10 text-success';
      case 'inactive':
        return 'bg-destructive bg-opacity-10 text-destructive';
      default:
        return 'bg-neutral-100 dark:bg-neutral-700';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('users_management')}</CardTitle>
            <Button size="sm" onClick={handleAddUser}>
              <Plus className="mr-1 h-4 w-4" />
              {t('add_user')}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative flex-grow">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('search_users')}
                className="pr-8"
              />
              <div className="absolute right-2 top-2 text-neutral-500">
                <Search className="h-5 w-5" />
              </div>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold">{t('name')}</TableHead>
                    <TableHead className="font-semibold">{t('username')}</TableHead>
                    <TableHead className="font-semibold">{t('role')}</TableHead>
                    <TableHead className="font-semibold">{t('status')}</TableHead>
                    <TableHead className="font-semibold">{t('last_login')}</TableHead>
                    <TableHead className="font-semibold text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? t('no_users_found') : t('no_users_yet')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user, index) => (
                      <TableRow 
                        key={user.id}
                        className={index % 2 === 0 ? 'bg-muted/20' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center font-semibold ${
                              user.role === 'admin' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.username}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`font-medium capitalize ${
                              user.role === 'admin'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {t(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`font-medium capitalize ${
                              user.status === 'active'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {t(user.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">
                              {user.lastLogin 
                                ? formatTimeAgo(user.lastLogin, language)
                                : t('never')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                              onClick={() => handleResetPassword(user.id)}
                            >
                              <Lock className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* User Form Dialog */}
      <UserForm
        open={userFormOpen}
        onClose={() => setUserFormOpen(false)}
        onSave={handleSaveUser}
        user={selectedUser}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('delete_user_confirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteUser}
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Reset Password Confirmation Dialog */}
      <AlertDialog open={!!userToReset} onOpenChange={() => setUserToReset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('reset_password')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('reset_password_confirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={confirmResetPassword}
            >
              {t('reset')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
