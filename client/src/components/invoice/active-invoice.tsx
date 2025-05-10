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
    <Card ref={invoiceRef} className="mt-6 overflow-hidden border-2 border-primary/10">
      <CardHeader className="bg-primary/5 border-b border-primary/10">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <CardTitle className="flex items-center bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            <Receipt className="mr-2 h-6 w-6 text-primary" />
            {t('active_invoice')}
          </CardTitle>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm">
            <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full">
              <span className="font-medium">{t('date')}:</span>
              <span>{formatDate(invoiceDate, 'PPP', language)}</span>
            </div>
            <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full">
              <span className="font-medium">{t('invoice_number')}:</span>
              <span className="font-mono">{invoiceNumber}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-5">
        {/* Customer info */}
        <div className="mb-5 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/10 shadow-sm">
          <div className="flex flex-col md:flex-row md:justify-between gap-2">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="ml-3">
                <div className="text-sm font-semibold">{t('customer')}</div>
                <div className="font-medium">{customer.name}</div>
              </div>
            </div>
            <div className="flex flex-col md:items-end">
              <div className="text-sm font-semibold">{t('contact')}</div>
              <div className="flex items-center">
                <span className="font-medium">{customer.phone || t('not_provided')}</span>
              </div>
              {customer.address && (
                <div className="text-xs text-muted-foreground mt-1">{customer.address}</div>
              )}
            </div>
          </div>
        </div>
        
        {/* Add product - with enhanced UI */}
        <div className="mb-5">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <Label htmlFor="product-code" className="md:w-32 font-semibold text-primary">
              {t('add_product')}
            </Label>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary/60" size={16} />
              <Input
                id="product-code"
                type="text"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                placeholder={t('enter_product_code_or_scan')}
                className="pl-10 pr-10 border-primary/20 focus-visible:ring-primary/30"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-primary/60 hover:text-primary hover:bg-primary/5"
                onClick={onAddProduct}
              >
                <ScanBarcode className="h-5 w-5" />
              </Button>
            </div>
            <Button 
              variant="default" 
              size="icon" 
              className="bg-primary hover:bg-primary/90" 
              onClick={handleAddProduct}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Invoice items - enhanced with better styling */}
        <div className="mb-6 overflow-hidden rounded-lg border border-primary/20">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead className="font-bold">{t('product')}</TableHead>
                <TableHead className="font-bold">{t('price')}</TableHead>
                <TableHead className="font-bold">{t('quantity')}</TableHead>
                <TableHead className="font-bold">{t('total')}</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    <div className="flex flex-col items-center">
                      <Receipt className="h-12 w-12 mb-3 text-primary/20" />
                      <span>{t('no_items_added')}</span>
                      <span className="text-xs mt-1 text-muted-foreground">{t('add_product_message')}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <TableRow key={item.id} className={index % 2 === 0 ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <div className="font-medium">{item.product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.product.code || item.product.barcode}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(item.price)}</TableCell>
                    <TableCell>
                      <div className="flex items-center border rounded-md overflow-hidden bg-background">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-none border-r"
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
                          className="w-12 border-none text-center focus-visible:ring-0 focus-visible:ring-offset-0"
                          min="1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-none border-l"
                          onClick={() => updateItemQuantity(item.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">
                      {formatCurrency(item.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
          {/* Discount and payment options with improved styling */}
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/10 p-4">
              <h3 className="text-md font-semibold mb-3 flex items-center">
                <span className="inline-block w-5 h-5 bg-primary/20 rounded-full text-primary text-xs font-bold flex items-center justify-center mr-2">%</span>
                {t('discount')}
              </h3>
              <div className="flex">
                <Input
                  id="discount"
                  type="number"
                  value={discount || ''}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  placeholder={t('amount')}
                  className="w-2/3 rounded-r-none border-primary/20 focus-visible:ring-primary/20"
                  min="0"
                />
                <select
                  className="w-1/3 border border-primary/20 rounded-l-none rounded-r-md border-l-0 focus:ring-2 focus:ring-primary/30"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                >
                  <option value="percentage">%</option>
                  <option value="fixed">{formatCurrency(0).replace(/[0-9]/g, '')}</option>
                </select>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/10 p-4">
              <h3 className="text-md font-semibold mb-3 flex items-center">
                <span className="inline-block w-5 h-5 bg-primary/20 rounded-full text-primary text-xs font-bold flex items-center justify-center mr-2">$</span>
                {t('payment_method')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  className={`p-3 flex items-center justify-center ${
                    paymentMethod === 'cash' ? 'bg-green-600 hover:bg-green-700' : 'border-green-200 hover:border-green-300 hover:bg-green-50 hover:text-green-600'
                  } transition-all duration-200`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <div className="mr-2">💵</div>
                  {t('cash')}
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'visa' ? 'default' : 'outline'}
                  className={`p-3 flex items-center justify-center ${
                    paymentMethod === 'visa' ? 'bg-blue-600 hover:bg-blue-700' : 'border-blue-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'
                  } transition-all duration-200`}
                  onClick={() => setPaymentMethod('visa')}
                >
                  <div className="mr-2">💳</div>
                  {t('visa')}
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'ewallet' ? 'default' : 'outline'}
                  className={`p-3 flex items-center justify-center ${
                    paymentMethod === 'ewallet' ? 'bg-purple-600 hover:bg-purple-700' : 'border-purple-200 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-600'
                  } transition-all duration-200`}
                  onClick={() => setPaymentMethod('ewallet')}
                >
                  <div className="mr-2">📱</div>
                  {t('e_wallet')}
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'deferred' ? 'default' : 'outline'}
                  className={`p-3 flex items-center justify-center ${
                    paymentMethod === 'deferred' ? 'bg-amber-600 hover:bg-amber-700' : 'border-amber-200 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600'
                  } transition-all duration-200`}
                  onClick={() => setPaymentMethod('deferred')}
                >
                  <div className="mr-2">📅</div>
                  {t('deferred')}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Totals and actions with gradient and shadows */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/90 dark:to-slate-800/80 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-md">
            <h3 className="text-lg font-bold mb-4 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center">
              <Receipt className="mr-2 h-5 w-5 text-primary" />
              {t('invoice_summary')}
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('subtotal')}:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('discount')}:</span>
                <span className="font-medium text-destructive">
                  -{formatCurrency(discountType === 'percentage' ? (subtotal * discount) / 100 : discount)}
                </span>
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between pt-1">
                <span className="font-semibold text-lg">{t('total')}:</span>
                <span className="font-bold text-xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-8">
              <Button
                variant="outline"
                className="flex items-center gap-2 justify-center p-5 hover:bg-primary/5 transition-all"
                onClick={handlePrint}
                disabled={items.length === 0 || isProcessing}
              >
                <Printer className="h-5 w-5" /> 
                <span className="font-medium">{t('print')}</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 justify-center p-5 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all"
                onClick={handleShareWhatsApp}
                disabled={!customer.phone || items.length === 0 || isProcessing}
              >
                <MessageSquareShare className="h-5 w-5" /> 
                <span className="font-medium">{t('share')}</span>
              </Button>
              <Button
                className="col-span-2 mt-3 p-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-md transition-all"
                onClick={handleCompleteSale}
                disabled={items.length === 0 || isProcessing}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="font-medium">{t('processing')}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Receipt className="h-5 w-5" />
                    <span className="font-medium">{t('complete_sale')}</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
