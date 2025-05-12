import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ReceiptText, Search, X, ChevronRight, Users, PlusCircle, Scan, User, ScanLine, ShoppingBasket, CheckCircle, Hash } from 'lucide-react';
import { useLocale } from '@/hooks/use-locale';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import BarcodeScanner from '@/components/barcode-scanner';
import ActiveInvoice from '@/components/invoice/active-invoice';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

// نوع بيانات العميل
interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  isPotential: boolean;
}

// نوع بيانات المنتج
interface Product {
  id: string;
  name: string;
  barcode?: string;
  sellingPrice: number;
  quantity: number;
  discount?: number;
}

// نوع بيانات نتائج البحث عن المنتج
interface ProductSearchResult {
  id: string;
  name: string;
  barcode?: string;
  sellingPrice: number;
  code?: string;
  category?: string;
}

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateInvoiceDialog({ open, onOpenChange }: CreateInvoiceDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { language } = useLocale();
  const isRtl = language === 'ar';
  
  // حالة اختيار العميل
  const [searchTerm, setSearchTerm] = useState('');
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(true);  // افتح مربع حوار العملاء افتراضيًا
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    isPotential: true
  });
  
  // حالة المنتجات
  const [productSearchResults, setProductSearchResults] = useState<ProductSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
  const [productQuantity, setProductQuantity] = useState(1);
  const [productDiscount, setProductDiscount] = useState(0);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<ProductSearchResult | null>(null);
  
  // استرجاع العملاء من قاعدة البيانات
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });
  
  // فلترة العملاء حسب البحث
  const filteredCustomers = searchTerm.trim() === '' 
    ? customers 
    : customers.filter((c: any) => 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.phone && c.phone.includes(searchTerm))
      );
  
  // اختيار عميل
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsCustomerDialogOpen(false);
  };
  
  // mutation لإضافة عميل جديد
  const addCustomerMutation = useMutation({
    mutationFn: async (customer: Omit<Customer, 'id' | 'totalPurchases'>) => {
      const response = await apiRequest('POST', '/api/customers', customer);
      return await response.json();
    },
    onSuccess: (newCustomerData: any) => {
      const customer: Customer = {
        id: newCustomerData.id.toString(),
        name: newCustomerData.name,
        phone: newCustomerData.phone || '',
        address: newCustomerData.address || '',
        isPotential: newCustomerData.isPotential || false
      };
      
      // تحديث قائمة العملاء
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      
      // اختيار العميل الجديد للفاتورة
      handleSelectCustomer(customer);
      
      // إظهار رسالة نجاح
      toast({
        title: t('customer_added'),
        description: t('customer_added_successfully'),
      });
      
      // إعادة تعيين الحالة
      setShowAddCustomerForm(false);
      setNewCustomer({
        name: '',
        phone: '',
        address: '',
        isPotential: true
      });
    },
    onError: (error) => {
      console.error('Error adding customer:', error);
      toast({
        title: t('error'),
        description: t('error_adding_customer'),
        variant: 'destructive',
      });
    }
  });
  
  // إنشاء عميل جديد من نموذج البحث
  const handleCreateNewCustomer = () => {
    // إنشاء عميل محتمل باسم البحث إذا كان غير فارغ
    if (searchTerm.trim()) {
      setNewCustomer({ ...newCustomer, name: searchTerm });
      setShowAddCustomerForm(true);
      // تأكد من إغلاق نماذج أخرى
      setShowBarcodeScanner(false);
      setShowProductSearch(false);
      console.log('Setting showAddCustomerForm to true');
    }
  };
  
  // إضافة عميل جديد من النموذج
  const handleAddCustomer = () => {
    if (!newCustomer.name) {
      toast({
        title: t('validation_error'),
        description: t('customer_name_required'),
        variant: 'destructive',
      });
      return;
    }
    
    addCustomerMutation.mutate(newCustomer, {
      onSuccess: (customer) => {
        console.log('Customer added successfully:', customer);
        setSelectedCustomer(customer);
        setShowAddCustomerForm(false);
        setIsCustomerDialogOpen(false);
        toast({
          title: t('success'),
          description: t('customer_added_successfully'),
        });
      },
      onError: (error) => {
        console.error('Error adding customer:', error);
        toast({
          title: t('error'),
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };
  
  // إغلاق النافذة المنبثقة
  const handleCloseInvoice = () => {
    // إعادة تعيين الحالة قبل الإغلاق
    setSelectedCustomer(null);
    setIsCustomerDialogOpen(true);
    setSearchTerm('');
    // إغلاق النافذة المنبثقة
    onOpenChange(false);
  };
  
  // استرجاع المنتجات من قاعدة البيانات
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<ProductSearchResult[]>({
    queryKey: ['/api/products'],
  });
  
  // اختيار منتج من نتائج البحث
  const handleSelectProduct = (product: ProductSearchResult) => {
    // بما أننا قمنا بفحص التوفر في السابق، يمكننا المتابعة مباشرة هنا
    const quantity = (product as any).quantity || 0;
    
    // على الرغم من ذلك، تحقق إضافي للسلامة
    if (quantity <= 0) {
      toast({
        title: t('cannot_add_product'),
        description: t('product_out_of_stock'),
        variant: "destructive"
      });
      return;
    }
    
    // تحديد المنتج المختار
    setSelectedProduct(product);
    // وضع الحد الأقصى للكمية المتوفرة
    setMaxAvailableQuantity(quantity);
    
    // إغلاق مربع البحث بعد اختيار المنتج
    setShowProductSearch(false);
  };
  
  // متغير لتخزين الحد الأقصى للكمية المتوفرة من المنتج
  const [maxAvailableQuantity, setMaxAvailableQuantity] = useState<number>(0);
  
  // إضافة المنتج المحدد إلى الفاتورة
  const addSelectedProductToInvoice = () => {
    if (selectedProduct) {
      // التحقق من أن الكمية المطلوبة لا تتجاوز الكمية المتوفرة
      if (productQuantity > maxAvailableQuantity) {
        alert(t('quantity_exceeds_available', { available: maxAvailableQuantity }));
        return;
      }
      
      // التحقق من أن الكمية موجبة
      if (productQuantity <= 0) {
        alert(t('quantity_must_be_positive'));
        return;
      }
      
      const newProduct: Product = {
        id: selectedProduct.id,
        name: selectedProduct.name,
        barcode: selectedProduct.barcode,
        sellingPrice: selectedProduct.sellingPrice,
        quantity: productQuantity,
        discount: productDiscount
      };
      
      // إضافة المنتج إلى الفاتورة النشطة
      setSelectedProduct(null);
      setProductQuantity(1);
      setProductDiscount(0);
      setMaxAvailableQuantity(0);
    }
  };

  // البحث عن المنتجات
  const searchProducts = (term: string) => {
    setIsSearching(true);
    
    // البحث في المنتجات المستلمة من قاعدة البيانات
    setTimeout(() => {
      const results = products.filter((product: any) => 
        product.name?.toLowerCase().includes(term.toLowerCase()) || 
        (product.code && product.code.toLowerCase().includes(term.toLowerCase())) || 
        (product.barcode && product.barcode.includes(term))
      );
      
      setProductSearchResults(results);
      setIsSearching(false);
    }, 300);
  };
  
  // معالجة تغيير مصطلح البحث
  const handleProductSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setProductSearchTerm(term);
    searchProducts(term);
  };
  
  // فتح واجهة البحث عن المنتجات
  const handleShowProductSearch = () => {
    setShowProductSearch(true);
    setShowBarcodeScanner(false);
    setProductSearchResults(products || []); // عرض جميع المنتجات من قاعدة البيانات
  };
  
  // فتح ماسح الباركود
  const handleShowBarcodeScanner = () => {
    setShowBarcodeScanner(true);
    setShowProductSearch(false);
  };
  
  // معالجة المنتج المحدد من الباركود
  const handleProductScanned = (scannedProd: any) => {
    console.log('Product scanned from barcode:', scannedProd);
    
    // البحث عن المنتج بالباركود في المنتجات المستلمة من قاعدة البيانات
    const foundProduct = products.find((p: any) => p.barcode === scannedProd.barcode);
    
    if (foundProduct) {
      // إضافة المنتج مباشرة إلى الفاتورة كمنتج محدد
      setSelectedProduct({
        id: foundProduct.id,
        name: foundProduct.name,
        barcode: foundProduct.barcode,
        sellingPrice: foundProduct.sellingPrice,
      });
      
      // إغلاق شاشة الماسح وإنهاء عملية المسح
      setShowBarcodeScanner(false);
      
      toast({
        title: t('product_found'),
        description: `${foundProduct.name} ${t('found_in_inventory')}`,
      });
      
      // هنا يمكن للمستخدم ضبط الكمية ثم إضافته
    } else if (scannedProd) {
      // إذا وجدنا المنتج من ماسح الباركود مباشرة
      setSelectedProduct({
        id: scannedProd.id,
        name: scannedProd.name,
        barcode: scannedProd.barcode,
        sellingPrice: scannedProd.sellingPrice,
      });
      
      setShowBarcodeScanner(false);
      
      toast({
        title: t('product_found'),
        description: `${scannedProd.name} ${t('ready_to_add')}`,
      });
    } else {
      // لم يتم العثور على المنتج
      toast({
        title: t('product_not_found'),
        description: t('barcode_not_recognized'),
        variant: "destructive"
      });
      
      // ترك المستخدم في نفس الشاشة للمحاولة مرة أخرى
    }
  };
  
  // إظهار الشاشة الصحيحة بناءً على الحالة الحالية
  const renderDialogContent = () => {
    console.log('Rendering dialog content:');
    console.log('- isCustomerDialogOpen:', isCustomerDialogOpen);
    console.log('- showAddCustomerForm:', showAddCustomerForm);
    console.log('- showBarcodeScanner:', showBarcodeScanner);
    console.log('- showProductSearch:', showProductSearch);
    console.log('- selectedCustomer:', selectedCustomer);
    
    // 1. عرض نموذج إضافة عميل جديد
    if (showAddCustomerForm) {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <User className="h-6 w-6 text-primary" />
              {t('add_new_customer')}
            </DialogTitle>
            <DialogDescription>
              {t('fill_customer_details')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t('customer_name')}</Label>
                <Input 
                  id="name" 
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                  placeholder={t('enter_customer_name')}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="phone">{t('phone')}</Label>
                <Input 
                  id="phone" 
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  placeholder={t('enter_phone')}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="address">{t('address')}</Label>
                <Input 
                  id="address" 
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                  placeholder={t('enter_address')}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="customer-type">{t('customer_type')}</Label>
                <Select 
                  defaultValue={newCustomer.isPotential ? "potential" : "regular"}
                  onValueChange={(value) => setNewCustomer({
                    ...newCustomer, 
                    isPotential: value === "potential"
                  })}
                >
                  <SelectTrigger id="customer-type">
                    <SelectValue placeholder={t('select_customer_type')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">{t('regular_customer')}</SelectItem>
                    <SelectItem value="potential">{t('potential_customer')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddCustomerForm(false);
              setIsCustomerDialogOpen(true);
            }}>
              {t('cancel')}
            </Button>
            <Button onClick={handleAddCustomer} disabled={addCustomerMutation.isPending}>
              {addCustomerMutation.isPending ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </>
      );
    }
    
    // 2. عرض واجهة ماسح الباركود
    else if (showBarcodeScanner) {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ScanLine className="h-6 w-6 text-primary" />
              {t('scan_barcode')}
            </DialogTitle>
            <DialogDescription>
              {t('position_barcode_in_camera')}
            </DialogDescription>
          </DialogHeader>
          
          <div>
            <BarcodeScanner onProductScanned={handleProductScanned} />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBarcodeScanner(false)}>
              {t('cancel')}
            </Button>
          </DialogFooter>
        </>
      );
    }
    
    // 3. عرض واجهة البحث عن المنتجات
    else if (showProductSearch) {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ShoppingBasket className="h-6 w-6 text-primary" />
              {t('search_products')}
            </DialogTitle>
            <DialogDescription>
              {t('search_or_select_products')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                placeholder={t('search_products_by_name')}
                className="pl-10"
              />
            </div>
            
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className="p-3 rounded-md border hover:border-primary hover:bg-muted cursor-pointer transition-colors"
                >
                  <div className="font-medium">{product.name}</div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{product.barcode || t('no_barcode')}</span>
                    <span className="font-semibold text-primary">
                      {formatCurrency(product.sellingPrice)}
                    </span>
                  </div>
                </div>
              ))}
              
              {products.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  {productSearchTerm ? t('no_products_found') : t('enter_product_name')}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductSearch(false)}>
              {t('cancel')}
            </Button>
            {scannedProduct && (
              <Button onClick={() => handleSelectProduct(scannedProduct)}>
                {t('add_scanned_product')}
              </Button>
            )}
          </DialogFooter>
        </>
      );
    }
    
    // 4. عرض قائمة العملاء للاختيار
    else if (isCustomerDialogOpen) {
      // شاشة اختيار العميل
      return (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Users className="h-6 w-6 text-primary" />
              {t('select_customer')}
            </DialogTitle>
            <DialogDescription>
              {t('search_customer_or_create_new')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* بحث العملاء */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder={t('search_customers')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border-primary/20 focus:border-primary/50"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* قائمة العملاء */}
            <div className="max-h-72 overflow-y-auto rounded-lg border border-primary/20 shadow-sm">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer, index) => (
                  <div
                    key={customer.id}
                    className={`p-3 cursor-pointer hover:bg-primary/5 transition-colors ${
                      index !== filteredCustomers.length - 1 ? "border-b border-primary/10" : ""
                    }`}
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center ${isRtl ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-medium">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium flex items-center text-primary">
                            {customer.name}
                            {customer.isPotential && (
                              <span className={`${isRtl ? 'mr-2' : 'ml-2'} text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full`}>
                                {t('potential_customer')}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {customer.phone || t('no_phone_number')}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-primary/60" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 px-4 bg-muted/10">
                  <p className="text-muted-foreground mb-3">{t('no_customer_found')}</p>
                  {searchTerm.trim() && (
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full bg-gradient-to-r from-primary to-primary-600"
                      onClick={handleCreateNewCustomer}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      {t('create_new_customer_with_name', { name: searchTerm })}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex justify-between items-center pt-2">
            <Button variant="outline" onClick={handleCloseInvoice}>
              {t('cancel')}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setNewCustomer({
                  name: searchTerm,
                  phone: '',
                  address: '',
                  isPotential: true
                });
                setShowAddCustomerForm(true);
                setIsCustomerDialogOpen(false);
              }}
              className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 hover:bg-primary/20 transition-all"
            >
              <PlusCircle className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />
              {t('new_customer')}
            </Button>
          </DialogFooter>
        </>
      );
    } else if (showAddCustomerForm) {
      // نموذج إضافة عميل جديد
      return (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <PlusCircle className="h-6 w-6 text-primary" />
              {t('add_new_customer')}
            </DialogTitle>
            <DialogDescription>
              {t('add_customer_description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="font-medium text-primary">
                {t('name')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder={t('customer_name')}
                className="border-primary/20 focus:border-primary"
                autoFocus
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="phone" className="font-medium">
                {t('phone')}
              </Label>
              <Input
                id="phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder={t('phone_number')}
                className="border-primary/20 focus:border-primary"
                type="tel"
                inputMode="tel"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="address" className="font-medium">
                {t('address')}
              </Label>
              <Input
                id="address"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                placeholder={t('customer_address')}
                className="border-primary/20 focus:border-primary"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="isPotential" className="font-medium">
                {t('potential_client')}
              </Label>
              <Select
                value={newCustomer.isPotential ? 'yes' : 'no'}
                onValueChange={(value) => setNewCustomer({ ...newCustomer, isPotential: value === 'yes' })}
              >
                <SelectTrigger id="isPotential" className="border-primary/20 focus:border-primary bg-white dark:bg-gray-950">
                  <SelectValue placeholder={t('select')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">{t('yes')}</SelectItem>
                  <SelectItem value="no">{t('no')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="flex space-x-2 rtl:space-x-reverse">
            <Button variant="outline" 
              onClick={() => {
                setShowAddCustomerForm(false);
                setIsCustomerDialogOpen(true);
              }}
              className="border-muted-foreground/20"
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
                  <svg className={`animate-spin ${isRtl ? '-mr-1 ml-2' : '-ml-1 mr-2'} h-4 w-4 text-white`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('saving')}
                </>
              ) : (
                t('save')
              )}
            </Button>
          </DialogFooter>
        </>
      );
    } else if (showBarcodeScanner) {
      // واجهة ماسح الباركود
      return (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Scan className="h-6 w-6 text-primary" />
              {t('scan_barcode')}
            </DialogTitle>
            <DialogDescription>
              {t('position_barcode_in_frame')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="border-2 border-primary/30 p-2 rounded-lg shadow-sm bg-white dark:bg-gray-950">
              <BarcodeScanner onProductScanned={handleProductScanned} />
            </div>
            
            {scannedProduct && (
              <div className="mt-4 p-4 border border-green-200 dark:border-green-900 rounded-lg bg-green-50 dark:bg-green-900/20">
                <h3 className="font-medium flex items-center text-green-700 dark:text-green-400">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  {t('product_found')}
                </h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">{t('product_name')}:</span> {scannedProduct.name}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">{t('barcode')}:</span> {scannedProduct.barcode}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">{t('price')}:</span> {formatCurrency(scannedProduct.sellingPrice)}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setShowBarcodeScanner(false)}
              className="border-primary/20"
            >
              {t('back')}
            </Button>
            
            {scannedProduct && (
              <Button 
                onClick={() => handleSelectProduct(scannedProduct)}
                className="bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700"
              >
                <ShoppingBasket className="h-4 w-4 mr-2" />
                {t('add_to_invoice')}
              </Button>
            )}
          </DialogFooter>
        </>
      );
    } else if (showProductSearch) {
      // واجهة البحث عن المنتجات
      return (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Search className="h-6 w-6 text-primary" />
              {t('search_products')}
            </DialogTitle>
            <DialogDescription>
              {t('select_product_to_add')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder={t('search_products')}
                value={productSearchTerm}
                onChange={handleProductSearchChange}
                className="pl-10 border-primary/20 focus:border-primary"
                autoFocus
              />
              {productSearchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  onClick={() => {
                    setProductSearchTerm('');
                    handleProductSearchChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {isSearching ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                <p className="mt-2 text-sm text-muted-foreground">{t('searching')}</p>
              </div>
            ) : productSearchResults.length > 0 ? (
              <div className="max-h-72 overflow-y-auto rounded-lg border border-primary/20 shadow-sm">
                {productSearchResults.map((product, index) => {
                  const quantity = (product as any).quantity || 0;
                  const isOutOfStock = quantity <= 0;
                  const isLowStock = quantity > 0 && quantity <= 5;
                  
                  return (
                    <div 
                      key={product.id} 
                      className={`p-3 cursor-pointer transition-colors ${
                        isOutOfStock ? 'opacity-60 bg-red-50 dark:bg-red-950/10' : 'hover:bg-primary/5'
                      } ${index !== productSearchResults.length - 1 ? "border-b border-primary/10" : ""}`}
                      onClick={() => {
                        if (isOutOfStock) {
                          toast({
                            title: t('cannot_add_product'),
                            description: t('product_out_of_stock'),
                            variant: "destructive"
                          });
                          return;
                        }
                        handleSelectProduct(product);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-primary flex items-center">
                            {product.name}
                            {isOutOfStock && (
                              <span className="ml-2 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded-full">
                                {t('out_of_stock')}
                              </span>
                            )}
                            {isLowStock && (
                              <span className="ml-2 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                {t('low_stock')}
                              </span>
                            )}
                          </div>
                          
                          <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                            {product.barcode && (
                              <span className="inline-flex items-center">
                                <ScanLine className="h-3 w-3 mr-1 opacity-70" />
                                {product.barcode}
                              </span>
                            )}
                            {product.code && (
                              <span className="inline-flex items-center">
                                <Hash className="h-3 w-3 mr-1 opacity-70" />
                                {product.code}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right flex flex-col items-end">
                          <div className="font-medium text-primary">
                            {formatCurrency(product.sellingPrice)}
                          </div>
                          <div className={`text-xs mt-1 font-medium ${
                            quantity > 5 ? 'text-green-600 dark:text-green-400' : 
                            quantity > 0 ? 'text-amber-600 dark:text-amber-400' : 
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {quantity} {t('items_available')}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-muted-foreground/30 rounded-lg bg-muted/10">
                <div className="text-muted-foreground">
                  {productSearchTerm ? t('no_products_found') : t('start_typing_to_search')}
                </div>
                {!productSearchTerm && (
                  <p className="text-xs text-muted-foreground/70 mt-2">{t('all_products_will_appear')}</p>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowProductSearch(false)}
              className="border-primary/20"
            >
              {t('back')}
            </Button>
          </DialogFooter>
        </>
      );
    } else {
      // شاشة إنشاء الفاتورة بعد اختيار العميل
      return (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ReceiptText className="h-6 w-6 text-primary" />
              {t('create_invoice')}
            </DialogTitle>
            <DialogDescription>
              {t('customer')}: <span className="font-medium">{selectedCustomer?.name}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {selectedCustomer && (
              <>
                {/* أزرار إضافة المنتج وماسح الباركود */}
                <div className="flex gap-2 mb-6">
                  <Button 
                    onClick={handleShowProductSearch}
                    className="flex-1 gap-2"
                  >
                    <PlusCircle className="h-5 w-5" />
                    {t('add_product')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleShowBarcodeScanner}
                    className="flex gap-2"
                  >
                    <Scan className="h-5 w-5" />
                    {t('scan_barcode')}
                  </Button>
                </div>
                
                <ActiveInvoice
                  customer={selectedCustomer}
                  onClose={handleCloseInvoice}
                  onAddProduct={selectedProduct ? addSelectedProductToInvoice : undefined}
                  onProductScanned={handleProductScanned}
                />
              </>
            )}
          </div>
        </>
      );
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
        {renderDialogContent()}
      </DialogContent>
    </Dialog>
  );
}