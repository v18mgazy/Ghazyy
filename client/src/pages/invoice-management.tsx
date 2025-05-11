import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, Search, Pencil, Trash2, Printer, ExternalLink, Filter, CheckCircle, XCircle, Clock, 
  RefreshCw, ArrowUpDown, Download, ChevronRight, ChevronLeft, Loader2, Share, Scan, QrCode,
  X, Box
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuthContext } from '@/context/auth-context';
import { useLocale } from '@/hooks/use-locale';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

// استيراد أنواع البيانات
import { Invoice, InvoiceProduct, Customer, Product } from "@shared/schema";

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
  
  // نستخدم بيانات العملاء المخزنة مع كل فاتورة
  // نحن لا نحتاج إلى جلب بيانات العملاء مرة ثانية من قاعدة البيانات
  // لأن معلومات العميل اللازمة متوفرة بالفعل في الفاتورة
  
  // معالجة وتحويل بيانات الفواتير القادمة من قاعدة البيانات
  const processedInvoices = React.useMemo(() => {
    // التأكد من أن الفواتير متاحة كمصفوفة
    const invoices = Array.isArray(dbInvoices) ? dbInvoices : [];
    
    if (invoices.length === 0) {
      console.log('No invoices available from database');
      return []; // لا نستخدم بيانات مزيفة
    }
    
    console.log('Processing invoices:', invoices);
    
    return invoices.map((invoice: any) => {
      if (!invoice) {
        console.warn('Found null invoice in data');
        return null;
      }
      
      // استخدام معلومات العميل المخزنة في الفاتورة مباشرة
      console.log('Processing invoice:', invoice);
      
      // جلب المنتجات من الفاتورة إذا كانت متوفرة
      let products = [];
      
      // محاولة استخدام الحقول المنفصلة أولاً (الطريقة الجديدة)
      if (invoice.productIds && invoice.productNames && invoice.productQuantities && invoice.productPrices) {
        try {
          // تقسيم البيانات إلى مصفوفات
          const productIds = invoice.productIds.split(',').map(id => parseInt(id));
          const productNames = invoice.productNames.split('|');
          const productQuantities = invoice.productQuantities.split(',').map(qty => parseFloat(qty));
          const productPrices = invoice.productPrices.split(',').map(price => parseFloat(price));
          const productDiscounts = invoice.productDiscounts ? 
            invoice.productDiscounts.split(',').map(discount => parseFloat(discount)) : 
            productIds.map(() => 0);
          const productTotals = invoice.productTotals ? 
            invoice.productTotals.split(',').map(total => parseFloat(total)) : 
            productIds.map((_, index) => productQuantities[index] * productPrices[index]);
          
          // تجميع بيانات كل منتج
          products = productIds.map((id, index) => {
            return {
              productId: id,
              productName: productNames[index] || t('unknown_product'),
              quantity: productQuantities[index] || 0,
              price: productPrices[index] || 0,
              discount: productDiscounts[index] || 0,
              total: productTotals[index] || 0
            };
          });
          
          console.log(`Successfully built products data from separate fields for invoice ${invoice.id}:`, products);
        } catch (error) {
          console.error(`Error processing separated product data for invoice ${invoice.id}:`, error);
          // في حالة فشل الحقول المنفصلة، نحاول استخدام productsData
          if (invoice.productsData) {
            try {
              products = JSON.parse(invoice.productsData);
              console.log(`Falling back to JSON productsData for invoice ${invoice.id}:`, products);
            } catch (jsonError) {
              console.error(`Error parsing productsData JSON for invoice ${invoice.id}:`, jsonError);
            }
          }
        }
      } 
      // إذا فشلت الطريقة الجديدة أو لم تكن متوفرة، نحاول الطريقة القديمة (productsData)
      else if (invoice.productsData) {
        try {
          products = JSON.parse(invoice.productsData);
          console.log(`Using JSON productsData for invoice ${invoice.id}:`, products);
        } catch (error) {
          console.error(`Error parsing productsData JSON for invoice ${invoice.id}:`, error);
        }
      }
      
      // تنسيق المنتجات للعرض
      const formattedItems = Array.isArray(products) ? products.map((product: any) => {
        if (!product) return null;
        
        const productId = product.productId || 0;
        const productName = product.productName || t('unknown_product');
        const productPrice = product.price || 0;
        const quantity = product.quantity || 1;
        const total = product.total || (quantity * productPrice);
        
        return {
          id: `item-${productId}-${Math.random().toString(36).substring(2, 7)}`,
          product: {
            id: productId,
            name: productName,
            code: product.barcode || '',
            price: productPrice
          },
          quantity: quantity,
          price: productPrice,
          total: total
        };
      }).filter(Boolean) : [];
      
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
        status: invoice.paymentStatus || 'unknown',
        paymentMethod: invoice.paymentMethod || 'unknown',
        // إضافة المنتجات مباشرة بدلاً من جلبها لاحقًا
        items: formattedItems,
        // نحتفظ بنسخة من بيانات المنتجات الأصلية أيضًا
        productsData: invoice.productsData
      }
    }).filter(Boolean); // إزالة القيم الفارغة
  }, [dbInvoices, t]);
  
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
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
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
  
  // Function to get invoice products from the invoice object itself
  const getInvoiceProducts = (invoice: any) => {
    try {
      // Method 1: نحاول استخراج بيانات المنتجات من حقل productsData
      if (invoice && invoice.productsData) {
        try {
          // طباعة البيانات للتصحيح
          console.log('Found productsData in invoice:', invoice.productsData);
          
          // تحويل سلسلة JSON إلى كائن جافاسكريبت
          const parsedProducts = JSON.parse(invoice.productsData);
          
          // التأكد من أنها مصفوفة وتحتوي على عناصر
          if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
            console.log('Successfully parsed productsData with', parsedProducts.length, 'products:', parsedProducts);
            return parsedProducts;
          } else {
            console.warn('productsData exists but is empty or not an array');
          }
        } catch (parseError) {
          console.error('Error parsing productsData:', parseError);
        }
      } else {
        console.log('No productsData field in invoice:', invoice);
      }
      
      // Method 2: محاولة استخدام الحقول المنفصلة productIds, productNames, إلخ
      console.log('Checking for separate product fields in invoice:', {
        productIds: invoice?.productIds, 
        productNames: invoice?.productNames,
        productQuantities: invoice?.productQuantities,
        productPrices: invoice?.productPrices
      });
      
      if (invoice && invoice.productIds && invoice.productNames && 
          invoice.productQuantities && invoice.productPrices) {
        try {
          console.log('Found separate product fields in invoice, attempting to reconstruct products');
          
          // تقسيم البيانات من السلاسل النصية إلى مصفوفات
          const productIds = invoice.productIds.split(',').map((id: string) => parseInt(id.trim()));
          const productNames = invoice.productNames.split('|');
          const productQuantities = invoice.productQuantities.split(',').map((qty: string) => parseInt(qty.trim()));
          const productPrices = invoice.productPrices.split(',').map((price: string) => parseFloat(price.trim()));
          
          // أرقام إضافية اختيارية
          let productDiscounts: number[] = [];
          let productTotals: number[] = [];
          
          if (invoice.productDiscounts) {
            productDiscounts = invoice.productDiscounts.split(',').map((disc: string) => parseFloat(disc.trim() || '0'));
          }
          
          if (invoice.productTotals) {
            productTotals = invoice.productTotals.split(',').map((total: string) => parseFloat(total.trim() || '0'));
          }
          
          console.log('Reconstructed arrays from separate fields:', {
            productIds,
            productNames,
            productPrices,
            productQuantities,
            productDiscounts,
            productTotals
          });
          
          // التأكد من أن جميع المصفوفات لها نفس الطول
          if (productIds.length === productNames.length && 
              productIds.length === productPrices.length && 
              productIds.length === productQuantities.length) {
            
            // إنشاء مصفوفة من كائنات المنتجات
            const reconstructedProducts = productIds.map((id: number, index: number) => {
              // حساب السعر الإجمالي إذا لم يكن متوفرًا
              const total = index < productTotals.length && productTotals[index] 
                ? productTotals[index] 
                : (productPrices[index] * productQuantities[index]);
                
              // الخصم إذا كان متوفرًا
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
            
            console.log('Successfully reconstructed products from separate fields:', reconstructedProducts);
            return reconstructedProducts;
          } else {
            console.warn('Separate product fields have inconsistent lengths');
          }
        } catch (reconstructError) {
          console.error('Error reconstructing products from separate fields:', reconstructError);
        }
      }
      
      // Method 3: للتوافق مع الإصدارات السابقة - البحث عن حقل products
      if (invoice && invoice.products && Array.isArray(invoice.products)) {
        console.log('Using products array from invoice:', invoice.products);
        return invoice.products;
      }
      
      // Method 4: في حالة عدم وجود بيانات منتجات، نعرض إجمالي الفاتورة فقط
      console.log('No products data found in invoice, creating placeholder from total:', invoice?.total);
      return [
        {
          id: `item-${invoice?.id || 'unknown'}-1`,
          productId: 0,
          productName: t('products_total'),
          quantity: 1,
          price: invoice?.total || 0,
          total: invoice?.total || 0,
          discount: invoice?.discount || 0
        }
      ];
    } catch (error) {
      console.error('Error processing invoice products:', error);
      return [];
    }
  };

  // Open invoice details dialog with items
  const openInvoiceDetails = (invoice: any) => {
    console.log('Opening invoice details:', invoice);

    try {
      // استخدام بيانات المنتجات المتوفرة مباشرة في الفاتورة المعالجة بدلاً من طلبها مرة أخرى
      if (invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0) {
        console.log('Using pre-processed items directly from invoice:', invoice.items);
        
        // المنتجات متوفرة بالفعل، نستخدمها مباشرة
        setSelectedInvoice({
          ...invoice,
          isLoadingItems: false,
          loadError: false
        });
        
        return; // المنتجات جاهزة، لا داعي لمزيد من المعالجة
      }
      
      // إذا لم تكن المنتجات متوفرة مسبقًا، نأخذها من حقل productsData
      setSelectedInvoice({
        ...invoice,
        isLoadingItems: true,
        loadError: false
      });
      
      console.log('Attempting to parse products from invoice.productsData:', invoice.productsData);
      
      // محاولة استخراج بيانات المنتجات من حقل productsData مباشرة
      try {
        // محاولة قراءة البيانات من الحقول المنفصلة أولاً
        let formattedItems: any[] = [];
        
        // تحقق من توفر البيانات في الحقول المنفصلة
        if (invoice.productIds && invoice.productNames && invoice.productQuantities && 
            invoice.productPrices && invoice.productPurchasePrices && invoice.productDiscounts && 
            invoice.productTotals && invoice.productProfits) {
              
          console.log('Found separate product fields, using these for display');
          
          // تحويل السلاسل النصية إلى مصفوفات
          const productIdsArray = invoice.productIds.split(',');
          const productNamesArray = invoice.productNames.split(',');
          const productQuantitiesArray = invoice.productQuantities.split(',').map(Number);
          const productPricesArray = invoice.productPrices.split(',').map(Number);
          // الحقول الإضافية متوفرة أيضًا
          const productDiscountsArray = invoice.productDiscounts.split(',').map(Number);
          const productTotalsArray = invoice.productTotals.split(',').map(Number);
          
          // تحويل البيانات إلى تنسيق المنتجات
          formattedItems = productIdsArray.map((productId, index) => {
            const productName = productNamesArray[index] || t('unknown_product');
            const quantity = productQuantitiesArray[index] || 1;
            const price = productPricesArray[index] || 0;
            const total = productTotalsArray[index] || (quantity * price);
            
            return {
              id: `item-${productId}-${Math.random().toString(36).substring(2, 7)}`,
              product: {
                id: productId,
                name: productName,
                code: '', // لا توجد بيانات الباركود في الحقول المنفصلة
                price: price
              },
              quantity: quantity,
              price: price,
              total: total
            };
          });
          
          console.log('Created items from separate fields:', formattedItems);
        } 
        // في حالة عدم توفر الحقول المنفصلة، نستخدم حقل productsData
        else if (invoice.productsData) {
          console.log('Using productsData JSON field');
          const products = Array.isArray(invoice.productsData) 
            ? invoice.productsData 
            : (typeof invoice.productsData === 'string' 
                ? JSON.parse(invoice.productsData) 
                : []);
          
          console.log('Extracted products from invoice.productsData:', products);
          
          if (!products || products.length === 0) {
            console.warn('No products found in invoice data');
          }
          
          // تنسيق المنتجات للعرض
          formattedItems = Array.isArray(products) ? products.map((product: any) => {
            if (!product) {
              console.warn('Null or undefined product in results');
              return null;
            }
            
            console.log('Processing product for display:', product);
            
            // التحقق من حقول المنتج
            const productId = product.productId || 0;
            const productName = product.productName || t('unknown_product');
            const productPrice = product.price || 0;
            const quantity = product.quantity || 1;
            const total = product.total || (quantity * productPrice);
            
            return {
              id: `item-${productId}-${Math.random().toString(36).substring(2, 7)}`,
              product: {
                id: productId,
                name: productName,
                code: product.barcode || '',
                price: productPrice
              },
              quantity: quantity,
              price: productPrice,
              total: total
            };
          }).filter(Boolean) : []; // إزالة العناصر null
        }
        else {
          console.warn('No product data available in invoice');
        }
        
        console.log('Formatted items for display:', formattedItems);
        
        // تحديث الفاتورة المحددة مع العناصر
        setSelectedInvoice({
          ...invoice,
          items: formattedItems,
          isLoadingItems: false,
          loadError: false,
          // التأكد من وجود بيانات العميل بشكل صحيح
          customer: {
            name: invoice.customerName || 'Unknown',
            phone: invoice.customerPhone || '',
            address: invoice.customerAddress || ''
          }
        });
      } catch (error) {
        console.error('Error parsing products data from invoice:', error);
        
        // في حالة الفشل، نطلب البيانات من الخادم
        console.log('Falling back to server request for invoice:', invoice.dbId || invoice.id);
        
        fetch(`/api/invoices/${invoice.dbId || invoice.id}`)
          .then(response => {
            if (!response.ok) {
              throw new Error('Failed to fetch invoice details');
            }
            return response.json();
          })
          .then(latestInvoiceData => {
            console.log('Got latest invoice data from server:', latestInvoiceData);
            
            // استخراج بيانات المنتجات من استجابة الخادم
            const products = getInvoiceProducts(latestInvoiceData);
            
            // تنسيق المنتجات للعرض
            const formattedItems = Array.isArray(products) ? products.map((product: any) => {
              if (!product) return null;
              
              const productId = product.productId || 0;
              const productName = product.productName || t('unknown_product');
              const productPrice = product.price || 0;
              const quantity = product.quantity || 1;
              const total = product.total || (quantity * productPrice);
              
              return {
                id: `item-${productId}-${Math.random().toString(36).substring(2, 7)}`,
                product: {
                  id: productId,
                  name: productName,
                  code: product.barcode || '',
                  price: productPrice
                },
                quantity: quantity,
                price: productPrice,
                total: total
              };
            }).filter(Boolean) : [];
            
            // تحديث الفاتورة المحددة مع العناصر
            setSelectedInvoice({
              ...invoice,
              ...latestInvoiceData,
              items: formattedItems,
              isLoadingItems: false,
              loadError: false
            });
          })
          .catch(error => {
            console.error('Error fetching invoice details from server:', error);
            setSelectedInvoice({
              ...invoice,
              items: [],
              isLoadingItems: false,
              loadError: true
            });
          });
      }
    } catch (error) {
      console.error('Error processing invoice details:', error);
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
    
    try {
      // 1. جلب أحدث بيانات الفاتورة من الخادم
      console.log('Fetching latest invoice data for ID:', invoice.dbId || invoice.id);
      
      const response = await fetch(`/api/invoices/${invoice.dbId || invoice.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoice data');
      }
      
      const latestInvoiceData = await response.json();
      console.log('Latest invoice data:', latestInvoiceData);
      
      // 2. استخراج المنتجات من productsData في الفاتورة
      const products = getInvoiceProducts(latestInvoiceData);
      console.log('Extracted products for edit:', products);
      
      // 3. إنشاء كائن المنتجات المنسق للتعديل
      const formattedProducts = products.map((product: any) => {
        const productId = product.productId || 0;
        const productName = product.productName || t('unknown_product');
        const productPrice = product.price || 0;
        const quantity = product.quantity || 1;
        const total = product.total || (quantity * productPrice);
        
        return {
          id: productId,
          name: productName,
          barcode: product.barcode || '',
          price: productPrice,
          quantity: quantity,
          total: total,
          discount: product.discount || 0,
        };
      });
      
      // 4. تحضير بيانات الفاتورة للتعديل
      const invoiceToEdit = {
        id: latestInvoiceData.id,
        invoiceNumber: latestInvoiceData.invoiceNumber,
        customerId: latestInvoiceData.customerId,
        customerName: latestInvoiceData.customerName || '',
        customerPhone: latestInvoiceData.customerPhone || '',
        customerAddress: latestInvoiceData.customerAddress || '',
        subtotal: latestInvoiceData.subtotal || 0,
        discount: latestInvoiceData.discount || 0,
        total: latestInvoiceData.total || 0,
        paymentMethod: latestInvoiceData.paymentMethod || 'cash',
        paymentStatus: latestInvoiceData.paymentStatus || 'completed',
        notes: latestInvoiceData.notes || '',
        products: formattedProducts,
        date: new Date(latestInvoiceData.date || Date.now()).toISOString()
      };
      
      console.log('Prepared invoice for edit:', invoiceToEdit);
      
      // 5. فتح نافذة تعديل الفاتورة
      // في هذه المرحلة، يمكننا إما:
      // أ) إرسال المستخدم إلى صفحة إنشاء فاتورة جديدة مع تمرير البيانات الحالية
      // ب) فتح نافذة منبثقة لتعديل الفاتورة
      
      // الخيار ب: فتح نافذة تعديل الفاتورة
      // نحتاج إلى استدعاء مكون تعديل الفاتورة هنا
      // انظر إلى components/invoice/edit-invoice-dialog.tsx
      
      // بدلاً من ذلك، سنقوم مؤقتًا بعرض تفاصيل الفاتورة فقط
      // مع إرسال طلب PATCH للتحديث (تحديث بسيط لتغيير حالة الفاتورة)
      
      // 6. تحديث الفاتورة بشكل بسيط (مؤقتًا)
      // في المستقبل، يجب استبدال هذا بفتح محرر الفاتورة
      const simpleUpdateResponse = await fetch(`/api/invoices/${invoice.dbId || invoice.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentStatus: latestInvoiceData.paymentStatus === 'completed' ? 'pending' : 'completed'
        })
      });
      
      if (!simpleUpdateResponse.ok) {
        throw new Error('Failed to update invoice status');
      }
      
      // 7. تحديث البيانات المحلية والكاش
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      
      toast({
        title: t('edit_invoice'),
        description: t('edit_invoice_success'),
      });
      
      // TODO: إضافة رابط إلى مكون تعديل الفاتورة بشكل كامل هنا
      // يمكن تنفيذ ذلك باستخدام نافذة منبثقة أو إعادة توجيه إلى صفحة الإنشاء مع تمرير بيانات التعديل
      
    } catch (error) {
      console.error('Error editing invoice:', error);
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
  
  // مشاركة الفاتورة عبر WhatsApp
  const shareInvoiceViaWhatsApp = (invoice: any) => {
    console.log('Sharing invoice via WhatsApp:', invoice);
    
    // نتأكد من وجود رقم هاتف العميل (قد يكون في كائن customer أو مباشرة في الفاتورة)
    const customerPhone = invoice.customer?.phone || invoice.customerPhone;
    
    console.log('Customer phone for WhatsApp:', customerPhone);
    
    if (!customerPhone) {
      toast({
        title: t('share_error'),
        description: t('customer_phone_missing'),
        variant: "destructive"
      });
      return;
    }
    
    // تنظيف رقم الهاتف من أي رموز إضافية
    let phoneNumber = customerPhone.replace(/\s+/g, '').replace(/\+/g, '');
    
    // التأكد من عدم وجود صفر في بداية الرقم (بالنسبة لمصر)
    if (phoneNumber.startsWith('0')) {
      phoneNumber = phoneNumber.substring(1);
    }
    
    // إضافة كود الدولة إذا لم يكن موجودًا (مصر 20)
    if (!phoneNumber.startsWith('20')) {
      phoneNumber = '20' + phoneNumber;
    }
    
    console.log('تنسيق رقم الهاتف للواتساب:', phoneNumber);
    
    // اسم العميل (قد يكون في كائن customer أو مباشرة في الفاتورة)
    const customerName = invoice.customer?.name || invoice.customerName;
    
    // إنشاء نص الرسالة
    const invoiceDate = formatDate(invoice.date, 'PPP', language);
    let message = `*${t('invoice')}* #${invoice.invoiceNumber || invoice.id}\n`;
    if (customerName) {
      message += `*${t('customer')}:* ${customerName}\n`;
    }
    message += `*${t('date')}:* ${invoiceDate}\n`;
    message += `*${t('total')}:* ${formatCurrency(invoice.total)}\n\n`;
    
    message += `*${t('items')}:*\n`;
    
    // إضافة تفاصيل المنتجات
    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach((item: any, index: number) => {
        message += `${index + 1}. ${item.product.name} x${item.quantity} = ${formatCurrency(item.total)}\n`;
      });
    }
    // إذا لم تكن المنتجات متوفرة، نحاول استخدام حقول المنتجات المنفصلة
    else if (invoice.productNames && invoice.productQuantities && invoice.productTotals) {
      try {
        const productNames = invoice.productNames.split(',');
        const productQuantities = invoice.productQuantities.split(',').map(Number);
        const productTotals = invoice.productTotals.split(',').map(Number);
        
        productNames.forEach((name: string, index: number) => {
          const quantity = productQuantities[index] || 1;
          const total = productTotals[index] || 0;
          message += `${index + 1}. ${name} x${quantity} = ${formatCurrency(total)}\n`;
        });
      } catch (error) {
        console.error('Error formatting product data for message:', error);
      }
    }
    
    message += `\n*${t('thank_you_for_your_business')}*`;
    
    // إنشاء رابط WhatsApp
    const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    // فتح الرابط في نافذة جديدة
    window.open(whatsappURL, '_blank');
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
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center"
                onClick={() => shareInvoiceViaWhatsApp(selectedInvoice)}
              >
                <Share className="mr-1 h-4 w-4" /> {t('share')}
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