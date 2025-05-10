import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { 
  BarChart3, ShoppingBag, Users, FileText, Loader2, 
  ReceiptText, Plus, ArrowRight 
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useLocale } from '@/hooks/use-locale';
import CreateInvoiceDialog from '@/components/invoice/create-invoice-dialog';

interface DashboardStats {
  totalSales: number;
  totalProfit: number;
  totalCustomers: number;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    date: string;
    amount: number;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
}

export default function Dashboard() {
  const { t } = useTranslation();
  
  // حالة النافذة المنبثقة لإنشاء الفاتورة
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);

  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      // For demo purposes
      return {
        totalSales: 12500,
        totalProfit: 3200,
        totalCustomers: 45,
        recentInvoices: [
          {
            id: '1',
            invoiceNumber: 'INV-2023-001',
            customerName: 'Ahmed Mohamed',
            date: '2023-08-24',
            amount: 899.99,
          },
          {
            id: '2',
            invoiceNumber: 'INV-2023-002',
            customerName: 'Sara Ali',
            date: '2023-08-23',
            amount: 1199.99,
          },
        ],
        topProducts: [
          {
            id: '1',
            name: 'Samsung Galaxy S21',
            quantity: 12,
            revenue: 10799.88,
          },
          {
            id: '2',
            name: 'Lenovo ThinkPad X1',
            quantity: 5,
            revenue: 5999.95,
          },
        ],
      };
    },
  });

  const renderStats = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    if (!stats) {
      return (
        <div className="text-center p-6 text-muted-foreground">
          {t('no_data_available')}
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="h-10 w-10 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('total_sales')}</p>
                  <h3 className="text-2xl font-bold">{formatCurrency(stats.totalSales)}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-10 w-10 text-success-DEFAULT" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('total_profit')}</p>
                  <h3 className="text-2xl font-bold">{formatCurrency(stats.totalProfit)}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-10 w-10 text-secondary-DEFAULT" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('total_customers')}</p>
                  <h3 className="text-2xl font-bold">{stats.totalCustomers}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('recent_invoices')}</CardTitle>
              <CardDescription>{t('recently_created_invoices')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{invoice.customerName}</p>
                      <p className="text-sm text-muted-foreground">{invoice.invoiceNumber} - {invoice.date}</p>
                    </div>
                    <p className="font-bold">{formatCurrency(invoice.amount)}</p>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href="/reports">
                  <FileText className="mr-2 h-4 w-4" />
                  {t('view_all_invoices')}
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{t('top_selling_products')}</CardTitle>
              <CardDescription>{t('best_performing_products')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{t('quantity_sold')}: {product.quantity}</p>
                    </div>
                    <p className="font-bold">{formatCurrency(product.revenue)}</p>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href="/management">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  {t('view_all_products')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  };

  const { language } = useLocale();
  const isRtl = language === 'ar';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{t('dashboard')}</h1>
        
        {/* زر إنشاء فاتورة جديدة بتصميم جذاب */}
        <Button
          size="lg"
          className={`group relative overflow-hidden bg-gradient-to-r from-primary to-primary/80 hover:from-primary-600 hover:to-primary-500 transition-all shadow-md hover:shadow-lg ${isRtl ? 'flex-row-reverse' : ''}`}
          onClick={() => setIsCreateInvoiceOpen(true)}
        >
          <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <ReceiptText className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold">{t('create_new_invoice')}</span>
            <div className={`absolute top-0 bottom-0 ${isRtl ? 'left-0' : 'right-0'} w-8 bg-white/10 flex items-center justify-center transition-transform group-hover:${isRtl ? '-translate-x-1' : 'translate-x-1'}`}>
              <ArrowRight className={`h-4 w-4 text-white ${isRtl ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </Button>
      </div>
      
      {/* زر طافي لإنشاء فاتورة جديدة */}
      <div className="fixed bottom-6 right-6 z-50 md:hidden">
        <Button
          size="icon"
          className="h-16 w-16 rounded-full bg-gradient-to-r from-primary to-primary-600 shadow-lg hover:shadow-xl"
          onClick={() => setIsCreateInvoiceOpen(true)}
        >
          <div className="relative">
            <ReceiptText className="h-7 w-7 text-white absolute opacity-100 transition-all group-hover:opacity-0" />
            <Plus className="h-7 w-7 text-white absolute opacity-0 transition-all group-hover:opacity-100" />
          </div>
        </Button>
      </div>
      
      {/* نافذة إنشاء الفاتورة المنبثقة */}
      <CreateInvoiceDialog 
        open={isCreateInvoiceOpen} 
        onOpenChange={setIsCreateInvoiceOpen}
      />
      
      {renderStats()}
    </div>
  );
}
