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
const fallbackInvoices = [
  {
    id: 'INV-2025-1001',
    date: new Date(2025, 4, 10),
    customer: {
      id: '1',
      name: 'أحمد محمد',
      phone: '+20 123 456 7890',
      address: '123 شارع النصر، القاهرة'
    },
    total: 159.99,
    status: 'completed',
    paymentMethod: 'cash',
    items: [
      {
        id: 'item-1',
        product: {
          id: 'prod-1',
          name: 'سامسونج جالاكسي اس 21',
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
      name: 'فاطمة علي',
      phone: '+20 111 222 3333',
      address: '45 شارع التحرير، الإسكندرية'
    },
    total: 49.98,
    status: 'completed',
    paymentMethod: 'visa',
    items: [
      {
        id: 'item-2',
        product: {
          id: 'prod-2',
          name: 'سماعات لاسلكية',
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
  }
];

export default function InvoiceManagementDB() {
  const { t } = useTranslation();
  const { language } = useLocale();
  const { user } = useAuthContext();
  const { toast } = useToast();
  
  // استخدام useQuery لجلب البيانات من الخادم
  const { data: dbInvoices = [], isLoading: isLoadingInvoices } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
    staleTime: 30000
  });
  
  // استخدام useQuery لجلب بيانات العملاء وتحويلها إلى قائمة
  const { data: customersData = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    staleTime: 60000
  });
  
  // استخدام useQuery لجلب بيانات المنتجات
  const { data: productsData = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    staleTime: 60000
  });
  
  // تحويل بيانات العملاء إلى قاموس للوصول السريع
  const customersMap = React.useMemo(() => {
    if (!customersData || !customersData.length) return {};
    return customersData.reduce<Record<number, Customer>>((acc, customer) => {
      if (customer && customer.id) {
        acc[customer.id] = customer;
      }
      return acc;
    }, {});
  }, [customersData]);
  
  // تحويل بيانات المنتجات إلى قاموس للوصول السريع
  const productsMap = React.useMemo(() => {
    if (!productsData || !productsData.length) return {};
    return productsData.reduce<Record<number, Product>>((acc, product) => {
      if (product && product.id) {
        acc[product.id] = product;
      }
      return acc;
    }, {});
  }, [productsData]);
  
  // معالجة وتحويل بيانات الفواتير القادمة من قاعدة البيانات
  const processedInvoices = React.useMemo(() => {
    if (!dbInvoices || dbInvoices.length === 0) {
      return []; // لن نعرض فواتير مزيفة، فقط الفواتير الحقيقية من قاعدة البيانات
    }
    
    return dbInvoices.map((invoice: Invoice) => {
      // البحث عن بيانات العميل المرتبط بالفاتورة
      const customer = invoice.customerId ? customersMap[invoice.customerId] : null;
      
      return {
        id: invoice.invoiceNumber,
        dbId: invoice.id,
        date: invoice.date ? new Date(invoice.date) : new Date(),
        customer: customer ? {
          id: customer.id.toString(),
          name: customer.name,
          phone: customer.phone || '',
          address: customer.address || ''
        } : {
          id: 'unknown',
          name: t('unknown_customer'),
          phone: '',
          address: ''
        },
        total: invoice.total,
        status: invoice.paymentStatus,
        paymentMethod: invoice.paymentMethod,
        // سنقوم بجلب العناصر التفصيلية للفاتورة لاحقًا عند الطلب
        items: []
      };
    });
  }, [dbInvoices, customersMap, t]);
  
  // استخدام البيانات المعالجة أو البيانات الافتراضية في حالة عدم وجود بيانات
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
  const [invoiceToDelete, setInvoiceToDelete] = useState<number | string | null>(null);
  
  // تصفية الفواتير بناءً على مصطلح البحث والمرشحات
  const filteredInvoices = invoices.filter(invoice => {
    let matchesSearch = true;
    let matchesStatus = true;
    let matchesPayment = true;
    
    // تطبيق مرشح مصطلح البحث
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      matchesSearch = 
        invoice.id.toLowerCase().includes(searchLower) ||
        invoice.customer.name.toLowerCase().includes(searchLower) ||
        (invoice.customer.phone && invoice.customer.phone.toLowerCase().includes(searchLower));
    }
    
    // تطبيق مرشح الحالة
    if (filterStatus !== 'all') {
      matchesStatus = invoice.status === filterStatus;
    }
    
    // تطبيق مرشح طريقة الدفع
    if (filterPayment !== 'all') {
      matchesPayment = invoice.paymentMethod === filterPayment;
    }
    
    return matchesSearch && matchesStatus && matchesPayment;
  });
  
  // ترقيم الصفحات
  const indexOfLastInvoice = currentPage * invoicesPerPage;
  const indexOfFirstInvoice = indexOfLastInvoice - invoicesPerPage;
  const currentInvoices = filteredInvoices.slice(indexOfFirstInvoice, indexOfLastInvoice);
  const totalPages = Math.ceil(filteredInvoices.length / invoicesPerPage);
  
  const changePage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };
  
  // استدعاء لجلب تفاصيل الفاتورة
  const fetchInvoiceDetails = async (invoiceId: number) => {
    try {
      const res = await apiRequest('GET', `/api/invoices/${invoiceId}/items`);
      const items = await res.json();
      return items;
    } catch (error) {
      console.error('Error fetching invoice items:', error);
      toast({
        title: t('error'),
        description: t('invoice_items_fetch_error'),
        variant: 'destructive'
      });
      return [];
    }
  };
  
  // Function to view an invoice
  const viewInvoice = async (invoice: any) => {
    // في حالة الفواتير المخزنة بالفعل في قاعدة البيانات
    if (invoice.dbId) {
      try {
        // جلب عناصر الفاتورة من قاعدة البيانات
        const items = await fetchInvoiceDetails(invoice.dbId);
        
        // إذا استطعنا جلب العناصر، نعد تنسيقها للعرض
        if (items && items.length > 0) {
          const formattedItems = items.map((item: InvoiceItem) => {
            // استرجاع بيانات المنتج من قاموس المنتجات
            const product = productsMap[item.productId];
            
            return {
              id: `item-${item.id}`,
              product: {
                id: `prod-${item.productId}`,
                name: product ? product.name : t('unknown_product'),
                barcode: product ? product.barcode : '000000',
                price: item.price
              },
              quantity: item.quantity,
              price: item.price,
              subtotal: item.price * item.quantity
            };
          });
          
          setSelectedInvoice({
            ...invoice,
            items: formattedItems
          });
        } else {
          // إذا لم نستطع جلب العناصر، نظهر الفاتورة بدون عناصر
          setSelectedInvoice({
            ...invoice,
            items: []
          });
        }
      } catch (error) {
        console.error('Error in viewInvoice:', error);
        setSelectedInvoice(invoice);
      }
    } else {
      // الفواتير الافتراضية
      setSelectedInvoice(invoice);
    }
  };
  
  // وظيفة تعديل الفاتورة
  const handleEditInvoice = async (invoice: any) => {
    console.log('Editing invoice:', invoice);
    
    // 1. أولاً - جلب تفاصيل الفاتورة كاملة بما في ذلك العناصر إذا لم تكن متوفرة
    let invoiceWithItems = invoice;
    
    try {
      // جلب تفاصيل الفاتورة من الخادم للتأكد من أحدث البيانات
      console.log('Fetching latest invoice data for ID:', invoice.dbId);
      const response = await fetch(`/api/invoices/${invoice.dbId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoice data');
      }
      
      const latestInvoiceData = await response.json();
      console.log('Latest invoice data:', latestInvoiceData);
      
      // جلب عناصر الفاتورة من API
      console.log('Fetching invoice items for edit');
      const itemsResponse = await fetch(`/api/invoices/${invoice.dbId}/items`);
      
      if (!itemsResponse.ok) {
        throw new Error('Failed to fetch invoice items');
      }
      
      const items = await itemsResponse.json();
      console.log('Invoice items loaded:', items);
      
      if (items && Array.isArray(items)) {
        invoiceWithItems = {
          ...latestInvoiceData,
          items: items
        };
      } else {
        invoiceWithItems = latestInvoiceData;
      }
      
      console.log('Prepared invoice with items for edit:', invoiceWithItems);
      
      // 2. التحضير للتعديل - نقوم بإرسال بيانات الفاتورة إلى مكون إنشاء الفاتورة
      // (سيتم تنفيذ هذا لاحقًا)
      toast({
        title: t('edit_invoice'),
        description: t('feature_coming_soon'),
      });
      
      // 3. إعداد بيانات التحديث
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
      
      console.log('Edit data prepared:', updateData);
      
    } catch (error) {
      console.error('Error preparing invoice for edit:', error);
      toast({
        title: t('error'),
        description: t('invoice_edit_prepare_error'),
        variant: 'destructive'
      });
    }
  };
  
  // إضافة mutation لحذف الفاتورة
  const deleteMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      await apiRequest('DELETE', `/api/invoices/${invoiceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setIsDeleteDialogOpen(false);
      setInvoiceToDelete(null);
      toast({
        title: t('success'),
        description: t('invoice_deleted_successfully'),
      });
    },
    onError: (error) => {
      console.error('Delete invoice error:', error);
      toast({
        title: t('error'),
        description: t('invoice_delete_error'),
        variant: 'destructive'
      });
    }
  });
  
  const handlePrintInvoice = () => {
    window.print();
  };
  
  const confirmDeleteInvoice = (invoice: any) => {
    console.log('Confirming deletion of invoice:', invoice);
    // استخدام معرف قاعدة البيانات الفعلي (dbId)
    setInvoiceToDelete(invoice.dbId);
    console.log('Setting invoice ID to delete:', invoice.dbId);
    setIsDeleteDialogOpen(true);
  };
  
  const deleteInvoice = () => {
    if (!invoiceToDelete) return;
    
    console.log('Attempting to delete invoice with ID:', invoiceToDelete);
    
    // تأكد من أن المعرف عدد صحيح
    if (invoiceToDelete) {
      const numericId = Number(invoiceToDelete);
      console.log('Converting to numeric ID:', numericId);
      if (!isNaN(numericId)) {
        // جميع الفواتير الآن مخزنة في قاعدة البيانات
        deleteMutation.mutate(numericId);
      } else {
        console.error('Invalid invoice ID:', invoiceToDelete);
        toast({
          title: t('error'),
          description: t('invoice_invalid_id'),
          variant: 'destructive'
        });
      }
    }
  };
  
  // Function to get status badge color and text
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">{t('completed')}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">{t('pending')}</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">{t('cancelled')}</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };
  
  // Function to get payment method badge
  const getPaymentBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">{t('cash')}</Badge>;
      case 'visa':
        return <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200">{t('visa')}</Badge>;
      case 'mastercard':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">{t('mastercard')}</Badge>;
      case 'deferred':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">{t('deferred')}</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{method}</Badge>;
    }
  };
  
  // Function to render invoice details dialog
  const renderInvoiceDetails = () => {
    if (!selectedInvoice) return null;
    
    return (
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex justify-between items-center">
              <span>{t('invoice_details')}</span>
              <span className="text-primary">
                {selectedInvoice.id} - {formatDate(selectedInvoice.date, 'PPP', language)}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">{t('customer_info')}</h3>
              <p className="text-base font-medium">{selectedInvoice.customer.name}</p>
              <p className="text-sm">{selectedInvoice.customer.phone}</p>
              <p className="text-sm">{selectedInvoice.customer.address}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">{t('invoice_info')}</h3>
              <p className="text-base font-medium">{t('status')}: {getStatusBadge(selectedInvoice.status)}</p>
              <p className="text-sm">{t('payment_method')}: {getPaymentBadge(selectedInvoice.paymentMethod)}</p>
              <p className="text-sm">{t('total')}: {formatCurrency(selectedInvoice.total)}</p>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div>
            <h3 className="text-lg font-semibold mb-3">{t('invoice_items')}</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('product')}</TableHead>
                    <TableHead className="text-right">{t('price')}</TableHead>
                    <TableHead className="text-right">{t('quantity')}</TableHead>
                    <TableHead className="text-right">{t('subtotal')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                    selectedInvoice.items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {t('barcode')}: {item.product.barcode}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.price)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.subtotal || (item.price * item.quantity))}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        {t('no_items_found')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 text-right">
              <p className="text-sm">{t('subtotal')}: {formatCurrency(selectedInvoice.total)}</p>
              {/* يمكن إضافة الضرائب والخصومات هنا إذا كانت متاحة */}
              <p className="text-base font-bold mt-2">{t('total')}: {formatCurrency(selectedInvoice.total)}</p>
            </div>
          </div>
          
          <DialogFooter className="mt-6 flex justify-between">
            <div>
              {user?.role === 'admin' && selectedInvoice.status !== 'cancelled' && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="mr-2"
                  onClick={() => {
                    setSelectedInvoice(null);
                    confirmDeleteInvoice(selectedInvoice);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t('delete')}
                </Button>
              )}
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                className="mr-2"
                onClick={handlePrintInvoice}
              >
                <Printer className="h-4 w-4 mr-1" />
                {t('print')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedInvoice(null)}
              >
                {t('close')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  // عرض تنبيه التحميل
  if (isLoadingInvoices) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">{t('loading_invoices')}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">{t('invoice_management')}</CardTitle>
              <CardDescription>
                {t('manage_invoices_description')}
              </CardDescription>
            </div>
            <Button 
              variant="default" 
              className="h-9"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* بحث ومرشحات */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative w-full md:w-2/3">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('search_invoices')}
                className="w-full pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-1/3">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <Filter className="mr-2 h-4 w-4" />
                  <span>{t('status')}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_statuses')}</SelectItem>
                  <SelectItem value="completed">{t('completed')}</SelectItem>
                  <SelectItem value="pending">{t('pending')}</SelectItem>
                  <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterPayment} onValueChange={setFilterPayment}>
                <SelectTrigger>
                  <Filter className="mr-2 h-4 w-4" />
                  <span>{t('payment')}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_methods')}</SelectItem>
                  <SelectItem value="cash">{t('cash')}</SelectItem>
                  <SelectItem value="visa">{t('visa')}</SelectItem>
                  <SelectItem value="mastercard">{t('mastercard')}</SelectItem>
                  <SelectItem value="deferred">{t('deferred')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* جدول الفواتير */}
          {filteredInvoices.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">{t('invoice_number')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('customer')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('payment')}</TableHead>
                    <TableHead className="text-right">{t('total')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => viewInvoice(invoice)}>
                      <TableCell className="font-medium">
                        {invoice.id}
                      </TableCell>
                      <TableCell>
                        {invoice.date ? formatDate(invoice.date, 'PP', language) : '-'}
                      </TableCell>
                      <TableCell>
                        {invoice.customer.name}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice.status)}
                      </TableCell>
                      <TableCell>
                        {getPaymentBadge(invoice.paymentMethod)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(invoice.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => viewInvoice(invoice)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          
                          {user?.role === 'admin' && invoice.status !== 'cancelled' && (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 text-primary"
                                onClick={() => handleEditInvoice(invoice)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => confirmDeleteInvoice(invoice)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10 border rounded-lg">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="mt-2 text-lg font-medium">{t('no_invoices_found')}</p>
              <p className="text-sm text-muted-foreground mb-4">{t('no_invoices_description')}</p>
            </div>
          )}
          
          {/* ترقيم الصفحات */}
          {filteredInvoices.length > 0 && (
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-muted-foreground">
                {t('showing')} {indexOfFirstInvoice + 1} {t('to')} {
                  Math.min(indexOfLastInvoice, filteredInvoices.length)
                } {t('of')} {filteredInvoices.length} {t('invoices')}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-primary-50 focus-visible:ring-primary"
                  onClick={() => changePage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {Array.from({ length: totalPages }).map((_, index) => {
                  const pageNumber = index + 1;
                  
                  // Show current page, first page, last page, and pages around current page
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                  ) {
                    return (
                      <Button
                        key={pageNumber}
                        variant={pageNumber === currentPage ? "default" : "outline"}
                        size="sm"
                        className={`h-8 w-8 p-0 ${
                          pageNumber === currentPage
                            ? "hover:bg-primary-600"
                            : "hover:bg-primary-50 focus-visible:ring-primary"
                        }`}
                        onClick={() => changePage(pageNumber)}
                      >
                        {pageNumber}
                      </Button>
                    );
                  }
                  
                  // Show ellipsis for skipped pages
                  if (
                    (pageNumber === 2 && currentPage > 3) ||
                    (pageNumber === totalPages - 1 && currentPage < totalPages - 2)
                  ) {
                    return (
                      <Button
                        key={pageNumber}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-primary-50 focus-visible:ring-primary cursor-default"
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