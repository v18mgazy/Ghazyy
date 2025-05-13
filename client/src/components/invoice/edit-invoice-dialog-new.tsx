import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';

// Icons
import {
  X, Trash2, Plus, Save, Scan, Receipt,
  Calculator, Loader2, User, Phone, MapPin,
  Search, AlertCircle, ShoppingCart, Check
} from 'lucide-react';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import BarcodeScanner from '@/components/barcode-scanner';

// Types
interface EditInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
}

export default function EditInvoiceDialog({
  open,
  onOpenChange,
  invoice
}: EditInvoiceDialogProps) {
  const { t } = useTranslation();
  const { language } = useLocale();
  const { toast } = useToast();
  const isRTL = language === 'ar';

  // State Management
  const [isLoading, setIsLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  
  // Customer information
  const [customer, setCustomer] = useState({
    id: invoice?.customerId || '',
    name: invoice?.customerName || '',
    phone: invoice?.customerPhone || '',
    address: invoice?.customerAddress || ''
  });
  
  // استخراج المنتجات من البيانات المشفرة في الفاتورة
  const extractProducts = (invoiceData: any): any[] => {
    if (!invoiceData) return [];
    
    try {
      // محاولة استخراج المنتجات من حقل productsData
      if (invoiceData.productsData) {
        const parsedProducts = JSON.parse(invoiceData.productsData);
        console.log('Successfully parsed products from JSON:', parsedProducts);
        return Array.isArray(parsedProducts) ? parsedProducts : [];
      }
      
      // إذا كان هناك products موجود بالفعل، استخدمه
      if (invoiceData.products && Array.isArray(invoiceData.products)) {
        return invoiceData.products;
      }
      
      // حالة بديلة: استخراج من الحقول المنفصلة
      if (invoiceData.productIds && invoiceData.productNames && 
          invoiceData.productQuantities && invoiceData.productPrices) {
        
        const productIds = invoiceData.productIds.split(',');
        const productNames = invoiceData.productNames.split(',');
        const productQuantities = invoiceData.productQuantities.split(',').map(Number);
        const productPrices = invoiceData.productPrices.split(',').map(Number);
        const productDiscounts = invoiceData.productDiscounts?.split(',').map(Number) || productIds.map(() => 0);
        const productPurchasePrices = invoiceData.productPurchasePrices?.split(',').map(Number) || productIds.map(() => 0);
        
        return productIds.map((id: string, index: number) => ({
          id: parseInt(id),
          productId: parseInt(id),
          name: productNames[index] || 'منتج غير معروف',
          productName: productNames[index] || 'منتج غير معروف',
          price: productPrices[index] || 0,
          quantity: productQuantities[index] || 1,
          discount: productDiscounts[index] || 0,
          purchasePrice: productPurchasePrices[index] || 0,
          barcode: '' // قد تكون غير متوفرة في الحقول المنفصلة
        }));
      }
    } catch (error) {
      console.error('Error extracting products from invoice:', error);
    }
    
    return [];
  };
  
  // Products in invoice
  const [products, setProducts] = useState<any[]>(extractProducts(invoice));
  
  // Invoice details
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState(invoice?.paymentMethod || 'cash');
  const [notes, setNotes] = useState(invoice?.notes || '');

  // Fetch all products for inventory checking
  const { data: allProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ['/api/products'],
    staleTime: 30000,
  });

  // Initialize invoice discount from invoice data
  useEffect(() => {
    console.log('------------------------------');
    console.log('Invoice data for edit:', invoice);
    console.log('Invoice discount value (direct):', invoice?.invoiceDiscount);
    
    // Set a fallback value of 0
    let discountValue = 0;
    
    try {
      if (invoice && invoice.invoiceDiscount !== undefined) {
        // Convert to number safely
        discountValue = Number(invoice.invoiceDiscount);
        if (isNaN(discountValue)) {
          // Try to extract number from string
          const stringValue = String(invoice.invoiceDiscount);
          if (stringValue && stringValue.match(/\d/)) {
            const extractedNumber = stringValue.replace(/[^\d.-]/g, '');
            discountValue = Number(extractedNumber);
          }
        }
      }
    } catch (error) {
      console.error('Error extracting invoice discount:', error);
    }
    
    console.log('Final invoice discount value:', discountValue);
    setInvoiceDiscount(discountValue);
    console.log('------------------------------');
  }, [invoice]);

  // Calculate totals
  const subtotal = products.reduce((sum, product) => 
    sum + (product.price * product.quantity), 0);
  
  const itemsDiscount = products.reduce((sum, product) => {
    const productTotal = product.price * product.quantity;
    const discountAmount = product.discount ? (productTotal * (product.discount / 100)) : 0;
    return sum + discountAmount;
  }, 0);
  
  const total = Math.max(0, subtotal - itemsDiscount - invoiceDiscount);

  // Find product in inventory by barcode
  const findProductByBarcode = (barcode: string) => {
    if (!allProducts) return null;
    
    return allProducts.find((p: any) => p.barcode === barcode);
  };

  // قمنا بإزالة دالة handleBarcodeScan لأننا نستخدم الآن مكون BarcodeScanner مباشرة مع onProductScanned

  // Handle product search
  const handleProductSearch = () => {
    setIsProductSearchOpen(true);
  };

  // Filter products based on search term
  const filteredProducts = allProducts ? 
    allProducts.filter((product: any) => {
      if (!searchTerm.trim()) return true;
      
      const term = searchTerm.toLowerCase();
      return (
        product.name.toLowerCase().includes(term) ||
        (product.barcode && product.barcode.includes(term))
      );
    }) : [];

  // Select a product from search
  const selectProduct = (product: any) => {
    setSelectedProduct(product);
    setQuantityToAdd(1);
    setShowAddProductDialog(true);
    setIsProductSearchOpen(false);
  };

  // Add selected product to invoice
  const addSelectedProduct = () => {
    if (!selectedProduct) return;
    
    // Check if we have enough stock
    if (quantityToAdd > selectedProduct.quantity) {
      toast({
        title: t('insufficient_stock'),
        description: t('cannot_add_more_than_available', { 
          name: selectedProduct.name, 
          available: selectedProduct.quantity 
        }),
        variant: 'destructive'
      });
      return;
    }
    
    // Check if product already exists in the invoice
    const existingProductIndex = products.findIndex(p => p.id === selectedProduct.id);
    
    if (existingProductIndex !== -1) {
      // Product already exists, update quantity
      const updatedProducts = [...products];
      const currentQuantity = updatedProducts[existingProductIndex].quantity;
      
      // Check if we have enough stock for the total
      if (currentQuantity + quantityToAdd > selectedProduct.quantity) {
        toast({
          title: t('insufficient_stock'),
          description: t('cannot_add_more_than_available', { 
            name: selectedProduct.name, 
            available: selectedProduct.quantity 
          }),
          variant: 'destructive'
        });
        return;
      }
      
      updatedProducts[existingProductIndex].quantity += quantityToAdd;
      setProducts(updatedProducts);
    } else {
      // Add new product
      setProducts([...products, {
        id: selectedProduct.id,
        name: selectedProduct.name,
        barcode: selectedProduct.barcode,
        price: selectedProduct.sellingPrice || selectedProduct.price,
        purchasePrice: selectedProduct.purchasePrice || 0,
        quantity: quantityToAdd,
        discount: 0,
        total: (selectedProduct.sellingPrice || selectedProduct.price) * quantityToAdd
      }]);
    }
    
    setShowAddProductDialog(false);
    setSelectedProduct(null);
    
    toast({
      title: t('product_added'),
      description: t('product_added_to_invoice', { name: selectedProduct.name }),
    });
  };

  // Update product quantity
  const updateProductQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const product = products[index];
    const stockProduct = allProducts?.find((p: any) => p.id === product.id);
    
    // Check stock levels if product exists in inventory
    if (stockProduct && newQuantity > stockProduct.quantity) {
      toast({
        title: t('insufficient_stock'),
        description: t('cannot_add_more_than_available', { 
          name: product.name, 
          available: stockProduct.quantity 
        }),
        variant: 'destructive'
      });
      return;
    }
    
    const updatedProducts = [...products];
    updatedProducts[index].quantity = newQuantity;
    setProducts(updatedProducts);
  };

  // Remove product from invoice
  const removeProduct = (index: number) => {
    const updatedProducts = [...products];
    updatedProducts.splice(index, 1);
    setProducts(updatedProducts);
  };

  // Update invoice in the database
  const updateMutation = useMutation({
    mutationFn: async (updatedInvoice: any) => {
      const response = await apiRequest('PATCH', `/api/invoices/${invoice.id}`, updatedInvoice);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: t('success'),
        description: t('invoice_updated_successfully'),
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error updating invoice:', error);
      toast({
        title: t('error'),
        description: t('invoice_update_failed'),
        variant: 'destructive'
      });
    }
  });

  // Handle form submission
  const handleUpdateInvoice = () => {
    if (products.length === 0) {
      toast({
        title: t('error'),
        description: t('no_products_in_invoice'),
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    const formattedProducts = products.map(product => {
      return {
        productId: product.id,
        productName: product.name,
        barcode: product.barcode,
        quantity: product.quantity,
        price: product.price,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.price,
        discount: product.discount || 0,
        total: product.price * product.quantity * (1 - (product.discount || 0) / 100),
        profit: (product.price - product.purchasePrice) * product.quantity
      };
    });
    
    const productIds = formattedProducts.map(p => p.productId).join(',');
    const productNames = formattedProducts.map(p => p.productName).join(',');
    const productQuantities = formattedProducts.map(p => p.quantity).join(',');
    const productPrices = formattedProducts.map(p => p.price).join(',');
    const productPurchasePrices = formattedProducts.map(p => p.purchasePrice).join(',');
    const productDiscounts = formattedProducts.map(p => p.discount).join(',');
    const productTotals = formattedProducts.map(p => p.total).join(',');
    const productProfits = formattedProducts.map(p => p.profit).join(',');
    
    // Calculate the final total after all discounts
    const invoiceTotal = Math.max(0, subtotal - itemsDiscount - invoiceDiscount);
    
    const updatedInvoice = {
      invoiceNumber: invoice.invoiceNumber,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      subtotal: subtotal,
      discount: 0, // For compatibility with older versions
      itemsDiscount: itemsDiscount,
      invoiceDiscount: invoiceDiscount,
      discountPercentage: 0, // For compatibility with older versions
      total: invoiceTotal,
      paymentMethod: paymentMethod,
      paymentStatus: invoice.paymentStatus || 'paid',
      notes: notes,
      date: invoice.date,
      productsData: JSON.stringify(formattedProducts),
      productIds: productIds,
      productNames: productNames,
      productQuantities: productQuantities,
      productPrices: productPrices,
      productPurchasePrices: productPurchasePrices,
      productDiscounts: productDiscounts,
      productTotals: productTotals,
      productProfits: productProfits,
      userId: invoice.userId || 1
    };
    
    console.log('Updating invoice with data:', updatedInvoice);
    
    updateMutation.mutate(updatedInvoice);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {t('edit_invoice')} - {invoice?.invoiceNumber}
            </DialogTitle>
            <DialogDescription>{t('edit_invoice_description')}</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  {t('customer_information')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="customerName">{t('customer_name')}</Label>
                  <Input
                    id="customerName"
                    value={customer.name}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="customerPhone">{t('phone')}</Label>
                  <Input
                    id="customerPhone"
                    value={customer.phone}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="customerAddress">{t('address')}</Label>
                  <Input
                    id="customerAddress"
                    value={customer.address}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Receipt className="w-5 h-5 mr-2" />
                  {t('payment_details')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="paymentMethod">{t('payment_method')}</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="paymentMethod">
                      <SelectValue placeholder={t('select_payment_method')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">{t('cash')}</SelectItem>
                      <SelectItem value="card">{t('card')}</SelectItem>
                      <SelectItem value="deferred">{t('pay_later')}</SelectItem>
                      <SelectItem value="e-wallet">{t('e_wallet')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="notes">{t('notes')}</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('invoice_notes_placeholder')}
                    className="resize-none h-20"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Products Section */}
          <Card className="mt-6">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {t('products')}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button 
                    size="sm"
                    variant="outline"
                    className="flex items-center"
                    onClick={handleProductSearch}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    {t('search_products')}
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline" 
                    className="flex items-center" 
                    onClick={() => setIsScannerOpen(true)}
                  >
                    <Scan className="w-4 h-4 mr-2" />
                    {t('scan_barcode')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>{t('no_products_added')}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={handleProductSearch}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('add_product')}
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('product')}</TableHead>
                        <TableHead className="text-right">{t('price')}</TableHead>
                        <TableHead className="text-center">{t('quantity')}</TableHead>
                        <TableHead className="text-right">{t('total')}</TableHead>
                        <TableHead className="w-[70px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product, index) => {
                        const stockProduct = allProducts?.find((p: any) => p.id === product.id);
                        const stockAvailable = stockProduct ? stockProduct.quantity : '?';
                        const finalTotal = product.price * product.quantity;
                        
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                  {product.barcode && (
                                    <span>{product.barcode}</span>
                                  )}
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge 
                                          variant="outline" 
                                          className="ml-2 cursor-help"
                                        >
                                          {t('stock')}: {stockAvailable}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{t('available_in_stock')}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(product.price)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => updateProductQuantity(index, Math.max(1, product.quantity - 1))}
                                >
                                  <span>-</span>
                                </Button>
                                <span className="w-8 text-center">{product.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => updateProductQuantity(index, product.quantity + 1)}
                                >
                                  <span>+</span>
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(finalTotal)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={() => removeProduct(index)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {/* Invoice Totals */}
              <div className="mt-6 bg-muted/40 p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('subtotal')}:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                
                {itemsDiscount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t('item_discounts')}:</span>
                    <span>- {formatCurrency(itemsDiscount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('invoice_discount')}:</span>
                  <div className="flex items-center">
                    <span className="mr-2">-</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      min="0"
                      className="w-24 h-8 text-right"
                      value={invoiceDiscount}
                      key={`invoice-discount-fixed`}
                      onChange={(e) => {
                        try {
                          const numValue = Number(e.target.value);
                          setInvoiceDiscount(isNaN(numValue) ? 0 : numValue);
                        } catch (err) {
                          console.error("Error setting invoice discount:", err);
                          setInvoiceDiscount(0);
                        }
                      }}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-center font-bold">
                  <span>{t('total')}:</span>
                  <span className="text-primary text-lg">{formatCurrency(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <DialogFooter className="mt-6 flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleUpdateInvoice}
              disabled={isLoading || products.length === 0}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('update_invoice')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Barcode Scanner */}
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('scan_barcode')}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <BarcodeScanner onProductScanned={(product) => {
              setIsScannerOpen(false);
              
              console.log('Product scanned in barcode scanner:', product);
              // إضافة المنتج إلى الفاتورة
              const existingIndex = products.findIndex(p => p.id === product.id);
              
              if (existingIndex !== -1) {
                // المنتج موجود بالفعل، قم بزيادة الكمية
                const updatedProducts = [...products];
                updatedProducts[existingIndex].quantity += 1;
                setProducts(updatedProducts);
                
                toast({
                  title: t('product_quantity_updated'),
                  description: t('product_quantity_increased', { name: product.name }),
                });
              } else {
                // إضافة منتج جديد
                setProducts([...products, {
                  id: product.id,
                  name: product.name,
                  barcode: product.barcode,
                  price: product.sellingPrice,
                  purchasePrice: product.purchasePrice || 0,
                  quantity: 1,
                  discount: 0,
                  total: product.sellingPrice
                }]);
                
                toast({
                  title: t('product_added'),
                  description: t('product_added_to_invoice', { name: product.name }),
                });
              }
            }} />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsScannerOpen(false)}
            >
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Product Search */}
      <Dialog open={isProductSearchOpen} onOpenChange={setIsProductSearchOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('search_products')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center mb-4">
              <Input
                placeholder={t('search_products_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            {loadingProducts ? (
              <div className="flex justify-center my-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <p>{t('no_products_found')}</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('product')}</TableHead>
                          <TableHead className="text-right">{t('price')}</TableHead>
                          <TableHead className="text-center">{t('available')}</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product: any) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {product.barcode}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(product.sellingPrice || product.price)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant={product.quantity > 0 ? "outline" : "destructive"}
                                className="ml-2"
                              >
                                {product.quantity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => selectProduct(product)}
                                disabled={product.quantity <= 0}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsProductSearchOpen(false)}
            >
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Product Dialog */}
      {selectedProduct && (
        <Dialog open={showAddProductDialog} onOpenChange={setShowAddProductDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('add_product')}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-4">
                <div className="flex flex-col space-y-1.5">
                  <Label>{t('product')}</Label>
                  <div className="p-2 border rounded-md">
                    <p className="font-medium">{selectedProduct.name}</p>
                    <div className="flex justify-between items-center mt-1">
                      <div className="text-sm text-muted-foreground">
                        {selectedProduct.barcode}
                      </div>
                      <div className="text-sm font-medium">
                        {formatCurrency(selectedProduct.sellingPrice || selectedProduct.price)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="quantity">{t('quantity')}</Label>
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setQuantityToAdd(Math.max(1, quantityToAdd - 1))}
                    >
                      <span>-</span>
                    </Button>
                    <Input
                      id="quantity"
                      type="number"
                      className="h-8 mx-2 text-center"
                      min={1}
                      max={selectedProduct.quantity}
                      value={quantityToAdd}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 1) {
                          setQuantityToAdd(Math.min(value, selectedProduct.quantity));
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setQuantityToAdd(Math.min(selectedProduct.quantity, quantityToAdd + 1))}
                    >
                      <span>+</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('available_in_stock')}: {selectedProduct.quantity}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddProductDialog(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={addSelectedProduct}>
                <Plus className="h-4 w-4 mr-2" />
                {t('add')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}