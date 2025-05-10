import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { BarChart3, ShoppingBag, Users, FileText, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t('dashboard')}</h1>
      {renderStats()}
    </div>
  );
}
