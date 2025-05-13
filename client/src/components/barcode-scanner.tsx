import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, ScanLine, QrCode, AlertCircle, RefreshCw, FileBarChart2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { startBarcodeScanner, stopBarcodeScanner } from '@/lib/barcode';
import { formatCurrency } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useLocale } from '@/hooks/use-locale';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  barcode: string;
  sellingPrice: number;
}

interface BarcodeScannerProps {
  onProductScanned: (product: Product) => void;
  continueScanning?: boolean; // تحديد ما إذا كان يجب الاستمرار في المسح بعد العثور على منتج
}

export default function BarcodeScanner({ onProductScanned, continueScanning = false }: BarcodeScannerProps) {
  const { t } = useTranslation();
  const { language } = useLocale();
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'requesting' | 'denied' | 'ready'>('idle');
  const scannerRef = useRef<HTMLDivElement>(null);
  const rtl = language === 'ar';
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [scannedCount, setScannedCount] = useState<number>(0);

  useEffect(() => {
    // تنظيف الماسح عند إلغاء تحميل المكون
    return () => {
      if (isScanning) {
        cleanupScanner();
      }
    };
  }, [isScanning]);

  const cleanupScanner = () => {
    try {
      stopBarcodeScanner();
      setIsScanning(false);
    } catch (e) {
      console.error('Error stopping scanner:', e);
    }
  };

  const startScanner = () => {
    setError(null);
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
              'barcode-scanner',
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
            setError(t('scanner_initialization_failed'));
          }
        }, 500); // تأخير بسيط للتأكد من جاهزية العنصر
      })
      .catch(err => {
        console.error('Camera access error:', err);
        setCameraStatus('denied');
        setError(t('camera_access_denied'));
      });
  };

  const stopScanner = () => {
    cleanupScanner();
    setCameraStatus('idle');
  };

  const handleBarcodeDetected = async (result: any) => {
    if (result && result.codeResult && result.codeResult.code) {
      const barcode = result.codeResult.code;
      
      // إذا كنا نريد الاستمرار في المسح، لا نوقف الماسح
      if (!continueScanning) {
        stopScanner();
      }
      
      try {
        console.log('Barcode detected:', barcode);
        // البحث عن المنتج بالباركود في قاعدة البيانات
        const response = await fetch(`/api/products/barcode/${barcode}`);
        
        if (!response.ok) {
          throw new Error(`Product not found with barcode: ${barcode}`);
        }
        
        const product = await response.json();
        
        // إذا كنا نستمر في المسح، نضيف المنتج مباشرة
        if (continueScanning) {
          onProductScanned(product);
          
          // زيادة عدد المنتجات الممسوحة
          setScannedCount(prev => prev + 1);
          
          // إضافة إشعار بنجاح الإضافة
          toast({
            title: t('product_added'),
            description: `${product.name} - ${formatCurrency(product.sellingPrice)}`,
            variant: 'default',
            duration: 2000
          });
          
          // عرض رسالة نجاح مؤقتة داخل المكون
          setSuccessMessage(`${product.name} - ${formatCurrency(product.sellingPrice)}`);
          setTimeout(() => {
            setSuccessMessage(null);
          }, 2500);
          
          console.log('Product added to invoice:', product.name);
        } else {
          setScannedProduct(product);
        }
      } catch (err) {
        setError(t('product_not_found'));
        console.error('Error finding product:', err);
        // إذا كان هناك خطأ وكنا نستمر في المسح، نعيد تشغيل الماسح
        if (continueScanning) {
          setError(null);
          setTimeout(() => {
            setError(null);
          }, 2000); // يظهر خطأ لمدة ثانيتين ثم يختفي للسماح بالمسح مرة أخرى
        }
      }
    }
  };

  const handleAddToInvoice = () => {
    if (scannedProduct) {
      onProductScanned(scannedProduct);
      setScannedProduct(null);
    }
  };

  const retryScanner = () => {
    setCameraStatus('idle');
    setError(null);
    setTimeout(startScanner, 500);
  };

  // استخدام باركود اختباري للبحث في قاعدة البيانات
  const handleManualEntry = async () => {
    try {
      // استخدام باركود اختباري معروف "12345" وهو تنسيق Code 128 المطلوب
      const testBarcode = 'C128-12345';
      console.log('Testing with barcode:', testBarcode);
      
      // البحث عن المنتج بالباركود في قاعدة البيانات
      const response = await fetch(`/api/products/barcode/${testBarcode}`);
      
      if (!response.ok) {
        // إذا لم يتم العثور على المنتج، سنقوم بإنشاء منتج جديد للاختبار فقط
        console.warn(`No product found with barcode ${testBarcode}. Using test product.`);
        const testProduct = {
          id: '999',
          name: 'منتج اختباري',
          barcode: testBarcode,
          sellingPrice: 99.99
        };
        setScannedProduct(testProduct);
        return;
      }
      
      const product = await response.json();
      setScannedProduct(product);
    } catch (err) {
      console.error('Error in manual entry:', err);
      setError(t('error_finding_product'));
    }
  };

  return (
    <Card className={`${continueScanning ? "border-primary border-2 shadow-lg" : "card-hover"}`}>
      <CardHeader className="bg-primary/5 border-b border-border p-3">
        <CardTitle className="flex items-center">
          <QrCode className={`${rtl ? 'ml-2' : 'mr-2'} h-5 w-5 text-primary`} />
          <span className="gradient-heading">{t('scan_barcode')}</span>
          {continueScanning && (
            <div className="ml-auto flex items-center gap-2">
              {scannedCount > 0 && (
                <span className="bg-primary/10 text-primary text-xs font-medium px-2.5 py-0.5 rounded-full border border-primary/20">
                  {scannedCount} {t('products')}
                </span>
              )}
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full border border-green-200">
                {t('continuous_mode')}
              </span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-3">
        {/* Mensaje de éxito - Visible solo en modo continuo */}
        {continueScanning && successMessage && (
          <div className="mb-3 bg-green-50 border border-green-200 rounded-lg p-2.5 flex items-center animate-in fade-in slide-in-from-top-5 duration-300">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <div>
              <p className="text-green-800 font-medium text-sm">{t('product_added')}</p>
              <p className="text-green-700 text-xs">{successMessage}</p>
            </div>
          </div>
        )}
        
        {isScanning ? (
          <div 
            id="barcode-scanner" 
            ref={scannerRef} 
            className="border-2 border-dashed border-border rounded-lg overflow-hidden relative h-52 bg-black"
          >
            <div className="absolute inset-0 z-10 pointer-events-none">
              {/* بديل مؤقت للكاميرا مقيد في Replit */}
              <div className="absolute top-1/2 left-0 w-full h-1 bg-red-500 opacity-70 animate-pulse"></div>
              <div className="absolute top-0 left-1/2 w-1 h-full bg-red-500 opacity-70 animate-pulse"></div>
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="p-2 rounded-full bg-black/50 backdrop-blur">
                  <ScanLine className="h-5 w-5 text-white animate-pulse" />
                </div>
              </div>
              
              <div className="absolute bottom-3 left-0 right-0 text-center text-sm text-white px-2 py-1 font-medium">
                <p className="text-center text-xs px-4 py-1 rounded-full bg-primary/80 backdrop-blur-sm inline-block">
                  {continueScanning 
                    ? t('scan_multiple_products') 
                    : t('position_barcode_in_frame')}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center mb-3 bg-muted/30">
            {cameraStatus === 'denied' ? (
              <div className="space-y-3">
                <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-1" />
                <p className="text-destructive font-medium text-sm">
                  {t('camera_access_denied')}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t('allow_camera_access')}
                </p>
              </div>
            ) : cameraStatus === 'requesting' ? (
              <div className="space-y-3">
                <RefreshCw className="h-8 w-8 mx-auto text-primary mb-1 animate-spin" />
                <p className="text-foreground font-medium text-sm">
                  {t('requesting_camera')}
                </p>
              </div>
            ) : (
              <>
                <div className="bg-primary/10 p-3 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-base font-medium gradient-heading mb-1">
                  {continueScanning 
                    ? t('scan_multiple_products_title') 
                    : t('scan_product_barcode')}
                </h3>
                <p className="text-muted-foreground text-xs mb-4">
                  {continueScanning 
                    ? t('scan_multiple_products_description') 
                    : t('position_barcode_in_frame')}
                </p>
                <Button
                  className="btn-glow"
                  onClick={startScanner}
                  size="sm"
                >
                  <Camera className={`h-4 w-4 ${rtl ? 'ml-2' : 'mr-2'}`} />
                  {t('activate_camera')}
                </Button>
                
                {!continueScanning && (
                  <div className="mt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleManualEntry}
                    >
                      <FileBarChart2 className={`h-4 w-4 ${rtl ? 'ml-2' : 'mr-2'}`} />
                      {t('use_test_barcode')}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        
        {error && (
          <Alert variant="destructive" className="mt-3 mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('error')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {scannedProduct && !continueScanning && (
          <div className="p-4 bg-muted/30 rounded-lg mt-3 shadow-sm border border-muted">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-lg">{scannedProduct.name}</h3>
                <p className="text-muted-foreground text-sm mt-1 flex items-center">
                  <QrCode className={`h-3.5 w-3.5 ${rtl ? 'ml-1.5' : 'mr-1.5'} text-primary/70`} />
                  {scannedProduct.barcode}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold gradient-text">
                  {formatCurrency(scannedProduct.sellingPrice)}
                </p>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button 
                onClick={handleAddToInvoice}
                className="btn-glow"
                size="sm"
              >
                {t('add_to_invoice')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      
      {isScanning && (
        <CardFooter className="flex justify-center p-3 border-t border-border">
          <Button 
            variant="outline"
            onClick={stopScanner}
            className="w-full"
            size="sm"
          >
            {t('cancel_scanning')}
          </Button>
        </CardFooter>
      )}
      
      {cameraStatus === 'denied' && !scannedProduct && (
        <CardFooter className="flex justify-center p-3 border-t border-border">
          <Button 
            variant="secondary"
            onClick={retryScanner}
            className="w-full"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${rtl ? 'ml-2' : 'mr-2'}`} />
            {t('retry')}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
