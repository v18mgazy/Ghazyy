import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  ReceiptText, Search, User, X, ShoppingCart, Check, Scan, 
  Calculator, Printer, Plus, Minus, Edit, Trash2, Phone, Package2, 
  RefreshCcw, Percent, DollarSign, ShoppingBasket, BadgeCheck,
  Share2, Download, Calendar, CreditCard, Clock, MessageSquare
} from 'lucide-react';
import { useLocale } from '@/hooks/use-locale';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { apiRequest, queryClient } from '@/lib/queryClient';

// UI Components
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

// Custom Components
import BarcodeScanner from '@/components/barcode-scanner';
import InvoicePreview from '@/components/invoice-new/invoice-preview';

// نوع بيانات العميل
interface Customer {
  id: string | number;
  name: string;
  phone?: string | null;
  address?: string | null;
  isPotential?: boolean | null;
}

// نوع بيانات المنتج
interface Product {
  id: string | number;
  name: string;
  barcode?: string;
  sellingPrice: number;
  purchasePrice: number;
  quantity: number;
  discount?: number;
  stock?: number;
}

interface InvoiceCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedProduct?: any;
}

const InvoiceCreator: React.FC<InvoiceCreatorProps> = ({ 
  open, 
  onOpenChange, 
  preSelectedProduct 
}) => {
  const { t } = useTranslation();
  const { language } = useLocale();
  const isRtl = language === 'ar';
  const { toast } = useToast();

  // إعدادات الحالة
  const [activeTab, setActiveTab] = useState('customer');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    address: '',
    isPotential: false
  });

  const [productsInInvoice, setProductsInInvoice] = useState<Product[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [subtotal, setSubtotal] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [total, setTotal] = useState(0);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());

  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  // إعادة تعيين الحالة عند فتح المحتوى
  useEffect(() => {
    if (open) {
      setActiveTab('customer');
      setSelectedCustomer(null);
      setProductsInInvoice([]);
      setSubtotal(0);
      setTotalDiscount(0);
      setInvoiceDiscount(0);
      setTotal(0);
      setInvoiceNotes('');
      setPaymentMethod('cash');
      setInvoiceDate(new Date());
      setShowInvoicePreview(false);
      setInvoiceData(null);
    }
  }, [open]);

  // إذا كان هناك منتج محدد مسبقاً، أضفه إلى الفاتورة
  useEffect(() => {
    if (preSelectedProduct && open) {
      const productExists = productsInInvoice.some(p => p.id === preSelectedProduct.id);
      if (!productExists) {
        handleAddProduct(preSelectedProduct);
      }
    }
  }, [preSelectedProduct, open]);

  // استعلام العملاء
  const { 
    data: customers = [], 
    isLoading: isLoadingCustomers 
  } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  // استعلام المنتجات
  const { 
    data: products = [], 
    isLoading: isLoadingProducts 
  } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  // تصفية العملاء بناءً على مصطلح البحث
  const filteredCustomers = customerSearchTerm.trim() 
    ? customers.filter(customer => 
        customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        (customer.phone && customer.phone.includes(customerSearchTerm))
      )
    : customers;

  // تصفية المنتجات بناءً على مصطلح البحث
  const filteredProducts = productSearchTerm.trim() 
    ? products.filter(product => 
        product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        (product.barcode && product.barcode.includes(productSearchTerm))
      )
    : products;

  // mutation لإضافة عميل جديد
  const addCustomerMutation = useMutation({
    mutationFn: (customerData: any) => 
      apiRequest('POST', '/api/customers', customerData)
        .then(res => res.json()),
    onSuccess: (customer) => {
      setSelectedCustomer(customer);
      setShowAddCustomerForm(false);
      setActiveTab('products');
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: t('success'),
        description: t('customer_added_successfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('error_adding_customer'),
        variant: 'destructive',
      });
    }
  });

  // mutation لإنشاء فاتورة جديدة
  const createInvoiceMutation = useMutation({
    mutationFn: (invoiceData: any) => 
      apiRequest('POST', '/api/invoices', invoiceData)
        .then(res => res.json()),
    onSuccess: (data) => {
      // تأكد من أن البيانات صحيحة وموجودة
      const invoiceWithDiscountDetails = {
        ...data,
        subtotal: subtotal,
        itemsDiscount: totalDiscount,
        invoiceDiscount: invoiceDiscount,
        total: total,
        date: invoiceDate.toISOString()
      };

      setInvoiceData(invoiceWithDiscountDetails);
      setShowInvoicePreview(true);
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: t('success'),
        description: t('invoice_created_successfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('error_creating_invoice'),
        variant: 'destructive',
      });
    }
  });

  // اختيار عميل
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setActiveTab('products');
  };

  // إضافة عميل جديد
  const handleAddCustomer = () => {
    if (!newCustomer.name) {
      toast({
        title: t('validation_error'),
        description: t('customer_name_required'),
        variant: 'destructive',
      });
      return;
    }

    addCustomerMutation.mutate(newCustomer);
  };

  // البحث عن منتج بالباركود
  const handleBarcodeSearch = (barcode: string) => {
    if (!barcode || barcode.trim() === '') return;

    const foundProduct = products.find(p => p.barcode === barcode.trim());

    if (foundProduct) {
      handleAddProduct(foundProduct);
      setManualBarcode('');
      toast({
        title: t('success'),
        description: t('product_found_and_added'),
      });
    } else {
      toast({
        title: t('error'),
        description: t('product_not_found'),
        variant: 'destructive',
      });
    }
  };

  // معالجة إدخال الباركود وتنفيذ البحث عند الضغط على Enter
  const handleBarcodeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeSearch(manualBarcode);
    }
  };

  // البحث عن منتج بالباركود
  const handleBarcodeScanned = (result: any) => {
    if (result && result.barcode) {
      setScannedBarcode(result.barcode);
      const foundProduct = products.find(p => p.barcode === result.barcode);

      if (foundProduct) {
        handleAddProduct(foundProduct);
        setShowBarcodeScanner(false);
        toast({
          title: t('success'),
          description: t('product_found_and_added'),
        });
      } else {
        toast({
          title: t('error'),
          description: t('product_not_found'),
          variant: 'destructive',
        });
      }
    }
  };

  // إضافة منتج للفاتورة
  const handleAddProduct = (product: Product) => {
    // التحقق من وجود مخزون كافي
    if ((product.stock || 0) <= 0) {
      toast({
        title: t('error'),
        description: t('product_out_of_stock'),
        variant: 'destructive',
      });
      return;
    }

    // البحث عن المنتج في قائمة الفاتورة الحالية
    const existingProductIndex = productsInInvoice.findIndex(p => p.id === product.id);

    if (existingProductIndex !== -1) {
      // زيادة الكمية إذا كان المنتج موجوداً بالفعل
      const updatedProducts = [...productsInInvoice];
      const currentQuantity = updatedProducts[existingProductIndex].quantity;

      // التحقق من أن الكمية الجديدة لا تتجاوز المخزون
      if (currentQuantity + 1 > (product.stock || 0)) {
        toast({
          title: t('error'),
          description: t('quantity_exceeds_stock'),
          variant: 'destructive',
        });
        return;
      }

      updatedProducts[existingProductIndex] = {
        ...updatedProducts[existingProductIndex],
        quantity: currentQuantity + 1
      };

      setProductsInInvoice(updatedProducts);
      calculateTotals(updatedProducts);

      toast({
        title: t('success'),
        description: t('product_quantity_increased'),
      });
    } else {
      // إضافة المنتج الجديد بكمية 1
      const productToAdd = {
        ...product,
        quantity: 1,
        discount: 0
      };

      const updatedProducts = [...productsInInvoice, productToAdd];
      setProductsInInvoice(updatedProducts);
      calculateTotals(updatedProducts);

      toast({
        title: t('success'),
        description: t('product_added_to_invoice'),
      });
    }
  };

  // تحديث كمية المنتج
  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) {
      toast({
        title: t('error'),
        description: t('quantity_must_be_positive'),
        variant: 'destructive',
      });
      return;
    }

    const product = productsInInvoice[index];

    // التحقق من المخزون المتاح
    if (newQuantity > (product.stock || 0)) {
      toast({
        title: t('error'),
        description: t('quantity_exceeds_available', { available: product.stock }),
        variant: 'destructive',
      });
      return;
    }

    const updatedProducts = [...productsInInvoice];
    updatedProducts[index] = {
      ...updatedProducts[index],
      quantity: newQuantity
    };

    setProductsInInvoice(updatedProducts);
    calculateTotals(updatedProducts);
  };

  // تحديث نسبة الخصم للمنتج
  const handleUpdateDiscount = (index: number, newDiscount: number) => {
    if (newDiscount < 0 || newDiscount > 100) {
      toast({
        title: t('error'),
        description: t('discount_must_be_between_0_and_100'),
        variant: 'destructive',
      });
      return;
    }

    const updatedProducts = [...productsInInvoice];
    updatedProducts[index] = {
      ...updatedProducts[index],
      discount: newDiscount
    };

    setProductsInInvoice(updatedProducts);
    calculateTotals(updatedProducts);
  };

  // إزالة منتج من الفاتورة
  const handleRemoveProduct = (index: number) => {
    const updatedProducts = [...productsInInvoice];
    updatedProducts.splice(index, 1);
    setProductsInInvoice(updatedProducts);
    calculateTotals(updatedProducts);

    toast({
      title: t('success'),
      description: t('product_removed_from_invoice'),
    });
  };

  // حساب المجاميع
  const calculateTotals = useCallback((products: Product[], customInvoiceDiscount?: number) => {
    try {
      // المجموع الفرعي (قبل الخصم)
      const newSubtotal = products.reduce((sum, product) => {
        return sum + (product.sellingPrice * product.quantity);
      }, 0);

      // مجموع الخصومات على المنتجات
      const newTotalDiscount = products.reduce((sum, product) => {
        const discount = product.discount 
          ? (product.sellingPrice * product.quantity * (product.discount / 100)) 
          : 0;
        return sum + discount;
      }, 0);

      // حساب قيمة الخصم على مستوى الفاتورة
      const discountToApply = customInvoiceDiscount !== undefined ? customInvoiceDiscount : invoiceDiscount;

      // الإجمالي النهائي
      const newTotal = newSubtotal - newTotalDiscount - discountToApply;

      setSubtotal(newSubtotal);
      setTotalDiscount(newTotalDiscount);
      setTotal(newTotal);
    } catch (error) {
      console.error('Error calculating totals:', error);
    }
  }, [invoiceDiscount]);

  // حفظ الفاتورة
  const handleSaveInvoice = () => {
    if (!selectedCustomer) {
      toast({
        title: t('error'),
        description: t('select_customer_first'),
        variant: 'destructive',
      });
      return;
    }

    if (productsInInvoice.length === 0) {
      toast({
        title: t('error'),
        description: t('add_products_first'),
        variant: 'destructive',
      });
      return;
    }

    // إنشاء البيانات اللازمة للفاتورة
    const invoiceItems = productsInInvoice.map(product => ({
      productId: product.id,
      productName: product.name,
      barcode: product.barcode,
      sellingPrice: product.sellingPrice,
      purchasePrice: product.purchasePrice,
      quantity: product.quantity,
      discount: product.discount || 0,
      totalPrice: product.sellingPrice * product.quantity * (1 - (product.discount || 0) / 100)
    }));

    const paymentStatus = paymentMethod === 'deferred' ? 'pending' : 'paid';

    const invoice = {
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      customerAddress: selectedCustomer.address,
      date: invoiceDate.toISOString(),
      paymentMethod,
      paymentStatus,
      subtotal,
      discount: totalDiscount,
      invoiceDiscount,
      total,
      notes: invoiceNotes,
      products: invoiceItems
    };

    createInvoiceMutation.mutate(invoice);
  };

  // إنشاء واجهة بناءً على علامة التبويب النشطة
  const renderContent = () => {
    if (showInvoicePreview && invoiceData) {
      return (
        <InvoicePreview 
          invoice={invoiceData} 
          onClose={() => onOpenChange(false)} 
        />
      );
    }

    return (
      <div className="flex flex-col space-y-6 w-full">
        {/* شريط التنقل بين علامات التبويب */}
        <div className="flex items-center justify-between bg-card rounded-lg p-2 shadow-sm">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Button
              variant={activeTab === 'customer' ? "default" : "ghost"}
              size="sm"
              className={`flex items-center ${activeTab === 'customer' ? 'shadow-sm' : ''}`}
              onClick={() => setActiveTab('customer')}
            >
              <User className="mr-2 h-4 w-4" />
              {t('customer')}
            </Button>
            <Button
              variant={activeTab === 'products' ? "default" : "ghost"}
              size="sm"
              className={`flex items-center ${activeTab === 'products' ? 'shadow-sm' : ''}`}
              onClick={() => setActiveTab('products')}
              disabled={!selectedCustomer}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {t('products')}
            </Button>
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {selectedCustomer && (
              <Badge variant="outline" className="flex items-center">
                <User className="mr-1 h-3 w-3" />
                {selectedCustomer.name}
              </Badge>
            )}
            {productsInInvoice.length > 0 && (
              <Badge variant="outline" className="flex items-center">
                <ShoppingCart className="mr-1 h-3 w-3" />
                {productsInInvoice.length}
              </Badge>
            )}
          </div>
        </div>

        {/* محتوى علامة التبويب */}
        <div className="flex-1">
          {activeTab === 'customer' && (
            <div className="space-y-4">
              {showAddCustomerForm ? (
                <Card className="invoice-creator-card border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl flex items-center">
                      <Plus className="mr-2 h-5 w-5 text-primary" />
                      {t('add_new_customer')}
                    </CardTitle>
                    <CardDescription>
                      {t('fill_customer_information')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('customer_name')}</Label>
                      <Input
                        id="name"
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                        placeholder={t('enter_customer_name')}
                        className="border-primary/20 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t('phone_number')}</Label>
                      <Input
                        id="phone"
                        value={newCustomer.phone || ''}
                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                        placeholder={t('enter_phone_number')}
                        className="border-primary/20 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">{t('address')}</Label>
                      <Input
                        id="address"
                        value={newCustomer.address || ''}
                        onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                        placeholder={t('enter_address')}
                        className="border-primary/20 focus:border-primary"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAddCustomerForm(false)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      {t('cancel')}
                    </Button>
                    <Button 
                      onClick={handleAddCustomer}
                      className="add-button"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {t('save')}
                    </Button>
                  </CardFooter>
                </Card>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder={t('search_customers')}
                        value={customerSearchTerm}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                        className="pl-8 search-field"
                      />
                    </div>
                    <Button 
                      onClick={() => setShowAddCustomerForm(true)}
                      className="add-button"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {t('new_customer')}
                    </Button>
                  </div>

                  <Card className="invoice-creator-card border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <User className="mr-2 h-5 w-5 text-primary" />
                        {t('select_customer')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[300px] custom-scrollbar">
                        {isLoadingCustomers ? (
                          <div className="flex items-center justify-center h-full p-4">
                            <RefreshCcw className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        ) : filteredCustomers.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-[200px] p-4 text-center">
                            <User className="h-12 w-12 text-muted-foreground mb-2 opacity-20" />
                            <p className="text-muted-foreground">
                              {customerSearchTerm ? t('no_customers_found') : t('no_customers')}
                            </p>
                            <Button 
                              variant="link" 
                              onClick={() => setShowAddCustomerForm(true)}
                              className="mt-2"
                            >
                              {t('add_new_customer')}
                            </Button>
                          </div>
                        ) : (
                          <div className="divide-y">
                            {filteredCustomers.map((customer) => (
                              <div 
                                key={customer.id} 
                                className="p-3 hover:bg-accent/50 cursor-pointer transition-colors flex justify-between items-center product-item"
                                onClick={() => handleSelectCustomer(customer)}
                              >
                                <div>
                                  <div className="font-medium">{customer.name}</div>
                                  {customer.phone && (
                                    <div className="text-sm text-muted-foreground flex items-center mt-1">
                                      <Phone className="h-3 w-3 mr-1" />
                                      {customer.phone}
                                    </div>
                                  )}
                                </div>
                                <Button size="icon" variant="ghost">
                                  <Check className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <Card className="invoice-creator-card border-primary/20 flex-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <ShoppingCart className="mr-2 h-5 w-5 text-primary" />
                      {t('add_products')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="search"
                          placeholder={t('search_products')}
                          value={productSearchTerm}
                          onChange={(e) => setProductSearchTerm(e.target.value)}
                          className="pl-8 search-field"
                        />
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => setShowBarcodeScanner(true)}
                            >
                              <Scan className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('scan_barcode')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <div className="relative flex-1">
                        <Input
                          ref={barcodeInputRef}
                          type="text"
                          placeholder={t('enter_barcode')}
                          value={manualBarcode}
                          onChange={(e) => setManualBarcode(e.target.value)}
                          onKeyDown={handleBarcodeInputKeyDown}
                          className="search-field"
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => handleBarcodeSearch(manualBarcode)}
                        disabled={!manualBarcode}
                      >
                        <Search className="mr-2 h-4 w-4" />
                        {t('search')}
                      </Button>
                    </div>

                    <ScrollArea className="h-[200px] border rounded-md custom-scrollbar">
                      {isLoadingProducts ? (
                        <div className="flex items-center justify-center h-full p-4">
                          <RefreshCcw className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                          <Package2 className="h-12 w-12 text-muted-foreground mb-2 opacity-20" />
                          <p className="text-muted-foreground">
                            {productSearchTerm ? t('no_products_found') : t('no_products')}
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {filteredProducts.map((product) => (
                            <div 
                              key={product.id} 
                              className="p-3 hover:bg-accent/50 cursor-pointer transition-colors flex justify-between items-center product-item"
                              onClick={() => handleAddProduct(product)}
                            >
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-sm font-medium text-primary">
                                    {formatCurrency(product.sellingPrice)}
                                  </span>
                                  {product.stock !== undefined && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      {t('stock')}: {product.stock}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button size="icon" variant="ghost">
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="invoice-creator-card border-primary/20 flex-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <ReceiptText className="mr-2 h-5 w-5 text-primary" />
                      {t('invoice_details')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment-method">{t('payment_method')}</Label>
                      <Select
                        value={paymentMethod}
                        onValueChange={setPaymentMethod}
                      >
                        <SelectTrigger id="payment-method" className="w-full">
                          <SelectValue placeholder={t('select_payment_method')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">
                            <div className="flex items-center">
                              <DollarSign className="mr-2 h-4 w-4 text-primary" />
                              {t('cash')}
                            </div>
                          </SelectItem>
                          <SelectItem value="card">
                            <div className="flex items-center">
                              <CreditCard className="mr-2 h-4 w-4 text-primary" />
                              {t('card')}
                            </div>
                          </SelectItem>
                          <SelectItem value="deferred">
                            <div className="flex items-center">
                              <Clock className="mr-2 h-4 w-4 text-primary" />
                              {t('deferred')}
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invoice-date">{t('invoice_date')}</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="invoice-date"
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {invoiceDate ? (
                              format(invoiceDate, 'PPP', { locale: isRtl ? ar : enUS })
                            ) : (
                              <span>{t('select_date')}</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={invoiceDate}
                            onSelect={(date) => date && setInvoiceDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invoice-discount">{t('invoice_discount')}</Label>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Input
                          id="invoice-discount"
                          type="number"
                          min="0"
                          value={invoiceDiscount}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setInvoiceDiscount(isNaN(value) ? 0 : value);
                            calculateTotals(productsInInvoice, isNaN(value) ? 0 : value);
                          }}
                          className="border-primary/20 focus:border-primary"
                        />
                        <Badge variant="outline" className="h-10 px-3 flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">{t('notes')}</Label>
                      <Input
                        id="notes"
                        value={invoiceNotes}
                        onChange={(e) => setInvoiceNotes(e.target.value)}
                        placeholder={t('enter_notes')}
                        className="border-primary/20 focus:border-primary"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="invoice-creator-card border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <ShoppingBasket className="mr-2 h-5 w-5 text-primary" />
                    {t('invoice_items')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {productsInInvoice.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] p-4 text-center">
                      <ShoppingCart className="h-12 w-12 text-muted-foreground mb-2 opacity-20" />
                      <p className="text-muted-foreground">{t('no_products_in_invoice')}</p>
                      <p className="text-sm text-muted-foreground mt-1">{t('search_and_add_products')}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table className="invoice-table">
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('product')}</TableHead>
                            <TableHead className="text-right">{t('price')}</TableHead>
                            <TableHead className="text-center">{t('quantity')}</TableHead>
                            <TableHead className="text-center">{t('discount')}</TableHead>
                            <TableHead className="text-right">{t('total')}</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productsInInvoice.map((product, index) => {
                            const productTotal = product.sellingPrice * product.quantity;
                            const discountAmount = product.discount ? (productTotal * (product.discount / 100)) : 0;
                            const finalTotal = productTotal - discountAmount;

                            return (
                              <TableRow key={`${product.id}-${index}`}>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell className="text-right amount">
                                  {formatCurrency(product.sellingPrice)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center quantity-control">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-r-none"
                                      onClick={() => handleUpdateQuantity(index, product.quantity - 1)}
                                      disabled={product.quantity <= 1}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={product.quantity}
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        if (!isNaN(value)) {
                                          handleUpdateQuantity(index, value);
                                        }
                                      }}
                                      className="h-8 w-12 rounded-none text-center p-0 border-x-0"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-l-none"
                                      onClick={() => handleUpdateQuantity(index, product.quantity + 1)}
                                      disabled={product.quantity >= (product.stock || 0)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={product.discount || 0}
                                      onChange={(e) => {
                                        const value = parseFloat(e.target.value);
                                        if (!isNaN(value)) {
                                          handleUpdateDiscount(index, value);
                                        }
                                      }}
                                      className="h-8 w-16 text-center"
                                    />
                                    <span className="ml-1">%</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium amount">
                                  {formatCurrency(finalTotal)}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => handleRemoveProduct(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
                {productsInInvoice.length > 0 && (
                  <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 gap-4">
                    <div className="space-y-1 w-full sm:w-auto">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('subtotal')}:</span>
                        <span className="font-medium amount">{formatCurrency(subtotal)}</span>
                      </div>
                      {totalDiscount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t('items_discount')}:</span>
                          <span className="font-medium text-destructive amount">- {formatCurrency(totalDiscount)}</span>
                        </div>
                      )}
                      {invoiceDiscount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t('invoice_discount')}:</span>
                          <span className="font-medium text-destructive amount">- {formatCurrency(invoiceDiscount)}</span>
                        </div>
                      )}
                      <Separator className="my-1" />
                      <div className="flex justify-between">
                        <span className="font-medium">{t('total')}:</span>
                        <span className="font-bold text-primary amount">{formatCurrency(total)}</span>
                      </div>
                    </div>

                    <Button 
                      onClick={handleSaveInvoice}
                      className="w-full sm:w-auto add-button"
                      disabled={productsInInvoice.length === 0}
                    >
                      <BadgeCheck className="mr-2 h-4 w-4" />
                      {t('create_invoice')}
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <ReceiptText className="mr-2 h-6 w-6 text-primary" />
            {t('create_invoice')}
          </DialogTitle>
          <DialogDescription>
            {t('create_invoice_description')}
          </DialogDescription>
        </DialogHeader>

        {renderContent()}

        {/* ماسح الباركود */}
        {showBarcodeScanner && (
          <Dialog open={showBarcodeScanner} onOpenChange={setShowBarcodeScanner}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Scan className="mr-2 h-5 w-5 text-primary" />
                  {t('scan_barcode')}
                </DialogTitle>
                <DialogDescription>
                  {t('scan_barcode_description')}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center">
                <BarcodeScanner onProductScanned={handleBarcodeScanned} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowBarcodeScanner(false)}>
                  <X className="mr-2 h-4 w-4" />
                  {t('close')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceCreator;
