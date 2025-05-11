import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PlusCircle, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import CustomerList from '@/components/customers/customer-list';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

// تعريف واجهة البيانات من الخادم
interface CustomerResponse {
  id: number;
  name: string;
  phone: string;
  address: string;
  isPotential: boolean;
  createdAt: string;
  updatedAt?: string;
}

// واجهة البيانات التي يستخدمها المكون
interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  isPotential: boolean;
  totalPurchases: number;
}

export default function CustomersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    isPotential: true
  });
  
  // عند النقر على زر تعديل العميل
  const handleEditCustomer = (customer: Customer) => {
    setCurrentCustomer(customer);
    setEditCustomerOpen(true);
  };
  
  // استدعاء بيانات العملاء من الخادم
  const { data: customersResponse = [], isLoading: isLoadingCustomers } = useQuery<CustomerResponse[]>({
    queryKey: ['/api/customers'],
    refetchInterval: 30 * 1000,     // تحديث البيانات كل 30 ثانية
    refetchOnWindowFocus: true,     // تحديث البيانات عند العودة للصفحة
    staleTime: 15 * 1000,           // اعتبار البيانات قديمة بعد 15 ثانية
  });
  
  // تحويل البيانات من شكل الاستجابة إلى الشكل الذي يستخدمه المكون
  const customers: Customer[] = customersResponse.map(customer => ({
    id: customer.id.toString(),
    name: customer.name,
    phone: customer.phone || '',
    address: customer.address || '',
    isPotential: customer.isPotential || false,
    totalPurchases: 0 // قيمة افتراضية حيث لا نحتفظ بهذه البيانات في قاعدة البيانات الآن
  }));
  
  // Export customers to Excel
  const exportToExcel = () => {
    try {
      console.log('Exporting customers to Excel');
      
      // استيراد مكتبة xlsx
      import('xlsx').then(XLSX => {
        // تحويل البيانات إلى النموذج المناسب للتصدير
        const customersForExport = customers.map(customer => ({
          [t('customer_name')]: customer.name,
          [t('phone')]: customer.phone,
          [t('address')]: customer.address,
          [t('potential_customer')]: customer.isPotential ? t('yes') : t('no')
        }));
        
        // إنشاء كتاب عمل جديد
        const workbook = XLSX.utils.book_new();
        
        // إنشاء ورقة عمل جديدة
        const worksheet = XLSX.utils.json_to_sheet(customersForExport);
        
        // إضافة الورقة إلى الكتاب
        XLSX.utils.book_append_sheet(workbook, worksheet, t('customers'));
        
        // تحميل الملف
        XLSX.writeFile(workbook, 'customers.xlsx');
        
        toast({
          title: t('export_successful'),
          description: t('customers_exported_to_excel'),
        });
      }).catch(error => {
        console.error('Error loading XLSX library:', error);
        toast({
          title: t('export_failed'),
          description: t('error_exporting_customers'),
          variant: 'destructive'
        });
      });
    } catch (error) {
      console.error('Error exporting customers to Excel:', error);
      toast({
        title: t('export_failed'),
        description: t('error_exporting_customers'),
        variant: 'destructive'
      });
    }
  };
  
  // دالة إضافة عميل جديد - mutation
  const addCustomerMutation = useMutation({
    mutationFn: async (customer: Omit<Customer, 'id' | 'totalPurchases'>) => {
      // استخدام واجهة برمجة التطبيقات لإضافة العميل
      console.log('Adding customer:', customer);
      const response = await apiRequest('POST', '/api/customers', customer);
      return await response.json() as CustomerResponse;
    },
    onSuccess: (newCustomer) => {
      console.log('Customer added successfully:', newCustomer);
      
      // تحديث استعلام العملاء لجلب البيانات الجديدة
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      
      toast({
        title: t('customer_added'),
        description: t('customer_added_successfully'),
      });
      
      setAddCustomerOpen(false);
      setNewCustomer({
        name: '',
        phone: '',
        address: '',
        isPotential: true
      });
    },
    onError: (error) => {
      console.error('Error adding customer:', error);
      toast({
        title: t('error'),
        description: t('error_adding_customer'),
        variant: 'destructive',
      });
    }
  });
  
  // دالة إضافة عميل جديد
  const handleAddCustomer = () => {
    if (!newCustomer.name) {
      toast({
        title: t('validation_error'),
        description: t('customer_name_required'),
        variant: 'destructive',
      });
      return;
    }
    
    addCustomerMutation.mutate(newCustomer);
  };
  
  // دالة تعديل العميل - mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async (customerData: Omit<Customer, 'totalPurchases'>) => {
      // استخدام واجهة برمجة التطبيقات لتعديل العميل
      console.log('Updating customer:', customerData);
      const response = await apiRequest('PATCH', `/api/customers/${customerData.id}`, {
        name: customerData.name,
        phone: customerData.phone,
        address: customerData.address,
        isPotential: customerData.isPotential
      });
      return await response.json() as CustomerResponse;
    },
    onSuccess: (updatedCustomer) => {
      console.log('Customer updated successfully:', updatedCustomer);
      
      // تحديث استعلام العملاء لجلب البيانات المحدثة
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      
      toast({
        title: t('customer_updated'),
        description: t('customer_updated_successfully'),
      });
      
      setEditCustomerOpen(false);
      setCurrentCustomer(null);
    },
    onError: (error) => {
      console.error('Error updating customer:', error);
      toast({
        title: t('error'),
        description: t('error_updating_customer'),
        variant: 'destructive',
      });
    }
  });
  
  // تنفيذ عملية تعديل العميل
  const handleUpdateCustomer = () => {
    if (!currentCustomer) return;
    
    if (!currentCustomer.name) {
      toast({
        title: t('validation_error'),
        description: t('customer_name_required'),
        variant: 'destructive',
      });
      return;
    }
    
    updateCustomerMutation.mutate(currentCustomer);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('customers')}</h1>
        <div className="flex gap-2">
          <Button onClick={() => setAddCustomerOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('add_customer')}
          </Button>
          <Button variant="outline" onClick={exportToExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {t('export_to_excel')}
          </Button>
        </div>
      </div>
      
      <CustomerList 
        customers={customers}
        isLoading={isLoadingCustomers}
        onExportToExcel={exportToExcel}
        onEditCustomer={handleEditCustomer}
      />
      
      {/* Add Customer Dialog */}
      <Dialog open={addCustomerOpen} onOpenChange={setAddCustomerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('add_customer')}</DialogTitle>
            <DialogDescription>
              {t('add_customer_description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t('name')} <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder={t('customer_name')}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="phone">{t('phone')}</Label>
              <Input
                id="phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder={t('phone_number')}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="address">{t('address')}</Label>
              <Input
                id="address"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                placeholder={t('customer_address')}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="isPotential">{t('potential_client')}</Label>
              <Select
                value={newCustomer.isPotential ? 'yes' : 'no'}
                onValueChange={(value) => setNewCustomer({ ...newCustomer, isPotential: value === 'yes' })}
              >
                <SelectTrigger id="isPotential">
                  <SelectValue placeholder={t('select')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">{t('yes')}</SelectItem>
                  <SelectItem value="no">{t('no')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCustomerOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleAddCustomer} disabled={addCustomerMutation.isPending}>
              {addCustomerMutation.isPending ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Customer Dialog */}
      <Dialog open={editCustomerOpen} onOpenChange={setEditCustomerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('edit_customer')}</DialogTitle>
            <DialogDescription>
              {t('edit_customer_description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">{t('name')} <span className="text-destructive">*</span></Label>
              <Input
                id="edit-name"
                value={currentCustomer?.name || ''}
                onChange={(e) => currentCustomer && setCurrentCustomer({ 
                  ...currentCustomer, 
                  name: e.target.value 
                })}
                placeholder={t('customer_name')}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">{t('phone')}</Label>
              <Input
                id="edit-phone"
                value={currentCustomer?.phone || ''}
                onChange={(e) => currentCustomer && setCurrentCustomer({ 
                  ...currentCustomer, 
                  phone: e.target.value 
                })}
                placeholder={t('phone_number')}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-address">{t('address')}</Label>
              <Input
                id="edit-address"
                value={currentCustomer?.address || ''}
                onChange={(e) => currentCustomer && setCurrentCustomer({ 
                  ...currentCustomer, 
                  address: e.target.value 
                })}
                placeholder={t('customer_address')}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-isPotential">{t('potential_client')}</Label>
              <Select
                value={currentCustomer?.isPotential ? 'yes' : 'no'}
                onValueChange={(value) => currentCustomer && setCurrentCustomer({ 
                  ...currentCustomer, 
                  isPotential: value === 'yes' 
                })}
              >
                <SelectTrigger id="edit-isPotential">
                  <SelectValue placeholder={t('select')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">{t('yes')}</SelectItem>
                  <SelectItem value="no">{t('no')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCustomerOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleUpdateCustomer} disabled={updateCustomerMutation.isPending}>
              {updateCustomerMutation.isPending ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
