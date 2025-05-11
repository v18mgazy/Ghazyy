import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, Plus, Edit, Trash2, Loader2, AlertTriangle
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
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { formatCurrency, formatDate, truncateText } from '@/lib/utils';
import DamagedItemForm from './damaged-item-form';
import { useLocale } from '@/hooks/use-locale';

interface Product {
  id: string;
  name: string;
  purchasePrice: number;
  stock: number;
}

interface DamagedItem {
  id: string;
  productId: string;
  product: {
    name: string;
  };
  quantity: number;
  date: string;
  description: string;
  valueLoss: number;
}

interface DamagedItemListProps {
  items: DamagedItem[];
  products: Product[];
  isLoading: boolean;
  onAddItem: (item: Omit<DamagedItem, 'id' | 'product'>) => void;
  onEditItem: (item: Omit<DamagedItem, 'product'>) => void;
  onDeleteItem: (itemId: string) => void;
}

export default function DamagedItemList({
  items,
  products,
  isLoading,
  onAddItem,
  onEditItem,
  onDeleteItem
}: DamagedItemListProps) {
  const { t } = useTranslation();
  const { language } = useLocale();
  const [searchTerm, setSearchTerm] = useState('');
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DamagedItem | undefined>();
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const filteredItems = items.filter(item => 
    item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddItem = () => {
    setSelectedItem(undefined);
    setItemFormOpen(true);
  };

  const handleEditItem = (item: DamagedItem) => {
    setSelectedItem(item);
    setItemFormOpen(true);
  };

  const handleSaveItem = (item: Omit<DamagedItem, 'id' | 'product'>) => {
    if (selectedItem) {
      onEditItem({
        ...item,
        id: selectedItem.id
      });
    } else {
      onAddItem(item);
    }
    setItemFormOpen(false);
  };

  const handleDeleteItem = (itemId: string) => {
    setItemToDelete(itemId);
  };

  const confirmDeleteItem = () => {
    if (itemToDelete) {
      onDeleteItem(itemToDelete);
      setItemToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
              {t('damaged_items')}
            </CardTitle>
            <Button size="sm" onClick={handleAddItem}>
              <Plus className="mr-1 h-4 w-4" />
              {t('report_damaged_item')}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative flex-grow">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('search_damaged_items')}
                className="pr-8"
              />
              <div className="absolute right-2 top-2 text-neutral-500">
                <Search className="h-5 w-5" />
              </div>
            </div>
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
                    <TableHead className="font-semibold">{t('product')}</TableHead>
                    <TableHead className="font-semibold">{t('quantity')}</TableHead>
                    <TableHead className="font-semibold">{t('date')}</TableHead>
                    <TableHead className="font-semibold">{t('description')}</TableHead>
                    <TableHead className="font-semibold">{t('value_loss')}</TableHead>
                    <TableHead className="font-semibold text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? t('no_damaged_items_found') : t('no_damaged_items_yet')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item, index) => (
                      <TableRow 
                        key={item.id}
                        className={index % 2 === 0 ? 'bg-muted/20' : ''}
                      >
                        <TableCell>
                          <div className="font-medium">{item.product.name}</div>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-red-50 text-red-700 rounded-md font-medium">
                            {item.quantity}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(item.date, 'PP', language)}</TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            {item.description ? truncateText(item.description, 50) : '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-red-600 font-semibold">
                          {formatCurrency(item.valueLoss)}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              onClick={() => handleEditItem(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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
      
      {/* Damaged Item Form Dialog */}
      <DamagedItemForm
        open={itemFormOpen}
        onClose={() => setItemFormOpen(false)}
        onSave={handleSaveItem}
        damagedItem={selectedItem && {
          id: selectedItem.id,
          productId: selectedItem.productId,
          quantity: selectedItem.quantity,
          description: selectedItem.description,
          date: selectedItem.date,
          valueLoss: selectedItem.valueLoss
        }}
        products={products}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('delete_damaged_item_confirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteItem}
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
