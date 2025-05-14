import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useReduceCustomerDebt } from "@/hooks/use-customer-debts";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface ReduceDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number;
  customerName: string;
  totalDebt: number;
}

export function ReduceDebtDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  totalDebt,
}: ReduceDebtDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [amount, setAmount] = useState<number | "">("");
  const [reason, setReason] = useState("");
  
  const { mutate: reduceDebt, isPending } = useReduceCustomerDebt();

  // إعادة ضبط النموذج عند الإغلاق
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setAmount("");
      setReason("");
    }
    onOpenChange(open);
  };

  const handleSubmit = () => {
    if (!amount || amount <= 0) return;
    
    // التحقق من أن مبلغ السداد لا يتجاوز إجمالي الدين
    if (amount > totalDebt) {
      setAmount(totalDebt);
      return;
    }
    
    reduceDebt({
      customerId,
      amount: Number(amount),
      reason: reason || "debt_reduced",
      createdBy: user?.id || 1,
    }, {
      onSuccess: () => {
        handleOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {t("reduce_debt")} - {customerName}
          </DialogTitle>
          <DialogDescription>
            {t("reduce_debt_description")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="totalDebt" className="text-right">
              {t("total_debt")}
            </Label>
            <Input
              id="totalDebt"
              type="text"
              value={totalDebt.toFixed(2)}
              className="col-span-3"
              disabled
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              {t("amount")}
            </Label>
            <Input
              id="amount"
              type="number"
              min="0"
              max={totalDebt}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
              className="col-span-3"
              placeholder="0.00"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reason" className="text-right">
              {t("reason")}
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="col-span-3"
              placeholder={t("payment_reason_placeholder")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!amount || amount <= 0 || amount > totalDebt || isPending}
            className="min-w-[80px]"
          >
            {isPending ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}