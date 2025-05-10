import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, RefreshCw, Loader2, QrCode } from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generateBarcodeNumber, generateBarcodeSVG } from '@/lib/utils';

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
  const isEditing = !!product?.id;
  
  const [formData, setFormData] = useState<Product>({
    name: '',
    barcode: generateBarcodeNumber(),
    alternativeCode: '',
    purchasePrice: 0,
    sellingPrice: 0,
    stock: 0
  });

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
  }, [product, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    
    if (id === 'purchasePrice' || id === 'sellingPrice' || id === 'stock') {
      setFormData({
        ...formData,
        [id]: parseFloat(value) || 0
      });
    } else {
      setFormData({
        ...formData,
        [id]: value
      });
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
                {t('barcode')} ({t('auto_generated')})
              </Label>
              <div className="flex">
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={handleChange}
                  className="flex-1 rounded-r-none"
                  readOnly={!isEditing}
                />
                <Button
                  type="button"
                  className="rounded-l-none"
                  onClick={generateNewBarcode}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {t('barcode_auto_generated_info')}
              </p>
            </div>
            
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
