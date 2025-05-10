import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { Button } from '@/components/ui/button';
import { ReceiptText, Plus, ArrowRight } from 'lucide-react';
import BarcodeScanner from '@/components/barcode-scanner';
import ActiveInvoice from '@/components/invoice/active-invoice';
import CreateInvoiceDialog from '@/components/invoice/create-invoice-dialog';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  isPotential: boolean;
}

interface Product {
  id: string;
  name: string;
  barcode: string;
  code?: string;
  purchasePrice: number;
  sellingPrice: number;
}

export default function SalesPage() {
  const { t } = useTranslation();
  const { language } = useLocale();
  const isRtl = language === 'ar';
  
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
  
  // حالة النافذة المنبثقة لإنشاء الفاتورة
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  
  const handleCustomerSelected = (customer: Customer) => {
    setActiveCustomer(customer);
    setIsCreateInvoiceOpen(false);
  };
  
  const handleProductScanned = (product: Product) => {
    setLastScannedProduct(product);
    setShowScanner(false);
  };
  
  const handleCloseInvoice = () => {
    setActiveCustomer(null);
    setShowScanner(false);
  };
  
  const handleActivateScanner = () => {
    setShowScanner(true);
  };
  
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
          />
        </>
      )}
      
      {/* نافذة إنشاء الفاتورة المنبثقة */}
      <CreateInvoiceDialog 
        open={isCreateInvoiceOpen} 
        onOpenChange={setIsCreateInvoiceOpen} 
      />
    </div>
  );
}
