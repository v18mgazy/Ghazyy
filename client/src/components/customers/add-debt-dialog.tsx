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
import { useAddCustomerDebt } from "@/hooks/use-customer-debts";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface AddDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number;
  customerName: string;
}

export function AddDebtDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
}: AddDebtDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [amount, setAmount] = useState<number | "">("");
  const [reason, setReason] = useState("");
  
  const { mutate: addDebt, isPending } = useAddCustomerDebt();

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
    
    addDebt({
      customerId,
      amount: Number(amount),
      reason: reason || "debt_added",
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
            {t("add_debt")} - {customerName}
          </DialogTitle>
          <DialogDescription>
            {t("add_debt_description")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              {t("amount")}
            </Label>
            <Input
              id="amount"
              type="number"
              min="0"
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
              placeholder={t("debt_reason_placeholder")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!amount || amount <= 0 || isPending}
            className="min-w-[80px]"
          >
            {isPending ? t("adding") : t("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}