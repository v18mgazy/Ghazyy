import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { Button } from '@/components/ui/button';
import { ReceiptText, Plus, ArrowRight, Loader2, ShoppingCart, Scan, Keyboard } from 'lucide-react';
import SmallBarcodeScannerModal from '@/components/small-barcode-scanner-modal';
// استيراد مكون إنشاء الفاتورة المبسط
import SimplifiedInvoiceDialog from '@/components/invoice-new/simplified-invoice-dialog';
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
  const [lastScannedProduct, setLastScannedProduct] = useState<any | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  // حالة النافذة المنبثقة لإنشاء الفاتورة
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  
  // استعلام للمنتجات
  const { data: products, isLoading: isProductsLoading } = useQuery({
    queryKey: ['/api/products'],
    refetchInterval: 30 * 1000,     // تحديث البيانات كل 30 ثانية
    refetchOnWindowFocus: true,     // تحديث البيانات عند العودة للصفحة
    staleTime: 20 * 1000            // اعتبار البيانات قديمة بعد 20 ثانية
  });
  
  // استعلام للعملاء
  const { data: customers, isLoading: isCustomersLoading } = useQuery({
    queryKey: ['/api/customers'],
    refetchInterval: 45 * 1000,     // تحديث البيانات كل 45 ثانية
    refetchOnWindowFocus: true,     // تحديث البيانات عند العودة للصفحة
    staleTime: 30 * 1000            // اعتبار البيانات قديمة بعد 30 ثانية
  });
  
  const handleCustomerSelected = (customer: Customer) => {
    setActiveCustomer(customer);
    setIsCreateInvoiceOpen(false);
  };
  
  // دالة معالجة المنتج الممسوح عبر الكاميرا
  const handleProductScanned = (product: any) => {
    // نقوم بإعداد المنتج الممسوح وفتح نافذة الفاتورة مباشرة
    setLastScannedProduct(product);
    setShowScanner(false);
    
    // استخدام setTimeout للتأكد من أن التغييرات تحدث في دورة الحدث التالية
    // هذا سيمنع ظهور أي نوافذ وسيطة
    setTimeout(() => {
      setIsCreateInvoiceOpen(true);
    }, 100);
  };
  
  // دالة معالجة البحث عن باركود مدخل يدوياً أو من ماسح خارجي
  const handleBarcodeSearch = async (barcode: string) => {
    if (!barcode || barcode.trim() === '') return;
    
    try {
      const response = await fetch(`/api/products/barcode/${barcode.trim()}`);
      if (!response.ok) {
        throw new Error(`${t('product_not_found')}: ${barcode}`);
      }
      
      const product = await response.json();
      handleProductScanned(product);
      setManualBarcode('');
    } catch (error) {
      toast({
        title: t('product_not_found'),
        description: barcode,
        variant: "destructive"
      });
    }
  };

  // معالجة إدخال الباركود وتنفيذ البحث عند الضغط على Enter
  const handleBarcodeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeSearch(manualBarcode);
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
          
          {/* قسم خيارات مسح الباركود */}
          <div className="space-y-6 my-8">
            <h2 className="text-xl font-semibold text-center">{t('barcode_options')}</h2>
            
            <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
              {/* زر فتح ماسح الباركود في نافذة منبثقة صغيرة */}
              <Button 
                onClick={handleActivateScanner} 
                size="lg"
                variant="outline"
                className="px-6 py-6 border-2 border-dashed border-primary/40 hover:border-primary/70 bg-primary/5 hover:bg-primary/10 transition-all group"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Scan className="h-6 w-6 text-primary" />
                  </div>
                  <span className="font-semibold">{t('scan_barcode')}</span>
                </div>
              </Button>
              
              {/* قسم إدخال الباركود يدوياً أو باستخدام ماسح خارجي */}
              <div className="bg-card border rounded-lg p-4 w-full md:max-w-md flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Keyboard className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">{t('external_barcode_scanner')}</h3>
                </div>
                <div className="flex gap-2">
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    onKeyDown={handleBarcodeInputKeyDown}
                    placeholder={t('barcode_input_placeholder')}
                    className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    autoComplete="off"
                  />
                  <Button 
                    onClick={() => handleBarcodeSearch(manualBarcode)}
                    type="button"
                    disabled={!manualBarcode.trim()}
                  >
                    {t('search')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* نافذة ماسح الباركود المنبثقة الصغيرة */}
          <SmallBarcodeScannerModal 
            open={showScanner} 
            onOpenChange={setShowScanner} 
            onProductScanned={handleProductScanned} 
          />
          
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
        /* نافذة مؤقتة بدلا من فاتورة نشطة */
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {t('invoice_for')} {activeCustomer.name}
            </h2>
            <Button variant="outline" size="sm" onClick={handleCloseInvoice}>
              {t('close')}
            </Button>
          </div>
          
          <div className="text-center py-8">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">
              {t('invoice_component_removed')}
            </p>
            <Button onClick={() => setIsCreateInvoiceOpen(true)}>
              {t('create_invoice_new_dialog')}
            </Button>
          </div>
        </div>
      )}
      
      {/* نافذة إنشاء الفاتورة المنبثقة المبسطة والمحسنة */}
      <SimplifiedInvoiceDialog 
        open={isCreateInvoiceOpen} 
        onOpenChange={setIsCreateInvoiceOpen}
        preSelectedProduct={lastScannedProduct}
      />
    </div>
  );
}
