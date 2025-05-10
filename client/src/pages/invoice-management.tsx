import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, Search, Pencil, Trash2, Printer, ExternalLink, Filter, CheckCircle, XCircle, Clock, 
  RefreshCw, ArrowUpDown, Download, ChevronRight, ChevronLeft
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuthContext } from '@/context/auth-context';
import { useLocale } from '@/hooks/use-locale';

// UI Components
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Badge
} from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// Mock invoices for initial display
const mockInvoices = [
  {
    id: 'INV-2025-1001',
    date: new Date(2025, 4, 10),
    customer: {
      id: '1',
      name: 'Ahmed Mohamed',
      phone: '+20 123 456 7890',
      address: '123 El-Nasr St., Cairo'
    },
    total: 159.99,
    status: 'completed',
    paymentMethod: 'cash',
    items: [
      {
        id: 'item-1',
        product: {
          id: 'prod-1',
          name: 'Samsung Galaxy S21',
          barcode: '8590123456789',
          code: 'SG-021',
          purchasePrice: 100,
          sellingPrice: 159.99
        },
        quantity: 1,
        price: 159.99,
        total: 159.99
      }
    ]
  },
  {
    id: 'INV-2025-1002',
    date: new Date(2025, 4, 9),
    customer: {
      id: '2',
      name: 'Fatima Ali',
      phone: '+20 111 222 3333',
      address: '45 El-Tahrir St., Alexandria'
    },
    total: 49.98,
    status: 'completed',
    paymentMethod: 'visa',
    items: [
      {
        id: 'item-2',
        product: {
          id: 'prod-2',
          name: 'Wireless Headphones',
          barcode: '7891234567890',
          code: 'WH-101',
          purchasePrice: 20,
          sellingPrice: 49.99
        },
        quantity: 1,
        price: 49.99,
        total: 49.99
      }
    ]
  },
  {
    id: 'INV-2025-1003',
    date: new Date(2025, 4, 8),
    customer: {
      id: '3',
      name: 'Youssef Hassan',
      phone: '+20 100 200 3000',
      address: '78 Al-Haram St., Giza'
    },
    total: 299.97,
    status: 'pending',
    paymentMethod: 'deferred',
    items: [
      {
        id: 'item-3',
        product: {
          id: 'prod-3',
          name: 'Laptop Backpack',
          barcode: '6789012345678',
          code: 'LB-201',
          purchasePrice: 60,
          sellingPrice: 99.99
        },
        quantity: 3,
        price: 99.99,
        total: 299.97
      }
    ]
  }
];

export default function InvoiceManagement() {
  const { t } = useTranslation();
  const { language } = useLocale();
  const { user } = useAuthContext();
  
  const [invoices, setInvoices] = useState(mockInvoices);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [invoicesPerPage] = useState(10);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  
  // Filter invoices based on search term and filters
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer.phone.includes(searchTerm);
      
    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
    const matchesPayment = filterPayment === 'all' || invoice.paymentMethod === filterPayment;
    
    return matchesSearch && matchesStatus && matchesPayment;
  });
  
  // Pagination
  const indexOfLastInvoice = currentPage * invoicesPerPage;
  const indexOfFirstInvoice = indexOfLastInvoice - invoicesPerPage;
  const currentInvoices = filteredInvoices.slice(indexOfFirstInvoice, indexOfLastInvoice);
  const totalPages = Math.ceil(filteredInvoices.length / invoicesPerPage);
  
  const changePage = (page: number) => {
    setCurrentPage(page);
  };
  
  // Open invoice details dialog
  const openInvoiceDetails = (invoice: any) => {
    setSelectedInvoice(invoice);
  };
  
  // Handle invoice deletion
  const confirmDeleteInvoice = (invoiceId: string) => {
    setInvoiceToDelete(invoiceId);
    setIsDeleteDialogOpen(true);
  };
  
  const deleteInvoice = () => {
    if (invoiceToDelete) {
      setInvoices(invoices.filter(inv => inv.id !== invoiceToDelete));
      setIsDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };
  
  // Format status badge
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{t('completed')}</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{t('pending')}</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{t('cancelled')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Format payment method badge
  const getPaymentBadge = (method: string) => {
    switch(method) {
      case 'cash':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{t('cash')}</Badge>;
      case 'visa':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{t('visa')}</Badge>;
      case 'deferred':
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">{t('deferred')}</Badge>;
      case 'ewallet':
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">{t('e_wallet')}</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  const renderInvoiceDetails = () => {
    if (!selectedInvoice) return null;
    
    return (
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <FileText className="mr-2 h-5 w-5" />
              {t('invoice_details')}
            </DialogTitle>
            <DialogDescription>
              {selectedInvoice.id} - {formatDate(selectedInvoice.date, 'PPP', language)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="text-sm font-medium text-neutral-500">{t('customer_details')}</h4>
              <p className="text-base font-medium">{selectedInvoice.customer.name}</p>
              <p className="text-sm">{selectedInvoice.customer.phone}</p>
              <p className="text-sm">{selectedInvoice.customer.address}</p>
            </div>
            <div className="text-right">
              <h4 className="text-sm font-medium text-neutral-500">{t('invoice_info')}</h4>
              <p className="text-base font-medium">{t('status')}: {getStatusBadge(selectedInvoice.status)}</p>
              <p className="text-sm">{t('payment_method')}: {getPaymentBadge(selectedInvoice.paymentMethod)}</p>
              <p className="text-sm">{t('total')}: {formatCurrency(selectedInvoice.total)}</p>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div>
            <h4 className="text-sm font-medium mb-2">{t('invoice_items')}</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('product_name')}</TableHead>
                  <TableHead className="text-center">{t('quantity')}</TableHead>
                  <TableHead className="text-right">{t('price')}</TableHead>
                  <TableHead className="text-right">{t('total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedInvoice.items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-xs text-neutral-500">{item.product.code}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <Separator className="my-4" />
          
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm">{t('subtotal')}: {formatCurrency(selectedInvoice.total)}</p>
              <p className="text-sm">{t('discount')}: {formatCurrency(0)}</p>
              <p className="text-base font-bold mt-2">{t('total')}: {formatCurrency(selectedInvoice.total)}</p>
            </div>
            <div className="space-x-2">
              <Button variant="outline" size="sm" className="flex items-center">
                <Printer className="mr-1 h-4 w-4" /> {t('print')}
              </Button>
              <Button variant="outline" size="sm" className="flex items-center">
                <Download className="mr-1 h-4 w-4" /> {t('export')}
              </Button>
              {user?.role === 'admin' && selectedInvoice.status !== 'cancelled' && (
                <Button variant="outline" size="sm" className="flex items-center text-red-600 hover:text-red-700 hover:bg-red-50">
                  <XCircle className="mr-1 h-4 w-4" /> {t('cancel_invoice')}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };
  
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">{t('invoice_management')}</CardTitle>
              <CardDescription>{t('view_edit_manage_invoices')}</CardDescription>
            </div>
            <div className="mt-4 md:mt-0">
              <Button variant="outline" className="flex items-center">
                <Download className="mr-1 h-4 w-4" /> {t('export_all')}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('search_invoices')}
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <div className="w-40">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('filter_by_status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_statuses')}</SelectItem>
                    <SelectItem value="completed">{t('completed')}</SelectItem>
                    <SelectItem value="pending">{t('pending')}</SelectItem>
                    <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Select value={filterPayment} onValueChange={setFilterPayment}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('filter_by_payment')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_payment_methods')}</SelectItem>
                    <SelectItem value="cash">{t('cash')}</SelectItem>
                    <SelectItem value="visa">{t('visa')}</SelectItem>
                    <SelectItem value="deferred">{t('deferred')}</SelectItem>
                    <SelectItem value="ewallet">{t('e_wallet')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="icon" onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
                setFilterPayment('all');
              }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold text-primary-800 dark:text-primary-100 py-4">{t('invoice_number')}</TableHead>
                  <TableHead className="font-semibold text-primary-800 dark:text-primary-100">{t('date')}</TableHead>
                  <TableHead className="font-semibold text-primary-800 dark:text-primary-100">{t('customer')}</TableHead>
                  <TableHead className="font-semibold text-primary-800 dark:text-primary-100">{t('status')}</TableHead>
                  <TableHead className="font-semibold text-primary-800 dark:text-primary-100">{t('payment_method')}</TableHead>
                  <TableHead className="font-semibold text-primary-800 dark:text-primary-100 text-right">{t('total')}</TableHead>
                  <TableHead className="font-semibold text-primary-800 dark:text-primary-100 text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentInvoices.length > 0 ? (
                  currentInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openInvoiceDetails(invoice)}>
                      <TableCell className="font-medium">{invoice.id}</TableCell>
                      <TableCell>{formatDate(invoice.date, 'PP', language)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{invoice.customer.name}</p>
                          <p className="text-xs text-muted-foreground">{invoice.customer.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>{getPaymentBadge(invoice.paymentMethod)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(invoice.total)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>{t('invoice_actions')}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openInvoiceDetails(invoice)}>
                                <ExternalLink className="mr-2 h-4 w-4" /> {t('view_details')}
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Printer className="mr-2 h-4 w-4" /> {t('print_invoice')}
                              </DropdownMenuItem>
                              {user?.role === 'admin' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <Pencil className="mr-2 h-4 w-4" /> {t('edit_invoice')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                    onClick={() => confirmDeleteInvoice(invoice.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> {t('delete_invoice')}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <p className="text-muted-foreground">{t('no_invoices_found')}</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {filteredInvoices.length > invoicesPerPage && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                {t('showing')} {indexOfFirstInvoice + 1}-{Math.min(indexOfLastInvoice, filteredInvoices.length)} {t('of')} {filteredInvoices.length} {t('invoices')}
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changePage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <Button
                    key={i}
                    variant={currentPage === i + 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => changePage(i + 1)}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changePage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Render invoice details dialog */}
      {renderInvoiceDetails()}
      
      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirm_delete')}</DialogTitle>
            <DialogDescription>
              {t('delete_invoice_confirmation')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={deleteInvoice}>
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}