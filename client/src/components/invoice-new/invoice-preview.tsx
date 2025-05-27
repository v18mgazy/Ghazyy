import React, { useRef, useState, useEffect } from 'react';
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
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas'; // Keep for potential image rendering if needed
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import NotoSansArabic from '/home/ubuntu/SalesTrackr/SalesTrackr/client/src/assets/fonts/NotoSansArabic-VariableFont_wdth,wght.ttf'; // Assuming font is placed here

interface InvoicePreviewProps {
  invoice: any; // Use the full invoice object
  onClose?: () => void;
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ 
  invoice,
  onClose = () => {},
}) => {
  const { t } = useTranslation();
  const { language } = useLocale();
  const isRtl = language === 'ar';
  const { toast } = useToast();
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharing, setIsSharing] = useState(false); // Keep share functionality if needed

  // Fetch store info
  const { data: storeInfo = {} } = useQuery<any>({
    queryKey: ['/api/store-info'],
    // Assuming apiRequest is defined elsewhere and handles fetching
    // queryFn: () => apiRequest('GET', '/api/store-info').then(res => res.json()), 
  });

  // Parse products (simplified, assuming invoice.products is the correct array)
  const invoiceProducts = Array.isArray(invoice.products) ? invoice.products : [];

  // Payment status badge logic (assuming it exists and works)
  const getStatusBadgeProps = (status: string) => {
    // ... (keep existing logic or adapt)
    switch (status) {
      case 'paid': return { variant: 'default' as const, text: t('paid'), color: '#16a34a', bgColor: '#dcfce7' };
      case 'pending': return { variant: 'outline' as const, text: t('pending'), color: '#ea580c', bgColor: '#fff7ed' };
      case 'cancelled': return { variant: 'destructive' as const, text: t('cancelled'), color: '#dc2626', bgColor: '#fee2e2' };
      case 'approved': return { variant: 'default' as const, text: t('approved'), color: '#16a34a', bgColor: '#dcfce7' };
      case 'partially_paid': return { variant: 'outline' as const, text: t('partially_paid'), color: '#ca8a04', bgColor: '#fefce8' };
      default: return { variant: 'outline' as const, text: status, color: '#52525b', bgColor: '#f4f4f5' };
    }
  };

  // Payment method name logic
  const getPaymentMethodName = (method: string) => {
    // ... (keep existing logic or adapt)
    switch (method) {
      case 'cash': return t('cash');
      case 'card': return t('card');
      case 'deferred': return t('deferred');
      default: return method;
    }
  };

  // --- New PDF Generation using jsPDF --- 
  const handleGeneratePdf = async () => {
    if (!invoice) return;
    setIsGeneratingPdf(true);

    try {
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pageHeight = pdf.internal.pageSize.height;
      const pageWidth = pdf.internal.pageSize.width;
      const margin = 40;
      let yPos = margin;
      const elementHeight = (size: number) => size * 1.2; // Approx line height

      // --- Add Font --- 
      // Note: jsPDF font embedding can be tricky. This assumes the font file is accessible.
      // For web environments, using standard fonts or Base64 encoding might be more reliable.
      // Let's try adding the font. If it fails, jsPDF might fallback to standard fonts.
      try {
        // This path needs to be correct relative to where the code runs or accessible via URL/Base64
        // pdf.addFont('/home/ubuntu/SalesTrackr/SalesTrackr/client/src/assets/fonts/NotoSansArabic-VariableFont_wdth,wght.ttf', 'NotoSansArabic', 'normal');
        // pdf.setFont('NotoSansArabic');
        // Using standard font for broader compatibility for now
        pdf.setFont('Helvetica', 'sans-serif'); 
      } catch (fontError) {
        console.error("Font loading error:", fontError);
        pdf.setFont('Helvetica', 'sans-serif'); // Fallback font
      }

      // --- RTL Handling --- 
      const textAlign = isRtl ? 'right' : 'left';
      const xStart = isRtl ? pageWidth - margin : margin;
      const xEnd = isRtl ? margin : pageWidth - margin;

      const addText = (text: string, x: number, y: number, options?: any) => {
        pdf.text(text, x, y, { align: textAlign, lang: language, ...options });
      };

      // --- Store Header --- 
      pdf.setFillColor(248, 250, 252); // Light gray background
      pdf.rect(margin, yPos, pageWidth - 2 * margin, 60, 'F');
      pdf.setFontSize(18);
      pdf.setTextColor(51, 65, 85); // Dark gray text
      pdf.setFont('Helvetica', 'bold');
      addText(storeInfo.name || 'Sales Ghazy', pageWidth / 2, yPos + 25, { align: 'center' });
      pdf.setFontSize(10);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(100, 116, 139); // Medium gray text
      addText(`${storeInfo.address || ''} | ${storeInfo.phone || ''}`, pageWidth / 2, yPos + 45, { align: 'center' });
      yPos += 80;

      // --- Invoice & Customer Info --- 
      pdf.setFontSize(12);
      pdf.setFont('Helvetica', 'bold');
      pdf.setTextColor(30, 41, 59); // Darker gray
      addText(t('invoice_information'), xStart, yPos);
      addText(t('customer_information'), isRtl ? xStart - (pageWidth / 2 - margin) : xStart + (pageWidth / 2 - margin) , yPos);
      yPos += elementHeight(12);
      pdf.setDrawColor(226, 232, 240); // Light border color
      pdf.line(margin, yPos, pageWidth - margin, yPos); // Separator line
      yPos += 15;

      pdf.setFontSize(10);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);

      const infoStartY = yPos;
      // Invoice Details
      addText(`${t('invoice_number')}: ${invoice.invoiceNumber}`, xStart, yPos);
      yPos += elementHeight(10);
      addText(`${t('date')}: ${formatDate(invoice.date)}`, xStart, yPos);
      yPos += elementHeight(10);
      addText(`${t('payment_method')}: ${getPaymentMethodName(invoice.paymentMethod)}`, xStart, yPos);
      yPos += elementHeight(10);
      const statusInfo = getStatusBadgeProps(invoice.paymentStatus);
      addText(`${t('status')}: ${statusInfo.text}`, xStart, yPos);
      // Optionally add colored badge rectangle
      // pdf.setFillColor(statusInfo.bgColor); 
      // pdf.setTextColor(statusInfo.color);
      // pdf.roundedRect(xStart + pdf.getTextWidth(`${t('status')}: `), yPos - 8, pdf.getTextWidth(statusInfo.text) + 10, 12, 3, 3, 'F');
      // pdf.text(statusInfo.text, xStart + pdf.getTextWidth(`${t('status')}: `) + 5, yPos);
      pdf.setTextColor(51, 65, 85); // Reset color

      const invoiceInfoEndY = yPos;
      yPos = infoStartY; // Reset Y for customer info

      // Customer Details
      const customerX = isRtl ? xStart - (pageWidth / 2 - margin) : xStart + (pageWidth / 2 - margin);
      addText(`${t('name')}: ${invoice.customerName}`, customerX, yPos);
      yPos += elementHeight(10);
      addText(`${t('phone')}: ${invoice.customerPhone || t('not_available')}`, customerX, yPos);
      yPos += elementHeight(10);
      addText(`${t('address')}: ${invoice.customerAddress || t('not_available')}`, customerX, yPos, { maxWidth: pageWidth / 2 - margin - 10 });
      
      yPos = Math.max(invoiceInfoEndY, yPos) + 25; // Move below the longer column

      // --- Products Table --- 
      const tableHeaders = [t('product'), t('price'), t('quantity'), t('discount'), t('total')];
      const colWidths = [pageWidth * 0.4, pageWidth * 0.15, pageWidth * 0.1, pageWidth * 0.1, pageWidth * 0.15];
      const tableHeaderY = yPos;
      pdf.setFillColor(241, 245, 249); // Header background
      pdf.rect(margin, yPos, pageWidth - 2 * margin, 25, 'F');
      yPos += 18; // Position text inside the rect
      pdf.setFontSize(10);
      pdf.setFont('Helvetica', 'bold');
      pdf.setTextColor(30, 41, 59);

      let currentX = xStart;
      tableHeaders.forEach((header, i) => {
        const colWidth = colWidths[i];
        const xPos = isRtl ? currentX - colWidth + 5 : currentX + 5;
        addText(header, xPos, yPos, { align: isRtl ? 'right' : 'left' });
        currentX = isRtl ? currentX - colWidth : currentX + colWidth;
      });
      yPos += 12; // Space after header

      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      pdf.setFontSize(9);

      invoiceProducts.forEach((item, index) => {
        const rowY = yPos;
        const productTotal = item.sellingPrice * item.quantity;
        const discountAmount = item.discount ? (productTotal * (item.discount / 100)) : 0;
        const finalTotal = productTotal - discountAmount;

        // Check for page break
        if (yPos + 30 > pageHeight - margin) { // Estimate row height
          pdf.addPage();
          yPos = margin;
        }

        currentX = xStart;
        // Product Name
        let xPos = isRtl ? currentX - colWidths[0] + 5 : currentX + 5;
        addText(item.productName || item.name || "Unknown Product", xPos, yPos, { maxWidth: colWidths[0] - 10 });
        currentX = isRtl ? currentX - colWidths[0] : currentX + colWidths[0];
        // Price
        xPos = isRtl ? currentX - colWidths[1] + 5 : currentX + 5;
        addText(formatCurrency(item.sellingPrice), xPos, yPos, { align: 'center' });
        currentX = isRtl ? currentX - colWidths[1] : currentX + colWidths[1];
        // Quantity
        xPos = isRtl ? currentX - colWidths[2] + 5 : currentX + 5;
        addText(item.quantity.toString(), xPos, yPos, { align: 'center' });
        currentX = isRtl ? currentX - colWidths[2] : currentX + colWidths[2];
        // Discount
        xPos = isRtl ? currentX - colWidths[3] + 5 : currentX + 5;
        addText(item.discount > 0 ? `${item.discount}%` : '-', xPos, yPos, { align: 'center' });
        currentX = isRtl ? currentX - colWidths[3] : currentX + colWidths[3];
        // Total
        xPos = isRtl ? currentX - colWidths[4] + 5 : currentX + 5;
        addText(formatCurrency(finalTotal), xPos, yPos, { align: 'center' });

        yPos += elementHeight(9) + 10; // Move to next row
        pdf.setDrawColor(241, 245, 249); // Light line color
        pdf.line(margin, yPos - 5, pageWidth - margin, yPos - 5);
      });

      yPos += 15;

      // --- Totals Section --- 
      const summaryX = isRtl ? margin : pageWidth / 2;
      const summaryWidth = pageWidth / 2 - margin;

      // Check for page break before summary
      if (yPos + 80 > pageHeight - margin) { // Estimate summary height
         pdf.addPage();
         yPos = margin;
      }

      pdf.setFillColor(248, 250, 252); // Light background for summary
      pdf.roundedRect(summaryX, yPos, summaryWidth, 80, 5, 5, 'F');
      yPos += 15;

      pdf.setFontSize(10);
      pdf.setTextColor(51, 65, 85);
      const labelX = isRtl ? summaryX + summaryWidth - 10 : summaryX + 10;
      const valueX = isRtl ? summaryX + 10 : summaryX + summaryWidth - 10;
      const summaryAlign = isRtl ? 'right' : 'left';
      const valueAlign = isRtl ? 'left' : 'right';

      addText(t('subtotal'), labelX, yPos, { align: summaryAlign });
      addText(formatCurrency(invoice.subtotal), valueX, yPos, { align: valueAlign });
      yPos += elementHeight(10);

      if (invoice.itemsDiscount && invoice.itemsDiscount > 0) {
        addText(t('items_discount'), labelX, yPos, { align: summaryAlign });
        addText(`- ${formatCurrency(invoice.itemsDiscount)}`, valueX, yPos, { align: valueAlign });
        yPos += elementHeight(10);
      }
      if (invoice.invoiceDiscount && invoice.invoiceDiscount > 0) {
        addText(t('invoice_discount'), labelX, yPos, { align: summaryAlign });
        addText(`- ${formatCurrency(invoice.invoiceDiscount)}`, valueX, yPos, { align: valueAlign });
        yPos += elementHeight(10);
      }

      pdf.setDrawColor(226, 232, 240);
      pdf.line(summaryX + 10, yPos, summaryX + summaryWidth - 10, yPos);
      yPos += 10;

      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(30, 41, 59);
      addText(t('total'), labelX, yPos, { align: summaryAlign });
      addText(formatCurrency(invoice.total), valueX, yPos, { align: valueAlign });
      yPos += elementHeight(12) + 10;

      // --- Notes --- 
      if (invoice.notes) {
        if (yPos + 40 > pageHeight - margin) { // Estimate notes height
           pdf.addPage();
           yPos = margin;
        }
        pdf.setFontSize(10);
        pdf.setFont('Helvetica', 'bold');
        pdf.setTextColor(30, 41, 59);
        addText(t('notes'), xStart, yPos);
        yPos += elementHeight(10);
        pdf.setFont('Helvetica', 'normal');
        pdf.setTextColor(51, 65, 85);
        const notesLines = pdf.splitTextToSize(invoice.notes, pageWidth - 2 * margin);
        addText(notesLines, xStart, yPos);
        yPos += notesLines.length * elementHeight(9) + 15;
      }

      // --- Footer --- 
      if (yPos > pageHeight - margin - 20) {
        pdf.addPage();
        yPos = margin;
      }
      pdf.setFontSize(9);
      pdf.setTextColor(156, 163, 175); // Lighter gray
      addText(t('thank_you_for_your_business'), pageWidth / 2, pageHeight - margin + 10, { align: 'center' });

      // --- Save PDF --- 
      pdf.save(`Invoice_${invoice.invoiceNumber || 'details'}.pdf`);

      toast({
        title: t('success'),
        description: t('pdf_generated_successfully'),
      });

    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: t('error'),
        description: t('error_generating_pdf'),
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // --- Original Print Function (using window.print and CSS) --- 
  const handlePrintViaBrowser = () => {
    // This uses the @media print styles in index.css
    // We need to make sure the content inside `invoiceRef` is styled correctly for printing.
    // The new CSS in index.css already improves print styles.
    window.print();
  };

  // --- Share Functionality (Example - Needs Implementation) --- 
  const handleShare = async () => {
    setIsSharing(true);
    // Example: Use Web Share API if available
    if (navigator.share) {
      try {
        // Generate PDF first, then share the blob/file?
        // Or share a link to the invoice if hosted?
        await navigator.share({
          title: t('invoice_number') + ': ' + invoice.invoiceNumber,
          text: t('check_out_this_invoice'),
          // url: window.location.href, // If it's a shareable link
        });
        toast({ title: t('success'), description: t('invoice_shared') });
      } catch (error) {
        console.error('Error sharing:', error);
        toast({ title: t('error'), description: t('error_sharing_invoice'), variant: 'destructive' });
      }
    } else {
      toast({ title: t('info'), description: t('web_share_not_supported') });
      // Fallback: copy link or show other options
    }
    setIsSharing(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header Buttons */}
      <div className="flex justify-between items-center mb-4 no-print">
        <Button variant="outline" size="icon" onClick={onClose}>
          {isRtl ? <ChevronRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {t('download_pdf')}
          </Button>
          <Button onClick={handlePrintViaBrowser}>
            <Printer className="mr-2 h-4 w-4" />
            {t('print')}
          </Button>
          {/* <Button variant="outline" onClick={handleShare} disabled={isSharing}>
            {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
            {t('share')}
          </Button> */} 
        </div>
      </div>

      {/* Invoice Content Area for Display and Print CSS */}
      <Card id="print-area" ref={invoiceRef} className="border shadow-sm rounded-lg overflow-hidden bg-card">
        <CardHeader className="bg-muted/30 p-4 md:p-6 border-b">
          {/* Store Info Header */}
          <div className="flex flex-col items-center text-center store-info mb-4">
            <h1 className="text-xl md:text-2xl font-bold text-primary mb-1">{storeInfo.name || 'Sales Ghazy'}</h1>
            <p className="text-xs md:text-sm text-muted-foreground">{storeInfo.address || ''}</p>
            <p className="text-xs md:text-sm text-muted-foreground">{storeInfo.phone || ''}</p>
          </div>
          <Separator className="my-2"/>
          {/* Invoice & Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm">
            {/* Invoice Details */}
            <div>
              <h3 className="font-semibold text-foreground mb-2">{t('invoice_information')}</h3>
              <div className="space-y-1 text-muted-foreground">
                <p><span className="font-medium text-foreground">{t('invoice_number')}:</span> {invoice.invoiceNumber}</p>
                <p><span className="font-medium text-foreground">{t('date')}:</span> {formatDate(invoice.date)}</p>
                <p><span className="font-medium text-foreground">{t('payment_method')}:</span> {getPaymentMethodName(invoice.paymentMethod)}</p>
                <p className="flex items-center">
                  <span className="font-medium text-foreground mr-1">{t('status')}:</span> 
                  <Badge variant={getStatusBadgeProps(invoice.paymentStatus).variant} className="text-xs">
                    {getStatusBadgeProps(invoice.paymentStatus).text}
                  </Badge>
                </p>
              </div>
            </div>
            {/* Customer Details */}
            <div className={isRtl ? "text-right" : "text-left"}>
              <h3 className="font-semibold text-foreground mb-2">{t('customer_information')}</h3>
              <div className="space-y-1 text-muted-foreground">
                <p><span className="font-medium text-foreground">{t('name')}:</span> {invoice.customerName}</p>
                <p><span className="font-medium text-foreground">{t('phone')}:</span> {invoice.customerPhone || t('not_available')}</p>
                <p><span className="font-medium text-foreground">{t('address')}:</span> {invoice.customerAddress || t('not_available')}</p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          {/* Products Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-muted-foreground">
                  <th className={`py-2 px-3 text-left ${isRtl ? 'text-right' : 'text-left'} font-semibold`}>{t('product')}</th>
                  <th className="py-2 px-3 text-center font-semibold">{t('price')}</th>
                  <th className="py-2 px-3 text-center font-semibold">{t('quantity')}</th>
                  <th className="py-2 px-3 text-center font-semibold">{t('discount')}</th>
                  <th className={`py-2 px-3 text-right ${isRtl ? 'text-left' : 'text-right'} font-semibold`}>{t('total')}</th>
                </tr>
              </thead>
              <tbody>
                {invoiceProducts.map((item, index) => {
                  const productTotal = item.sellingPrice * item.quantity;
                  const discountAmount = item.discount ? (productTotal * (item.discount / 100)) : 0;
                  const finalTotal = productTotal - discountAmount;
                  return (
                    <tr key={index} className="border-b last:border-0">
                      <td className={`py-3 px-3 ${isRtl ? 'text-right' : 'text-left'}`}>
                        <div className="font-medium text-foreground">{item.productName || item.name || "Unknown Product"}</div>
                        {item.barcode && <div className="text-xs text-muted-foreground">{t('barcode')}: {item.barcode}</div>}
                      </td>
                      <td className="py-3 px-3 text-center font-mono">{formatCurrency(item.sellingPrice)}</td>
                      <td className="py-3 px-3 text-center">{item.quantity}</td>
                      <td className="py-3 px-3 text-center">{item.discount > 0 ? `${item.discount}%` : '-'}</td>
                      <td className={`py-3 px-3 text-right ${isRtl ? 'text-left' : 'text-right'} font-medium font-mono`}>{formatCurrency(finalTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>

        <CardFooter className="bg-muted/30 p-4 md:p-6 border-t flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          {/* Notes Section */}
          {invoice.notes && (
            <div className="text-xs text-muted-foreground flex-1">
              <h4 className="font-semibold text-foreground mb-1">{t('notes')}:</h4>
              <p>{invoice.notes}</p>
            </div>
          )}
          {/* Totals Section */}
          <div className={`w-full md:w-auto md:min-w-[250px] space-y-2 text-sm ${!invoice.notes ? 'md:ml-auto' : ''}`}>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('subtotal')}:</span>
              <span className="font-medium font-mono text-foreground">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {(invoice.itemsDiscount > 0 || invoice.invoiceDiscount > 0) && <Separator />}
            {invoice.itemsDiscount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('items_discount')}:</span>
                <span className="font-medium font-mono text-destructive">- {formatCurrency(invoice.itemsDiscount)}</span>
              </div>
            )}
            {invoice.invoiceDiscount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('invoice_discount')}:</span>
                <span className="font-medium font-mono text-destructive">- {formatCurrency(invoice.invoiceDiscount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span className="text-foreground">{t('total')}:</span>
              <span className="font-mono text-primary">{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Thank You Message (Optional, outside print area) */}
      <div className="text-center mt-6 text-sm text-muted-foreground no-print">
        {t('thank_you_for_your_business')}
      </div>
    </div>
  );
};

export default InvoicePreview;

