import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, Plus, Edit, Trash2, QrCode, Filter, Printer, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
  AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/lib/utils';
import ProductForm from './product-form';

interface Product {
  id: string;
  name: string;
  barcode: string;
  alternativeCode?: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
}

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
  onAddProduct: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onPrintBarcodes: (productIds: string[]) => void;
  onPrintInventory?: () => void;
}

export default function ProductList({
  products,
  isLoading,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onPrintBarcodes,
  onPrintInventory
}: ProductListProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode.includes(searchTerm) ||
    (product.alternativeCode && product.alternativeCode.includes(searchTerm))
  );

  const handleAddProduct = () => {
    setSelectedProduct(undefined);
    setProductFormOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductFormOpen(true);
  };

  const handleSaveProduct = (product: Product) => {
    if (product.id) {
      onEditProduct(product);
    } else {
      onAddProduct(product);
    }
    setProductFormOpen(false);
  };

  const handleDeleteProduct = (productId: string) => {
    setProductToDelete(productId);
  };

  const confirmDeleteProduct = () => {
    if (productToDelete) {
      onDeleteProduct(productToDelete);
      setProductToDelete(null);
      // Also remove from selected products if it was selected
      if (selectedProductIds.has(productToDelete)) {
        const newSelection = new Set(selectedProductIds);
        newSelection.delete(productToDelete);
        setSelectedProductIds(newSelection);
      }
    }
  };

  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProductIds);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProductIds(newSelection);
  };

  const handlePrintSelected = () => {
    const selectedIds = Array.from(selectedProductIds);
    if (selectedIds.length > 0) {
      onPrintBarcodes(selectedIds);
    }
  };

  return (
    <>
      <Card className="border-neutral-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="border-b border-neutral-200 bg-neutral-50 pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-2xl flex items-center text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
              {t('products_inventory')}
            </CardTitle>
            <Button 
              size="sm" 
              onClick={handleAddProduct} 
              className="bg-primary text-white hover:bg-primary/90 shadow-sm font-medium"
            >
              <Plus className="mr-1 h-4 w-4" />
              {t('add_product')}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="mb-6 flex flex-wrap gap-3">
            <div className="relative flex-grow">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('search')}
                className="pr-8 border-neutral-300 focus:border-primary shadow-sm"
              />
              <div className="absolute right-2 top-2 text-neutral-500">
                <Search className="h-5 w-5" />
              </div>
            </div>
            <Button 
              variant="outline" 
              size="icon"
              className="border-neutral-300 text-neutral-700 hover:bg-neutral-100"
            >
              <Filter className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              disabled={selectedProductIds.size === 0}
              onClick={handlePrintSelected}
              className={
                selectedProductIds.size > 0 
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" 
                  : "border-neutral-300"
              }
            >
              <Printer className="mr-1 h-4 w-4" />
              {t('print_barcodes')} {selectedProductIds.size > 0 && (
                <span className="ml-1 bg-indigo-100 text-indigo-800 py-0.5 px-1.5 rounded-full text-xs font-semibold">
                  {selectedProductIds.size}
                </span>
              )}
            </Button>
            {onPrintInventory && (
              <Button 
                variant="outline" 
                onClick={onPrintInventory}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300 shadow-sm"
              >
                <Printer className="mr-1 h-4 w-4" />
                {t('print_inventory')}
              </Button>
            )}
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <div className="flex flex-col items-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">{t('loading_products')}</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <Table>
                <TableHeader className="bg-neutral-100">
                  <TableRow className="hover:bg-neutral-200/50">
                    <TableHead className="w-[30px] py-3">
                      <Input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={selectedProductIds.size === products.length && products.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProductIds(new Set(products.map(p => p.id)));
                          } else {
                            setSelectedProductIds(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-neutral-800 py-3">{t('product')}</TableHead>
                    <TableHead className="font-semibold text-neutral-800 py-3">{t('barcode')}</TableHead>
                    <TableHead className="font-semibold text-neutral-800 py-3">{t('stock')}</TableHead>
                    <TableHead className="font-semibold text-neutral-800 py-3">{t('purchase_price')}</TableHead>
                    <TableHead className="font-semibold text-neutral-800 py-3">{t('selling_price')}</TableHead>
                    <TableHead className="font-semibold text-neutral-800 text-right py-3">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-16">
                        <div className="flex flex-col items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-neutral-300 mb-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm2.45 4a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3zm-1 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                          <p className="text-lg font-medium text-neutral-500 mb-1">
                            {searchTerm ? t('no_products_found') : t('no_products_yet')}
                          </p>
                          <p className="text-neutral-400 max-w-sm text-center">
                            {searchTerm 
                              ? t('try_different_search_terms')
                              : t('click_add_product_to_get_started')
                            }
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product, index) => (
                      <TableRow 
                        key={product.id}
                        className={`cursor-pointer transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'
                        } hover:bg-blue-50/30`}
                        onClick={() => handleEditProduct(product)}
                      >
                        <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                          <Input
                            type="checkbox"
                            className="w-4 h-4"
                            checked={selectedProductIds.has(product.id)}
                            onChange={() => toggleProductSelection(product.id)}
                          />
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="font-medium text-neutral-900">{product.name}</div>
                          {product.alternativeCode && (
                            <div className="text-xs text-neutral-500 flex items-center mt-0.5">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zm-2 7a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zm8-12a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2V5h1v1h-1zm-2 7a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3zm2 2v-1h1v1h-1z" clipRule="evenodd" />
                              </svg>
                              {t('code')}: {product.alternativeCode}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-3 font-mono text-sm">
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-neutral-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zm-2 7a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zm8-12a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2V5h1v1h-1zm-2 7a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3zm2 2v-1h1v1h-1z" clipRule="evenodd" />
                            </svg>
                            {product.barcode}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className={`inline-flex items-center ${
                            product.stock <= 0 ? 'bg-red-100 text-red-700' : 
                            product.stock < 5 ? 'bg-amber-100 text-amber-700' : 
                            'bg-emerald-100 text-emerald-700'
                          } px-2.5 py-0.5 rounded-full font-medium text-sm`}>
                            {product.stock <= 0 ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            ) : product.stock < 5 ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.981l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                            {product.stock}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 font-medium text-blue-700">{formatCurrency(product.purchasePrice)}</TableCell>
                        <TableCell className="py-3 font-medium text-emerald-700">{formatCurrency(product.sellingPrice)}</TableCell>
                        <TableCell className="py-3">
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full"
                              onClick={() => handleEditProduct(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-full"
                              onClick={() => {
                                onPrintBarcodes([product.id]);
                              }}
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Product Form Dialog */}
      <ProductForm
        open={productFormOpen}
        onClose={() => setProductFormOpen(false)}
        onSave={handleSaveProduct}
        product={selectedProduct}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('delete_product_confirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteProduct}
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
