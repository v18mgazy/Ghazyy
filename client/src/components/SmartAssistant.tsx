import React, { useEffect, useState } from 'react';
import { Bot, Bell, X, Smile, AlertTriangle } from 'lucide-react';
import { onValue, ref } from 'firebase/database';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { database } from '@/lib/firebase'; // تأكد أن هذا المسار صحيح

const SmartAssistant = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // تحميل البيانات من Firebase
  useEffect(() => {
    const reportRef = ref(database, 'report_data');
    const productsRef = ref(database, 'products');
    const notificationsRef = ref(database, 'notifications');

    // التقارير
    onValue(reportRef, snapshot => {
      const data = snapshot.val();
      if (data) {
        const all = Object.values(data);
        const latest = all.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        setReport(latest);
      }
    });

    // المنتجات
    onValue(productsRef, snapshot => {
      const data = snapshot.val();
      if (data) {
        setProducts(Object.values(data));
      }
    });

    // الإشعارات
    onValue(notificationsRef, snapshot => {
      const data = snapshot.val();
      if (data) {
        const notifs = Object.values(data);
        setNotifications(notifs);
      }
    });
  }, []);

  // الحسابات الذكية
  const lowStock = products.filter((p: any) => p.stock <= 2);
  const unsold = products.filter((p: any) => p.stock >= 5);
  const bestProduct = [...products].sort((a, b) => a.stock - b.stock)[0];
  const hasUnread = notifications.some((n: any) => !n.isRead);

  return (
    <>
      {/* زر عائم */}
      <div className="fixed bottom-6 left-6 z-50">
        <motion.button
          onClick={() => setOpen(true)}
          whileHover={{ rotate: [0, -5, 5, 0] }}
          className="relative bg-primary p-4 rounded-full text-white shadow-lg hover:scale-110 transition"
        >
          <Bot className="w-6 h-6" />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full" />
          )}
        </motion.button>
      </div>

      {/* ويدجت المساعد */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 left-6 w-[320px] bg-white dark:bg-slate-900 rounded-xl shadow-xl p-4 z-50"
        >
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Smile className="w-5 h-5 text-yellow-500" /> {t('assistant') || 'المساعد الذكي'}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3 text-sm">
            <p>👋 {t('good_morning') || 'صباح الخير'}! {t('here_is_today_report') || 'تقرير اليوم:'}</p>

            {report && (
              <Card className="p-3 text-xs bg-accent space-y-1">
                <p>📊 {t('sales') || 'المبيعات'}: {report.sales}</p>
                <p>🧾 {t('orders') || 'الطلبات'}: {report.orders}</p>
                <p>💰 {t('profit') || 'الربح'}: {report.profit}</p>
              </Card>
            )}

            {bestProduct && (
              <p>🔥 {t('top_seller') || 'الأكثر مبيعًا'}: <strong>{bestProduct.name}</strong></p>
            )}

            {lowStock.length > 0 && (
              <p className="text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                {t('low_stock_alert', { count: lowStock.length }) || `منتجات على وشك النفاد: ${lowStock.length}`}
              </p>
            )}

            {unsold.length > 0 && (
              <p className="text-muted-foreground">
                🛑 {t('unsold_products') || `منتجات غير مباعة: ${unsold.length}`}
              </p>
            )}

            <p>💬 {t('you_can_ask_me') || 'اسألني أي شيء عن المبيعات أو المنتجات'}</p>
          </div>
        </motion.div>
      )}
    </>
  );
};

export default SmartAssistant;
