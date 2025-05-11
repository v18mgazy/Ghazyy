import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2, Search, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList 
} from '@/components/ui/command';
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import BarcodeScanner from '@/components/barcode-scanner';
import { formatCurrency } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  purchasePrice: number;
  stock: number;
  barcode: string;
  alternativeCode: string | null;
  sellingPrice: number;
}

interface DamagedItem {
  id?: string;
  productId: string;
  quantity: number;
  description: string;
  date: string;
  valueLoss: number;
}

interface DamagedItemFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (damagedItem: DamagedItem) => void;
  damagedItem?: DamagedItem;
  products: Product[];
  isLoading?: boolean;
}

export default function DamagedItemForm({ 
  open, 
  onClose, 
  onSave, 
  damagedItem, 
  products,
  isLoading = false 
}: DamagedItemFormProps) {
  const { t } = useTranslation();
  const isEditing = !!damagedItem?.id;
  
  const [formData, setFormData] = useState<DamagedItem>({
    productId: '',
    quantity: 1,
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    valueLoss: 0
  });
  
  // State for product selection and search
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  
  // State for barcode scanner
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  
  // Filter products based on search term
  const filteredProducts = productSearchTerm.trim() === '' 
    ? products 
    : products.filter(product => 
        product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        (product.barcode && product.barcode.toLowerCase().includes(productSearchTerm.toLowerCase())) ||
        (product.alternativeCode && product.alternativeCode.toLowerCase().includes(productSearchTerm.toLowerCase()))
      );

  // Initialize with existing damaged item if in edit mode
  useEffect(() => {
    if (damagedItem) {
      setFormData(damagedItem);
      const product = products.find(p => p.id === damagedItem.productId) || null;
      setSelectedProduct(product);
    } else {
      setFormData({
        productId: '',
        quantity: 1,
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        valueLoss: 0
      });
      setSelectedProduct(null);
    }
  }, [damagedItem, products, open]);

  // Auto-calculate value loss when product or quantity changes
  useEffect(() => {
    if (selectedProduct) {
      const loss = selectedProduct.purchasePrice * formData.quantity;
      setFormData(prev => ({
        ...prev,
        valueLoss: parseFloat(loss.toFixed(2))
      }));
    }
  }, [selectedProduct, formData.quantity]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    
    if (id === 'quantity') {
      const quantity = parseInt(value) || 1;
      setFormData({
        ...formData,
        quantity
      });
    } else {
      setFormData({
        ...formData,
        [id]: value
      });
    }
  };

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId) || null;
    setSelectedProduct(product);
    setFormData({
      ...formData,
      productId
    });
    setIsSelectOpen(false);
  };

  const handleProductScanned = (product: any) => {
    if (product) {
      setSelectedProduct(product);
      setFormData(prev => ({
        ...prev,
        productId: product.id
      }));
      setIsBarcodeOpen(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              {isEditing ? t('edit_damaged_item') : t('report_damaged_item')}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="productId" className="text-sm font-medium">
                {t('product')} <span className="text-destructive">*</span>
              </Label>
              
              <div className="relative">
                <Popover open={isSelectOpen} onOpenChange={setIsSelectOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isSelectOpen}
                      className="w-full justify-between"
                      disabled={isEditing}
                    >
                      {selectedProduct ? (
                        <span>{selectedProduct.name}</span>
                      ) : (
                        <span className="text-muted-foreground">{t('select_product')}</span>
                      )}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder={t('search_products_placeholder')} 
                        value={productSearchTerm}
                        onValueChange={setProductSearchTerm}
                      />
                      <CommandList>
                        <CommandEmpty>{t('no_products_found')}</CommandEmpty>
                        <CommandGroup>
                          <ScrollArea className="h-60">
                            {filteredProducts.map(product => (
                              <CommandItem
                                key={product.id}
                                value={product.id}
                                onSelect={() => handleProductChange(product.id)}
                              >
                                <div className="flex flex-col w-full">
                                  <span>{product.name}</span>
                                  <span className="text-xs text-muted-foreground mt-1">
                                    {t('barcode')}: {product.barcode} | {t('stock')}: {product.stock}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </ScrollArea>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                
                {!isEditing && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1"
                    onClick={() => setIsBarcodeOpen(true)}
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="quantity" className="text-sm font-medium">
                {t('quantity')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={selectedProduct?.stock || 999}
                value={formData.quantity}
                onChange={handleChange}
                required
              />
              {selectedProduct && formData.quantity > selectedProduct.stock && (
                <p className="text-destructive text-sm mt-1">
                  {t('quantity_exceeds_stock')}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="date" className="text-sm font-medium">
                {t('date')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="description" className="text-sm font-medium">
                {t('damage_description')}
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={handleChange}
                placeholder={t('describe_damage')}
                rows={3}
              />
            </div>
            
            <div className="p-4 bg-neutral-100 dark:bg-neutral-700 rounded-md">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">{t('value_loss')}:</Label>
                <span className="font-bold text-lg text-destructive">
                  {formatCurrency(formData.valueLoss)}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                {t('value_loss_description')}
              </p>
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
                disabled={
                  isLoading || 
                  !formData.productId || 
                  formData.quantity < 1 || 
                  (selectedProduct && formData.quantity > selectedProduct.stock)
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  t('save')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Dialog */}
      <Dialog open={isBarcodeOpen} onOpenChange={setIsBarcodeOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <QrCode className="mr-2 h-5 w-5" />
              {t('scan_barcode')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="my-2">
            <BarcodeScanner onProductScanned={handleProductScanned} />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsBarcodeOpen(false)}
            >
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}