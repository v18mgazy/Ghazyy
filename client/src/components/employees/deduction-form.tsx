import React from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// تعريف نموذج للخصم
const deductionSchema = z.object({
  amount: z.number().positive({ message: 'يجب أن تكون قيمة الخصم أكبر من صفر' }),
  reason: z.string().min(3, { message: 'يجب إدخال سبب الخصم (3 أحرف على الأقل)' }),
});

type DeductionFormValues = z.infer<typeof deductionSchema>;

interface DeductionFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (deduction: { amount: number; reason: string }) => void;
  employeeName: string; // اسم الموظف للعرض
}

export default function DeductionForm({
  open,
  onClose,
  onSave,
  employeeName,
}: DeductionFormProps) {
  const { t } = useTranslation();

  const form = useForm<DeductionFormValues>({
    resolver: zodResolver(deductionSchema),
    defaultValues: {
      amount: 0,
      reason: '',
    },
  });

  const onSubmit = (data: DeductionFormValues) => {
    console.log('Form submitted with data:', data);
    console.log('Amount type:', typeof data.amount);
    
    onSave({
      amount: Number(data.amount), // تأكد من أن المبلغ هو رقم
      reason: data.reason,
    });
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {t('add_deduction_for')} {employeeName}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('deduction_amount')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={field.value}
                      onChange={(e) => {
                        const value = e.target.value;
                        console.log('Input value:', value);
                        const numValue = parseFloat(value) || 0;
                        console.log('Parsed value:', numValue);
                        field.onChange(numValue);
                      }}
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
                  <FormLabel>{t('deduction_reason')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('enter_deduction_reason')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t('cancel')}
              </Button>
              <Button type="submit">{t('save')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}