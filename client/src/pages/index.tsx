import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { Button } from '@/components/ui/button';
import { ReceiptText, Plus, ArrowRight, Loader2, ShoppingCart, Keyboard, X } from 'lucide-react';
import SimplifiedInvoiceDialog from '@/components/invoice-new/simplified-invoice-dialog';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Customer, Product } from '@shared/schema';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import '@/components/invoice-new/invoice-creator.css';
import SmartAssistantWidget from '@/components/widgets/SmartAssistantWidget';
import SmartAssistant from '@/components/SmartAssistant';

export default function SalesPage() {
  const { t } = useTranslation();
  const { language } = useLocale();
  const isRtl = language === 'ar';

  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [productToAdd, setProductToAdd] = useState<Product | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);

  const { data: products, isLoading: isProductsLoading } = useQuery({
    queryKey: ['/api/products'],
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
    staleTime: 20 * 1000
  });

  const { data: customers, isLoading: isCustomersLoading } = useQuery({
    queryKey: ['/api/customers'],
    refetchInterval: 45 * 1000,
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000
  });

  const handleCustomerSelected = (customer: Customer) => {
    setActiveCustomer(customer);
    setIsCreateInvoiceOpen(false);
  };

  const handleBarcodeSearch = async (barcode: string) => {
    if (!barcode || barcode.trim() === '') return;

    try {
      const response = await fetch(`/api/products/barcode/${barcode.trim()}`);
      if (!response.ok) {
        throw new Error(`${t('product_not_found')}: ${barcode}`);
      }

      const product = await response.json();
      setScannedProduct(product);
      setManualBarcode('');
    } catch (error) {
      toast({
        title: t('product_not_found'),
        description: barcode,
        variant: "destructive"
      });
      setScannedProduct(null);
    }
  };

  const handleBarcodeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeSearch(manualBarcode);
    }
  };

  const handleCloseInvoice = () => {
    setActiveCustomer(null);
  };

  const handleAddToInvoice = () => {
    if (scannedProduct) {
      setProductToAdd(scannedProduct);
      setIsCreateInvoiceOpen(true);
    }
  };

  const handleClearProduct = () => {
    setScannedProduct(null);
    setManualBarcode('');
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

  const handleDialogClose = () => {
    setIsCreateInvoiceOpen(false);
    setProductToAdd(null);
  };

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
            <SmartAssistantWidget />
          </div>

          {/* قسم إدخال الباركود */}
          <div className="space-y-6 my-8">
            <h2 className="text-xl font-semibold text-center">{t('')}</h2>

            <div className="flex justify-center">
              <div className="bg-card border rounded-lg p-4 w-full md:max-w-md flex flex-col gap-3">
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
                    autoFocus
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

          {/* كارد عرض المنتج الممسوح */}
          {scannedProduct && (
            <div className="flex justify-center">
              <Card className="w-full md:max-w-md">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle>{t('product_details')}</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleClearProduct}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('product_name')}:</span>
                      <span className="font-medium">{scannedProduct.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('price')}:</span>
                      <span className="font-bold text-primary">
                        {scannedProduct.sellingPrice} {t('currency')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('العدد المتاح')}:</span>
                      <span className="font-mono">{scannedProduct.stock || 0}</span>
                    </div>
                    <Button 
                      onClick={handleAddToInvoice}
                      className="w-full mt-4"
                      disabled={!scannedProduct.stock || scannedProduct.stock <= 0}
                    >
                      {t('add_to_invoice')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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

      <SimplifiedInvoiceDialog 
        open={isCreateInvoiceOpen} 
        onOpenChange={handleDialogClose}
        preSelectedProduct={productToAdd || undefined}
      />
    </div>
  );
}