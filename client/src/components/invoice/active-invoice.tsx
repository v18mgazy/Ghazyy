import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, Trash2, Save, FileCheck, Banknote, CreditCard, Scan, 
  ReceiptText, CheckSquare, X, Calendar 
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  isPotential: boolean;
}

interface Product {
  id: string;
  name: string;
  barcode?: string;
  sellingPrice: number;
  quantity: number;
  discount?: number;
}

interface ActiveInvoiceProps {
  customer: Customer;
  onClose: () => void;
  onAddProduct: () => void;
}

export default function ActiveInvoice({ customer, onClose, onAddProduct }: ActiveInvoiceProps) {
  const { t } = useTranslation();
  const { language } = useLocale();
  const isRtl = language === 'ar';
  
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    `INV-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  
  const addProduct = () => {
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      name: '',
      sellingPrice: 0,
      quantity: 1
    };
    setProducts([...products, newProduct]);
  };
  
  const updateProduct = (index: number, field: keyof Product, value: any) => {
    const updatedProducts = [...products];
    updatedProducts[index] = { 
      ...updatedProducts[index], 
      [field]: field === 'sellingPrice' || field === 'quantity' || field === 'discount' 
        ? Number(value) || 0 
        : value 
    };
    setProducts(updatedProducts);
  };
  
  const removeProduct = (index: number) => {
    const updatedProducts = [...products];
    updatedProducts.splice(index, 1);
    setProducts(updatedProducts);
  };
  
  // حساب المجموع الفرعي (قبل الخصم)
  const subtotal = products.reduce((sum, product) => {
    return sum + (product.sellingPrice * product.quantity);
  }, 0);
  
  // حساب مجموع الخصومات
  const totalDiscount = products.reduce((sum, product) => {
    const discount = product.discount || 0;
    return sum + (product.sellingPrice * product.quantity * discount / 100);
  }, 0);
  
  // حساب الإجمالي النهائي
  const total = subtotal - totalDiscount;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // هنا يمكنك إرسال الفاتورة إلى الخادم
    console.log({
      invoiceNumber,
      customer,
      products,
      subtotal,
      totalDiscount,
      total,
      notes,
      paymentMethod,
      date: invoiceDate
    });
    
    onClose();
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* معلومات الفاتورة */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{customer.name}</h3>
              <p className="text-sm text-muted-foreground">{customer.phone || t('no_phone_number')}</p>
            </div>
          </div>
          {customer.address && (
            <p className="text-sm text-muted-foreground mt-1">{customer.address}</p>
          )}
        </div>
        
        <div className="space-y-3 min-w-[200px]">
          <div className="flex items-center gap-2">
            <Label htmlFor="invoice-number" className="w-24 text-muted-foreground">
              {t('invoice_number')}:
            </Label>
            <Input
              id="invoice-number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="flex-1"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Label htmlFor="invoice-date" className="w-24 text-muted-foreground">
              {t('date')}:
            </Label>
            <div className="relative flex-1">
              <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="invoice-date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* قائمة المنتجات */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-lg">{t('products')}</h3>
          <div className="flex gap-2">
            <Button 
              type="button" 
              size="sm" 
              variant="outline"
              onClick={onAddProduct}
            >
              <Scan className="mr-1 h-4 w-4" />
              {t('scan_barcode')}
            </Button>
            <Button 
              type="button" 
              size="sm" 
              onClick={addProduct}
            >
              <Plus className="mr-1 h-4 w-4" />
              {t('add_product')}
            </Button>
          </div>
        </div>
        
        {products.length === 0 ? (
          <div className="text-center p-6 border border-dashed rounded-md text-muted-foreground">
            {t('no_products_added')}
          </div>
        ) : (
          <div className="space-y-3">
            {/* رؤوس الجدول */}
            <div className="grid grid-cols-12 gap-2 px-2 text-sm font-medium text-muted-foreground">
              <div className="col-span-5">{t('product')}</div>
              <div className="col-span-2 text-center">{t('price')}</div>
              <div className="col-span-2 text-center">{t('quantity')}</div>
              <div className="col-span-2 text-center">{t('discount')} %</div>
              <div className="col-span-1"></div>
            </div>
            
            {/* المنتجات */}
            {products.map((product, index) => (
              <Card key={product.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Input
                        value={product.name}
                        onChange={(e) => updateProduct(index, 'name', e.target.value)}
                        placeholder={t('product_name')}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={product.sellingPrice || ''}
                        onChange={(e) => updateProduct(index, 'sellingPrice', e.target.value)}
                        placeholder="0.00"
                        className="text-center"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={product.quantity}
                        onChange={(e) => updateProduct(index, 'quantity', e.target.value)}
                        min="1"
                        className="text-center"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={product.discount || ''}
                        onChange={(e) => updateProduct(index, 'discount', e.target.value)}
                        placeholder="0"
                        min="0"
                        max="100"
                        className="text-center"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeProduct(index)}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* الملاحظات */}
      <div>
        <Label htmlFor="notes" className="mb-2 block">
          {t('notes')}
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('invoice_notes_placeholder')}
          className="resize-none"
          rows={3}
        />
      </div>
      
      {/* المجاميع */}
      <Card className="border-none bg-muted/50">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('subtotal')}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('discount')}</span>
              <span>{formatCurrency(totalDiscount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium text-lg">
              <span>{t('total')}</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* طرق الدفع */}
      <div className="space-y-3">
        <Label className="block">
          {t('payment_method')}
        </Label>
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            type="button"
            variant={paymentMethod === 'cash' ? 'default' : 'outline'}
            className={`flex items-center gap-2 ${paymentMethod === 'cash' ? 'bg-success text-white hover:bg-success/90' : ''}`}
            onClick={() => setPaymentMethod('cash')}
          >
            <Banknote className="h-4 w-4" />
            {t('cash')}
          </Button>
          
          <Button
            type="button"
            variant={paymentMethod === 'card' ? 'default' : 'outline'}
            className={`flex items-center gap-2 ${paymentMethod === 'card' ? 'bg-info text-white hover:bg-info/90' : ''}`}
            onClick={() => setPaymentMethod('card')}
          >
            <CreditCard className="h-4 w-4" />
            {t('card')}
          </Button>
          
          <Button
            type="button"
            variant={paymentMethod === 'check' ? 'default' : 'outline'}
            className={`flex items-center gap-2 ${paymentMethod === 'check' ? 'bg-warning text-white hover:bg-warning/90' : ''}`}
            onClick={() => setPaymentMethod('check')}
          >
            <CheckSquare className="h-4 w-4" />
            {t('check')}
          </Button>
          
          <Button
            type="button"
            variant={paymentMethod === 'later' ? 'default' : 'outline'}
            className={`flex items-center gap-2 ${paymentMethod === 'later' ? 'bg-destructive text-white hover:bg-destructive/90' : ''}`}
            onClick={() => setPaymentMethod('later')}
          >
            <FileCheck className="h-4 w-4" />
            {t('pay_later')}
          </Button>
        </div>
      </div>
      
      {/* أزرار التحكم */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >
          <X className="mr-1 h-4 w-4" />
          {t('cancel')}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          className="border-primary text-primary hover:bg-primary/10"
        >
          <Save className="mr-1 h-4 w-4" />
          {t('save_draft')}
        </Button>
        
        <Button
          type="submit"
          className="bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700"
        >
          <ReceiptText className="mr-1 h-4 w-4" />
          {t('create_invoice')}
        </Button>
      </div>
    </form>
  );
}