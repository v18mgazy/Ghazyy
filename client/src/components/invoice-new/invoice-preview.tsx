import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { 
  Printer, Share2, Check, X, ChevronRight, Download, Phone, DollarSign , User , Calculator,
  CalendarDays, CreditCard, Receipt, ShoppingBag, Building, 
  Loader2, ArrowLeft, MessageSquare, FileText
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
        return products.map(product => ({
          ...product,
          productName: product.productName || product.name || 'Unknown Product',
        }));
      }

      // الحالة الثانية: إذا كانت بيانات المنتجات متوفرة كنص JSON (من قاعدة البيانات)
      if (typeof invoiceData.productsData === 'string' && invoiceData.productsData) {
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
        return invoiceData.products.map(product => ({
          ...product,
          productName: product.productName || product.name || 'Unknown Product',
        }));
      }

      // إذا لم تتوفر أي بيانات، نحاول تكوين بيانات المنتجات من حقول المنتجات المنفصلة
      if (invoiceData.productIds && invoiceData.productNames && invoiceData.productQuantities && 
          invoiceData.productPrices && invoiceData.productDiscounts) {

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

        return reconstructedProducts;
      }

      // إذا لم تتوفر أي بيانات، نرجع مصفوفة فارغة
      return [];
    } catch (error) {
      console.error('Error parsing products data:', error);
      // نرجع مصفوفة فارغة في حالة الخطأ
      return [];
    }
  };

  const invoiceProducts = parseProducts();

  // حالات الدفع
  const getStatusBadgeProps = (status: string) => {
    switch (status) {
      case 'paid':
        return { variant: 'default' as const, text: t('paid') };
      case 'pending':
        return { variant: 'outline' as const, text: t('pending') };
      case 'cancelled':
        return { variant: 'destructive' as const, text: t('cancelled') };
      case 'approved':
        return { variant: 'default' as const, text: t('approved') };
      case 'partially_paid':
        return { variant: 'outline' as const, text: t('partially_paid') };
      default:
        return { variant: 'outline' as const, text: status };
    }
  };

  // الحصول على اسم طريقة الدفع
  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'cash':
        return t('cash');
      case 'card':
        return t('card');
      case 'deferred':
        return t('deferred');
      default:
        return method;
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
      const products = invoiceProducts || [];

      // إنشاء HTML للفاتورة بتنسيق محسن
      invoiceElement.innerHTML = `
        <div style="font-family: Arial, sans-serif; width: 700px; padding: 20px; box-sizing: border-box; margin: 0 auto; direction: ${isRtl ? 'rtl' : 'ltr'}; text-align: ${isRtl ? 'right' : 'left'};">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 20px; text-align: center; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">${storeInfo.name || 'Sales Ghazy'}</h1>
            <p style="margin: 5px 0; font-size: 14px;">${storeInfo.address || ''}</p>
            <p style="margin: 5px 0; font-size: 14px;">${storeInfo.phone || ''}</p>
          </div>

          <!-- Invoice Information -->
          <div style="margin: 20px 0; overflow: hidden; display: flex; flex-wrap: wrap; justify-content: space-between; background-color: #f8fafc; border-radius: 10px; padding: 15px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
            <div style="flex: 1; min-width: 250px; padding: 10px;">
              <h3 style="margin: 0 0 10px; color: #4f46e5; font-size: 16px; font-weight: bold; border-bottom: 2px solid #4f46e5; padding-bottom: 5px; display: inline-block;">
                ${t('invoice_information')}:
              </h3>
              <p style="margin: 8px 0; font-size: 14px; color: #555; display: flex; align-items: center;">
                <span style="font-weight: bold; color: #333; min-width: 120px;">${t('invoice_number')}:</span> 
                <span style="background-color: #eef2ff; padding: 2px 8px; border-radius: 4px;">${invoiceData.invoiceNumber}</span>
              </p>
              <p style="margin: 8px 0; font-size: 14px; color: #555; display: flex; align-items: center;">
                <span style="font-weight: bold; color: #333; min-width: 120px;">${t('date')}:</span> 
                <span>${formatDate(invoiceData.date)}</span>
              </p>
              <p style="margin: 8px 0; font-size: 14px; color: #555; display: flex; align-items: center;">
                <span style="font-weight: bold; color: #333; min-width: 120px;">${t('payment_method')}:</span> 
                <span>${getPaymentMethodName(invoiceData.paymentMethod)}</span>
              </p>
              <p style="margin: 8px 0; font-size: 14px; color: #555; display: flex; align-items: center;">
                <span style="font-weight: bold; color: #333; min-width: 120px;">${t('status')}:</span> 
                <span style="background-color: ${invoiceData.paymentStatus === 'paid' ? '#dcfce7' : '#fee2e2'}; color: ${invoiceData.paymentStatus === 'paid' ? '#166534' : '#991b1b'}; padding: 2px 8px; border-radius: 4px; font-weight: 500;">
                  ${getStatusBadgeProps(invoiceData.paymentStatus).text}
                </span>
              </p>
            </div>

            <div style="flex: 1; min-width: 250px; padding: 10px;">
              <h3 style="margin: 0 0 10px; color: #4f46e5; font-size: 16px; font-weight: bold; border-bottom: 2px solid #4f46e5; padding-bottom: 5px; display: inline-block;">
                ${t('customer_information')}:
              </h3>
              <p style="margin: 8px 0; font-size: 14px; color: #555; display: flex; align-items: center;">
                <span style="font-weight: bold; color: #333; min-width: 120px;">${t('name')}:</span> 
                <span style="font-weight: 500;">${invoiceData.customerName}</span>
              </p>
              <p style="margin: 8px 0; font-size: 14px; color: #555; display: flex; align-items: center;">
                <span style="font-weight: bold; color: #333; min-width: 120px;">${t('phone')}:</span> 
                <span>${invoiceData.customerPhone || t('not_available')}</span>
              </p>
              <p style="margin: 8px 0; font-size: 14px; color: #555; display: flex; align-items: center;">
                <span style="font-weight: bold; color: #333; min-width: 120px;">${t('address')}:</span> 
                <span>${invoiceData.customerAddress || t('not_available')}</span>
              </p>
            </div>
          </div>

          <!-- Products Table -->
          <div style="margin: 25px 0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <table style="width: 100%; border-collapse: collapse; background-color: white;">
              <thead>
                <tr style="background: linear-gradient(to right, #4f46e5, #7c3aed); color: white;">
                  <th style="padding: 12px 15px; text-align: ${isRtl ? 'right' : 'left'}; font-weight: 500;">${t('product')}</th>
                  <th style="padding: 12px 15px; text-align: ${isRtl ? 'left' : 'right'}; font-weight: 500;">${t('price')}</th>
                  <th style="padding: 12px 15px; text-align: center; font-weight: 500;">${t('quantity')}</th>
                  <th style="padding: 12px 15px; text-align: ${isRtl ? 'left' : 'right'}; font-weight: 500;">${t('discount')}</th>
                  <th style="padding: 12px 15px; text-align: ${isRtl ? 'left' : 'right'}; font-weight: 500;">${t('total')}</th>
                </tr>
              </thead>
              <tbody>
                ${products.map((item, index) => {
                  const productTotal = item.sellingPrice * item.quantity;
                  const discountAmount = item.discount ? (productTotal * (item.discount / 100)) : 0;
                  const finalTotal = productTotal - discountAmount;

                  return `
                  <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 1 ? 'background-color: #f9fafb;' : ''}">
                    <td style="padding: 12px 15px;">
                      <div style="font-weight: 500; color: #4f46e5;">${item.productName || item.name || "Unknown Product"}</div>
                      ${item.barcode ? `<div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${t('barcode')}: ${item.barcode}</div>` : ''}
                    </td>
                    <td style="padding: 12px 15px; text-align: ${isRtl ? 'left' : 'right'}; font-variant-numeric: tabular-nums;">
                      ${formatCurrency(item.sellingPrice)}
                    </td>
                    <td style="padding: 12px 15px; text-align: center; font-weight: 500; font-variant-numeric: tabular-nums;">
                      <span style="background-color: #eef2ff; padding: 2px 8px; border-radius: 4px;">${item.quantity}</span>
                    </td>
                    <td style="padding: 12px 15px; text-align: ${isRtl ? 'left' : 'right'}; font-variant-numeric: tabular-nums;">
                      ${item.discount > 0 ? `<span style="color: #ef4444;">${item.discount}%</span>` : '-'}
                    </td>
                    <td style="padding: 12px 15px; text-align: ${isRtl ? 'left' : 'right'}; font-weight: 500; color: #4f46e5; font-variant-numeric: tabular-nums;">
                      ${formatCurrency(finalTotal)}
                    </td>
                  </tr>
                `}).join('')}
              </tbody>
            </table>
          </div>

          <!-- Payment Summary -->
          <div style="display: flex; justify-content: ${isRtl ? 'flex-start' : 'flex-end'}; margin-bottom: 30px;">
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 10px; width: 300px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-weight: 500; color: #6b7280;">${t('subtotal')}:</span>
                <span style="font-variant-numeric: tabular-nums;">${formatCurrency(invoiceData.subtotal)}</span>
              </div>

              ${(invoiceData.itemsDiscount && invoiceData.itemsDiscount > 0) ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="font-weight: 500; color: #6b7280;">${t('items_discount')}:</span>
                  <span style="color: #ef4444; font-variant-numeric: tabular-nums;">- ${formatCurrency(invoiceData.itemsDiscount)}</span>
                </div>
              ` : ''}

              ${(invoiceData.invoiceDiscount && invoiceData.invoiceDiscount > 0) ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="font-weight: 500; color: #6b7280;">${t('invoice_discount')}:</span>
                  <span style="color: #ef4444; font-variant-numeric: tabular-nums;">- ${formatCurrency(invoiceData.invoiceDiscount)}</span>
                </div>
              ` : ''}

              <div style="display: flex; justify-content: space-between; margin-top: 15px; font-size: 18px; border-top: 2px solid #e5e7eb; padding-top: 10px;">
                <span style="font-weight: bold; color: #333;">${t('total')}:</span>
                <span style="font-weight: bold; color: #4f46e5; font-variant-numeric: tabular-nums;">${formatCurrency(invoiceData.total)}</span>
              </div>
            </div>
          </div>

          ${invoiceData.notes ? `
            <!-- Notes -->
            <div style="margin: 20px 0; padding: 15px; background-color: #eef2ff; border-radius: 10px; border-left: 4px solid #4f46e5;">
              <h3 style="margin: 0 0 10px; color: #4f46e5; font-size: 16px; font-weight: bold;">
                ${t('notes')}:
              </h3>
              <p style="margin: 0; font-size: 14px; color: #555; line-height: 1.5;">
                ${invoiceData.notes}
              </p>
            </div>
          ` : ''}

          <!-- Thank You Message -->
          <div style="text-align: center; margin-top: 30px; color: #4f46e5; font-style: italic; background-color: #eef2ff; padding: 15px; border-radius: 10px;">
            <p style="margin: 0; font-size: 16px;">${t('thank_you_message')}</p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 15px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} ${storeInfo.name || 'Sales Ghazy'} - ${new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</p>
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
        pdf.save(`invoice-${invoiceData.invoiceNumber || 'new'}.pdf`);

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
      // إنشاء ملف PDF أولاً
      await handlePrint();

      // تنسيق رقم الهاتف
      let phoneNumber = invoiceData.customerPhone.replace(/\s+/g, '');
      if (!phoneNumber.startsWith('+')) {
        phoneNumber = '+' + phoneNumber;
      }

      // إنشاء رابط واتساب
      const message = `${t('invoice_share_message')} #${invoiceData.invoiceNumber || 'new'}`;
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

      // فتح رابط واتساب في نافذة جديدة
      window.open(whatsappUrl, '_blank');

      toast({
        title: t('success'),
        description: t('invoice_shared_successfully'),
      });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onClose}
          className="flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back')}
        </Button>

        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center"
          >
            {isPrinting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-2 h-4 w-4" />
            )}
            {t('print')}
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleShare}
            disabled={isSharing || !invoiceData.customerPhone}
            className="flex items-center"
          >
            {isSharing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="mr-2 h-4 w-4" />
            )}
            {t('share_whatsapp')}
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center"
          >
            <Download className="mr-2 h-4 w-4" />
            {t('download_pdf')}
          </Button>
        </div>
      </div>

      <div ref={invoiceRef} className="bg-card rounded-lg shadow-lg overflow-hidden">
        {/* رأس الفاتورة */}
        <div className="bg-gradient-to-r from-primary to-primary-600 text-primary-foreground p-6 text-center">
          <h2 className="text-2xl font-bold mb-1">{storeInfo.name || 'Sales Ghazy'}</h2>
          {storeInfo.address && <p className="text-sm opacity-90">{storeInfo.address}</p>}
          {storeInfo.phone && <p className="text-sm opacity-90">{storeInfo.phone}</p>}
        </div>

        {/* معلومات الفاتورة والعميل */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-accent/30">
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Receipt className="mr-2 h-5 w-5 text-primary" />
                {t('invoice_information')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('invoice_number')}:</span>
                <Badge variant="outline" className="font-mono">
                  {invoiceData.invoiceNumber || '-'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('date')}:</span>
                <span className="flex items-center">
                  <CalendarDays className="mr-1 h-3 w-3 text-muted-foreground" />
                  {formatDate(invoiceData.date)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('payment_method')}:</span>
                <span className="flex items-center">
                  {invoiceData.paymentMethod === 'cash' && <DollarSign className="mr-1 h-3 w-3 text-primary" />}
                  {invoiceData.paymentMethod === 'card' && <CreditCard className="mr-1 h-3 w-3 text-primary" />}
                  {getPaymentMethodName(invoiceData.paymentMethod)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('status')}:</span>
                <Badge variant={getStatusBadgeProps(invoiceData.paymentStatus).variant}>
                  {getStatusBadgeProps(invoiceData.paymentStatus).text}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <User className="mr-2 h-5 w-5 text-primary" />
                {t('customer_information')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('name')}:</span>
                <span className="font-medium">{invoiceData.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('phone')}:</span>
                {invoiceData.customerPhone ? (
                  <span className="flex items-center">
                    <Phone className="mr-1 h-3 w-3 text-primary" />
                    {invoiceData.customerPhone}
                  </span>
                ) : (
                  <span className="text-muted-foreground italic">{t('not_available')}</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('address')}:</span>
                {invoiceData.customerAddress ? (
                  <span className="flex items-center">
                    <Building className="mr-1 h-3 w-3 text-primary" />
                    {invoiceData.customerAddress}
                  </span>
                ) : (
                  <span className="text-muted-foreground italic">{t('not_available')}</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* جدول المنتجات */}
        <div className="p-6">
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <ShoppingBag className="mr-2 h-5 w-5 text-primary" />
                {t('products')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-primary/5 border-b border-primary/10">
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">{t('product')}</th>
                      <th className="py-3 px-4 text-right font-medium text-muted-foreground">{t('price')}</th>
                      <th className="py-3 px-4 text-center font-medium text-muted-foreground">{t('quantity')}</th>
                      <th className="py-3 px-4 text-right font-medium text-muted-foreground">{t('discount')}</th>
                      <th className="py-3 px-4 text-right font-medium text-muted-foreground">{t('total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 px-4 text-center text-muted-foreground">
                          {t('no_products')}
                        </td>
                      </tr>
                    ) : (
                      invoiceProducts.map((product, index) => {
                        const productTotal = product.sellingPrice * product.quantity;
                        const discountAmount = product.discount ? (productTotal * (product.discount / 100)) : 0;
                        const finalTotal = productTotal - discountAmount;

                        return (
                          <tr key={index} className={`border-b border-border ${index % 2 === 1 ? 'bg-accent/30' : ''}`}>
                            <td className="py-3 px-4">
                              <div className="font-medium text-primary">{product.productName || product.name}</div>
                              {product.barcode && (
                                <div className="text-xs text-muted-foreground flex items-center mt-1">
                                  <FileText className="mr-1 h-3 w-3" />
                                  {product.barcode}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-mono">
                              {formatCurrency(product.sellingPrice)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge variant="outline" className="font-mono">
                                {product.quantity}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {product.discount > 0 ? (
                                <Badge variant="destructive" className="font-mono">
                                  {product.discount}%
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-primary font-mono">
                              {formatCurrency(finalTotal)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ملخص الدفع */}
        <div className="p-6 pt-0 flex justify-end">
          <Card className="border-primary/20 shadow-sm w-full md:w-80">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Calculator className="mr-2 h-5 w-5 text-primary" />
                {t('payment_summary')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('subtotal')}:</span>
                <span className="font-mono">{formatCurrency(invoiceData.subtotal)}</span>
              </div>

              {invoiceData.itemsDiscount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('items_discount')}:</span>
                  <span className="font-mono text-destructive">- {formatCurrency(invoiceData.itemsDiscount)}</span>
                </div>
              )}

              {invoiceData.invoiceDiscount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('invoice_discount')}:</span>
                  <span className="font-mono text-destructive">- {formatCurrency(invoiceData.invoiceDiscount)}</span>
                </div>
              )}

              <Separator className="my-2" />

              <div className="flex justify-between items-center">
                <span className="font-medium">{t('total')}:</span>
                <span className="font-bold text-primary font-mono text-lg">{formatCurrency(invoiceData.total)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ملاحظات */}
        {invoiceData.notes && (
          <div className="px-6 pb-6">
            <Card className="border-primary/20 shadow-sm border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-primary" />
                  {t('notes')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{invoiceData.notes}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* تذييل الفاتورة */}
        <div className="bg-accent/30 p-6 text-center">
          <p className="text-primary italic">{t('thank_you_message')}</p>
          <p className="text-xs text-muted-foreground mt-2">
            © {new Date().getFullYear()} {storeInfo.name || 'Sales Ghazy'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreview;
