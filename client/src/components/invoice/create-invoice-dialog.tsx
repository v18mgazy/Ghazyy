import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReceiptText, Search, X, ChevronRight, Users, Tag, Scan } from 'lucide-react';
import { useLocale } from '@/hooks/use-locale';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from '@/lib/utils';
import BarcodeScanner from '@/components/barcode-scanner';
import ActiveInvoice from '@/components/invoice/active-invoice';

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
  const { language } = useLocale();
  const isRtl = language === 'ar';
  
  // حالة اختيار العميل
  const [searchTerm, setSearchTerm] = useState('');
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(true);  // افتح مربع حوار العملاء افتراضيًا
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // حالة البحث عن المنتج وإضافته
  const [activeTab, setActiveTab] = useState<'search' | 'barcode'>('search');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<ProductSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
  const [productQuantity, setProductQuantity] = useState(1);
  const [productDiscount, setProductDiscount] = useState(0);
  
  // حالة ماسح الباركود
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<ProductSearchResult | null>(null);
  
  // قائمة بالعملاء للاختيار (ستكون من API في التطبيق الحقيقي)
  const mockCustomers: Customer[] = [
    {
      id: 'c1',
      name: 'أحمد محمد',
      phone: '0123456789',
      address: 'القاهرة، مصر',
      isPotential: false
    },
    {
      id: 'c2',
      name: 'سارة علي',
      phone: '0198765432',
      address: 'الإسكندرية، مصر',
      isPotential: false
    },
    {
      id: 'c3',
      name: 'محمد أحمد',
      phone: '0112233445',
      address: 'الجيزة، مصر',
      isPotential: true
    }
  ];
  
  // فلترة العملاء حسب البحث
  const filteredCustomers = searchTerm.trim() === '' 
    ? mockCustomers 
    : mockCustomers.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone.includes(searchTerm)
      );
  
  // اختيار عميل
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsCustomerDialogOpen(false);
  };
  
  // إنشاء عميل جديد
  const handleCreateNewCustomer = () => {
    // إنشاء عميل محتمل باسم البحث إذا كان غير فارغ
    if (searchTerm.trim()) {
      const newCustomer: Customer = {
        id: 'new-' + Date.now(),
        name: searchTerm,
        phone: '',
        address: '',
        isPotential: true
      };
      
      handleSelectCustomer(newCustomer);
    }
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
  
  // بيانات المنتجات للبحث (ستكون من API في التطبيق الحقيقي)
  const mockProducts: ProductSearchResult[] = [
    {
      id: 'p1',
      name: 'هاتف سامسونج جالكسي S21',
      barcode: '8801643992941',
      code: 'SM-G991',
      sellingPrice: 12999.99,
      category: 'الإلكترونيات'
    },
    {
      id: 'p2',
      name: 'ايفون 13 برو',
      barcode: '194252705841',
      code: 'IP-13PRO',
      sellingPrice: 16999.99,
      category: 'الإلكترونيات'
    },
    {
      id: 'p3',
      name: 'لابتوب لينوفو ثينكباد',
      barcode: '195713147532',
      code: 'LT-T14',
      sellingPrice: 11499.99,
      category: 'الإلكترونيات'
    },
    {
      id: 'p4',
      name: 'ساعة أبل الذكية',
      barcode: '190199269033',
      code: 'AW-S7',
      sellingPrice: 3999.99,
      category: 'الإلكترونيات'
    },
    {
      id: 'p5',
      name: 'سماعات سوني اللاسلكية',
      barcode: '027242916852',
      code: 'SH-WH1000',
      sellingPrice: 1899.99,
      category: 'الإلكترونيات'
    }
  ];
  
  // البحث عن المنتجات
  const searchProducts = (term: string) => {
    if (!term.trim()) {
      setProductSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    // محاكاة طلب البحث
    setTimeout(() => {
      const results = mockProducts.filter(product => 
        product.name.includes(term) || 
        product.code?.includes(term) || 
        product.barcode?.includes(term)
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
  
  // اختيار منتج من نتائج البحث
  const handleSelectProduct = (product: ProductSearchResult) => {
    setSelectedProduct(product);
    setProductSearchTerm('');
    setProductSearchResults([]);
  };
  
  // إضافة المنتج المحدد إلى الفاتورة
  const addSelectedProductToInvoice = () => {
    if (selectedProduct) {
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
    }
  };
  
  // تعامل مع المنتج الممسوح ضوئيًا
  const handleProductScanned = (scannedProd: any) => {
    // البحث عن المنتج بالباركود
    const foundProduct = mockProducts.find(p => p.barcode === scannedProd.barcode);
    
    if (foundProduct) {
      setScannedProduct(foundProduct);
      setShowBarcodeScanner(false);
    } else {
      // إنشاء منتج جديد إذا لم يتم العثور عليه
      const newProduct: ProductSearchResult = {
        id: 'new-' + Date.now(),
        name: scannedProd.name || 'منتج جديد',
        barcode: scannedProd.barcode,
        sellingPrice: scannedProd.sellingPrice || 0,
      };
      setScannedProduct(newProduct);
      setShowBarcodeScanner(false);
    }
  };
  
  // إضافة المنتج الممسوح إلى الفاتورة
  const addScannedProductToInvoice = () => {
    if (scannedProduct) {
      const newProduct: Product = {
        id: scannedProduct.id,
        name: scannedProduct.name,
        barcode: scannedProduct.barcode,
        sellingPrice: scannedProduct.sellingPrice,
        quantity: productQuantity,
        discount: productDiscount
      };
      
      // إضافة المنتج إلى الفاتورة النشطة
      setScannedProduct(null);
      setProductQuantity(1);
      setProductDiscount(0);
      setShowBarcodeScanner(false);
      // onAddProduct(newProduct) يجب تنفيذ هذا في الفاتورة النشطة
    }
  };
  
  // فتح ماسح الباركود
  const handleScanBarcode = () => {
    setShowBarcodeScanner(true);
    setActiveTab('barcode');
  };
  
  // إظهار الشاشة الصحيحة بناءً على الحالة الحالية
  const renderDialogContent = () => {
    if (isCustomerDialogOpen) {
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
                className="pl-10 w-full"
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
            <div className="max-h-72 overflow-y-auto space-y-2 pr-2">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-3 border border-border rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium flex items-center">
                            {customer.name}
                            {customer.isPotential && (
                              <span className="ml-2 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                {t('potential_customer')}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {customer.phone || t('no_phone_number')}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">{t('no_customer_found')}</p>
                  {searchTerm.trim() && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={handleCreateNewCustomer}
                    >
                      {t('create_new_customer_with_name', { name: searchTerm })}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex justify-between items-center">
            <Button variant="outline" onClick={handleCloseInvoice}>
              {t('cancel')}
            </Button>
            <Button onClick={handleCreateNewCustomer} disabled={!searchTerm.trim()}>
              {t('add_customer')}
            </Button>
          </DialogFooter>
        </>
      );
    } else if (showBarcodeScanner) {
      // واجهة ماسح الباركود
      return (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5 text-primary" />
              {t('scan_barcode')}
            </DialogTitle>
            <DialogDescription>
              {t('position_barcode_in_frame')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <BarcodeScanner onProductScanned={handleProductScanned} />
            
            {scannedProduct && (
              <div className="mt-4 border rounded-md p-4 bg-muted/20">
                <h3 className="font-medium text-lg mb-2">{t('scanned_product')}</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="product-name">{t('product_name')}</Label>
                      <Input 
                        id="product-name"
                        value={scannedProduct.name}
                        onChange={(e) => setScannedProduct({...scannedProduct, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="product-price">{t('price')}</Label>
                      <Input 
                        id="product-price"
                        type="number"
                        value={scannedProduct.sellingPrice}
                        onChange={(e) => setScannedProduct({...scannedProduct, sellingPrice: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="product-quantity">{t('quantity')}</Label>
                      <Input 
                        id="product-quantity"
                        type="number"
                        min="1"
                        value={productQuantity}
                        onChange={(e) => setProductQuantity(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="product-discount">{t('discount')} (%)</Label>
                      <Input 
                        id="product-discount"
                        type="number"
                        min="0"
                        max="100"
                        value={productDiscount}
                        onChange={(e) => setProductDiscount(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setScannedProduct(null)}>
                      {t('cancel')}
                    </Button>
                    <Button onClick={addScannedProductToInvoice}>
                      {t('add_to_invoice')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBarcodeScanner(false)}>
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
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'search' | 'barcode')} className="mb-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="search" className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      {t('search_products')}
                    </TabsTrigger>
                    <TabsTrigger value="barcode" className="flex items-center gap-2">
                      <Scan className="h-4 w-4" />
                      {t('scan_barcode')}
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* البحث عن المنتجات */}
                  <TabsContent value="search" className="space-y-4 mt-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                      <Input
                        placeholder={t('search_products')}
                        value={productSearchTerm}
                        onChange={handleProductSearchChange}
                        className="pl-10 w-full"
                      />
                      {productSearchTerm && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                          onClick={() => setProductSearchTerm('')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    {/* نتائج البحث */}
                    {isSearching ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                      </div>
                    ) : productSearchResults.length > 0 ? (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                        {productSearchResults.map(product => (
                          <Card key={product.id} className="overflow-hidden cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSelectProduct(product)}>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-medium">{product.name}</div>
                                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                                    {product.code && (
                                      <span className="mr-3">{t('code')}: {product.code}</span>
                                    )}
                                    {product.barcode && (
                                      <span>
                                        <Tag className="h-3 w-3 mr-1 inline-block" />
                                        {product.barcode}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-semibold text-primary">
                                    {formatCurrency(product.sellingPrice)}
                                  </div>
                                  {product.category && (
                                    <div className="text-xs text-muted-foreground">
                                      {product.category}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : productSearchTerm ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">{t('no_products_found')}</p>
                      </div>
                    ) : null}
                    
                    {/* نموذج المنتج المحدد */}
                    {selectedProduct && (
                      <div className="border rounded-md p-4 bg-muted/20">
                        <h3 className="font-medium text-lg mb-2">{t('selected_product')}</h3>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="selected-product-name">{t('product_name')}</Label>
                              <div className="font-medium pt-2">{selectedProduct.name}</div>
                            </div>
                            <div>
                              <Label htmlFor="selected-product-price">{t('price')}</Label>
                              <div className="font-medium pt-2">{formatCurrency(selectedProduct.sellingPrice)}</div>
                            </div>
                            <div>
                              <Label htmlFor="selected-product-quantity">{t('quantity')}</Label>
                              <Input 
                                id="selected-product-quantity"
                                type="number"
                                min="1"
                                value={productQuantity}
                                onChange={(e) => setProductQuantity(Number(e.target.value))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="selected-product-discount">{t('discount')} (%)</Label>
                              <Input 
                                id="selected-product-discount"
                                type="number"
                                min="0"
                                max="100"
                                value={productDiscount}
                                onChange={(e) => setProductDiscount(Number(e.target.value))}
                              />
                            </div>
                          </div>
                          
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                              {t('cancel')}
                            </Button>
                            <Button onClick={addSelectedProductToInvoice}>
                              {t('add_to_invoice')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  {/* ماسح الباركود */}
                  <TabsContent value="barcode" className="mt-4">
                    <Button 
                      onClick={() => setShowBarcodeScanner(true)} 
                      variant="outline" 
                      className="w-full h-16"
                    >
                      <Scan className="mr-2 h-5 w-5" />
                      {t('open_barcode_scanner')}
                    </Button>
                  </TabsContent>
                </Tabs>
                
                <ActiveInvoice
                  customer={selectedCustomer}
                  onClose={handleCloseInvoice}
                  onAddProduct={handleScanBarcode}
                />
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomerDialogOpen(true)}>
              {t('change_customer')}
            </Button>
          </DialogFooter>
        </>
      );
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-4xl ${selectedCustomer && !isCustomerDialogOpen ? 'max-h-[90vh] overflow-y-auto' : ''}`}>
        {renderDialogContent()}
      </DialogContent>
    </Dialog>
  );
}