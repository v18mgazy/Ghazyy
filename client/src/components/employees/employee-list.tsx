import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, Plus, Edit, Trash2, Loader2, MinusCircle, History
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
import { formatCurrency, formatDate } from '@/lib/utils';
import EmployeeForm from './employee-form';
import DeductionForm from './deduction-form';
import DeductionHistory from './deduction-history';
import { useLocale } from '@/hooks/use-locale';
import { useToast } from '@/hooks/use-toast';

interface Deduction {
  id: string;
  employeeId: string;
  amount: number;
  reason: string;
  date: string;
}

interface Employee {
  id: string;
  name: string;
  hireDate: string;
  salary: number;
  deductions: number;
}

interface EmployeeListProps {
  employees: Employee[];
  isLoading: boolean;
  onAddEmployee: (employee: Employee) => void;
  onEditEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employeeId: string) => void;
  onAddDeduction: (employeeId: string, deduction: { amount: number; reason: string }) => void;
  deductionHistory: Deduction[];
  isLoadingDeductions: boolean;
}

export default function EmployeeList({
  employees,
  isLoading,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onAddDeduction,
  deductionHistory,
  isLoadingDeductions
}: EmployeeListProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { language } = useLocale();
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFormOpen, setEmployeeFormOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | undefined>();
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [deductionFormOpen, setDeductionFormOpen] = useState(false);
  const [deductionHistoryOpen, setDeductionHistoryOpen] = useState(false);
  const [selectedEmployeeForDeduction, setSelectedEmployeeForDeduction] = useState<Employee | null>(null);

  const filteredEmployees = employees.filter(employee => 
    employee.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddEmployee = () => {
    setSelectedEmployee(undefined);
    setEmployeeFormOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEmployeeFormOpen(true);
  };

  const handleSaveEmployee = (employee: Employee) => {
    if (employee.id) {
      onEditEmployee(employee);
    } else {
      onAddEmployee(employee);
    }
    setEmployeeFormOpen(false);
  };

  const handleDeleteEmployee = (employeeId: string) => {
    setEmployeeToDelete(employeeId);
  };

  const confirmDeleteEmployee = () => {
    if (employeeToDelete) {
      onDeleteEmployee(employeeToDelete);
      setEmployeeToDelete(null);
    }
  };
  
  const handleAddDeduction = (employee: Employee) => {
    setSelectedEmployeeForDeduction(employee);
    setDeductionFormOpen(true);
  };
  
  const handleSaveDeduction = (deduction: { amount: number; reason: string }) => {
    if (selectedEmployeeForDeduction) {
      console.log('Adding deduction for employee:', {
        employeeId: selectedEmployeeForDeduction.id,
        amount: deduction.amount,
        reason: deduction.reason
      });
      onAddDeduction(selectedEmployeeForDeduction.id, deduction);
      toast({
        title: t('deduction_added'),
        description: t('deduction_added_success'),
      });
      setDeductionFormOpen(false);
    }
  };
  
  const handleViewDeductionHistory = (employee: Employee) => {
    setSelectedEmployeeForDeduction(employee);
    setDeductionHistoryOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('employees_management')}</CardTitle>
            <Button size="sm" onClick={handleAddEmployee}>
              <Plus className="mr-1 h-4 w-4" />
              {t('add_employee')}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative flex-grow">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('search_employees')}
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
                    <TableHead className="font-semibold">{t('name')}</TableHead>
                    <TableHead className="font-semibold">{t('hire_date')}</TableHead>
                    <TableHead className="font-semibold">{t('salary')}</TableHead>
                    <TableHead className="font-semibold">{t('deductions')}</TableHead>
                    <TableHead className="font-semibold">{t('final_salary')}</TableHead>
                    <TableHead className="font-semibold text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? t('no_employees_found') : t('no_employees_yet')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee, index) => (
                      <TableRow 
                        key={employee.id}
                        className={index % 2 === 0 ? 'bg-muted/20' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
                              {employee.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{employee.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(employee.hireDate, 'PP', language)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(employee.salary)}</TableCell>
                        <TableCell>
                          <span className={employee.deductions > 0 ? 'text-red-600 font-medium' : ''}>
                            {formatCurrency(employee.deductions)}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold text-green-700">
                          {formatCurrency(employee.salary - employee.deductions)}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t('add_deduction')}
                              className="text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50"
                              onClick={() => handleAddDeduction(employee)}
                            >
                              <MinusCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t('view_deduction_history')}
                              className="text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                              onClick={() => handleViewDeductionHistory(employee)}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t('edit_employee')}
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              onClick={() => handleEditEmployee(employee)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t('delete_employee')}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
                              onClick={() => handleDeleteEmployee(employee.id)}
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
      
      {/* Employee Form Dialog */}
      <EmployeeForm
        open={employeeFormOpen}
        onClose={() => setEmployeeFormOpen(false)}
        onSave={handleSaveEmployee}
        employee={selectedEmployee}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!employeeToDelete} onOpenChange={() => setEmployeeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('delete_employee_confirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteEmployee}
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* نموذج إضافة خصم */}
      {selectedEmployeeForDeduction && (
        <DeductionForm
          open={deductionFormOpen}
          onClose={() => setDeductionFormOpen(false)}
          onSave={handleSaveDeduction}
          employeeName={selectedEmployeeForDeduction.name}
        />
      )}
      
      {/* عرض تاريخ الخصومات */}
      {selectedEmployeeForDeduction && (
        <DeductionHistory
          open={deductionHistoryOpen}
          onClose={() => setDeductionHistoryOpen(false)}
          deductions={deductionHistory.filter(d => d.employeeId === selectedEmployeeForDeduction.id)}
          employeeName={selectedEmployeeForDeduction.name}
        />
      )}
    </>
  );
}
