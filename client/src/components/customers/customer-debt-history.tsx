import React from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle, Receipt } from 'lucide-react';
import { useCustomerDebts } from '@/hooks/use-customer-debts';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';

interface CustomerDebtHistoryProps {
  customerId: number;
  className?: string;
}

export default function CustomerDebtHistory({ customerId, className = '' }: CustomerDebtHistoryProps) {
  const { t } = useTranslation();
  const { data, isLoading, error } = useCustomerDebts(customerId);

  // تنسيق التاريخ المستخرج من قاعدة البيانات
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'yyyy-MM-dd HH:mm');
    } catch (err) {
      console.error('Error formatting date:', err);
      return dateString;
    }
  };

  // تحديد نوع المعاملة (إضافة أو تخفيض دين)
  const getTransactionType = (amount: number, invoiceId?: number) => {
    if (invoiceId) {
      return {
        label: t('invoice_purchase'),
        icon: <Receipt className="h-4 w-4 mr-1" />,
        color: 'bg-gray-100 text-gray-800 border-gray-200'
      };
    }
    return amount > 0
      ? {
          label: t('debt_added'),
          icon: <ArrowUpCircle className="h-4 w-4 mr-1 text-red-500" />,
          color: 'bg-red-100 text-red-800 border-red-200'
        }
      : {
          label: t('debt_reduced'),
          icon: <ArrowDownCircle className="h-4 w-4 mr-1 text-green-500" />,
          color: 'bg-green-100 text-green-800 border-green-200'
        };
  };

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className={`${className} border-red-200`}>
        <CardContent className="p-6 text-center text-red-500">
          <p>{t('error_loading_debt_history')}</p>
          <p className="text-sm mt-2">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.debts || data.debts.length === 0) {
    return (
      <Card className={`${className} border-gray-200`}>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p>{t('no_debt_history')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4 p-3 bg-muted rounded-md flex justify-between items-center">
        <div>
          <span className="text-sm text-muted-foreground">{t('current_debt_balance')}:</span>
          <span className={`ml-2 font-bold ${data.totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(data.totalDebt)}
          </span>
        </div>
        <Badge variant="outline" className="text-xs px-2 py-0">
          {t('transactions_count')}: {data.debts.length}
        </Badge>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">{t('date')}</TableHead>
              <TableHead>{t('transaction_type')}</TableHead>
              <TableHead>{t('reason')}</TableHead>
              <TableHead className="text-right">{t('amount')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.debts.map((debt) => {
              const transaction = getTransactionType(debt.amount, debt.invoiceId);
              return (
                <TableRow key={debt.id}>
                  <TableCell className="font-medium text-xs">
                    {formatDate(debt.date)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`flex items-center ${transaction.color}`}>
                      {transaction.icon}
                      <span>{transaction.label}</span>
                      {debt.invoiceId && (
                        <span className="ml-1 text-xs opacity-70">#{debt.invoiceId}</span>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {debt.reason || t('no_reason_provided')}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${debt.amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(Math.abs(debt.amount))}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}