import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Receipt, Search, Trash2, Plus, Minus, Printer, ScanBarcode, 
  MessageSquareShare, Loader2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuthContext } from '@/context/auth-context';
import { useLocale } from '@/hooks/use-locale';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  formatCurrency, formatDate, calculateTotal, generateInvoiceNumber,
  calculateInvoiceTotal, createWhatsAppLink
} from '@/lib/utils';

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
  barcode: string;
  code?: string;
  purchasePrice: number;
  sellingPrice: number;
}

interface InvoiceItem {
  id: string;
  product: Product;
  quantity: number;
  price: number;
  total: number;
}

interface ActiveInvoiceProps {
  customer: Customer;
  onClose: () => void;
  onAddProduct: () => void;
}

export default function ActiveInvoice({ 
  customer, 
  onClose,
  onAddProduct
}: ActiveInvoiceProps) {
  const { t } = useTranslation();
  const { language } = useLocale();
  const { user } = useAuthContext();
  const invoiceRef = React.useRef<HTMLDivElement>(null);
  
  const [invoiceNumber] = useState(generateInvoiceNumber());
  const [invoiceDate] = useState(new Date());
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [productCode, setProductCode] = useState('');
  const [subtotal, setSubtotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [total, setTotal] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'visa' | 'ewallet' | 'deferred'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Calculate subtotal whenever items change
    const newSubtotal = items.reduce((sum, item) => sum + item.total, 0);
    setSubtotal(newSubtotal);
  }, [items]);

  useEffect(() => {
    // Calculate total whenever subtotal or discount changes
    let discountAmount = discount;
    if (discountType === 'percentage') {
      discountAmount = (subtotal * discount) / 100;
    }
    const newTotal = calculateInvoiceTotal(subtotal, discountAmount);
    setTotal(newTotal);
  }, [subtotal, discount, discountType]);

  const handleAddProduct = () => {
    if (!productCode.trim()) {
      onAddProduct(); // Open the scanner or product selection
      return;
    }

    // In a real app, fetch the product by code or barcode
    // For demo, create a mock product
    const mockProduct: Product = {
      id: 'prod-' + Date.now().toString(),
      name: 'Sample Product',
      barcode: '8590123456789',
      code: productCode,
      purchasePrice: 10,
      sellingPrice: 19.99
    };

    const newItem: InvoiceItem = {
      id: 'item-' + Date.now().toString(),
      product: mockProduct,
      quantity: 1,
      price: mockProduct.sellingPrice,
      total: mockProduct.sellingPrice
    };

    setItems([...items, newItem]);
    setProductCode('');
  };

  const handleProductScanned = (product: Product) => {
    // Add scanned product to invoice
    const existingItemIndex = items.findIndex(item => item.product.id === product.id);
    
    if (existingItemIndex >= 0) {
      // Increase quantity if product already exists
      const updatedItems = [...items];
      const item = updatedItems[existingItemIndex];
      item.quantity += 1;
      item.total = calculateTotal(item.price, item.quantity);
      setItems(updatedItems);
    } else {
      // Add new item
      const newItem: InvoiceItem = {
        id: 'item-' + Date.now().toString(),
        product,
        quantity: 1,
        price: product.sellingPrice,
        total: product.sellingPrice
      };
      setItems([...items, newItem]);
    }
  };

  const updateItemQuantity = (itemId: string, delta: number) => {
    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return {
          ...item,
          quantity: newQuantity,
          total: calculateTotal(item.price, newQuantity)
        };
      }
      return item;
    });
    setItems(updatedItems);
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  const handleDiscountChange = (value: string) => {
    const numericValue = parseFloat(value) || 0;
    setDiscount(numericValue);
  };

  const handlePrint = async () => {
    if (!invoiceRef.current) return;
    
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`invoice-${invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!customer.phone || !invoiceRef.current) return;
    
    try {
      setIsProcessing(true);
      
      // Generate PDF
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // In a real app, you'd upload this PDF to a server or Firebase Storage
      // Then create a shareable link to send via WhatsApp
      
      // For demo purposes, we'll just create a WhatsApp message
      const message = `${t('invoice_whatsapp_message', { 
        invoiceNumber, 
        total: formatCurrency(total),
        date: formatDate(invoiceDate, 'PP', language)
      })}`;
      
      const whatsappLink = createWhatsAppLink(customer.phone, message);
      window.open(whatsappLink, '_blank');
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteSale = async () => {
    if (items.length === 0) return;
    
    try {
      setIsProcessing(true);
      
      // In a real app, this would send the invoice data to the server
      const invoiceData = {
        invoiceNumber,
        date: invoiceDate,
        customer,
        items,
        subtotal,
        discount: discountType === 'percentage' ? (subtotal * discount) / 100 : discount,
        total,
        paymentMethod,
        userId: user?.id || ''
      };
      
      console.log('Completing sale with data:', invoiceData);
      
      // Check if deferred payment needs approval
      if (paymentMethod === 'deferred') {
        // In a real app, this would create a payment approval request
        console.log('Requesting approval for deferred payment');
        
        // Simulate waiting for approval
        setTimeout(() => {
          setIsProcessing(false);
          // Close the invoice after successful completion
          onClose();
        }, 1500);
      } else {
        // Simulate processing time
        setTimeout(() => {
          setIsProcessing(false);
          // Close the invoice after successful completion
          onClose();
        }, 1000);
      }
    } catch (error) {
      console.error('Error completing sale:', error);
      setIsProcessing(false);
    }
  };

  return (
    <Card ref={invoiceRef} className="mt-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            <Receipt className="mr-2 h-5 w-5" />
            {t('active_invoice')}
          </CardTitle>
          <div>
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {t('date')}: {formatDate(invoiceDate, 'PP', language)}
            </span>
            <span className="text-sm text-neutral-600 dark:text-neutral-400 ml-4">
              {t('invoice_number')}: {invoiceNumber}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Customer info */}
        <div className="mb-4 p-3 bg-neutral-100 dark:bg-neutral-700 rounded-md">
          <div className="flex justify-between">
            <div>
              <span className="text-sm font-medium">{t('customer')}:</span>
              <span className="text-sm ml-1">{customer.name}</span>
            </div>
            <div>
              <span className="text-sm font-medium">{t('phone')}:</span>
              <span className="text-sm ml-1">{customer.phone || t('not_provided')}</span>
            </div>
          </div>
        </div>
        
        {/* Add product */}
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <Label htmlFor="product-code" className="mr-2">{t('add_product')}</Label>
            <div className="relative flex-1">
              <Input
                id="product-code"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                placeholder={t('enter_product_code_or_scan')}
                className="w-full pr-10"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 text-neutral-500"
                onClick={onAddProduct}
              >
                <ScanBarcode className="h-5 w-5" />
              </Button>
            </div>
            <Button variant="default" size="icon" className="ml-2" onClick={handleAddProduct}>
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Invoice items */}
        <div className="overflow-x-auto mb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('product')}</TableHead>
                <TableHead>{t('price')}</TableHead>
                <TableHead>{t('quantity')}</TableHead>
                <TableHead>{t('total')}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-neutral-500">
                    {t('no_items_added')}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.product.name}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {t('code')}: {item.product.code || item.product.barcode}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(item.price)}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateItemQuantity(item.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const qty = parseInt(e.target.value) || 1;
                            updateItemQuantity(item.id, qty - item.quantity);
                          }}
                          className="w-14 mx-1 p-1 text-center"
                          min="1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateItemQuantity(item.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(item.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive/90"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Discount and payment options */}
          <div>
            <div className="mb-4">
              <Label htmlFor="discount">{t('discount')} ({t('optional')})</Label>
              <div className="flex">
                <Input
                  id="discount"
                  type="number"
                  value={discount || ''}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  placeholder={t('amount')}
                  className="w-1/2 rounded-r-none"
                  min="0"
                />
                <select
                  className="w-1/2 p-2 border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 rounded-l-none rounded-r-md border-l-0 focus:ring-2 focus:ring-primary focus:border-primary"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                >
                  <option value="percentage">{t('percentage')} (%)</option>
                  <option value="fixed">{t('fixed_amount')}</option>
                </select>
              </div>
            </div>
            
            <div className="mb-4">
              <Label>{t('payment_method')}</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Button
                  type="button"
                  variant={paymentMethod === 'cash' ? 'outline' : 'ghost'}
                  className={`p-2 flex items-center justify-center ${
                    paymentMethod === 'cash' ? 'border-primary text-primary' : ''
                  }`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <div className="mr-1">💵</div>
                  {t('cash')}
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'visa' ? 'outline' : 'ghost'}
                  className={`p-2 flex items-center justify-center ${
                    paymentMethod === 'visa' ? 'border-primary text-primary' : ''
                  }`}
                  onClick={() => setPaymentMethod('visa')}
                >
                  <div className="mr-1">💳</div>
                  {t('visa')}
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'ewallet' ? 'outline' : 'ghost'}
                  className={`p-2 flex items-center justify-center ${
                    paymentMethod === 'ewallet' ? 'border-primary text-primary' : ''
                  }`}
                  onClick={() => setPaymentMethod('ewallet')}
                >
                  <div className="mr-1">📱</div>
                  {t('e_wallet')}
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'deferred' ? 'outline' : 'ghost'}
                  className={`p-2 flex items-center justify-center ${
                    paymentMethod === 'deferred' ? 'border-primary text-primary' : ''
                  }`}
                  onClick={() => setPaymentMethod('deferred')}
                >
                  <div className="mr-1">📅</div>
                  {t('deferred')}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Totals and actions */}
          <div className="bg-neutral-100 dark:bg-neutral-700 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-neutral-600 dark:text-neutral-400">{t('subtotal')}:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-neutral-600 dark:text-neutral-400">{t('discount')}:</span>
              <span className="font-medium text-destructive">
                -{formatCurrency(discountType === 'percentage' ? (subtotal * discount) / 100 : discount)}
              </span>
            </div>
            <Separator className="my-2 bg-neutral-200 dark:bg-neutral-600" />
            <div className="flex justify-between pt-2">
              <span className="font-medium">{t('total')}:</span>
              <span className="font-bold text-lg">{formatCurrency(total)}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-6">
              <Button
                variant="outline"
                className="flex items-center justify-center"
                onClick={handlePrint}
                disabled={items.length === 0 || isProcessing}
              >
                <Printer className="mr-1 h-4 w-4" /> {t('print')}
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-center"
                onClick={handleShareWhatsApp}
                disabled={!customer.phone || items.length === 0 || isProcessing}
              >
                <MessageSquareShare className="mr-1 h-4 w-4" /> {t('share')}
              </Button>
              <Button
                className="col-span-2 mt-2"
                variant="secondary"
                onClick={handleCompleteSale}
                disabled={items.length === 0 || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('processing')}
                  </>
                ) : (
                  t('complete_sale')
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
