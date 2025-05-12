import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { 
  Printer, Share2, Check, X, ChevronRight, Download, Phone, 
  CalendarDays, CreditCard, Receipt, ShoppingBag, Building
} from 'lucide-react';
import { 
  Card, CardContent, CardDescription, CardFooter, 
  CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDate } from '@/lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

interface InvoicePreviewProps {
  invoice: any;
  onClose: () => void;
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ invoice, onClose }) => {
  const { t } = useTranslation();
  const { language } = useLocale();
  const isRtl = language === 'ar';
  
  // استعلام لاسترجاع معلومات المتجر
  const { data: storeInfo } = useQuery({
    queryKey: ['/api/store-info'],
  });
  
  // طباعة الفاتورة
  const handlePrint = () => {
    window.print();
  };
  
  // مشاركة الفاتورة عبر واتساب
  const handleShare = async () => {
    if (!invoice.customerPhone) {
      alert(t('customer_has_no_phone'));
      return;
    }
    
    try {
      const phoneNumber = invoice.customerPhone.replace(/\D/g, '');
      
      // إنشاء رسالة واتساب
      let message = `${storeInfo?.name || 'Sales Ghazy'}\n`;
      message += `${t('invoice_number')}: ${invoice.invoiceNumber}\n`;
      message += `${t('date')}: ${formatDate(invoice.date)}\n\n`;
      message += `${t('dear')} ${invoice.customerName},\n`;
      message += `${t('whatsapp_message_content')}\n\n`;
      
      // إضافة تفاصيل المنتجات
      message += `${t('products')}:\n`;
      invoice.products.forEach((product: any, index: number) => {
        message += `${index+1}. ${product.productName} x${product.quantity} = ${formatCurrency(product.totalPrice)}\n`;
      });
      
      message += `\n${t('subtotal')}: ${formatCurrency(invoice.subtotal)}\n`;
      if (invoice.discount > 0) {
        message += `${t('discount')}: ${formatCurrency(invoice.discount)}\n`;
      }
      message += `${t('total')}: ${formatCurrency(invoice.total)}\n\n`;
      message += `${t('thank_you_for_your_business')}\n`;
      
      // فتح واتساب مع الرسالة
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error('Error sharing invoice:', error);
      alert(t('error_sharing_invoice'));
    }
  };
  
  // تحميل الفاتورة كملف PDF
  const handleDownloadPDF = async () => {
    const invoiceElement = document.getElementById('invoice-preview');
    if (!invoiceElement) return;
    
    try {
      const canvas = await html2canvas(invoiceElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(t('error_generating_pdf'));
    }
  };
  
  // الحصول على لون الحالة
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/10 text-green-600 border-green-200';
      case 'pending':
        return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'cancelled':
        return 'bg-red-500/10 text-red-600 border-red-200';
      case 'partially_paid':
        return 'bg-blue-500/10 text-blue-600 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };
  
  return (
    <div className="relative max-w-4xl mx-auto">
      {/* أزرار الإجراءات */}
      <div className="fixed top-4 right-4 z-50 flex gap-2 print:hidden">
        <Button variant="outline" size="icon" onClick={onClose} className="bg-white dark:bg-gray-950 shadow-md">
          <X className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handlePrint} className="bg-white dark:bg-gray-950 shadow-md">
          <Printer className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleShare} className="bg-white dark:bg-gray-950 shadow-md">
          <Share2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleDownloadPDF} className="bg-white dark:bg-gray-950 shadow-md">
          <Download className="h-4 w-4" />
        </Button>
      </div>
      
      {/* محتوى الفاتورة للطباعة */}
      <div id="invoice-preview" className="bg-white dark:bg-gray-950 rounded-lg shadow-lg p-6 print:p-2 print:shadow-none">
        {/* معلومات المتجر */}
        <div className="flex flex-col md:flex-row md:justify-between mb-8 items-center">
          <div className="mb-4 md:mb-0 text-center md:text-left">
            <h1 className="text-2xl font-bold">{storeInfo?.name || 'Sales Ghazy'}</h1>
            <p className="text-muted-foreground">{storeInfo?.address || t('store_address')}</p>
            <p className="text-muted-foreground">{storeInfo?.phone || t('store_phone')}</p>
          </div>
          <div className="text-center md:text-right">
            <h2 className="text-xl font-semibold text-primary">{t('invoice')}</h2>
            <p className="text-lg font-medium">#{invoice.invoiceNumber}</p>
            <div className="flex items-center justify-center md:justify-end mt-1">
              <CalendarDays className="h-4 w-4 text-muted-foreground mr-1" />
              <span className="text-muted-foreground text-sm">
                {formatDate(invoice.date)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* معلومات العميل */}
          <Card className="border-primary/10">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{t('bill_to')}</CardTitle>
                <Building className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">{invoice.customerName}</div>
              {invoice.customerPhone && (
                <div className="flex items-center mt-1">
                  <Phone className="h-4 w-4 text-muted-foreground mr-1" />
                  <span className="text-muted-foreground">{invoice.customerPhone}</span>
                </div>
              )}
              {invoice.customerAddress && (
                <div className="text-muted-foreground mt-1">
                  {invoice.customerAddress}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* معلومات الدفع */}
          <Card className="border-primary/10">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{t('payment_info')}</CardTitle>
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground">{t('method')}:</p>
                  <p className="font-medium">{t(invoice.paymentMethod)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('status')}:</p>
                  <Badge className={`${getStatusColor(invoice.paymentStatus)}`}>
                    {t(invoice.paymentStatus)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* جدول المنتجات */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3">{t('products')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left py-2 px-3 border-b">{t('product')}</th>
                  <th className="text-right py-2 px-3 border-b">{t('price')}</th>
                  <th className="text-center py-2 px-3 border-b">{t('quantity')}</th>
                  <th className="text-center py-2 px-3 border-b">{t('discount')}</th>
                  <th className="text-right py-2 px-3 border-b">{t('total')}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.products.map((product: any, index: number) => (
                  <tr key={index} className="border-b border-muted/20 hover:bg-muted/10">
                    <td className="py-2 px-3">
                      <div className="font-medium">{product.productName}</div>
                      {product.barcode && (
                        <div className="text-xs text-muted-foreground">{product.barcode}</div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">{formatCurrency(product.sellingPrice)}</td>
                    <td className="py-2 px-3 text-center">{product.quantity}</td>
                    <td className="py-2 px-3 text-center">
                      {product.discount ? `${product.discount}%` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">{formatCurrency(product.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* ملخص الفاتورة */}
        <div className="flex flex-col md:flex-row md:justify-between mb-8">
          {/* ملاحظات */}
          <div className="md:w-1/2 mb-6 md:mb-0">
            {invoice.notes && (
              <>
                <h3 className="text-lg font-semibold mb-2">{t('notes')}</h3>
                <div className="p-3 bg-muted/20 rounded-md border border-muted text-muted-foreground">
                  {invoice.notes}
                </div>
              </>
            )}
          </div>
          
          {/* المجاميع */}
          <div className="md:w-1/3">
            <div className="border rounded-md overflow-hidden">
              <div className="p-3 border-b bg-muted/20">
                <h3 className="font-semibold">{t('summary')}</h3>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('subtotal')}:</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('discount')}:</span>
                    <span className="text-muted-foreground">- {formatCurrency(invoice.discount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg pt-1">
                  <span>{t('total')}:</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* تذييل الفاتورة */}
        <div className="text-center text-muted-foreground border-t pt-4 mt-8">
          <p>{t('thank_you_message')}</p>
          <p className="text-sm mt-1">{storeInfo?.name || 'Sales Ghazy'} &copy; {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreview;