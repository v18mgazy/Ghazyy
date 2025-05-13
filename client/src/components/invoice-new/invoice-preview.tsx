import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { 
  Printer, Share2, Check, X, ChevronRight, Download, Phone, 
  CalendarDays, CreditCard, Receipt, ShoppingBag, Building, 
  Loader2
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
import { useToast } from '@/hooks/use-toast';

interface InvoicePreviewProps {
  open?: boolean; 
  onOpenChange?: (open: boolean) => void;
  customer?: {
    id: string;
    name: string;
    phone: string;
    address: string;
  };
  invoiceNumber?: string;
  invoiceDate?: string;
  products?: any[];
  notes?: string;
  paymentMethod?: string;
  invoice?: any;
  onClose?: () => void;
  subtotal?: number;
  itemsDiscount?: number;
  invoiceDiscount?: number;
  total?: number;
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ 
  invoice,
  onClose = () => {},
  customer,
  invoiceNumber,
  invoiceDate,
  products,
  notes,
  paymentMethod,
  subtotal,
  itemsDiscount,
  invoiceDiscount,
  total
}) => {
  // إذا تم تمرير كائن الفاتورة كاملاً، نستخدمه، وإلا نستخدم الخصائص الفردية
  const invoiceData = invoice || {
    customerName: customer?.name,
    customerPhone: customer?.phone,
    customerAddress: customer?.address,
    invoiceNumber,
    date: invoiceDate,
    notes,
    paymentMethod,
    subtotal,
    itemsDiscount,
    invoiceDiscount,
    total,
    products: products || []
  };
  const { t } = useTranslation();
  const { language } = useLocale();
  const isRtl = language === 'ar';
  const { toast } = useToast();
  const invoiceRef = useRef<HTMLDivElement>(null);
  
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  // جلب معلومات المتجر
  const { data: storeInfo = {} } = useQuery({
    queryKey: ['/api/store-info'],
  });
  
  // معالجة بيانات المنتجات من الفاتورة
  const parseProducts = () => {
    try {
      // الحالة الأولى: إذا كانت المنتجات متوفرة مباشرة كمصفوفة (عند إنشاء فاتورة جديدة)
      if (Array.isArray(products) && products.length > 0) {
        console.log('Using direct products array:', products);
        // التأكد من أن كل منتج يحتوي على الخصائص المطلوبة
        return products.map(product => ({
          ...product,
          productName: product.productName || product.name || 'Unknown Product',
        }));
      }
      
      // الحالة الثانية: إذا كانت بيانات المنتجات متوفرة كنص JSON (من قاعدة البيانات)
      if (typeof invoiceData.productsData === 'string' && invoiceData.productsData) {
        console.log('Parsing productsData from JSON:', invoiceData.productsData);
        try {
          const parsedProducts = JSON.parse(invoiceData.productsData);
          return parsedProducts.map(product => ({
            ...product,
            productName: product.productName || product.name || 'Unknown Product',
          }));
        } catch (parseError) {
          console.error('Error parsing JSON:', parseError);
          throw parseError;
        }
      }
      
      // الحالة الثالثة: إذا كانت الفاتورة تحتوي على مصفوفة منتجات مباشرة
      if (invoiceData.products && Array.isArray(invoiceData.products)) {
        console.log('Using products array from invoiceData:', invoiceData.products);
        return invoiceData.products.map(product => ({
          ...product,
          productName: product.productName || product.name || 'Unknown Product',
        }));
      }
      
      // إذا لم تتوفر أي بيانات، نحاول تكوين بيانات المنتجات من حقول المنتجات المنفصلة
      if (invoiceData.productIds && invoiceData.productNames && invoiceData.productQuantities && 
          invoiceData.productPrices && invoiceData.productDiscounts) {
        
        console.log('Reconstructing products from separate fields');
        
        const ids = String(invoiceData.productIds).split(',');
        const names = String(invoiceData.productNames).split(',');
        const quantities = String(invoiceData.productQuantities).split(',').map(Number);
        const prices = String(invoiceData.productPrices).split(',').map(Number);
        const discounts = String(invoiceData.productDiscounts).split(',').map(Number);
        
        const reconstructedProducts = ids.map((id, index) => ({
          productId: id,
          productName: names[index] || 'Unknown Product',
          quantity: quantities[index] || 0,
          sellingPrice: prices[index] || 0,
          discount: discounts[index] || 0,
        }));
        
        console.log('Reconstructed products:', reconstructedProducts);
        return reconstructedProducts;
      }
      
      // إذا لم تتوفر أي بيانات، نرجع مصفوفة فارغة
      console.log('No products data found, returning empty array');
      return [];
    } catch (error) {
      console.error('Error parsing products data:', error);
      // ترجع مصفوفة بمنتج وهمي للتأكد من وجود محتوى على الأقل (للتنقيح فقط)
      if (process.env.NODE_ENV === 'development') {
        console.log('In development mode, returning debug product');
        return [{
          productId: 'debug-product',
          productName: 'Debug Product (Data Error)',
          quantity: 1,
          sellingPrice: invoiceData.total || 0,
          discount: 0,
        }];
      }
      return [];
    }
  };
  
  const invoiceProducts = parseProducts();
  console.log('Processed invoice products:', invoiceProducts);
  
  // حالات الدفع
  const getStatusBadgeProps = (status: string) => {
    switch (status) {
      case 'paid':
        return { variant: 'success' as const, text: t('paid') };
      case 'pending':
        return { variant: 'warning' as const, text: t('pending') };
      case 'cancelled':
        return { variant: 'destructive' as const, text: t('cancelled') };
      case 'approved':
        return { variant: 'success' as const, text: t('approved') };
      case 'partially_paid':
        return { variant: 'outline' as const, text: t('partially_paid') };
      default:
        return { variant: 'outline' as const, text: status };
    }
  };
  
  // طباعة الفاتورة بتنسيق محسن
  const handlePrint = async () => {
    if (!invoiceRef.current) return;
    
    setIsPrinting(true);
    
    try {
      // إنشاء عنصر HTML لتعيين الفاتورة بتنسيق محسن
      const invoiceElement = document.createElement('div');
      
      // استخراج البيانات اللازمة
      const products = invoiceProducts || []; console.log("Printing products:", products);
      
      // إنشاء HTML للفاتورة بتنسيق محسن (باللغة الإنجليزية فقط للتوافق)
      invoiceElement.innerHTML = `
        <div style="font-family: Arial, sans-serif; width: 700px; padding: 20px; box-sizing: border-box; margin: 0 auto;">
          <!-- Header -->
          <div style="background-color: #2980b9; color: white; padding: 15px; text-align: center; border-radius: 5px 5px 0 0;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">${storeInfo.name || 'Sales Ghazy'}</h1>
            <p style="margin: 5px 0; font-size: 14px;">${storeInfo.address || ''}</p>
            <p style="margin: 5px 0; font-size: 14px;">${storeInfo.phone || ''}</p>
          </div>
          
          <!-- Invoice Information -->
          <div style="margin: 20px 0; overflow: hidden;">
            <div style="float: left; text-align: left; width: 50%;">
              <h3 style="margin: 0 0 10px; color: #333; font-size: 16px; font-weight: bold;">
                Invoice Information:
              </h3>
              <p style="margin: 5px 0; font-size: 14px; color: #555;">
                <strong>Invoice Number:</strong> ${invoiceData.invoiceNumber}
              </p>
              <p style="margin: 5px 0; font-size: 14px; color: #555;">
                <strong>Date:</strong> ${formatDate(invoiceData.date)}
              </p>
              <p style="margin: 5px 0; font-size: 14px; color: #555;">
                <strong>Payment Method:</strong> ${getPaymentMethodName(invoiceData.paymentMethod)}
              </p>
            </div>
            
            <div style="float: right; text-align: right; width: 50%;">
              <h3 style="margin: 0 0 10px; color: #333; font-size: 16px; font-weight: bold;">
                Customer Information:
              </h3>
              <p style="margin: 5px 0; font-size: 14px; color: #555;">
                <strong>Name:</strong> ${invoiceData.customerName}
              </p>
              <p style="margin: 5px 0; font-size: 14px; color: #555;">
                <strong>Phone:</strong> ${invoiceData.customerPhone || 'N/A'}
              </p>
              <p style="margin: 5px 0; font-size: 14px; color: #555;">
                <strong>Address:</strong> ${invoiceData.customerAddress || 'N/A'}
              </p>
            </div>
          </div>
          
          <!-- Products Table -->
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #ddd;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Product</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Price</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Quantity</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceProducts.map((item, index) => {
                const productTotal = item.sellingPrice * item.quantity;
                const discountAmount = item.discount ? (productTotal * (item.discount / 100)) : 0;
                const finalTotal = productTotal - discountAmount;
                
                return `
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd;">
                    <div style="font-weight: 500;">${item.productName || item.name || "Unknown Product"}</div>
                    ${item.discount > 0 ? `<div style="font-size: 12px; color: #777;">${item.discount}% discount</div>` : ''}
                  </td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">
                    ${formatCurrency(item.sellingPrice)}
                  </td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                    ${item.quantity}
                  </td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">
                    ${formatCurrency(finalTotal)}
                  </td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
          
          <!-- Payment Summary -->
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; text-align: right; width: 300px; margin-left: auto;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="font-weight: bold; color: #555;">Subtotal:</span>
              <span>${formatCurrency(invoiceData.subtotal)}</span>
            </div>
            
            ${(invoiceData.itemsDiscount && invoiceData.itemsDiscount > 0) ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="font-weight: bold; color: #555;">Items Discount:</span>
                <span>${formatCurrency(invoiceData.itemsDiscount)}</span>
              </div>
            ` : ''}
            
            ${(invoiceData.invoiceDiscount && invoiceData.invoiceDiscount > 0) ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="font-weight: bold; color: #555;">Invoice Discount:</span>
                <span>${formatCurrency(invoiceData.invoiceDiscount)}</span>
              </div>
            ` : ''}
            
            <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 16px; border-top: 1px solid #ddd; padding-top: 10px;">
              <span style="font-weight: bold; color: #333;">Total:</span>
              <span style="font-weight: bold; color: #2980b9;">${formatCurrency(invoiceData.total)}</span>
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
      
      // إضافة CSS للطباعة
      const printStyles = `
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible;
          }
          #printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `;
      
      // إضافة عنصر الفاتورة مؤقتًا للصفحة
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
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
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
        
        // حفظ ملف PDF
        pdf.save(`invoice-${invoiceData.invoiceNumber}.pdf`);
        
        toast({
          title: t('success'),
          description: t('invoice_printed_successfully'),
        });
      } catch (error) {
        console.error('Error printing invoice:', error);
        if (document.body.contains(invoiceElement)) {
          document.body.removeChild(invoiceElement);
        }
        toast({
          title: t('error'),
          description: t('error_printing_invoice'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating PDF:', error);
      toast({
        title: t('error'),
        description: t('error_printing_invoice'),
        variant: 'destructive',
      });
    } finally {
      setIsPrinting(false);
    }
  };
  
  // مشاركة الفاتورة عبر واتساب بملف PDF
  const handleShare = async () => {
    if (!invoiceData.customerPhone) {
      toast({
        title: t('error'),
        description: t('customer_has_no_phone'),
        variant: 'destructive',
      });
      return;
    }
    
    setIsSharing(true);
    
    try {
      // إنشاء عنصر HTML لتعيين الفاتورة بتنسيق محسن
      const invoiceElement = document.createElement('div');
      
      // استخراج البيانات اللازمة
      const products = invoiceProducts || [];
      
      // إنشاء HTML للفاتورة بتنسيق محسن (باللغة الإنجليزية فقط للتوافق)
      invoiceElement.innerHTML = `
        <div style="font-family: Arial, sans-serif; width: 700px; padding: 20px; box-sizing: border-box; margin: 0 auto;">
          <!-- Header -->
          <div style="background-color: #2980b9; color: white; padding: 15px; text-align: center; border-radius: 5px 5px 0 0;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">${storeInfo.name || 'Sales Ghazy'}</h1>
            <p style="margin: 5px 0; font-size: 14px;">${storeInfo.address || ''}</p>
            <p style="margin: 5px 0; font-size: 14px;">${storeInfo.phone || ''}</p>
          </div>
          
          <!-- Invoice Information -->
          <div style="margin: 20px 0; overflow: hidden;">
            <div style="float: left; text-align: left; width: 50%;">
              <h3 style="margin: 0 0 10px; color: #333; font-size: 16px; font-weight: bold;">
                Invoice Information:
              </h3>
              <p style="margin: 5px 0; font-size: 14px; color: #555;">
                <strong>Invoice Number:</strong> ${invoiceData.invoiceNumber}
              </p>
              <p style="margin: 5px 0; font-size: 14px; color: #555;">
                <strong>Date:</strong> ${formatDate(invoiceData.date)}
              </p>
              <p style="margin: 5px 0; font-size: 14px; color: #555;">
                <strong>Payment Method:</strong> ${getPaymentMethodName(invoiceData.paymentMethod)}
              </p>
            </div>
            
            <div style="float: right; text-align: right; width: 50%;">
              <h3 style="margin: 0 0 10px; color: #333; font-size: 16px; font-weight: bold;">
                Customer Information:
              </h3>
              <p style="margin: 5px 0; font-size: 14px; color: #555;">
                <strong>Name:</strong> ${invoiceData.customerName}
              </p>
              <p style="margin: 5px 0; font-size: 14px; color: #555;">
                <strong>Phone:</strong> ${invoiceData.customerPhone || 'N/A'}
              </p>
              <p style="margin: 5px 0; font-size: 14px; color: #555;">
                <strong>Address:</strong> ${invoiceData.customerAddress || 'N/A'}
              </p>
            </div>
          </div>
          
          <!-- Products Table -->
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #ddd;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Product</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Price</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Quantity</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceProducts.map((item, index) => {
                const productTotal = item.sellingPrice * item.quantity;
                const discountAmount = item.discount ? (productTotal * (item.discount / 100)) : 0;
                const finalTotal = productTotal - discountAmount;
                
                return `
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd;">
                    <div style="font-weight: 500;">${item.productName || item.name || "Unknown Product"}</div>
                    ${item.discount > 0 ? `<div style="font-size: 12px; color: #777;">${item.discount}% discount</div>` : ''}
                  </td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">
                    ${formatCurrency(item.sellingPrice)}
                  </td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                    ${item.quantity}
                  </td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">
                    ${formatCurrency(finalTotal)}
                  </td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
          
          <!-- Payment Summary -->
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; text-align: right; width: 300px; margin-left: auto;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="font-weight: bold; color: #555;">Subtotal:</span>
              <span>${formatCurrency(invoiceData.subtotal)}</span>
            </div>
            
            ${(invoiceData.itemsDiscount && invoiceData.itemsDiscount > 0) ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="font-weight: bold; color: #555;">Items Discount:</span>
                <span>${formatCurrency(invoiceData.itemsDiscount)}</span>
              </div>
            ` : ''}
            
            ${(invoiceData.invoiceDiscount && invoiceData.invoiceDiscount > 0) ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="font-weight: bold; color: #555;">Invoice Discount:</span>
                <span>${formatCurrency(invoiceData.invoiceDiscount)}</span>
              </div>
            ` : ''}
            
            <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 16px; border-top: 1px solid #ddd; padding-top: 10px;">
              <span style="font-weight: bold; color: #333;">Total:</span>
              <span style="font-weight: bold; color: #2980b9;">${formatCurrency(invoiceData.total)}</span>
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
      
      // إضافة عنصر الفاتورة مؤقتًا للصفحة
      Object.assign(invoiceElement.style, {
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        zIndex: '-9999'
      });
      document.body.appendChild(invoiceElement);
      
      try {
        // توليد ملف PDF
        const canvas = await html2canvas(invoiceElement, {
          scale: 2,
          logging: false,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
        });
        
        // إزالة عنصر الفاتورة المؤقت
        document.body.removeChild(invoiceElement);
        
        // تحويل الصورة إلى PDF
        const imgData = canvas.toDataURL('image/png');
        
        // إنشاء PDF
        const pdfWidth = 210; // حجم A4 بالملم
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        const pdf = new jsPDF({
          orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
          unit: 'mm',
          format: [pdfWidth, pdfHeight]
        });
        
        // إضافة الصورة إلى PDF
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        // تحويل PDF إلى سلسلة نصية بصيغة base64
        const pdfBase64 = pdf.output('datauristring');
        
        // إنشاء نص الرسالة
        const message = `*${storeInfo.name || t('store')}*\\n` +
          `${t('invoice_number')}: ${invoiceData.invoiceNumber}\\n` +
          `${t('date')}: ${formatDate(invoiceData.date)}\\n` +
          `${t('customer')}: ${invoiceData.customerName}\\n\\n` +
          `${t('total')}: ${formatCurrency(invoiceData.total)}\\n\\n` +
          `${t('payment_method')}: ${getPaymentMethodName(invoiceData.paymentMethod)}\\n` +
          `${t('payment_status')}: ${getStatusBadgeProps(invoiceData.paymentStatus || 'paid').text}\\n\\n` +
          `${t('check_attachment_for_invoice_details')}\\n\\n` +
          `${t('thank_you_for_your_business')}`;
        
        // تحديد رقم الهاتف وفتح التطبيق
        const phoneNumber = invoiceData.customerPhone.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        
        // فتح واتساب وتنزيل الملف
        window.open(whatsappUrl, '_blank');
        pdf.save(`invoice-${invoiceData.invoiceNumber}.pdf`);
        
        toast({
          title: t('success'),
          description: t('invoice_shared_successfully'),
        });
      } catch (error) {
        console.error('Error generating PDF for sharing:', error);
        if (document.body.contains(invoiceElement)) {
          document.body.removeChild(invoiceElement);
        }
        
        // في حالة فشل إنشاء PDF، استخدم طريقة المشاركة النصية القديمة كخطة بديلة
        const productsText = invoiceProducts.map((product: any, index: number) => 
          `${index + 1}. ${product.productName} x${product.quantity} = ${formatCurrency(product.sellingPrice * product.quantity)}`
        ).join('\\n');
        
        const fallbackMessage = `*${storeInfo.name || t('store')}*\\n` +
          `${t('invoice_number')}: ${invoiceData.invoiceNumber}\\n` +
          `${t('date')}: ${formatDate(invoiceData.date)}\\n` +
          `${t('customer')}: ${invoiceData.customerName}\\n\\n` +
          `*${t('products')}*:\\n${productsText}\\n\\n` +
          `${t('subtotal')}: ${formatCurrency(invoiceData.subtotal)}\\n` +
          (invoiceData.itemsDiscount > 0 ? `${t('item_discounts')}: ${formatCurrency(invoiceData.itemsDiscount)}\\n` : '') +
          (invoiceData.invoiceDiscount > 0 ? `${t('invoice_discount')}: ${formatCurrency(invoiceData.invoiceDiscount)}\\n` : '') +
          `*${t('total')}*: ${formatCurrency(invoiceData.total)}\\n\\n` +
          `${t('payment_method')}: ${getPaymentMethodName(invoiceData.paymentMethod)}\\n` +
          `${t('payment_status')}: ${getStatusBadgeProps(invoiceData.paymentStatus || 'paid').text}\\n\\n` +
          `${t('thank_you_for_your_business')}`;
        
        const phoneNumber = invoiceData.customerPhone.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(fallbackMessage)}`;
        
        window.open(whatsappUrl, '_blank');
        
        toast({
          title: t('success'),
          description: t('invoice_shared_as_text'),
        });
      }
    } catch (error) {
      console.error('Error sharing invoice:', error);
      toast({
        title: t('error'),
        description: t('error_sharing_invoice'),
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
    }
  };
  
  // ترجمة طريقة الدفع
  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'cash':
        return t('cash');
      case 'card':
        return t('card');
      case 'deferred':
      case 'pay_later':
        return t('pay_later');
      case 'e-wallet':
        return t('e_wallet');
      default:
        return method;
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center overflow-auto py-8" 
         onClick={onClose}>
      <Card className="mx-auto w-full max-w-3xl bg-white shadow-xl" 
            ref={invoiceRef}
            onClick={(e) => e.stopPropagation()}>
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-4 border-b">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">
                {t('invoice')} #{invoiceData.invoiceNumber}
              </CardTitle>
              <CardDescription className="mt-1 flex items-center text-sm">
                <CalendarDays className="h-4 w-4 mr-1 text-muted-foreground" />
                {formatDate(invoiceData.date)}
              </CardDescription>
            </div>
            
            <Badge
              variant={getStatusBadgeProps(invoiceData.paymentStatus || 'paid').variant}
              className="px-3 py-1 text-sm"
            >
              {getStatusBadgeProps(invoiceData.paymentStatus || 'paid').text}
            </Badge>
          </div>
          
          {/* معلومات المتجر */}
          <div className="mt-4 rounded-lg bg-white p-3 shadow-sm border">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-base">{storeInfo.name || t('store')}</h3>
                {storeInfo.address && (
                  <p className="text-sm text-muted-foreground">
                    <Building className="inline-block h-3 w-3 mr-1" />
                    {storeInfo.address}
                  </p>
                )}
                {storeInfo.phone && (
                  <p className="text-sm text-muted-foreground">
                    <Phone className="inline-block h-3 w-3 mr-1" />
                    {storeInfo.phone}
                  </p>
                )}
              </div>
              
              <div className="text-right">
                <h3 className="font-bold text-base">{invoiceData.customerName}</h3>
                {invoiceData.customerAddress && (
                  <p className="text-sm text-muted-foreground">
                    {invoiceData.customerAddress}
                  </p>
                )}
                {invoiceData.customerPhone && (
                  <p className="text-sm text-muted-foreground">
                    {invoiceData.customerPhone}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="my-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{t('payment_details')}</h3>
              
              <div className="flex items-center text-sm">
                <CreditCard className="h-4 w-4 mr-1 text-muted-foreground" />
                {getPaymentMethodName(invoiceData.paymentMethod)}
              </div>
            </div>
            
            <Separator className="my-3" />
            
            {/* قائمة المنتجات */}
            <div className="space-y-3">
              <h3 className="font-semibold">{t('products')}</h3>
              
              <div className="rounded-md border">
                <div className="grid grid-cols-12 text-sm font-medium bg-muted p-2">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">{t('product')}</div>
                  <div className="col-span-2 text-center">{t('price')}</div>
                  <div className="col-span-2 text-center">{t('quantity')}</div>
                  <div className="col-span-2 text-right">{t('total')}</div>
                </div>
                
                {invoiceProducts.map((product: any, index: number) => {
                  const productTotal = product.sellingPrice * product.quantity;
                  const discountAmount = product.discount ? (productTotal * (product.discount / 100)) : 0;
                  const finalTotal = productTotal - discountAmount;
                  
                  return (
                    <div 
                      key={`${product.productId}-${index}`}
                      className="grid grid-cols-12 text-sm p-2 border-t"
                    >
                      <div className="col-span-1">{index + 1}</div>
                      <div className="col-span-5">
                        <div className="font-medium">{product.productName}</div>
                        {product.discount > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {product.discount}% {t('discount')}
                          </div>
                        )}
                      </div>
                      <div className="col-span-2 text-center">{formatCurrency(product.sellingPrice)}</div>
                      <div className="col-span-2 text-center">{product.quantity}</div>
                      <div className="col-span-2 text-right">{formatCurrency(finalTotal)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* ملخص المبالغ */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('subtotal')}:</span>
                <span>{formatCurrency(invoiceData.subtotal)}</span>
              </div>
              
              {invoiceData.itemsDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('item_discounts')}:</span>
                  <span>- {formatCurrency(invoiceData.itemsDiscount)}</span>
                </div>
              )}
              
              {invoiceData.invoiceDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('invoice_discount')}:
                  </span>
                  <span>- {formatCurrency(invoiceData.invoiceDiscount)}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between font-bold pt-1">
                <span>{t('total')}:</span>
                <span className="text-primary">{formatCurrency(invoiceData.total)}</span>
              </div>
            </div>
            
            {/* ملاحظات */}
            {invoiceData.notes && (
              <div className="mt-6 p-3 bg-muted/20 rounded-md">
                <h4 className="text-sm font-semibold mb-1">{t('notes')}:</h4>
                <p className="text-sm text-muted-foreground">{invoiceData.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="bg-muted/10 p-6 flex flex-col sm:flex-row justify-between gap-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            {t('close')}
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleShare} disabled={isSharing}>
              {isSharing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="mr-2 h-4 w-4" />
              )}
              {t('share')}
            </Button>
            
            <Button variant="default" onClick={handlePrint} disabled={isPrinting}>
              {isPrinting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Printer className="mr-2 h-4 w-4" />
              )}
              {t('print')}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default InvoicePreview;