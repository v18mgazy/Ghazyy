import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, FileSpreadsheet, Edit, History, Loader2,
  MessageSquareShare, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { createWhatsAppLink, formatCurrency } from '@/lib/utils';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  isPotential: boolean;
  totalPurchases: number;
}

interface CustomerListProps {
  customers: Customer[];
  isLoading: boolean;
  onExportToExcel: () => void;
}

export default function CustomerList({
  customers,
  isLoading,
  onExportToExcel
}: CustomerListProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  const perPage = 10;
  
  // Mock purchase history data
  const purchaseHistory = [
    { id: '1', date: '2023-08-20', invoiceNumber: 'INV-2023-0001', total: 199.99 },
    { id: '2', date: '2023-07-15', invoiceNumber: 'INV-2023-0056', total: 299.99 },
    { id: '3', date: '2023-06-10', invoiceNumber: 'INV-2023-0102', total: 99.99 },
  ];

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.address.toLowerCase().includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredCustomers.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const currentCustomers = filteredCustomers.slice(startIndex, startIndex + perPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const openWhatsApp = (customer: Customer) => {
    if (!customer.phone) return;
    
    const whatsappLink = createWhatsAppLink(customer.phone);
    window.open(whatsappLink, '_blank');
  };

  const viewHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowHistory(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('customer_management')}</CardTitle>
            <Button 
              variant="outline" 
              className="flex items-center" 
              onClick={onExportToExcel}
            >
              <FileSpreadsheet className="mr-1 h-4 w-4" />
              {t('export_to_excel')}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative flex-grow">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('search_customers')}
                className="pr-8"
              />
              <div className="absolute right-2 top-2 text-neutral-500">
                <Search className="h-5 w-5" />
              </div>
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-5 w-5" />
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('name')}</TableHead>
                    <TableHead>{t('phone')}</TableHead>
                    <TableHead>{t('address')}</TableHead>
                    <TableHead>{t('potential')}</TableHead>
                    <TableHead>{t('total_purchases')}</TableHead>
                    <TableHead>{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-neutral-500">
                        {searchTerm ? t('no_customers_found') : t('no_customers_yet')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.phone || '-'}</TableCell>
                        <TableCell>{customer.address || '-'}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={customer.isPotential 
                              ? 'bg-secondary-light bg-opacity-10 text-secondary' 
                              : 'bg-success-light bg-opacity-10 text-success'
                            }
                          >
                            {customer.isPotential ? t('yes') : t('no')}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(customer.totalPurchases)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-primary hover:text-primary/90"
                              onClick={() => {}}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                              onClick={() => viewHistory(customer)}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-success hover:text-success/90"
                              onClick={() => openWhatsApp(customer)}
                              disabled={!customer.phone}
                            >
                              <MessageSquareShare className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        
        {totalPages > 1 && (
          <CardFooter>
            <div className="w-full flex justify-between items-center">
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                {t('showing')} <span className="font-medium">{startIndex + 1}</span> {t('to')} <span className="font-medium">
                  {Math.min(startIndex + perPage, filteredCustomers.length)}
                </span> {t('of')} <span className="font-medium">{filteredCustomers.length}</span> {t('customers')}
              </div>
              
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        onClick={() => handlePageChange(i + 1)}
                        isActive={currentPage === i + 1}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </CardFooter>
        )}
      </Card>
      
      {/* Customer History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {t('purchase_history')} - {selectedCustomer?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedCustomer?.phone && <div>{selectedCustomer.phone}</div>}
              {selectedCustomer?.address && <div>{selectedCustomer.address}</div>}
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead>{t('invoice')}</TableHead>
                  <TableHead className="text-right">{t('amount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-neutral-500">
                      {t('no_purchase_history')}
                    </TableCell>
                  </TableRow>
                ) : (
                  purchaseHistory.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>{purchase.date}</TableCell>
                      <TableCell>{purchase.invoiceNumber}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(purchase.total)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowHistory(false)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
