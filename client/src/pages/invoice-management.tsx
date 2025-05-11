import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, Search, Pencil, Trash2, Printer, ExternalLink, Filter, CheckCircle, XCircle, Clock, 
  RefreshCw, ArrowUpDown, Download, ChevronRight, ChevronLeft, Loader2
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuthContext } from '@/context/auth-context';
import { useLocale } from '@/hooks/use-locale';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

// استيراد أنواع البيانات
import { Invoice, InvoiceItem, Customer, Product } from "@shared/schema";

// UI Components
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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

// بيانات احتياطية تستخدم فقط في حالة عدم وجود بيانات في قاعدة البيانات
const mockInvoices = [
  {
    id: 'INV-2025-1001',
    date: new Date(2025, 4, 10),
    customer: {
      id: '1',
      name: 'Ahmed Mohamed',
      phone: '+20 123 456 7890',
      address: '123 El-Nasr St., Cairo'
    },
    total: 159.99,
    status: 'completed',
    paymentMethod: 'cash',
    items: [
      {
        id: 'item-1',
        product: {
          id: 'prod-1',
          name: 'Samsung Galaxy S21',
          barcode: '8590123456789',
          code: 'SG-021',
          purchasePrice: 100,
          sellingPrice: 159.99
        },
        quantity: 1,
        price: 159.99,
        total: 159.99
      }
    ]
  },
  {
    id: 'INV-2025-1002',
    date: new Date(2025, 4, 9),
    customer: {
      id: '2',
      name: 'Fatima Ali',
      phone: '+20 111 222 3333',
      address: '45 El-Tahrir St., Alexandria'
    },
    total: 49.98,
    status: 'completed',
    paymentMethod: 'visa',
    items: [
      {
        id: 'item-2',
        product: {
          id: 'prod-2',
          name: 'Wireless Headphones',
          barcode: '7891234567890',
          code: 'WH-101',
          purchasePrice: 20,
          sellingPrice: 49.99
        },
        quantity: 1,
        price: 49.99,
        total: 49.99
      }
    ]
  },
  {
    id: 'INV-2025-1003',
    date: new Date(2025, 4, 8),
    customer: {
      id: '3',
      name: 'Youssef Hassan',
      phone: '+20 100 200 3000',
      address: '78 Al-Haram St., Giza'
    },
    total: 299.97,
    status: 'pending',
    paymentMethod: 'deferred',
    items: [
      {
        id: 'item-3',
        product: {
          id: 'prod-3',
          name: 'Laptop Backpack',
          barcode: '6789012345678',
          code: 'LB-201',
          purchasePrice: 60,
          sellingPrice: 99.99
        },
        quantity: 3,
        price: 99.99,
        total: 299.97
      }
    ]
  }
];

export default function InvoiceManagement() {
  const { t } = useTranslation();
  const { language } = useLocale();
  const { user } = useAuthContext();
  const { toast } = useToast();
  
  // استخدام useQuery لجلب البيانات من الخادم
  const { data: dbInvoices, isLoading: isLoadingInvoices, error: invoicesError } = useQuery({
    queryKey: ['/api/invoices'],
    staleTime: 30000,
  });
  
  // استعراض أي خطأ حدث أثناء جلب البيانات
  React.useEffect(() => {
    if (invoicesError) {
      toast({
        title: t('error'),
        description: t('invoices_fetch_error'),
        variant: 'destructive'
      });
    }
  }, [invoicesError, toast, t]);
  
  // استخدام useQuery لجلب بيانات العملاء وتحويلها إلى قائمة
  const { data: customersData } = useQuery({
    queryKey: ['/api/customers'],
    staleTime: 60000
  });
  
  // تحويل بيانات العملاء إلى قاموس للوصول السريع
  const customersMap = React.useMemo(() => {
    if (!customersData || !Array.isArray(customersData)) return {};
    return customersData.reduce((acc: Record<number, Customer>, customer: Customer) => {
      acc[customer.id] = customer;
      return acc;
    }, {});
  }, [customersData]);
  
  // معالجة وتحويل بيانات الفواتير القادمة من قاعدة البيانات
  const processedInvoices = React.useMemo(() => {
    // التأكد من أن كل من الفواتير والعملاء متاحان كمصفوفة
    const invoices = Array.isArray(dbInvoices) ? dbInvoices : [];
    const customers = Array.isArray(customersData) ? customersData : [];
    
    if (invoices.length === 0) {
      console.log('No invoices available from database');
      return []; // لا نستخدم بيانات مزيفة
    }
    
    if (customers.length === 0) {
      console.log('No customers data available');
      return [];
    }
    
    console.log('Processing invoices:', invoices); 
    console.log('Available customers:', customers);
    
    // تحويل بيانات العملاء إلى قاموس للوصول السريع
    const customersMap: Record<string, any> = {};
    customers.forEach((customer: any) => {
      if (customer && customer.id) {
        // تخزين العميل بمعرف رقمي ونصي للمطابقة المرنة
        const stringId = customer.id.toString();
        customersMap[stringId] = customer;
        customersMap[customer.id] = customer;
      }
    });
    
    console.log('Built customers map with keys:', Object.keys(customersMap)); 
    
    return invoices.map((invoice: any) => {
      if (!invoice) {
        console.warn('Found null invoice in data');
        return null;
      }
      
      // البحث عن بيانات العميل المرتبط بالفاتورة
      console.log('Processing invoice:', invoice);
      console.log('Invoice customer ID:', invoice.customerId, 'Type:', typeof invoice.customerId);
      
      // محاولة العثور على العميل بأكثر من طريقة
      let customer = null;
      const customerId = invoice.customerId;
      const customerIdStr = customerId?.toString();
      
      if (customerId && customersMap[customerId]) {
        customer = customersMap[customerId];
        console.log('Found customer for invoice by numeric ID:', customer);
      } else if (customerIdStr && customersMap[customerIdStr]) {
        customer = customersMap[customerIdStr];
        console.log('Found customer for invoice by string ID:', customer);
      } else {
        console.warn(`No customer found for ID: ${customerId} (${typeof customerId})`);
        // محاولة البحث في جميع العملاء
        if (customersData.length > 0) {
          console.log('Attempting to find customer in all data...');
          const possibleCustomer = customersData.find((c: any) => 
            c.id === customerId || c.id === parseInt(customerIdStr || '0')
          );
          if (possibleCustomer) {
            customer = possibleCustomer;
            console.log('Found customer through full search:', customer);
          }
        }
      }
      
      // استخدام معلومات العميل المحفوظة في الفاتورة نفسها إذا كانت متوفرة
      return {
        id: invoice.invoiceNumber || `INV-${invoice.id}`,
        dbId: invoice.id,
        date: new Date(invoice.date || Date.now()),
        customer: {
          id: customer?.id?.toString() || invoice.customerId?.toString() || 'unknown',
          // استخدام اسم العميل من الفاتورة إذا كان متوفرًا، وإلا استخدام اسم العميل من جدول العملاء
          name: invoice.customerName || (customer?.name || t('unknown_customer')),
          phone: invoice.customerPhone || (customer?.phone || ''),
          address: invoice.customerAddress || (customer?.address || '')
        },
        total: invoice.total || 0,
        status: invoice.paymentStatus || 'unknown',
        paymentMethod: invoice.paymentMethod || 'unknown',
        // سنقوم بجلب العناصر التفصيلية للفاتورة لاحقًا عند الطلب
        items: []
      };
    }).filter(Boolean); // إزالة القيم الفارغة
  }, [dbInvoices, customersData, t]);
  
  // استخدام البيانات المعالجة أو البيانات المزيفة في حالة عدم وجود بيانات
  const [invoices, setInvoices] = useState<any[]>([]);
  
  // تحديث حالة الفواتير عندما تتغير البيانات المعالجة
  useEffect(() => {
    if (processedInvoices && processedInvoices.length > 0) {
      setInvoices(processedInvoices);
    }
  }, [processedInvoices]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [invoicesPerPage] = useState(10);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [invoiceToDeleteDbId, setInvoiceToDeleteDbId] = useState<number | undefined>();
  // استخدام queryClient من ملف استيراد بدلا من useQueryClient
  
  // Filter invoices based on search term and filters
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer.phone.includes(searchTerm);
      
    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
    const matchesPayment = filterPayment === 'all' || invoice.paymentMethod === filterPayment;
    
    return matchesSearch && matchesStatus && matchesPayment;
  });
  
  // Pagination
  const indexOfLastInvoice = currentPage * invoicesPerPage;
  const indexOfFirstInvoice = indexOfLastInvoice - invoicesPerPage;
  const currentInvoices = filteredInvoices.slice(indexOfFirstInvoice, indexOfLastInvoice);
  const totalPages = Math.ceil(filteredInvoices.length / invoicesPerPage);
  
  const changePage = (page: number) => {
    setCurrentPage(page);
  };
  
  // Function to fetch invoice items
  const fetchInvoiceItems = async (invoiceId: number) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/items`);
      if (!response.ok) {
        throw new Error('Failed to fetch invoice items');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching invoice items:', error);
      toast({
        title: t('error'),
        description: t('invoice_items_fetch_error'),
        variant: 'destructive',
      });
      return [];
    }
  };

  // Open invoice details dialog with items
  const openInvoiceDetails = async (invoice: any) => {
    console.log('Opening invoice details:', invoice);
    
    // First set invoice with empty items to show loading state
    setSelectedInvoice({
      ...invoice,
      items: [],
      isLoadingItems: true
    });
    
    try {
      // Fetch items for this invoice
      console.log('Fetching items for invoice ID:', invoice.dbId);
      const items = await fetchInvoiceItems(invoice.dbId);
      console.log('Fetched items:', items);
      
      if (!items || !Array.isArray(items)) {
        console.error('Invalid items data received:', items);
        throw new Error('Invalid items data');
      }
      
      // Format items for display - with improved product details handling
      const formattedItems = items.map((item: any) => {
        if (!item) {
          console.warn('Null or undefined item in results');
          return null;
        }
        
        console.log('Processing item with product:', item);
        
        // إضافة المزيد من سجلات التشخيص لفهم البيانات الواردة
        console.log('Item product ID:', item.productId);
        console.log('Item product object:', item.product);
        
        // التحقق من وجود تفاصيل المنتج
        if (!item.product) {
          console.warn('No product details found for item:', item);
        }
        
        // استخدام تفاصيل المنتج المعززة من الخادم بطريقة أكثر قوة
        const productName = item.product?.name || `منتج رقم ${item.productId}`;
        const productCode = item.product?.barcode || '';
        const productPrice = item.price || item.product?.sellingPrice || 0;
        
        console.log('Enhanced product info:', {
          name: productName,
          code: productCode,
          price: productPrice,
          quantity: item.quantity
        });
        
        return {
          id: `item-${item.id}`,
          product: {
            id: item.productId,
            name: productName,
            code: productCode,
            price: productPrice
          },
          quantity: item.quantity,
          price: productPrice,
          total: item.total || (item.quantity * productPrice)
        };
      }).filter(Boolean); // Remove any null items
      
      console.log('Formatted items for display:', formattedItems);
      
      // Update selectedInvoice with items
      setSelectedInvoice({
        ...invoice,
        items: formattedItems,
        isLoadingItems: false
      });
    } catch (error) {
      console.error('Error loading invoice details:', error);
      setSelectedInvoice({
        ...invoice,
        items: [],
        isLoadingItems: false,
        loadError: true
      });
    }
  };
  
  // Handle printing invoice
  const handlePrintInvoice = (invoice: any) => {
    // In a real app, this would generate a printable invoice
    console.log('Printing invoice:', invoice.id);
    toast({
      title: t('print_started'),
      description: t('invoice_sent_to_printer'),
    });
  };
  
  // تنفيذ تعديل الفاتورة
  const handleEditInvoice = async (invoice: any) => {
    console.log('Editing invoice:', invoice);
    
    // 1. أولاً - جلب تفاصيل الفاتورة كاملة بما في ذلك العناصر إذا لم تكن متوفرة
    let invoiceWithItems = invoice;
    
    try {
      // جلب تفاصيل الفاتورة من الخادم للتأكد من أحدث البيانات
      console.log('Fetching latest invoice data for ID:', invoice.id);
      const response = await fetch(`/api/invoices/${invoice.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoice data');
      }
      
      const latestInvoiceData = await response.json();
      console.log('Latest invoice data:', latestInvoiceData);
      
      // جلب عناصر الفاتورة
      console.log('Fetching invoice items for edit');
      const items = await fetchInvoiceItems(invoice.id);
      
      if (items && Array.isArray(items)) {
        invoiceWithItems = {
          ...latestInvoiceData,
          items: items
        };
      } else {
        invoiceWithItems = latestInvoiceData;
      }
      
      console.log('Prepared invoice with items for edit:', invoiceWithItems);
      
      // 2. إرسال طلب تحديث الفاتورة إلى الخادم
      const updateData = {
        invoiceNumber: invoiceWithItems.invoiceNumber,
        customerId: invoiceWithItems.customerId,
        customerDetails: {
          name: invoiceWithItems.customerName || '',
          phone: invoiceWithItems.customerPhone || '',
          address: invoiceWithItems.customerAddress || ''
        },
        subtotal: invoiceWithItems.subtotal,
        discount: invoiceWithItems.discount || 0,
        total: invoiceWithItems.total,
        paymentMethod: invoiceWithItems.paymentMethod,
        paymentStatus: invoiceWithItems.paymentStatus,
        notes: invoiceWithItems.notes || '',
        products: invoiceWithItems.items.map((item: any) => ({
          productId: item.productId,
          productName: item.product?.name || 'Unknown product',
          quantity: item.quantity,
          price: item.price,
          discount: item.discount || 0,
          total: item.total
        }))
      };
      
      console.log('Preparing to send update request with data:', updateData);
      
      // في تطبيق حقيقي، سنرسل هذه البيانات إلى الخادم
      // كمثال، سنظهر رسالة نجاح فقط للآن
      
      // TODO: إرسال طلب PUT لتحديث الفاتورة
      // const updateResponse = await fetch(`/api/invoices/${invoice.id}`, {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(updateData)
      // });
      
      // if (!updateResponse.ok) {
      //   throw new Error('Failed to update invoice');
      // }
      
      // const updatedInvoice = await updateResponse.json();
      // console.log('Updated invoice:', updatedInvoice);
      
      // تحديث البيانات المحلية والكاش
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      
      // عرض نافذة معاينة الفاتورة (يمكن استبدالها بنافذة تعديل)
      setSelectedInvoice(invoiceWithItems);
      setIsDetailsModalOpen(true);
      
      toast({
        title: t('edit_invoice'),
        description: t('edit_invoice_prepare_success'),
      });
    } catch (error) {
      console.error('Error preparing invoice for edit:', error);
      toast({
        title: t('error'),
        description: typeof error === 'string' ? error : t('invoice_edit_error'),
        variant: 'destructive',
      });
    }
  };
  
  // تأكيد حذف الفاتورة
  const confirmDeleteInvoice = (invoiceId: string, dbId?: number) => {
    console.log('Opening delete confirmation dialog for invoice:', invoiceId, 'with DB ID:', dbId);
    setInvoiceToDelete(invoiceId);
    setInvoiceToDeleteDbId(dbId);
    setIsDeleteDialogOpen(true);
  };
  
  // تنفيذ حذف الفاتورة
  const deleteInvoice = async () => {
    if (invoiceToDelete) {
      try {
        console.log('Deleting invoice:', invoiceToDelete, 'with DB ID:', invoiceToDeleteDbId);
        
        // إرسال طلب إلى API لحذف الفاتورة من قاعدة البيانات
        // يمكن استخدام معرف الفاتورة الأساسي أو معرف قاعدة البيانات
        const idToUse = invoiceToDeleteDbId || invoiceToDelete;
        console.log('Using ID for deletion:', idToUse);
        
        const response = await fetch(`/api/invoices/${idToUse}`, {
          method: 'DELETE',
        });
        
        console.log('Delete response status:', response.status);
        
        if (!response.ok) {
          let errorMessage = t('failed_to_delete_invoice');
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // إذا لم نتمكن من قراءة رسالة الخطأ، نستخدم الرسالة الافتراضية
          }
          throw new Error(errorMessage);
        }
        
        // محاولة الحصول على جميع الفواتير المحدّثة من الخادم
        try {
          const freshInvoices = await fetch('/api/invoices').then(res => res.json());
          
          // تحديث القائمة المحلية بالبيانات الجديدة (الفواتير التي ليست محذوفة)
          const nonDeletedInvoices = freshInvoices.filter((inv: any) => !inv.isDeleted);
          
          console.log('Refreshed invoices from server:', nonDeletedInvoices.length);
          setInvoices(nonDeletedInvoices);
        } catch (refreshError) {
          console.error('Error refreshing invoices:', refreshError);
          
          // تحديث الواجهة وإزالة الفاتورة من القائمة المحلية كخطة بديلة
          const updatedInvoices = invoices.filter(inv => inv.id !== invoiceToDelete);
          console.log('Fallback: Updating local invoices list, removing:', invoiceToDelete);
          console.log('Invoices before:', invoices.length, 'After:', updatedInvoices.length);
          
          setInvoices(updatedInvoices);
        }
        
        // إغلاق مربع الحوار وإعادة تعيين الحالة
        setIsDeleteDialogOpen(false);
        setInvoiceToDelete(null);
        setInvoiceToDeleteDbId(undefined);
        
        // إعادة تحميل البيانات من قاعدة البيانات عن طريق إلغاء صلاحية ذاكرة التخزين المؤقت
        console.log('Invalidating invoices query cache to refresh data');
        queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
        
        // إظهار رسالة نجاح للمستخدم
        toast({
          title: t('invoice_deleted'),
          description: t('invoice_deleted_successfully'),
        });
      } catch (error) {
        console.error('Error deleting invoice:', error);
        // إظهار رسالة خطأ للمستخدم
        toast({
          variant: 'destructive',
          title: t('error'),
          description: error instanceof Error ? error.message : t('failed_to_delete_invoice'),
        });
      }
    }
  };
  
  // Format status badge
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{t('completed')}</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{t('pending')}</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{t('cancelled')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Format payment method badge
  const getPaymentBadge = (method: string) => {
    switch(method) {
      case 'cash':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{t('cash')}</Badge>;
      case 'visa':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{t('visa')}</Badge>;
      case 'deferred':
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">{t('deferred')}</Badge>;
      case 'ewallet':
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">{t('e_wallet')}</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  const renderInvoiceDetails = () => {
    if (!selectedInvoice) return null;
    
    return (
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <FileText className="mr-2 h-5 w-5" />
              {t('invoice_details')}
            </DialogTitle>
            <DialogDescription>
              {selectedInvoice.id} - {formatDate(selectedInvoice.date, 'PPP', language)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="text-sm font-medium text-neutral-500">{t('customer_details')}</h4>
              <p className="text-base font-medium">{selectedInvoice.customer.name}</p>
              <p className="text-sm">{selectedInvoice.customer.phone}</p>
              <p className="text-sm">{selectedInvoice.customer.address}</p>
            </div>
            <div className="text-right">
              <h4 className="text-sm font-medium text-neutral-500">{t('invoice_info')}</h4>
              <p className="text-base font-medium">{t('status')}: {getStatusBadge(selectedInvoice.status)}</p>
              <p className="text-sm">{t('payment_method')}: {getPaymentBadge(selectedInvoice.paymentMethod)}</p>
              <p className="text-sm">{t('total')}: {formatCurrency(selectedInvoice.total)}</p>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div>
            <h4 className="text-sm font-medium mb-2">{t('invoice_items')}</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('product_name')}</TableHead>
                  <TableHead className="text-center">{t('quantity')}</TableHead>
                  <TableHead className="text-right">{t('price')}</TableHead>
                  <TableHead className="text-right">{t('total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedInvoice.isLoadingItems ? (
                  // Loading state
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                        <p>{t('loading_invoice_items')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : selectedInvoice.loadError ? (
                  // Error state
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-destructive">
                      <p>{t('invoice_items_load_error')}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => openInvoiceDetails(selectedInvoice)}
                        className="mt-2"
                      >
                        {t('retry')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : selectedInvoice.items.length === 0 ? (
                  // Empty state
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      <p>{t('no_invoice_items')}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  // Items list
                  selectedInvoice.items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-xs text-neutral-500">{item.product.code}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <Separator className="my-4" />
          
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm">{t('subtotal')}: {formatCurrency(selectedInvoice.total)}</p>
              <p className="text-sm">{t('discount')}: {formatCurrency(0)}</p>
              <p className="text-base font-bold mt-2">{t('total')}: {formatCurrency(selectedInvoice.total)}</p>
            </div>
            <div className="space-x-2">
              <Button variant="outline" size="sm" className="flex items-center">
                <Printer className="mr-1 h-4 w-4" /> {t('print')}
              </Button>
              <Button variant="outline" size="sm" className="flex items-center">
                <Download className="mr-1 h-4 w-4" /> {t('export')}
              </Button>
              {user?.role === 'admin' && selectedInvoice.status !== 'cancelled' && (
                <Button variant="outline" size="sm" className="flex items-center text-red-600 hover:text-red-700 hover:bg-red-50">
                  <XCircle className="mr-1 h-4 w-4" /> {t('cancel_invoice')}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };
  
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">{t('invoice_management')}</CardTitle>
              <CardDescription>{t('view_edit_manage_invoices')}</CardDescription>
            </div>
            <div className="mt-4 md:mt-0">
              <Button variant="outline" className="flex items-center">
                <Download className="mr-1 h-4 w-4" /> {t('export_all')}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('search_invoices')}
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <div className="w-40">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('filter_by_status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_statuses')}</SelectItem>
                    <SelectItem value="completed">{t('completed')}</SelectItem>
                    <SelectItem value="pending">{t('pending')}</SelectItem>
                    <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Select value={filterPayment} onValueChange={setFilterPayment}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('filter_by_payment')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_payment_methods')}</SelectItem>
                    <SelectItem value="cash">{t('cash')}</SelectItem>
                    <SelectItem value="visa">{t('visa')}</SelectItem>
                    <SelectItem value="deferred">{t('deferred')}</SelectItem>
                    <SelectItem value="ewallet">{t('e_wallet')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="icon" onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
                setFilterPayment('all');
              }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold text-primary-800 dark:text-primary-100 py-4">{t('invoice_number')}</TableHead>
                  <TableHead className="font-semibold text-primary-800 dark:text-primary-100">{t('date')}</TableHead>
                  <TableHead className="font-semibold text-primary-800 dark:text-primary-100">{t('customer')}</TableHead>
                  <TableHead className="font-semibold text-primary-800 dark:text-primary-100">{t('status')}</TableHead>
                  <TableHead className="font-semibold text-primary-800 dark:text-primary-100">{t('payment_method')}</TableHead>
                  <TableHead className="font-semibold text-primary-800 dark:text-primary-100 text-right">{t('total')}</TableHead>
                  <TableHead className="font-semibold text-primary-800 dark:text-primary-100 text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentInvoices.length > 0 ? (
                  currentInvoices.map((invoice, index) => (
                    <TableRow 
                      key={invoice.id} 
                      className={`cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-muted/20 dark:bg-gray-900'} hover:bg-primary-50 dark:hover:bg-primary-900/20`}
                      onClick={() => openInvoiceDetails(invoice)}
                    >
                      <TableCell className="font-medium text-primary/90">{invoice.id}</TableCell>
                      <TableCell>{formatDate(invoice.date, 'PP', language)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            {invoice.customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{invoice.customer.name}</p>
                            <p className="text-xs text-muted-foreground">{invoice.customer.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>{getPaymentBadge(invoice.paymentMethod)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(invoice.total)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="hover:bg-primary-50 focus-visible:ring-primary">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 shadow-lg">
                              <DropdownMenuLabel className="text-primary font-semibold">{t('invoice_actions')}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="focus:bg-primary-50 focus:text-primary-600" onClick={() => openInvoiceDetails(invoice)}>
                                <ExternalLink className="mr-2 h-4 w-4" /> {t('view_details')}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="focus:bg-primary-50 focus:text-primary-600" onClick={() => handlePrintInvoice(invoice)}>
                                <Printer className="mr-2 h-4 w-4" /> {t('print_invoice')}
                              </DropdownMenuItem>
                              {user?.role === 'admin' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="focus:bg-primary-50 focus:text-primary-600" onClick={() => handleEditInvoice(invoice)}>
                                    <Pencil className="mr-2 h-4 w-4" /> {t('edit_invoice')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 focus:bg-red-50"
                                    onClick={() => confirmDeleteInvoice(invoice.id, invoice.dbId)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> {t('delete_invoice')}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <div className="flex flex-col items-center">
                        <FileText className="h-12 w-12 text-muted-foreground mb-3 opacity-20" />
                        <p className="text-muted-foreground font-medium text-base">{t('no_invoices_found')}</p>
                        <p className="text-muted-foreground text-sm mt-1">{t('try_different_filters')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {filteredInvoices.length > invoicesPerPage && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6 gap-4">
              <p className="text-sm text-muted-foreground">
                {t('showing')} <span className="font-medium text-foreground">{indexOfFirstInvoice + 1}-{Math.min(indexOfLastInvoice, filteredInvoices.length)}</span> {t('of')} <span className="font-medium text-foreground">{filteredInvoices.length}</span> {t('invoices')}
              </p>
              <div className="flex space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-primary-50 focus-visible:ring-primary"
                  onClick={() => changePage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {/* Dynamic page numbers with ellipsis */}
                {Array.from({ length: totalPages }, (_, i) => {
                  const pageNumber = i + 1;
                  
                  // Always show first, last, and pages around current page
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                  ) {
                    return (
                      <Button
                        key={i}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        className={`h-8 w-8 p-0 ${currentPage === pageNumber ? 'bg-primary hover:bg-primary' : 'hover:bg-primary-50 focus-visible:ring-primary'}`}
                        onClick={() => changePage(pageNumber)}
                      >
                        {pageNumber}
                      </Button>
                    );
                  }
                  
                  // Show ellipsis for breaks in sequence
                  if (
                    pageNumber === 2 ||
                    pageNumber === totalPages - 1
                  ) {
                    return (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 cursor-default hover:bg-background"
                        disabled
                      >
                        ...
                      </Button>
                    );
                  }
                  
                  // Hide other pages
                  return null;
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-primary-50 focus-visible:ring-primary"
                  onClick={() => changePage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Render invoice details dialog */}
      {renderInvoiceDetails()}
      
      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirm_delete')}</DialogTitle>
            <DialogDescription>
              {t('delete_invoice_confirmation')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={deleteInvoice}>
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}