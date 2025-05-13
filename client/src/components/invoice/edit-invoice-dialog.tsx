import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';

// Icons
import {
  X, Trash2, Plus, Save, Scan, Receipt,
  Calculator, Loader2, User, Phone, MapPin
} from 'lucide-react';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [customer, setCustomer] = useState({
    id: invoice?.customerId || '',
    name: invoice?.customerName || '',
    phone: invoice?.customerPhone || '',
    address: invoice?.customerAddress || ''
  });
  const [products, setProducts] = useState<any[]>(invoice?.products || []);
  const [invoiceDiscount, setInvoiceDiscount] = useState(invoice?.invoiceDiscount || 0);
  const [paymentMethod, setPaymentMethod] = useState(invoice?.paymentMethod || 'cash');
  const [notes, setNotes] = useState(invoice?.notes || '');
  
  // Calculate totals
  const subtotal = products.reduce((sum, product) => 
    sum + (product.price * product.quantity), 0);
  
  const itemsDiscount = products.reduce((sum, product) => {
    const productTotal = product.price * product.quantity;
    const discountAmount = product.discount ? (productTotal * (product.discount / 100)) : 0;
    return sum + discountAmount;
  }, 0);
  
  const total = subtotal - itemsDiscount - invoiceDiscount;

  // Update mutation
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
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('error_updating_invoice'),
        variant: 'destructive',
      });
    }
  });

  // Handle update invoice
  const handleUpdateInvoice = () => {
    setIsLoading(true);
    
    // Convert products to the expected format for the API
    const productsData = JSON.stringify(products.map(product => ({
      productId: product.id,
      productName: product.name,
      barcode: product.barcode || '',
      quantity: product.quantity,
      price: product.price,
      purchasePrice: product.purchasePrice || product.price * 0.8, // Fallback if purchasePrice is missing
      sellingPrice: product.price,
      discount: product.discount || 0,
      total: (product.quantity * product.price) * (1 - (product.discount || 0) / 100)
    })));
    
    // Create individual fields format
    const productIds = products.map(p => p.id).join(',');
    const productNames = products.map(p => p.name).join('|');
    const productQuantities = products.map(p => p.quantity).join(',');
    const productPrices = products.map(p => p.price).join(',');
    const productDiscounts = products.map(p => p.discount || 0).join(',');
    const productTotals = products.map(p => 
      (p.quantity * p.price) * (1 - (p.discount || 0) / 100)
    ).join(',');
    
    // Calculate profit if purchase prices available
    const productPurchasePrices = products.map(p => p.purchasePrice || p.price * 0.8).join(',');
    const productProfits = products.map((p, idx) => {
      const purchasePrice = p.purchasePrice || p.price * 0.8;
      const profit = ((p.price - purchasePrice) * p.quantity) * (1 - (p.discount || 0) / 100);
      return profit;
    }).join(',');
    
    const updatedInvoice = {
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      subtotal,
      itemsDiscount,
      invoiceDiscount,
      total,
      paymentMethod,
      notes,
      // Data fields
      productsData,
      productIds,
      productNames,
      productQuantities,
      productPrices,
      productPurchasePrices,
      productDiscounts,
      productTotals,
      productProfits
    };
    
    updateMutation.mutate(updatedInvoice);
  };
  
  // Handle product quantity change
  const updateProductQuantity = (index: number, quantity: number) => {
    const newProducts = [...products];
    newProducts[index].quantity = quantity;
    setProducts(newProducts);
  };
  
  // Handle product discount change
  const updateProductDiscount = (index: number, discount: number) => {
    const newProducts = [...products];
    newProducts[index].discount = discount;
    setProducts(newProducts);
  };
  
  // Handle remove product
  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };
  
  // Handle barcode scan result
  const handleBarcodeResult = async (barcode: string) => {
    setIsScannerOpen(false);
    
    try {
      const response = await fetch(`/api/products/barcode/${barcode}`);
      if (!response.ok) {
        throw new Error(t('product_not_found'));
      }
      
      const product = await response.json();
      
      // Check if product already exists
      const existingProductIndex = products.findIndex(p => p.id === product.id);
      
      if (existingProductIndex >= 0) {
        // Update quantity if product already exists
        updateProductQuantity(existingProductIndex, products[existingProductIndex].quantity + 1);
      } else {
        // Add new product
        setProducts([...products, {
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          price: product.sellingPrice,
          purchasePrice: product.purchasePrice,
          quantity: 1,
          discount: 0
        }]);
      }
      
      toast({
        title: t('success'),
        description: t('product_added_successfully'),
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: (error as Error).message || t('error_adding_product'),
        variant: 'destructive',
      });
    }
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {t('edit_invoice')} {invoice?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Customer Information */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="font-medium mb-3">{t('customer_information')}</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">{t('customer_name')}</Label>
                  <div className="relative">
                    <Input
                      id="customerName"
                      value={customer.name}
                      onChange={(e) => setCustomer({...customer, name: e.target.value})}
                      className="pr-8"
                    />
                    <User className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">{t('phone')}</Label>
                  <div className="relative">
                    <Input
                      id="customerPhone"
                      value={customer.phone}
                      onChange={(e) => setCustomer({...customer, phone: e.target.value})}
                      className="pr-8"
                    />
                    <Phone className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customerAddress">{t('address')}</Label>
                  <div className="relative">
                    <Input
                      id="customerAddress"
                      value={customer.address}
                      onChange={(e) => setCustomer({...customer, address: e.target.value})}
                      className="pr-8"
                    />
                    <MapPin className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Products */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">{t('products')}</h3>
                
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setIsScannerOpen(true)}>
                    <Scan className="h-4 w-4 mr-2" />
                    {t('scan_barcode')}
                  </Button>
                </div>
              </div>
              
              {products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="mx-auto h-10 w-10 mb-2 text-muted-foreground/70" />
                  <p>{t('no_products_added')}</p>
                  <p className="text-sm">{t('scan_barcode_to_add')}</p>
                </div>
              ) : (
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">{t('product')}</TableHead>
                        <TableHead className="text-center">{t('price')}</TableHead>
                        <TableHead className="text-center">{t('discount')}</TableHead>
                        <TableHead className="text-center">{t('quantity')}</TableHead>
                        <TableHead className="text-right">{t('total')}</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product, index) => {
                        const productTotal = product.price * product.quantity;
                        const discountAmount = product.discount ? (productTotal * (product.discount / 100)) : 0;
                        const finalTotal = productTotal - discountAmount;
                        
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-center">
                              {formatCurrency(product.price)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  className="w-16 text-center h-8"
                                  value={product.discount || 0}
                                  onChange={(e) => updateProductDiscount(index, Number(e.target.value))}
                                />
                                <span className="ml-1">%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
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
            </div>
            
            {/* Payment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
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
                
                <div className="space-y-2">
                  <Label htmlFor="notes">{t('notes')}</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('invoice_notes_placeholder')}
                    className="resize-none"
                  />
                </div>
              </div>
              
              <div>
                <div className="bg-muted/40 p-4 rounded-lg space-y-3">
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
                        type="number"
                        min="0"
                        className="w-24 h-8 text-right"
                        value={invoiceDiscount}
                        onChange={(e) => setInvoiceDiscount(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center font-bold">
                    <span>{t('total')}:</span>
                    <span className="text-primary text-lg">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              {t('cancel')}
            </Button>
            
            <Button onClick={handleUpdateInvoice} disabled={updateMutation.isPending || isLoading}>
              {updateMutation.isPending || isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {t('save_changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Barcode Scanner */}
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('scan_barcode')}</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <BarcodeScanner onDetected={handleBarcodeResult} />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScannerOpen(false)}>
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}