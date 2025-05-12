import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { useStoreInfo } from '@/hooks/use-store-info';
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
  const { storeInfo } = useStoreInfo();
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
    
    try {
      // إنشاء عنصر HTML لتعيين الفاتورة
      const invoiceElement = document.createElement('div');
      
      // إعداد البيانات
      const customerName = customer.name || '';
      const customerPhone = customer.phone || '';
      const customerAddress = customer.address || '';
      
      // تنسيق التاريخ
      const formattedDate = formatDate(invoiceDate);
      
      // إنشاء HTML للفاتورة باللغة الإنجليزية فقط
      invoiceElement.innerHTML = `
        <div style="font-family: Arial, sans-serif; width: 800px; padding: 20px; box-sizing: border-box; margin: 0 auto;">
          <!-- Header -->
          <div style="background-color: #2980b9; color: white; padding: 15px; text-align: center; border-radius: 5px 5px 0 0;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">${storeInfo.name}</h1>
            <p style="margin: 5px 0; font-size: 14px;">${storeInfo.address}</p>
            <p style="margin: 5px 0; font-size: 14px;">${storeInfo.phone}</p>
          </div>
          
          <!-- Invoice Information -->
          <div style="margin: 20px 0; overflow: hidden;">
            <div style="float: left; text-align: left; width: 50%;">
              <h3 style="margin: 0 0 10px; color: #333; font-size: 16px; font-weight: bold;">
                Invoice Information:
              </h3>
              <p style="margin: 5px 0; font-size: 14px; color: #555;">
                <strong>Invoice Number:</strong> ${invoiceNumber}
              </p>
              <p style="margin: 5px 0; font-size: 14px; color: #555;">
                <strong>Date:</strong> ${formattedDate}
              </p>
              <p style="margin: 5px 0; font-size: 14px; color: #555;">
                <strong>Payment Method:</strong> ${paymentMethod}
              </p>
            </div>
            
            <div style="float: right; text-align: right; width: 50%;">
              <h3 style="margin: 0 0 10px; color: #333; font-size: 16px; font-weight: bold;">
                Customer Information:
              </h3>
              <p style="margin: 5px 0; font-size: 14px; color: #555;">
                <strong>Name:</strong> ${customerName}
              </p>
              ${customerPhone ? `
                <p style="margin: 5px 0; font-size: 14px; color: #555;">
                  <strong>Phone:</strong> ${customerPhone}
                </p>
              ` : ''}
              ${customerAddress ? `
                <p style="margin: 5px 0; font-size: 14px; color: #555;">
                  <strong>Address:</strong> ${customerAddress}
                </p>
              ` : ''}
            </div>
          </div>
          
          <!-- Divider -->
          <div style="border-top: 1px solid #ddd; margin: 15px 0;"></div>
          
          <!-- Products List -->
          <h3 style="text-align: center; color: #2980b9; margin: 20px 0; font-size: 18px;">
            Products
          </h3>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #2980b9; color: white;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Product</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Price</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Quantity</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${products.map((item: any, index: number) => `
                <tr style="background-color: ${index % 2 === 0 ? '#f9f9f9' : 'white'};">
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: left;">
                    ${item.name || 'Unknown Product'}
                  </td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                    ${formatCurrency(item.sellingPrice)}
                  </td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                    ${item.quantity}
                  </td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">
                    ${formatCurrency(item.sellingPrice * item.quantity)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <!-- Payment Summary -->
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; text-align: right; width: 300px; margin-left: auto;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="font-weight: bold; color: #555;">Subtotal:</span>
              <span>${formatCurrency(subtotal)}</span>
            </div>
            
            ${totalDiscount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="font-weight: bold; color: #555;">Discount:</span>
                <span>${formatCurrency(totalDiscount)}</span>
              </div>
            ` : ''}
            
            <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 16px; border-top: 1px solid #ddd; padding-top: 10px;">
              <span style="font-weight: bold; color: #333;">Total:</span>
              <span style="font-weight: bold; color: #2980b9;">${formatCurrency(total)}</span>
            </div>
          </div>
          
          <!-- Thank You Message -->
          <div style="text-align: center; margin-top: 30px; color: #2980b9; font-style: italic;">
            <p>Thank you for your business! We look forward to serving you again.</p>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #999;">
            <p>© ${new Date().getFullYear()} ${storeInfo.name} - ${new Date().toLocaleDateString('en-US')}</p>
          </div>
        </div>
      `;
      
      // إضافة عنصر الفاتورة مؤقتًا إلى الصفحة بحيث يمكن تصويره
      Object.assign(invoiceElement.style, {
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        zIndex: '-9999'
      });
      document.body.appendChild(invoiceElement);
      
      try {
        // التقاط الفاتورة كصورة باستخدام html2canvas
        const canvas = await html2canvas(invoiceElement, {
          scale: 2, // زيادة الدقة للحصول على جودة أفضل
          logging: false,
          useCORS: true
        });
        
        // إزالة عنصر الفاتورة المؤقت
        document.body.removeChild(invoiceElement);
        
        // تحويل الصورة إلى PDF
        const imgData = canvas.toDataURL('image/png');
        
        // إنشاء PDF بنفس أبعاد الصورة
        const pdfWidth = 210; // حجم A4 بالملم
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        const pdf = new jsPDF({
          orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
          unit: 'mm',
          format: [pdfWidth, pdfHeight]
        });
        
        // إضافة الصورة إلى PDF
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        // حفظ الملف
        pdf.save(`invoice-${invoiceNumber}.pdf`);
      } catch (renderError) {
        // إزالة عنصر الفاتورة إذا حدث خطأ
        if (document.body.contains(invoiceElement)) {
          document.body.removeChild(invoiceElement);
        }
        throw renderError;
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };
  
  // طباعة الفاتورة بنفس نمط ملف PDF
  const handlePrint = async () => {
    try {
      // إنشاء عنصر HTML لتعيين الفاتورة
      const invoiceElement = document.createElement('div');
      
      // إعداد البيانات
      const customerName = customer.name || '';
      const customerPhone = customer.phone || '';
      const customerAddress = customer.address || '';
      
      // تنسيق التاريخ
      const formattedDate = formatDate(invoiceDate);
      
      // إنشاء HTML للفاتورة باللغة الإنجليزية فقط
      invoiceElement.innerHTML = `
        <div style="font-family: Arial, sans-serif; width: 800px; padding: 20px; box-sizing: border-box; margin: 0 auto;">
          <!-- Header -->
          <div style="background-color: #2980b9; color: white; padding: 15px; text-align: center; border-radius: 5px 5px 0 0;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">${storeInfo.name}</h1>
            <p style="margin: 5px 0; font-size: 14px;">${storeInfo.address}</p>
            <p style="margin: 5px 0; font-size: 14px;">${storeInfo.phone}</p>
          </div>
          
          <!-- Invoice Information -->
          <div style="margin: 20px 0; overflow: hidden;">
            <div style="float: left; text-align: left; width: 50%;">
              <h3 style="margin: 0 0 10px; color: #333; font-size: 16px; font-weight: bold;">
                Invoice Information:
              </h3>
              <p style="margin: 5px 0; font-size: 14px; color: #555;">
                <strong>Invoice Number:</strong> ${invoiceNumber}
              </p>
              <p style="margin: 5px 0; font-size: 14px; color: #555;">
                <strong>Date:</strong> ${formattedDate}
              </p>
              <p style="margin: 5px 0; font-size: 14px; color: #555;">
                <strong>Payment Method:</strong> ${paymentMethod}
              </p>
            </div>
            
            <div style="float: right; text-align: right; width: 50%;">
              <h3 style="margin: 0 0 10px; color: #333; font-size: 16px; font-weight: bold;">
                Customer Information:
              </h3>
              <p style="margin: 5px 0; font-size: 14px; color: #555;">
                <strong>Name:</strong> ${customerName}
              </p>
              ${customerPhone ? `
                <p style="margin: 5px 0; font-size: 14px; color: #555;">
                  <strong>Phone:</strong> ${customerPhone}
                </p>
              ` : ''}
              ${customerAddress ? `
                <p style="margin: 5px 0; font-size: 14px; color: #555;">
                  <strong>Address:</strong> ${customerAddress}
                </p>
              ` : ''}
            </div>
          </div>
          
          <!-- Divider -->
          <div style="border-top: 1px solid #ddd; margin: 15px 0;"></div>
          
          <!-- Products List -->
          <h3 style="text-align: center; color: #2980b9; margin: 20px 0; font-size: 18px;">
            Products
          </h3>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #2980b9; color: white;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Product</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Price</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Quantity</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${products.map((item: any, index: number) => `
                <tr style="background-color: ${index % 2 === 0 ? '#f9f9f9' : 'white'};">
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: left;">
                    ${item.name || 'Unknown Product'}
                  </td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                    ${formatCurrency(item.sellingPrice)}
                  </td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                    ${item.quantity}
                  </td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">
                    ${formatCurrency(item.sellingPrice * item.quantity)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <!-- Payment Summary -->
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; text-align: right; width: 300px; margin-left: auto;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="font-weight: bold; color: #555;">Subtotal:</span>
              <span>${formatCurrency(subtotal)}</span>
            </div>
            
            ${totalDiscount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="font-weight: bold; color: #555;">Discount:</span>
                <span>${formatCurrency(totalDiscount)}</span>
              </div>
            ` : ''}
            
            <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 16px; border-top: 1px solid #ddd; padding-top: 10px;">
              <span style="font-weight: bold; color: #333;">Total:</span>
              <span style="font-weight: bold; color: #2980b9;">${formatCurrency(total)}</span>
            </div>
          </div>
          
          <!-- Thank You Message -->
          <div style="text-align: center; margin-top: 30px; color: #2980b9; font-style: italic;">
            <p>Thank you for your business! We look forward to serving you again.</p>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #999;">
            <p>© ${new Date().getFullYear()} ${storeInfo.name} - ${new Date().toLocaleDateString('en-US')}</p>
          </div>
        </div>
      `;
      
      // إنشاء نافذة الطباعة
      const printWindow = window.open('', '_blank');
      
      if (printWindow) {
        // إضافة محتوى HTML إلى نافذة الطباعة
        printWindow.document.write(`
          <html>
            <head>
              <title>Invoice #${invoiceNumber}</title>
              <style>
                body { margin: 0; padding: 0; }
                @media print {
                  body { -webkit-print-color-adjust: exact; color-adjust: exact; }
                }
              </style>
            </head>
            <body onload="setTimeout(function() { window.print(); window.close(); }, 500)">
              ${invoiceElement.innerHTML}
            </body>
          </html>
        `);
        
        printWindow.document.close();
      } else {
        alert(t('print_error'));
      }
    } catch (error) {
      console.error('Error printing:', error);
    }
  };
  
  // مشاركة الفاتورة
  const handleShare = async () => {
    // التحقق من دعم المتصفح للمشاركة
    if (!navigator.share) {
      // إذا كان العميل لديه رقم هاتف، نحاول فتح واتساب
      if (customer.phone) {
        window.open(`https://wa.me/${customer.phone.replace(/\D/g, '')}`, '_blank');
        return;
      }
      
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
      <DialogContent className="max-w-3xl overflow-y-auto max-h-screen">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span>{t('invoice_preview')}</span>
          </DialogTitle>
          <DialogDescription>
            {t('invoice_preview_description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 pb-4">
          <div 
            ref={invoiceRef}
            className={`p-6 bg-white rounded-lg shadow-sm border ${isRtl ? 'rtl' : 'ltr'}`}
          >
            {/* رأس الفاتورة */}
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-gray-700">{storeInfo.name}</h2>
              <div className="text-gray-500 text-sm">
                <div>{storeInfo.address}</div>
                <div>{storeInfo.phone}</div>
              </div>
            </div>
            
            {/* بيانات الفاتورة والعميل */}
            <div className="flex flex-col sm:flex-row justify-between mb-6 gap-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">{t('invoice_details')}:</h3>
                <div className="text-sm">
                  <div><span className="font-medium">{t('invoice_number')}:</span> {invoiceNumber}</div>
                  <div><span className="font-medium">{t('date')}:</span> {formatDate(invoiceDate)}</div>
                  <div><span className="font-medium">{t('payment_method')}:</span> {getPaymentMethodName()}</div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">{t('customer_details')}:</h3>
                <div className="text-sm">
                  <div><span className="font-medium">{t('name')}:</span> {customer.name}</div>
                  {customer.phone && (
                    <div><span className="font-medium">{t('phone')}:</span> {customer.phone}</div>
                  )}
                  {customer.address && (
                    <div><span className="font-medium">{t('address')}:</span> {customer.address}</div>
                  )}
                </div>
              </div>
            </div>
            
            {/* جدول المنتجات */}
            <table className="w-full border-collapse mb-6">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border py-2 px-3 text-left">{t('product')}</th>
                  <th className="border py-2 px-3 text-center">{t('price')}</th>
                  <th className="border py-2 px-3 text-center">{t('quantity')}</th>
                  <th className="border py-2 px-3 text-right">{t('total')}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="border py-2 px-3">{product.name}</td>
                    <td className="border py-2 px-3 text-center">
                      {formatCurrency(product.sellingPrice)}
                    </td>
                    <td className="border py-2 px-3 text-center">{product.quantity}</td>
                    <td className="border py-2 px-3 text-right">
                      {formatCurrency(product.sellingPrice * product.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* ملخص الحساب */}
            <div className="flex justify-end mb-6">
              <div className="w-60 bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between mb-2">
                  <span>{t('subtotal')}:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                
                {totalDiscount > 0 && (
                  <div className="flex justify-between mb-2 text-green-600">
                    <span>{t('discount')}:</span>
                    <span>{formatCurrency(totalDiscount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                  <span>{t('total')}:</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
            
            {/* ملاحظات */}
            {notes && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-2">{t('notes')}:</h3>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{notes}</p>
              </div>
            )}
            
            {/* تذييل الفاتورة */}
            <div className="text-center mt-8 pt-4 border-t">
              <p className="text-gray-600 font-medium">{t('thank_you_message')}</p>
              <p className="mt-2 text-gray-500 text-sm">{storeInfo.name} &copy; {new Date().getFullYear()}</p>
            </div>
          </div>
        </div>
        
        {/* أزرار العمليات */}
        <div className="flex justify-between items-center mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex gap-1 items-center" 
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              <span>{t('share')}</span>
            </Button>
            
            <Button 
              variant="outline"
              className="flex gap-1 items-center" 
              onClick={handleDownloadPDF}
            >
              <Download className="h-4 w-4" />
              <span>{t('download')}</span>
            </Button>
            
            <Button 
              variant="default"
              className="flex gap-1 items-center" 
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              <span>{t('print')}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}