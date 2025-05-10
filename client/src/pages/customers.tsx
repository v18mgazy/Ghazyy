import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PlusCircle, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import CustomerList from '@/components/customers/customer-list';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

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
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    isPotential: true
  });
  
  // Fetch customers
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['/api/customers'],
    queryFn: async () => {
      // Mock data for demo
      return [
        {
          id: '1',
          name: 'Ahmed Mohamed',
          phone: '+20 123 456 7890',
          address: '123 El-Nasr St., Cairo',
          isPotential: false,
          totalPurchases: 1899.97
        },
        {
          id: '2',
          name: 'Sara Ali',
          phone: '+20 111 222 3333',
          address: '45 El-Haram St., Giza',
          isPotential: true,
          totalPurchases: 0
        },
        {
          id: '3',
          name: 'Mahmoud Hassan',
          phone: '+20 123 123 1234',
          address: '789 Alexandria Road, Alexandria',
          isPotential: false,
          totalPurchases: 2499.99
        },
        {
          id: '4',
          name: 'Fatima Ibrahim',
          phone: '+20 109 876 5432',
          address: '56 Luxor Street, Luxor',
          isPotential: false,
          totalPurchases: 3299.97
        }
      ];
    }
  });
  
  // Export customers to Excel
  const exportToExcel = () => {
    console.log('Export customers to Excel');
    // In a real app, this would generate and download an Excel file of customers
    toast({
      title: t('export_successful'),
      description: t('customers_exported_to_excel'),
    });
  };
  
  // Add customer mutation
  const addCustomerMutation = useMutation({
    mutationFn: async (customer: Omit<Customer, 'id' | 'totalPurchases'>) => {
      // In a real app, this would make an API call to add the customer
      console.log('Adding customer:', customer);
      return { ...customer, id: Date.now().toString(), totalPurchases: 0 };
    },
    onSuccess: () => {
      // In a real app, invalidate customers query
      // queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
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
      toast({
        title: t('error'),
        description: t('error_adding_customer'),
        variant: 'destructive',
      });
    }
  });
  
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
    </div>
  );
}
