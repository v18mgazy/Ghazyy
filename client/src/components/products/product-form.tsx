import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, RefreshCw, Loader2, QrCode, Camera, ScanLine, AlertCircle, Edit2 } from 'lucide-react';
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
  const [barcodeMethod, setBarcodeMethod] = useState<'generate' | 'manual' | 'scan'>('generate');
  // تخزين الباركود المكتشف لمنع حدوث حالات سباق
  const [detectedBarcodeValue, setDetectedBarcodeValue] = useState<string | null>(null);
  
  // تهيئة البيانات عند فتح النموذج للمرة الأولى أو تغيير المنتج
  useEffect(() => {
    // فقط قم بالتهيئة عندما يكون النموذج مفتوحاً
    if (open) {
      console.log('Dialog opened with product:', product);
      
      // إعادة تعيين قيمة الباركود المكتشف عند فتح النموذج
      setDetectedBarcodeValue(null);
      
      if (product) {
        // إذا كان المنتج موجودًا مسبقًا
        setFormData(product);
        setBarcodeMethod('manual');
        console.log('Form initialized with existing product, barcode method set to manual');
      } else {
        // إذا كان منتجًا جديدًا
        setFormData({
          name: '',
          barcode: generateBarcodeNumber('code128'),
          alternativeCode: '',
          purchasePrice: 0,
          sellingPrice: 0,
          stock: 0
        });
        setBarcodeMethod('generate');
        console.log('Form initialized for new product, barcode method set to generate');
      }
    }
  }, [product, open]);
  
  // استخدام الباركود المكتشف عندما يتغير
  useEffect(() => {
    if (detectedBarcodeValue) {
      console.log('Using detected barcode value for form data:', detectedBarcodeValue);
      
      // تطبيق الباركود المكتشف على نموذج البيانات
      setFormData(prevData => ({
        ...prevData,
        barcode: detectedBarcodeValue
      }));
    }
  }, [detectedBarcodeValue]);
  
  // تنظيف الماسح عند إغلاق النموذج
  useEffect(() => {
    return () => {
      // تأكد من إيقاف الماسح عند إغلاق المكون
      cleanupScanner();
      console.log('Scanner cleanup on component unmount');
    };
  }, []);
  
  const cleanupScanner = () => {
    try {
      stopBarcodeScanner();
      setIsScanning(false);
    } catch (e) {
      console.error('Error stopping scanner:', e);
    }
  };
  
  const startScanner = () => {
    console.log('Starting scanner, setting up camera...');
    setScannerError(null);
    setCameraStatus('requesting');
    setIsScanning(true);

    // تأخير بسيط لضمان تحديث واجهة المستخدم قبل طلب الكاميرا
    setTimeout(() => {
      // تحقق أولاً من إمكانية الوصول إلى الكاميرا
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          // إيقاف الدفق الأولي (سنستخدم Quagga للتحكم بالكاميرا)
          stream.getTracks().forEach(track => track.stop());
          
          console.log('Camera permission granted, waiting for scanner element...');
          setCameraStatus('ready');
          
          // إنشاء عنصر الكاميرا بعد تأخير بسيط للتأكد من تحديث DOM
          setTimeout(() => {
            if (scannerRef.current) {
              console.log('Scanner element ready, initializing Quagga...');
              
              startBarcodeScanner(
                'barcode-scanner-product',
                (result) => {
                  // استدعاء مباشر لمعالج الباركود
                  handleBarcodeDetection(result);
                },
                (result) => {
                  // معالجة إطارات المسح (اختياري)
                  if (result && result.codeResult) {
                    // يمكن إضافة معالجة بصرية هنا
                  }
                }
              );
            } else {
              console.error('Scanner element not found or not ready');
              setCameraStatus('idle');
              setIsScanning(false);
              setScannerError(t('scanner_initialization_failed'));
            }
          }, 500);
        })
        .catch(err => {
          console.error('Camera access error:', err);
          setCameraStatus('denied');
          setIsScanning(false);
          setScannerError(t('camera_access_denied'));
        });
    }, 100);
  };
  
  // وظيفة مساعدة منفصلة لإيقاف الماسح
  const stopScanner = () => {
    console.log('Stopping scanner...');
    // إيقاف الماسح
    cleanupScanner();
    // إعادة تعيين الحالة
    setCameraStatus('idle');
    setIsScanning(false);
  };
  
  // معالجة نتيجة المسح بطريقة أكثر موثوقية
  const handleBarcodeDetection = (result: any) => {
    // التحقق من وجود نتيجة صالحة
    if (result && result.codeResult && result.codeResult.code) {
      const detectedBarcode = result.codeResult.code;
      console.log('Barcode detected:', detectedBarcode);
      
      // إيقاف الماسح فورًا
      stopScanner();
      
      // إظهار إشعار للمستخدم
      toast({
        title: t('barcode_scanned_successfully'),
        description: detectedBarcode
      });
      
      // تخزين الباركود المكتشف في الحالة
      // سيتم تطبيقه على النموذج عبر useEffect
      setDetectedBarcodeValue(detectedBarcode);
      
      // تعيين وضع الإدخال اليدوي بعد اكتمال المسح
      setBarcodeMethod('manual');
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
    setBarcodeMethod('generate');
    setFormData({
      ...formData,
      barcode: generateBarcodeNumber('code128')
    });
  };
  
  const enableManualBarcode = () => {
    setBarcodeMethod('manual');
    // الاحتفاظ بالباركود الحالي وتمكين التعديل اليدوي
  };

  const prepareScanBarcode = () => {
    // تأكد من تعيين وضع المسح أولاً قبل بدء الماسح
    setBarcodeMethod('scan');
    
    // تأخير قليل لضمان اكتمال تحديث الحالة
    setTimeout(() => {
      console.log('Starting scanner after mode change to scan');
      // بدء عملية المسح الضوئي للباركود
      startScanner();
    }, 50);
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
              {/* خيارات الباركود */}
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">{t('barcode')}</Label>
                <div className="flex gap-2 border border-input rounded-md overflow-hidden">
                  <Button
                    type="button"
                    variant={barcodeMethod === 'generate' ? "default" : "ghost"}
                    size="sm"
                    onClick={generateNewBarcode}
                    className={`rounded-none ${barcodeMethod === 'generate' ? 'bg-primary text-primary-foreground' : ''}`}
                    title={t('auto_generate')}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" /> {t('auto_generate')}
                  </Button>
                  <Button
                    type="button"
                    variant={barcodeMethod === 'manual' ? "default" : "ghost"}
                    size="sm"
                    onClick={enableManualBarcode}
                    className={`rounded-none ${barcodeMethod === 'manual' ? 'bg-primary text-primary-foreground' : ''}`}
                    title={t('manual_entry')}
                  >
                    <Edit2 className="h-4 w-4 mr-1" /> {t('manual_entry')}
                  </Button>
                  <Button
                    type="button"
                    variant={barcodeMethod === 'scan' ? "default" : "ghost"}
                    size="sm"
                    onClick={prepareScanBarcode}
                    disabled={isScanning}
                    className={`rounded-none ${barcodeMethod === 'scan' ? 'bg-primary text-primary-foreground' : ''}`}
                    title={t('scan_existing')}
                  >
                    <Camera className="h-4 w-4 mr-1" /> {t('scan_existing')}
                  </Button>
                </div>
              </div>
              
              {/* حقل الباركود يتغير حسب الوضع المحدد */}
              {barcodeMethod === 'generate' ? (
                <div className="relative">
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    readOnly
                    className="bg-muted pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={generateNewBarcode}
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    title={t('regenerate_barcode')}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('barcode_auto_generated')}
                  </p>
                </div>
              ) : barcodeMethod === 'manual' ? (
                <div>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={handleChange}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('barcode_manual_edit_info')}
                  </p>
                </div>
              ) : (
                <div>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={handleChange}
                    disabled={isScanning}
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {isScanning ? t('scanning_barcode') : t('scanned_barcode_manual_edit')}
                  </p>
                </div>
              )}
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
