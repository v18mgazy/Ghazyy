import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useLocale } from '@/hooks/use-locale';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import BarcodeScanner from '@/components/barcode-scanner';
import InvoicePreview from '@/components/invoice/invoice-preview';
import { 
  Plus, Trash2, Save, FileCheck, Banknote, CreditCard, Scan, 
  ReceiptText, CheckSquare, X, Calendar, Tag, Search, ChevronsUpDown,
  Printer, Share2, AlertTriangle, LockKeyhole, Check
} from 'lucide-react';
import { formatCurrency, debounce } from '@/lib/utils';

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
  barcode?: string;
  sellingPrice: number;
  quantity: number;
  discount?: number;
}

interface ActiveInvoiceProps {
  customer: Customer;
  onClose: () => void;
  onAddProduct?: () => void;
  onProductScanned?: (product: any) => void;
}

export default function ActiveInvoice({ customer, onClose, onAddProduct, onProductScanned }: ActiveInvoiceProps) {
  const { t } = useTranslation();
  const { language } = useLocale();
  const isRtl = language === 'ar';
  
  // استرجاع جميع المنتجات من قاعدة البيانات للتحقق من الكميات المتاحة
  const productsQuery = useQuery({
    queryKey: ['/api/products'],
    staleTime: 30000, // تحديث البيانات كل 30 ثانية
  });
  
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    `INV-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  
  // حساب المجموع الفرعي والخصم والمجموع الكلي
  const calculateSubtotalAndTotal = (productsList: Product[]) => {
    console.log('Calculating totals for products:', productsList);
    
    if (!productsList || productsList.length === 0) {
      console.log('No products to calculate totals for');
      return;
    }
    
    try {
      // حساب المجموع الفرعي (سعر × كمية)
      const newSubtotal = productsList.reduce((sum, product) => {
        const productTotal = product.sellingPrice * product.quantity;
        return sum + productTotal;
      }, 0);
      
      // حساب الخصم (سعر × كمية × نسبة الخصم)
      const newTotalDiscount = productsList.reduce((sum, product) => {
        const discount = product.discount ? 
          (product.sellingPrice * product.quantity * (product.discount / 100)) : 0;
        return sum + discount;
      }, 0);
      
      // المجموع النهائي
      const newTotal = newSubtotal - newTotalDiscount;
      
      console.log('Calculation complete:', {
        subtotal: newSubtotal,
        totalDiscount: newTotalDiscount,
        total: newTotal
      });
    } catch (error) {
      console.error('Error calculating totals:', error);
      toast({
        title: t('error'),
        description: t('error_calculating_invoice'),
        variant: "destructive"
      });
    }
  };
  
  // حالة ماسح الباركود
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  
  // حالة البحث عن المنتج
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);
  
  // حالة عرض الفاتورة المنسقة
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  
  // حالة الموافقة على الدفع الآجل
  const [isLaterPaymentApproved, setIsLaterPaymentApproved] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  
  // استخدام hook الإشعارات
  const { toast } = useToast();
  
  // إنشاء mutation لإرسال الفاتورة إلى الخادم
  const createInvoiceMutation = useMutation({
    mutationFn: (invoiceData: any) => 
      apiRequest('POST', '/api/invoices', invoiceData)
        .then(res => res.json()),
    onSuccess: () => {
      // عرض رسالة نجاح
      toast({
        title: t('success'),
        description: t('saved_successfully'),
        variant: 'default',
      });
      // إظهار معاينة الفاتورة بعد الحفظ بنجاح
      setShowInvoicePreview(true);
      // إعادة تحميل قائمة الفواتير والمنتجات لتحديث الكميات
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
    onError: (error) => {
      // عرض رسالة خطأ
      toast({
        title: t('error'),
        description: t('invoice_save_error'),
        variant: 'destructive',
      });
      console.error('Error saving invoice:', error);
    }
  });
  
  // استعلام للحصول على المنتجات من قاعدة البيانات
  const { data: allProducts = [], isLoading: isLoadingProducts } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });
  
  // البحث عن المنتجات
  const searchProducts = (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    // البحث في المنتجات الحقيقية من قاعدة البيانات
    setTimeout(() => {
      const results = allProducts.filter((product: any) => 
        product.name?.toLowerCase().includes(term.toLowerCase()) || 
        product.alternativeCode?.toLowerCase().includes(term.toLowerCase()) || 
        product.barcode?.includes(term)
      );
      
      setSearchResults(results);
      setIsSearching(false);
    }, 300);
  };
  
  // معالجة تغيير مصطلح البحث
  const handleProductSearchChange = (term: string) => {
    setSearchTerm(term);
    
    // إذا كان المصطلح فارغًا، نعرض جميع المنتجات الحقيقية
    if (!term.trim()) {
      setSearchResults(allProducts);
    } else {
      // البحث في المنتجات الحقيقية
      const filteredProducts = allProducts.filter((product: any) => 
        product.name?.toLowerCase().includes(term.toLowerCase()) || 
        product.barcode?.includes(term) ||
        product.alternativeCode?.includes(term)
      );
      setSearchResults(filteredProducts);
    }
  };
  
  // معالجة تحديد منتج من نتائج البحث
  const handleSelectSearchResult = (product: any, index: number) => {
    const updatedProducts = [...products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      sellingPrice: product.sellingPrice,
    };
    setProducts(updatedProducts);
    setSearchTerm('');
    setSearchResults([]);
    setEditingProductIndex(null);
  };
  
  // معالجة المنتج الممسوح ضوئيًا
  const handleProductScanned = (scannedProd: any) => {
    console.log('Product scanned in ActiveInvoice:', scannedProd);
    
    // إذا تم تمرير معالج المسح من الأب، استخدمه
    if (onProductScanned) {
      console.log('Using parent onProductScanned function');
      onProductScanned(scannedProd);
      setShowBarcodeScanner(false);
      return;
    }
    
    // وإلا، استخدم المنطق المحلي للمكون
    console.log('Using local product scan handling');
    
    // التأكد من استخدام بيانات المنتج الصحيحة
    const availableProducts = productsQuery.data || [];
    
    // البحث عن المنتج بالباركود
    const foundProduct = availableProducts.find((p: any) => p.barcode === scannedProd.barcode);
    console.log('Product found in database:', foundProduct);
    
    if (foundProduct) {
      // التحقق من وجود كمية متاحة في المخزون
      const availableQuantity = foundProduct.quantity || 0;
      console.log('Available quantity:', availableQuantity);
      
      if (availableQuantity <= 0) {
        toast({
          title: t('cannot_add_product'),
          description: t('product_out_of_stock'),
          variant: "destructive"
        });
        return;
      }
      
      // إضافة المنتج مباشرة عند المسح (مع التحقق من المخزون)
      const newProduct: Product = {
        id: foundProduct.id,
        name: foundProduct.name,
        barcode: foundProduct.barcode,
        sellingPrice: foundProduct.sellingPrice,
        quantity: 1,
        discount: 0
      };
      console.log('Adding product to invoice:', newProduct);
      
      // إضافة المنتج إلى قائمة المنتجات
      const updatedProducts = [...products, newProduct];
      setProducts(updatedProducts);
      
      // إعادة حساب المجاميع
      calculateSubtotalAndTotal(updatedProducts);
      
      toast({
        title: t('success'),
        description: t('product_added_to_invoice'),
      });
    } else if (scannedProd) {
      // تم العثور على منتج بالماسح لكن ليس في قاعدة البيانات
      console.log('Product found by scanner but not in database');
      
      toast({
        title: t('warning'),
        description: t('product_found_but_not_in_inventory'),
        variant: "destructive"
      });
    } else {
      console.log('Product not found in database');
      
      toast({
        title: t('error'),
        description: t('barcode_not_recognized'),
        variant: "destructive"
      });
    }
    
    // إغلاق نافذة ماسح الباركود بعد إضافة المنتج
    setShowBarcodeScanner(false);
  };
  
  const addProduct = () => {
    console.log('Add product button clicked');
    
    // إذا كان هناك معالج مخصص من الأب، استخدمه
    if (onAddProduct) {
      console.log('Using parent onAddProduct function');
      onAddProduct();
      return;
    }
    
    // في غير ذلك, افتح نافذة البحث عن المنتج
    setIsSearching(true);
    
    // فتح ماسح الباركود بدلاً من إضافة منتج فارغ
    // setShowBarcodeScanner(true);
    
    // نلاحظ: لم نعد نضيف منتجات فارغة، بل نطلب من المستخدم اختيار منتج أولاً
    /*
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      name: '',
      sellingPrice: 0,
      quantity: 1
    };
    setProducts([...products, newProduct]);
    */
  };
  
  const updateProduct = (index: number, field: keyof Product, value: any) => {
    const updatedProducts = [...products];
    
    // إذا كان الحقل هو الكمية، نتحقق من الكمية المتاحة
    if (field === 'quantity') {
      const numValue = Number(value) || 0;
      
      // الحصول على المنتج من قائمة المنتجات في قاعدة البيانات للتحقق من الكمية المتاحة
      const currentProduct = updatedProducts[index];
      const allProducts = productsQuery.data || [];
      const productInDb = allProducts.find((p: any) => p.id.toString() === currentProduct.id.toString());
      
      if (productInDb && numValue > productInDb.quantity) {
        // تنبيه المستخدم أن الكمية المطلوبة تتجاوز المتاح
        toast({
          title: t('quantity_exceeds_available'),
          description: t('available_quantity_is', { available: productInDb.quantity }),
          variant: 'destructive'
        });
        
        // تعيين الكمية إلى الحد الأقصى المتوفر
        updatedProducts[index] = { 
          ...updatedProducts[index], 
          quantity: productInDb.quantity
        };
      } else {
        // تأكد من أن الكمية على الأقل 1
        const safeQuantity = Math.max(1, numValue);
        updatedProducts[index] = { 
          ...updatedProducts[index], 
          quantity: safeQuantity
        };
      }
    } else {
      // تحديث أي حقل آخر بشكل طبيعي
      updatedProducts[index] = { 
        ...updatedProducts[index], 
        [field]: field === 'sellingPrice' || field === 'discount' 
          ? Number(value) || 0 
          : value 
      };
    }
    
    setProducts(updatedProducts);
    
    // إذا كان الحقل هو اسم المنتج وليس هناك تحرير حالي
    // قم بعرض البحث فقط إذا كان هناك قيمة مدخلة
    if (field === 'name' && typeof value === 'string' && value.trim()) {
      setEditingProductIndex(index);
      handleProductSearchChange(value);
    }
  };
  
  const removeProduct = (index: number) => {
    const updatedProducts = [...products];
    updatedProducts.splice(index, 1);
    setProducts(updatedProducts);
  };
  
  // حساب المجموع الفرعي (قبل الخصم)
  const subtotal = products.reduce((sum, product) => {
    return sum + (product.sellingPrice * product.quantity);
  }, 0);
  
  // حساب مجموع الخصومات
  const totalDiscount = products.reduce((sum, product) => {
    const discount = product.discount || 0;
    return sum + (product.sellingPrice * product.quantity * discount / 100);
  }, 0);
  
  // حساب الإجمالي النهائي
  const total = subtotal - totalDiscount;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // التحقق من وجود منتجات
    if (products.length === 0) {
      alert(t('please_add_products'));
      return;
    }
    
    // التحقق من الدفع الآجل - يتطلب موافقة مدير النظام
    if (paymentMethod === 'later' && !isLaterPaymentApproved) {
      // عرض نافذة حوار طلب الموافقة
      setShowApprovalDialog(true);
      return;
    }
    
    // إعداد بيانات الفاتورة
    // تحويل معرف العميل بطريقة آمنة مع التأكد من أنه رقم صالح
    let customerIdValue;
    try {
      if (typeof customer.id === 'string') {
        customerIdValue = parseInt(customer.id);
      } else if (typeof customer.id === 'number') {
        customerIdValue = customer.id;
      } else {
        customerIdValue = 1;
      }
      
      if (isNaN(customerIdValue) || customerIdValue > 2147483647) {
        customerIdValue = 1; // استخدام قيمة افتراضية آمنة
      }
    } catch (error) {
      console.error('Error parsing customer ID:', error);
      customerIdValue = 1;
    }
    
    // سجل معلومات العميل للتأكد من أنها كاملة
    console.log('Customer for invoice:', {
      id: customerIdValue,
      name: customer.name,
      phone: customer.phone,
      address: customer.address
    });
    
    // إنشاء كائن بيانات الفاتورة بمعلومات العميل المضمنة مباشرة
    const invoiceData = {
      invoiceNumber,
      customerId: customerIdValue,
      // تضمين معلومات العميل مباشرة في حقول الفاتورة بدلاً من وضعها في كائن منفصل
      customerName: customer.name,
      customerPhone: customer.phone || '',
      customerAddress: customer.address || '',
      subtotal,
      discount: totalDiscount,
      total,
      paymentMethod,
      paymentStatus: paymentMethod === 'later' ? 'pending' : 'paid',
      date: invoiceDate,
      notes,
      userId: 1, // معرف المستخدم الذي ينشئ الفاتورة
      userRole: 'cashier', // دور المستخدم
      products: products.map(product => ({
        productId: parseInt(product.id),
        productName: product.name, // تضمين اسم المنتج
        quantity: product.quantity,
        price: product.sellingPrice,
        total: product.quantity * product.sellingPrice * (1 - (product.discount || 0) / 100),
        discount: product.discount || 0
      }))
    };
    
    // استخدام mutation لإرسال الفاتورة إلى الخادم
    createInvoiceMutation.mutate(invoiceData);
  };
  
  // طباعة الفاتورة
  const handlePrintInvoice = () => {
    // استخدام jsPDF لإنشاء وثيقة PDF
    window.print();
  };

  // مشاركة الفاتورة
  const handleShareInvoice = () => {
    // محاكاة مشاركة الفاتورة
    if (navigator.share) {
      navigator.share({
        title: `فاتورة ${invoiceNumber}`,
        text: `فاتورة ${invoiceNumber} لـ ${customer.name}`,
        url: window.location.href,
      }).catch(err => {
        console.error('Error sharing: ', err);
      });
    } else {
      alert(t('share_not_supported'));
    }
  };
  
  // معالجة طلب الموافقة على الدفع الآجل
  const handleAdminApproval = () => {
    // تغيير الحالة وإغلاق نافذة الحوار
    setShowApprovalDialog(false);
    
    // إعداد بيانات الفاتورة مع حالة معلقة لطلب الموافقة
    const invoiceData = {
      invoiceNumber,
      customerId: parseInt(customer.id),
      customerName: customer.name, // تضمين بيانات العميل مباشرة
      customerPhone: customer.phone || '',
      customerAddress: customer.address || '',
      subtotal,
      discount: totalDiscount,
      total,
      paymentMethod: 'deferred', // استخدام الدفع المؤجل
      paymentStatus: 'pending', // حالة معلقة تحتاج موافقة
      date: invoiceDate,
      notes: notes + ' [طلب موافقة دفع مؤجل]',
      userId: 2, // رقم المستخدم الكاشير
      products: products.map(product => ({
        productId: parseInt(product.id),
        quantity: product.quantity,
        price: product.sellingPrice,
        total: product.quantity * product.sellingPrice * (1 - (product.discount || 0) / 100),
        discount: product.discount || 0
      }))
    };
    
    // استخدام mutation لإرسال الفاتورة إلى الخادم
    createInvoiceMutation.mutate(invoiceData);
    
    // عرض رسالة توضح أنه تم إرسال طلب الموافقة
    toast({
      title: t('approval_request_sent'),
      description: t('deferred_payment_waiting_approval'),
      duration: 5000,
    });
    
    // إغلاق نافذة الفاتورة النشطة بعد الإرسال
    setTimeout(() => {
      onClose();
    }, 2000);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* معاينة الفاتورة المنسقة */}
      <InvoicePreview 
        open={showInvoicePreview} 
        onOpenChange={(open) => {
          setShowInvoicePreview(open);
          // إذا تم إغلاق معاينة الفاتورة، نقوم بإغلاق النافذة الرئيسية أيضًا
          if (!open) {
            onClose();
          }
        }}
        customer={customer}
        invoiceNumber={invoiceNumber}
        invoiceDate={invoiceDate}
        products={products}
        notes={notes}
        paymentMethod={paymentMethod}
      />
      
      {/* ماسح الباركود */}
      {showBarcodeScanner && (
        <Dialog open={showBarcodeScanner} onOpenChange={setShowBarcodeScanner}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5 text-primary" />
                {t('scan_barcode')}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <BarcodeScanner onProductScanned={handleProductScanned} />
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* نافذة إرسال طلب الموافقة على الدفع الآجل */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              {t('deferred_payment_confirmation')}
            </DialogTitle>
            <DialogDescription className="mt-2">
              {t('deferred_payment_needs_admin_approval')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-sm">
              <LockKeyhole className="h-4 w-4 text-muted-foreground" />
              <span>{t('deferred_payment_confirmation_description')}</span>
            </div>
            
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex flex-col space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">{t('customer')}:</span>
                  <span>{customer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">{t('invoice_total')}:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">{t('payment_method')}:</span>
                  <span className="text-amber-600 font-semibold">{t('deferred_payment')}</span>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
            >
              <X className="mr-1 h-4 w-4" />
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleAdminApproval}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Check className="mr-1 h-4 w-4" />
              {t('send_for_approval')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* معلومات الفاتورة */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{customer.name}</h3>
              <p className="text-sm text-muted-foreground">{customer.phone || t('no_phone_number')}</p>
            </div>
          </div>
          {customer.address && (
            <p className="text-sm text-muted-foreground mt-1">{customer.address}</p>
          )}
        </div>
        
        <div className="flex flex-col space-y-3 min-w-[200px]">
          <div className="flex items-center gap-2">
            <Label htmlFor="invoice-number" className="w-24 text-muted-foreground">
              {t('invoice_number')}:
            </Label>
            <Input
              id="invoice-number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="flex-1"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Label htmlFor="invoice-date" className="w-24 text-muted-foreground">
              {t('date')}:
            </Label>
            <div className="relative flex-1">
              <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="invoice-date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          {/* نزيل أزرار الطباعة والمشاركة من أعلى الصفحة */}
          <div className="flex gap-2 justify-end pt-2">
            {/* أزرار في المستقبل يمكن إضافتها هنا */}
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* قائمة المنتجات */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-lg">{t('products')}</h3>
          <div className="flex gap-2">
            <Button 
              type="button" 
              size="sm" 
              variant="outline"
              onClick={() => {
                console.log("Scan Barcode button clicked in ActiveInvoice");
                setShowBarcodeScanner(true);
              }}
            >
              <Scan className="mr-1 h-4 w-4" />
              {t('scan_barcode')}
            </Button>
            <Button 
              type="button" 
              size="sm" 
              onClick={() => {
                console.log("Add Product button clicked in ActiveInvoice");
                if (onAddProduct) {
                  console.log("Using parent's onAddProduct function");
                  onAddProduct();
                } else {
                  console.log("Using local addProduct function");
                  addProduct();
                }
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              {t('add_product')}
            </Button>
          </div>
        </div>
        
        {products.length === 0 ? (
          <div className="text-center p-6 border border-dashed rounded-md text-muted-foreground">
            {t('no_products_added')}
          </div>
        ) : (
          <div className="space-y-3">
            {/* رؤوس الجدول */}
            <div className="grid grid-cols-12 gap-2 px-2 text-sm font-medium text-muted-foreground">
              <div className="col-span-5">{t('product')}</div>
              <div className="col-span-2 text-center">{t('price')}</div>
              <div className="col-span-2 text-center">{t('quantity')}</div>
              <div className="col-span-2 text-center">{t('discount')} %</div>
              <div className="col-span-1"></div>
            </div>
            
            {/* المنتجات */}
            {products.map((product, index) => (
              <Card key={product.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5 relative">
                      <Popover open={editingProductIndex === index && searchResults.length > 0}>
                        <PopoverTrigger asChild>
                          <div className="relative">
                            <Input
                              value={product.name}
                              onChange={(e) => updateProduct(index, 'name', e.target.value)}
                              placeholder={t('product_name')}
                              onClick={() => {
                                // عرض جميع المنتجات عند النقر على حقل اسم المنتج بغض النظر عن الحالة
                                setEditingProductIndex(index);
                                setSearchResults(allProducts);
                                if (product.name.trim()) {
                                  // يمكن الاستفادة من البحث إذا كان هناك نص بالفعل
                                  searchProducts(product.name);
                                } else {
                                  // حقل فارغ، تم بالفعل تعيين نتائج البحث في بداية الوظيفة
                                }
                              }}
                            />
                            <ChevronsUpDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-[300px] max-h-[200px] overflow-y-auto">
                          <Command>
                            <CommandInput placeholder={t('select_product')} value={searchTerm} onValueChange={handleProductSearchChange} />
                            <CommandEmpty>{t('no_products_found')}</CommandEmpty>
                            <CommandGroup>
                              {searchResults.map((item) => (
                                <CommandItem
                                  key={item.id}
                                  value={item.name}
                                  onSelect={() => handleSelectSearchResult(item, index)}
                                >
                                  <div className="flex flex-col w-full">
                                    <div className="font-medium">{item.name}</div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                      {item.barcode && <span><Tag className="h-3 w-3 mr-1 inline" />{item.barcode}</span>}
                                      <span>{formatCurrency(item.sellingPrice)}</span>
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={product.sellingPrice || ''}
                        onChange={(e) => updateProduct(index, 'sellingPrice', e.target.value)}
                        placeholder="0.00"
                        className="text-center"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={product.quantity}
                        onChange={(e) => updateProduct(index, 'quantity', e.target.value)}
                        min="1"
                        className="text-center"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={product.discount || ''}
                        onChange={(e) => updateProduct(index, 'discount', e.target.value)}
                        placeholder="0"
                        min="0"
                        max="100"
                        className="text-center"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeProduct(index)}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* ملخص الفاتورة */}
            <div className="bg-muted/40 p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">{t('subtotal')}:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">{t('total_discount')}:</span>
                <span className="text-red-500">- {formatCurrency(totalDiscount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg">
                <span>{t('total')}:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        <h3 className="font-medium text-lg">{t('payment_and_notes')}</h3>
        
        <div className="space-y-4">
          <Textarea
            placeholder={t('invoice_notes')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-none h-20"
          />
          
          <h4 className="font-medium">{t('payment_method')}:</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className={`flex items-center gap-2 ${paymentMethod === 'cash' ? 'bg-green-500 text-white hover:bg-green-600 border-green-500' : ''}`}
              onClick={() => setPaymentMethod('cash')}
            >
              <Banknote className="h-4 w-4" />
              {t('cash')}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className={`flex items-center gap-2 ${paymentMethod === 'card' ? 'bg-blue-500 text-white hover:bg-blue-600 border-blue-500' : ''}`}
              onClick={() => setPaymentMethod('card')}
            >
              <CreditCard className="h-4 w-4" />
              {t('card')}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className={`flex items-center gap-2 ${paymentMethod === 'check' ? 'bg-purple-500 text-white hover:bg-purple-600 border-purple-500' : ''}`}
              onClick={() => setPaymentMethod('check')}
            >
              <CheckSquare className="h-4 w-4" />
              {t('check')}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className={`flex items-center gap-2 ${paymentMethod === 'later' ? 'bg-amber-500 text-white hover:bg-amber-600 border-amber-500' : ''}`}
              onClick={() => setPaymentMethod('later')}
            >
              <FileCheck className="h-4 w-4" />
              {t('pay_later')}
              {paymentMethod === 'later' && isLaterPaymentApproved && (
                <Check className="ml-1 h-3 w-3 text-white" />
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* أزرار التحكم */}
      <div className="flex flex-wrap justify-between gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >
          <X className="mr-1 h-4 w-4" />
          {t('cancel')}
        </Button>
        
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            className="bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700"
          >
            <FileCheck className="mr-1 h-4 w-4" />
            {t('confirm_invoice')}
          </Button>
        </div>
      </div>
    </form>
  );
}