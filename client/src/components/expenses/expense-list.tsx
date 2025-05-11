import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from '@/lib/utils';
import ExpenseForm from './expense-form';
import { format } from 'date-fns';
import { Loader2, Edit, Trash2, Plus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Expense {
  id: number;
  date: Date;
  amount: number;
  details: string;
  userId: number;
}

interface ExpenseListProps {
  expenses: Expense[];
  isLoading: boolean;
  onAddExpense: (expense: { amount: number; details: string; date?: Date }) => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: number) => void;
}

export default function ExpenseList({
  expenses,
  isLoading,
  onAddExpense,
  onEditExpense,
  onDeleteExpense
}: ExpenseListProps) {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);

  const handleAddExpense = (expense: { amount: number; details: string; date?: Date }) => {
    onAddExpense(expense);
    setIsFormOpen(false);
  };

  const handleEditExpense = (expense: Expense) => {
    onEditExpense(expense);
    setSelectedExpense(null);
  };

  const handleDeleteConfirm = () => {
    if (expenseToDelete !== null) {
      onDeleteExpense(expenseToDelete);
      setExpenseToDelete(null);
    }
  };

  // حساب المجموع الكلي للمصاريف
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">{t('expenses_management')}</CardTitle>
          <Button 
            onClick={() => {
              setSelectedExpense(null);
              setIsFormOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            {t('add_expense')}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          ) : (
            <>
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
                <h3 className="font-bold text-lg">{t('total_expenses')}: {formatCurrency(totalExpenses)}</h3>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">{t('expense_id')}</TableHead>
                      <TableHead>{t('date')}</TableHead>
                      <TableHead>{t('amount')}</TableHead>
                      <TableHead className="w-full">{t('details')}</TableHead>
                      <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          {t('no_expenses_found')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">#{expense.id}</TableCell>
                          <TableCell>
                            {expense.date instanceof Date 
                              ? format(expense.date, 'yyyy-MM-dd') 
                              : expense.date
                                ? format(new Date(expense.date), 'yyyy-MM-dd')
                                : 'N/A'
                            }
                          </TableCell>
                          <TableCell className="font-semibold">{formatCurrency(expense.amount)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{expense.details}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => setSelectedExpense(expense)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon"
                                className="border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => setExpenseToDelete(expense.id)}
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
            </>
          )}
        </CardContent>
      </Card>

      {/* نموذج إضافة/تعديل المصروف */}
      {(isFormOpen || selectedExpense) && (
        <ExpenseForm
          expense={selectedExpense}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedExpense(null);
          }}
          onSubmit={selectedExpense ? handleEditExpense : handleAddExpense}
        />
      )}

      {/* مربع حوار تأكيد الحذف */}
      <AlertDialog open={expenseToDelete !== null} onOpenChange={() => setExpenseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('delete_expense_confirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}