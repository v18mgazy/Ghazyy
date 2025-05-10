import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReceiptText, Search, X, ChevronRight, Users } from 'lucide-react';
import { useLocale } from '@/hooks/use-locale';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ActiveInvoice from '@/components/invoice/active-invoice';

// نوع بيانات العميل
interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  isPotential: boolean;
}

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateInvoiceDialog({ open, onOpenChange }: CreateInvoiceDialogProps) {
  const { t } = useTranslation();
  const { language } = useLocale();
  const isRtl = language === 'ar';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(true);  // افتح مربع حوار العملاء افتراضيًا
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
  
  // إغلاق النافذة المنبثقة
  const handleCloseInvoice = () => {
    // إعادة تعيين الحالة قبل الإغلاق
    setSelectedCustomer(null);
    setIsCustomerDialogOpen(true);
    setSearchTerm('');
    // إغلاق النافذة المنبثقة
    onOpenChange(false);
  };
  
  // فتح ماسح الباركود
  const handleScanBarcode = () => {
    setShowBarcode(true);
  };
  
  // إظهار الشاشة الصحيحة بناءً على الحالة الحالية
  const renderDialogContent = () => {
    if (isCustomerDialogOpen) {
      // شاشة اختيار العميل
      return (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Users className="h-6 w-6 text-primary" />
              {t('select_customer')}
            </DialogTitle>
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
            <Button variant="outline" onClick={handleCloseInvoice}>
              {t('cancel')}
            </Button>
            <Button onClick={handleCreateNewCustomer} disabled={!searchTerm.trim()}>
              {t('add_customer')}
            </Button>
          </DialogFooter>
        </>
      );
    } else {
      // شاشة إنشاء الفاتورة بعد اختيار العميل
      return (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ReceiptText className="h-6 w-6 text-primary" />
              {t('create_invoice')}
            </DialogTitle>
            <DialogDescription>
              {t('customer')}: <span className="font-medium">{selectedCustomer?.name}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {selectedCustomer && (
              <ActiveInvoice
                customer={selectedCustomer}
                onClose={handleCloseInvoice}
                onAddProduct={handleScanBarcode}
              />
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomerDialogOpen(true)}>
              {t('change_customer')}
            </Button>
          </DialogFooter>
        </>
      );
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-4xl ${selectedCustomer && !isCustomerDialogOpen ? 'max-h-[90vh] overflow-y-auto' : ''}`}>
        {renderDialogContent()}
      </DialogContent>
    </Dialog>
  );
}