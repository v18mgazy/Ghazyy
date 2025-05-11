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
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('products_inventory')}</CardTitle>
            <Button size="sm" onClick={handleAddProduct}>
              <Plus className="mr-1 h-4 w-4" />
              {t('add_product')}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative flex-grow">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('search')}
                className="pr-8"
              />
              <div className="absolute right-2 top-2 text-neutral-500">
                <Search className="h-5 w-5" />
              </div>
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              disabled={selectedProductIds.size === 0}
              onClick={handlePrintSelected}
            >
              <Printer className="mr-1 h-4 w-4" />
              {t('print_barcodes')} {selectedProductIds.size > 0 && `(${selectedProductIds.size})`}
            </Button>
            {onPrintInventory && (
              <Button 
                variant="outline" 
                onClick={onPrintInventory}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
              >
                <Printer className="mr-1 h-4 w-4" />
                {t('print_inventory')}
              </Button>
            )}
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[30px]">
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
                    <TableHead className="font-semibold">{t('product')}</TableHead>
                    <TableHead className="font-semibold">{t('barcode')}</TableHead>
                    <TableHead className="font-semibold">{t('stock')}</TableHead>
                    <TableHead className="font-semibold">{t('purchase_price')}</TableHead>
                    <TableHead className="font-semibold">{t('selling_price')}</TableHead>
                    <TableHead className="font-semibold text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? t('no_products_found') : t('no_products_yet')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product, index) => (
                      <TableRow 
                        key={product.id}
                        className={index % 2 === 0 ? 'bg-muted/20' : ''}
                      >
                        <TableCell>
                          <Input
                            type="checkbox"
                            className="w-4 h-4"
                            checked={selectedProductIds.has(product.id)}
                            onChange={() => toggleProductSelection(product.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{product.name}</div>
                          {product.alternativeCode && (
                            <div className="text-xs text-muted-foreground">
                              {t('code')}: {product.alternativeCode}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{product.barcode}</TableCell>
                        <TableCell>
                          <span className={
                            product.stock <= 5 
                              ? 'text-red-600 font-medium bg-red-50 px-2 py-1 rounded-md' 
                              : product.stock <= 10
                                ? 'text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-md'
                                : ''
                          }>
                            {product.stock}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(product.purchasePrice)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(product.sellingPrice)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              onClick={() => handleEditProduct(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
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
