import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  ReceiptText, Search, User, X, ShoppingCart, Check, Scan, 
  Calculator, Printer, Plus, Minus, Edit, Trash2, Phone, Package2, 
  RefreshCcw, Percent, DollarSign, ShoppingBasket, BadgeCheck
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

// Custom Components
import BarcodeScanner from '@/components/barcode-scanner';
import InvoicePreview from '@/components/invoice/invoice-preview';

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
  
  const [subtotal, setSubtotal] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [total, setTotal] = useState(0);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  
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
      setTotal(0);
      setInvoiceNotes('');
      setPaymentMethod('cash');
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
      setInvoiceData(data);
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
  const calculateTotals = useCallback((products: Product[]) => {
    try {
      // المجموع الفرعي (قبل الخصم)
      const newSubtotal = products.reduce((sum, product) => {
        return sum + (product.sellingPrice * product.quantity);
      }, 0);
      
      // مجموع الخصومات
      const newTotalDiscount = products.reduce((sum, product) => {
        const discount = product.discount 
          ? (product.sellingPrice * product.quantity * (product.discount / 100)) 
          : 0;
        return sum + discount;
      }, 0);
      
      // الإجمالي النهائي
      const newTotal = newSubtotal - newTotalDiscount;
      
      setSubtotal(newSubtotal);
      setTotalDiscount(newTotalDiscount);
      setTotal(newTotal);
    } catch (error) {
      console.error('Error calculating totals:', error);
    }
  }, []);
  
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
      date: new Date().toISOString(),
      paymentMethod,
      paymentStatus,
      subtotal,
      discount: totalDiscount,
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="customer" disabled={activeTab === 'products' && !selectedCustomer}>
            <User className="mr-2 h-4 w-4" />
            {t('customer')}
          </TabsTrigger>
          <TabsTrigger value="products" disabled={!selectedCustomer}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            {t('products')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="customer" className="space-y-4">
          {showAddCustomerForm ? (
            <Card>
              <CardHeader>
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
                <div className="space-y-2">
                  <Label htmlFor="isPotential">{t('is_potential_customer')}</Label>
                  <Select 
                    value={newCustomer.isPotential ? 'true' : 'false'}
                    onValueChange={(value) => setNewCustomer({ ...newCustomer, isPotential: value === 'true' })}
                  >
                    <SelectTrigger id="isPotential" className="border-primary/20 focus:border-primary">
                      <SelectValue placeholder={t('select')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">{t('yes')}</SelectItem>
                      <SelectItem value="false">{t('no')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddCustomerForm(false)}
                >
                  {t('cancel')}
                </Button>
                <Button 
                  onClick={handleAddCustomer}
                  disabled={addCustomerMutation.isPending}
                  className="bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700"
                >
                  {addCustomerMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('saving')}
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      {t('save')}
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <>
              <div className="flex space-x-2 rtl:space-x-reverse mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input
                    placeholder={t('search_customers')}
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    className="pl-10 border-primary/20 focus:border-primary"
                  />
                  {customerSearchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                      onClick={() => setCustomerSearchTerm('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Button 
                  onClick={() => setShowAddCustomerForm(true)}
                  className="bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('new_customer')}
                </Button>
              </div>
              
              <Card className="border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle>{t('select_customer')}</CardTitle>
                  <CardDescription>
                    {isLoadingCustomers 
                      ? t('loading_customers') 
                      : t('customers_found', { count: filteredCustomers.length })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] rounded-md">
                    <div className="space-y-2">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            onClick={() => handleSelectCustomer(customer)}
                            className="p-3 border border-primary/10 rounded-lg hover:bg-primary/5 cursor-pointer transition-colors flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-medium">
                                {customer.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-primary">{customer.name}</p>
                                <p className="text-sm text-muted-foreground">{customer.phone || t('no_phone')}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="text-primary">
                              {isRtl ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m15 18-6-6 6-6"></path></svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m9 18 6-6-6-6"></path></svg>
                              )}
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/30 mb-4">
                            <User className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <h3 className="text-lg font-semibold mb-1">{t('no_customers_found')}</h3>
                          <p className="text-muted-foreground mb-4">{t('try_different_search_or_add_new')}</p>
                          <Button 
                            onClick={() => setShowAddCustomerForm(true)}
                            className="bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            {t('add_new_customer')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="products" className="space-y-4">
          {selectedCustomer && (
            <>
              <Card className="mb-4 border-primary/10 bg-gradient-to-r from-primary/5 to-primary/10">
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">{t('selected_customer')}</p>
                    <h3 className="text-lg font-bold text-primary">{selectedCustomer.name}</h3>
                    {selectedCustomer.phone && (
                      <p className="text-sm flex items-center mt-1 text-muted-foreground">
                        <Phone className="h-3 w-3 mr-1" /> {selectedCustomer.phone}
                      </p>
                    )}
                  </div>
                  <div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setActiveTab('customer')}
                      className="border-primary/20 hover:bg-primary/5"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {t('change')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-3/5">
                  <Card className="border-primary/10">
                    <CardHeader className="pb-0">
                      <div className="flex justify-between items-center">
                        <CardTitle>{t('products')}</CardTitle>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setShowBarcodeScanner(!showBarcodeScanner)}
                            className="border-primary/20 hover:bg-primary/5"
                          >
                            <Scan className="h-4 w-4 mr-1" />
                            {t('scan_barcode')}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 pb-2">
                      {showBarcodeScanner ? (
                        <div className="mb-4">
                          <Card className="border-dashed border-2 p-2 border-primary/20">
                            <CardContent className="p-2">
                              <div className="text-center mb-2">
                                <h3 className="text-sm font-semibold text-primary">{t('scan_product_barcode')}</h3>
                                <p className="text-xs text-muted-foreground">{t('position_barcode_in_camera')}</p>
                              </div>
                              <BarcodeScanner onProductScanned={handleBarcodeScanned} />
                              <div className="flex justify-end mt-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => setShowBarcodeScanner(false)}
                                >
                                  {t('close')}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ) : (
                        <>
                          <div className="relative mb-6">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                            <Input
                              placeholder={t('search_products')}
                              value={productSearchTerm}
                              onChange={(e) => setProductSearchTerm(e.target.value)}
                              className="pl-10 border-primary/20 focus:border-primary"
                            />
                          </div>
                          
                          <ScrollArea className="h-[320px] rounded-md">
                            {isLoadingProducts ? (
                              <div className="text-center p-8">
                                <svg className="animate-spin h-8 w-8 mx-auto text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="mt-2 text-muted-foreground">{t('loading_products')}</p>
                              </div>
                            ) : filteredProducts.length > 0 ? (
                              <div className="space-y-2">
                                {filteredProducts.map((product) => (
                                  <div
                                    key={product.id}
                                    onClick={() => handleAddProduct(product)}
                                    className="p-3 border border-primary/10 rounded-lg hover:bg-primary/5 cursor-pointer transition-colors"
                                  >
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <p className="font-medium text-primary">{product.name}</p>
                                        <div className="flex items-center mt-1">
                                          <Badge variant="outline" className="text-xs px-1 py-0 border-primary/20 mr-2">
                                            {product.barcode || t('no_barcode')}
                                          </Badge>
                                          <p className="text-xs text-muted-foreground">
                                            {t('in_stock')}: <span className={`font-medium ${(product.stock || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>{product.stock || 0}</span>
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-semibold text-primary">{formatCurrency(product.sellingPrice)}</p>
                                        <Button variant="ghost" size="sm" className="h-8 px-2 mt-1 text-xs text-primary">
                                          <Plus className="h-3 w-3 mr-1" />
                                          {t('add')}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/30 mb-4">
                                  <Package2 className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-1">{t('no_products_found')}</h3>
                                <p className="text-muted-foreground">{t('try_different_search_or_scan')}</p>
                              </div>
                            )}
                          </ScrollArea>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                <div className="w-full md:w-2/5">
                  <Card className="border-primary/10">
                    <CardHeader className="pb-0">
                      <CardTitle>{t('invoice_details')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <Label htmlFor="paymentMethod" className="mb-2 block">
                          {t('payment_method')}
                        </Label>
                        <Select
                          value={paymentMethod}
                          onValueChange={setPaymentMethod}
                        >
                          <SelectTrigger id="paymentMethod" className="border-primary/20 focus:border-primary">
                            <SelectValue placeholder={t('select_payment_method')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">{t('cash')}</SelectItem>
                            <SelectItem value="card">{t('card')}</SelectItem>
                            <SelectItem value="deferred">{t('deferred_payment')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="mb-4">
                        <Label htmlFor="notes" className="mb-2 block">
                          {t('notes')}
                        </Label>
                        <Input
                          id="notes"
                          placeholder={t('invoice_notes')}
                          value={invoiceNotes}
                          onChange={(e) => setInvoiceNotes(e.target.value)}
                          className="border-primary/20 focus:border-primary"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              <Card className="border-primary/10 mt-4">
                <CardHeader className="pb-0">
                  <CardTitle>{t('products_in_invoice')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {productsInInvoice.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-medium">{t('product')}</TableHead>
                          <TableHead className="text-right font-medium">{t('price')}</TableHead>
                          <TableHead className="text-center font-medium">{t('quantity')}</TableHead>
                          <TableHead className="text-center font-medium">{t('discount')}</TableHead>
                          <TableHead className="text-right font-medium">{t('total')}</TableHead>
                          <TableHead className="text-right font-medium">{t('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productsInInvoice.map((product, index) => {
                          const productTotal = product.sellingPrice * product.quantity;
                          const discountAmount = product.discount ? (productTotal * (product.discount / 100)) : 0;
                          const finalTotal = productTotal - discountAmount;
                          
                          return (
                            <TableRow key={`${product.id}-${index}`}>
                              <TableCell className="font-medium">
                                {product.name}
                                {product.barcode && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {product.barcode}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(product.sellingPrice)}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7 rounded-r-none border-r-0"
                                    onClick={() => handleUpdateQuantity(index, Math.max(1, product.quantity - 1))}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <input
                                    type="number"
                                    value={product.quantity}
                                    onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                                    className="h-7 w-12 border text-center"
                                    min="1"
                                  />
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7 rounded-l-none border-l-0"
                                    onClick={() => handleUpdateQuantity(index, product.quantity + 1)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center">
                                  <input
                                    type="number"
                                    value={product.discount || 0}
                                    onChange={(e) => handleUpdateDiscount(index, parseInt(e.target.value) || 0)}
                                    className="h-7 w-12 border text-center"
                                    min="0"
                                    max="100"
                                  />
                                  <span className="ml-1">%</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(finalTotal)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveProduct(index)}
                                  className="h-7 w-7 text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 border border-dashed rounded-md border-primary/20">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/30 mb-4">
                        <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-1">{t('no_products_in_invoice')}</h3>
                      <p className="text-muted-foreground mb-4">
                        {t('add_products_to_invoice_instruction')}
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setShowBarcodeScanner(true)}
                        className="mx-1 border-primary/20 hover:bg-primary/5"
                      >
                        <Scan className="mr-2 h-4 w-4" />
                        {t('scan_barcode')}
                      </Button>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="border-t flex flex-col space-y-2 pt-4">
                  <div className="w-full flex justify-between text-sm">
                    <span className="font-medium">{t('subtotal')}:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="w-full flex justify-between text-sm">
                      <span className="font-medium text-muted-foreground">{t('total_discount')}:</span>
                      <span className="text-muted-foreground">- {formatCurrency(totalDiscount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="w-full flex justify-between text-lg font-bold">
                    <span>{t('total')}:</span>
                    <span className="text-primary">{formatCurrency(total)}</span>
                  </div>
                  
                  <div className="flex justify-end mt-6 space-x-2 rtl:space-x-reverse">
                    <Button 
                      variant="outline" 
                      onClick={() => onOpenChange(false)}
                      className="border-primary/20 hover:bg-primary/5"
                    >
                      {t('cancel')}
                    </Button>
                    <Button
                      onClick={handleSaveInvoice}
                      disabled={createInvoiceMutation.isPending || productsInInvoice.length === 0}
                      className="bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700"
                    >
                      {createInvoiceMutation.isPending ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {t('saving')}
                        </>
                      ) : (
                        <>
                          <Calculator className="mr-2 h-4 w-4" />
                          {t('save_invoice')}
                        </>
                      )}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <ReceiptText className="h-6 w-6 text-primary mr-2" />
            {t('create_new_invoice')}
          </DialogTitle>
          <DialogDescription>
            {t('create_invoice_description')}
          </DialogDescription>
        </DialogHeader>
        
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceCreator;