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
            <div className="mb-6 bg-blue-50 p-5 rounded-md border border-blue-100">
              <h2 className="font-semibold text-blue-700 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                {t('customer_information')}
              </h2>
              <div className="flex flex-col">
                <div className="font-medium text-lg text-gray-800">{customer.name}</div>
                {customer.phone && 
                  <div className="text-gray-700 flex items-center mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    {t('phone')}: <span className="font-medium">{customer.phone}</span>
                  </div>
                }
                {customer.address && 
                  <div className="text-gray-700 flex items-center mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {t('address')}: <span className="font-medium">{customer.address}</span>
                  </div>
                }
              </div>
            </div>
            
            {/* المنتجات */}
            <table className="w-full border-collapse mb-6 bg-white rounded-lg overflow-hidden shadow-sm">
              <thead>
                <tr className="bg-primary-50 text-primary-700">
                  <th className="py-3 px-4 text-start font-semibold border-b border-primary-100">{t('product')}</th>
                  <th className="py-3 px-4 text-center font-semibold border-b border-primary-100">{t('price')}</th>
                  <th className="py-3 px-4 text-center font-semibold border-b border-primary-100">{t('quantity')}</th>
                  {products.some(p => p.discount && p.discount > 0) && (
                    <th className="py-3 px-4 text-center font-semibold border-b border-primary-100">
                      <span className="flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zm7-10a1 1 0 01.707.293l.707.707L10 7.414 13.586 4l.707-.707a1 1 0 111.414 1.414L13 8.414l2.707 2.707a1 1 0 11-1.414 1.414L14 9.414 10.414 13l3.293 3.293a1 1 0 11-1.414 1.414l-.707-.707L8 13.414l-3.293 3.293a1 1 0 01-1.414-1.414L6.586 12 3.293 8.707a1 1 0 011.414-1.414L8 10.586l3.586-3.586-.707-.707a1 1 0 01-.103-1.304z" clipRule="evenodd" />
                        </svg>
                        {t('discount')} %
                      </span>
                    </th>
                  )}
                  <th className="py-3 px-4 text-end font-semibold border-b border-primary-100">{t('total')}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => {
                  const productTotal = product.sellingPrice * product.quantity;
                  const productDiscount = product.discount ? (productTotal * product.discount / 100) : 0;
                  const productNetTotal = productTotal - productDiscount;
                  
                  return (
                    <tr key={product.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-3 px-4 border-b border-gray-100">
                        <div className="font-medium text-gray-800">{product.name}</div>
                        {product.barcode && (
                          <div className="text-xs text-gray-500 mt-1 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zm-2 7a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zm8-12a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2V5h1v1h-1zm-2 7a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3zm2 2v-1h1v1h-1z" clipRule="evenodd" />
                            </svg>
                            {t('barcode')}: {product.barcode}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center border-b border-gray-100 font-medium">{formatCurrency(product.sellingPrice)}</td>
                      <td className="py-3 px-4 text-center border-b border-gray-100">
                        <span className="inline-flex items-center justify-center min-w-[2rem] bg-blue-50 text-blue-600 py-1 px-2 rounded-full font-medium">
                          {product.quantity}
                        </span>
                      </td>
                      {products.some(p => p.discount && p.discount > 0) && (
                        <td className="py-3 px-4 text-center border-b border-gray-100">
                          {product.discount ? (
                            <span className="text-amber-600 font-medium">
                              {product.discount}%
                            </span>
                          ) : '0%'}
                        </td>
                      )}
                      <td className="py-3 px-4 text-end border-b border-gray-100 font-semibold text-gray-900">{formatCurrency(productNetTotal)}</td>
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