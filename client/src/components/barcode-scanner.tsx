import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { startBarcodeScanner, stopBarcodeScanner } from '@/lib/barcode';
import { formatCurrency } from '@/lib/utils';

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
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cleanup scanner when component unmounts
    return () => {
      if (isScanning) {
        stopBarcodeScanner();
      }
    };
  }, [isScanning]);

  const startScanner = () => {
    setError(null);
    setIsScanning(true);
    
    if (scannerRef.current) {
      const stopFn = startBarcodeScanner(
        'barcode-scanner',
        handleBarcodeDetected,
        (result) => {
          // Optional processing of scanning frames
          if (result && result.codeResult) {
            // Visualization processing
          }
        }
      );
      
      // Return cleanup function
      return stopFn;
    }
  };

  const stopScanner = () => {
    stopBarcodeScanner();
    setIsScanning(false);
  };

  const handleBarcodeDetected = async (result: any) => {
    if (result && result.codeResult && result.codeResult.code) {
      const barcode = result.codeResult.code;
      stopScanner();
      
      try {
        // In a real app, this would be an API call
        // For now, we'll simulate finding a product
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ScanLine className="mr-2 h-5 w-5" />
          {t('scan_barcode')}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {isScanning ? (
          <div 
            id="barcode-scanner" 
            ref={scannerRef} 
            className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg overflow-hidden relative h-64"
          >
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="w-full h-1 bg-red-500 opacity-70 animate-pulse"></div>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-6 text-center mb-4">
            <Camera className="h-12 w-12 mx-auto text-neutral-400 dark:text-neutral-500 mb-2" />
            <p className="text-neutral-600 dark:text-neutral-400">
              {t('click_to_scan_barcode')}
            </p>
            <Button
              className="mt-4"
              onClick={startScanner}
            >
              {t('activate_camera')}
            </Button>
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg mb-4">
            {error}
          </div>
        )}
        
        {scannedProduct && (
          <div className="p-4 bg-neutral-100 dark:bg-neutral-700 rounded-lg mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{scannedProduct.name}</h4>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {t('barcode')}: {scannedProduct.barcode}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(scannedProduct.sellingPrice)}
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button 
                variant="secondary"
                onClick={handleAddToInvoice}
              >
                {t('add_to_invoice')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      
      {isScanning && (
        <CardFooter className="flex justify-center">
          <Button 
            variant="outline"
            onClick={stopScanner}
            className="w-full"
          >
            {t('cancel_scanning')}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
