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

  if (!data) {
    return (
      <Card className={`${className} border-gray-200`}>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p>{t('no_debt_history')}</p>
        </CardContent>
      </Card>
    );
  }

  // التحقق من عدم وجود ديون يدوية أو فواتير آجلة
  if ((!data.debts || data.debts.length === 0) && (!data.deferredInvoices || data.deferredInvoices.length === 0)) {
    return (
      <Card className={`${className} border-gray-200`}>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p>{t('no_debt_history')}</p>
        </CardContent>
      </Card>
    );
  }

  console.log("Data received:", data);

  // طباعة بيانات التشخيص
  console.log("Data received in debt history:", data);
  console.log("Manual debts:", data.debts);
  console.log("Deferred invoices:", data.deferredInvoices);
  console.log("Total debt:", data.totalDebt);
  console.log("Manual debt total:", data.manualDebtTotal);
  console.log("Deferred invoices total:", data.deferredInvoicesTotal);

  // إنشاء "ديون" وهمية من الفواتير الآجلة لعرضهم في نفس الجدول
  // ملاحظة: لاحظ أننا نستخدم فقط الفواتير الآجلة التي لم يتم حذفها
  // وذلك لأن الفواتير المحذوفة تمت تصفيتها بالفعل في الخادم (server)
  const deferredInvoiceDebts = data.deferredInvoices ? data.deferredInvoices.map(invoice => {
    console.log("Processing deferred invoice:", invoice);
    // التحقق مما إذا كانت الفاتورة معلقة (pending) أم موافق عليها (approved)
    const isPending = invoice.paymentStatus === 'deferred';
    const isApproved = invoice.paymentStatus === 'approved';

    return {
      id: `invoice-${invoice.id}`, // معرف فريد لتجنب تعارض المعرفات
      customerId: Number(customerId),
      amount: invoice.total || 0, // قيمة الفاتورة الآجلة (دائماً إيجابية/إضافة دين)
      reason: `${t('deferred_invoice')} #${invoice.invoiceNumber}`, // سبب الدين: "فاتورة آجلة #رقم_الفاتورة"
      date: invoice.date,
      createdAt: invoice.date,
      invoiceId: invoice.id,
      createdBy: 0, // لا يوجد مستخدم محدد للفواتير الآجلة
      isDeferred: true, // علامة لتحديد أن هذا العنصر هو فاتورة آجلة وليس دين يدوي
      isPending: isPending, // حالة الفاتورة (معلقة)
      isApproved: isApproved, // حالة الفاتورة (موافق عليها)
      paymentStatus: invoice.paymentStatus // حالة الدفع الأصلية
    };
  }) : [];

  // دمج الديون اليدوية والفواتير الآجلة في قائمة واحدة
  console.log("Manual debts count:", data.debts?.length || 0);
  console.log("Deferred invoices count:", deferredInvoiceDebts.length);

  // التأكد من أن data.debts موجود قبل استخدامه
  const manualDebts = data.debts || [];
  const allDebts = [...manualDebts, ...deferredInvoiceDebts];
  console.log("Total combined debt records:", allDebts.length);

  // ترتيب جميع الديون حسب التاريخ (الأحدث أولاً)
  const sortedDebts = allDebts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className={className}>
      {/* إجمالي الديون - يشمل الديون المضافة يدوياً + الفواتير الآجلة */}
      <div className="mb-4 p-3 bg-muted rounded-md flex justify-between items-center">
        <div>
          <span className="text-sm text-muted-foreground">{t('total_debt')}:</span>
          <span className={`ml-2 font-bold ${data.totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(data.totalDebt)}
          </span>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs px-2 py-0">
            {t('transactions_count')}: {sortedDebts.length}
          </Badge>
          {data.deferredInvoices && data.deferredInvoices.length > 0 && (
            <Badge variant="outline" className="text-xs px-2 py-0 bg-orange-50 text-orange-700">
              {t('deferred_invoices_count')}: {data.deferredInvoices.length}
            </Badge>
          )}
        </div>
      </div>

      {/* سجل المديونية الموحد (يشمل كل من الديون اليدوية والفواتير الآجلة) */}
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
            {sortedDebts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                  {t('no_debt_records')}
                </TableCell>
              </TableRow>
            ) : (
              sortedDebts.map((debt) => {
                // نستخدم نوع معاملة مختلف للفواتير الآجلة
                const transaction = debt.isDeferred
                  ? {
                      icon: <Receipt className="h-3 w-3 mr-1" />,
                      label: `${t('deferred_invoice')}${debt.paymentStatus === 'deferred' ? ` (${t('pending')})` : debt.paymentStatus === 'approved' ? ` (${t('approved')})` : ''}`,
                      color: debt.paymentStatus === 'deferred'
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : debt.paymentStatus === 'approved'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }
                  : getTransactionType(debt.amount, debt.invoiceId);

                return (
                  <TableRow key={debt.id}>
                    <TableCell className="font-medium text-xs">
                      {formatDate(debt.date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`flex items-center ${transaction.color}`}>
                        {transaction.icon}
                        <span>{transaction.label}</span>
                        {debt.invoiceId && !debt.isDeferred && (
                          <span className="ml-1 text-xs opacity-70">#{debt.invoiceId}</span>
                        )}
                        {debt.isDeferred && (
                          <span className="ml-1 text-xs opacity-70">#{debt.invoiceId}</span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {debt.reason || t('no_reason_provided')}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      debt.isDeferred 
                        ? 'text-orange-600' 
                        : (debt.amount > 0 ? 'text-red-600' : 'text-green-600')
                    }`}>
                      {formatCurrency(Math.abs(debt.amount))}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ملخص للديون */}
      <div className="mt-4 p-3 bg-muted rounded-md space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('manual_debt')}:</span>
          <span className={data.manualDebtTotal > 0 ? 'text-red-600' : 'text-green-600'}>
            {formatCurrency(data.manualDebtTotal)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('deferred_invoices_total')}:</span>
          <span className="text-orange-600">{formatCurrency(data.deferredInvoicesTotal)}</span>
        </div>
        <div className="flex justify-between font-bold border-t pt-2 mt-2">
          <span>{t('total_debt')}:</span>
          <span className={data.totalDebt > 0 ? 'text-red-600' : 'text-green-600'}>
            {formatCurrency(data.totalDebt)}
          </span>
        </div>
      </div>
    </div>
  );
}