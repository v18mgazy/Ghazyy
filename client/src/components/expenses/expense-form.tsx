import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Expense {
  id: number;
  date: Date;
  amount: number;
  details: string;
  userId: number;
}

interface ExpenseFormProps {
  expense: Expense | null;
  onClose: () => void;
  onSubmit: (expense: any) => void;
}

export default function ExpenseForm({ expense, onClose, onSubmit }: ExpenseFormProps) {
  const { t } = useTranslation();
  const [date, setDate] = useState<Date>(expense?.date ? new Date(expense.date) : new Date());
  const [amount, setAmount] = useState<string>(expense?.amount ? expense.amount.toString() : '');
  const [details, setDetails] = useState<string>(expense?.details || '');
  const [errors, setErrors] = useState<{ amount?: string; details?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate form
  const validateForm = () => {
    const newErrors: { amount?: string; details?: string } = {};

    // Validate amount
    if (!amount.trim()) {
      newErrors.amount = t('amount_must_be_positive');
    } else {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        newErrors.amount = t('amount_must_be_positive');
      }
    }

    // Validate details
    if (!details.trim()) {
      newErrors.details = t('details_min_length');
    } else if (details.length < 3) {
      newErrors.details = t('details_min_length');
    } else if (details.length > 500) {
      newErrors.details = t('details_max_length');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Prepare data for submission
    const expenseData = {
      date,
      amount: parseFloat(amount),
      details,
      userId: 1, // Will be replaced by actual userId from context/session
      ...(expense?.id && { id: expense.id }),
    };

    // Submit data to parent component
    onSubmit(expenseData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            {expense ? t('edit_expense') : t('add_expense')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="date">{t('date')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-right",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>{t('pick_date')}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && setDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid w-full gap-1.5">
            <Label htmlFor="amount">{t('amount')}</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={errors.amount ? "border-red-500" : ""}
            />
            {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
          </div>

          <div className="grid w-full gap-1.5">
            <Label htmlFor="details">{t('details')}</Label>
            <Textarea
              id="details"
              placeholder={t('expense_details_placeholder')}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className={errors.details ? "border-red-500" : ""}
              rows={4}
            />
            {errors.details && <p className="text-red-500 text-sm mt-1">{errors.details}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('processing') : expense ? t('save') : t('add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}