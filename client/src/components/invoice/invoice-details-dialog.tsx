import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { FileText, Loader2, Printer, Share2, ArrowLeft } from 'lucide-react';
import InvoicePreview from '@/components/invoice-new/invoice-preview';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface InvoiceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
}

export default function InvoiceDetailsDialog({
  open,
  onOpenChange,
  invoice
}: InvoiceDetailsDialogProps) {
  const { t } = useTranslation();
  const { language } = useLocale();
  const isRTL = language === 'ar';

  // عرض حالة التحميل عندما تكون البيانات غير جاهزة
  if (!invoice) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            {t('invoice_details')} - {invoice.invoiceNumber}
          </DialogTitle>
          <DialogDescription>
            {t('view_invoice_details_description')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* استخدام مكون عرض الفاتورة نفسه المستخدم في إنشاء الفاتورة الجديدة */}
          <InvoicePreview 
            invoice={invoice}
            showPrintButton={true}
            showShareButton={true}
          />
        </div>

        <DialogFooter className="flex flex-row justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('back')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}