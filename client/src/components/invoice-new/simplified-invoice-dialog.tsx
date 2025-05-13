import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocale } from '@/hooks/use-locale';
import { useToast } from '@/hooks/use-toast';
import { 
  ReceiptText, Search, User, X, ShoppingCart, Check, Scan, ChevronRight,
  Printer, Plus, Minus, DollarSign, Percent, Package2, Calculator, Trash2,
  RefreshCcw, RotateCcw, ArrowLeft, CheckCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { apiRequest, queryClient } from '@/lib/queryClient';

// UI Components
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Custom Components
import BarcodeScanner from '@/components/barcode-scanner';
import InvoicePreview from '@/components/invoice/invoice-preview';

interface SimplifiedInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedProduct?: any;
}

const SimplifiedInvoiceDialog: React.FC<SimplifiedInvoiceDialogProps> = ({
  open,
  onOpenChange,
  preSelectedProduct
}) => {
  const { t } = useTranslation();
  const { language } = useLocale();
  const isRtl = language === 'ar';
  const { toast } = useToast();

  // حالة الفاتورة
  const [activeTab, setActiveTab] = useState('customer');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [invoiceProducts, setInvoiceProducts] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // حالة البحث عن المنتجات
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [productCommandOpen, setProductCommandOpen] = useState(false);

  // حالة معاينة الفاتورة
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  // حالة المجاميع
  const [subtotal, setSubtotal] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [total, setTotal] = useState(0);
  
  // إضافة عميل جديد
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    isPotential: false
  });
  
  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: any) => {
      try {
        const res = await apiRequest('POST', '/api/customers', customerData);
        return await res.json();
      } catch (error) {
        console.error('Error creating customer:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Customer created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setSelectedCustomer(data);
      setActiveTab('products');
      setShowAddCustomer(false);
      setNewCustomer({ name: '', phone: '', address: '', notes: '', isPotential: false });
      toast({
        title: t('success'),
        description: t('customer_created_successfully'),
      });
    },
    onError: (error: any) => {
      console.error('Error in customer creation:', error);
      toast({
        title: t('error'),
        description: error.message || t('error_creating_customer'),
        variant: 'destructive',
      });
    }
  });

  const handleCreateCustomer = () => {
    if (!newCustomer.name.trim()) {
      toast({
        title: t('error'),
        description: t('customer_name_required'),
        variant: 'destructive'
      });
      return;
    }
    
    createCustomerMutation.mutate(newCustomer);
  };

  // استعلامات البيانات
  const { data: customers = [] } = useQuery({
    queryKey: ['/api/customers'],
  });

  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
  });

  // عملية إنشاء فاتورة جديدة
  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      try {
        const res = await apiRequest('POST', '/api/invoices', invoiceData);
        const data = await res.json();
        return data;
      } catch (error) {
        console.error('Error creating invoice:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // تأكد من أن البيانات صحيحة وموجودة
      console.log('Invoice created successfully:', data);
      setInvoiceData(data);
      setCreatedInvoice(data);
      setShowInvoicePreview(true);
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: t('success'),
        description: t('invoice_created_successfully'),
      });
    },
    onError: (error: any) => {
      console.error('Error in mutation handler:', error);
      toast({
        title: t('error'),
        description: error.message || t('error_creating_invoice'),
        variant: 'destructive',
      });
    }
  });

  // تصفية العملاء بناءً على مصطلح البحث
  const filteredCustomers = customerSearchTerm.trim() 
    ? customers.filter((customer: any) => 
        customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        (customer.phone && customer.phone.includes(customerSearchTerm))
      )
    : customers;

  // تصفية المنتجات بناءً على مصطلح البحث
  const filteredProducts = productSearchTerm.trim() 
    ? products.filter((product: any) => 
        product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        (product.barcode && product.barcode.includes(productSearchTerm))
      )
    : products;

  // حساب المجاميع
  const calculateTotals = useCallback((products: any[]) => {
    // حساب المجموع الفرعي (subtotal): إجمالي أسعار المنتجات قبل أي خصم
    const newSubtotal = products.reduce((sum, product) => {
      return sum + (product.sellingPrice * product.quantity);
    }, 0);
    
    // حساب إجمالي الخصم على مستوى المنتج
    const newTotalDiscount = products.reduce((sum, product) => {
      const discount = product.discount 
        ? (product.sellingPrice * product.quantity * (product.discount / 100)) 
        : 0;
      return sum + discount;
    }, 0);
    
    // حساب قيمة الخصم على مستوى الفاتورة
    // يتم تطبيق خصم الفاتورة كقيمة مباشرة بدلاً من نسبة مئوية
    const subtotalAfterProductDiscount = newSubtotal - newTotalDiscount;
    const invoiceDiscountAmount = invoiceDiscount > 0 ? invoiceDiscount : 0;
    
    // التأكد من أن الخصم لا يتجاوز إجمالي الفاتورة بعد خصم المنتجات
    const validInvoiceDiscount = Math.min(invoiceDiscountAmount, subtotalAfterProductDiscount);
      
    // حساب المجموع النهائي بعد جميع الخصومات
    const newTotal = subtotalAfterProductDiscount - validInvoiceDiscount;
    
    // تحديث حالة المكون
    setSubtotal(newSubtotal);
    setTotalDiscount(newTotalDiscount);
    setTotal(newTotal);
    
    console.log(`حساب المجاميع: ${newSubtotal} - ${newTotalDiscount} (خصم منتج) - ${invoiceDiscountAmount} (خصم فاتورة ${invoiceDiscount}%) = ${newTotal}`);
  }, [invoiceDiscount]);

  // إضافة منتج للفاتورة
  const handleAddProduct = (product: any) => {
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
    const existingProductIndex = invoiceProducts.findIndex(p => p.id === product.id);
    
    if (existingProductIndex !== -1) {
      // زيادة الكمية إذا كان المنتج موجوداً بالفعل
      const updatedProducts = [...invoiceProducts];
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
      
      setInvoiceProducts(updatedProducts);
      calculateTotals(updatedProducts);
    } else {
      // إضافة المنتج الجديد بكمية 1
      const productToAdd = {
        ...product,
        quantity: 1,
        discount: 0
      };
      
      const updatedProducts = [...invoiceProducts, productToAdd];
      setInvoiceProducts(updatedProducts);
      calculateTotals(updatedProducts);
    }
    
    // إغلاق قائمة المنتجات بعد الإضافة
    setProductCommandOpen(false);
  };

  // تحديث كمية المنتج
  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) {
      return;
    }
    
    const product = invoiceProducts[index];
    
    // التحقق من المخزون المتاح
    if (newQuantity > (product.stock || 0)) {
      toast({
        title: t('error'),
        description: t('quantity_exceeds_available', { available: product.stock }),
        variant: 'destructive',
      });
      return;
    }
    
    const updatedProducts = [...invoiceProducts];
    updatedProducts[index] = {
      ...updatedProducts[index],
      quantity: newQuantity
    };
    
    setInvoiceProducts(updatedProducts);
    calculateTotals(updatedProducts);
  };

  // تحديث خصم المنتج
  const handleUpdateDiscount = (index: number, newDiscount: number) => {
    if (newDiscount < 0 || newDiscount > 100) {
      return;
    }
    
    const updatedProducts = [...invoiceProducts];
    updatedProducts[index] = {
      ...updatedProducts[index],
      discount: newDiscount
    };
    
    setInvoiceProducts(updatedProducts);
    calculateTotals(updatedProducts);
  };

  // إزالة منتج من الفاتورة
  const handleRemoveProduct = (index: number) => {
    const updatedProducts = [...invoiceProducts];
    updatedProducts.splice(index, 1);
    setInvoiceProducts(updatedProducts);
    calculateTotals(updatedProducts);
  };

  // التعامل مع ماسح الباركود
  const handleBarcodeScanned = (result: any) => {
    if (result && result.barcode) {
      const foundProduct = products.find((p: any) => p.barcode === result.barcode);
      
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
    
    if (invoiceProducts.length === 0) {
      toast({
        title: t('error'),
        description: t('add_products_first'),
        variant: 'destructive',
      });
      return;
    }
    
    // إنشاء البيانات اللازمة للفاتورة
    // حساب قيمة خصم الفاتورة أولاً
    const subtotalBeforeInvoiceDiscount = invoiceProducts.reduce((sum, product) => {
      const productDiscount = product.discount || 0;
      const productPrice = product.sellingPrice;
      const productQuantity = product.quantity;
      return sum + (productPrice * productQuantity * (1 - (productDiscount / 100)));
    }, 0);
    
    // تحضير خصم الفاتورة مع التأكد من أنه لا يتجاوز إجمالي الفاتورة
    const invoiceDiscountValue = Math.min(invoiceDiscount, subtotalBeforeInvoiceDiscount);
    
    // معدل الخصم (كنسبة من الإجمالي للتوزيع على المنتجات)
    const invoiceDiscountRate = invoiceDiscountValue > 0 ? (invoiceDiscountValue / subtotalBeforeInvoiceDiscount) : 0;
    
    // إضافة تأثير الخصم على مستوى المنتج والفاتورة
    const invoiceItems = invoiceProducts.map(product => {
      // حساب خصم المنتج
      const productDiscount = product.discount || 0;
      const productPrice = product.sellingPrice;
      const productQuantity = product.quantity;
      
      // حساب إجمالي سعر المنتج بعد خصم المنتج
      const productTotalAfterProductDiscount = productPrice * productQuantity * (1 - (productDiscount / 100));
      
      // حساب نسبة هذا المنتج من إجمالي الفاتورة (بعد الخصومات على مستوى المنتج)
      const productRatioOfInvoice = productTotalAfterProductDiscount / subtotalBeforeInvoiceDiscount;
      
      // حصة المنتج من خصم الفاتورة (بناءً على نسبة قيمته من الإجمالي)
      const productShareOfInvoiceDiscount = productTotalAfterProductDiscount * invoiceDiscountRate;
      
      // إجمالي سعر المنتج النهائي بعد جميع الخصومات
      const finalProductTotal = Number((productTotalAfterProductDiscount - productShareOfInvoiceDiscount).toFixed(2));
      
      // حساب الربح مع مراعاة خصم المنتج وخصم الفاتورة
      const purchasePrice = product.purchasePrice || 0;
      
      // الربح الأساسي بعد خصم المنتج وقبل خصم الفاتورة
      const basicProfit = (productPrice * (1 - (productDiscount / 100)) - purchasePrice) * productQuantity;
      
      // الربح النهائي بعد تطبيق جميع الخصومات (يتأثر بخصم الفاتورة والمنتج)
      const finalProfit = Number((basicProfit * (1 - invoiceDiscountRate)).toFixed(2));
      
      console.log(`منتج ${product.name}: سعر=${productPrice}, خصم المنتج=${productDiscount}%, سعر الشراء=${purchasePrice}, إجمالي بعد خصم المنتج=${productTotalAfterProductDiscount}, حصة خصم الفاتورة=${productShareOfInvoiceDiscount}, ربح=${finalProfit}`);
      
      return {
        productId: product.id,
        productName: product.name,
        barcode: product.barcode,
        price: productPrice,
        sellingPrice: productPrice,
        purchasePrice: purchasePrice,
        quantity: productQuantity,
        discount: productDiscount,
        invoiceDiscountShare: productShareOfInvoiceDiscount, // حفظ حصة المنتج من خصم الفاتورة
        total: finalProductTotal, // الإجمالي النهائي بعد كل الخصومات
        profit: finalProfit // الربح النهائي (لا يتأثر بالخصومات)
      };
    });
    
    // تعيين حالة الدفع بناءً على طريقة الدفع المختارة
    const paymentStatus = paymentMethod === 'deferred' || paymentMethod === 'pay_later' ? 'pending' : 'paid';
    
    // إنشاء رقم فاتورة عشوائي
    const randomInvoiceNumber = `INV-${Math.floor(Math.random() * 900000) + 100000}`;
    
    // حساب قيمة خصم الفاتورة بشكل صحيح (الآن كقيمة مباشرة)
    const subtotalAfterProductDiscount = subtotal - totalDiscount;
    const invoiceDiscountAmount = invoiceDiscount > 0 ? invoiceDiscount : 0;
    
    // التأكد من أن الخصم لا يتجاوز إجمالي الفاتورة بعد خصم المنتجات
    // استخدام نفس المتغير المعرف سابقاً
    const finalInvoiceDiscount = Math.min(invoiceDiscountAmount, subtotalAfterProductDiscount);
    
    // حساب الإجمالي النهائي مع مراعاة جميع الخصومات
    const finalTotal = Number((subtotalAfterProductDiscount - finalInvoiceDiscount).toFixed(2));
    
    // إنشاء كائن الفاتورة للإرسال
    const invoice = {
      invoiceNumber: randomInvoiceNumber,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      customerAddress: selectedCustomer.address,
      date: new Date().toISOString(),
      paymentMethod,
      paymentStatus,
      subtotal,
      itemsDiscount: totalDiscount,
      invoiceDiscount: finalInvoiceDiscount,
      discountPercentage: 0, // لم نعد نستخدم النسبة المئوية
      total: finalTotal, // استخدام الإجمالي المحسوب بدقة بعد تطبيق جميع الخصومات
      notes: invoiceNotes,
      products: invoiceItems
    };
    
    console.log("إعداد بيانات الفاتورة للإرسال:", {
      subtotal,
      totalDiscount,
      invoiceDiscount,
      invoiceDiscountAmount,
      total,
      itemsCount: invoiceItems.length
    });
    
    createInvoiceMutation.mutate(invoice);
  };

  // التأثير لإضافة منتج محدد مسبقاً
  useEffect(() => {
    if (preSelectedProduct && open) {
      const productExists = invoiceProducts.some(p => p.id === preSelectedProduct.id);
      if (!productExists) {
        handleAddProduct(preSelectedProduct);
      }
    }
  }, [preSelectedProduct, open]);

  // إعادة تعيين الحالة عند فتح النافذة
  useEffect(() => {
    if (open) {
      setActiveTab('customer');
      setSelectedCustomer(null);
      setInvoiceProducts([]);
      setPaymentMethod('cash');
      setInvoiceNotes('');
      setInvoiceDiscount(0);
      setShowInvoicePreview(false);
      setInvoiceData(null);
    }
  }, [open]);

  // عرض معاينة الفاتورة
  if (showInvoicePreview && invoiceData) {
    return (
      <InvoicePreview 
        open={showInvoicePreview}
        onOpenChange={(open) => {
          setShowInvoicePreview(open);
          if (!open) onOpenChange(false);
        }}
        customer={{
          id: invoiceData.customerId?.toString() || '',
          name: invoiceData.customerName || '',
          phone: invoiceData.customerPhone || '',
          address: invoiceData.customerAddress || ''
        }}
        invoiceNumber={invoiceData.invoiceNumber || ''}
        invoiceDate={invoiceData.date || new Date().toISOString()}
        products={JSON.parse(invoiceData.productsData || '[]').map((product: any) => ({
          id: product.productId?.toString() || '',
          name: product.productName || '',
          barcode: product.barcode || '',
          sellingPrice: product.sellingPrice || 0,
          quantity: product.quantity || 0,
          discount: product.discount || 0
        }))}
        notes={invoiceData.notes || ''}
        paymentMethod={invoiceData.paymentMethod || 'cash'}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-4xl max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-1 bg-gradient-to-r from-purple-600/20 to-pink-600/10">
          <DialogTitle className="flex items-center text-xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
            <ReceiptText className="h-6 w-6 text-primary mr-2" />
            {t('create_new_invoice')}
          </DialogTitle>
        </DialogHeader>

        <div className="p-3 bg-white overflow-y-auto" style={{maxHeight: "calc(95vh - 160px)"}}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 h-auto py-2 bg-gradient-to-r from-primary/10 to-pink-500/10 p-1 rounded-lg">
              <TabsTrigger 
                value="customer" 
                disabled={activeTab === 'products' && selectedCustomer} 
                className="text-base py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-pink-500 data-[state=active]:text-white transition-all duration-200"
              >
                <User className="mr-2 h-5 w-5" />
                {t('customer')}
              </TabsTrigger>
              <TabsTrigger 
                value="products" 
                disabled={!selectedCustomer} 
                className="text-base py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-pink-500 data-[state=active]:text-white transition-all duration-200"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {t('products')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="customer" className="py-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input
                    placeholder={t('search_customers')}
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    className="pl-10 border-primary/20 focus:border-primary"
                  />
                </div>
                <Button 
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg rounded-lg transition-all" 
                  size="default"
                  onClick={() => setShowAddCustomer(true)}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  <span className="font-medium">{t('add_new')}</span>
                </Button>
              </div>

              <ScrollArea className="h-[340px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-1">
                  {filteredCustomers.map((customer: any) => (
                    <div
                      key={customer.id}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setActiveTab('products');
                      }}
                      className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedCustomer?.id === customer.id 
                          ? 'border-2 border-primary bg-gradient-to-r from-primary/10 to-secondary/10 shadow-md' 
                          : 'border-primary/10 hover:border-primary/30 bg-gradient-to-r from-white to-gray-50 hover:from-primary/5 hover:to-secondary/5 shadow-sm hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg shadow-md">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate text-base">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">{customer.phone || t('no_phone')}</p>
                        </div>
                        <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full p-1.5 shadow-sm">
                          <ChevronRight className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredCustomers.length === 0 && (
                    <div className="col-span-2 text-center py-6">
                      <User className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-2" />
                      <h3 className="text-lg font-medium mb-1">{t('no_customers_found')}</h3>
                      <p className="text-sm text-muted-foreground">{t('create_customer_or_change_search')}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="products">
              {selectedCustomer && (
                <>
                  <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-primary/15 to-pink-500/15 flex items-center justify-between shadow-md border border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-base">{selectedCustomer.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedCustomer.phone || t('no_phone')}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="default" 
                      onClick={() => setActiveTab('customer')}
                      className="font-medium border-primary/30 hover:bg-primary/10 shadow-sm bg-white/80 dark:bg-gray-800/80 rounded-lg"
                    >
                      <RefreshCcw className="mr-2 h-4 w-4 text-primary" />
                      {t('change')}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3">
                    <div className="md:col-span-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        {/* قائمة المنتجات مع البحث */}
                        <Popover open={productCommandOpen} onOpenChange={setProductCommandOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={productCommandOpen}
                              className="w-full justify-between h-12 text-start font-normal text-base border-primary/30 shadow-sm bg-gradient-to-r from-primary/5 to-secondary/5 hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/10"
                            >
                              {t('select_products')}
                              <Search className="ml-2 h-5 w-5 shrink-0 text-primary/70" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[350px] p-0" align="start">
                            <Command>
                              <CommandInput 
                                placeholder={t('search_products')} 
                                className="h-12 text-base" 
                              />
                              <CommandList>
                                <CommandEmpty>{t('no_products_found')}</CommandEmpty>
                                <CommandGroup>
                                  {products.map((product: any) => (
                                    <CommandItem
                                      key={product.id}
                                      onSelect={() => handleAddProduct(product)}
                                      className="flex justify-between items-center py-3"
                                    >
                                      <div>
                                        <span className="font-medium text-base">{product.name}</span>
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                          <Badge variant="outline" className="h-6 px-2">
                                            {product.barcode || t('no_barcode')}
                                          </Badge>
                                          <span className="font-medium">{t('in_stock')}: {product.stock}</span>
                                        </div>
                                      </div>
                                      <span className="text-primary font-semibold text-base">
                                        {formatCurrency(product.sellingPrice)}
                                      </span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>

                        {/* زر المسح الضوئي للباركود */}
                        <Button 
                          size="default" 
                          variant="outline" 
                          onClick={() => setShowBarcodeScanner(!showBarcodeScanner)}
                          className="h-11 whitespace-nowrap bg-gradient-to-r from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 font-medium"
                        >
                          <Scan className="h-5 w-5 mr-2 text-amber-700" />
                          {t('scan')}
                        </Button>
                      </div>

                      {/* عرض ماسح الباركود */}
                      {showBarcodeScanner ? (
                        <Card className="mb-3 border-dashed border-2 border-primary/20">
                          <CardContent className="p-3">
                            <p className="text-center font-medium mb-3 text-base">{t('scan_product_barcode')}</p>
                            <BarcodeScanner onProductScanned={handleBarcodeScanned} />
                            <div className="flex justify-end mt-3">
                              <Button 
                                size="default" 
                                variant="ghost" 
                                onClick={() => setShowBarcodeScanner(false)}
                                className="font-medium"
                              >
                                <X className="mr-2 h-4 w-4" />
                                {t('close')}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ) : null}
                      
                      {/* قائمة المنتجات في الفاتورة */}
                      <div className="mb-3">
                        <p className="text-base font-medium mb-2">{t('products_in_invoice')}</p>
                        
                        {invoiceProducts.length > 0 ? (
                          <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
                            {invoiceProducts.map((product, index) => {
                              const productTotal = product.sellingPrice * product.quantity;
                              const discountAmount = product.discount ? (productTotal * (product.discount / 100)) : 0;
                              const finalTotal = productTotal - discountAmount;
                              
                              return (
                                <div key={`${product.id}-${index}`} className="flex items-center p-3 rounded-lg border border-primary/20 shadow-md bg-gradient-to-r from-white to-primary/5 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate text-base">{product.name}</p>
                                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                                      <span>{formatCurrency(product.sellingPrice)} × </span>
                                      <div className="inline-flex items-center mx-2">
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8 rounded-full bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 shadow-sm"
                                          onClick={() => handleUpdateQuantity(index, Math.max(1, product.quantity - 1))}
                                        >
                                          <Minus className="h-4 w-4" />
                                        </Button>
                                        <span className="mx-2 min-w-8 text-center font-medium text-base">{product.quantity}</span>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8 rounded-full bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30 shadow-sm"
                                          onClick={() => handleUpdateQuantity(index, product.quantity + 1)}
                                        >
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      </div>
                                      
                                      {product.discount > 0 && (
                                        <span className="mx-1">
                                          <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md">({product.discount}% {t('off')})</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center">
                                      <Label className="sr-only">{t('discount')}</Label>
                                      <div className="relative w-16">
                                        <Input
                                          type="number"
                                          min="0"
                                          max="100"
                                          value={product.discount || 0}
                                          onChange={(e) => handleUpdateDiscount(index, parseInt(e.target.value) || 0)}
                                          className="pr-7 py-1 h-8 text-sm"
                                        />
                                        <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      </div>
                                    </div>
                                    <div className="text-right font-medium w-20 text-base text-primary">
                                      {formatCurrency(finalTotal)}
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => handleRemoveProduct(index)}
                                      className="h-9 w-9 rounded-full bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 shadow-sm"
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center p-6 border border-dashed rounded-md bg-muted/5">
                            <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground opacity-40 mb-2" />
                            <p className="text-base text-muted-foreground font-medium">{t('no_products_in_invoice')}</p>
                            <p className="text-sm text-muted-foreground/80 mt-1">{t('use_product_search')}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <div className="mb-3">
                        <Label htmlFor="paymentMethod" className="text-base font-medium">
                          {t('payment_method')}
                        </Label>
                        <Select
                          value={paymentMethod}
                          onValueChange={setPaymentMethod}
                        >
                          <SelectTrigger id="paymentMethod" className="mt-1.5 h-11 text-base font-medium">
                            <SelectValue placeholder={t('select_payment_method')} />
                          </SelectTrigger>
                          <SelectContent className="text-base">
                            <SelectItem value="cash" className="py-3 cursor-pointer">{t('cash')}</SelectItem>
                            <SelectItem value="card" className="py-3 cursor-pointer">{t('card')}</SelectItem>
                            <SelectItem value="deferred" className="py-3 cursor-pointer">{t('pay_later')}</SelectItem>
                            <SelectItem value="e-wallet" className="py-3 cursor-pointer">{t('e_wallet')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="notes" className="text-base font-medium">
                          {t('notes')}
                        </Label>
                        <Input
                          id="notes"
                          placeholder={t('invoice_notes')}
                          value={invoiceNotes}
                          onChange={(e) => setInvoiceNotes(e.target.value)}
                          className="mt-1.5 h-11 text-base"
                        />
                      </div>
                      
                      {/* خصم الفاتورة والمجاميع */}
                      <div className="mt-3 space-y-2 border-t pt-3">
                        <div className="flex items-center gap-3">
                          <Label htmlFor="invoice-discount" className="text-base text-muted-foreground font-medium">
                            {t('invoice_discount')}:
                          </Label>
                          <div className="relative w-24">
                            <Input
                              id="invoice-discount"
                              type="number"
                              min="0"
                              step="0.01"
                              value={invoiceDiscount || 0}
                              onChange={(e) => setInvoiceDiscount(parseFloat(e.target.value) || 0)}
                              className="pr-8 py-1 h-10 text-base"
                            />
                            <DollarSign className="absolute right-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        
                        <div className="space-y-2 pt-3 px-2">
                          <div className="flex justify-between text-base">
                            <span className="text-muted-foreground font-medium">{t('subtotal')}:</span>
                            <span className="font-medium">{formatCurrency(subtotal)}</span>
                          </div>
                          
                          {totalDiscount > 0 && (
                            <div className="flex justify-between text-base">
                              <span className="text-muted-foreground font-medium">{t('item_discounts')}:</span>
                              <span className="text-destructive/90 font-medium">- {formatCurrency(totalDiscount)}</span>
                            </div>
                          )}
                          
                          {invoiceDiscount > 0 && (
                            <div className="flex justify-between text-base">
                              <span className="text-muted-foreground font-medium">{t('invoice_discount')}:</span>
                              <span className="text-destructive/90 font-medium">- {formatCurrency(invoiceDiscount)}</span>
                            </div>
                          )}
                          
                          <Separator className="my-2" />
                          <div className="flex justify-between font-bold text-lg pt-1">
                            <span>{t('total')}:</span>
                            <span className="text-primary">{formatCurrency(total)}</span>
                          </div>
                          
                          {/* تظهر فقط عند وجود خصومات */}
                          {(totalDiscount > 0 || invoiceDiscount > 0) && (
                            <div className="mt-1 text-xs text-muted-foreground italic">
                              {t('total_after_all_discounts')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        {activeTab === 'products' && selectedCustomer && (
          <div className="flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-5 pt-6 border-t">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              size="lg"
              className="text-base font-medium px-8 py-6 h-auto border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 shadow-md rounded-lg"
            >
              <X className="mr-3 h-5 w-5" />
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSaveInvoice}
              disabled={createInvoiceMutation.isPending || invoiceProducts.length === 0}
              className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white text-lg font-bold px-10 py-6 h-auto shadow-lg hover:shadow-xl transition-all rounded-lg disabled:opacity-70 disabled:cursor-not-allowed"
              size="lg"
            >
              {createInvoiceMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('saving')}
                </>
              ) : (
                <>
                  <Calculator className="mr-3 h-5 w-5" />
                  {t('save_invoice')}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
      
      {/* نافذة إضافة عميل جديد */}
      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-2 bg-gradient-to-r from-amber-500/10 to-orange-600/10">
            <DialogTitle className="flex items-center text-xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
              <User className="h-6 w-6 text-amber-500 mr-2" />
              {t('add_new_customer')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="customer-name">{t('name')} *</Label>
              <Input
                id="customer-name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder={t('enter_customer_name')}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customer-phone">{t('phone')}</Label>
              <Input
                id="customer-phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder={t('enter_customer_phone')}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customer-address">{t('address')}</Label>
              <Input
                id="customer-address"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                placeholder={t('enter_customer_address')}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customer-notes">{t('customer_notes')}</Label>
              <Input
                id="customer-notes"
                value={newCustomer.notes}
                onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                placeholder={t('customer_notes')}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Checkbox 
                id="customer-potential" 
                checked={newCustomer.isPotential}
                onCheckedChange={(checked) => 
                  setNewCustomer({ ...newCustomer, isPotential: checked as boolean })
                }
              />
              <Label 
                htmlFor="customer-potential" 
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {t('potential_customer')}
              </Label>
            </div>
          </div>
          
          <DialogFooter className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={() => setShowAddCustomer(false)}
              className="font-medium text-base border-gray-300 hover:bg-gray-100 py-5 px-6 h-auto"
            >
              <X className="mr-2 h-5 w-5" />
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleCreateCustomer}
              disabled={createCustomerMutation.isPending}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold py-5 px-6 h-auto text-base shadow-md"
            >
              {createCustomerMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('saving')}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  {t('save')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default SimplifiedInvoiceDialog;