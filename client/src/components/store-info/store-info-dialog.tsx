import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Store } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Define the schema for form validation
const storeInfoSchema = z.object({
  name: z.string().min(2, "اسم المتجر يجب أن يكون حرفين على الأقل"),
  address: z.string().min(3, "عنوان المتجر يجب أن يكون 3 أحرف على الأقل"),
  phone: z.string().min(5, "رقم الهاتف يجب أن يكون 5 أرقام على الأقل")
});

type StoreInfoFormData = z.infer<typeof storeInfoSchema>;

interface StoreInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StoreInfoDialog({ isOpen, onClose }: StoreInfoDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Define form with validation schema
  const form = useForm<StoreInfoFormData>({
    resolver: zodResolver(storeInfoSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: ''
    }
  });
  
  // Query to fetch existing store info
  const { data: storeInfo, isLoading } = useQuery({
    queryKey: ['/api/store-info'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/store-info');
        if (response.ok) {
          return await response.json();
        }
        return null;
      } catch (error) {
        console.error('Error fetching store info:', error);
        return null;
      }
    },
    enabled: isOpen
  });
  
  // Update form values when store info is loaded
  useEffect(() => {
    if (storeInfo) {
      form.reset({
        name: storeInfo.name || '',
        address: storeInfo.address || '',
        phone: storeInfo.phone || ''
      });
    }
  }, [storeInfo, form]);
  
  // Mutation to update store info
  const mutation = useMutation({
    mutationFn: async (data: StoreInfoFormData) => {
      const response = await apiRequest('POST', '/api/store-info', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: t('success'),
        description: t('store_info_updated'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/store-info'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('failed_to_update_store_info'),
        variant: 'destructive'
      });
    }
  });
  
  const onSubmit = (data: StoreInfoFormData) => {
    mutation.mutate(data);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            <span>{t('edit_store_info')}</span>
          </DialogTitle>
          <DialogDescription>
            {t('store_info_description')}
          </DialogDescription>
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
                    <Input placeholder={t('enter_store_name')} {...field} />
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
                  <FormLabel>{t('address')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('enter_address')} {...field} />
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
                  <FormLabel>{t('phone')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('enter_phone')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                className="relative"
              >
                {mutation.isPending && (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/60 rounded-md">
                    <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                  </div>
                )}
                {t('save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}