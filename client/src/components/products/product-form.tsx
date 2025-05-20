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
  const [detectedBarcodeValue, setDetectedBarcodeValue] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDetectedBarcodeValue(null);

      if (product) {
        setFormData(product);
        setBarcodeMethod('manual');
      } else {
        setFormData({
          name: '',
          barcode: generateBarcodeNumber('code128'),
          alternativeCode: '',
          purchasePrice: 0,
          sellingPrice: 0,
          stock: 0
        });
        setBarcodeMethod('generate');
      }
    }
  }, [product, open]);

  useEffect(() => {
    if (detectedBarcodeValue) {
      setFormData(prevData => ({
        ...prevData,
        barcode: detectedBarcodeValue
      }));
    }
  }, [detectedBarcodeValue]);

  useEffect(() => {
    return () => {
      cleanupScanner();
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
    setScannerError(null);
    setCameraStatus('requesting');
    setIsScanning(true);

    setTimeout(() => {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
          setCameraStatus('ready');

          setTimeout(() => {
            if (scannerRef.current) {
              startBarcodeScanner(
                'barcode-scanner-product',
                (result) => handleBarcodeDetection(result),
                (result) => {
                  if (result && result.codeResult) {
                    // Optional frame processing
                  }
                }
              );
            } else {
              setCameraStatus('idle');
              setIsScanning(false);
              setScannerError(t('scanner_initialization_failed'));
            }
          }, 500);
        })
        .catch(err => {
          setCameraStatus('denied');
          setIsScanning(false);
          setScannerError(t('camera_access_denied'));
        });
    }, 100);
  };

  const stopScanner = () => {
    cleanupScanner();
    setCameraStatus('idle');
    setIsScanning(false);
  };

  const handleBarcodeDetection = (result: any) => {
    if (result && result.codeResult && result.codeResult.code) {
      const detectedBarcode = result.codeResult.code;

      stopScanner();

      toast({
        title: t('barcode_scanned_successfully'),
        description: detectedBarcode
      });

      setDetectedBarcodeValue(detectedBarcode);
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
      const updatedFormData = {
        ...formData,
        [id]: value
      };

      if (id === 'barcode' && value.trim() === '') {
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
  };

  const prepareScanBarcode = () => {
    setBarcodeMethod('scan');
    setTimeout(() => {
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
      <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="px-0 sm:px-0">
          <DialogTitle className="flex items-center text-lg sm:text-xl">
            <QrCode className="mr-2 h-5 w-5" />
            {isEditing ? t('edit_product') : t('add_new_product')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                {t('product_name')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full"
              />
            </div>

            <div>
              <Label htmlFor="alternativeCode" className="text-sm font-medium">
                {t('alternative_code')}
              </Label>
              <Input
                id="alternativeCode"
                value={formData.alternativeCode || ''}
                onChange={handleChange}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
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
                  className="w-full"
                />
              </div>

              <div>
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
                  className="w-full"
                />
              </div>

              <div>
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
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
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
                    <RefreshCw className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">{t('auto_generate')}</span>
                  </Button>
                  <Button
                    type="button"
                    variant={barcodeMethod === 'manual' ? "default" : "ghost"}
                    size="sm"
                    onClick={enableManualBarcode}
                    className={`rounded-none ${barcodeMethod === 'manual' ? 'bg-primary text-primary-foreground' : ''}`}
                    title={t('manual_entry')}
                  >
                    <Edit2 className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">{t('manual_entry')}</span>
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
                    <Camera className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">{t('scan_existing')}</span>
                  </Button>
                </div>
              </div>

              {barcodeMethod === 'generate' ? (
                <div className="relative">
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    readOnly
                    className="bg-muted pr-10 w-full"
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
                    className="bg-background w-full"
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
                    className="bg-muted w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {isScanning ? t('scanning_barcode') : t('scanned_barcode_manual_edit')}
                  </p>
                </div>
              )}
            </div>

            {isScanning && (
              <div className="mt-2">
                <div 
                  id="barcode-scanner-product" 
                  ref={scannerRef} 
                  className="border-2 border-dashed border-border rounded-lg overflow-hidden relative h-48 sm:h-64 bg-black"
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
              <div>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('error')}</AlertTitle>
                  <AlertDescription>{scannerError}</AlertDescription>
                </Alert>
              </div>
            )}

            <div className="flex justify-center overflow-x-auto">
              <div 
                className="border border-neutral-200 dark:border-neutral-700 p-2 rounded-md max-w-full"
                dangerouslySetInnerHTML={{ __html: barcodeSvg }}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {t('cancel')}
            </Button>
            <Button 
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto"
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