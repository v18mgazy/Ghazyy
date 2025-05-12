import { useQuery } from "@tanstack/react-query";

interface StoreInfo {
  name: string;
  address: string;
  phone: string;
}

export function useStoreInfo() {
  const { data: storeInfo, isLoading, error } = useQuery({
    queryKey: ['/api/store-info'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/store-info');
        if (response.ok) {
          return await response.json() as StoreInfo;
        }
        // إذا لم تكن هناك بيانات متجر مخزنة، نعيد قيمة افتراضية
        return { name: 'Sales Ghazy', address: 'Cairo - Egypt', phone: '01067677607' };
      } catch (error) {
        console.error('Error fetching store info:', error);
        // في حالة حدوث خطأ، نستخدم أيضًا القيم الافتراضية
        return { name: 'Sales Ghazy', address: 'Cairo - Egypt', phone: '01067677607' };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 دقائق قبل إعادة التحميل
  });

  return {
    storeInfo: storeInfo || { name: 'Sales Ghazy', address: 'Cairo - Egypt', phone: '01067677607' },
    isLoading,
    error
  };
}