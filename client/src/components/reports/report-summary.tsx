import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  value: number;
  percentageChange: number;
  isLoading?: boolean;
  type?: 'money' | 'number';
}

const SummaryCard = ({ 
  title, 
  value, 
  percentageChange, 
  isLoading = false,
  type = 'money' 
}: SummaryCardProps) => {
  const { t } = useTranslation();
  
  const isPositive = percentageChange >= 0;
  
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-sm text-neutral-500 dark:text-neutral-400 uppercase font-medium mb-2">
          {title}
        </h3>
        <div className="flex justify-between items-end">
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <p className="text-2xl font-bold">
              {type === 'money' ? formatCurrency(value) : value.toLocaleString()}
            </p>
          )}
          <p className={`flex items-center text-sm ${
            isPositive 
              ? 'text-success-DEFAULT' 
              : 'text-destructive'
          }`}>
            {isPositive ? (
              <ArrowUpRight className="text-sm mr-1 h-4 w-4" />
            ) : (
              <ArrowDownRight className="text-sm mr-1 h-4 w-4" />
            )}
            <span>{Math.abs(percentageChange).toFixed(1)}%</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

interface ReportSummaryProps {
  data: {
    totalSales: number;
    totalProfit: number;
    totalDamages: number;
    salesCount: number;
  };
  previousData: {
    totalSales: number;
    totalProfit: number;
    totalDamages: number;
    salesCount: number;
  };
  isLoading?: boolean;
}

export default function ReportSummary({ 
  data, 
  previousData,
  isLoading = false
}: ReportSummaryProps) {
  const { t } = useTranslation();
  
  // Calculate percentage changes
  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };
  
  const salesPercentage = calculatePercentageChange(data.totalSales, previousData.totalSales);
  const profitPercentage = calculatePercentageChange(data.totalProfit, previousData.totalProfit);
  const damagesPercentage = calculatePercentageChange(data.totalDamages, previousData.totalDamages);
  const countPercentage = calculatePercentageChange(data.salesCount, previousData.salesCount);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <SummaryCard
        title={t('total_sales')}
        value={data.totalSales}
        percentageChange={salesPercentage}
        isLoading={isLoading}
      />
      
      <SummaryCard
        title={t('total_profit')}
        value={data.totalProfit}
        percentageChange={profitPercentage}
        isLoading={isLoading}
      />
      
      <SummaryCard
        title={t('damaged_items_value')}
        value={data.totalDamages}
        percentageChange={-damagesPercentage} // Invert since lower damages is positive
        isLoading={isLoading}
      />
      
      <SummaryCard
        title={t('total_orders')}
        value={data.salesCount}
        percentageChange={countPercentage}
        isLoading={isLoading}
        type="number"
      />
    </div>
  );
}
