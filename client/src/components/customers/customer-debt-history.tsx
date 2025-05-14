import { useCustomerDebts } from "@/hooks/use-customer-debts";
import { useTranslation } from "react-i18next";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CustomerDebtHistoryProps {
  customerId: number;
  className?: string;
}

export function CustomerDebtHistory({ customerId, className = "" }: CustomerDebtHistoryProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useCustomerDebts(customerId);

  // عرض شاشة التحميل
  if (isLoading) {
    return (
      <div className={className}>
        <h3 className="text-lg font-semibold mb-3">{t("debt_history")}</h3>
        <div className="space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      </div>
    );
  }

  // عرض رسالة خطأ إذا فشل التحميل
  if (isError) {
    return (
      <div className={className}>
        <h3 className="text-lg font-semibold mb-3">{t("debt_history")}</h3>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("error")}</AlertTitle>
          <AlertDescription>
            {t("error_loading_debt_history")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // عرض رسالة إذا لم يكن هناك سجلات
  if (!data?.debts?.length) {
    return (
      <div className={className}>
        <h3 className="text-lg font-semibold mb-3">{t("debt_history")}</h3>
        <p className="text-muted-foreground text-center py-8">{t("no_debt_records")}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">{t("debt_history")}</h3>
        <Badge variant="outline" className={data.totalDebt > 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}>
          {t("total_debt")}: {formatCurrency(data.totalDebt)}
        </Badge>
      </div>
      <ScrollArea className="h-[300px] border rounded-md">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0">
            <TableRow>
              <TableHead className="w-[120px]">{t("date")}</TableHead>
              <TableHead className="w-[100px]">{t("amount")}</TableHead>
              <TableHead>{t("reason")}</TableHead>
              <TableHead className="text-right w-[100px]">{t("type")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.debts.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-mono text-xs">
                  {formatDate(new Date(record.date))}
                </TableCell>
                <TableCell className={record.amount > 0 ? "text-red-700 font-medium" : "text-green-700 font-medium"}>
                  {formatCurrency(Math.abs(record.amount))}
                </TableCell>
                <TableCell className="truncate max-w-[150px]">
                  {record.reason === "debt_added" 
                    ? t("debt_added") 
                    : record.reason === "debt_reduced" 
                      ? t("debt_reduced") 
                      : record.reason}
                </TableCell>
                <TableCell className="text-right">
                  {record.amount > 0 ? (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      {t("debt")}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {t("payment")}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}