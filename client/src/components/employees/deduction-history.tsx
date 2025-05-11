import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLocale } from '@/hooks/use-locale';

interface Deduction {
  id: string;
  employeeId: string;
  amount: number;
  reason: string;
  date: string;
}

interface DeductionHistoryProps {
  open: boolean;
  onClose: () => void;
  deductions: Deduction[];
  employeeName: string;
}

export default function DeductionHistory({
  open,
  onClose,
  deductions,
  employeeName,
}: DeductionHistoryProps) {
  const { t } = useTranslation();
  const { language } = useLocale();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {t('deduction_history_for')} {employeeName}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold">{t('date')}</TableHead>
                <TableHead className="font-semibold">{t('amount')}</TableHead>
                <TableHead className="font-semibold">{t('reason')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deductions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {t('no_deductions_yet')}
                  </TableCell>
                </TableRow>
              ) : (
                deductions.map((deduction, index) => (
                  <TableRow
                    key={deduction.id}
                    className={index % 2 === 0 ? 'bg-muted/20' : ''}
                  >
                    <TableCell>
                      {formatDate(deduction.date, 'PPpp', language)}
                    </TableCell>
                    <TableCell className="text-red-600 font-medium">
                      {formatCurrency(deduction.amount)}
                    </TableCell>
                    <TableCell>{deduction.reason}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}