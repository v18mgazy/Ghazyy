import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { Button } from '@/components/ui/button';
import { ReceiptText, Plus, ArrowRight, Loader2, ShoppingCart } from 'lucide-react';
import BarcodeScanner from '@/components/barcode-scanner';
import ActiveInvoice from '@/components/invoice/active-invoice';
// استيراد مكون إنشاء الفاتورة الجديد
import InvoiceCreator from '@/components/invoice-new/invoice-creator';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Customer, Product } from '@shared/schema';
import { toast } from '@/hooks/use-toast';
// استيراد أنماط CSS الخاصة
import '@/components/invoice-new/invoice-creator.css';

export default function SalesPage() {
  const { t } = useTranslation();
  const { language } = useLocale();
  const isRtl = language === 'ar';
  
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
  
  // حالة النافذة المنبثقة لإنشاء الفاتورة
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  
  // استعلام للمنتجات
  const { data: products, isLoading: isProductsLoading } = useQuery({
    queryKey: ['/api/products'],
    refetchInterval: 30 * 1000,     // تحديث البيانات كل 30 ثانية
    refetchOnWindowFocus: true,     // تحديث البيانات عند العودة للصفحة
    staleTime: 20 * 1000,           // اعتبار البيانات قديمة بعد 20 ثانية
    onError: (error) => {
      toast({
        title: t('error'),
        description: t('products_fetch_error'),
        variant: 'destructive'
      });
      console.error('Failed to fetch products:', error);
    }
  });
  
  // استعلام للعملاء
  const { data: customers, isLoading: isCustomersLoading } = useQuery({
    queryKey: ['/api/customers'],
    refetchInterval: 45 * 1000,     // تحديث البيانات كل 45 ثانية
    refetchOnWindowFocus: true,     // تحديث البيانات عند العودة للصفحة
    staleTime: 30 * 1000,           // اعتبار البيانات قديمة بعد 30 ثانية
    onError: (error) => {
      toast({
        title: t('error'),
        description: t('customers_fetch_error'),
        variant: 'destructive'
      });
      console.error('Failed to fetch customers:', error);
    }
  });
  
  const handleCustomerSelected = (customer: Customer) => {
    setActiveCustomer(customer);
    setIsCreateInvoiceOpen(false);
  };
  
  const handleProductScanned = (product: Product) => {
    setLastScannedProduct(product);
    setShowScanner(false);
    
    // إرسال المنتج المفحوص إلى الفاتورة النشطة (إذا كانت موجودة)
    if (document.getElementById('add-scanned-product-to-invoice')) {
      document.getElementById('add-scanned-product-to-invoice')?.click();
    }
  };
  
  const handleCloseInvoice = () => {
    setActiveCustomer(null);
    setShowScanner(false);
  };
  
  const handleActivateScanner = () => {
    setShowScanner(true);
  };
  
  // مؤشر التحميل
  if (isProductsLoading || isCustomersLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-lg">{t('loading_data')}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {!activeCustomer ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight">{t('sales')}</h1>
            
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
          
          {/* قسم ماسح الباركود */}
          <BarcodeScanner onProductScanned={handleProductScanned} />
          
          {/* تمت إزالة قسم المنتجات الأخيرة بناءً على طلب العميل */}
          
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
        </div>
      ) : (
        /* فاتورة نشطة */
        <>
          {showScanner && (
            <div className="mb-6">
              <BarcodeScanner onProductScanned={handleProductScanned} />
            </div>
          )}
          <ActiveInvoice 
            customer={activeCustomer} 
            onClose={handleCloseInvoice}
            onAddProduct={handleActivateScanner}
            products={products || []}
          />
        </>
      )}
      
      {/* نافذة إنشاء الفاتورة المنبثقة الجديدة والمحسنة */}
      <InvoiceCreator 
        open={isCreateInvoiceOpen} 
        onOpenChange={setIsCreateInvoiceOpen}
        preSelectedProduct={lastScannedProduct}
      />
    </div>
  );
}
