import React, { useState, useEffect } from 'react';
import { XCircle, AlertTriangle, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatTimeAgo } from '@/lib/utils';
import { useLocale } from '@/hooks/use-locale';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  type: 'approval' | 'lowStock' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { t } = useTranslation();
  const { language } = useLocale();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Mock data for notifications - in a real app, this would come from an API or Firebase
  useEffect(() => {
    setNotifications([
      {
        id: '1',
        type: 'approval',
        title: t('deferred_payment_request'),
        message: t('deferred_payment_request_message', { name: 'Ahmed Mohamed', invoiceId: 'INV-2023-045' }),
        timestamp: new Date(Date.now() - 1000 * 60 * 2), // 2 minutes ago
        read: false,
        data: {
          invoiceId: 'INV-2023-045',
          userId: '123',
          amount: 54.97
        }
      },
      {
        id: '2',
        type: 'lowStock',
        title: t('low_stock_alert'),
        message: t('low_stock_alert_message', { product: 'Samsung Galaxy S21', quantity: 2 }),
        timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        read: false,
        data: {
          productId: '456',
          remaining: 2
        }
      }
    ]);
  }, [t, language]);

  const handleApprove = (notificationId: string) => {
    // In a real app, this would call an API to approve the payment
    console.log('Approving notification:', notificationId);
    
    // Update notification list to mark as read
    setNotifications(notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
  };

  const handleDecline = (notificationId: string) => {
    // In a real app, this would call an API to decline the payment
    console.log('Declining notification:', notificationId);
    
    // Update notification list to mark as read
    setNotifications(notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
  };

  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return <AlertTriangle className="text-destructive mr-3 h-5 w-5" />;
      case 'lowStock':
        return <Package className="text-destructive mr-3 h-5 w-5" />;
      default:
        return <AlertTriangle className="text-destructive mr-3 h-5 w-5" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      ></div>
      
      <div className="absolute top-16 right-4 w-80 bg-white dark:bg-neutral-800 rounded-lg shadow-lg overflow-hidden transform transition-all">
        <div className="flex justify-between items-center p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="font-medium">{t('notifications')}</h3>
          <button 
            onClick={onClose} 
            className="text-neutral-500 hover:text-neutral-700 dark:hover:text-white"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-neutral-500 dark:text-neutral-400">
              {t('no_notifications')}
            </div>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification.id} 
                className="p-4 border-b border-neutral-200 dark:border-neutral-700"
              >
                <div className="flex items-start">
                  {getNotificationIcon(notification.type)}
                  <div>
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      {notification.message}
                    </p>
                    
                    {notification.type === 'approval' && !notification.read && (
                      <div className="mt-2 flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="success"
                          className="bg-success-DEFAULT hover:bg-success-dark text-white py-1 px-3 rounded text-xs"
                          onClick={() => handleApprove(notification.id)}
                        >
                          {t('approve')}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="bg-destructive hover:bg-destructive/90 text-white py-1 px-3 rounded text-xs"
                          onClick={() => handleDecline(notification.id)}
                        >
                          {t('decline')}
                        </Button>
                      </div>
                    )}
                    
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                      {formatTimeAgo(notification.timestamp, language)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
