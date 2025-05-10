import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Printer, Share2, X, Download, Phone } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  isPotential?: boolean;
}

interface Product {
  id: string;
  name: string;
  barcode?: string;
  sellingPrice: number;
  quantity: number;
  discount?: number;
}

interface InvoicePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  invoiceNumber: string;
  invoiceDate: string;
  products: Product[];
  notes?: string;
  paymentMethod: string;
}

export default function InvoicePreview({
  open,
  onOpenChange,
  customer,
  invoiceNumber,
  invoiceDate,
  products,
  notes,
  paymentMethod
}: InvoicePreviewProps) {
  const { t } = useTranslation();
  const { language } = useLocale();
  const isRtl = language === 'ar';
  const invoiceRef = useRef<HTMLDivElement>(null);
  
  // حساب المبالغ
  const subtotal = products.reduce((sum, product) => sum + (product.sellingPrice * product.quantity), 0);
  const totalDiscount = products.reduce((sum, product) => {
    const discount = product.discount || 0;
    return sum + ((product.sellingPrice * product.quantity) * discount / 100);
  }, 0);
  const total = subtotal - totalDiscount;
  
  // تنزيل كـ PDF
  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    
    const canvas = await html2canvas(invoiceRef.current, {
      scale: 2,
      useCORS: true,
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`invoice-${invoiceNumber}.pdf`);
  };
  
  // طباعة الفاتورة
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && invoiceRef.current) {
      const content = invoiceRef.current.innerHTML;
      printWindow.document.write(`
        <html>
          <head>
            <title>فاتورة ${invoiceNumber}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                direction: ${isRtl ? 'rtl' : 'ltr'};
                padding: 20px;
                color: #333;
              }
              .invoice-container {
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                border: 1px solid #eee;
              }
              .invoice-header {
                display: flex;
                justify-content: space-between;
                border-bottom: 2px solid #f0f0f0;
                padding-bottom: 20px;
                margin-bottom: 20px;
              }
              .customer-info {
                margin-bottom: 20px;
              }
              .products-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
              }
              .products-table th, .products-table td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: ${isRtl ? 'right' : 'left'};
              }
              .products-table th {
                background-color: #f8f8f8;
              }
              .totals {
                margin-top: 20px;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                width: 250px;
                padding: 5px 0;
              }
              .total-value {
                font-weight: bold;
              }
              .grand-total {
                font-size: 1.2em;
                font-weight: bold;
                border-top: 2px solid #ddd;
                padding-top: 5px;
                margin-top: 5px;
              }
              .notes {
                margin-top: 30px;
                padding-top: 10px;
                border-top: 1px solid #eee;
              }
              .footer {
                margin-top: 50px;
                text-align: center;
                font-size: 0.8em;
                color: #666;
              }
              @media print {
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            ${content}
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };
  
  // مشاركة الفاتورة عبر رقم هاتف العميل
  const handleShare = async () => {
    // إذا لم يكن هناك رقم هاتف للعميل، نستخدم مشاركة الفاتورة العادية
    if (!customer.phone) {
      alert(t('customer_has_no_phone'));
      return;
    }
    
    // مشاركة عبر WhatsApp (الخيار المفضل إن كان متاحاً)
    const invoiceText = `${t('invoice')} #${invoiceNumber}\n${t('total')}: ${formatCurrency(total)}`;
    const whatsappUrl = `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(invoiceText)}`;
    
    // فتح نافذة جديدة لـ WhatsApp
    window.open(whatsappUrl, '_blank');
  };
  
  // مشاركة عامة للفاتورة
  const handleGeneralShare = async () => {
    if (!navigator.share) {
      alert(t('share_not_supported'));
      return;
    }
    
    if (invoiceRef.current) {
      try {
        const canvas = await html2canvas(invoiceRef.current, {
          scale: 2,
          useCORS: true,
          logging: false
        });
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `invoice-${invoiceNumber}.png`, { type: 'image/png' });
            
            try {
              await navigator.share({
                title: `${t('invoice')} #${invoiceNumber}`,
                text: `${t('invoice')} ${customer.name} - ${formatCurrency(total)}`,
                files: [file]
              });
            } catch (error) {
              console.error('Error sharing:', error);
              alert(t('share_error'));
            }
          }
        }, 'image/png');
      } catch (error) {
        console.error('Error creating image:', error);
      }
    }
  };
  
  const getPaymentMethodName = () => {
    switch (paymentMethod) {
      case 'cash': return t('cash');
      case 'card': return t('card');
      case 'later': return t('pay_later');
      default: return paymentMethod;
    }
  };
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t('invoice_preview')}</span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4" />
                {t('print')}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={handleDownloadPDF}
              >
                <Download className="h-4 w-4" />
                {t('download')}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={handleShare}
              >
                <Phone className="h-4 w-4" />
                {t('send_to_customer')}
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="pt-6">
          <div className="invoice-container bg-white p-6 rounded-lg shadow-sm" ref={invoiceRef}>
            {/* ترويسة الفاتورة */}
            <div className="flex justify-between items-start mb-6 pb-6 border-b">
              <div>
                <h1 className="text-2xl font-bold text-primary">
                  {t('invoice')}
                </h1>
                <div className="mt-2 text-gray-600">
                  <div>{t('invoice_number')}: <span className="font-semibold">{invoiceNumber}</span></div>
                  <div>{t('date')}: <span className="font-semibold">{formatDate(invoiceDate)}</span></div>
                  <div>{t('payment_method')}: <span className="font-semibold">{getPaymentMethodName()}</span></div>
                </div>
              </div>
              
              <div className="text-right">
                <h2 className="text-xl font-bold text-gray-700">Sales Ghazy</h2>
                <div className="text-sm text-gray-500">
                  <div>123 شارع الملك فيصل، القاهرة</div>
                  <div>هاتف: 01234567890</div>
                  <div>sales@ghazy.com</div>
                </div>
              </div>
            </div>
            
            {/* معلومات العميل */}
            <div className="mb-6 bg-muted/30 p-4 rounded-md">
              <h2 className="font-semibold text-gray-700 mb-2">{t('customer_information')}</h2>
              <div className="flex flex-col">
                <div className="font-medium text-lg">{customer.name}</div>
                {customer.phone && <div className="text-gray-600">{t('phone')}: {customer.phone}</div>}
                {customer.address && <div className="text-gray-600">{t('address')}: {customer.address}</div>}
              </div>
            </div>
            
            {/* المنتجات */}
            <table className="w-full border-collapse mb-6">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 text-start border">{t('product')}</th>
                  <th className="py-2 px-4 text-center border">{t('price')}</th>
                  <th className="py-2 px-4 text-center border">{t('quantity')}</th>
                  <th className="py-2 px-4 text-center border">{t('discount')} %</th>
                  <th className="py-2 px-4 text-end border">{t('total')}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const productTotal = product.sellingPrice * product.quantity;
                  const productDiscount = product.discount ? (productTotal * product.discount / 100) : 0;
                  const productNetTotal = productTotal - productDiscount;
                  
                  return (
                    <tr key={product.id} className="border-b">
                      <td className="py-3 px-4 border">
                        <div className="font-medium">{product.name}</div>
                        {product.barcode && (
                          <div className="text-xs text-gray-500">
                            {t('barcode')}: {product.barcode}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center border">{formatCurrency(product.sellingPrice)}</td>
                      <td className="py-3 px-4 text-center border">{product.quantity}</td>
                      <td className="py-3 px-4 text-center border">{product.discount || 0}%</td>
                      <td className="py-3 px-4 text-end border">{formatCurrency(productNetTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* المجموع */}
            <div className="flex justify-end">
              <div className="w-60 space-y-2">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">{t('subtotal')}:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-600">{t('total_discount')}:</span>
                    <span>{formatCurrency(totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2">
                  <span>{t('total')}:</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
            
            {/* الملاحظات */}
            {notes && (
              <div className="mt-8 pt-4 border-t">
                <h3 className="font-medium text-gray-700 mb-2">{t('notes')}:</h3>
                <p className="text-gray-600 whitespace-pre-line">{notes}</p>
              </div>
            )}
            
            {/* تذييل الفاتورة */}
            <div className="mt-10 pt-6 border-t text-center text-gray-500 text-sm">
              <p>{t('thank_you_message')}</p>
              <p className="mt-2">Sales Ghazy &copy; {new Date().getFullYear()}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}