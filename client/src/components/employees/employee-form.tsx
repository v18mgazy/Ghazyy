import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Loader2 } from 'lucide-react';
import { format, parse } from 'date-fns';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';

interface Employee {
  id?: string;
  name: string;
  hireDate: string;
  salary: number;
  deductions: number;
}

interface EmployeeFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (employee: Employee) => void;
  employee?: Employee;
  isLoading?: boolean;
}

export default function EmployeeForm({ 
  open, 
  onClose, 
  onSave, 
  employee, 
  isLoading = false 
}: EmployeeFormProps) {
  const { t } = useTranslation();
  const isEditing = !!employee?.id;
  
  const [formData, setFormData] = useState<Employee>({
    name: '',
    hireDate: format(new Date(), 'yyyy-MM-dd'),
    salary: 0,
    deductions: 0
  });

  const [finalSalary, setFinalSalary] = useState(0);

  useEffect(() => {
    if (employee) {
      setFormData(employee);
    } else {
      setFormData({
        name: '',
        hireDate: format(new Date(), 'yyyy-MM-dd'),
        salary: 0,
        deductions: 0
      });
    }
  }, [employee, open]);

  useEffect(() => {
    // Calculate final salary
    const final = Math.max(0, formData.salary - formData.deductions);
    setFinalSalary(final);
  }, [formData.salary, formData.deductions]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    
    if (id === 'salary' || id === 'deductions') {
      setFormData({
        ...formData,
        [id]: parseFloat(value) || 0
      });
    } else {
      setFormData({
        ...formData,
        [id]: value
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            {isEditing ? t('edit_employee') : t('add_employee')}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm font-medium">
              {t('employee_name')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="hireDate" className="text-sm font-medium">
              {t('hire_date')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="hireDate"
              type="date"
              value={formData.hireDate}
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="salary" className="text-sm font-medium">
              {t('salary')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="salary"
              type="number"
              min="0"
              step="0.01"
              value={formData.salary}
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="deductions" className="text-sm font-medium">
              {t('deductions')}
            </Label>
            <Input
              id="deductions"
              type="number"
              min="0"
              step="0.01"
              value={formData.deductions}
              onChange={handleChange}
            />
          </div>
          
          <div className="p-4 bg-neutral-100 dark:bg-neutral-700 rounded-md">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">{t('final_salary')}:</Label>
              <span className="font-bold text-lg">{formatCurrency(finalSalary)}</span>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
            >
              {t('cancel')}
            </Button>
            <Button 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                t('save_employee')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
