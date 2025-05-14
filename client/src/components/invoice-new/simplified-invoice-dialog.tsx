import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocale } from '@/hooks/use-locale';
import { useToast } from '@/hooks/use-toast';
import { 
  ReceiptText, Search, User, X, ShoppingCart, Check, Scan, ChevronRight,
  Printer, Plus, Minus, DollarSign, Percent, Package2, Calculator, Trash2,
  RefreshCcw, RotateCcw, ArrowLeft, CheckCircle, QrCode, Keyboard,
  CreditCard, Clock, Smartphone, MessageSquare, Tag as TagIcon, Percent as PercentIcon,
  Info as InfoIcon
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { apiRequest, queryClient } from '@/lib/queryClient';

// UI Components
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

// Custom Components
import BarcodeScanner from '@/components/barcode-scanner';
import InvoicePreview from '@/components/invoice-new/invoice-preview';

interface SimplifiedInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedProduct?: any;
}

export default function SimplifiedInvoiceDialog({
  open,
  onOpenChange,
  preSelectedProduct
}: SimplifiedInvoiceDialogProps) {
  const { t } = useTranslation();
  const { language } = useLocale();
  const isRtl = language === 'ar';
  const { toast } = useToast();
  
  // حالة العميل والمنتجات
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  // مرحلة إنشاء الفاتورة
  const [currentStep, setCurrentStep] = useState<'customer' | 'products' | 'confirmation'>('customer');
  
  // معلومات الدفع
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'deferred' | 'later'>('cash');
  const [invoiceDiscount, setInvoiceDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  
  // حالة معاينة الفاتورة
  const [showPreview, setShowPreview] = useState(false);
  const [newInvoiceId, setNewInvoiceId] = useState<number | null>(null);
  
  // استعلام للعملاء
  const { data: customers } = useQuery({
    queryKey: ['/api/customers'],
  });
  
  // استعلام للمنتجات
  const { data: products } = useQuery({
    queryKey: ['/api/products'],
  });

  // طلب إنشاء فاتورة جديدة
  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      const response = await apiRequest('POST', '/api/invoices', invoiceData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('invoice_creation_failed'));
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setNewInvoiceId(data.id);
      setShowPreview(true);
      toast({
        title: t('invoice_created'),
        description: t('invoice_created_success', { id: data.invoiceNumber }),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('invoice_creation_failed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // إعادة تعيين النموذج
  const resetForm = useCallback(() => {
    setSelectedCustomer(null);
    setSelectedProducts([]);
    setQuantity(1);
    setProductSearch('');
    setSelectedProduct(null);
    setPaymentMethod('cash');
    setInvoiceDiscount(0);
    setNotes('');
    setCurrentStep('customer');
    setShowPreview(false);
    setNewInvoiceId(null);
  }, []);

  // التعامل مع إغلاق النافذة
  const handleCloseDialog = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  // حساب المجاميع
  const calculateTotals = useCallback(() => {
    const subtotal = selectedProducts.reduce(
      (sum, item) => sum + item.quantity * item.sellingPrice,
      0
    );
    const total = Math.max(0, subtotal - invoiceDiscount);
    return { subtotal, total };
  }, [selectedProducts, invoiceDiscount]);

  // حساب الربح
  const calculateProfit = useCallback(() => {
    let totalProfit = selectedProducts.reduce(
      (sum, item) => sum + item.quantity * (item.sellingPrice - item.purchasePrice),
      0
    );
    
    // تقليل الربح بنسبة الخصم
    const { subtotal } = calculateTotals();
    if (subtotal > 0 && invoiceDiscount > 0) {
      const discountRatio = invoiceDiscount / subtotal;
      totalProfit = totalProfit * (1 - discountRatio);
    }
    
    return totalProfit;
  }, [selectedProducts, invoiceDiscount, calculateTotals]);

  // إضافة منتج للفاتورة
  const addProductToInvoice = useCallback(
    (product: any, qty: number = 1) => {
      if (!product) return;
      
      // التحقق من توفر الكمية
      if (product.stock !== null && product.stock !== undefined && product.stock < qty) {
        toast({
          title: t('insufficient_quantity'),
          description: t('quantity_exceeds_stock', { available: product.stock }),
          variant: 'destructive',
        });
        return;
      }
      
      setSelectedProducts((prev) => {
        // البحث عن المنتج إذا كان موجودًا بالفعل
        const existingProductIndex = prev.findIndex((p) => p.id === product.id);

        if (existingProductIndex >= 0) {
          // التحقق من توفر الكمية الإجمالية
          const newQty = prev[existingProductIndex].quantity + qty;
          if (
            product.stock !== null &&
            product.stock !== undefined &&
            product.stock < newQty
          ) {
            toast({
              title: t('insufficient_quantity'),
              description: t('total_quantity_exceeds_stock', {
                available: product.stock,
                current: prev[existingProductIndex].quantity,
              }),
              variant: 'destructive',
            });
            return prev;
          }

          // تحديث كمية المنتج الموجود
          const updatedProducts = [...prev];
          updatedProducts[existingProductIndex] = {
            ...updatedProducts[existingProductIndex],
            quantity: newQty,
          };
          return updatedProducts;
        } else {
          // إضافة منتج جديد
          return [
            ...prev,
            {
              ...product,
              quantity: qty,
            },
          ];
        }
      });

      // إعادة تعيين حقول البحث والكمية
      setSelectedProduct(null);
      setProductSearch('');
      setQuantity(1);
    },
    [t]
  );

  // معالجة مسح الباركود
  const handleBarcodeScanned = useCallback(
    (product: any) => {
      if (!product) {
        toast({
          title: t('product_not_found'),
          description: t('product_not_found_description'),
          variant: 'destructive',
        });
        return;
      }
      
      addProductToInvoice(product, 1);
      setBarcodeDialogOpen(false);
    },
    [addProductToInvoice, t]
  );

  // معالجة إدخال الباركود
  const handleBarcodeSearch = useCallback(
    async (barcode: string) => {
      if (!barcode || barcode.trim() === '') return;
      
      try {
        const response = await fetch(`/api/products/barcode/${barcode.trim()}`);
        if (!response.ok) {
          throw new Error(`${t('product_not_found')}: ${barcode}`);
        }
        
        const product = await response.json();
        addProductToInvoice(product, 1);
        setManualBarcode('');
      } catch (error) {
        toast({
          title: t('product_not_found'),
          description: barcode,
          variant: 'destructive',
        });
      }
    },
    [addProductToInvoice, t]
  );

  // معالجة ضغط Enter في حقل الباركود
  const handleBarcodeInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleBarcodeSearch(manualBarcode);
      }
    },
    [manualBarcode, handleBarcodeSearch]
  );

  // إزالة منتج من الفاتورة
  const removeProduct = useCallback((productId: number) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  // تغيير كمية منتج
  const updateProductQuantity = useCallback(
    (productId: number, newQuantity: number) => {
      if (newQuantity <= 0) {
        removeProduct(productId);
        return;
      }
      
      setSelectedProducts((prev) => {
        return prev.map((p) => {
          if (p.id === productId) {
            // التحقق من توفر الكمية
            if (p.stock !== null && p.stock !== undefined && p.stock < newQuantity) {
              toast({
                title: t('insufficient_quantity'),
                description: t('quantity_exceeds_stock', { available: p.stock }),
                variant: 'destructive',
              });
              return p;
            }
            
            return { ...p, quantity: newQuantity };
          }
          return p;
        });
      });
    },
    [removeProduct, t]
  );

  // إنشاء الفاتورة
  const handleCreateInvoice = useCallback(() => {
    if (!selectedCustomer) {
      toast({
        title: t('customer_required'),
        description: t('select_customer_to_proceed'),
        variant: 'destructive',
      });
      setCurrentStep('customer');
      return;
    }

    if (selectedProducts.length === 0) {
      toast({
        title: t('products_required'),
        description: t('add_products_to_proceed'),
        variant: 'destructive',
      });
      setCurrentStep('products');
      return;
    }

    const { subtotal, total } = calculateTotals();
    
    // تحضير بيانات الفاتورة
    const invoiceData = {
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      customerAddress: selectedCustomer.address,
      paymentMethod,
      subtotal,
      invoiceDiscount,
      total,
      notes,
      paymentStatus: paymentMethod === 'cash' ? 'paid' : paymentMethod === 'deferred' ? 'pending' : 'unpaid',
      products: selectedProducts.map((p) => ({
        productId: p.id,
        productName: p.name,
        quantity: p.quantity,
        unitPrice: p.sellingPrice,
        purchasePrice: p.purchasePrice,
        total: p.quantity * p.sellingPrice,
      })),
    };

    // إرسال البيانات إلى الخادم
    createInvoiceMutation.mutate(invoiceData);
  }, [
    selectedCustomer,
    selectedProducts,
    paymentMethod,
    invoiceDiscount,
    notes,
    calculateTotals,
    createInvoiceMutation,
    t,
  ]);

  // معالجة اختيار عميل
  const handleCustomerSelect = useCallback((customer: any) => {
    setSelectedCustomer(customer);
    setCurrentStep('products');
  }, []);

  // معالجة اختيار منتج
  const handleProductSelect = useCallback(
    (product: any) => {
      setSelectedProduct(product);
      if (product && quantity > 0) {
        addProductToInvoice(product, quantity);
      }
    },
    [quantity, addProductToInvoice]
  );

  // تأثير لمعالجة المنتج المحدد مسبقًا
  useEffect(() => {
    if (open && preSelectedProduct) {
      addProductToInvoice(preSelectedProduct);
    }
  }, [open, preSelectedProduct, addProductToInvoice]);

  // مكون خطوة اختيار العميل
  function CustomerStep() {
    const filteredCustomers = customers?.filter((customer: any) =>
      `${customer.name} ${customer.phone || ''}`
        .toLowerCase()
        .includes(customerSearch.toLowerCase())
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-medium">{t('select_customer')}</h2>
        </div>
        
        <div className="relative">
          <Input
            placeholder={t('search_customers')}
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="pl-10"
          />
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
        
        <ScrollArea className="h-[300px] rounded-md border border-border">
          <div className="space-y-2 p-2">
            {filteredCustomers?.length === 0 && (
              <div className="py-6 text-center text-muted-foreground">
                <span>{t('no_customers_found')}</span>
              </div>
            )}
            
            {filteredCustomers?.map((customer: any) => (
              <Card
                key={customer.id}
                className={`cursor-pointer hover:bg-accent transition-colors ${
                  selectedCustomer?.id === customer.id ? 'bg-primary/10 border-primary/30' : ''
                }`}
                onClick={() => handleCustomerSelect(customer)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {customer.name}
                        {selectedCustomer?.id === customer.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {customer.phone && (
                          <div className="text-sm text-muted-foreground flex items-center">
                            <Smartphone className="h-3 w-3 mr-1 text-muted-foreground" />
                            {customer.phone}
                          </div>
                        )}
                        {customer.totalDebt > 0 && (
                          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs">
                            {t('debt')}: {formatCurrency(customer.totalDebt)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 ${selectedCustomer?.id === customer.id ? 'bg-primary text-white hover:bg-primary/90 hover:text-white' : 'border border-primary/30 text-primary hover:bg-primary/10'}`}
                    >
                      {t('select')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // مكون خطوة اختيار المنتجات
  function ProductsStep() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-medium">{t('add_products')}</h2>
          </div>
          
          {selectedCustomer && (
            <div className="flex items-center text-sm text-muted-foreground">
              <User className="h-4 w-4 mr-1" />
              <span>{selectedCustomer.name}</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-2">
            <Popover>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Input
                    placeholder={t('search_products')}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-10"
                  />
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Command>
                  <CommandInput placeholder={t('search_products')} value={productSearch} onValueChange={setProductSearch} />
                  <CommandList>
                    <CommandEmpty>{t('no_products_found')}</CommandEmpty>
                    <CommandGroup>
                      {products?.filter((p: any) =>
                        p.name.toLowerCase().includes(productSearch.toLowerCase())
                      ).map((product: any) => (
                        <CommandItem
                          key={product.id}
                          onSelect={() => handleProductSelect(product)}
                          className="flex justify-between"
                        >
                          <span>{product.name}</span>
                          <span className="text-muted-foreground">
                            {formatCurrency(product.sellingPrice)}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24"
            />
            
            <Button 
              size="default" 
              variant="outline" 
              onClick={() => setBarcodeDialogOpen(true)}
              className="h-11 whitespace-nowrap bg-gradient-to-r from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 font-medium flex-1"
            >
              <Scan className="h-5 w-5 mr-2 text-amber-700" />
              {t('scan')}
            </Button>
          </div>
        </div>
        
        <div className="bg-card border rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">{t('external_barcode_scanner')}</h3>
          </div>
          <div className="flex gap-2">
            <Input
              ref={barcodeInputRef}
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              onKeyDown={handleBarcodeInputKeyDown}
              placeholder={t('barcode_placeholder')}
              className="flex-1"
            />
            <Button 
              onClick={() => handleBarcodeSearch(manualBarcode)}
              disabled={!manualBarcode.trim()}
              size="sm"
            >
              {t('add')}
            </Button>
          </div>
        </div>
        
        <div className="rounded-lg border">
          <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between border-b">
            <h3 className="font-medium">{t('invoice_items')}</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedProducts.reduce((sum, p) => sum + p.quantity, 0)} {t('items')}
              </span>
            </div>
          </div>
          
          <div className="divide-y">
            {selectedProducts.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>{t('no_products_added')}</p>
              </div>
            ) : (
              selectedProducts.map((product) => (
                <div key={product.id} className="p-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{product.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(product.sellingPrice)} × {product.quantity}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-right font-medium">
                      {formatCurrency(product.sellingPrice * product.quantity)}
                    </div>
                    
                    <div className="flex items-center border rounded-md">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-none border-r"
                        onClick={() => updateProductQuantity(product.id, product.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-10 text-center text-sm">{product.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-none border-l"
                        onClick={() => updateProductQuantity(product.id, product.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeProduct(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {selectedProducts.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('subtotal')}</span>
                <span>{formatCurrency(calculateTotals().subtotal)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  value={invoiceDiscount}
                  onChange={(e) => setInvoiceDiscount(parseFloat(e.target.value) || 0)}
                  placeholder={t('discount')}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">{t('discount')}</span>
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex items-center justify-between font-medium">
                <span>{t('total')}</span>
                <span className="text-lg">{formatCurrency(calculateTotals().total)}</span>
              </div>
            </div>
            
            <div className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label htmlFor="notes">{t('notes')}</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('invoice_notes_placeholder')}
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t('payment_method')}</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                    className={`${
                      paymentMethod === 'cash'
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'border-green-200 text-green-700 hover:bg-green-50'
                    }`}
                    onClick={() => setPaymentMethod('cash')}
                  >
                    <DollarSign className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                    {t('cash')}
                  </Button>
                  
                  <Button
                    variant={paymentMethod === 'deferred' ? 'default' : 'outline'}
                    className={`${
                      paymentMethod === 'deferred'
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                    }`}
                    onClick={() => setPaymentMethod('deferred')}
                  >
                    <Clock className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                    {t('deferred')}
                  </Button>
                  
                  <Button
                    variant={paymentMethod === 'later' ? 'default' : 'outline'}
                    className={`${
                      paymentMethod === 'later'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                    }`}
                    onClick={() => setPaymentMethod('later')}
                  >
                    <CreditCard className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                    {t('later')}
                  </Button>
                </div>
              </div>
              
              <div className="pt-2">
                <Button
                  className="w-full"
                  disabled={selectedProducts.length === 0 || createInvoiceMutation.isPending}
                  onClick={handleCreateInvoice}
                >
                  {createInvoiceMutation.isPending ? (
                    <>
                      <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                      {t('creating_invoice')}
                    </>
                  ) : (
                    <>
                      <CheckCircle className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                      {t('create_invoice')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // حوار ماسح الباركود
  return (
    <>
      {/* حوار ماسح الباركود */}
      <Dialog open={barcodeDialogOpen} onOpenChange={setBarcodeDialogOpen}>
        <DialogContent className="max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('scan_barcode')}</DialogTitle>
            <DialogDescription>{t('scan_barcode_description')}</DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center p-2">
            <div className="w-full max-w-xs">
              <BarcodeScanner onProductScanned={handleBarcodeScanned} />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBarcodeDialogOpen(false)}
              className="w-full"
            >
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-full sm:max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-gray-900/20 dark:to-gray-900/5">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-primary/20 to-blue-600/20 dark:from-primary/30 dark:to-blue-600/20 border-b border-primary/10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 text-transparent bg-clip-text">
              {currentStep === 'customer'
                ? t('create_new_invoice')
                : t('invoice_for_customer')}
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleCloseDialog}
              className="h-8 w-8 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6">
            {showPreview ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-green-600 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                    {t('invoice_created_successfully')}
                  </h2>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        resetForm();
                        setCurrentStep('customer');
                      }}
                    >
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      {t('new_invoice')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCloseDialog}
                    >
                      <X className="h-4 w-4 mr-2" />
                      {t('close')}
                    </Button>
                  </div>
                </div>
                
                {newInvoiceId && <InvoicePreview invoiceId={newInvoiceId} />}
              </div>
            ) : (
              <>
                {currentStep === 'customer' && <CustomerStep />}
                {currentStep === 'products' && <ProductsStep />}
              </>
            )}
          </div>
          
          {!showPreview && (
            <div className="p-4 border-t flex flex-wrap items-center justify-between gap-2">
              <div>
                {currentStep === 'products' && (
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentStep('customer')}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('back')}
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {currentStep === 'customer' && selectedCustomer && (
                  <Button onClick={() => setCurrentStep('products')}>
                    {t('continue')}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
                
                <Button variant="outline" onClick={handleCloseDialog}>
                  {t('cancel')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}