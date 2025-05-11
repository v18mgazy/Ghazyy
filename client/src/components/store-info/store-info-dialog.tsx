import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// تعريف مخطط البيانات
const storeInfoSchema = z.object({
  name: z.string().min(2, 'اسم المتجر يجب أن يكون حرفين على الأقل'),
  address: z.string().min(3, 'عنوان المتجر يجب أن يكون 3 أحرف على الأقل'),
  phone: z.string().min(5, 'رقم الهاتف يجب أن يكون 5 أرقام على الأقل')
});

type StoreInfoFormData = z.infer<typeof storeInfoSchema>;

interface StoreInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StoreInfoDialog({ isOpen, onClose }: StoreInfoDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // استعلام لجلب بيانات المتجر الحالية
  const { data: storeInfo, isLoading } = useQuery({
    queryKey: ['/api/store-info'],
    queryFn: async () => {
      const res = await fetch('/api/store-info');
      if (!res.ok) throw new Error('Failed to fetch store information');
      return res.json();
    }
  });

  // إعداد نموذج الإدخال
  const form = useForm<StoreInfoFormData>({
    resolver: zodResolver(storeInfoSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: ''
    }
  });

  // تحديث النموذج عند استلام البيانات
  useEffect(() => {
    if (storeInfo) {
      form.reset({
        name: storeInfo.name,
        address: storeInfo.address,
        phone: storeInfo.phone
      });
    }
  }, [storeInfo, form]);

  // mutation لتحديث بيانات المتجر
  const updateStoreInfoMutation = useMutation({
    mutationFn: async (data: StoreInfoFormData) => {
      const res = await apiRequest('POST', '/api/store-info', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('success'),
        description: t('store_info_updated_successfully'),
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/store-info'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: t('failed_to_update_store_info'),
        variant: 'destructive',
      });
      console.error('Error updating store info:', error);
    }
  });

  // معالج تقديم النموذج
  const onSubmit = (data: StoreInfoFormData) => {
    updateStoreInfoMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('store_information')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('store_name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('store_address')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('store_phone')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                {t('cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || updateStoreInfoMutation.isPending}
              >
                {t('save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}