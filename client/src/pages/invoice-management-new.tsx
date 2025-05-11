import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, Search, Pencil, Trash2, Printer, Filter, CheckCircle, XCircle, Clock, 
  RefreshCw, ArrowUpDown, ChevronRight, ChevronLeft, Loader2, Share, Scan, MoreVertical
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<any>(null);
  
  // حالة تعديل الفاتورة
  const [editedCustomerName, setEditedCustomerName] = useState('');
  const [editedCustomerPhone, setEditedCustomerPhone] = useState('');
  const [editedCustomerAddress, setEditedCustomerAddress] = useState('');
  const [editedProducts, setEditedProducts] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [availableCustomers, setAvailableCustomers] = useState<any[]>([]);
  
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
  
  // استعلام للحصول على بيانات المنتجات
  const {
    data: dbProducts,
    isLoading: isLoadingProducts
  } = useQuery({
    queryKey: ['/api/products'],
    staleTime: 60000,
  });
  
  // استعلام للحصول على بيانات العملاء
  const {
    data: dbCustomers,
    isLoading: isLoadingCustomers
  } = useQuery({
    queryKey: ['/api/customers'],
    staleTime: 60000,
  });
  
  // تحديث المنتجات والعملاء المتاحين عند تغير البيانات
  useEffect(() => {
    if (dbProducts && Array.isArray(dbProducts)) {
      setAvailableProducts(dbProducts.map(product => ({
        id: product.id,
        name: product.name,
        price: product.sellingPrice,
        stock: product.stock,
        barcode: product.barcode
      })));
    }
    
    if (dbCustomers && Array.isArray(dbCustomers)) {
      setAvailableCustomers(dbCustomers.map(customer => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone || '',
        address: customer.address || ''
      })));
    }
  }, [dbProducts, dbCustomers]);
  
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
  
  // فتح نافذة تعديل الفاتورة
  const openEditInvoiceModal = (invoice: any) => {
    console.log('Opening edit invoice modal for:', invoice.id);
    setInvoiceToEdit(invoice);
    
    // تعيين بيانات العميل الأولية
    setEditedCustomerName(invoice.customer.name);
    setEditedCustomerPhone(invoice.customer.phone || '');
    setEditedCustomerAddress(invoice.customer.address || '');
    
    // تعيين المنتجات الأولية
    if (invoice.items && Array.isArray(invoice.items)) {
      setEditedProducts([...invoice.items]);
    } else {
      setEditedProducts([]);
    }
    
    setIsEditModalOpen(true);
  };
  
  // إضافة منتج للفاتورة المعدلة
  const addProductToEditedInvoice = (productId: number) => {
    const product = availableProducts.find(p => p.id === productId);
    if (!product) return;
    
    // التحقق من وجود المنتج مسبقا
    const existingProductIndex = editedProducts.findIndex(p => p.productId === productId);
    
    if (existingProductIndex !== -1) {
      // زيادة الكمية فقط
      const newProducts = [...editedProducts];
      const currentProduct = newProducts[existingProductIndex];
      const newQuantity = currentProduct.quantity + 1;
      const newTotal = newQuantity * currentProduct.price;
      
      newProducts[existingProductIndex] = {
        ...currentProduct,
        quantity: newQuantity,
        total: newTotal
      };
      
      setEditedProducts(newProducts);
    } else {
      // إضافة منتج جديد
      const newProduct = {
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: 1,
        total: product.price,
        discount: 0,
      };
      
      setEditedProducts([...editedProducts, newProduct]);
    }
  };
  
  // حذف منتج من الفاتورة المعدلة
  const removeProductFromEditedInvoice = (index: number) => {
    const newProducts = [...editedProducts];
    newProducts.splice(index, 1);
    setEditedProducts(newProducts);
  };
  
  // تغيير كمية المنتج في الفاتورة المعدلة
  const updateProductQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) return;
    
    const newProducts = [...editedProducts];
    const product = newProducts[index];
    
    product.quantity = quantity;
    product.total = product.price * quantity - (product.discount || 0);
    
    setEditedProducts(newProducts);
  };
  
  // حساب إجمالي الفاتورة المعدلة
  const calculateEditedInvoiceTotal = () => {
    return editedProducts.reduce((sum, product) => sum + product.total, 0);
  };
  
  // حفظ التعديلات على الفاتورة
  const saveInvoiceEdit = async () => {
    if (!invoiceToEdit || !invoiceToEdit.dbId) {
      console.error('No invoice to edit');
      return;
    }
    
    try {
      const invoiceId = invoiceToEdit.dbId;
      const productsData = JSON.stringify(editedProducts);
      
      // حساب المجموع والتخفيض
      const subtotal = editedProducts.reduce((sum, product) => 
        sum + (product.price * product.quantity), 0);
      
      const discount = editedProducts.reduce((sum, product) => 
        sum + (product.discount || 0), 0);
      
      const total = subtotal - discount;
      
      // إعداد بيانات التحديث
      const updateData = {
        customerName: editedCustomerName,
        customerPhone: editedCustomerPhone,
        customerAddress: editedCustomerAddress,
        productsData,
        subtotal,
        discount,
        total,
        // تخزين بيانات المنتجات في الحقول المنفصلة أيضا
        productIds: editedProducts.map(p => p.productId).join(','),
        productNames: editedProducts.map(p => p.productName).join('|'),
        productQuantities: editedProducts.map(p => p.quantity).join(','),
        productPrices: editedProducts.map(p => p.price).join(','),
        productDiscounts: editedProducts.map(p => p.discount || 0).join(','),
        productTotals: editedProducts.map(p => p.total).join(',')
      };
      
      console.log('Updating invoice with data:', updateData);
      
      // إرسال طلب التحديث إلى الخادم
      const response = await apiRequest('PATCH', `/api/invoices/${invoiceId}`, updateData);
      
      if (!response.ok) {
        let errorMessage = t('failed_to_update_invoice');
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // في حالة عدم وجود رسالة خطأ محددة
        }
        throw new Error(errorMessage);
      }
      
      // إغلاق النافذة المنبثقة وإعادة تعيين الحالة
      setIsEditModalOpen(false);
      setInvoiceToEdit(null);
      setEditedProducts([]);
      setEditedCustomerName('');
      setEditedCustomerPhone('');
      setEditedCustomerAddress('');
      
      // إعادة تحميل البيانات
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      
      // إظهار رسالة نجاح
      toast({
        title: t('invoice_updated'),
        description: t('invoice_updated_successfully'),
      });
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      toast({
        title: t('error'),
        description: error.message || t('failed_to_update_invoice'),
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
  
  // مشاركة الفاتورة بصيغة PDF
  const shareInvoicePDF = async (invoice: any) => {
    try {
      if (!invoice) {
        toast({
          title: t('error'),
          description: t('invoice_not_found'),
          variant: 'destructive'
        });
        return;
      }
      
      // استيراد مكتبات PDF
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      // تحديد اتجاه الصفحة حسب اللغة
      const isRtl = language === 'ar';
      
      // إنشاء مستند PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // إعداد الخط - نستخدم الخط الافتراضي لكن مع تمكين الاتجاه الصحيح
      doc.setFont('Helvetica', 'normal');
      if (isRtl) {
        doc.setR2L(true);
      }
      
      // تعريف أنماط الجدول
      const tableStyle = {
        headStyles: {
          fillColor: [41, 128, 185], // لون أزرق أفضل للعنوان
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: isRtl ? 'right' : 'left'
        },
        bodyStyles: {
          halign: isRtl ? 'right' : 'left'
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240]
        },
        styles: {
          font: 'Helvetica',
          overflow: 'linebreak',
          cellPadding: 3
        }
      };
      
      // إعداد معلومات الفاتورة
      const storeTitle = isRtl ? 'سيلز غازي' : 'Sales Ghazy';
      const storeAddress = isRtl ? 'القاهرة - مصر' : 'Cairo - Egypt';
      const storePhone = '01067677607';
      const invoiceTitle = isRtl ? 'فاتورة رقم:' : 'Invoice #:';
      const invoiceDate = isRtl ? 'التاريخ:' : 'Date:';
      const customerTitle = isRtl ? 'بيانات العميل:' : 'Customer:';
      
      // إضافة معلومات الشركة (الرأس)
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text(storeTitle, doc.internal.pageSize.width / 2, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.text(storeAddress, doc.internal.pageSize.width / 2, 22, { align: 'center' });
      doc.text(storePhone, doc.internal.pageSize.width / 2, 27, { align: 'center' });
      
      // إضافة معلومات الفاتورة
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text(`${invoiceTitle} ${invoice.id}`, isRtl ? 190 : 20, 50);
      doc.text(`${invoiceDate} ${formatDate(invoice.date)}`, isRtl ? 190 : 20, 58);
      
      // معلومات العميل
      doc.setFontSize(12);
      doc.setTextColor(70, 70, 70);
      doc.text(customerTitle, isRtl ? 190 : 20, 70);
      doc.setFontSize(10);
      const customerName = invoice.customer.name || '';
      const customerPhone = invoice.customer.phone || '';
      const customerAddress = invoice.customer.address || '';
      
      doc.text(customerName, isRtl ? 190 : 20, 76);
      if (customerPhone) {
        doc.text(customerPhone, isRtl ? 190 : 20, 82);
      }
      if (customerAddress) {
        doc.text(customerAddress, isRtl ? 190 : 20, customerPhone ? 88 : 82);
      }
      
      // الخط الفاصل
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      const lineY = (customerPhone && customerAddress) ? 95 : 
                    (customerPhone || customerAddress) ? 90 : 83;
      doc.line(20, lineY, 190, lineY);
      
      // عنوان جدول المنتجات
      doc.setFontSize(14);
      doc.setTextColor(41, 128, 185);
      doc.text(t('products'), doc.internal.pageSize.width / 2, lineY + 10, { align: 'center' });
      
      // إضافة جدول المنتجات
      const tableHeaders = [
        [t('product'), t('price'), t('quantity'), t('total')]
      ];
      
      const tableData = invoice.items.map((item: any) => [
        item.productName || item.product?.name || t('unknown_product'),
        formatCurrency(item.price),
        item.quantity.toString(),
        formatCurrency(item.total)
      ]);
      
      // ترتيب الأعمدة بشكل صحيح حسب اللغة
      if (isRtl) {
        tableHeaders[0].reverse();
        tableData.forEach(row => row.reverse());
      }
      
      autoTable(doc, {
        head: tableHeaders,
        body: tableData,
        startY: lineY + 15,
        theme: 'grid',
        ...tableStyle,
        columnStyles: isRtl 
          ? { 0: { halign: 'right' }, 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'left' } }
          : { 0: { halign: 'left' }, 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'right' } }
      });
      
      // إضافة ملخص الفاتورة
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      
      // ملخص المدفوعات
      const paymentSummary = [
        [`${t('subtotal')}:`, formatCurrency(invoice.subtotal || invoice.total)],
      ];
      
      if (invoice.discount && invoice.discount > 0) {
        paymentSummary.push([`${t('discount')}:`, formatCurrency(invoice.discount)]);
      }
      
      paymentSummary.push([`${t('total')}:`, formatCurrency(invoice.total)]);
      
      // رسالة طريقة الدفع
      const paymentMethodRow = [[`${t('payment_method')}:`, t(invoice.paymentMethod)]];
      
      // ترتيب الأعمدة في ملخص المدفوعات
      if (isRtl) {
        paymentSummary.forEach(row => row.reverse());
        paymentMethodRow[0].reverse();
      }
      
      // جدول الملخص
      autoTable(doc, {
        body: paymentSummary,
        startY: finalY,
        theme: 'plain',
        ...tableStyle,
        styles: {
          ...tableStyle.styles,
          fontSize: 10,
          cellPadding: 2
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: isRtl ? 'left' : 'right' }
        },
        margin: { left: isRtl ? 20 : 100, right: isRtl ? 100 : 20 }
      });
      
      // طريقة الدفع
      const paymentMethodY = (doc as any).lastAutoTable.finalY + 5;
      autoTable(doc, {
        body: paymentMethodRow,
        startY: paymentMethodY,
        theme: 'plain',
        ...tableStyle,
        styles: {
          ...tableStyle.styles,
          fontSize: 10,
          cellPadding: 2
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: isRtl ? 'left' : 'right' }
        },
        margin: { left: isRtl ? 20 : 100, right: isRtl ? 100 : 20 }
      });
      
      // إضافة رسالة شكر
      doc.setFontSize(12);
      doc.setTextColor(41, 128, 185);
      const thankYouMessage = t('thank_you_message');
      doc.text(thankYouMessage, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 20, { align: 'center' });
      
      // إضافة رقم الصفحة والتذييل
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      const dateStr = new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US');
      const footerText = `© ${new Date().getFullYear()} Sales Ghazy - ${dateStr}`;
      doc.text(footerText, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
      
      // تحديد اسم الملف
      const fileName = `invoice-${invoice.id}-${formatDate(invoice.date, 'yyyy-MM-dd')}.pdf`;
      
      if (invoice.customer && invoice.customer.phone) {
        // تنظيف رقم الهاتف وإزالة المسافات والشرطات وأي رموز غير رقمية
        let phone = invoice.customer.phone.replace(/\s+|-|\(|\)|\+/g, '');
        
        // إضافة رمز البلد إذا لم يكن موجودًا
        if (!phone.startsWith('20')) {
          phone = '20' + phone;
        }
        
        // حفظ PDF كـ blob
        const pdfBlob = doc.output('blob');
        
        // إنشاء URL للتنزيل
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        // إنشاء رابط التنزيل
        const downloadLink = document.createElement('a');
        downloadLink.href = pdfUrl;
        downloadLink.download = fileName;
        
        // تنزيل الملف
        downloadLink.click();
        
        // مشاركة عبر واتساب إذا كان هناك رقم هاتف
        const shareMessage = `${t('invoice_sent')} - ${invoice.id}`;
        const whatsappURL = `https://wa.me/${phone}?text=${encodeURIComponent(shareMessage)}`;
        
        // فتح واتساب في نافذة جديدة
        window.open(whatsappURL, '_blank');
        
        // إظهار رسالة نجاح
        toast({
          title: t('success'),
          description: t('invoice_pdf_generated'),
        });
      } else {
        // تنزيل الملف فقط إذا لم يتوفر رقم هاتف
        doc.save(fileName);
        
        toast({
          title: t('success'),
          description: t('invoice_pdf_downloaded'),
        });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: t('error'),
        description: t('pdf_generation_failed'),
        variant: 'destructive'
      });
    }
  };
  
  // مشاركة الفاتورة عبر واتساب (قديم - النص فقط)
  const shareInvoiceWhatsApp = async (invoice: any) => {
    // استخدام وظيفة مشاركة PDF بدلاً من النص
    shareInvoicePDF(invoice);
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
                            invoice.status === 'completed' ? 'default' :
                            invoice.status === 'approved' ? 'default' :
                            invoice.status === 'pending' ? 'secondary' :
                            invoice.status === 'rejected' ? 'destructive' :
                            'outline'
                          }
                          className={`whitespace-nowrap ${
                            invoice.status === 'completed' || invoice.status === 'approved' ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''
                          }`}
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
                            <DropdownMenuItem onClick={() => openEditInvoiceModal(invoice)}>
                              <Pencil className="h-4 w-4 me-2" />
                              {t('edit')}
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
                        selectedInvoice.status === 'completed' ? 'default' :
                        selectedInvoice.status === 'approved' ? 'default' :
                        selectedInvoice.status === 'pending' ? 'secondary' :
                        selectedInvoice.status === 'rejected' ? 'destructive' :
                        'outline'
                      }
                      className={`mb-2 ${
                        selectedInvoice.status === 'completed' || selectedInvoice.status === 'approved' ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''
                      }`}
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
      
      {/* نافذة تعديل الفاتورة */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="gradient-heading">{t('edit_invoice')}</DialogTitle>
            <DialogDescription>
              {invoiceToEdit && `${t('invoice')} #${invoiceToEdit.id} - ${formatDate(invoiceToEdit.date)}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* معلومات العميل */}
            <div>
              <h3 className="text-lg font-semibold mb-3">{t('customer_information')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">{t('name')}</Label>
                  <Input
                    id="customerName"
                    placeholder={t('customer_name')}
                    value={editedCustomerName}
                    onChange={(e) => setEditedCustomerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">{t('phone')}</Label>
                  <Input
                    id="customerPhone"
                    placeholder={t('customer_phone')}
                    value={editedCustomerPhone}
                    onChange={(e) => setEditedCustomerPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerAddress">{t('address')}</Label>
                  <Input
                    id="customerAddress"
                    placeholder={t('customer_address')}
                    value={editedCustomerAddress}
                    onChange={(e) => setEditedCustomerAddress(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* جدول المنتجات */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">{t('products')}</h3>
                <Select onValueChange={(value) => addProductToEditedInvoice(parseInt(value))}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={t('add_product')} />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingProducts ? (
                      <div className="flex justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : availableProducts.length === 0 ? (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        {t('no_products')}
                      </div>
                    ) : (
                      availableProducts.map(product => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('product')}</TableHead>
                      <TableHead className="text-center">{t('price')}</TableHead>
                      <TableHead className="text-center">{t('quantity')}</TableHead>
                      <TableHead className="text-right">{t('total')}</TableHead>
                      <TableHead className="w-[80px]">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editedProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                          {t('no_products_in_invoice')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      editedProducts.map((product, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="font-medium">{product.productName}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            {formatCurrency(product.price)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateProductQuantity(index, Math.max(1, product.quantity - 1))}
                              >
                                <span>-</span>
                              </Button>
                              <span className="w-8 text-center">{product.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateProductQuantity(index, product.quantity + 1)}
                              >
                                <span>+</span>
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(product.total)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => removeProductFromEditedInvoice(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            {/* ملخص المجموع */}
            <div className="flex justify-end">
              <div className="bg-muted/40 p-4 rounded-lg w-full max-w-[250px]">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>{t('total')}:</span>
                  <span className="text-primary">{formatCurrency(calculateEditedInvoiceTotal())}</span>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              {t('cancel')}
            </Button>
            
            <Button 
              variant="default" 
              onClick={saveInvoiceEdit}
              disabled={editedProducts.length === 0}
            >
              <CheckCircle className="h-4 w-4 me-2" />
              {t('save_changes')}
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