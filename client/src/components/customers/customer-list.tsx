import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, FileSpreadsheet, Edit, History, Loader2,
  MessageSquareShare, Filter, Info, CreditCard, Wallet
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createWhatsAppLink, formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import CustomerDebtHistory from './customer-debt-history';
import AddDebtDialog from './add-debt-dialog';
import ReduceDebtDialog from './reduce-debt-dialog';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  isPotential: boolean;
  totalDebt: number;
  totalPurchases: number;
}

interface CustomerDebt {
  id: number;
  customerId: number;
  amount: number;
  reason: string;
  date: string;
  createdAt: string;
  invoiceId?: number;
  createdBy: number;
}

interface CustomerListProps {
  customers: Customer[];
  isLoading: boolean;
  onExportToExcel: () => void;
  onEditCustomer: (customer: Customer) => void;
  onRefreshData: () => void;
}

export default function CustomerList({
  customers,
  isLoading,
  onExportToExcel,
  onEditCustomer,
  onRefreshData
}: CustomerListProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showAddDebtDialog, setShowAddDebtDialog] = useState(false);
  const [showReduceDebtDialog, setShowReduceDebtDialog] = useState(false);
  const [showDebtHistory, setShowDebtHistory] = useState(false);
  const [debtAmount, setDebtAmount] = useState(0);
  const [debtReason, setDebtReason] = useState('');
  const [debtHistory, setDebtHistory] = useState<CustomerDebt[]>([]);
  
  const perPage = 10;
  
  // استخدام استعلام React Query للحصول على جميع الفواتير لحساب إجمالي المشتريات
  const { data: allInvoices = [] } = useQuery<any[]>({
    queryKey: ['/api/invoices'],
    staleTime: 30 * 1000, // تحديث كل 30 ثانية
  });
  
  // استخدام استعلام React Query للحصول على تاريخ مشتريات العميل من قاعدة البيانات
  const [purchaseHistory, setPurchaseHistory] = useState<Array<{
    id: string;
    date: string;
    invoiceNumber: string;
    total: number;
  }>>([]);
  
  // دالة لحساب إجمالي مشتريات العميل من الفواتير
  const calculateTotalPurchases = useCallback((customerId: string) => {
    const customerInvoices = allInvoices.filter(invoice => 
      // تطابق حسب معرف العميل أو اسم العميل مع عدم تضمين الفواتير المحذوفة
      (invoice.customerId?.toString() === customerId ||
       invoice.customerName === customers.find(c => c.id.toString() === customerId)?.name) &&
      !invoice.isDeleted
    );
    
    return customerInvoices.reduce((total, invoice) => {
      const invoiceTotal = typeof invoice.total === 'number' 
        ? invoice.total 
        : (typeof invoice.total === 'string' ? parseFloat(invoice.total) : 0);
      return total + invoiceTotal;
    }, 0);
  }, [allInvoices, customers]);
  
  // دالة لحساب إجمالي ديون العميل (الفواتير الآجلة + الديون المضافة)
  const calculateTotalDebt = useCallback((customerId: string) => {
    // 1. حساب الديون من الفواتير الآجلة
    const deferredInvoices = allInvoices.filter(invoice => 
      // تطابق حسب معرف العميل أو اسم العميل
      (invoice.customerId?.toString() === customerId ||
       invoice.customerName === customers.find(c => c.id.toString() === customerId)?.name) &&
      // فقط الفواتير الآجلة (بالتقسيط) وغير المحذوفة
      invoice.paymentMethod === 'deferred' && !invoice.isDeleted
    );
    
    const deferredDebt = deferredInvoices.reduce((total, invoice) => {
      const invoiceTotal = typeof invoice.total === 'number' 
        ? invoice.total 
        : (typeof invoice.total === 'string' ? parseFloat(invoice.total) : 0);
      return total + invoiceTotal;
    }, 0);
    
    // 2. الديون الأخرى المسجلة للعميل (تؤخذ من حقل totalDebt في بيانات العميل)
    const customerDebt = customers.find(c => c.id.toString() === customerId)?.totalDebt || 0;
    
    // 3. إجمالي الديون هو مجموع الفواتير الآجلة والديون المسجلة
    return deferredDebt + customerDebt;
  }, [allInvoices, customers]);

  // تحويل البيانات من شكل الاستجابة إلى الشكل الذي يستخدمه المكون مع حساب إجمالي المشتريات والديون
  const processedCustomers = useMemo(() => {
    return customers.map(customer => ({
      ...customer,
      id: customer.id.toString(),
      // حساب إجمالي المشتريات لكل عميل
      totalPurchases: calculateTotalPurchases(customer.id.toString()),
      // استبدال قيمة totalDebt الموجودة بالقيمة المحسوبة التي تشمل الفواتير الآجلة
      totalDebt: calculateTotalDebt(customer.id.toString()),
    }));
  }, [customers, calculateTotalPurchases, calculateTotalDebt]);

  const filteredCustomers = processedCustomers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone && customer.phone.includes(searchTerm)) ||
    (customer.address && customer.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredCustomers.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const currentCustomers = filteredCustomers.slice(startIndex, startIndex + perPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const openWhatsApp = (customer: Customer) => {
    if (!customer.phone) return;
    
    const whatsappLink = createWhatsAppLink(customer.phone);
    window.open(whatsappLink, '_blank');
  };
  
  // دالة فتح مربع حوار إضافة مديونية جديدة
  const openAddDebtDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowAddDebtDialog(true);
  };

  // دالة فتح مربع حوار تخفيض المديونية
  const openReduceDebtDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowReduceDebtDialog(true);
  };

  // دالة لعرض سجل المديونية للعميل (محدثة لاستخدام المكون الجديد)
  const viewDebtHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDebtHistory(true);
    // لا حاجة لاسترجاع البيانات هنا، سيقوم المكون CustomerDebtHistory بذلك تلقائيًا
  };

  // استعلام للحصول على تاريخ مشتريات العميل (سيتم استخدامه عند طلب عرض التاريخ)
  const { isLoading: isLoadingHistory, refetch: fetchCustomerHistory } = useQuery({
    queryKey: ['/api/customer-invoices', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer?.id) return [];
      
      try {
        console.log(`Fetching customer invoices for customer ID: ${selectedCustomer.id}`);
        const response = await apiRequest('GET', `/api/customer-invoices/${selectedCustomer.id}`);
        
        // التحقق من حالة الاستجابة
        if (!response.ok) {
          console.error('API returned error status:', response.status);
          return [];
        }
        
        const data = await response.json();
        console.log('Raw API response:', data);
        
        // إذا كان هناك بيانات، نقوم بإرجاعها مباشرة
        if (data && Array.isArray(data) && data.length > 0) {
          return data;
        }
        
        return [];
      } catch (error) {
        console.error('Error in API request:', error);
        return [];
      }
    },
    enabled: false, // لا يتم تنفيذ الاستعلام تلقائيًا
  });

  // دالة تصدير تاريخ المشتريات إلى إكسل
  const exportPurchaseHistoryToExcel = async () => {
    if (purchaseHistory.length === 0) {
      toast({
        title: t('no_data'),
        description: t('no_purchase_history_to_export'),
        variant: 'destructive'
      });
      return;
    }
    
    try {
      console.log('Exporting purchase history to Excel');
      
      // استخدام مكتبة XLSX للتصدير
      const XLSX = await import('xlsx');
      
      // تجهيز البيانات للتصدير
      const purchasesForExport = purchaseHistory.map(purchase => ({
        [t('date')]: purchase.date,
        [t('invoice_number')]: purchase.invoiceNumber,
        [t('total')]: purchase.total
      }));
      
      // إنشاء كتاب عمل جديد
      const workbook = XLSX.utils.book_new();
      
      // إنشاء ورقة عمل جديدة
      const worksheet = XLSX.utils.json_to_sheet(purchasesForExport);
      
      // إضافة ورقة العمل إلى الكتاب
      const customerName = selectedCustomer?.name || 'customer';
      XLSX.utils.book_append_sheet(workbook, worksheet, t('purchase_history'));
      
      // تصدير الملف
      XLSX.writeFile(workbook, `${customerName}_purchase_history.xlsx`);
      
      toast({
        title: t('export_successful'),
        description: t('purchase_history_exported_to_excel')
      });
    } catch (error) {
      console.error('Error exporting purchase history to Excel:', error);
      toast({
        title: t('export_failed'),
        description: t('error_exporting_purchase_history'),
        variant: 'destructive'
      });
    }
  };
  
  // عند طلب عرض تاريخ مشتريات العميل
  const viewHistory = async (customer: Customer) => {
    try {
      console.log('Viewing history for customer:', customer);
      setSelectedCustomer(customer);
      setShowHistory(true);
      setPurchaseHistory([]); // إعادة ضبط تاريخ المشتريات قبل جلب البيانات الجديدة
      
      // استخدام fetch مباشرة بدلاً من استعلام React Query
      const response = await fetch(`/api/customer-invoices/${customer.id}`);
      
      if (!response.ok) {
        console.error('API returned error status:', response.status);
        return;
      }
      
      const invoices = await response.json();
      console.log('Raw customer invoices:', invoices);
      
      if (!Array.isArray(invoices) || invoices.length === 0) {
        console.log('No invoices found for customer');
        return;
      }
      
      // تحويل البيانات إلى النموذج المطلوب
      const formattedHistory = invoices.map((invoice: any) => {
        console.log('Processing invoice for display:', invoice);
        return {
          id: invoice.id.toString(),
          date: new Date(invoice.date || invoice.createdAt || Date.now()).toLocaleDateString(),
          invoiceNumber: invoice.invoiceNumber || `INV-${invoice.id.toString().padStart(5, '0')}`,
          total: typeof invoice.total === 'number' ? invoice.total : 
                (typeof invoice.total === 'string' ? parseFloat(invoice.total) : 0)
        };
      });
      
      console.log('Formatted history for display:', formattedHistory);
      
      // ترتيب البيانات حسب التاريخ من الأحدث إلى الأقدم
      formattedHistory.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
      
      setPurchaseHistory(formattedHistory);
    } catch (error) {
      console.error('Error viewing customer history:', error);
      setPurchaseHistory([]);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('customer_management')}</CardTitle>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative flex-grow">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('search_customers')}
                className="pr-8"
              />
              <div className="absolute right-2 top-2 text-neutral-500">
                <Search className="h-5 w-5" />
              </div>
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-5 w-5" />
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold">{t('name')}</TableHead>
                    <TableHead className="font-semibold">{t('phone')}</TableHead>
                    <TableHead className="font-semibold">{t('address')}</TableHead>
                    <TableHead className="font-semibold">{t('notes')}</TableHead>
                    <TableHead className="font-semibold">{t('potential')}</TableHead>
                    <TableHead className="font-semibold">{t('total_debt')}</TableHead>
                    <TableHead className="font-semibold">{t('total_purchases')}</TableHead>
                    <TableHead className="font-semibold text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? t('no_customers_found') : t('no_customers_yet')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentCustomers.map((customer, index) => (
                      <TableRow 
                        key={customer.id}
                        className={index % 2 === 0 ? 'bg-muted/20' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                              {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{customer.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{customer.phone || '-'}</TableCell>
                        <TableCell>{customer.address || '-'}</TableCell>
                        <TableCell>{customer.notes || '-'}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={customer.isPotential 
                              ? 'bg-amber-50 text-amber-700 border-amber-200' 
                              : 'bg-green-50 text-green-700 border-green-200'
                            }
                          >
                            {customer.isPotential ? t('yes') : t('no')}
                          </Badge>
                        </TableCell>
                        <TableCell className={customer.totalDebt > 0 ? "font-medium text-red-700" : "font-medium"}>
                          {formatCurrency(customer.totalDebt || 0)}
                          {customer.totalDebt > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="inline-block h-4 w-4 ml-1 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('total_debt_description')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(customer.totalPurchases || 0)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                              onClick={() => openAddDebtDialog(customer)}
                              title={t('add_debt')}
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:text-green-800 hover:bg-green-50"
                              onClick={() => openReduceDebtDialog(customer)}
                              title={t('reduce_debt')}
                            >
                              <Wallet className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              onClick={() => onEditCustomer(customer)}
                              title={t('edit_customer')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                              onClick={() => viewHistory(customer)}
                              title={t('view_history')}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:text-green-800 hover:bg-green-50"
                              onClick={() => openWhatsApp(customer)}
                              disabled={!customer.phone}
                              title={t('send_whatsapp')}
                            >
                              <MessageSquareShare className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-violet-600 hover:text-violet-800 hover:bg-violet-50"
                              onClick={() => viewDebtHistory(customer)}
                              title={t('view_debt_history')}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m18 9-2 2-6-6"/></svg>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        
        {totalPages > 1 && (
          <CardFooter className="border-t p-4">
            <div className="w-full flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {t('showing')} <span className="font-medium">{startIndex + 1}</span> {t('to')} <span className="font-medium">
                  {Math.min(startIndex + perPage, filteredCustomers.length)}
                </span> {t('of')} <span className="font-medium">{filteredCustomers.length}</span> {t('customers')}
              </div>
              
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'hover:bg-muted'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                    // Handle pagination for more than 5 pages
                    let pageNum = i + 1;
                    if (totalPages > 5) {
                      if (currentPage > 3 && currentPage < totalPages - 1) {
                        pageNum = i + currentPage - 2;
                        if (i === 0) pageNum = 1;
                        if (i === 4) pageNum = totalPages;
                      } else if (currentPage >= totalPages - 1) {
                        pageNum = totalPages - 4 + i;
                      }
                    }
                    
                    return (
                      <PaginationItem key={i}>
                        <PaginationLink
                          onClick={() => handlePageChange(pageNum)}
                          isActive={currentPage === pageNum}
                          className={currentPage === pageNum ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'hover:bg-muted'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </CardFooter>
        )}
      </Card>
      
      {/* Customer History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {t('purchase_history')} - {selectedCustomer?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedCustomer?.phone && <div>{selectedCustomer.phone}</div>}
              {selectedCustomer?.address && <div>{selectedCustomer.address}</div>}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead>{t('invoice')}</TableHead>
                  <TableHead className="text-right">{t('amount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingHistory ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      <div className="flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : purchaseHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-neutral-500">
                      {t('no_purchase_history')}
                    </TableCell>
                  </TableRow>
                ) : (
                  purchaseHistory.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>{purchase.date}</TableCell>
                      <TableCell>{purchase.invoiceNumber}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(purchase.total)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {purchaseHistory.length > 0 && (
                <tfoot>
                  <tr className="border-t">
                    <td colSpan={2} className="py-2 px-4 text-right font-semibold">
                      {t('total')}:
                    </td>
                    <td className="py-2 px-4 text-right font-bold">
                      {formatCurrency(
                        purchaseHistory.reduce((sum, purchase) => sum + purchase.total, 0)
                      )}
                    </td>
                  </tr>
                </tfoot>
              )}
            </Table>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowHistory(false)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add Debt Dialog - Using New Component */}
      {selectedCustomer && (
        <AddDebtDialog
          customerId={Number(selectedCustomer.id)}
          customerName={selectedCustomer.name}
          isOpen={showAddDebtDialog}
          onClose={() => setShowAddDebtDialog(false)}
          onDebtAdded={onRefreshData}
        />
      )}

      {/* Reduce Debt Dialog - Using New Component */}
      {selectedCustomer && (
        <ReduceDebtDialog
          customerId={Number(selectedCustomer.id)}
          customerName={selectedCustomer.name}
          totalDebt={selectedCustomer.totalDebt || 0}
          isOpen={showReduceDebtDialog}
          onClose={() => setShowReduceDebtDialog(false)}
          onDebtReduced={onRefreshData}
        />
      )}

      {/* مربع حوار سجل المديونية - تم التحديث لاستخدام المكون الجديد */}
      <Dialog open={showDebtHistory} onOpenChange={setShowDebtHistory}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">{t('debt_history')}</DialogTitle>
            <DialogDescription className="text-center">
              {selectedCustomer && (
                <span className="font-semibold text-primary">{selectedCustomer.name}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <CustomerDebtHistory 
              customerId={Number(selectedCustomer.id)} 
              className="py-4"
            />
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowDebtHistory(false)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
