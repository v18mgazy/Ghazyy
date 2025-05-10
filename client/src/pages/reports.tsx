import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { 
  Popover, PopoverContent, PopoverTrigger 
} from '@/components/ui/popover';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { CalendarIcon, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { cn, formatDate } from '@/lib/utils';
import { useLocale } from '@/hooks/use-locale';
import ReportSummary from '@/components/reports/report-summary';
import ReportDetails from '@/components/reports/report-details';

interface ReportDataSummary {
  totalSales: number;
  totalProfit: number;
  totalDamages: number;
  salesCount: number;
  previousTotalSales: number;
  previousTotalProfit: number;
  previousTotalDamages: number;
  previousSalesCount: number;
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const { language } = useLocale();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [date, setDate] = useState<Date>(new Date());
  const [month, setMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [year, setYear] = useState<string>(format(new Date(), 'yyyy'));
  
  // Get report data based on period type
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['/api/reports', period, period === 'daily' ? date : period === 'monthly' ? month : year],
    queryFn: async () => {
      // Mock data for demo
      const mockData = {
        summary: {
          totalSales: 3549.99,
          totalProfit: 1244.50,
          totalDamages: 650.00,
          salesCount: 18,
          previousTotalSales: 3152.88,
          previousTotalProfit: 1150.25,
          previousTotalDamages: 636.50,
          previousSalesCount: 16,
        },
        chartData: [
          { name: period === 'daily' ? '9 AM' : period === 'weekly' ? 'Mon' : period === 'monthly' ? '1' : 'Jan', revenue: 500, profit: 200 },
          { name: period === 'daily' ? '10 AM' : period === 'weekly' ? 'Tue' : period === 'monthly' ? '2' : 'Feb', revenue: 800, profit: 320 },
          { name: period === 'daily' ? '11 AM' : period === 'weekly' ? 'Wed' : period === 'monthly' ? '3' : 'Mar', revenue: 400, profit: 160 },
          { name: period === 'daily' ? '12 PM' : period === 'weekly' ? 'Thu' : period === 'monthly' ? '4' : 'Apr', revenue: 1000, profit: 400 },
          { name: period === 'daily' ? '1 PM' : period === 'weekly' ? 'Fri' : period === 'monthly' ? '5' : 'May', revenue: 600, profit: 240 },
          { name: period === 'daily' ? '2 PM' : period === 'weekly' ? 'Sat' : period === 'monthly' ? '6' : 'Jun', revenue: 450, profit: 180 },
          { name: period === 'daily' ? '3 PM' : period === 'weekly' ? 'Sun' : period === 'monthly' ? '7' : 'Jul', revenue: 700, profit: 280 },
        ],
        topProducts: [
          { id: '1', name: 'Samsung Galaxy S21', soldQuantity: 12, revenue: 10799.88, profit: 2999.88 },
          { id: '2', name: 'Lenovo ThinkPad X1', soldQuantity: 5, revenue: 5999.95, profit: 1999.95 },
          { id: '3', name: 'Apple iPhone 13', soldQuantity: 3, revenue: 2999.97, profit: 899.97 },
        ],
        detailedReports: [
          { 
            date: '2023-08-24', 
            salesCount: 18, 
            revenue: 3549.99, 
            cost: 2245.50, 
            discounts: 59.99, 
            damages: 0, 
            profit: 1244.50 
          },
          { 
            date: '2023-08-23', 
            salesCount: 15, 
            revenue: 2899.95, 
            cost: 1955.25, 
            discounts: 45.50, 
            damages: 650.00, 
            profit: 249.20 
          },
        ],
      };
      
      return mockData;
    }
  });
  
  const handleExport = () => {
    console.log('Export report');
    // In a real app, this would generate and download an Excel file
  };
  
  const handlePrint = () => {
    console.log('Print report');
    // In a real app, this would open a print dialog
    window.print();
  };
  
  // Generate month options
  const monthOptions = [
    { value: '01', label: t('january') },
    { value: '02', label: t('february') },
    { value: '03', label: t('march') },
    { value: '04', label: t('april') },
    { value: '05', label: t('may') },
    { value: '06', label: t('june') },
    { value: '07', label: t('july') },
    { value: '08', label: t('august') },
    { value: '09', label: t('september') },
    { value: '10', label: t('october') },
    { value: '11', label: t('november') },
    { value: '12', label: t('december') },
  ];
  
  // Generate year options (last 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = currentYear - i;
    return { value: year.toString(), label: year.toString() };
  });
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{t('reports')}</h1>
        
        <div className="flex flex-wrap items-center gap-2">
          {period === 'daily' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? (
                    formatDate(date, 'PPP', language)
                  ) : (
                    <span>{t('pick_a_date')}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(day) => day && setDate(day)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
          
          {period === 'monthly' && (
            <div className="flex gap-2">
              <Select 
                value={month.split('-')[0]} 
                onValueChange={(value) => setMonth(`${value}-${month.split('-')[1]}`)}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder={t('select_year')} />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select 
                value={month.split('-')[1]} 
                onValueChange={(value) => setMonth(`${month.split('-')[0]}-${value}`)}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder={t('select_month')} />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {period === 'yearly' && (
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={t('select_year')} />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      
      <Tabs 
        defaultValue="daily" 
        value={period} 
        onValueChange={(value) => setPeriod(value as any)}
        className="w-full"
      >
        <TabsList className="mb-6 bg-white dark:bg-neutral-800 p-1 rounded-lg">
          <TabsTrigger value="daily">{t('daily')}</TabsTrigger>
          <TabsTrigger value="weekly">{t('weekly')}</TabsTrigger>
          <TabsTrigger value="monthly">{t('monthly')}</TabsTrigger>
          <TabsTrigger value="yearly">{t('yearly')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="daily" className="m-0">
          {reportData && (
            <>
              <ReportSummary 
                data={{
                  totalSales: reportData.summary.totalSales,
                  totalProfit: reportData.summary.totalProfit,
                  totalDamages: reportData.summary.totalDamages,
                  salesCount: reportData.summary.salesCount,
                }}
                previousData={{
                  totalSales: reportData.summary.previousTotalSales,
                  totalProfit: reportData.summary.previousTotalProfit,
                  totalDamages: reportData.summary.previousTotalDamages,
                  salesCount: reportData.summary.previousSalesCount,
                }}
                isLoading={isLoading}
              />
              
              <ReportDetails 
                periodType="daily"
                chartData={reportData.chartData}
                topProducts={reportData.topProducts}
                detailedReports={reportData.detailedReports}
                isLoading={isLoading}
                onExport={handleExport}
                onPrint={handlePrint}
              />
            </>
          )}
        </TabsContent>
        
        <TabsContent value="weekly" className="m-0">
          {reportData && (
            <>
              <ReportSummary 
                data={{
                  totalSales: reportData.summary.totalSales,
                  totalProfit: reportData.summary.totalProfit,
                  totalDamages: reportData.summary.totalDamages,
                  salesCount: reportData.summary.salesCount,
                }}
                previousData={{
                  totalSales: reportData.summary.previousTotalSales,
                  totalProfit: reportData.summary.previousTotalProfit,
                  totalDamages: reportData.summary.previousTotalDamages,
                  salesCount: reportData.summary.previousSalesCount,
                }}
                isLoading={isLoading}
              />
              
              <ReportDetails 
                periodType="weekly"
                chartData={reportData.chartData}
                topProducts={reportData.topProducts}
                detailedReports={reportData.detailedReports}
                isLoading={isLoading}
                onExport={handleExport}
                onPrint={handlePrint}
              />
            </>
          )}
        </TabsContent>
        
        <TabsContent value="monthly" className="m-0">
          {reportData && (
            <>
              <ReportSummary 
                data={{
                  totalSales: reportData.summary.totalSales,
                  totalProfit: reportData.summary.totalProfit,
                  totalDamages: reportData.summary.totalDamages,
                  salesCount: reportData.summary.salesCount,
                }}
                previousData={{
                  totalSales: reportData.summary.previousTotalSales,
                  totalProfit: reportData.summary.previousTotalProfit,
                  totalDamages: reportData.summary.previousTotalDamages,
                  salesCount: reportData.summary.previousSalesCount,
                }}
                isLoading={isLoading}
              />
              
              <ReportDetails 
                periodType="monthly"
                chartData={reportData.chartData}
                topProducts={reportData.topProducts}
                detailedReports={reportData.detailedReports}
                isLoading={isLoading}
                onExport={handleExport}
                onPrint={handlePrint}
              />
            </>
          )}
        </TabsContent>
        
        <TabsContent value="yearly" className="m-0">
          {reportData && (
            <>
              <ReportSummary 
                data={{
                  totalSales: reportData.summary.totalSales,
                  totalProfit: reportData.summary.totalProfit,
                  totalDamages: reportData.summary.totalDamages,
                  salesCount: reportData.summary.salesCount,
                }}
                previousData={{
                  totalSales: reportData.summary.previousTotalSales,
                  totalProfit: reportData.summary.previousTotalProfit,
                  totalDamages: reportData.summary.previousTotalDamages,
                  salesCount: reportData.summary.previousSalesCount,
                }}
                isLoading={isLoading}
              />
              
              <ReportDetails 
                periodType="yearly"
                chartData={reportData.chartData}
                topProducts={reportData.topProducts}
                detailedReports={reportData.detailedReports}
                isLoading={isLoading}
                onExport={handleExport}
                onPrint={handlePrint}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
