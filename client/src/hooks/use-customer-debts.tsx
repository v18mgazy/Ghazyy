import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import { t } from "i18next";

// تعريف نوع بيانات الدين
export interface CustomerDebt {
  id: number;
  customerId: number;
  amount: number;
  reason: string;
  date: string;
  invoiceId: number | null;
  createdBy: number;
  createdAt: string;
}

// تعريف نوع بيانات استجابة API
export interface CustomerDebtsResponse {
  debts: CustomerDebt[];
  totalDebt: number;
}

// هوك للحصول على بيانات ديون العميل
export function useCustomerDebts(customerId: number | null) {
  return useQuery({
    queryKey: ['customer-debts', customerId],
    queryFn: async () => {
      if (!customerId) return { debts: [], totalDebt: 0 };
      
      const response = await apiRequest('GET', `/api/customer-debts/${customerId}`);
      const data = await response.json();
      
      return data as CustomerDebtsResponse;
    },
    // لا تنفذ الاستعلام إذا لم يكن هناك معرف للعميل
    enabled: !!customerId
  });
}

// هوك لإضافة دين جديد للعميل
export function useAddCustomerDebt() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (debtData: { 
      customerId: number; 
      amount: number; 
      reason: string;
      createdBy: number;
    }) => {
      const response = await apiRequest('POST', '/api/customer-debts', debtData);
      return await response.json();
    },
    onSuccess: (_data, variables) => {
      // إبطال الاستعلامات ذات الصلة لتحديث البيانات
      queryClient.invalidateQueries({ queryKey: ['customer-debts', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      
      toast({
        title: t('success'),
        description: t('debt_added_success'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('debt_added_error'),
        variant: 'destructive',
      });
    },
  });
}

// هوك لتخفيض دين العميل (تسجيل دفعة)
export function useReduceCustomerDebt() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (debtData: { 
      customerId: number; 
      amount: number; 
      reason: string;
      createdBy: number;
    }) => {
      // تحويل القيمة إلى سالبة لتمثيل تخفيض الدين
      const paymentData = {
        ...debtData,
        amount: -Math.abs(debtData.amount), // التأكد من أن القيمة سالبة دائمًا
        reason: debtData.reason || 'debt_reduced' // استخدام قيمة افتراضية للسبب إذا لم يتم توفيرها
      };
      
      const response = await apiRequest('POST', '/api/customer-debts', paymentData);
      return await response.json();
    },
    onSuccess: (_data, variables) => {
      // إبطال الاستعلامات ذات الصلة لتحديث البيانات
      queryClient.invalidateQueries({ queryKey: ['customer-debts', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      
      toast({
        title: t('success'),
        description: t('debt_reduced_success'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('debt_reduced_error'),
        variant: 'destructive',
      });
    },
  });
}