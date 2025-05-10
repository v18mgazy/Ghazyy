import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, ScanLine, QrCode, AlertCircle, RefreshCw, FileBarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { startBarcodeScanner, stopBarcodeScanner } from '@/lib/barcode';
import { formatCurrency } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useLocale } from '@/hooks/use-locale';

interface Product {
  id: string;
  name: string;
  barcode: string;
  sellingPrice: number;
}

interface BarcodeScannerProps {
  onProductScanned: (product: Product) => void;
}

export default function BarcodeScanner({ onProductScanned }: BarcodeScannerProps) {
  const { t } = useTranslation();
  const { language } = useLocale();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'requesting' | 'denied' | 'ready'>('idle');
  const scannerRef = useRef<HTMLDivElement>(null);
  const rtl = language === 'ar';

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
      stopScanner();
      
      try {
        console.log('Barcode detected:', barcode);
        // في التطبيق الحقيقي، هذا سيكون نداء API
        // للآن، سنحاكي العثور على منتج
        const mockProduct = {
          id: '123',
          name: 'Samsung Galaxy S21',
          barcode: barcode,
          sellingPrice: 899.99
        };
        
        setScannedProduct(mockProduct);
      } catch (err) {
        setError(t('product_not_found'));
        console.error('Error finding product:', err);
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

  // استخدم باركود وهمي للاختبار
  const handleManualEntry = () => {
    const testBarcode = '1234567890123';
    const mockProduct = {
      id: '123',
      name: 'Samsung Galaxy S21',
      barcode: testBarcode,
      sellingPrice: 899.99
    };
    
    setScannedProduct(mockProduct);
  };

  return (
    <Card className="card-hover">
      <CardHeader className="bg-primary/5 border-b border-border">
        <CardTitle className="flex items-center">
          <QrCode className={`${rtl ? 'ml-2' : 'mr-2'} h-5 w-5 text-primary`} />
          <span className="gradient-heading">{t('scan_barcode')}</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 md:p-6">
        {isScanning ? (
          <div 
            id="barcode-scanner" 
            ref={scannerRef} 
            className="border-2 border-dashed border-border rounded-lg overflow-hidden relative h-64 bg-black"
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
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center mb-4 bg-muted/30">
            {cameraStatus === 'denied' ? (
              <div className="space-y-4">
                <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-2" />
                <p className="text-destructive font-medium">
                  {t('camera_access_denied')}
                </p>
                <p className="text-muted-foreground text-sm">
                  {t('allow_camera_access')}
                </p>
              </div>
            ) : cameraStatus === 'requesting' ? (
              <div className="space-y-4">
                <RefreshCw className="h-12 w-12 mx-auto text-primary mb-2 animate-spin" />
                <p className="text-foreground font-medium">
                  {t('requesting_camera')}
                </p>
              </div>
            ) : (
              <>
                <div className="bg-primary/10 p-4 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                  <Camera className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-medium gradient-heading mb-2">
                  {t('scan_product_barcode')}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {t('position_barcode_in_frame')}
                </p>
                <Button
                  className="btn-glow"
                  onClick={startScanner}
                >
                  <Camera className={`h-4 w-4 ${rtl ? 'ml-2' : 'mr-2'}`} />
                  {t('activate_camera')}
                </Button>
                
                <div className="mt-4 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={handleManualEntry}
                    size="sm"
                    className="text-xs"
                  >
                    <FileBarChart2 className={`h-3.5 w-3.5 ${rtl ? 'ml-1' : 'mr-1'}`} />
                    {t('use_test_barcode')}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
        
        {error && (
          <Alert variant="destructive" className="mt-4 mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('error')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {scannedProduct && (
          <div className="p-5 bg-muted/30 rounded-lg mt-4 shadow-sm border border-muted">
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
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={handleAddToInvoice}
                className="btn-glow"
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
          >
            <RefreshCw className={`h-4 w-4 ${rtl ? 'ml-2' : 'mr-2'}`} />
            {t('retry')}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
