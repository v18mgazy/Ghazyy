import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { ReceiptText, Search, X, ChevronRight, ChevronLeft, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ActiveInvoice from '@/components/invoice/active-invoice';
import { useLocale } from '@/hooks/use-locale';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';

// نوع بيانات العميل
interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  isPotential: boolean;
}

export default function NewInvoice() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { language } = useLocale();
  const isRtl = language === 'ar';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showBarcode, setShowBarcode] = useState(false);
  
  // قائمة بالعملاء للاختيار (ستكون من API في التطبيق الحقيقي)
  const mockCustomers: Customer[] = [
    {
      id: 'c1',
      name: 'أحمد محمد',
      phone: '0123456789',
      address: 'القاهرة، مصر',
      isPotential: false
    },
    {
      id: 'c2',
      name: 'سارة علي',
      phone: '0198765432',
      address: 'الإسكندرية، مصر',
      isPotential: false
    },
    {
      id: 'c3',
      name: 'محمد أحمد',
      phone: '0112233445',
      address: 'الجيزة، مصر',
      isPotential: true
    }
  ];
  
  // فلترة العملاء حسب البحث
  const filteredCustomers = searchTerm.trim() === '' 
    ? mockCustomers 
    : mockCustomers.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone.includes(searchTerm)
      );
  
  // اختيار عميل
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsCustomerDialogOpen(false);
  };
  
  // إنشاء عميل جديد
  const handleCreateNewCustomer = () => {
    // إنشاء عميل محتمل باسم البحث إذا كان غير فارغ
    if (searchTerm.trim()) {
      const newCustomer: Customer = {
        id: 'new-' + Date.now(),
        name: searchTerm,
        phone: '',
        address: '',
        isPotential: true
      };
      
      handleSelectCustomer(newCustomer);
    }
  };
  
  // إغلاق الفاتورة والعودة
  const handleCloseInvoice = () => {
    setLocation('/dashboard');
  };
  
  // فتح ماسح الباركود
  const handleScanBarcode = () => {
    setShowBarcode(true);
  };
  
  return (
    <div className="space-y-6">
      {/* عنوان الصفحة مع زر العودة */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleCloseInvoice}
          className="rounded-full h-10 w-10"
        >
          {isRtl ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ReceiptText className="h-7 w-7 text-primary" />
          {t('create_invoice')}
        </h1>
      </div>
      
      {selectedCustomer ? (
        // عرض نموذج الفاتورة النشطة إذا تم اختيار عميل
        <ActiveInvoice 
          customer={selectedCustomer}
          onClose={handleCloseInvoice}
          onAddProduct={handleScanBarcode}
        />
      ) : (
        // عرض اختيار العميل إذا لم يتم اختيار عميل بعد
        <Card className="max-w-3xl mx-auto mt-8 border-2 border-primary/10">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              {t('select_customer')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-6">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Users className="h-12 w-12 text-primary/50" />
              </div>
              
              <p className="text-center text-muted-foreground">
                {t('select_customer_to_create_invoice')}
              </p>
              
              <Button 
                onClick={() => setIsCustomerDialogOpen(true)}
                className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary-600 hover:to-primary-500 transition-all shadow-md px-8 py-6"
                size="lg"
              >
                <Users className="mr-2 h-5 w-5" />
                {t('select_customer')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* نافذة اختيار العميل */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('select_customer')}</DialogTitle>
            <DialogDescription>
              {t('search_customer_or_create_new')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* بحث العملاء */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder={t('search_customers')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* قائمة العملاء */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-2">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-3 border border-border rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium flex items-center">
                            {customer.name}
                            {customer.isPotential && (
                              <span className="ml-2 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                {t('potential_customer')}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {customer.phone || t('no_phone_number')}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">{t('no_customer_found')}</p>
                  {searchTerm.trim() && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={handleCreateNewCustomer}
                    >
                      {t('create_new_customer_with_name', { name: searchTerm })}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex justify-between items-center">
            <Button variant="outline" onClick={() => setIsCustomerDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleCreateNewCustomer}>
              {t('add_customer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}