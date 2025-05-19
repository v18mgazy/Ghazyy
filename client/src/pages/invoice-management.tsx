import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Customer, Product, Invoice } from '@shared/schema';
import { useLocale } from '@/hooks/use-locale';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/context/auth-context';
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
  Settings,
  X,
  ArrowDownUp,
  ArrowUpDown,
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
  sellingPrice?: number; // إضافة حقل sellingPrice للتوافق مع البيانات القادمة
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
  const { isAdmin } = useAuthContext();

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

  // حالة تعديل الفاتورة
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedProducts, setEditedProducts] = useState<InvoiceProduct[]>([]);
  const [editedCustomerId, setEditedCustomerId] = useState<number | null>(null);
  const [editedDiscount, setEditedDiscount] = useState<number>(0);
  const [editedPaymentMethod, setEditedPaymentMethod] = useState<string>('cash');
  const [editedNotes, setEditedNotes] = useState<string>('');

  // حالة البحث
  const [searchTerm, setSearchTerm] = useState('');

  // حالة الترتيب
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  // استعلام لجلب الفواتير
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['/api/invoices'],
    refetchInterval: 60000, // تحديث كل دقيقة
    refetchOnWindowFocus: true,
  });

  // استعلام لمعلومات المتجر
  const { data: storeInfo } = useQuery({
    queryKey: ['/api/store-info'],
  });

  // تعيين بيانات المتجر عند استلامها
  useEffect(() => {
    if (storeInfo) {
      setStoreName((storeInfo as any).name || '');
      setStoreAddress((storeInfo as any).address || '');
      setStorePhone((storeInfo as any).phone || '');
    }
  }, [storeInfo]);

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

  // mutation لتحديث الفاتورة
  const updateInvoiceMutation = useMutation({
    mutationFn: async (updateData: {
      invoiceId: number;
      customerId: number | null;
      discount: number;
      paymentMethod: string;
      notes: string | null;
      products: InvoiceProduct[];
    }) => {
      console.log('Updating invoice with data:', updateData);
      const { invoiceId, ...data } = updateData;

      // حساب إجماليات الفاتورة - تصحيح للتأكد من وجود قيم
      const subtotal = data.products.reduce((sum, product) => sum + ((product.price || 0) * (product.quantity || 0)), 0);
      const itemsDiscount = data.products.reduce((sum, product) => sum + (product.discount || 0), 0);
      const invoiceDiscount = data.discount || 0;
      const total = subtotal - itemsDiscount - invoiceDiscount;

      // تحويل منتجات الفاتورة إلى JSON
      const productsData = JSON.stringify(data.products);

      // تحويل بيانات المنتجات إلى تنسيق الحقول المنفصلة
      const productIds = data.products.map(p => p.productId).join(',');
      const productNames = data.products.map(p => p.productName).join(',');
      const productQuantities = data.products.map(p => p.quantity).join(',');
      const productPrices = data.products.map(p => p.price || 0).join(',');
      const productPurchasePrices = data.products.map(p => p.purchasePrice || 0).join(',');
      const productDiscounts = data.products.map(p => p.discount || 0).join(',');
      const productTotals = data.products.map(p => p.total || 0).join(',');
      const productProfits = data.products.map(p => {
        const purchasePrice = p.purchasePrice || 0;
        const sellingPrice = p.price || 0;
        const discount = p.discount || 0;
        const quantity = p.quantity || 0;
        // حساب الربح = سعر البيع - سعر الشراء - الخصم
        return (sellingPrice * quantity) - (purchasePrice * quantity) - discount;
      }).join(',');

      // إعداد بيانات التحديث
      const invoiceData = {
        customerId: data.customerId,
        subtotal,
        discount: invoiceDiscount, // تحديث حقل الخصم أيضًا للمحافظة على التوافق مع كل أجزاء النظام
        itemsDiscount,
        invoiceDiscount, // استخدام قيمة الخصم المعدلة
        total,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        updatedAt: new Date().toISOString().replace('Z', ''),
        productsData,
        productIds,
        productNames,
        productQuantities,
        productPrices,
        productPurchasePrices,
        productDiscounts,
        productTotals,
        productProfits
      };

      console.log('Sending invoice data to server:', invoiceData);

      try {
        const res = await apiRequest('PUT', `/api/invoices/${invoiceId}`, invoiceData);
        const responseData = await res.json();
        console.log('Server response:', responseData);
        return responseData;
      } catch (error) {
        console.error('API request error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Invoice updated successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      setEditDialogOpen(false);
      setInvoiceToEdit(null);

      toast({
        title: t('success'),
        description: t('invoice_updated_successfully'),
      });
    },
    onError: (error) => {
      console.error('Error updating invoice:', error);
      toast({
        title: t('error'),
        description: t('error_updating_invoice'),
        variant: 'destructive',
      });
    }
  });

  // استعلام لجلب العملاء (للحصول على معلومات الاتصال)
  const { data: customers } = useQuery({
    queryKey: ['/api/customers'],
  });

  // استعلام لجلب المنتجات (للتعديل)
  const { data: products } = useQuery({
    queryKey: ['/api/products'],
  });

  // mutation للموافقة على الفاتورة الآجلة
  const approveInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return await apiRequest('POST', `/api/payment-approvals/approve/${invoiceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: t('success'),
        description: t('invoice_approved_successfully'),
      });
    },
    onError: (error) => {
      console.error('Error approving invoice:', error);
      toast({
        title: t('error'),
        description: t('error_approving_invoice'),
        variant: 'destructive',
      });
    }
  });

  // mutation لرفض الفاتورة الآجلة
  const rejectInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return await apiRequest('POST', `/api/payment-approvals/reject/${invoiceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: t('success'),
        description: t('invoice_rejected_successfully'),
      });
    },
    onError: (error) => {
      console.error('Error rejecting invoice:', error);
      toast({
        title: t('error'),
        description: t('error_rejecting_invoice'),
        variant: 'destructive',
      });
    }
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

  // الموافقة على الفاتورة الآجلة
  const approveInvoicePayment = async (invoiceId: number) => {
    try {
      await approveInvoiceMutation.mutateAsync(invoiceId);
      toast({
        title: t('success'),
        description: t('invoice_approved_successfully')
      });
    } catch (error) {
      console.error('Error approving invoice payment:', error);
      toast({
        title: t('error'),
        description: t('error_approving_invoice'),
        variant: 'destructive'
      });
    }
  };

  // رفض الفاتورة الآجلة
  const rejectInvoicePayment = async (invoiceId: number) => {
    try {
      await rejectInvoiceMutation.mutateAsync(invoiceId);
      toast({
        title: t('success'),
        description: t('invoice_rejected_successfully')
      });
    } catch (error) {
      console.error('Error rejecting invoice payment:', error);
      toast({
        title: t('error'),
        description: t('error_rejecting_invoice'),
        variant: 'destructive'
      });
    }
  };

  // تحويل بيانات المنتجات من نص JSON إلى مصفوفة
  const parseProducts = (invoice: Invoice): InvoiceProduct[] => {
    try {
      let products = [];

      // المحاولة الأولى: تحليل productsData كنص JSON
      if (typeof invoice.productsData === 'string') {
        products = JSON.parse(invoice.productsData);
      } 
      // المحاولة الثانية: استخدام productsData كمصفوفة مباشرة
      else if (Array.isArray(invoice.productsData)) {
        products = invoice.productsData;
      }
      // المحاولة الثالثة: إعادة بناء المصفوفة من الحقول المنفصلة
      else if (invoice.productIds && invoice.productNames && invoice.productQuantities) {
        const productIds = String(invoice.productIds).split(',');
        const productNames = String(invoice.productNames).split(',');
        const productQuantities = String(invoice.productQuantities).split(',').map(Number);
        const productPrices = String(invoice.productPrices || '').split(',').map(Number);
        const productPurchasePrices = String(invoice.productPurchasePrices || '').split(',').map(Number);
        const productDiscounts = String(invoice.productDiscounts || '').split(',').map(Number);
        const productTotals = String(invoice.productTotals || '').split(',').map(Number);

        // إنشاء مصفوفة من المنتجات باستخدام الحقول المنفصلة
        products = productIds.map((id, index) => ({
          productId: Number(id),
          productName: productNames[index] || '',
          quantity: productQuantities[index] || 0,
          price: productPrices[index] || 0,
          purchasePrice: productPurchasePrices[index] || 0,
          discount: productDiscounts[index] || 0,
          total: productTotals[index] || 0
        }));
      }

      // معالجة البيانات للتأكد من وجود حقل price
      return products.map(product => {
        // إذا كان هناك sellingPrice ولكن لا يوجد price، استخدم sellingPrice كـ price
        if (product.sellingPrice !== undefined && product.price === undefined) {
          return {
            ...product,
            price: product.sellingPrice
          };
        }
        // تأكد من أن price له قيمة افتراضية على الأقل
        if (product.price === undefined || product.price === null) {
          return {
            ...product,
            price: 0
          };
        }
        return product;
      });
    } catch (error) {
      console.error('Error parsing products data:', error);
      return [];
    }
  };

  // تنسيق التاريخ حسب اللغة
  const formatDate = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return '';

    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return String(dateStr);

      return format(date, 'PPpp', {
        locale: language === 'ar' ? ar : enUS,
      });
    } catch (err) {
      return String(dateStr);
    }
  };

  // العثور على معلومات العميل من رقم التعريف
  const getCustomerName = (customerId: number | null): string => {
    if (!customers || !customerId) return '';
    // تحويل customers إلى مصفوفة إذا لم يكن كذلك
    const customersArray = Array.isArray(customers) ? customers : [];
    const customer = customersArray.find((c: Customer) => c.id === customerId);
    return customer ? customer.name : '';
  };

  // الحصول على رقم هاتف العميل
  const getCustomerPhone = (customerId: number | null): string => {
    if (!customers || !customerId) return '';
    // تحويل customers إلى مصفوفة إذا لم يكن كذلك
    const customersArray = Array.isArray(customers) ? customers : [];
    const customer = customersArray.find((c: Customer) => c.id === customerId);
    return customer?.phone || '';
  };

  // ترتيب الفواتير حسب التاريخ
  const sortInvoices = (invoiceList: Invoice[]) => {
    if (!Array.isArray(invoiceList)) return [];

    return [...invoiceList].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date || 0).getTime();
      const dateB = new Date(b.createdAt || b.date || 0).getTime();

      return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
    });
  };

  // فلترة الفواتير بناءً على البحث ثم ترتيبها
  const filteredInvoices = invoices
    ? sortInvoices(
        (Array.isArray(invoices) ? invoices : []).filter((invoice: Invoice) => {
          if (!searchTerm) return true;

          const searchLower = searchTerm.toLowerCase();
          const invoiceNumber = String(invoice.invoiceNumber || '').toLowerCase();
          const customerName = getCustomerName(invoice.customerId).toLowerCase();
          const total = String(invoice.total || '').toLowerCase();
          const date = formatDate(invoice.createdAt || invoice.date).toLowerCase();

          return (
            invoiceNumber.includes(searchLower) ||
            customerName.includes(searchLower) ||
            total.includes(searchLower) ||
            date.includes(searchLower)
          );
        })
      )
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
      const customerId = selectedInvoice.customerId || 0;
      const customerPhone = getCustomerPhone(customerId);
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

      // حفظ الملف كبلوب
      const pdfBlob = pdf.output('blob');

      // إنشاء رابط لفتح WhatsApp
      const invoiceNumber = selectedInvoice.invoiceNumber || '';
      const whatsappMessage = `${t('invoice')} ${invoiceNumber}`;
      const whatsappUrl = `https://wa.me/${customerPhone}?text=${encodeURIComponent(whatsappMessage)}`;

      // فتح WhatsApp
      window.open(whatsappUrl, '_blank');

      // تنزيل الملف
      const link = document.createElement('a');
      link.href = URL.createObjectURL(pdfBlob);
      link.download = `${t('invoice')}_${invoiceNumber}.pdf`;
      link.click();

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

  // تغيير اتجاه الترتيب
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  // فتح صفحة تعديل الفاتورة
  const handleEditInvoice = (invoice: Invoice) => {
    setInvoiceToEdit(invoice);

    // تحميل منتجات الفاتورة
    const products = parseProducts(invoice);
    setEditedProducts(products);

    // تعيين بيانات الفاتورة الأخرى
    setEditedCustomerId(invoice.customerId);
    setEditedDiscount(invoice.invoiceDiscount || invoice.discount || 0);
    setEditedPaymentMethod(invoice.paymentMethod || 'cash');
    setEditedNotes(invoice.notes || '');

    // فتح مربع الحوار
    setEditDialogOpen(true);
  };

  // حفظ تعديلات الفاتورة
  const saveInvoiceChanges = () => {
    if (!invoiceToEdit) return;

    updateInvoiceMutation.mutate({
      invoiceId: invoiceToEdit.id,
      customerId: editedCustomerId,
      discount: editedDiscount,
      paymentMethod: editedPaymentMethod,
      notes: editedNotes,
      products: editedProducts
    });
  };

  // حفظ معلومات المتجر
  const saveStoreInfo = () => {
    storeInfoMutation.mutate({
      name: storeName,
      address: storeAddress,
      phone: storePhone
    });
  };

  // حساب إجمالي المنتج
  const calculateProductTotal = (product: InvoiceProduct): number => {
    const price = product.price || 0;
    const quantity = product.quantity || 0;
    const discount = product.discount || 0;
    return (price * quantity) - discount;
  };

  return (
    <div className="container p-4 mx-auto">
      <h1 className="text-xl sm:text-3xl font-bold tracking-tight shadow-sm sm:shadow-md bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-6">
        {t('invoices management')}
      </h1>


      {/* شريط الأدوات */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        {isAdmin && (
          <div>
            <Button 
              variant="outline"
              onClick={() => setStoreInfoDialogOpen(true)}
            >
              <Settings className="mr-2 h-4 w-4" />
              {t('store_settings')}
            </Button>
          </div>
        )}

        {/* شريط البحث وزر الترتيب */}
        <div className="flex items-center gap-2">
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

          {/* زر ترتيب الفواتير */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSortDirection}
            title={sortDirection === 'desc' ? t('sort_oldest_first') : t('sort_newest_first')}
            className="h-10 w-10 flex-shrink-0"
          >
            {sortDirection === 'desc' ? (
              <ArrowDownUp className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* جدول الفواتير */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-64 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">
                {searchTerm ? t('no_invoices_found') : t('no_invoices_yet')}
              </p>
              {searchTerm && (
                <Button 
                  variant="link" 
                  onClick={() => setSearchTerm('')}
                  className="mt-2"
                >
                  {t('clear_search')}
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">{t('invoice_number')}</TableHead>
                    <TableHead className="text-center">{t('date')}</TableHead>
                    <TableHead className="text-center">{t('customer')}</TableHead>
                    <TableHead className="text-center">{t('payment_method')}</TableHead>
                    <TableHead className="text-center">{t('payment_status')}</TableHead>
                    <TableHead className="text-center">{t('total')}</TableHead>
                    <TableHead className="text-center">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice: Invoice) => {
                    const customerName = getCustomerName(invoice.customerId);
                    const paymentMethod = invoice.paymentMethod || 'cash';
                    const paymentStatus = invoice.paymentStatus || (paymentMethod === 'deferred' ? 'deferred' : '');

                    // دالة مساعدة لعرض حالة الدفع بلون مميز
                    const renderPaymentStatus = () => {
                      if (paymentStatus === 'approved') {
                        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">{t('approved')}</span>;
                      } else if (paymentStatus === 'deferred' || paymentMethod === 'deferred') {
                        return <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-medium">{t('pending')}</span>;
                      } else if (paymentStatus === 'rejected') {
                        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">{t('rejected')}</span>;
                      } else {
                        return <span className="text-gray-500">-</span>;
                      }
                    };

                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="text-center font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell className="text-center">{formatDate(invoice.createdAt || invoice.date)}</TableCell>
                        <TableCell className="text-center">{customerName || t('unknown_customer')}</TableCell>
                        <TableCell className="text-center">{t(paymentMethod)}</TableCell>
                        <TableCell className="text-center">
                          {renderPaymentStatus()}
                          {/* أزرار الموافقة/الرفض للمدير فقط وللفواتير الآجلة المعلقة فقط */}
                          {isAdmin && (paymentMethod === 'deferred' && paymentStatus === 'deferred') && (
                            <div className="flex justify-center gap-1 mt-1">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 h-6 px-2 text-xs"
                                onClick={() => approveInvoicePayment(invoice.id)}
                              >
                                {t('approve')}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 h-6 px-2 text-xs"
                                onClick={() => rejectInvoicePayment(invoice.id)}
                              >
                                {t('reject')}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{(invoice.total || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => loadInvoiceDetails(invoice)}
                              title={t('view_details')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEditInvoice(invoice)}
                              title={t('edit_invoice')}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteInvoice(invoice)}
                              title={t('delete_invoice')}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* مربع حوار تفاصيل الفاتورة */}
      <Dialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('invoice_details')}</DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div id="invoice-preview" className="bg-white p-6 rounded-lg shadow">
              {/* بيانات المتجر */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-1">{storeInfo && typeof storeInfo === 'object' && 'name' in storeInfo ? (storeInfo as any).name : t('store_name')}</h2>
                <p className="text-muted-foreground">{storeInfo && typeof storeInfo === 'object' && 'address' in storeInfo ? (storeInfo as any).address : t('store_address')}</p>
                <p className="text-muted-foreground">{storeInfo && typeof storeInfo === 'object' && 'phone' in storeInfo ? (storeInfo as any).phone : t('store_phone')}</p>
              </div>

              {/* معلومات الفاتورة */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p><strong>{t('invoice_number')}:</strong> {selectedInvoice.invoiceNumber}</p>
                  <p><strong>{t('date')}:</strong> {formatDate(selectedInvoice.createdAt || selectedInvoice.date)}</p>
                </div>
                <div className="text-end">
                  <p><strong>{t('customer')}:</strong> {getCustomerName(selectedInvoice.customerId) || t('unknown_customer')}</p>
                  <p><strong>{t('payment_method')}:</strong> {t(selectedInvoice.paymentMethod || 'cash')}</p>
                </div>
              </div>

              {/* جدول المنتجات */}
              <div className="border rounded-lg overflow-hidden mb-6">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-start">{t('product')}</th>
                      <th className="px-4 py-2 text-center">{t('quantity')}</th>
                      <th className="px-4 py-2 text-center">{t('price')}</th>
                      <th className="px-4 py-2 text-center">{t('discount')}</th>
                      <th className="px-4 py-2 text-end">{t('total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parseProducts(selectedInvoice).map((product, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-start">{product.productName}</td>
                        <td className="px-4 py-2 text-center">{product.quantity}</td>
                        <td className="px-4 py-2 text-center">{(product.sellingPrice || product.price || 0).toLocaleString()}</td>
                        <td className="px-4 py-2 text-center">{(product.discount || 0).toLocaleString()}</td>
                        <td className="px-4 py-2 text-end">{(product.total || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* الإجماليات */}
              <div className="flex flex-col items-end space-y-1">
                <div className="flex justify-between w-64">
                  <span>{t('subtotal')}:</span>
                  <span>{(selectedInvoice.subtotal || 0).toLocaleString()}</span>
                </div>

                {(selectedInvoice.itemsDiscount || 0) > 0 && (
                  <div className="flex justify-between w-64 text-muted-foreground">
                    <span>{t('items_discount')}:</span>
                    <span>- {(selectedInvoice.itemsDiscount || 0).toLocaleString()}</span>
                  </div>
                )}

                {(selectedInvoice.invoiceDiscount || selectedInvoice.discount || 0) > 0 && (
                  <div className="flex justify-between w-64 text-muted-foreground">
                    <span>{t('invoice_discount')}:</span>
                    <span>- {(selectedInvoice.invoiceDiscount || selectedInvoice.discount || 0).toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between w-64 font-bold border-t pt-1 mt-1">
                  <span>{t('total')}:</span>
                  <span>{(selectedInvoice.total || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* ملاحظات */}
              {selectedInvoice.notes && (
                <div className="mt-6 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    <strong>{t('notes')}:</strong> {selectedInvoice.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* أزرار الإجراءات */}
          <div className="flex justify-between mt-4">
            <div>
              <Button 
                variant="outline" 
                onClick={() => setDetailsDialogOpen(false)}
              >
                {t('close')}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={printInvoice}
              >
                <Printer className="mr-2 h-4 w-4" />
                {t('print')}
              </Button>
              <Button 
                onClick={shareInvoicePDF}
              >
                <Share2 className="mr-2 h-4 w-4" />
                {t('share')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* مربع حوار تأكيد الحذف */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirm_delete_invoice_description')}
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

      {/* مربع حوار إعدادات المتجر */}
      <Dialog
        open={storeInfoDialogOpen}
        onOpenChange={setStoreInfoDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('store_settings')}</DialogTitle>
            <DialogDescription>
              {t('store_settings_description')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="store-name" className="text-sm font-medium">
                {t('store_name')}
              </label>
              <Input
                id="store-name"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder={t('enter_store_name')}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="store-address" className="text-sm font-medium">
                {t('store_address')}
              </label>
              <Input
                id="store-address"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder={t('enter_store_address')}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="store-phone" className="text-sm font-medium">
                {t('store_phone')}
              </label>
              <Input
                id="store-phone"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder={t('enter_store_phone')}
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
            <Button onClick={saveStoreInfo}>
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* مربع حوار تعديل الفاتورة */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('edit_invoice')}</DialogTitle>
            <DialogDescription>
              {t('edit_invoice_description')}
            </DialogDescription>
          </DialogHeader>

          {invoiceToEdit && (
            <div className="grid gap-4 py-4">
              {/* بيانات العميل والفاتورة */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">
                    {t('invoice_number')}
                  </label>
                  <Input
                    value={invoiceToEdit.invoiceNumber || ''}
                    readOnly
                    disabled
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">
                    {t('customer')}
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editedCustomerId || ''}
                    onChange={(e) => setEditedCustomerId(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">{t('select_customer')}</option>
                    {Array.isArray(customers) && customers.map((customer: Customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">
                    {t('discount')}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={editedDiscount}
                    onChange={(e) => setEditedDiscount(parseFloat(e.target.value) || 0)}
                    placeholder={t('enter_discount')}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">
                    {t('payment_method')}
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editedPaymentMethod}
                    onChange={(e) => setEditedPaymentMethod(e.target.value)}
                  >
                    <option value="cash">{t('cash')}</option>
                    <option value="card">{t('card')}</option>
                    <option value="deferred">{t('deferred')}</option>
                  </select>
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <label className="text-sm font-medium">
                    {t('notes')}
                  </label>
                  <Input
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    placeholder={t('enter_notes')}
                  />
                </div>
              </div>

              {/* جدول المنتجات */}
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-start">{t('product')}</th>
                      <th className="px-4 py-2 text-center">{t('quantity')}</th>
                      <th className="px-4 py-2 text-center">{t('price')}</th>
                      <th className="px-4 py-2 text-center">{t('discount')}</th>
                      <th className="px-4 py-2 text-end">{t('total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {editedProducts.map((product, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-start">{product.productName}</td>
                        <td className="px-4 py-2 text-center">
                          <Input
                            type="number"
                            min="1"
                            value={product.quantity}
                            onChange={(e) => {
                              const newProducts = [...editedProducts];
                              newProducts[index].quantity = parseInt(e.target.value) || 1;
                              newProducts[index].total = calculateProductTotal(newProducts[index]);
                              setEditedProducts(newProducts);
                            }}
                            className="max-w-[80px] mx-auto text-center"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">{(product.price || 0).toLocaleString()}</td>
                        <td className="px-4 py-2 text-center">
                          <Input
                            type="number"
                            min="0"
                            value={product.discount || 0}
                            onChange={(e) => {
                              const newProducts = [...editedProducts];
                              newProducts[index].discount = parseFloat(e.target.value) || 0;
                              newProducts[index].total = calculateProductTotal(newProducts[index]);
                              setEditedProducts(newProducts);
                            }}
                            className="max-w-[80px] mx-auto text-center"
                          />
                        </td>
                        <td className="px-4 py-2 text-end">{calculateProductTotal(product).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* الإجماليات */}
              <div className="flex flex-col items-end space-y-1">
                <div className="flex justify-between w-64">
                  <span>{t('subtotal')}:</span>
                  <span>
                    {editedProducts.reduce((sum, product) => sum + ((product.price || 0) * (product.quantity || 0)), 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between w-64 text-muted-foreground">
                  <span>{t('items_discount')}:</span>
                  <span>
                    - {editedProducts.reduce((sum, product) => sum + (product.discount || 0), 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between w-64 text-muted-foreground">
                  <span>{t('invoice_discount')}:</span>
                  <span>- {(editedDiscount || 0).toLocaleString()}</span>
                </div>

                <div className="flex justify-between w-64 font-bold border-t pt-1 mt-1">
                  <span>{t('total')}:</span>
                  <span>
                    {(
                      editedProducts.reduce((sum, product) => sum + ((product.price || 0) * (product.quantity || 0)), 0) - 
                      editedProducts.reduce((sum, product) => sum + (product.discount || 0), 0) - 
                      (editedDiscount || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditDialogOpen(false)}
            >
              {t('cancel')}
            </Button>
            <Button 
              onClick={saveInvoiceChanges}
              disabled={!invoiceToEdit || editedProducts.length === 0}
            >
              {t('save_changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
