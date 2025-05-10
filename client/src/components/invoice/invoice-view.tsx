import React from 'react';
import { useTranslation } from 'react-i18next';
import { Receipt, Printer, Download } from 'lucide-react';
import { useLocale } from '@/hooks/use-locale';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';

interface InvoiceViewProps {
  invoice: {
    id: string;
    invoiceNumber: string;
    date: Date;
    customer: {
      name: string;
      phone: string;
      address: string;
    };
    items: Array<{
      product: {
        name: string;
        code: string;
      };
      quantity: number;
      price: number;
      total: number;
    }>;
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: string;
    paymentStatus: string;
  };
  onPrint: () => void;
  onDownload: () => void;
}

export default function InvoiceView({ invoice, onPrint, onDownload }: InvoiceViewProps) {
  const { t } = useTranslation();
  const { language } = useLocale();
  
  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return t('cash');
      case 'visa': return t('visa');
      case 'ewallet': return t('e_wallet');
      case 'deferred': return t('deferred');
      default: return method;
    }
  };
  
  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return t('paid');
      case 'pending': return t('pending');
      case 'approved': return t('approved');
      case 'rejected': return t('rejected');
      default: return status;
    }
  };
  
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'approved':
        return 'bg-success-light bg-opacity-10 text-success-DEFAULT';
      case 'pending':
        return 'bg-secondary-light bg-opacity-10 text-secondary-DEFAULT';
      case 'rejected':
        return 'bg-destructive bg-opacity-10 text-destructive';
      default:
        return 'bg-neutral-100 dark:bg-neutral-700';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            <Receipt className="mr-2 h-5 w-5" />
            {t('invoice')} #{invoice.invoiceNumber}
          </CardTitle>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            {formatDate(invoice.date, 'PPP', language)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Business and Invoice Info */}
        <div className="mb-6">
          <div className="flex justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg">Sales Ghazy</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                123 Business St., Cairo, Egypt
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                info@salesghazy.com
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                +20 123 456 7890
              </p>
            </div>
            <div className="text-right">
              <div className="inline-block px-2 py-1 rounded-full text-xs font-semibold mb-2 capitalize" 
                   style={{ background: getPaymentStatusColor(invoice.paymentStatus) }}>
                {getPaymentStatusLabel(invoice.paymentStatus)}
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {t('payment_method')}: {getPaymentMethodLabel(invoice.paymentMethod)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Customer Info */}
        <div className="mb-6 p-4 bg-neutral-100 dark:bg-neutral-700 rounded-md">
          <h3 className="font-medium mb-2">{t('billed_to')}:</h3>
          <p className="font-medium">{invoice.customer.name}</p>
          {invoice.customer.phone && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {invoice.customer.phone}
            </p>
          )}
          {invoice.customer.address && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {invoice.customer.address}
            </p>
          )}
        </div>
        
        {/* Items Table */}
        <div className="overflow-x-auto mb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('item')}</TableHead>
                <TableHead className="text-right">{t('quantity')}</TableHead>
                <TableHead className="text-right">{t('price')}</TableHead>
                <TableHead className="text-right">{t('amount')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="font-medium">{item.product.name}</div>
                    {item.product.code && (
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {t('code')}: {item.product.code}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Totals */}
        <div className="w-full md:w-1/2 ml-auto">
          <div className="flex justify-between mb-2">
            <span className="text-neutral-600 dark:text-neutral-400">{t('subtotal')}:</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between mb-2">
              <span className="text-neutral-600 dark:text-neutral-400">{t('discount')}:</span>
              <span className="text-destructive">-{formatCurrency(invoice.discount)}</span>
            </div>
          )}
          <Separator className="my-2" />
          <div className="flex justify-between font-bold">
            <span>{t('total')}:</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" onClick={onPrint}>
          <Printer className="mr-2 h-4 w-4" />
          {t('print')}
        </Button>
        <Button variant="outline" onClick={onDownload}>
          <Download className="mr-2 h-4 w-4" />
          {t('download')}
        </Button>
      </CardFooter>
    </Card>
  );
}
