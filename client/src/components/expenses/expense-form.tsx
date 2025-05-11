import React from 'react';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Expense {
  id: number;
  date: Date;
  amount: number;
  details: string;
  userId: number;
}

interface ExpenseFormProps {
  expense: Expense | null;
  onClose: () => void;
  onSubmit: (expense: any) => void;
}

export default function ExpenseForm({ expense, onClose, onSubmit }: ExpenseFormProps) {
  const { t } = useTranslation();
  
  // إنشاء مخطط التحقق
  const formSchema = z.object({
    id: z.number().optional(),
    amount: z.coerce.number()
      .positive({ message: t('amount_must_be_positive') }),
    details: z.string()
      .min(3, { message: t('details_min_length') })
      .max(500, { message: t('details_max_length') }),
    date: z.date({
      required_error: t('date_required'),
    }),
  });

  // استخدام React Hook Form مع التحقق بواسطة Zod
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: expense?.id,
      amount: expense?.amount || 0,
      details: expense?.details || '',
      date: expense?.date ? new Date(expense.date) : new Date(),
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit({
      ...values,
      // إذا كان هناك تعديل على مصروف موجود، نرسل نفس المعرف
      ...(expense?.id ? { id: expense.id } : {})
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {expense ? t('edit_expense') : t('add_expense')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('date')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "yyyy-MM-dd")
                          ) : (
                            <span>{t('pick_date')}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('amount')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('details')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('expense_details_placeholder')}
                      className="resize-none min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                {t('cancel')}
              </Button>
              <Button 
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {expense ? t('save_changes') : t('add')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}