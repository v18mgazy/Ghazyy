import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  purchasePrice: number;
  stock: number;
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

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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

  useEffect(() => {
    // Auto-calculate value loss when product or quantity changes
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
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
            <Select
              value={formData.productId}
              onValueChange={handleProductChange}
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('select_product')} />
              </SelectTrigger>
              <SelectContent>
                {products.map(product => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} ({t('stock')}: {product.stock})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
  );
}
