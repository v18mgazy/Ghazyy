import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle, AlertCircle, X, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { Skeleton } from '@/components/ui/skeleton';

interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsDropdownProps {
  userId: number;
}

export function NotificationsDropdown({ userId }: NotificationsDropdownProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  
  // استعلام لجلب الإشعارات
  const {
    data: notifications = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<Notification[]>({
    queryKey: [`/api/notifications/user/${userId}`],
    enabled: !!userId,
  });
  
  // تعيين نص تبعاً لنوع الإشعار
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'invoice_created':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'deferred_payment_request':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'deferred_payment_approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'deferred_payment_rejected':
        return <X className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };
  
  // تنسيق وقت الإشعار
  const formatNotificationTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      // استخدام الإعدادات العربية للتاريخ إذا كانت اللغة الحالية هي العربية
      const locale = t('languageCode') === 'ar' ? ar : undefined;
      return formatDistanceToNow(date, { addSuffix: true, locale });
    } catch (e) {
      return dateStr;
    }
  };
  
  // طلب لتعيين الإشعار كمقروء
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await apiRequest('PATCH', `/api/notifications/${notificationId}/read`);
      return await res.json();
    },
    onSuccess: () => {
      // تحديث قائمة الإشعارات
      queryClient.invalidateQueries({ queryKey: [`/api/notifications/user/${userId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: t('notifications.markError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // طلب لحذف الإشعار
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      console.log('Deleting notification with ID:', notificationId);
      
      try {
        const response = await apiRequest('DELETE', `/api/notifications/${notificationId}`);
        console.log('Delete notification response:', response.status);
        
        if (response.status !== 204) {
          // محاولة قراءة نص الخطأ من الاستجابة
          let errorText = 'Unknown error';
          try {
            const errorData = await response.json();
            errorText = errorData.message || 'Error deleting notification';
          } catch (e) {
            // إذا لم يمكن قراءة JSON من الاستجابة
            errorText = 'Error deleting notification';
          }
          throw new Error(errorText);
        }
        
        return { success: true, id: notificationId };
      } catch (error) {
        console.error('Error in delete notification mutation:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      console.log('Successfully deleted notification:', result);
      
      // تحديث حالة الإشعارات في ذاكرة التخزين المؤقت عن طريق إزالة الإشعار المحذوف
      queryClient.setQueryData(
        [`/api/notifications/user/${userId}`],
        (oldData: Notification[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter(notification => notification.id !== result.id);
        }
      );
      
      // ثم إعادة جلب البيانات المحدثة من الخادم
      queryClient.invalidateQueries({ queryKey: [`/api/notifications/user/${userId}`] });
      
      // عرض رسالة نجاح للمستخدم
      toast({
        title: t('notifications.deleteSuccess'),
        description: t('notifications.deleteSuccessMessage'),
      });
    },
    onError: (error: Error) => {
      console.error('Delete notification error:', error);
      toast({
        title: t('notifications.deleteError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // وظيفة لتعيين الإشعار كمقروء
  const handleMarkAsRead = (notificationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsReadMutation.mutate(notificationId);
  };
  
  // وظيفة لحذف الإشعار
  const handleDelete = (notificationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(notificationId);
  };
  
  // وظيفة للتعامل مع الضغط على الإشعار
  const handleNotificationClick = (notification: Notification) => {
    // إذا كان الإشعار غير مقروء، قم بتعيينه كمقروء
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    
    // يمكن إضافة تنقل إلى صفحة ذات صلة بالإشعار هنا
    // مثلاً إذا كان نوع الإشعار هو طلب الموافقة على الدفع المؤجل
    if (notification.type === 'deferred_payment_request' && notification.referenceId) {
      // window.location.href = `/payment-approvals/${notification.referenceId}`;
      console.log('Navigate to payment approval:', notification.referenceId);
    }
    // أو إذا كان نوع الإشعار هو إنشاء فاتورة
    else if (notification.type === 'invoice_created' && notification.referenceId) {
      // window.location.href = `/invoices/${notification.referenceId}`;
      console.log('Navigate to invoice:', notification.referenceId);
    }
    
    setOpen(false);
  };
  
  // عدد الإشعارات غير المقروءة
  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  // تحديث الإشعارات كل 30 ثانية
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [refetch]);
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs" variant="destructive">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[350px] max-h-[500px] overflow-y-auto">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>{t('notifications.title')}</span>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {t('notifications.unread', { count: unreadCount })}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoading ? (
          // حالة التحميل
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[60px]" />
                </div>
                <Skeleton className="h-4 w-full" />
                <DropdownMenuSeparator />
              </div>
            ))}
          </>
        ) : isError ? (
          // حالة الخطأ
          <div className="p-4 text-center text-destructive">
            <p>{t('notifications.loadError')}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()} 
              className="mt-2"
            >
              {t('notifications.retry')}
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          // لا توجد إشعارات
          <div className="p-4 text-center text-muted-foreground">
            {t('notifications.empty')}
          </div>
        ) : (
          // قائمة الإشعارات
          <>
            {notifications.map((notification) => (
              <div key={notification.id}>
                <DropdownMenuItem 
                  className={`p-3 cursor-pointer ${!notification.isRead ? 'bg-accent/40' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div className="mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-sm">{notification.title}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <div className="flex justify-end gap-2 mt-1">
                        {!notification.isRead && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-xs"
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                          >
                            {t('notifications.markAsRead')}
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={(e) => handleDelete(notification.id, e)}
                        >
                          {t('notifications.delete')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </div>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}