import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, XCircle, Loader2, ReceiptText, User, Calendar, CreditCard, Banknote
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';

interface DeferredPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: number | null;
}

export function DeferredPaymentDialog({ 
  open,
  onOpenChange,
  invoiceId
}: DeferredPaymentDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // استعلام لجلب تفاصيل الفاتورة
  const {
    data: invoice,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['/api/invoices', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const response = await fetch(`/api/invoices/${invoiceId}`);
      if (!response.ok) {
        throw new Error('فشل في الحصول على بيانات الفاتورة');
      }
      return await response.json();
    },
    enabled: !!invoiceId && open,
  });
  
  // mutation للموافقة على الدفع الآجل
  const approveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/payment-approvals/approve/${invoiceId}`, {
        status: 'approved'
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: t('success'),
        description: t('payment_approval_success'),
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('payment_approval_error'),
        variant: 'destructive'
      });
    }
  });
  
  // mutation لرفض الدفع الآجل
  const rejectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/payment-approvals/reject/${invoiceId}`, {
        status: 'rejected'
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: t('success'),
        description: t('payment_rejection_success'),
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('payment_rejection_error'),
        variant: 'destructive'
      });
    }
  });
  
  // معالج الموافقة
  const handleApprove = () => {
    approveMutation.mutate();
  };
  
  // معالج الرفض
  const handleReject = () => {
    rejectMutation.mutate();
  };
  
  // تحويل حالة عملية الدفع إلى نص
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-success-light text-success-DEFAULT">{t('paid')}</Badge>;
      case 'pending':
        return <Badge className="bg-warning-light text-warning-DEFAULT">{t('pending')}</Badge>;
      case 'approved':
        return <Badge className="bg-primary-light text-primary-DEFAULT">{t('approved')}</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/20 text-destructive">{t('rejected')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  // تحويل طريقة الدفع إلى نص
  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return <Badge className="bg-blue-100 text-blue-800">{t('cash')}</Badge>;
      case 'card':
        return <Badge className="bg-purple-100 text-purple-800">{t('card')}</Badge>;
      case 'deferred':
        return <Badge className="bg-yellow-100 text-yellow-800">{t('pay_later')}</Badge>;
      default:
        return <Badge>{method}</Badge>;
    }
  };
  
  // تحويل المنتجات من JSON إلى كائن
  const parseProductsData = (productsData: string) => {
    try {
      return JSON.parse(productsData || '[]');
    } catch (e) {
      console.error('Error parsing products data:', e);
      return [];
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            <span>{t('deferred_payment_request')}</span>
          </DialogTitle>
          <DialogDescription>
            {t('approve_or_reject_deferred_payment')}
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="p-4 text-center text-destructive">
            <p>{t('invoice_load_error')}</p>
            <p className="text-sm mt-1">{String(error)}</p>
          </div>
        ) : invoice ? (
          <div className="space-y-6">
            {/* معلومات الفاتورة */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <ReceiptText className="h-4 w-4 text-muted-foreground" />
                  {t('invoice_details')}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('invoice_number')}:</p>
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('date')}:</p>
                    <p className="font-medium">{formatDate(invoice.date)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('payment_method')}:</p>
                    <p>{getPaymentMethodBadge(invoice.paymentMethod)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('status')}:</p>
                    <p>{getStatusBadge(invoice.paymentStatus)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {t('customer_details')}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('name')}:</p>
                    <p className="font-medium">{invoice.customerName}</p>
                  </div>
                  {invoice.customerPhone && (
                    <div>
                      <p className="text-muted-foreground">{t('phone')}:</p>
                      <p className="font-medium">{invoice.customerPhone}</p>
                    </div>
                  )}
                  {invoice.customerAddress && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">{t('address')}:</p>
                      <p className="font-medium">{invoice.customerAddress}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* قائمة المنتجات */}
            <div>
              <h3 className="font-medium mb-2">{t('invoice_items')}</h3>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('product')}</TableHead>
                      <TableHead className="text-center">{t('quantity')}</TableHead>
                      <TableHead className="text-right">{t('price')}</TableHead>
                      <TableHead className="text-right">{t('total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parseProductsData(invoice.productsData).map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            {/* ملخص المبالغ */}
            <div className="flex justify-end">
              <div className="w-64 bg-muted/30 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('subtotal')}:</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                
                {invoice.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('discount')}:</span>
                    <span>{formatCurrency(invoice.discount)}</span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between font-bold">
                  <span>{t('total')}:</span>
                  <span className="text-primary">{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>
            
            {/* ملاحظات */}
            {invoice.notes && (
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-medium mb-2">{t('notes')}</h3>
                <p className="text-sm">{invoice.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            {t('no_invoice_selected')}
          </div>
        )}
        
        <DialogFooter className="gap-2 flex-row-reverse sm:justify-between mt-6">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('close')}
            </Button>
          </div>
          
          {invoice && invoice.paymentStatus === 'pending' && (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejectMutation.isPending}
                className="relative"
              >
                {rejectMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {t('reject')}
              </Button>
              <Button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="relative bg-success-DEFAULT hover:bg-success-DEFAULT/90"
              >
                {approveMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {t('approve')}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}