import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, DollarSign, ShoppingCart, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  onProductScanned,
}: BarcodeScannerModalProps) {
  const { t } = useTranslation();
  const { language } = useLocale();
  const isRtl = language === 'ar';
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);

  const handleProductScanned = (product: Product | null) => {
    if (product) {
      setScannedProduct(product);
    } else {
      // يمكن إضافة toast هنا لاحقًا
    }
  };

  const handleAddProduct = () => {
    if (scannedProduct) {
      onProductScanned(scannedProduct);
      setScannedProduct(null);
      onClose();
    }
  };

  const handleClose = () => {
    setScannedProduct(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="gradient-heading">
              {scannedProduct ? t('scanned_product') : t('scan_product_barcode')}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {!scannedProduct ? (
          <div className="pb-4">
            <BarcodeScanner
              onProductScanned={handleProductScanned}
              continueScanning={false}
              scanDelay={0}
              checkInventory={true}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
              <h3 className="text-xl font-bold mb-3">{scannedProduct.name}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className={`flex items-center ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <DollarSign className="h-4 w-4 text-muted-foreground mr-2" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('price')}</p>
                    <p className="font-semibold text-primary">{formatCurrency(scannedProduct.sellingPrice)}</p>
                  </div>
                </div>
                <div className={`flex items-center ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground mr-2" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('quantity')}</p>
                    <p className="font-semibold">
                      {scannedProduct.stock !== undefined ? scannedProduct.stock : t('not_specified')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2">
              <Button variant="ghost" onClick={() => setScannedProduct(null)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('rescan')}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  {t('close')}
                </Button>
                <Button onClick={handleAddProduct}>
                  {t('add_to_invoice')}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
