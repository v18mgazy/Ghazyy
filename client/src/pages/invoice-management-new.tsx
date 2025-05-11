import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, Search, Pencil, Trash2, Printer, Filter, CheckCircle, XCircle, Clock, 
  RefreshCw, ArrowUpDown, ChevronRight, ChevronLeft, Loader2, Share, Scan
} from 'lucide-react';
import BarcodeScanner from '@/components/barcode-scanner';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuthContext } from '@/context/auth-context';
import { useLocale } from '@/hooks/use-locale';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

// استيراد أنواع البيانات
import { Invoice, InvoiceProduct, Customer, Product } from "@shared/schema";

// UI Components
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Badge
} from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

export default function InvoiceManagement() {
  const { t } = useTranslation();
  const { language } = useLocale();
  const { user } = useAuthContext();
  const { toast } = useToast();
  const isRtl = language === 'ar';
  
  // حالة المكونات
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [invoicesPerPage] = useState(10);
  
  // حالة النوافذ المنبثقة
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [invoiceToDeleteDbId, setInvoiceToDeleteDbId] = useState<number | undefined>();
  const [isBarcodeDialogOpen, setIsBarcodeDialogOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  
  // استعلام للحصول على بيانات الفواتير
  const { 
    data: dbInvoices, 
    isLoading: isLoadingInvoices, 
    error: invoicesError,
    refetch: refetchInvoices
  } = useQuery({
    queryKey: ['/api/invoices'],
    staleTime: 10000, // تقليل وقت الصلاحية لضمان تحديث البيانات
  });
  
  // معالجة الأخطاء
  useEffect(() => {
    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError);
      toast({
        title: t('error'),
        description: t('invoices_fetch_error'),
        variant: 'destructive'
      });
    }
  }, [invoicesError, toast, t]);
  
  // تحويل بيانات الفواتير القادمة من قاعدة البيانات
  const processedInvoices = useMemo(() => {
    if (!dbInvoices || !Array.isArray(dbInvoices) || dbInvoices.length === 0) {
      console.log('No invoices available from database');
      return [];
    }
    
    console.log('Processing invoices:', dbInvoices.length);
    
    // تحويل بيانات الفواتير
    return dbInvoices
      .filter((invoice: any) => invoice && !invoice.isDeleted) // استبعاد الفواتير المحذوفة
      .map((invoice: any) => {
        if (!invoice) {
          console.warn('Found null invoice in data');
          return null;
        }
        
        // استخراج بيانات المنتجات
        let products = extractProductsFromInvoice(invoice);
        
        // تنسيق بيانات الفاتورة للعرض
        return {
          id: invoice.invoiceNumber || `INV-${invoice.id}`,
          dbId: invoice.id,
          date: new Date(invoice.date || Date.now()),
          customer: {
            id: invoice.customerId?.toString() || 'unknown',
            name: invoice.customerName || t('unknown_customer'),
            phone: invoice.customerPhone || '',
            address: invoice.customerAddress || ''
          },
          total: invoice.total || 0,
          subtotal: invoice.subtotal || 0,
          discount: invoice.discount || 0,
          status: invoice.paymentStatus || 'unknown',
          paymentMethod: invoice.paymentMethod || 'unknown',
          items: products,
          notes: invoice.notes || '',
          createdAt: invoice.createdAt ? new Date(invoice.createdAt) : new Date(),
          userId: invoice.userId
        };
      })
      .filter(Boolean); // إزالة القيم الفارغة
  }, [dbInvoices, t]);
  
  // استخراج بيانات المنتجات من الفاتورة
  const extractProductsFromInvoice = (invoice: any) => {
    try {
      // طريقة 1: استخراج من الحقول المنفصلة (الأسلوب الجديد)
      if (invoice.productIds && invoice.productNames && invoice.productQuantities && invoice.productPrices) {
        try {
          // تقسيم البيانات
          const productIds = invoice.productIds.split(',').map((id: string) => parseInt(id.trim()));
          const productNames = invoice.productNames.split('|');
          const productQuantities = invoice.productQuantities.split(',').map((qty: string) => parseFloat(qty.trim()));
          const productPrices = invoice.productPrices.split(',').map((price: string) => parseFloat(price.trim()));
          
          // بيانات اختيارية
          let productDiscounts: number[] = [];
          if (invoice.productDiscounts) {
            productDiscounts = invoice.productDiscounts.split(',').map((disc: string) => parseFloat(disc.trim() || '0'));
          }
          
          let productTotals: number[] = [];
          if (invoice.productTotals) {
            productTotals = invoice.productTotals.split(',').map((total: string) => parseFloat(total.trim() || '0'));
          }
          
          // التحقق من تطابق أطوال المصفوفات
          if (productIds.length === productNames.length && 
              productIds.length === productPrices.length && 
              productIds.length === productQuantities.length) {
            
            // إنشاء مصفوفة المنتجات
            const products = productIds.map((id: number, index: number) => {
              const total = index < productTotals.length && productTotals[index] 
                ? productTotals[index] 
                : (productPrices[index] * productQuantities[index]);
              
              const discount = index < productDiscounts.length ? productDiscounts[index] : 0;
              
              return {
                productId: id,
                productName: productNames[index] || t('unknown_product'),
                quantity: productQuantities[index] || 0,
                price: productPrices[index] || 0,
                total: total,
                discount: discount
              };
            });
            
            console.log('Extracted products from separate fields:', products.length);
            return products;
          }
        } catch (error) {
          console.error('Error extracting from separate fields:', error);
        }
      }
      
      // طريقة 2: استخراج من حقل productsData
      if (invoice.productsData) {
        try {
          const parsedProducts = JSON.parse(invoice.productsData);
          if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
            console.log('Extracted products from JSON:', parsedProducts.length);
            return parsedProducts;
          }
        } catch (error) {
          console.error('Error parsing productsData JSON:', error);
        }
      }
      
      // طريقة 3: استخدام حقل منتجات مباشر إذا كان موجودًا
      if (invoice.products && Array.isArray(invoice.products)) {
        return invoice.products;
      }
      
      // إرجاع قائمة فارغة في حالة عدم وجود منتجات
      console.warn('No product data found for invoice:', invoice.id);
      return [];
    } catch (error) {
      console.error('Error extracting products from invoice:', error);
      return [];
    }
  };
  
  // تخزين الفواتير المعالجة في حالة المكون
  const [invoices, setInvoices] = useState<any[]>([]);
  
  // تحديث الفواتير عند تغير البيانات المعالجة
  useEffect(() => {
    if (processedInvoices && processedInvoices.length > 0) {
      setInvoices(processedInvoices);
    }
  }, [processedInvoices]);
  
  // تصفية الفواتير حسب معايير البحث والتصفية
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const matchesSearch = 
        (invoice.id && invoice.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (invoice.customer.name && invoice.customer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (invoice.customer.phone && invoice.customer.phone.includes(searchTerm));
        
      const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
      const matchesPayment = filterPayment === 'all' || invoice.paymentMethod === filterPayment;
      
      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [invoices, searchTerm, filterStatus, filterPayment]);
  
  // التقسيم الصفحي للفواتير
  const { currentInvoices, totalPages } = useMemo(() => {
    const indexOfLastInvoice = currentPage * invoicesPerPage;
    const indexOfFirstInvoice = indexOfLastInvoice - invoicesPerPage;
    return {
      currentInvoices: filteredInvoices.slice(indexOfFirstInvoice, indexOfLastInvoice),
      totalPages: Math.ceil(filteredInvoices.length / invoicesPerPage)
    };
  }, [filteredInvoices, currentPage, invoicesPerPage]);
  
  // تغيير الصفحة
  const changePage = (page: number) => {
    setCurrentPage(page);
  };
  
  // عرض تفاصيل الفاتورة
  const openInvoiceDetails = (invoice: any) => {
    console.log('Opening invoice details for:', invoice.id);
    setSelectedInvoice(invoice);
    setIsDetailsModalOpen(true);
  };
  
  // حذف الفاتورة
  const openDeleteDialog = (invoiceId: string, dbId?: number) => {
    console.log('Opening delete confirmation for invoice:', invoiceId, 'with DB ID:', dbId);
    setInvoiceToDelete(invoiceId);
    setInvoiceToDeleteDbId(dbId);
    setIsDeleteDialogOpen(true);
  };
  
  // تنفيذ عملية الحذف
  const deleteInvoice = async () => {
    if (!invoiceToDeleteDbId) {
      console.error('No invoice DB ID to delete');
      toast({
        title: t('error'),
        description: t('invoice_delete_error'),
        variant: 'destructive'
      });
      return;
    }

    try {
      console.log('Deleting invoice with DB ID:', invoiceToDeleteDbId);
      
      // إرسال طلب الحذف إلى الخادم
      const response = await apiRequest('DELETE', `/api/invoices/${invoiceToDeleteDbId}`);
      
      if (!response.ok) {
        let errorMessage = t('failed_to_delete_invoice');
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // في حالة عدم وجود رسالة خطأ محددة
        }
        throw new Error(errorMessage);
      }
      
      // تحديث واجهة المستخدم بعد الحذف
      const updatedInvoices = invoices.filter(inv => inv.dbId !== invoiceToDeleteDbId);
      setInvoices(updatedInvoices);
      
      // إغلاق النافذة المنبثقة وإعادة تعيين الحالة
      setIsDeleteDialogOpen(false);
      setInvoiceToDelete(null);
      setInvoiceToDeleteDbId(undefined);
      
      // إعادة تحميل البيانات
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      
      // إظهار رسالة نجاح
      toast({
        title: t('invoice_deleted'),
        description: t('invoice_deleted_successfully'),
      });
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
      toast({
        title: t('error'),
        description: error.message || t('failed_to_delete_invoice'),
        variant: 'destructive'
      });
    }
  };
  
  // مسح الباركود
  const openBarcodeScanner = () => {
    setScannedProduct(null);
    setIsBarcodeDialogOpen(true);
  };
  
  // معالجة المنتج المكتشف
  const handleProductScanned = async (product: any) => {
    console.log('Product scanned:', product);
    setScannedProduct(product);
  };
  
  // مشاركة الفاتورة عبر واتساب
  const shareInvoiceWhatsApp = async (invoice: any) => {
    try {
      if (!invoice || !invoice.customer || !invoice.customer.phone) {
        toast({
          title: t('error'),
          description: t('customer_phone_missing'),
          variant: 'destructive'
        });
        return;
      }
      
      // تنظيف رقم الهاتف وإزالة المسافات والشرطات وأي رموز غير رقمية
      let phone = invoice.customer.phone.replace(/\s+|-|\(|\)|\+/g, '');
      
      // إضافة رمز البلد إذا لم يكن موجودًا
      if (!phone.startsWith('20')) {
        phone = '20' + phone;
      }
      
      // بناء رسالة الواتساب
      let message = `🧾 *${t('invoice')}*: ${invoice.id}\n`;
      message += `📅 *${t('date')}*: ${formatDate(invoice.date)}\n`;
      message += `👤 *${t('customer')}*: ${invoice.customer.name}\n\n`;
      
      // إضافة المنتجات
      message += `*${t('products')}*:\n`;
      if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item: any, index: number) => {
          message += `${index + 1}. ${item.productName || item.product?.name} - ${
            formatCurrency(item.price)
          } x ${item.quantity} = ${formatCurrency(item.total)}\n`;
        });
      }
      
      message += `\n`;
      message += `💰 *${t('subtotal')}*: ${formatCurrency(invoice.subtotal || invoice.total)}\n`;
      
      if (invoice.discount && invoice.discount > 0) {
        message += `🏷️ *${t('discount')}*: ${formatCurrency(invoice.discount)}\n`;
      }
      
      message += `💵 *${t('total')}*: ${formatCurrency(invoice.total)}\n`;
      message += `💳 *${t('payment_method')}*: ${t(invoice.paymentMethod)}\n`;
      message += `\n🏪 *${t('store_name')}*`;
      
      // إنشاء رابط الواتساب
      const whatsappURL = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      
      // فتح رابط الواتساب في نافذة جديدة
      window.open(whatsappURL, '_blank');
    } catch (error) {
      console.error('Error sharing invoice via WhatsApp:', error);
      toast({
        title: t('error'),
        description: t('sharing_failed'),
        variant: 'destructive'
      });
    }
  };
  
  // طباعة الفاتورة
  const printInvoice = (invoice: any) => {
    try {
      // الانتقال إلى صفحة الفاتورة للطباعة
      const printURL = `/invoice/${invoice.dbId}/print`;
      window.open(printURL, '_blank');
    } catch (error) {
      console.error('Error opening print view:', error);
      toast({
        title: t('error'),
        description: t('print_failed'),
        variant: 'destructive'
      });
    }
  };
  
  // تحديث البيانات
  const handleRefresh = () => {
    refetchInvoices();
    toast({
      title: t('refreshing'),
      description: t('refreshing_data'),
    });
  };

  // الواجهة الرئيسية
  return (
    <div className="container max-w-7xl mx-auto py-6 space-y-8">
      {/* عنوان الصفحة وأدوات التحكم */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('invoice_management')}</h1>
          <p className="text-muted-foreground mt-1">{t('invoice_management_description')}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{t('refresh')}</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={openBarcodeScanner}
            className="flex items-center gap-1 bg-primary/10"
          >
            <Scan className="h-4 w-4 text-primary" />
            <span>{t('scan_barcode')}</span>
          </Button>
        </div>
      </div>
      
      {/* أدوات البحث والتصفية */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">{t('filter_and_search')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* حقل البحث */}
            <div className="space-y-2">
              <Label htmlFor="search">{t('search')}</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder={t('search_invoices_placeholder')}
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* تصفية حسب الحالة */}
            <div className="space-y-2">
              <Label htmlFor="status">{t('status')}</Label>
              <Select 
                value={filterStatus} 
                onValueChange={setFilterStatus}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder={t('select_status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_statuses')}</SelectItem>
                  <SelectItem value="pending">{t('pending')}</SelectItem>
                  <SelectItem value="approved">{t('approved')}</SelectItem>
                  <SelectItem value="completed">{t('completed')}</SelectItem>
                  <SelectItem value="rejected">{t('rejected')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* تصفية حسب طريقة الدفع */}
            <div className="space-y-2">
              <Label htmlFor="payment">{t('payment_method')}</Label>
              <Select 
                value={filterPayment} 
                onValueChange={setFilterPayment}
              >
                <SelectTrigger id="payment">
                  <SelectValue placeholder={t('select_payment_method')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_payment_methods')}</SelectItem>
                  <SelectItem value="cash">{t('cash')}</SelectItem>
                  <SelectItem value="visa">{t('visa')}</SelectItem>
                  <SelectItem value="deferred">{t('deferred')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* جدول الفواتير */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">{t('invoices')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingInvoices ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="text-lg font-medium mb-1">{t('no_invoices_found')}</h3>
              <p>{t('no_invoices_description')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('invoice_number')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('customer')}</TableHead>
                    <TableHead className="text-right">{t('total')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('payment_method')}</TableHead>
                    <TableHead>{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentInvoices.map((invoice, index) => (
                    <TableRow key={index} className="hover:bg-muted/40">
                      <TableCell className="font-medium">{invoice.id}</TableCell>
                      <TableCell>{formatDate(invoice.date)}</TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{invoice.customer.name}</span>
                          {invoice.customer.phone && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {invoice.customer.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(invoice.total)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            invoice.status === 'completed' ? 'success' :
                            invoice.status === 'approved' ? 'success' :
                            invoice.status === 'pending' ? 'warning' :
                            invoice.status === 'rejected' ? 'destructive' :
                            'outline'
                          }
                          className="whitespace-nowrap"
                        >
                          {invoice.status === 'completed' ? (
                            <CheckCircle className="h-3.5 w-3.5 me-1" />
                          ) : invoice.status === 'approved' ? (
                            <CheckCircle className="h-3.5 w-3.5 me-1" />
                          ) : invoice.status === 'pending' ? (
                            <Clock className="h-3.5 w-3.5 me-1" />
                          ) : invoice.status === 'rejected' ? (
                            <XCircle className="h-3.5 w-3.5 me-1" />
                          ) : null}
                          {t(invoice.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{t(invoice.paymentMethod)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">{t('menu')}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openInvoiceDetails(invoice)}>
                              <FileText className="h-4 w-4 me-2" />
                              {t('view_details')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => printInvoice(invoice)}>
                              <Printer className="h-4 w-4 me-2" />
                              {t('print')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => shareInvoiceWhatsApp(invoice)}>
                              <Share className="h-4 w-4 me-2" />
                              {t('share')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => openDeleteDialog(invoice.id, invoice.dbId)}
                            >
                              <Trash2 className="h-4 w-4 me-2" />
                              {t('delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* التنقل بين الصفحات */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => changePage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="text-sm text-muted-foreground">
                {t('page_x_of_y', { current: currentPage, total: totalPages })}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => changePage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* نافذة تفاصيل الفاتورة */}
      {selectedInvoice && (
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle className="gradient-heading">{t('invoice_details')}</DialogTitle>
              <DialogDescription>
                {selectedInvoice.id} - {formatDate(selectedInvoice.date)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* معلومات العميل */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-semibold mb-3">{t('customer_information')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('name')}</p>
                    <p className="font-medium">{selectedInvoice.customer.name}</p>
                  </div>
                  {selectedInvoice.customer.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('phone')}</p>
                      <p className="font-medium">{selectedInvoice.customer.phone}</p>
                    </div>
                  )}
                  {selectedInvoice.customer.address && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">{t('address')}</p>
                      <p className="font-medium">{selectedInvoice.customer.address}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* تفاصيل المنتجات */}
              <div>
                <h3 className="font-semibold mb-3">{t('product_details')}</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">{t('product')}</TableHead>
                        <TableHead className="text-center">{t('quantity')}</TableHead>
                        <TableHead className="text-right">{t('price')}</TableHead>
                        <TableHead className="text-right">{t('total')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.items && selectedInvoice.items.length > 0 ? 
                        selectedInvoice.items.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {item.productName || item.product?.name || t('unknown_product')}
                            </TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                              {t('no_products_in_invoice')}
                            </TableCell>
                          </TableRow>
                        )
                      }
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              {/* ملخص الفاتورة */}
              <div className="flex justify-between items-start">
                <div>
                  {/* معلومات الدفع */}
                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">{t('payment_information')}</h3>
                    <Badge
                      variant={
                        selectedInvoice.status === 'completed' ? 'success' :
                        selectedInvoice.status === 'approved' ? 'success' :
                        selectedInvoice.status === 'pending' ? 'warning' :
                        selectedInvoice.status === 'rejected' ? 'destructive' :
                        'outline'
                      }
                      className="mb-2"
                    >
                      {t(selectedInvoice.status)}
                    </Badge>
                    <p className="text-sm">
                      <span className="text-muted-foreground me-1">{t('payment_method')}:</span>
                      <span className="font-medium">{t(selectedInvoice.paymentMethod)}</span>
                    </p>
                  </div>
                  
                  {/* الملاحظات إذا وجدت */}
                  {selectedInvoice.notes && (
                    <div>
                      <h3 className="font-semibold mb-2">{t('notes')}</h3>
                      <p className="text-sm">{selectedInvoice.notes}</p>
                    </div>
                  )}
                </div>
                
                {/* ملخص المبالغ */}
                <div className="bg-muted/30 p-4 rounded-lg min-w-[200px]">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">{t('subtotal')}:</span>
                    <span className="font-medium">{formatCurrency(selectedInvoice.subtotal || selectedInvoice.total)}</span>
                  </div>
                  
                  {selectedInvoice.discount && selectedInvoice.discount > 0 && (
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">{t('discount')}:</span>
                      <span className="font-medium">{formatCurrency(selectedInvoice.discount)}</span>
                    </div>
                  )}
                  
                  <Separator className="my-2" />
                  
                  <div className="flex justify-between font-semibold">
                    <span>{t('total')}:</span>
                    <span className="text-primary">{formatCurrency(selectedInvoice.total)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter className="flex items-center gap-2">
              <Button variant="outline" onClick={() => printInvoice(selectedInvoice)}>
                <Printer className="h-4 w-4 me-2" />
                {t('print')}
              </Button>
              
              <Button 
                variant="default" 
                className="btn-glow"
                onClick={() => shareInvoiceWhatsApp(selectedInvoice)}
              >
                <Share className="h-4 w-4 me-2" />
                {t('share')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* نافذة تأكيد الحذف */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">{t('confirm_delete')}</DialogTitle>
            <DialogDescription>
              {t('delete_invoice_confirmation', { id: invoiceToDelete })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 border border-destructive/30 rounded-lg p-4 bg-destructive/5">
            <p className="text-destructive text-sm font-medium">
              {t('delete_invoice_warning')}
            </p>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              {t('cancel')}
            </Button>
            
            <Button 
              variant="destructive" 
              onClick={deleteInvoice}
            >
              <Trash2 className="h-4 w-4 me-2" />
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* نافذة ماسح الباركود */}
      <Dialog open={isBarcodeDialogOpen} onOpenChange={setIsBarcodeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="gradient-heading">{t('scan_barcode')}</DialogTitle>
            <DialogDescription>
              {t('scan_barcode_description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {!scannedProduct ? (
              <div className="bg-muted/30 p-4 rounded-lg border">
                <BarcodeScanner onProductScanned={handleProductScanned} />
              </div>
            ) : (
              <div className="bg-card rounded-lg border p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg">{scannedProduct.name}</h3>
                  <Badge variant="outline" className="font-normal text-xs">
                    {scannedProduct.barcode}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 py-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('price')}</p>
                    <p className="font-semibold text-primary">{formatCurrency(scannedProduct.sellingPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('stock')}</p>
                    <p className="font-medium">{scannedProduct.stock || t('unknown')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsBarcodeDialogOpen(false)}
            >
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}