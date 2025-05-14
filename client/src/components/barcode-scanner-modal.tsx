import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Camera, Tags, DollarSign, ShoppingCart } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogHeader,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import BarcodeScanner from '@/components/barcode-scanner';
import { formatCurrency } from '@/lib/utils';
import { useLocale } from '@/hooks/use-locale';

interface Product {
  id: string | number;
  name: string;
  barcode: string;
  sellingPrice: number;
  stock?: number;
}

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductScanned: (product: Product) => void;
}

export default function BarcodeScannerModal({ 
  isOpen, 
  onClose, 
  onProductScanned 
}: BarcodeScannerModalProps) {
  const { t } = useTranslation();
  const { language } = useLocale();
  const isRtl = language === 'ar';
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);

  // تنفيذ المسح
  const handleProductScanned = (product: Product) => {
    setScannedProduct(product);
  };

  // إضافة المنتج وإغلاق النافذة المنبثقة
  const handleAddProduct = () => {
    if (scannedProduct) {
      onProductScanned(scannedProduct);
      // إعادة تعيين الحالة وإغلاق النافذة المنبثقة
      setScannedProduct(null);
      onClose();
    }
  };

  // إغلاق النافذة المنبثقة وإعادة تعيين الحالة
  const handleClose = () => {
    setScannedProduct(null);
    onClose();
  };

  return (
    <>
      {/* نافذة ماسح الباركود */}
      <Dialog open={isOpen && !scannedProduct} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="gradient-heading">
                {t('scan_product_barcode')}
              </DialogTitle>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="px-4 pb-4">
            <BarcodeScanner 
              onProductScanned={handleProductScanned} 
              continueScanning={false}
              scanDelay={0}
              checkInventory={true}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* نافذة تأكيد المنتج الذي تم مسحه */}
      <Dialog open={!!scannedProduct} onOpenChange={() => setScannedProduct(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="gradient-heading">{t('scanned_product')}</DialogTitle>
          </DialogHeader>
          
          {scannedProduct && (
            <div className="space-y-4">
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                <h3 className="text-xl font-bold mb-3">{scannedProduct.name}</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 text-muted-foreground mr-2" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('price')}</p>
                      <p className="font-semibold text-primary">{formatCurrency(scannedProduct.sellingPrice)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <ShoppingCart className="h-4 w-4 text-muted-foreground mr-2" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('quantity')}</p>
                      <p className="font-semibold">{scannedProduct.stock !== undefined ? scannedProduct.stock : t('not_specified')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              {t('close')}
            </Button>
            <Button onClick={handleAddProduct}>
              {t('add_to_invoice')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}