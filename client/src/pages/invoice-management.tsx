import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, Search, Pencil, Trash2, Printer, ExternalLink, Filter, CheckCircle, XCircle, Clock, 
  RefreshCw, ArrowUpDown, Download, ChevronRight, ChevronLeft, Loader2, Share, Scan, QrCode,
  X, Box
} from 'lucide-react';
import BarcodeScanner from '@/components/barcode-scanner';
import EditInvoiceDialog from '@/components/invoice/edit-invoice-dialog-new';
import InvoiceDetailsDialog from '@/components/invoice/invoice-details-dialog';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuthContext } from '@/context/auth-context';
import { useLocale } from '@/hooks/use-locale';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// UI Components
import {
  Input,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Switch,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui';

export default function InvoiceManagement() {
  const { t } = useTranslation();
  const { language } = useLocale();
  const isRTL = language === 'ar';
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [isBarcodeDialogOpen, setIsBarcodeDialogOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [isEditInvoiceDialogOpen, setIsEditInvoiceDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [isInvoiceDetailsOpen, setIsInvoiceDetailsOpen] = useState(false);
  const [detailsInvoice, setDetailsInvoice] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  
  // استخدام useQuery لجلب البيانات من الخادم
  const { data: dbInvoices, isLoading: isLoadingInvoices, error: invoicesError } = useQuery({
    queryKey: ['/api/invoices'],
    refetchInterval: 30000,  // تحديث كل 30 ثانية
  });
  
  // عرض معلومات العملاء (لعرض اسم العميل في تفاصيل الفاتورة)
  const { data: customers } = useQuery({
    queryKey: ['/api/customers'],
    refetchInterval: 30000,
  });

  // حالة تصفية وترتيب البيانات
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // عمليل QueryClient للتعامل مع المُخزن المؤقت
  const queryClient = useQueryClient();
  
  // حذف الفاتورة
  const deleteMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await axios.delete(`/api/invoices/${invoiceId}`);
      return response.data;
    },
    onSuccess: () => {
      // تحديث المُخزن المؤقت بعد الحذف
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      
      toast({
        title: t('success'),
        description: t('invoice_deleted_successfully'),
      });
    },
    onError: (error) => {
      console.error('Error deleting invoice:', error);
      
      toast({
        title: t('error'),
        description: t('error_deleting_invoice'),
        variant: 'destructive'
      });
    }
  });
  
  // مسح الفاتورة
  const handleDeleteInvoice = (invoiceId: number) => {
    if (window.confirm(t('confirm_delete_invoice'))) {
      deleteMutation.mutate(invoiceId);
    }
  };
  
  // تحويل حالة الفاتورة إلى شارة ملونة
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">{t('completed')}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">{t('pending')}</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500">{t('cancelled')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  // تحويل طريقة الدفع إلى شارة ملونة
  const getPaymentBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return <Badge className="bg-green-500">{t('cash')}</Badge>;
      case 'card':
        return <Badge className="bg-blue-500">{t('card')}</Badge>;
      case 'deferred':
        return <Badge className="bg-yellow-500">{t('deferred')}</Badge>;
      default:
        return <Badge>{method}</Badge>;
    }
  };
  
  // تصفية الفواتير حسب معايير البحث والفلترة
  const filteredInvoices = React.useMemo(() => {
    if (!dbInvoices) return [];
    
    return dbInvoices
      .filter((invoice: any) => {
        // تطبيق فلتر البحث
        const searchLower = searchQuery.toLowerCase();
        
        const productNamesMatch = invoice.productNames 
          ? invoice.productNames.toLowerCase().includes(searchLower)
          : false;
          
        const customerNameMatch = invoice.customerName 
          ? invoice.customerName.toLowerCase().includes(searchLower)
          : false;
          
        const invoiceNumberMatch = invoice.invoiceNumber 
          ? invoice.invoiceNumber.toLowerCase().includes(searchLower)
          : false;
        
        const matchesSearch = 
          !searchQuery || 
          productNamesMatch || 
          customerNameMatch || 
          invoiceNumberMatch;
        
        // تطبيق الفلترة حسب الحالة والدفع
        const matchesStatusFilter = statusFilter === 'all' || invoice.status === statusFilter;
        const matchesPaymentFilter = paymentFilter === 'all' || invoice.paymentMethod === paymentFilter;
        
        // تطبيق فلتر نوع الفاتورة (جميع، اليوم، الأسبوع، الشهر)
        const today = new Date();
        const invoiceDate = new Date(invoice.createdAt);
        
        let matchesDateFilter = true;
        if (filter === 'today') {
          matchesDateFilter = (
            invoiceDate.getDate() === today.getDate() &&
            invoiceDate.getMonth() === today.getMonth() &&
            invoiceDate.getFullYear() === today.getFullYear()
          );
        } else if (filter === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          matchesDateFilter = invoiceDate >= weekAgo;
        } else if (filter === 'month') {
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          matchesDateFilter = invoiceDate >= monthAgo;
        }
        
        return matchesSearch && matchesStatusFilter && matchesPaymentFilter && matchesDateFilter;
      })
      .sort((a: any, b: any) => {
        // تطبيق الترتيب
        if (sortField === 'date' || sortField === 'createdAt') {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        }
        
        if (sortField === 'invoiceNumber') {
          return sortDirection === 'asc' 
            ? a.invoiceNumber.localeCompare(b.invoiceNumber) 
            : b.invoiceNumber.localeCompare(a.invoiceNumber);
        }
        
        if (sortField === 'total') {
          return sortDirection === 'asc' ? a.total - b.total : b.total - a.total;
        }
        
        // الترتيب الافتراضي حسب التاريخ (الأحدث أولاً)
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
  }, [dbInvoices, searchQuery, filter, statusFilter, paymentFilter, sortField, sortDirection, t]);
  
  // توزيع الفواتير على صفحات
  const paginatedInvoices = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInvoices, currentPage, itemsPerPage]);
  
  // عدد الصفحات الكلي
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  
  // تغيير الصفحة
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };
  
  // تغيير الترتيب
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // احصل على رمز الترتيب
  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown size={16} />;
    }
    
    return sortDirection === 'asc' 
      ? <ChevronUp size={16} /> 
      : <ChevronDown size={16} />;
  };
  
  // تحميل تفاصيل الفاتورة للتعديل
  const handleEditInvoice = (invoice: any) => {
    setEditingInvoice(invoice);
    setIsEditInvoiceDialogOpen(true);
  };
  
  // استخدام البارکود لإيجاد المنتج
  const handleBarcodeDetected = (barcode: string) => {
    // لا نغلق نافذة الماسح الضوئي للسماح بمسح متعدد
    // setIsBarcodeDialogOpen(false);
    
    // البحث عن المنتج باستخدام الباركود
    fetch(`/api/products/barcode/${barcode}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Product not found');
        }
        return response.json();
      })
      .then(product => {
        console.log('Found product:', product);
        setScannedProduct(product);
        
        toast({
          title: t('product_found'),
          description: `${product.name} - ${formatCurrency(product.price)}`,
        });
      })
      .catch(error => {
        console.error('Error finding product:', error);
        
        toast({
          title: t('error'),
          description: t('no_product_found_with_barcode'),
          variant: 'destructive',
        });
      });
  };
  
  // Open invoice details dialog with items - استخدام مكون عرض تفاصيل الفاتورة الجديد
  const openInvoiceDetails = (invoice: any) => {
    console.log('Opening invoice details with new dialog:', invoice);

    try {
      // تجهيز بيانات الفاتورة للعرض
      const processFinalInvoice = (invoiceData: any) => {
        // استخراج المنتجات من البيانات المشفرة
        try {
          let products = [];
          
          // محاولة استخراج المنتجات من حقل productsData
          if (invoiceData.productsData) {
            try {
              const parsedProducts = JSON.parse(invoiceData.productsData);
              if (Array.isArray(parsedProducts)) {
                products = parsedProducts;
              }
            } catch (e) {
              console.error('Error parsing productsData JSON:', e);
            }
          }
          
          // إذا لم يتم العثور على منتجات في productsData، نحاول استخدام الحقول المنفصلة
          if (products.length === 0 && invoiceData.productIds) {
            try {
              const productIds = invoiceData.productIds.split(',');
              const productNames = invoiceData.productNames.split(',');
              const productQuantities = invoiceData.productQuantities.split(',').map(Number);
              const productPrices = invoiceData.productPrices.split(',').map(Number);
              
              products = productIds.map((id: string, index: number) => ({
                id: parseInt(id),
                productId: parseInt(id),
                name: productNames[index] || 'منتج غير معروف',
                productName: productNames[index] || 'منتج غير معروف',
                price: productPrices[index] || 0,
                quantity: productQuantities[index] || 1,
              }));
            } catch (e) {
              console.error('Error extracting products from separate fields:', e);
            }
          }
          
          // تنسيق البيانات النهائية للفاتورة
          const processedInvoice = {
            ...invoiceData,
            products: products,
            customerName: invoiceData.customerName,
            customerPhone: invoiceData.customerPhone,
            customerAddress: invoiceData.customerAddress,
            invoiceDiscount: invoiceData.invoiceDiscount || 0,
            itemsDiscount: invoiceData.itemsDiscount || 0,
            subtotal: invoiceData.subtotal || 0,
            total: invoiceData.total || 0,
          };
          
          console.log('Processed invoice for display:', processedInvoice);
          return processedInvoice;
        } catch (error) {
          console.error('Error processing invoice for display:', error);
          return invoiceData;
        }
      };
      
      // تحضير الفاتورة للعرض
      const processedInvoice = processFinalInvoice(invoice);
      setDetailsInvoice(processedInvoice);
      setIsInvoiceDetailsOpen(true);
    } catch (error) {
      console.error('Error opening invoice details:', error);
      
      toast({
        title: t('error'),
        description: t('error_opening_invoice_details'),
        variant: 'destructive'
      });
    }
  };
  
  // تحديث إعدادات الفرز والترتيب عند تغيير اللغة
  useEffect(() => {
    // إعادة ضبط الصفحة الحالية إلى الصفحة الأولى
    setCurrentPage(1);
  }, [language, filter, statusFilter, paymentFilter, searchQuery]);
  
  // إظهار رسالة التحميل أثناء جلب البيانات
  if (isLoadingInvoices) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
        <p className="text-lg font-medium">{t('loading_invoices')}</p>
      </div>
    );
  }
  
  // إظهار رسالة الخطأ في حالة فشل جلب البيانات
  if (invoicesError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <XCircle className="w-10 h-10 mb-4 text-red-500" />
        <p className="text-lg font-medium text-red-500">{t('error_loading_invoices')}</p>
        <p className="text-sm text-muted-foreground mt-2">{(invoicesError as Error).message}</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('try_again')}
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container px-4 pb-8 pt-4 mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col space-y-1.5 mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {t('invoices_management')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('invoices_management_description')}
        </p>
      </div>
      
      {/* قسم أدوات التصفية والبحث */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="mb-1 text-sm font-medium">{t('search')}</div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('search_invoices')}
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <div className="mb-1 text-sm font-medium">{t('date_range')}</div>
              <Select
                value={filter}
                onValueChange={(value) => setFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('select_date_range')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_dates')}</SelectItem>
                  <SelectItem value="today">{t('today')}</SelectItem>
                  <SelectItem value="week">{t('this_week')}</SelectItem>
                  <SelectItem value="month">{t('this_month')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <div className="mb-1 text-sm font-medium">{t('status')}</div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('select_status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_statuses')}</SelectItem>
                  <SelectItem value="completed">{t('completed')}</SelectItem>
                  <SelectItem value="pending">{t('pending')}</SelectItem>
                  <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <div className="mb-1 text-sm font-medium">{t('payment_method')}</div>
              <Select
                value={paymentFilter}
                onValueChange={(value) => setPaymentFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('select_payment_method')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_payment_methods')}</SelectItem>
                  <SelectItem value="cash">{t('cash')}</SelectItem>
                  <SelectItem value="card">{t('card')}</SelectItem>
                  <SelectItem value="deferred">{t('deferred')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              {filteredInvoices.length === 0 
                ? t('no_invoices_found') 
                : t('showing_x_of_y_invoices', {
                    displayed: Math.min(paginatedInvoices.length, itemsPerPage),
                    total: filteredInvoices.length
                  })
              }
            </div>
            
            <div className="flex gap-2">
              {/* زر مسح الفلتر */}
              {(searchQuery || filter !== 'all' || statusFilter !== 'all' || paymentFilter !== 'all') && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setFilter('all');
                    setStatusFilter('all');
                    setPaymentFilter('all');
                  }}
                >
                  <X className="w-4 h-4 mr-1" />
                  {t('clear_filters')}
                </Button>
              )}
              
              {/* زر فحص باركود */}
              <Button 
                variant="outline"
                size="sm" 
                onClick={() => setIsBarcodeDialogOpen(true)}
              >
                <Scan className="w-4 h-4 mr-1" />
                {t('scan_barcode')}
              </Button>
              
              {/* زر تحديث البيانات */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                {t('refresh')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* جدول الفواتير */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-muted/50">
                  <TableHead className="w-10 text-center">
                    #
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('invoiceNumber')}>
                    <div className="flex items-center">
                      {t('invoice_number')}
                      <span className="ml-1">{getSortIcon('invoiceNumber')}</span>
                    </div>
                  </TableHead>
                  <TableHead>{t('customer')}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('date')}>
                    <div className="flex items-center">
                      {t('date')}
                      <span className="ml-1">{getSortIcon('date')}</span>
                    </div>
                  </TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('payment')}</TableHead>
                  <TableHead className="cursor-pointer text-right" onClick={() => handleSort('total')}>
                    <div className="flex items-center justify-end">
                      {t('total')}
                      <span className="ml-1">{getSortIcon('total')}</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {paginatedInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      {searchQuery || filter !== 'all' || statusFilter !== 'all' || paymentFilter !== 'all'
                        ? t('no_invoices_match_filters')
                        : t('no_invoices_found')
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInvoices.map((invoice: any, index: number) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="text-center font-medium">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-primary">
                          {invoice.invoiceNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {invoice.customerName || t('unknown_customer')}
                        </div>
                        {invoice.customerPhone && (
                          <div className="text-xs text-muted-foreground">
                            {invoice.customerPhone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatDate(invoice.createdAt, 'short', language)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(invoice.createdAt, 'time', language)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice.status)}
                      </TableCell>
                      <TableCell>
                        {getPaymentBadge(invoice.paymentMethod)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">
                          {formatCurrency(invoice.total)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center space-x-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <span className="sr-only">{t('open_menu')}</span>
                                <EllipsisVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="focus:bg-primary-50 focus:text-primary-600" onClick={() => openInvoiceDetails(invoice)}>
                                <FileText className="mr-2 h-4 w-4" />
                                {t('view_details')}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="focus:bg-primary-50 focus:text-primary-600" onClick={() => handleEditInvoice(invoice)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                {t('edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="focus:bg-destructive-50 focus:text-destructive-600" onClick={() => handleDeleteInvoice(invoice.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        
        {/* ترقيم الصفحات */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end px-4 py-4">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
              
              <span className="text-sm">
                {t('page_x_of_y', { current: currentPage, total: totalPages })}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </Card>
      
      {/* مربع حوار مسح الباركود */}
      <Dialog
        open={isBarcodeDialogOpen}
        onOpenChange={setIsBarcodeDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('scan_barcode')}</DialogTitle>
            <DialogDescription>
              {t('position_barcode_in_camera')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <BarcodeScanner onDetected={handleBarcodeDetected} />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBarcodeDialogOpen(false)}>
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* مربع حوار معلومات المنتج الممسوح */}
      <Dialog
        open={!!scannedProduct}
        onOpenChange={(open) => {
          if (!open) setScannedProduct(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('scanned_product')}</DialogTitle>
            <DialogDescription>
              {t('product_details_found')}
            </DialogDescription>
          </DialogHeader>
          
          {scannedProduct && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">{t('product_name')}</h4>
                  <p className="text-base">{scannedProduct.name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">{t('barcode')}</h4>
                  <p className="text-base">{scannedProduct.barcode}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">{t('price')}</h4>
                  <p className="text-base font-medium text-primary">
                    {formatCurrency(scannedProduct.price)}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">{t('available_quantity')}</h4>
                  <p className="text-base">{scannedProduct.quantity || t('not_available')}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-1">{t('description')}</h4>
                <p className="text-sm">{scannedProduct.description || t('no_description')}</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setScannedProduct(null)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* مربع حوار تعديل الفاتورة */}
      {editingInvoice && (
        <EditInvoiceDialog
          open={isEditInvoiceDialogOpen}
          onOpenChange={setIsEditInvoiceDialogOpen}
          invoice={editingInvoice}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
          }}
        />
      )}
      
      {/* مربع حوار تفاصيل الفاتورة */}
      {detailsInvoice && (
        <InvoiceDetailsDialog
          open={isInvoiceDetailsOpen}
          onOpenChange={setIsInvoiceDetailsOpen}
          invoice={detailsInvoice}
        />
      )}
    </div>
  );
}

// أيقونات إضافية
function ChevronUp(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
  );
}

function ChevronDown(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );
}

function EllipsisVertical(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="1"></circle>
      <circle cx="12" cy="5" r="1"></circle>
      <circle cx="12" cy="19" r="1"></circle>
    </svg>
  );
}