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
  Info as InfoIcon, Calendar as CalendarIcon, AlertCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

// UI Components
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Custom Components
import BarcodeScanner from '@/components/barcode-scanner';
import InvoicePreview from '@/components/invoice-new/invoice-preview';

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

  // إنشاء مرجع للحقل النصي للباركود
  const barcodeInputRef = useRef<HTMLInputElement>(null);

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
  const [manualBarcode, setManualBarcode] = useState('');

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
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());

  // حالة الخطأ
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // إضافة عميل جديد
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    isPotential: false
  });

  // إعادة تعيين الحالة عند فتح المحتوى
  useEffect(() => {
    if (open) {
      setActiveTab('customer');
      setSelectedCustomer(null);
      setInvoiceProducts([]);
      setSubtotal(0);
      setTotalDiscount(0);
      setInvoiceDiscount(0);
      setTotal(0);
      setInvoiceNotes('');
      setPaymentMethod('cash');
      setInvoiceDate(new Date());
      setShowInvoicePreview(false);
      setInvoiceData(null);
      setApiError(null);
    }
  }, [open]);

  // إذا كان هناك منتج محدد مسبقاً، أضفه إلى الفاتورة
  useEffect(() => {
    if (preSelectedProduct && open) {
        setTimeout(() => {
          if ((preSelectedProduct.stock || 0) <= 0) {
            toast({
              title: t('error'),
              description: t('out_of_stock'),
              variant: 'destructive'
            });
          } else {
            // ✅ هنا نتحقق إذا العميل مش محدد
            if (!selectedCustomer) {
              setActiveTab('customer');
              toast({
                title: t('product_ready'),
                description: t('please_select_customer_first'),
                duration: 4000
              });
            } else {
              // ✅ العميل موجود، نضيف المنتج مباشرة
              handleAddProduct(preSelectedProduct);
            }
          }
        }, 300);
      }
    }, [preSelectedProduct, open]);

  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: any) => {
      try {
        const res = await apiRequest('POST', '/api/customers', customerData);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `Error ${res.status}: Failed to create customer`);
        }
        return await res.json();
      } catch (error) {
        console.error('Error creating customer:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
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
  const { 
    data: customers = [],
    isLoading: isLoadingCustomers
  } = useQuery({
    queryKey: ['/api/customers'],
  });

  const { 
    data: products = [],
    isLoading: isLoadingProducts
  } = useQuery({
    queryKey: ['/api/products'],
  });

  // عملية إنشاء فاتورة جديدة
  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      setIsSubmitting(true);
      setApiError(null);

      try {
        console.log('Sending invoice data:', JSON.stringify(invoiceData, null, 2));

        const res = await apiRequest('POST', '/api/invoices', invoiceData);

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error('API Error Response:', errorData);
          throw new Error(errorData.message || `Error ${res.status}: Failed to create invoice`);
        }

        const data = await res.json();
        console.log('API Success Response:', data);
        return data;
      } catch (error) {
        console.error('Error creating invoice:', error);
        setApiError(error.message || 'Failed to create invoice. Please try again.');
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: (data) => {
      // عرض قيمة الخصم وتفاصيله بشكل صحيح في الفاتورة
      const invoiceWithDiscountDetails = {
        ...data,
        subtotal: subtotal,
        itemsDiscount: totalDiscount,
        invoiceDiscount: invoiceDiscount,
        total: total
      };

      setInvoiceData(invoiceWithDiscountDetails);
      setCreatedInvoice(invoiceWithDiscountDetails);
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

  // دالة للبحث عن منتج باستخدام الباركود
  const handleBarcodeSearch = async (barcode: string) => {
    if (!barcode || barcode.trim() === '') return;

    try {
      const response = await fetch(`/api/products/barcode/${barcode.trim()}`);
      if (!response.ok) {
        throw new Error(`${t('product_not_found')}: ${barcode}`);
      }

      const product = await response.json();
      if (product) {
        handleAddProduct(product);
        setManualBarcode('');
        toast({
          title: t('product_added'),
          description: product.name,
        });
      }
    } catch (error) {
      toast({
        title: t('product_not_found'),
        description: barcode,
        variant: "destructive"
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

  // حساب المجاميع
  const calculateTotals = useCallback((products: any[], customInvoiceDiscount?: number) => {
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
    const subtotalAfterProductDiscount = newSubtotal - newTotalDiscount;
    const discountToApply = customInvoiceDiscount !== undefined ? customInvoiceDiscount : invoiceDiscount;
    const invoiceDiscountAmount = discountToApply > 0 ? discountToApply : 0;

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

      const updatedProducts = [...invoiceProducts, productToAdd];
      setInvoiceProducts(updatedProducts);
      calculateTotals(updatedProducts);

      toast({
        title: t('success'),
        description: t('product_added_to_invoice'),
      });
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

    toast({
      title: t('success'),
      description: t('product_removed_from_invoice'),
    });
  };

  // التعامل مع ماسح الباركود
  const handleBarcodeScanned = (result: any) => {
    if (result && result.barcode) {
      const foundProduct = products.find((p: any) => p.barcode === result.barcode);

      if (foundProduct) {
        // إضافة المنتج
        handleAddProduct(foundProduct);

        // إغلاق نافذة الماسح الضوئي فوراً
        setShowBarcodeScanner(false);
      } else {
        // في حالة عدم العثور على المنتج، نعرض إشعار خطأ
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
    // إعادة تعيين حالة الخطأ
    setApiError(null);

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

    // حساب قيمة خصم الفاتورة أولاً
    const subtotalBeforeInvoiceDiscount = invoiceProducts.reduce((sum, product) => {
      const productDiscount = product.discount || 0;
      const productPrice = product.sellingPrice;
      const productQuantity = product.quantity;
      // حساب سعر المنتج بعد الخصم المباشر ثم ضربه في الكمية
      return sum + ((productPrice - productDiscount) * productQuantity);
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
      const productTotalAfterProductDiscount = (productPrice - productDiscount) * productQuantity;

      // حساب نسبة هذا المنتج من إجمالي الفاتورة (بعد الخصومات على مستوى المنتج)
      const productRatioOfInvoice = productTotalAfterProductDiscount / subtotalBeforeInvoiceDiscount;

      // حصة المنتج من خصم الفاتورة (بناءً على نسبة قيمته من الإجمالي)
      const productShareOfInvoiceDiscount = productTotalAfterProductDiscount * invoiceDiscountRate;

      // إجمالي سعر المنتج النهائي بعد جميع الخصومات
      const finalProductTotal = Number((productTotalAfterProductDiscount - productShareOfInvoiceDiscount).toFixed(2));

      // حساب الربح (لا يتأثر بالخصومات)
      const purchasePrice = product.purchasePrice || 0;
      const finalProfit = Number(((productPrice - purchasePrice) * productQuantity).toFixed(2));

      return {
        productId: product.id,
        productName: product.name,
        barcode: product.barcode || '',
        sellingPrice: product.sellingPrice,
        purchasePrice: product.purchasePrice || 0,
        quantity: product.quantity,
        discount: productDiscount,
        invoiceDiscountShare: productShareOfInvoiceDiscount,
        total: finalProductTotal,
        profit: finalProfit
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
    const finalInvoiceDiscount = Math.min(invoiceDiscountAmount, subtotalAfterProductDiscount);

    // حساب الإجمالي النهائي مع مراعاة جميع الخصومات
    const finalTotal = Number((subtotalAfterProductDiscount - finalInvoiceDiscount).toFixed(2));

    // إنشاء كائن الفاتورة للإرسال
    const invoice = {
      invoiceNumber: randomInvoiceNumber,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone || '',
      customerAddress: selectedCustomer.address || '',
      // استخدام التاريخ والوقت المختار من المستخدم أو التاريخ الحالي بتنسيق ISO بدون حرف Z
      date: invoiceDate ? invoiceDate.toISOString().replace('Z', '') : new Date().toISOString().replace('Z', ''),
      paymentMethod,
      paymentStatus,
      subtotal,
      itemsDiscount: totalDiscount,
      invoiceDiscount: finalInvoiceDiscount,
      discountPercentage: 0, // لم نعد نستخدم النسبة المئوية
      total: finalTotal, // استخدام الإجمالي المحسوب بدقة بعد تطبيق جميع الخصومات
      notes: invoiceNotes || '',
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

    // إضافة معالجة أخطاء محسنة
    try {
      createInvoiceMutation.mutate(invoice);
    } catch (error: any) {
      console.error('Error in handleSaveInvoice:', error);
      setApiError(error.message || 'Failed to create invoice. Please try again.');
    }
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
            {invoiceProducts.length > 0 && (
              <Badge variant="outline" className="flex items-center">
                <ShoppingCart className="mr-1 h-3 w-3" />
                {invoiceProducts.length}
              </Badge>
            )}
          </div>
        </div>

        {/* رسالة الخطأ */}
        {apiError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('error')}</AlertTitle>
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}

        {/* محتوى علامة التبويب */}
        <div className="flex-1">
          {activeTab === 'customer' && (
            <div className="space-y-4">
              {showAddCustomer ? (
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
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <Checkbox
                        id="isPotential"
                        checked={newCustomer.isPotential || false}
                        onCheckedChange={(checked) => 
                          setNewCustomer({ ...newCustomer, isPotential: checked as boolean })
                        }
                      />
                      <Label htmlFor="isPotential" className="text-sm font-normal">
                        {t('potential_customer')}
                      </Label>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAddCustomer(false)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      {t('cancel')}
                    </Button>
                    <Button 
                      onClick={handleCreateCustomer}
                      className="invoice-button"
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
                      onClick={() => setShowAddCustomer(true)}
                      className="invoice-button"
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
                              onClick={() => setShowAddCustomer(true)}
                              className="mt-2"
                            >
                              {t('add_new_customer')}
                            </Button>
                          </div>
                        ) : (
                          <div className="divide-y">
                            {filteredCustomers.map((customer: any) => (
                              <div 
                                key={customer.id} 
                                className="p-3 hover:bg-accent/50 cursor-pointer transition-colors flex justify-between items-center invoice-item"
                                onClick={() => {
                                  setSelectedCustomer(customer);
                                  setActiveTab('products');
                                }}
                              >
                                <div>
                                  <div className="font-medium">{customer.name}</div>
                                  {customer.phone && (
                                    <div className="text-sm text-muted-foreground flex items-center mt-1">
                                      <Smartphone className="h-3 w-3 mr-1" />
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
                          {filteredProducts.map((product: any) => (
                            <div 
                              key={product.id} 
                              className="p-3 hover:bg-accent/50 cursor-pointer transition-colors flex justify-between items-center invoice-item"
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
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {invoiceDate ? (
                              format(invoiceDate, 'PPP', { locale: isRtl ? ar : enUS })
                            ) : (
                              <span>{t('select_date')}</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
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
                            calculateTotals(invoiceProducts, isNaN(value) ? 0 : value);
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
                    <ShoppingCart className="mr-2 h-5 w-5 text-primary" />
                    {t('invoice_items')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {invoiceProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] p-4 text-center">
                      <ShoppingCart className="h-12 w-12 text-muted-foreground mb-2 opacity-20" />
                      <p className="text-muted-foreground">{t('no_products_in_invoice')}</p>
                      <p className="text-sm text-muted-foreground mt-1">{t('search_and_add_products')}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full invoice-table">
                        <thead>
                          <tr>
                            <th className="text-left">{t('product')}</th>
                            <th className="text-right">{t('price')}</th>
                            <th className="text-center">{t('quantity')}</th>
                            <th className="text-center">{t('discount')}</th>
                            <th className="text-right">{t('total')}</th>
                            <th className="w-[50px]"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceProducts.map((product, index) => {
                            const productTotal = product.sellingPrice * product.quantity;
                            const discountAmount = product.discount ? (productTotal * (product.discount / 100)) : 0;
                            const finalTotal = productTotal - discountAmount;

                            return (
                              <tr key={`${product.id}-${index}`}>
                                <td className="font-medium">{product.name}</td>
                                <td className="text-right amount">
                                  {formatCurrency(product.sellingPrice)}
                                </td>
                                <td>
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
                                </td>
                                <td>
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
                                </td>
                                <td className="text-right font-medium amount">
                                  {formatCurrency(finalTotal)}
                                </td>
                                <td>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => handleRemoveProduct(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
                {invoiceProducts.length > 0 && (
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
                      className="w-full sm:w-auto invoice-button"
                      disabled={invoiceProducts.length === 0 || isSubmitting}
                    >
                      {isSubmitting ? (
                        <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      {isSubmitting ? t('creating_invoice') : t('create_invoice')}
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
                <BarcodeScanner onProductScanned
={handleBarcodeScanned} />
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

export default SimplifiedInvoiceDialog;
