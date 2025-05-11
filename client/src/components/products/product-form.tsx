import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, RefreshCw, Loader2, QrCode, Camera, ScanLine, AlertCircle } from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generateBarcodeNumber, generateBarcodeSVG } from '@/lib/utils';
import { startBarcodeScanner, stopBarcodeScanner } from '@/lib/barcode';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id?: string;
  name: string;
  barcode: string;
  alternativeCode?: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
}

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
  product?: Product;
  isLoading?: boolean;
}

export default function ProductForm({ 
  open, 
  onClose, 
  onSave, 
  product, 
  isLoading = false 
}: ProductFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isEditing = !!product?.id;
  const scannerRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState<Product>({
    name: '',
    barcode: generateBarcodeNumber('code128'),
    alternativeCode: '',
    purchasePrice: 0,
    sellingPrice: 0,
    stock: 0
  });
  
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'requesting' | 'denied' | 'ready'>('idle');

  useEffect(() => {
    if (product) {
      setFormData(product);
    } else {
      setFormData({
        name: '',
        barcode: generateBarcodeNumber(),
        alternativeCode: '',
        purchasePrice: 0,
        sellingPrice: 0,
        stock: 0
      });
    }
    
    // تنظيف الماسح عند فتح/إغلاق النموذج
    return () => {
      if (isScanning) {
        cleanupScanner();
      }
    };
  }, [product, open, isScanning]);
  
  const cleanupScanner = () => {
    try {
      stopBarcodeScanner();
      setIsScanning(false);
    } catch (e) {
      console.error('Error stopping scanner:', e);
    }
  };
  
  const startScanner = () => {
    setScannerError(null);
    setCameraStatus('requesting');

    // تحقق أولاً من إمكانية الوصول إلى الكاميرا
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        // إيقاف الدفق الأولي (سنستخدم Quagga للتحكم بالكاميرا)
        stream.getTracks().forEach(track => track.stop());

        setCameraStatus('ready');
        setIsScanning(true);
        
        // إنشاء عنصر الكاميرا
        setTimeout(() => {
          if (scannerRef.current) {
            console.log('Starting barcode scanner');
            startBarcodeScanner(
              'barcode-scanner-product',
              handleBarcodeDetected,
              (result) => {
                // معالجة إطارات المسح (اختياري)
                if (result && result.codeResult) {
                  // معالجة مرئية للإطار
                }
              }
            );
          } else {
            console.error('Scanner element not ready');
            setCameraStatus('idle');
            setScannerError(t('scanner_initialization_failed'));
          }
        }, 500); // تأخير بسيط للتأكد من جاهزية العنصر
      })
      .catch(err => {
        console.error('Camera access error:', err);
        setCameraStatus('denied');
        setScannerError(t('camera_access_denied'));
      });
  };
  
  const stopScanner = () => {
    cleanupScanner();
    setCameraStatus('idle');
  };
  
  const handleBarcodeDetected = (result: any) => {
    if (result && result.codeResult && result.codeResult.code) {
      const barcode = result.codeResult.code;
      stopScanner();
      
      console.log('Barcode detected:', barcode);
      
      // إضافة إشعار نجاح
      toast({
        title: t('barcode_scanned_successfully'),
        description: barcode
      });
      
      // استخدام الباركود المكتشف
      setFormData({
        ...formData,
        barcode: barcode
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    
    if (id === 'purchasePrice' || id === 'sellingPrice' || id === 'stock') {
      setFormData({
        ...formData,
        [id]: parseFloat(value) || 0
      });
    } else {
      // تحديث القيمة
      const updatedFormData = {
        ...formData,
        [id]: value
      };
      
      // إذا كان الحقل هو الباركود، نتحقق أنه صالح
      if (id === 'barcode' && value.trim() === '') {
        // إذا كان فارغاً، نولد باركود جديد
        updatedFormData.barcode = generateBarcodeNumber('code128');
      }
      
      setFormData(updatedFormData);
    }
  };

  const generateNewBarcode = () => {
    setFormData({
      ...formData,
      barcode: generateBarcodeNumber()
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const barcodeSvg = generateBarcodeSVG(formData.barcode);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <QrCode className="mr-2 h-5 w-5" />
            {isEditing ? t('edit_product') : t('add_new_product')}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name" className="text-sm font-medium">
                {t('product_name')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="alternativeCode" className="text-sm font-medium">
                {t('alternative_code')}
              </Label>
              <Input
                id="alternativeCode"
                value={formData.alternativeCode || ''}
                onChange={handleChange}
              />
            </div>

            <div className="col-span-1">
              <Label htmlFor="stock" className="text-sm font-medium">
                {t('initial_stock')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="purchasePrice" className="text-sm font-medium">
                {t('purchase_price')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="purchasePrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.purchasePrice}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="sellingPrice" className="text-sm font-medium">
                {t('selling_price')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sellingPrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.sellingPrice}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="barcode" className="text-sm font-medium">
                {t('barcode')}
              </Label>
              <div className="flex">
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={handleChange}
                  className="flex-1 rounded-r-none"
                />
                <Button
                  type="button"
                  className="rounded-l-none rounded-r-none"
                  onClick={generateNewBarcode}
                  title={t('generate_new_barcode')}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  className="rounded-l-none"
                  onClick={startScanner}
                  disabled={isScanning}
                  title={t('scan_existing_barcode')}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {t('barcode_manual_edit_info')} {!isScanning && t('or_scan_existing_barcode')}
              </p>
            </div>
            
            {isScanning && (
              <div className="col-span-2 mt-2">
                <div 
                  id="barcode-scanner-product" 
                  ref={scannerRef} 
                  className="border-2 border-dashed border-border rounded-lg overflow-hidden relative h-64 bg-black"
                >
                  <div className="absolute inset-0 z-10 pointer-events-none">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-red-500 opacity-70 animate-pulse"></div>
                    <div className="absolute top-0 left-1/2 w-1 h-full bg-red-500 opacity-70 animate-pulse"></div>
                    
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="p-2 rounded-full bg-black/50 backdrop-blur">
                        <ScanLine className="h-5 w-5 text-white animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 flex justify-end">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={stopScanner}
                    size="sm"
                  >
                    {t('cancel_scanning')}
                  </Button>
                </div>
              </div>
            )}
            
            {scannerError && (
              <div className="col-span-2 mt-2">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('error')}</AlertTitle>
                  <AlertDescription>{scannerError}</AlertDescription>
                </Alert>
              </div>
            )}
            
            <div className="col-span-2 flex justify-center">
              <div 
                className="border border-neutral-200 dark:border-neutral-700 p-4 rounded-md"
                dangerouslySetInnerHTML={{ __html: barcodeSvg }}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
            >
              {t('cancel')}
            </Button>
            <Button 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                t('save_product')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
