import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from '@/hooks/use-locale';
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
  
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    `INV-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  
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
    // البحث عن المنتج بالباركود
    const foundProduct = allProducts.find((p: any) => p.barcode === scannedProd.barcode);
    
    if (foundProduct) {
      // إضافة المنتج مباشرة عند المسح
      const newProduct = {
        id: foundProduct.id,
        name: foundProduct.name,
        barcode: foundProduct.barcode,
        sellingPrice: foundProduct.sellingPrice,
        quantity: 1,
        discount: 0
      };
      setProducts([...products, newProduct]);
    } else {
      // إنشاء منتج جديد إذا لم يتم العثور عليه
      const newProduct = {
        id: 'new-' + Date.now(),
        name: scannedProd.name || 'منتج جديد',
        barcode: scannedProd.barcode,
        sellingPrice: scannedProd.sellingPrice || 0,
        quantity: 1,
        discount: 0
      };
      setProducts([...products, newProduct]);
    }
    // إغلاق نافذة ماسح الباركود بعد إضافة المنتج
    setShowBarcodeScanner(false);
  };
  
  const addProduct = () => {
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      name: '',
      sellingPrice: 0,
      quantity: 1
    };
    setProducts([...products, newProduct]);
  };
  
  const updateProduct = (index: number, field: keyof Product, value: any) => {
    const updatedProducts = [...products];
    updatedProducts[index] = { 
      ...updatedProducts[index], 
      [field]: field === 'sellingPrice' || field === 'quantity' || field === 'discount' 
        ? Number(value) || 0 
        : value 
    };
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
    
    // هنا يمكنك إرسال الفاتورة إلى الخادم
    console.log({
      invoiceNumber,
      customer,
      products,
      subtotal,
      totalDiscount,
      total,
      notes,
      paymentMethod,
      date: invoiceDate,
      isLaterPaymentApproved: paymentMethod === 'later' ? isLaterPaymentApproved : null
    });
    
    // إظهار معاينة الفاتورة بعد الضغط على زر "تأكيد" بدلاً من إغلاق النافذة
    setShowInvoicePreview(true);
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
  
  // التحقق من موافقة المدير على الدفع الآجل
  const handleAdminApproval = () => {
    // هنا سيتم التحقق من بيانات اعتماد المدير في التطبيق الحقيقي
    // ولكن الآن سنفترض أن المدير وافق
    setIsLaterPaymentApproved(true);
    setShowApprovalDialog(false);
    
    // بعد الموافقة، نقوم بتقديم النموذج
    console.log({
      invoiceNumber,
      customer,
      products,
      subtotal,
      totalDiscount,
      total,
      notes,
      paymentMethod,
      date: invoiceDate,
      isLaterPaymentApproved: true
    });
    
    setShowInvoicePreview(true);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* معاينة الفاتورة المنسقة */}
      <InvoicePreview 
        open={showInvoicePreview} 
        onOpenChange={setShowInvoicePreview}
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
      
      {/* نافذة موافقة المدير على الدفع الآجل */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              {t('admin_approval_required')}
            </DialogTitle>
            <DialogDescription>
              {t('later_payment_needs_approval')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-sm">
              <LockKeyhole className="h-4 w-4 text-muted-foreground" />
              <span>{t('admin_approval_description')}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="text"
                placeholder={t('admin_username')}
                className="col-span-2"
              />
              <Input
                type="password"
                placeholder={t('admin_password')}
                className="col-span-2"
              />
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
              {t('approve')}
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
              onClick={() => setShowBarcodeScanner(true)}
            >
              <Scan className="mr-1 h-4 w-4" />
              {t('scan_barcode')}
            </Button>
            <Button 
              type="button" 
              size="sm" 
              onClick={addProduct}
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