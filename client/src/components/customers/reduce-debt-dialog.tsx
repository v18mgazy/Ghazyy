import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useReduceCustomerDebt } from '@/hooks/use-customer-debts';
import { formatCurrency } from '@/lib/utils';

interface ReduceDebtDialogProps {
  customerId: number;
  customerName: string;
  totalDebt: number;
  isOpen: boolean;
  onClose: () => void;
  onDebtReduced?: () => void;
}

// نموذج التحقق من الصحة
const formSchema = z.object({
  amount: z.coerce.number().positive({ message: 'المبلغ يجب أن يكون أكبر من الصفر' }),
  reason: z.string().min(3, { message: 'السبب يجب أن يكون على الأقل 3 أحرف' }).max(200),
});

type FormValues = z.infer<typeof formSchema>;

export default function ReduceDebtDialog({ 
  customerId, 
  customerName, 
  totalDebt,
  isOpen, 
  onClose,
  onDebtReduced
}: ReduceDebtDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reduceDebtMutation = useReduceCustomerDebt();
  
  // إعداد نموذج React Hook Form مع التحقق من الصحة باستخدام Zod
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      reason: '',
    },
  });

  // إعادة تعيين النموذج عند الإغلاق
  const handleClose = () => {
    form.reset();
    onClose();
  };

  // معالجة إرسال النموذج
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      await reduceDebtMutation.mutateAsync({
        customerId,
        // نخزن مبلغ السداد كقيمة سالبة لأنه يقلل الدين
        amount: -values.amount,
        reason: values.reason,
        createdBy: 1, // المستخدم الحالي، يمكن استبداله بمعرف المستخدم الفعلي
      });
      
      // إعادة تعيين النموذج وإغلاق مربع الحوار
      form.reset();
      
      // استدعاء وظيفة التحديث الخارجية إذا تم تقديمها
      if (onDebtReduced) {
        onDebtReduced();
      }
      
      onClose();
    } catch (error) {
      console.error('Error reducing debt:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center">{t('reduce_debt')}</DialogTitle>
          <DialogDescription className="text-center">
            <span className="font-semibold text-primary">{customerName}</span>
            <div className="mt-2">
              <span className="font-medium">{t('current_debt')}: </span>
              <span className={`font-bold ${totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(totalDebt)}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('payment_amount')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={totalDebt}
                      placeholder={t('enter_payment_amount')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('payment_reason')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('enter_payment_reason')}
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button 
                variant="outline" 
                type="button" 
                onClick={handleClose}
                disabled={isSubmitting}
              >
                {t('cancel')}
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting || !form.formState.isValid}
                variant="default"
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? t('saving') : t('save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}