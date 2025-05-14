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
  Info as InfoIcon, Phone, Building, BadgePercent
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
    const filteredCustomers = Array.isArray(customers) ? customers.filter((customer: any) =>
      `${customer.name} ${customer.phone || ''}`
        .toLowerCase()
        .includes(customerSearch.toLowerCase())
    ) : [];

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-gradient-to-r from-primary to-blue-600 p-2.5 rounded-full shadow-sm">
            <User className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 text-transparent bg-clip-text">
            {t('select_customer')}
          </h2>
        </div>
        
        <div className="relative mb-4">
          <Input
            placeholder={t('search_customers')}
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="pl-10 border-blue-200 focus-visible:ring-blue-500 shadow-sm"
          />
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
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
                className={`cursor-pointer transition-all shadow-sm hover:shadow-md ${
                  selectedCustomer?.id === customer.id 
                  ? 'bg-gradient-to-r from-primary/10 to-blue-100 dark:from-primary/20 dark:to-blue-900/20 border-primary' 
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
                onClick={() => handleCustomerSelect(customer)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        <div className="bg-slate-100 dark:bg-slate-700 p-1.5 rounded-full">
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-lg">{customer.name}</span>
                        {selectedCustomer?.id === customer.id && (
                          <Badge className="bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600">
                            {t('selected')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2 ml-7">
                        {customer.phone && (
                          <div className="text-sm text-muted-foreground flex items-center">
                            <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                            {customer.phone}
                          </div>
                        )}
                        {customer.address && (
                          <div className="text-sm text-muted-foreground flex items-center">
                            <Building className="h-3 w-3 mr-1 text-muted-foreground" />
                            {customer.address}
                          </div>
                        )}
                      </div>
                      
                      {customer.totalDebt > 0 && (
                        <div className="ml-7 mt-2">
                          <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50">
                            {t('has_debt')}: {formatCurrency(customer.totalDebt)}
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    {selectedCustomer?.id === customer.id && (
                      <Button size="sm" variant="outline" className="border-primary text-primary">
                        {t('selected')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // مكون خطوة إضافة المنتجات
  function ProductsStep() {
    const filteredProducts = Array.isArray(products)
      ? products.filter((product: any) =>
          product.name.toLowerCase().includes(productSearch.toLowerCase())
        )
      : [];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-gradient-to-r from-primary to-blue-600 p-2.5 rounded-full shadow-sm">
            <ShoppingCart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 text-transparent bg-clip-text">
              {t('add_products')}
            </h2>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <User className="h-4 w-4 mr-2 text-primary" />
              {selectedCustomer?.name}
            </div>
          </div>
        </div>
        
        <div className="space-y-4 pt-2">
          <div className="rounded-lg border shadow-sm">
            <Command className="rounded-lg border-0">
              <div className="relative">
                <CommandInput 
                  placeholder={t('search_products')} 
                  value={productSearch} 
                  onValueChange={setProductSearch} 
                />
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
              
              <CommandList>
                <CommandEmpty>{t('no_products_found')}</CommandEmpty>
                <CommandGroup heading={t('products')}>
                  {filteredProducts?.slice(0, 5).map((product: any) => (
                    <CommandItem
                      key={product.id}
                      value={product.name}
                      onSelect={() => handleProductSelect(product)}
                    >
                      <div className="flex-1 flex items-center justify-between">
                        <span className="flex-1">{product.name}</span>
                        <span className="text-muted-foreground text-sm">
                          {formatCurrency(product.sellingPrice)}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              min="1"
              placeholder={t('quantity')}
              className="w-24 border-blue-200"
            />
            
            <Button
              variant="outline"
              onClick={() => setBarcodeDialogOpen(true)}
              className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
            >
              <Scan className="h-5 w-5 mr-2 text-amber-700" />
              {t('scan_barcode')}
            </Button>
            
            <div className="relative flex-1 max-w-xs">
              <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                <Keyboard className="h-4 w-4 text-primary" />
              </div>
              <Input
                placeholder={t('enter_barcode')}
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={handleBarcodeInputKeyDown}
                className="pl-9 border-blue-200"
                ref={barcodeInputRef}
              />
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <h3 className="font-medium">{t('products_in_invoice')}</h3>
            </div>
            
            {selectedProducts.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground flex flex-col items-center">
                <ShoppingCart className="h-8 w-8 text-blue-300" />
                <span className="mt-2">{t('no_products_added')}</span>
              </div>
            ) : (
              <Table className="border-b rounded-md overflow-hidden">
                <TableHeader className="bg-blue-50 dark:bg-blue-950/20">
                  <TableRow>
                    <TableHead className="w-[300px]">
                      <div className="flex items-center gap-1">
                        <Package2 className="h-4 w-4 text-primary" />
                        {t('product')}
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <TagIcon className="h-3 w-3" />
                        {t('price')}
                      </div>
                    </TableHead>
                    <TableHead>{t('quantity')}</TableHead>
                    <TableHead>{t('total')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{formatCurrency(product.sellingPrice)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-start gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6 border-blue-200"
                            onClick={() => updateProductQuantity(product.id, product.quantity - 1)}
                          >
                            <Minus className="h-3 w-3 text-primary" />
                          </Button>
                          <span className="w-8 text-center">{product.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6 border-blue-200"
                            onClick={() => updateProductQuantity(product.id, product.quantity + 1)}
                          >
                            <Plus className="h-3 w-3 text-primary" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(product.quantity * product.sellingPrice)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeProduct(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // مكون خطوة التأكيد
  function ConfirmationStep() {
    return (
      <div className="space-y-6 pt-4">
        <div className="rounded-lg border border-blue-100 shadow-sm">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/10 dark:to-blue-900/5 p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calculator className="h-4 w-4 text-primary/70" />
                  <span>{t('subtotal')}</span>
                </span>
                <span className="font-medium">{formatCurrency(calculateTotals().subtotal)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <BadgePercent className="h-4 w-4 text-primary/70" />
                  <span>{t('discount')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-32">
                    <Input
                      type="number"
                      min="0"
                      value={invoiceDiscount}
                      onChange={(e) => setInvoiceDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="pl-8 border-blue-200 focus-visible:ring-blue-500"
                    />
                    <DollarSign className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>
              
              <Separator className="my-1 bg-blue-100" />
          
              <div className="flex items-center justify-between">
                <span className="font-semibold text-primary flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-primary" />
                  {t('total')}
                </span>
                <span className="font-bold text-lg bg-gradient-to-r from-primary to-blue-600 text-transparent bg-clip-text">
                  {formatCurrency(calculateTotals().total)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label className="px-4">{t('payment_method')}</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  className={`${
                    paymentMethod === 'cash'
                      ? 'bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white shadow-md'
                      : 'border-blue-200'
                  }`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <DollarSign className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                  {t('cash')}
                </Button>
                
                <Button
                  type="button"
                  variant={paymentMethod === 'later' ? 'default' : 'outline'}
                  className={`${
                    paymentMethod === 'later'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-500/90 hover:to-amber-600/90 text-white shadow-md'
                      : 'border-blue-200'
                  }`}
                  onClick={() => setPaymentMethod('later')}
                >
                  <Clock className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                  {t('pay_later')}
                </Button>
                
                <Button
                  type="button"
                  variant={paymentMethod === 'deferred' ? 'default' : 'outline'}
                  className={`${
                    paymentMethod === 'deferred'
                      ? 'bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-400/90 hover:to-blue-500/90 text-white shadow-md'
                      : 'border-blue-200'
                  }`}
                  onClick={() => setPaymentMethod('deferred')}
                >
                  <CreditCard className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                  {t('deferred')}
                </Button>
              </div>
            </div>
            
            <div className="pt-2">
              <Label htmlFor="notes" className="px-4">{t('notes')}</Label>
              <div className="px-4 pt-1 pb-4">
                <Input 
                  id="notes"
                  placeholder={t('invoice_notes')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="border-blue-200"
                />
              </div>
            </div>
            
            {paymentMethod === 'deferred' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mx-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  {createInvoiceMutation.isPending ? (
                    <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                  )}
                  {t('deferred_payment_notice')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
      
      {/* حوار إنشاء الفاتورة الرئيسي */}
      <Dialog open={open} onOpenChange={showPreview ? () => {} : onOpenChange}>
        <DialogContent className="max-w-full sm:max-w-[90vw] md:max-w-[80vw] h-[90vh] p-0 gap-0">
          {showPreview ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  {t('invoice_confirmed')}
                </h2>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleCloseDialog}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">{t('invoice_details')}</h3>
                    
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetForm}
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
                  
                  {newInvoiceId && <InvoicePreview invoice={{id: newInvoiceId}} />}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="p-6 border-b bg-slate-50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    {currentStep === 'customer' && t('customer_selection')}
                    {currentStep === 'products' && t('add_products')}
                    {currentStep === 'confirmation' && t('confirm_invoice')}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentStep === 'customer' && t('customer_selection_description')}
                    {currentStep === 'products' && t('add_products_description')}
                    {currentStep === 'confirmation' && t('confirm_invoice_description')}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {currentStep !== 'customer' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentStep(currentStep === 'products' ? 'customer' : 'products')}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {t('back')}
                    </Button>
                  )}
                  
                  {currentStep === 'products' && (
                    <Button 
                      onClick={() => setCurrentStep('confirmation')}
                      disabled={selectedProducts.length === 0}
                    >
                      {t('continue')}
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                  
                  {currentStep === 'confirmation' && (
                    <Button 
                      onClick={handleCreateInvoice}
                      className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white shadow-md"
                      size="lg"
                      disabled={createInvoiceMutation.isPending}
                    >
                      {createInvoiceMutation.isPending ? (
                        <>
                          <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                          {t('processing')}
                        </>
                      ) : (
                        <>
                          <Check className="h-5 w-5 mr-2" />
                          {t('confirm_invoice')}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {currentStep === 'customer' && <CustomerStep />}
                {currentStep === 'products' && <ProductsStep />}
                {currentStep === 'confirmation' && <ConfirmationStep />}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}