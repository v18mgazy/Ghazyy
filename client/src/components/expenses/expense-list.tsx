import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import ExpenseForm from "./expense-form";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Expense {
  id: number;
  date: Date;
  amount: number;
  details: string;
  userId: number;
  expenseType?: string;
}

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: number) => void;
  onUpdate: (expense: Expense) => void;
  onAdd: (expense: any) => void;
}

export default function ExpenseList({ expenses, onDelete, onUpdate, onAdd }: ExpenseListProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter expenses based on search term
  const filteredExpenses = expenses.filter(expense => {
    const searchLower = searchTerm.toLowerCase();
    return (
      expense.details.toLowerCase().includes(searchLower) ||
      (expense.expenseType && expense.expenseType.toLowerCase().includes(searchLower)) ||
      expense.amount.toString().includes(searchTerm)
    );
  });

  // Handle add expense
  const handleAddExpense = (expense: any) => {
    onAdd(expense);
    setIsAddDialogOpen(false);
    toast({
      title: t('expense_added_successfully'),
      variant: "default",
    });
  };

  // Handle edit expense
  const handleEditExpense = (expense: Expense) => {
    onUpdate(expense);
    setIsEditDialogOpen(false);
    setSelectedExpense(null);
    toast({
      title: t('expense_updated_successfully'),
      variant: "default",
    });
  };

  // Handle delete expense
  const handleDeleteExpense = () => {
    if (selectedExpense) {
      onDelete(selectedExpense.id);
      setIsDeleteDialogOpen(false);
      setSelectedExpense(null);
      toast({
        title: t('expense_deleted_successfully'),
        variant: "default",
      });
    }
  };

  // Get expense type translation
  const getExpenseTypeLabel = (type?: string) => {
    if (!type) return t('miscellaneous');
    
    switch (type) {
      case 'rent':
        return t('rent');
      case 'personal_expenses':
        return t('personal_expenses');
      case 'miscellaneous':
        return t('miscellaneous');
      default:
        return type;
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>{t('expenses')}</CardTitle>
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> {t('add_expense')}
          </Button>
        </div>
        
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('search_expenses')}
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('date')}</TableHead>
                <TableHead>{t('expense_type')}</TableHead>
                <TableHead>{t('amount')}</TableHead>
                <TableHead>{t('details')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    {t('no_expenses_found')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{format(new Date(expense.date), "yyyy-MM-dd")}</TableCell>
                    <TableCell>{getExpenseTypeLabel(expense.expenseType)}</TableCell>
                    <TableCell>{expense.amount.toFixed(2)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{expense.details}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setSelectedExpense(expense);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setSelectedExpense(expense);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Add Expense Dialog */}
        {isAddDialogOpen && (
          <ExpenseForm
            expense={null}
            onClose={() => setIsAddDialogOpen(false)}
            onSubmit={handleAddExpense}
          />
        )}

        {/* Edit Expense Dialog */}
        {isEditDialogOpen && selectedExpense && (
          <ExpenseForm
            expense={selectedExpense}
            onClose={() => {
              setIsEditDialogOpen(false);
              setSelectedExpense(null);
            }}
            onSubmit={handleEditExpense}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('confirm_delete')}</DialogTitle>
              <DialogDescription>
                {t('delete_expense_confirmation')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setSelectedExpense(null);
                }}
              >
                {t('cancel')}
              </Button>
              <Button variant="destructive" onClick={handleDeleteExpense}>
                {t('delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}