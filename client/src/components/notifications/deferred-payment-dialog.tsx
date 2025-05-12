import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DeferredPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: number | null;
  notificationId?: number; // إضافة معرّف الإشعار للحذف التلقائي
}

export function DeferredPaymentDialog({ 
  open, 
  onOpenChange,
  invoiceId,
  notificationId
}: DeferredPaymentDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customer, setCustomer] = useState<any>(null);
  const [productsData, setProductsData] = useState<any[]>([]);

  // Consultar detalles de la factura
  const { 
    data: invoice, 
    isLoading,
    error,
    refetch 
  } = useQuery({
    queryKey: ['/api/invoices', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const res = await apiRequest('GET', `/api/invoices/${invoiceId}`);
      return await res.json();
    },
    enabled: !!invoiceId && open,
  });

  // Procesar los datos de la factura cuando se cargan
  useEffect(() => {
    if (invoice) {
      // Configurar información del cliente
      if (invoice.customerName) {
        setCustomer({
          name: invoice.customerName,
          phone: invoice.customerPhone || '',
          address: invoice.customerAddress || ''
        });
      }

      // Procesar datos de productos
      if (invoice.productsData) {
        try {
          const parsedProducts = JSON.parse(invoice.productsData);
          setProductsData(Array.isArray(parsedProducts) ? parsedProducts : []);
        } catch (e) {
          console.error('Error parsing products data:', e);
          setProductsData([]);
        }
      } else {
        setProductsData([]);
      }
    }
  }, [invoice]);

  // مُعرف للحذف التلقائي للإشعار
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      console.log('Deleting notification with ID:', notificationId);
      const response = await apiRequest('DELETE', `/api/notifications/${notificationId}`);
      if (response.status !== 204) {
        throw new Error('Error deleting notification');
      }
      return { success: true, id: notificationId };
    },
    onSuccess: (result) => {
      console.log('Successfully deleted notification:', result);
      // تحديث قائمة الإشعارات
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (error: Error) => {
      console.error('Delete notification error:', error);
    }
  });

  // Mutación para aprobar el pago diferido
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceId) throw new Error('No invoice ID provided');
      const res = await apiRequest('POST', `/api/payment-approvals/approve/${invoiceId}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: t('deferred_payment.approve_success'),
        description: '',
        variant: 'default',
      });
      
      // Invalidar consultas para actualizar los datos
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      
      // حذف الإشعار تلقائيًا إذا كان معرّف الإشعار متوفرًا
      if (notificationId) {
        deleteNotificationMutation.mutate(notificationId);
      }
      
      // Cerrar el diálogo
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error approving payment:', error);
      toast({
        title: t('deferred_payment.approve_error'),
        description: '',
        variant: 'destructive',
      });
    }
  });

  // Mutación para rechazar el pago diferido
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceId) throw new Error('No invoice ID provided');
      const res = await apiRequest('POST', `/api/payment-approvals/reject/${invoiceId}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: t('deferred_payment.reject_success'),
        description: '',
        variant: 'default',
      });
      
      // Invalidar consultas para actualizar los datos
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      
      // حذف الإشعار تلقائيًا إذا كان معرّف الإشعار متوفرًا
      if (notificationId) {
        deleteNotificationMutation.mutate(notificationId);
      }
      
      // Cerrar el diálogo
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error rejecting payment:', error);
      toast({
        title: t('deferred_payment.reject_error'),
        description: '',
        variant: 'destructive',
      });
    }
  });

  const handleApprove = () => {
    approveMutation.mutate();
  };

  const handleReject = () => {
    rejectMutation.mutate();
  };

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">{t('deferred_payment.dialog_title')}</DialogTitle>
          <DialogDescription>
            {t('deferred_payment.invoice_details')}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">{t('deferred_payment.loading')}</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-8 text-destructive">
            <AlertCircle className="h-8 w-8" />
            <p className="mt-2 text-sm">{t('deferred_payment.not_found')}</p>
          </div>
        )}

        {invoice && !isLoading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-sm">{t('invoice_number')}</h3>
                <p>{invoice.invoiceNumber}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm">{t('invoice_date')}</h3>
                <p>{new Date(invoice.date).toLocaleDateString()}</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-sm mb-2">{t('deferred_payment.customer')}</h3>
              {customer && (
                <div className="text-sm">
                  <p>{customer.name}</p>
                  {customer.phone && <p>{customer.phone}</p>}
                </div>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-sm mb-2">{t('deferred_payment.products')}</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {productsData.map((product, idx) => (
                  <div key={idx} className="text-sm flex justify-between">
                    <span>{product.productName} × {product.quantity}</span>
                    <span>{product.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex justify-between text-base font-medium">
              <span>{t('deferred_payment.total_amount')}</span>
              <span>{invoice.total.toFixed(2)}</span>
            </div>

            <div className="pt-2">
              <p className="text-sm text-center font-medium">{t('deferred_payment.approval_question')}</p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isPending || isLoading || !invoice}
            className="border-destructive text-destructive hover:bg-destructive/10"
          >
            {rejectMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            {t('deferred_payment.reject')}
          </Button>
          
          <Button
            onClick={handleApprove}
            disabled={isPending || isLoading || !invoice}
            className="bg-green-600 hover:bg-green-700"
          >
            {approveMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {t('deferred_payment.approve')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}