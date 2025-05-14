import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";

export interface CustomerDebt {
  id: number;
  customerId: number;
  amount: number;
  reason: string;
  date: string;
  createdBy: number;
}

export interface CustomerDebtsResponse {
  debts: CustomerDebt[];
  totalDebt: number;
}

export interface AddDebtData {
  customerId: number;
  amount: number;
  reason: string;
  createdBy: number;
}

export interface ReduceDebtData {
  customerId: number;
  amount: number;
  reason: string;
  createdBy: number;
}

/**
 * Hook للحصول على سجل ديون العميل
 * @param customerId معرف العميل
 */
export function useCustomerDebts(customerId: number) {
  return useQuery<CustomerDebtsResponse>({
    queryKey: [`/api/customer-debts/${customerId}`],
    enabled: !!customerId,
  });
}

/**
 * Hook لإضافة دين جديد للعميل
 */
export function useAddCustomerDebt() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (data: AddDebtData) => {
      const response = await apiRequest("POST", "/api/customer-debts/add", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t("debt_added_error"));
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: t("success"),
        description: t("debt_added_success"),
      });
      
      // تحديث بيانات ديون العميل وبيانات العملاء
      queryClient.invalidateQueries({ queryKey: [`/api/customer-debts/${variables.customerId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: error.message || t("debt_added_error"),
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook لتخفيض دين العميل (تسجيل دفعة)
 */
export function useReduceCustomerDebt() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (data: ReduceDebtData) => {
      const response = await apiRequest("POST", "/api/customer-debts/reduce", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t("debt_reduced_error"));
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: t("success"),
        description: t("debt_reduced_success"),
      });
      
      // تحديث بيانات ديون العميل وبيانات العملاء
      queryClient.invalidateQueries({ queryKey: [`/api/customer-debts/${variables.customerId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: error.message || t("debt_reduced_error"),
        variant: "destructive",
      });
    },
  });
}