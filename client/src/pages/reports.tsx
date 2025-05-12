import React, { useState, useMemo } from 'react';
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
import { arSA, enUS } from 'date-fns/locale';
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

interface TopProduct {
  id: number;
  name: string;
  soldQuantity: number;
  revenue: number;
  profit: number;
}

interface ChartDataPoint {
  name: string;
  revenue: number;
  profit: number;
}

interface DetailedReport {
  id: number | string;
  date: string;
  type: string;
  amount: number;
  profit?: number;
  details: string;
  customerName?: string;
  paymentStatus?: string;
  productName?: string;
  quantity?: number;
  category?: string;
}

interface ReportData {
  summary: ReportDataSummary;
  chartData: ChartDataPoint[];
  topProducts: TopProduct[];
  detailedReports: DetailedReport[];
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const { language } = useLocale();
  const [period, setPeriod] = useState<'daily' | 'custom' | 'monthly' | 'yearly'>('daily');
  const [date, setDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [month, setMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [year, setYear] = useState<string>(format(new Date(), 'yyyy'));
  
  // تحديد تنسيق التاريخ المستخدم في طلب البيانات
  const formattedDate = useMemo(() => {
    if (period === 'daily') {
      return formatDate(date, 'yyyy-MM-dd');
    } else if (period === 'monthly') {
      return month;
    } else if (period === 'custom') {
      // للتقارير المخصصة، نستخدم التاريخ الحالي كقيمة افتراضية فقط
      // سيتم إرسال تاريخي البداية والنهاية بشكل منفصل في الطلب
      return formatDate(new Date(), 'yyyy-MM-dd');
    } else {
      return year;
    }
  }, [period, date, month, year]);
  
  // استرجاع بيانات التقارير من قاعدة البيانات بناءً على نوع الفترة
  const { data: reportData, isLoading } = useQuery<ReportData>({
    queryKey: ['/api/reports', period, formattedDate, startDate, endDate],
    staleTime: 30 * 1000,         // البيانات تعتبر قديمة بعد 30 ثانية
    refetchInterval: 30 * 1000,   // إعادة تحميل البيانات كل 30 ثانية
    refetchOnWindowFocus: true,   // إعادة التحميل عند التبديل للصفحة
    queryFn: async ({ queryKey }) => {
      console.log('تحديث بيانات التقارير...', period, formattedDate);
      
      // بناء URL الطلب حسب نوع التقرير
      let url = `/api/reports?type=${period}`;
      
      if (period === 'custom') {
        const formattedStartDate = formatDate(startDate, 'yyyy-MM-dd');
        const formattedEndDate = formatDate(endDate, 'yyyy-MM-dd');
        url += `&startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
      } else {
        url += `&date=${formattedDate}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch report data: ${response.statusText}`);
      }
      return await response.json();
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
          <TabsTrigger value="custom">{t('custom')}</TabsTrigger>
          <TabsTrigger value="monthly">{t('monthly')}</TabsTrigger>
          <TabsTrigger value="yearly">{t('yearly')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="daily" className="m-0">
          {reportData ? (
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
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">{isLoading ? t('loading') : t('no_data_available')}</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="custom" className="m-0">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="w-full lg:w-1/2">
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">{t('reports.start_date')}</h3>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-right",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP", { locale: language === 'ar' ? arSA : enUS }) : <span>{t('select_date')}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="w-full lg:w-1/2">
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">{t('reports.end_date')}</h3>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-right",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP", { locale: language === 'ar' ? arSA : enUS }) : <span>{t('select_date')}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          
          {reportData ? (
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
                periodType="custom"
                chartData={reportData.chartData}
                topProducts={reportData.topProducts}
                detailedReports={reportData.detailedReports}
                isLoading={isLoading}
                onExport={handleExport}
                onPrint={handlePrint}
              />
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">{isLoading ? t('loading') : t('no_data_available')}</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="monthly" className="m-0">
          {reportData ? (
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
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">{isLoading ? t('loading') : t('no_data_available')}</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="yearly" className="m-0">
          {reportData ? (
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
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">{isLoading ? t('loading') : t('no_data_available')}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
