import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import BarcodeScanner from '@/components/barcode-scanner';

interface Product {
  id: string | number;
  name: string;
  barcode: string;
  sellingPrice: number;
  stock?: number;
}

interface SmallBarcodeScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductScanned: (product: Product) => void;
}

export default function SmallBarcodeScannerModal({
  open,
  onOpenChange,
  onProductScanned
}: SmallBarcodeScannerModalProps) {
  const { t } = useTranslation();

  // عند مسح منتج بنجاح - يضاف المنتج مباشرة ويغلق النافذة
  const handleProductScanned = (product: Product) => {
    onProductScanned(product);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0" style={{ maxHeight: "90vh" }}>
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="gradient-heading text-lg">
              {t('scan_barcode')}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="p-4 pt-2 pb-4">
          <BarcodeScanner 
            onProductScanned={handleProductScanned}
            continueScanning={false}
            scanDelay={0}
            checkInventory={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}