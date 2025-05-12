import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Search, Loader2, CreditCard, Check, CalendarClock,
  MessageSquare, MessageSquareShare, DollarSign, AlertCircle
} from 'lucide-react';
import { useLocale } from '@/hooks/use-locale';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatCurrency, createWhatsAppLink } from '@/lib/utils';

// UI Components
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

// تعريف الواجهات
interface DeferredPayment {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  invoiceId: string;
  invoiceNumber: string;
  originalAmount: number;
  remainingAmount: number;
  lastPaymentDate: string | null;
  dueDate: string | null;
  status: string; // 'pending' | 'partially_paid' | 'paid' | 'approved'
}

interface PaymentDialogState {
  isOpen: boolean;
  payment: DeferredPayment | null;
  amountToPay: number;
  paymentMethod: 'cash' | 'card' | 'transfer';
  notes: string;
}

interface ReminderDialogState {
  isOpen: boolean;
  payment: DeferredPayment | null;
  message: string;
}

export default function DeferredPaymentsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { language } = useLocale();
  const isRtl = language === 'ar';
  
  // حالة البحث والصفحات
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;
  
  // حالة نافذة الدفع
  const [paymentDialog, setPaymentDialog] = useState<PaymentDialogState>({
    isOpen: false,
    payment: null,
    amountToPay: 0,
    paymentMethod: 'cash',
    notes: ''
  });
  
  // حالة نافذة التذكير
  const [reminderDialog, setReminderDialog] = useState<ReminderDialogState>({
    isOpen: false,
    payment: null,
    message: ''
  });

  // استعلام للحصول على جميع الفواتير المؤجلة (بحالة الدفع pending أو وسيلة الدفع later)
  const { data: deferredPayments = [], isLoading, refetch } = useQuery<DeferredPayment[]>({
    queryKey: ['/api/deferred-payments'],
    queryFn: async () => {
      try {
        // استعلام عن الفواتير المؤجلة
        const response = await apiRequest('GET', '/api/deferred-payments');
        const data = await response.json();
        console.log('Deferred payments data received:', data);
        return data;
      } catch (error) {
        console.error('Error fetching deferred payments:', error);
        return [];
      }
    },
    refetchInterval: 60000, // تحديث كل دقيقة
  });

  // تصفية المدفوعات المؤجلة بناءً على البحث
  console.log('Current deferred payments:', deferredPayments);
  const filteredPayments = deferredPayments.length > 0 ? deferredPayments.filter(payment => 
    (payment.customerName && payment.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (payment.invoiceNumber && payment.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];

  // حساب الصفحات
  const totalPages = Math.ceil(filteredPayments.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const currentPayments = filteredPayments.slice(startIndex, startIndex + perPage);

  // تغيير الصفحة
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // فتح نافذة الدفع
  const openPaymentDialog = (payment: DeferredPayment) => {
    setPaymentDialog({
      isOpen: true,
      payment,
      amountToPay: payment.remainingAmount,
      paymentMethod: 'cash',
      notes: ''
    });
  };

  // فتح نافذة التذكير
  const openReminderDialog = (payment: DeferredPayment) => {
    // تحضير رسالة افتراضية
    const defaultMessage = t('deferred_payment_reminder_template', {
      customerName: payment.customerName,
      invoiceNumber: payment.invoiceNumber,
      amount: formatCurrency(payment.remainingAmount),
      storeName: 'Sales Ghazy'
    });

    setReminderDialog({
      isOpen: true,
      payment,
      message: defaultMessage
    });
  };

  // إرسال تذكير عبر واتساب
  const sendWhatsAppReminder = () => {
    if (!reminderDialog.payment || !reminderDialog.payment.customerPhone) {
      toast({
        title: t('error'),
        description: t('customer_has_no_phone'),
        variant: 'destructive'
      });
      return;
    }

    const whatsappLink = createWhatsAppLink(
      reminderDialog.payment.customerPhone, 
      reminderDialog.message
    );
    
    window.open(whatsappLink, '_blank');
    
    // تسجيل التذكير في قاعدة البيانات (اختياري)
    logReminderMutation.mutate({
      customerId: reminderDialog.payment.customerId,
      invoiceId: reminderDialog.payment.invoiceId,
      message: reminderDialog.message,
      channel: 'whatsapp'
    });
    
    setReminderDialog(prev => ({ ...prev, isOpen: false }));
    
    toast({
      title: t('reminder_sent'),
      description: t('whatsapp_reminder_sent')
    });
  };

  // تسجيل عملية التذكير - mutation
  const logReminderMutation = useMutation({
    mutationFn: async (reminderData: {
      customerId: string;
      invoiceId: string;
      message: string;
      channel: string;
    }) => {
      const response = await apiRequest('POST', '/api/payment-reminders', reminderData);
      return await response.json();
    },
    onError: (error) => {
      console.error('Error logging reminder:', error);
    }
  });

  // تسجيل دفعة جديدة - mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (paymentData: {
      invoiceId: string;
      amount: number;
      paymentMethod: string;
      notes: string;
    }) => {
      const response = await apiRequest('POST', '/api/record-payment', paymentData);
      return await response.json();
    },
    onSuccess: () => {
      // تحديث قائمة المدفوعات المؤجلة
      refetch();
      
      setPaymentDialog(prev => ({ ...prev, isOpen: false }));
      
      toast({
        title: t('payment_recorded'),
        description: t('payment_recorded_successfully')
      });
    },
    onError: (error) => {
      console.error('Error recording payment:', error);
      toast({
        title: t('error'),
        description: t('error_recording_payment'),
        variant: 'destructive'
      });
    }
  });

  // تسجيل دفعة
  const handleRecordPayment = () => {
    if (!paymentDialog.payment) return;
    
    if (paymentDialog.amountToPay <= 0) {
      toast({
        title: t('validation_error'),
        description: t('amount_must_be_positive'),
        variant: 'destructive'
      });
      return;
    }
    
    if (paymentDialog.amountToPay > paymentDialog.payment.remainingAmount) {
      toast({
        title: t('validation_error'),
        description: t('amount_exceeds_remaining'),
        variant: 'destructive'
      });
      return;
    }
    
    recordPaymentMutation.mutate({
      invoiceId: paymentDialog.payment.invoiceId,
      amount: paymentDialog.amountToPay,
      paymentMethod: paymentDialog.paymentMethod,
      notes: paymentDialog.notes
    });
  };

  // الحصول على لون وصفة حالة الدفع
  const getStatusBadgeProps = (status: string) => {
    switch (status) {
      case 'pending':
        return { 
          variant: 'outline' as const, 
          className: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <AlertCircle className="mr-1 h-3 w-3" />
        };
      case 'partially_paid':
        return { 
          variant: 'outline' as const, 
          className: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <DollarSign className="mr-1 h-3 w-3" />
        };
      case 'paid':
        return { 
          variant: 'outline' as const, 
          className: 'bg-green-50 text-green-700 border-green-200',
          icon: <Check className="mr-1 h-3 w-3" />
        };
      case 'approved':
        return { 
          variant: 'outline' as const, 
          className: 'bg-violet-50 text-violet-700 border-violet-200',
          icon: <CalendarClock className="mr-1 h-3 w-3" />
        };
      default:
        return { 
          variant: 'outline' as const, 
          className: 'bg-gray-50 text-gray-700 border-gray-200',
          icon: null
        };
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <CardTitle>{t('deferred_payments')}</CardTitle>
          <div className="relative">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('search_deferred_payments')}
              className="w-full md:w-[300px] pr-8"
            />
            <Search className="absolute right-2 top-2 h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {filteredPayments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/70" />
                <p>{t('no_deferred_payments_found')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-semibold">{t('customer')}</TableHead>
                      <TableHead className="font-semibold">{t('invoice')}</TableHead>
                      <TableHead className="font-semibold">{t('original_amount')}</TableHead>
                      <TableHead className="font-semibold">{t('remaining_amount')}</TableHead>
                      <TableHead className="font-semibold">{t('status')}</TableHead>
                      <TableHead className="font-semibold text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPayments.map((payment, index) => (
                      <TableRow 
                        key={payment.id}
                        className={index % 2 === 0 ? 'bg-muted/20' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                              {payment.customerName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{payment.customerName}</p>
                              <p className="text-sm text-muted-foreground">{payment.customerPhone || t('no_phone')}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{payment.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : t('no_due_date')}
                          </p>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(payment.originalAmount)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`font-medium ${
                              payment.remainingAmount === 0 
                                ? "text-green-600"
                                : payment.remainingAmount < payment.originalAmount
                                  ? "text-blue-600"
                                  : "text-amber-600"
                            }`}>
                              {formatCurrency(payment.remainingAmount)}
                            </div>
                            {payment.remainingAmount < payment.originalAmount && payment.remainingAmount > 0 && (
                              <div className="text-xs text-muted-foreground">
                                ({Math.round((1 - payment.remainingAmount / payment.originalAmount) * 100)}% {t('paid')})
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge {...getStatusBadgeProps(payment.status)}>
                            {getStatusBadgeProps(payment.status).icon}
                            {t(payment.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:text-green-800 hover:bg-green-50"
                              onClick={() => openPaymentDialog(payment)}
                              disabled={payment.status === 'paid'}
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              onClick={() => openReminderDialog(payment)}
                              disabled={!payment.customerPhone || payment.status === 'paid'}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
      
      {totalPages > 1 && (
        <CardFooter className="border-t p-4">
          <div className="w-full flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {t('showing')} <span className="font-medium">{startIndex + 1}</span> {t('to')} <span className="font-medium">
                {Math.min(startIndex + perPage, filteredPayments.length)}
              </span> {t('of')} <span className="font-medium">{filteredPayments.length}</span> {t('payments')}
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
      
      {/* نافذة تسجيل دفعة */}
      <Dialog open={paymentDialog.isOpen} onOpenChange={(open) => setPaymentDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              {t('record_payment')}
            </DialogTitle>
            <DialogDescription>
              {paymentDialog.payment && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-xs text-muted-foreground">{t('invoice')}</p>
                      <p className="font-medium">{paymentDialog.payment.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('customer')}</p>
                      <p className="font-medium">{paymentDialog.payment.customerName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('original_amount')}</p>
                      <p className="font-medium">{formatCurrency(paymentDialog.payment.originalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('remaining_amount')}</p>
                      <p className="font-medium text-amber-600">{formatCurrency(paymentDialog.payment.remainingAmount)}</p>
                    </div>
                  </div>
                  
                  {paymentDialog.payment.status === 'partially_paid' && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-sm">
                      <p className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        {Math.round((1 - paymentDialog.payment.remainingAmount / paymentDialog.payment.originalAmount) * 100)}% 
                        {t('already_paid')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-3">
              <Label htmlFor="amount" className="text-base">{t('amount_to_pay')}</Label>
              <div className="relative">
                <DollarSign className={`absolute ${isRtl ? 'right-2' : 'left-2'} top-2.5 h-5 w-5 text-muted-foreground`} />
                <Input
                  id="amount"
                  type="number"
                  value={paymentDialog.amountToPay}
                  onChange={(e) => setPaymentDialog(prev => ({ 
                    ...prev, 
                    amountToPay: parseFloat(e.target.value) || 0 
                  }))}
                  className={`${isRtl ? 'pr-9' : 'pl-9'} text-lg font-medium h-11`}
                />
              </div>
              <div className="flex justify-between gap-2">
                <Button 
                  variant="outline" 
                  type="button" 
                  size="sm"
                  className="flex-1 border-primary/20 bg-primary/5 hover:bg-primary/10"
                  onClick={() => {
                    if (paymentDialog.payment) {
                      setPaymentDialog(prev => ({ ...prev, amountToPay: paymentDialog.payment!.remainingAmount }));
                    }
                  }}
                >
                  <Check className="mr-1 h-4 w-4" />
                  {t('full_amount')}
                </Button>
                <Button 
                  variant="outline" 
                  type="button" 
                  size="sm"
                  className="flex-1 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700"
                  onClick={() => {
                    if (paymentDialog.payment) {
                      setPaymentDialog(prev => ({ ...prev, amountToPay: paymentDialog.payment!.remainingAmount / 2 }));
                    }
                  }}
                >
                  <DollarSign className="mr-1 h-4 w-4" />
                  {t('half_amount')}
                </Button>
              </div>
            </div>
            
            <div className="grid gap-3">
              <Label htmlFor="paymentMethod" className="text-base">{t('payment_method')}</Label>
              <div className="flex items-center space-x-3 p-3 rounded-lg border bg-card">
                <div 
                  className={`flex-1 cursor-pointer flex flex-col items-center justify-center py-2 px-1 rounded-md transition-colors ${
                    paymentDialog.paymentMethod === 'cash' ? 'bg-green-50 ring-1 ring-green-200' : 'hover:bg-muted'
                  }`}
                  onClick={() => setPaymentDialog(prev => ({ ...prev, paymentMethod: 'cash' }))}
                >
                  <BanknoteIcon className={`h-6 w-6 mb-1 ${paymentDialog.paymentMethod === 'cash' ? 'text-green-600' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${paymentDialog.paymentMethod === 'cash' ? 'text-green-700' : ''}`}>{t('cash')}</span>
                </div>
                <div 
                  className={`flex-1 cursor-pointer flex flex-col items-center justify-center py-2 px-1 rounded-md transition-colors ${
                    paymentDialog.paymentMethod === 'card' ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-muted'
                  }`}
                  onClick={() => setPaymentDialog(prev => ({ ...prev, paymentMethod: 'card' }))}
                >
                  <CreditCard className={`h-6 w-6 mb-1 ${paymentDialog.paymentMethod === 'card' ? 'text-blue-600' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${paymentDialog.paymentMethod === 'card' ? 'text-blue-700' : ''}`}>{t('card')}</span>
                </div>
                <div 
                  className={`flex-1 cursor-pointer flex flex-col items-center justify-center py-2 px-1 rounded-md transition-colors ${
                    paymentDialog.paymentMethod === 'transfer' ? 'bg-violet-50 ring-1 ring-violet-200' : 'hover:bg-muted'
                  }`}
                  onClick={() => setPaymentDialog(prev => ({ ...prev, paymentMethod: 'transfer' }))}
                >
                  <ArrowRightLeft className={`h-6 w-6 mb-1 ${paymentDialog.paymentMethod === 'transfer' ? 'text-violet-600' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${paymentDialog.paymentMethod === 'transfer' ? 'text-violet-700' : ''}`}>{t('bank_transfer')}</span>
                </div>
              </div>
            </div>
            
            <div className="grid gap-3">
              <Label htmlFor="notes" className="flex justify-between items-center text-base">
                {t('notes')}
                <span className="text-xs text-muted-foreground">{t('optional')}</span>
              </Label>
              <Textarea
                id="notes"
                value={paymentDialog.notes}
                onChange={(e) => setPaymentDialog(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t('payment_notes_placeholder')}
                className="min-h-[80px]"
              />
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => setPaymentDialog(prev => ({ ...prev, isOpen: false }))}
              className="sm:flex-1"
            >
              <X className="mr-2 h-4 w-4" />
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleRecordPayment}
              disabled={recordPaymentMutation.isPending || paymentDialog.amountToPay <= 0}
              className="sm:flex-1 gap-2 bg-green-600 hover:bg-green-700"
            >
              {recordPaymentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('processing')}
                </>
              ) : (
                <>
                  <BadgeCheck className="h-4 w-4" />
                  {t('record_payment')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* نافذة إرسال تذكير */}
      <Dialog open={reminderDialog.isOpen} onOpenChange={(open) => setReminderDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              {t('send_payment_reminder')}
            </DialogTitle>
            <DialogDescription>
              {reminderDialog.payment && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-xs text-muted-foreground">{t('customer')}</p>
                      <p className="font-medium">{reminderDialog.payment.customerName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('phone')}</p>
                      <p className="font-medium">{reminderDialog.payment.customerPhone || t('no_phone')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('original_amount')}</p>
                      <p className="font-medium">{formatCurrency(reminderDialog.payment.originalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('remaining_amount')}</p>
                      <p className="font-medium text-amber-600">{formatCurrency(reminderDialog.payment.remainingAmount)}</p>
                    </div>
                  </div>
                  
                  {!reminderDialog.payment.customerPhone && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 text-sm">
                      <p className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {t('customer_no_phone_warning')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-3">
              <Label htmlFor="message" className="flex justify-between items-center text-base">
                {t('message')}
                <span className="text-xs text-muted-foreground">{t('whatsapp_message')}</span>
              </Label>
              <Textarea
                id="message"
                value={reminderDialog.message}
                onChange={(e) => setReminderDialog(prev => ({ ...prev, message: e.target.value }))}
                placeholder={t('reminder_message_placeholder')}
                className="min-h-[120px]"
              />
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => setReminderDialog(prev => ({ ...prev, isOpen: false }))}
              className="sm:flex-1"
            >
              <X className="mr-2 h-4 w-4" />
              {t('cancel')}
            </Button>
            <Button 
              onClick={sendWhatsAppReminder}
              disabled={!reminderDialog.payment?.customerPhone}
              className="sm:flex-1 gap-2 bg-green-600 hover:bg-green-700"
            >
              <MessageSquareShare className="h-4 w-4" />
              {t('send_whatsapp')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}