import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ReceiptText, Search, X, ChevronRight, Users } from 'lucide-react';
import { useLocale } from '@/hooks/use-locale';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
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
  
  // حالة المنتجات
  const [productSearchResults, setProductSearchResults] = useState<ProductSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
  const [productQuantity, setProductQuantity] = useState(1);
  const [productDiscount, setProductDiscount] = useState(0);
  
  // عرض جميع المنتجات تلقائيا عند فتح نافذة الفاتورة
  useEffect(() => {
    if (!isCustomerDialogOpen) {
      // تعيين جميع المنتجات لعرضها مباشرة بدون حاجة للبحث
      setProductSearchResults(mockProducts);
    }
  }, [isCustomerDialogOpen]);
  
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
  
  // اختيار منتج من نتائج البحث
  const handleSelectProduct = (product: ProductSearchResult) => {
    setSelectedProduct(product);
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

  // مع المنتج الممسوح ضوئيًا (للتوافق مع الواجهات الأخرى)
  const handleProductScanned = (scannedProd: any) => {
    // البحث عن المنتج بالباركود
    const foundProduct = mockProducts.find(p => p.barcode === scannedProd.barcode);
    
    if (foundProduct) {
      setSelectedProduct(foundProduct);
    }
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
    } else {
      // شاشة إنشاء الفاتورة بعد اختيار العميل (تم إزالة واجهة المسح الضوئي تماماً)
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
                {/* عرض المنتجات مباشرة بدون حقل البحث أو زر الباركود */}
                <div className="space-y-4 mb-6">
                  <h3 className="font-medium text-base">{t('available_products')}</h3>
                  
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
                                <div className="text-sm text-muted-foreground">
                                  {product.code && <span className="mr-2">{t('code')}: {product.code}</span>}
                                  {product.category && <span>{t('category')}: {product.category}</span>}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-primary">
                                  {formatCurrency(product.sellingPrice)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">{t('no_products_found')}</p>
                    </div>
                  )}
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {renderDialogContent()}
      </DialogContent>
    </Dialog>
  );
}