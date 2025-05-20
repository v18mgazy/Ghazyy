import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

/**
 * Interface for CustomerDebt data returned from the API
 */
export interface CustomerDebt {
  id: number | string;
  customerId: number;
  amount: number;
  reason: string;
  date: string;
  createdAt: string;
  invoiceId?: number;
  createdBy: number;
  isDeferred?: boolean;
}

/**
 * Interface for deferred invoices
 */
export interface DeferredInvoice {
  id: number;
  invoiceNumber: string;
  date: string;
  paymentStatus: 'deferred' | 'approved' | 'paid'; // لو بتستخدمه
  total: number; // ✅ هذا هو الحقل المطلوب
  amount?: number; // إن وجد
  isPending?: boolean;
}


/**
 * Interface for the response containing debts and total debt
 */
export interface CustomerDebtsResponse {
  debts: CustomerDebt[];
  totalDebt: number;
  manualDebtTotal: number;
  deferredInvoicesTotal: number;
  deferredInvoices: DeferredInvoice[];
}

/**
 * Interface for adding a new debt
 */
export interface AddDebtData {
  customerId: number;
  amount: number;
  reason: string;
  createdBy: number;
}

/**
 * Interface for reducing a debt
 */
export interface ReduceDebtData {
  customerId: number;
  amount: number;
  reason: string;
  createdBy: number;
}

/**
 * Hook to get a customer's debt history
 * @param customerId - The customer ID
 */
export function useCustomerDebts(customerId: number) {
  return useQuery<CustomerDebtsResponse, Error>({
    queryKey: ['/api/customer-debts', customerId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/customer-debts/${customerId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch debt history');
      }
      return await response.json();
    },
    enabled: !!customerId,
    staleTime: 30000 // 30 seconds
  });
}

/**
 * Hook to add a new debt to a customer
 */
export function useAddCustomerDebt() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: AddDebtData) => {
      const response = await apiRequest('POST', `/api/customer-debts/add`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add debt');
      }
      return await response.json();
    },
    onSuccess: (_data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/customer-debts', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      
      toast({
        title: 'نجاح',
        description: 'تمت إضافة المديونية بنجاح',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطأ',
        description: `فشل إضافة المديونية: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to reduce a customer's debt (register a payment)
 */
export function useReduceCustomerDebt() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ReduceDebtData) => {
      const response = await apiRequest('POST', `/api/customer-debts/reduce`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reduce debt');
      }
      return await response.json();
    },
    onSuccess: (_data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/customer-debts', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      
      toast({
        title: 'نجاح',
        description: 'تم تخفيض المديونية بنجاح',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطأ',
        description: `فشل تخفيض المديونية: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}