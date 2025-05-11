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
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Sales Ghazy</h1>
            <p style="margin: 5px 0; font-size: 14px;">Cairo - Egypt</p>
            <p style="margin: 5px 0; font-size: 14px;">01067677607</p>
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
            <p>© ${new Date().getFullYear()} Sales Ghazy - ${new Date().toLocaleDateString('en-US')}</p>
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
    try {
      // إذا لم يكن هناك رقم هاتف للعميل، نستخدم مشاركة الفاتورة العادية
      if (!customer.phone) {
        alert(t('customer_has_no_phone'));
        return;
      }
      
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
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Sales Ghazy</h1>
            <p style="margin: 5px 0; font-size: 14px;">Cairo - Egypt</p>
            <p style="margin: 5px 0; font-size: 14px;">01067677607</p>
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
            <p>© ${new Date().getFullYear()} Sales Ghazy - ${new Date().toLocaleDateString('en-US')}</p>
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
        
        // تنظيف رقم الهاتف وإزالة المسافات والشرطات وأي رموز غير رقمية
        let phone = customer.phone.replace(/\s+|-|\(|\)|\+/g, '');
        
        // إضافة رمز البلد إذا لم يكن موجودًا
        if (!phone.startsWith('20')) {
          phone = '20' + phone;
        }
        
        // حفظ PDF كـ blob
        const pdfBlob = pdf.output('blob');
        
        // إنشاء URL للتنزيل
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        // إنشاء رابط التنزيل
        const downloadLink = document.createElement('a');
        downloadLink.href = pdfUrl;
        downloadLink.download = `invoice-${invoiceNumber}.pdf`;
        
        // تنزيل الملف
        downloadLink.click();
        
        // مشاركة عبر واتساب
        const shareMessage = `${t('invoice_sent')} - ${invoiceNumber}`;
        const whatsappURL = `https://wa.me/${phone}?text=${encodeURIComponent(shareMessage)}`;
        
        // فتح واتساب في نافذة جديدة
        window.open(whatsappURL, '_blank');
      } catch (renderError) {
        // إزالة عنصر الفاتورة إذا حدث خطأ
        if (document.body.contains(invoiceElement)) {
          document.body.removeChild(invoiceElement);
        }
        throw renderError;
      }
    } catch (error) {
      console.error('Error sharing invoice:', error);
      
      // استخدام الطريقة البسيطة في حالة الفشل
      if (customer.phone) {
        const invoiceText = `${t('invoice')} #${invoiceNumber}\n${t('total')}: ${formatCurrency(total)}`;
        const whatsappUrl = `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(invoiceText)}`;
        window.open(whatsappUrl, '_blank');
      }
    }
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
                variant="secondary" 
                size="sm" 
                className="flex items-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border-blue-200 shadow-sm"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4" />
                {t('print')}
              </Button>
              
              <Button 
                variant="secondary" 
                size="sm" 
                className="flex items-center gap-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 border-emerald-200 shadow-sm"
                onClick={handleDownloadPDF}
              >
                <Download className="h-4 w-4" />
                {t('download')}
              </Button>
              
              <Button 
                variant="secondary" 
                size="sm" 
                className="flex items-center gap-1 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 border-amber-200 shadow-sm"
                onClick={handleShare}
              >
                <Phone className="h-4 w-4" />
                {t('send_to_customer')}
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full h-8 w-8 p-0 flex items-center justify-center ml-2"
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
            <div className="flex justify-end mt-4">
              <div className="w-72 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-700 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                    </svg>
                    {t('invoice_summary')}
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">{t('subtotal')}:</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-sm pb-2">
                      <span className="text-amber-600 font-medium flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zm7-10a1 1 0 01.707.293l.707.707L10 7.414 13.586 4l.707-.707a1 1 0 111.414 1.414L13 8.414l2.707 2.707a1 1 0 11-1.414 1.414L14 9.414 10.414 13l3.293 3.293a1 1 0 11-1.414 1.414l-.707-.707L8 13.414l-3.293 3.293a1 1 0 01-1.414-1.414L6.586 12 3.293 8.707a1 1 0 011.414-1.414L8 10.586l3.586-3.586-.707-.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        {t('total_discount')}:
                      </span>
                      <span className="text-amber-600 font-medium">- {formatCurrency(totalDiscount)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-3 mt-2">
                    <div className="flex justify-between font-bold text-base">
                      <span className="text-gray-800">{t('total')}:</span>
                      <span className="text-primary text-lg">{formatCurrency(total)}</span>
                    </div>
                    <div className="text-xs text-gray-500 text-right mt-1">
                      {t('payment_method')}: <span className="font-medium">{getPaymentMethodName()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* الملاحظات */}
            {notes && (
              <div className="mt-8 pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-700 mb-2 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  {t('notes')}:
                </h3>
                <p className="text-gray-600 whitespace-pre-line bg-gray-50 p-3 rounded-md border border-gray-100">{notes}</p>
              </div>
            )}
            
            {/* تذييل الفاتورة */}
            <div className="mt-10 pt-6 border-t border-gray-200 text-center">
              <div className="flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary mb-2 opacity-80" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-gray-600 font-medium">{t('thank_you_message')}</p>
                <p className="mt-2 text-gray-500 text-sm">Sales Ghazy &copy; {new Date().getFullYear()}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}