import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Customer, Product, Invoice } from '@shared/schema';
import { useLocale } from '@/hooks/use-locale';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Eye,
  Pencil,
  Trash2,
  Printer,
  Share2,
  ChevronLeft,
  ChevronRight,
  Search,
  FileText,
  Calendar,
  User,
  DollarSign,
  Tag,
  ShoppingCart,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// نوع بيانات المنتج في الفاتورة
interface InvoiceProduct {
  id?: number;
  productId: number;
  productName: string;
  barcode?: string;
  quantity: number;
  price: number;
  purchasePrice?: number;
  discount?: number;
  total: number;
}

// نوع معلومات المتجر المستخدمة في الفواتير
interface StoreInfo {
  id?: number;
  name: string;
  address: string;
  phone: string;
  logo?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export default function InvoiceManagementPage() {
  const { t } = useTranslation();
  const { language } = useLocale();
  const isRtl = language === 'ar';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // حالة تفاصيل الفاتورة
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  // حالة حذف الفاتورة
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // حالة تحرير معلومات المتجر
  const [storeInfoDialogOpen, setStoreInfoDialogOpen] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  
  // حالة البحث
  const [searchTerm, setSearchTerm] = useState('');
  
  // استعلام لجلب الفواتير
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['/api/invoices'],
    refetchInterval: 60000, // تحديث كل دقيقة
    refetchOnWindowFocus: true,
  });

  // استعلام لمعلومات المتجر
  const { data: storeInfo } = useQuery({
    queryKey: ['/api/store-info'],
    onSuccess: (data) => {
      if (data) {
        setStoreName(data.name || '');
        setStoreAddress(data.address || '');
        setStorePhone(data.phone || '');
      }
    }
  });
  
  // mutation لتحديث معلومات المتجر
  const storeInfoMutation = useMutation({
    mutationFn: async (storeData: { name: string; address: string; phone: string }) => {
      const res = await apiRequest('POST', '/api/store-info', storeData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/store-info'] });
      setStoreInfoDialogOpen(false);
      toast({
        title: t('success'),
        description: t('store_info_updated_successfully'),
      });
    },
    onError: (error) => {
      console.error('Error updating store info:', error);
      toast({
        title: t('error'),
        description: t('error_updating_store_info'),
        variant: 'destructive',
      });
    },
  });
  
  // استعلام لجلب العملاء (للحصول على معلومات الاتصال)
  const { data: customers } = useQuery({
    queryKey: ['/api/customers'],
  });
  
  // تعريف mutation لحذف الفاتورة
  const deleteMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      await apiRequest('DELETE', `/api/invoices/${invoiceId}`);
    },
    onSuccess: () => {
      // تحديث قائمة الفواتير بعد الحذف
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      
      // عرض رسالة نجاح
      toast({
        title: t('success'),
        description: t('invoice_deleted_successfully'),
      });
      
      // إغلاق مربع الحوار
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    },
    onError: (error) => {
      console.error('Error deleting invoice:', error);
      toast({
        title: t('error'),
        description: t('error_deleting_invoice'),
        variant: 'destructive',
      });
    },
  });
  
  // تحميل تفاصيل الفاتورة عند اختيارها
  const loadInvoiceDetails = async (invoice: Invoice) => {
    try {
      setSelectedInvoice(invoice);
      setDetailsDialogOpen(true);
    } catch (error) {
      console.error('Error loading invoice details:', error);
      toast({
        title: t('error'),
        description: t('error_loading_invoice_details'),
        variant: 'destructive',
      });
    }
  };
  
  // تحويل بيانات المنتجات من نص JSON إلى مصفوفة
  const parseProducts = (invoice: Invoice): InvoiceProduct[] => {
    try {
      // المحاولة الأولى: تحليل productsData كنص JSON
      if (typeof invoice.productsData === 'string') {
        return JSON.parse(invoice.productsData);
      } 
      // المحاولة الثانية: استخدام productsData كمصفوفة مباشرة
      else if (Array.isArray(invoice.productsData)) {
        return invoice.productsData;
      }
      // المحاولة الثالثة: تحليل productData كنص JSON
      else if (typeof invoice.productData === 'string') {
        return JSON.parse(invoice.productData);
      }
      // المحاولة الرابعة: استخدام productData كمصفوفة مباشرة
      else if (Array.isArray(invoice.productData)) {
        return invoice.productData;
      }
      // الحالة الافتراضية: مصفوفة فارغة
      return [];
    } catch (error) {
      console.error('Error parsing products data:', error);
      return [];
    }
  };
  
  // تنسيق التاريخ حسب اللغة
  const formatDate = (dateStr: string | Date) => {
    try {
      const date = new Date(dateStr);
      return format(date, 'PPpp', {
        locale: language === 'ar' ? ar : enUS,
      });
    } catch (err) {
      return dateStr;
    }
  };
  
  // العثور على معلومات العميل من رقم التعريف
  const getCustomerName = (customerId: number): string => {
    if (!customers) return '';
    const customer = customers.find((c: Customer) => c.id === customerId);
    return customer ? customer.name : '';
  };
  
  // الحصول على رقم هاتف العميل
  const getCustomerPhone = (customerId: number): string => {
    if (!customers) return '';
    const customer = customers.find((c: Customer) => c.id === customerId);
    return customer?.phone || '';
  };
  
  // فلترة الفواتير بناءً على البحث
  const filteredInvoices = invoices
    ? invoices.filter((invoice: Invoice) => {
        const customerName = getCustomerName(invoice.customerId);
        const searchLower = searchTerm.toLowerCase();
        return (
          invoice.invoiceNumber?.toLowerCase().includes(searchLower) ||
          customerName.toLowerCase().includes(searchLower) ||
          String(invoice.total).includes(searchTerm)
        );
      })
    : [];
  
  // طباعة الفاتورة كملف PDF
  const printInvoice = () => {
    if (!selectedInvoice) return;
    
    const invoiceElement = document.getElementById('invoice-preview');
    if (!invoiceElement) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: t('error'),
        description: t('print_window_blocked'),
        variant: 'destructive',
      });
      return;
    }
    
    // نسخ أنماط CSS إلى النافذة الجديدة
    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\\n');
        } catch (e) {
          return '';
        }
      })
      .join('\\n');
    
    // إعداد محتوى النافذة الجديدة
    printWindow.document.write(`
      <html>
        <head>
          <title>${t('invoice')} ${selectedInvoice.invoiceNumber}</title>
          <style>${styles}</style>
        </head>
        <body>
          ${invoiceElement.outerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.setTimeout(function() {
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };
  
  // مشاركة الفاتورة كملف PDF
  const shareInvoicePDF = async () => {
    if (!selectedInvoice) return;
    
    try {
      const invoiceElement = document.getElementById('invoice-preview');
      if (!invoiceElement) return;
      
      // الحصول على هاتف العميل
      const customerPhone = getCustomerPhone(selectedInvoice.customerId);
      if (!customerPhone) {
        toast({
          title: t('error'),
          description: t('customer_phone_not_found'),
          variant: 'destructive',
        });
        return;
      }
      
      // قم بإنشاء لقطة للعنصر
      const canvas = await html2canvas(invoiceElement, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      
      // تحويل اللقطة إلى PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      // حساب الأبعاد للحفاظ على النسبة الصحيحة
      const imgWidth = 210; // عرض A4 بالملم
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // إضافة الصورة إلى ملف PDF
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // تحميل الملف
      const pdfBlob = pdf.output('blob');
      
      // إنشاء رابط WhatsApp
      const formattedPhone = customerPhone.replace(/[^0-9]/g, '');
      const message = encodeURIComponent(`${t('invoice')} ${selectedInvoice.invoiceNumber} - ${storeInfo?.name || ''}`);
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;
      
      // فتح واتساب
      window.open(whatsappUrl, '_blank');
      
      // تحميل الملف كملف PDF
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `${t('invoice')}_${selectedInvoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: t('success'),
        description: t('invoice_shared'),
      });
    } catch (error) {
      console.error('Error sharing invoice:', error);
      toast({
        title: t('error'),
        description: t('error_sharing_invoice'),
        variant: 'destructive',
      });
    }
  };
  
  // حذف الفاتورة
  const handleDeleteInvoice = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setDeleteDialogOpen(true);
  };
  
  // تأكيد حذف الفاتورة
  const confirmDelete = () => {
    if (invoiceToDelete) {
      deleteMutation.mutate(invoiceToDelete.id);
    }
  };
  
  // فتح صفحة تعديل الفاتورة
  const handleEditInvoice = (invoice: Invoice) => {
    // سنقوم بتنفيذ هذه الوظيفة لاحقًا
    toast({
      title: t('feature_coming_soon'),
      description: t('edit_invoice_feature_not_available'),
    });
  };
  
  // عرض تصميم الفاتورة للطباعة
  const renderInvoicePreview = () => {
    if (!selectedInvoice) return null;
    
    // تحليل بيانات المنتجات
    const products = parseProducts(selectedInvoice);
    
    // حساب الإجماليات
    const subtotal = Number(selectedInvoice.subtotal || 0);
    const discount = Number(selectedInvoice.discount || 0) +
                     Number(selectedInvoice.invoiceDiscount || 0) + 
                     Number(selectedInvoice.itemsDiscount || 0);
    const total = Number(selectedInvoice.total || 0);
    
    return (
      <div id="invoice-preview" className="bg-white p-6 rounded-md shadow-sm">
        {/* رأس الفاتورة - معلومات المتجر */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">{storeInfo?.name || t('store')}</h2>
          <p className="text-sm text-gray-600">{storeInfo?.address || ''}</p>
          <p className="text-sm text-gray-600">{storeInfo?.phone || ''}</p>
        </div>
        
        {/* معلومات الفاتورة */}
        <div className="flex justify-between mb-4">
          <div>
            <p className="text-sm">
              <span className="font-semibold">{t('invoice_number')}: </span>
              {selectedInvoice.invoiceNumber}
            </p>
            <p className="text-sm">
              <span className="font-semibold">{t('customer')}: </span>
              {getCustomerName(selectedInvoice.customerId)}
            </p>
          </div>
          <div className="text-left">
            <p className="text-sm">
              <span className="font-semibold">{t('date')}: </span>
              {formatDate(selectedInvoice.date || selectedInvoice.createdAt || new Date())}
            </p>
            <p className="text-sm">
              <span className="font-semibold">{t('payment_method')}: </span>
              {selectedInvoice.paymentMethod === 'cash' 
                ? t('cash') 
                : selectedInvoice.paymentMethod === 'card' 
                  ? t('card') 
                  : t('deferred')}
            </p>
          </div>
        </div>
        
        <Separator className="my-2" />
        
        {/* جدول المنتجات */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-2 text-sm text-right">{t('product')}</th>
                <th className="border p-2 text-sm text-center">{t('quantity')}</th>
                <th className="border p-2 text-sm text-center">{t('price')}</th>
                <th className="border p-2 text-sm text-center">{t('discount')}</th>
                <th className="border p-2 text-sm text-center">{t('total')}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => (
                <tr key={index}>
                  <td className="border p-2 text-sm text-right">{product.productName}</td>
                  <td className="border p-2 text-sm text-center">{product.quantity}</td>
                  <td className="border p-2 text-sm text-center">{product.price.toFixed(2)}</td>
                  <td className="border p-2 text-sm text-center">
                    {(product.discount || 0) > 0 ? product.discount?.toFixed(2) : '-'}
                  </td>
                  <td className="border p-2 text-sm text-center">{product.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* ملخص الفاتورة */}
        <div className="mt-4 flex justify-end">
          <div className="w-48">
            <div className="flex justify-between py-1">
              <span className="text-sm font-semibold">{t('subtotal')}:</span>
              <span className="text-sm">{subtotal.toFixed(2)}</span>
            </div>
            
            {discount > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-sm font-semibold">{t('discount')}:</span>
                <span className="text-sm text-red-600">-{discount.toFixed(2)}</span>
              </div>
            )}
            
            <Separator className="my-2" />
            
            <div className="flex justify-between py-1">
              <span className="text-base font-bold">{t('total')}:</span>
              <span className="text-base font-bold">{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {/* تذييل الفاتورة */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>{t('thank_you_for_shopping')}</p>
          <p>{t('invoice_footer')}</p>
        </div>
      </div>
    );
  };
  
  // إذا كان التحميل جارٍ
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-primary/20 mb-4"></div>
          <div className="h-4 w-48 bg-primary/20 rounded"></div>
          <div className="h-3 w-36 bg-primary/10 rounded mt-3"></div>
        </div>
      </div>
    );
  }
  
  // معالجة حفظ معلومات المتجر
  const handleSaveStoreInfo = () => {
    if (!storeName || !storeAddress || !storePhone) {
      toast({
        title: t('error'),
        description: t('please_fill_all_fields'),
        variant: 'destructive',
      });
      return;
    }
    
    storeInfoMutation.mutate({
      name: storeName,
      address: storeAddress,
      phone: storePhone,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            {t('invoice_management')}
          </h1>
          
          {/* زر إعدادات المتجر */}
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2 sm:mt-0"
            onClick={() => setStoreInfoDialogOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {t('store_settings')}
          </Button>
        </div>
        
        {/* شريط البحث */}
        <div className="relative w-full sm:w-auto min-w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder={t('search_invoices')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-3"
          />
          {searchTerm && (
            <X
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground cursor-pointer"
              size={16}
              onClick={() => setSearchTerm('')}
            />
          )}
        </div>
      </div>
      
      {/* جدول الفواتير */}
      <Card>
        <CardContent className="p-0">
          {filteredInvoices.length > 0 ? (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">{t('invoice_number')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('customer')}</TableHead>
                    <TableHead className="text-center">{t('payment_method')}</TableHead>
                    <TableHead className="text-center">{t('products_count')}</TableHead>
                    <TableHead className="text-right">{t('total')}</TableHead>
                    <TableHead className="text-center">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice: Invoice) => {
                    const products = parseProducts(invoice);
                    return (
                      <TableRow key={invoice.id} className="group">
                        <TableCell className="font-medium">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          {formatDate(invoice.date || invoice.createdAt || new Date())}
                        </TableCell>
                        <TableCell>{getCustomerName(invoice.customerId)}</TableCell>
                        <TableCell className="text-center">
                          {invoice.paymentMethod === 'cash' ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                              {t('cash')}
                            </span>
                          ) : invoice.paymentMethod === 'card' ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                              {t('card')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                              {t('deferred')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {products.length}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {Number(invoice.total).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => loadInvoiceDetails(invoice)}
                              title={t('view_details')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditInvoice(invoice)}
                              title={t('edit')}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                              onClick={() => handleDeleteInvoice(invoice)}
                              title={t('delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[300px] p-4">
              <div className="bg-muted/20 rounded-full p-4 mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">{t('no_invoices_found')}</h3>
              <p className="text-muted-foreground text-sm text-center max-w-md">
                {searchTerm
                  ? t('no_invoices_matching_search')
                  : t('no_invoices_available')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* مربع حوار تفاصيل الفاتورة */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('invoice_details')} - {selectedInvoice?.invoiceNumber}
            </DialogTitle>
            <DialogDescription>
              {selectedInvoice && formatDate(selectedInvoice.date || selectedInvoice.createdAt || new Date())}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* عرض تفاصيل الفاتورة */}
            {renderInvoicePreview()}
            
            {/* أزرار إجراءات الفاتورة */}
            <div className="flex flex-wrap justify-end gap-2 mt-4">
              <Button
                variant="outline"
                className="gap-2"
                onClick={printInvoice}
              >
                <Printer className="h-4 w-4" />
                {t('print')}
              </Button>
              
              <Button
                variant="outline"
                className="gap-2"
                onClick={shareInvoicePDF}
              >
                <Share2 className="h-4 w-4" />
                {t('share')}
              </Button>
              
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => handleEditInvoice(selectedInvoice as Invoice)}
              >
                <Pencil className="h-4 w-4" />
                {t('edit')}
              </Button>
              
              <Button
                variant="destructive"
                className="gap-2"
                onClick={() => {
                  setDetailsDialogOpen(false);
                  handleDeleteInvoice(selectedInvoice as Invoice);
                }}
              >
                <Trash2 className="h-4 w-4" />
                {t('delete')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* مربع حوار تأكيد الحذف */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('delete_invoice_confirmation', {
                invoiceNumber: invoiceToDelete?.invoiceNumber
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* مربع حوار معلومات المتجر */}
      <Dialog open={storeInfoDialogOpen} onOpenChange={setStoreInfoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t('store_settings')}
            </DialogTitle>
            <DialogDescription>
              {t('store_settings_description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="storeName" className="text-sm font-medium">
                {t('store_name')}
              </label>
              <Input
                id="storeName"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder={t('enter_store_name')}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="storeAddress" className="text-sm font-medium">
                {t('store_address')}
              </label>
              <Input
                id="storeAddress"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder={t('enter_store_address')}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="storePhone" className="text-sm font-medium">
                {t('store_phone')}
              </label>
              <Input
                id="storePhone"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder={t('enter_store_phone')}
                required
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStoreInfoDialogOpen(false)}
            >
              {t('cancel')}
            </Button>
            
            <Button
              type="submit"
              onClick={handleSaveStoreInfo}
              disabled={storeInfoMutation.isPending}
            >
              {storeInfoMutation.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  {t('saving')}...
                </>
              ) : (
                t('save_changes')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}