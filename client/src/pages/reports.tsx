import React, { useState, useEffect } from 'react';
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
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from '@/components/ui/card';
import { 
  CalendarIcon, Download, Printer, RefreshCw, FileBarChart, 
  ChevronLeft, ChevronRight, Ban
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, subDays } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';
import { cn, formatDate } from '@/lib/utils';
import { useLocale } from '@/hooks/use-locale';
import ReportSummary from '@/components/reports/report-summary';
import ReportDetails from '@/components/reports/report-details';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';
import { Badge } from "@/components/ui/badge";

// تعريف أنواع البيانات للتقارير
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
  expenseType?: string;
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
  
  // حالة نوع التقرير المحدد
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  
  // حالات لمختلف أنواع التقارير
  const [date, setDate] = useState<Date>(new Date());
  const [weekStartDate, setWeekStartDate] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [weekEndDate, setWeekEndDate] = useState<Date>(() => endOfWeek(new Date(), { weekStartsOn: 0 }));
  const [month, setMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [year, setYear] = useState<string>(format(new Date(), 'yyyy'));
  
  // تحديث تواريخ الأسبوع عند تغيير التاريخ الأساسي
  useEffect(() => {
    if (period === 'weekly') {
      setWeekStartDate(startOfWeek(date, { weekStartsOn: 0 }));
      setWeekEndDate(endOfWeek(date, { weekStartsOn: 0 }));
    }
  }, [date, period]);
  
  // تنسيق التاريخ للاستعلام عن البيانات
  const getFormattedDateForQuery = () => {
    if (period === 'daily') {
      return formatDate(date, 'yyyy-MM-dd');
    } else if (period === 'weekly') {
      // سيتم استخدام تواريخ البداية والنهاية بشكل منفصل
      return formatDate(date, 'yyyy-MM-dd');
    } else if (period === 'monthly') {
      return month;
    } else {
      return year;
    }
  };
  
  // استعلام للحصول على بيانات التقارير
  const { 
    data: reportData, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery<ReportData>({
    queryKey: ['/api/reports', period, getFormattedDateForQuery(), weekStartDate, weekEndDate],
    queryFn: async () => {
      // بناء URL الاستعلام
      let url = `/api/reports?type=${period}`;
      
      if (period === 'weekly') {
        const formattedStartDate = formatDate(weekStartDate, 'yyyy-MM-dd');
        const formattedEndDate = formatDate(weekEndDate, 'yyyy-MM-dd');
        url += `&startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
      } else {
        url += `&date=${getFormattedDateForQuery()}`;
      }
      
      console.log("طلب التقرير:", { type: period, date: getFormattedDateForQuery(), startDate: period === 'weekly' ? formatDate(weekStartDate, 'yyyy-MM-dd') : undefined, endDate: period === 'weekly' ? formatDate(weekEndDate, 'yyyy-MM-dd') : undefined });
      
      // تنفيذ الاستعلام
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`فشل في استرجاع بيانات التقارير: ${response.statusText}`);
      }
      return await response.json();
    },
    staleTime: 60 * 1000,          // 1 دقيقة
    refetchInterval: 300 * 1000,    // تحديث كل 5 دقائق
    refetchOnWindowFocus: true,
  });
  
  // معالجات الأحداث
  const handleExport = () => {
    if (!reportData) return;
    
    // تحديد اسم الملف بناءً على نوع التقرير والتاريخ
    let reportTitle = '';
    let fileName = '';
    
    if (period === 'daily') {
      reportTitle = t('daily_report');
      fileName = `${t('daily_report')}_${formatDate(date, 'yyyy-MM-dd')}`;
    } else if (period === 'weekly') {
      reportTitle = t('weekly_report');
      fileName = `${t('weekly_report')}_${formatDate(weekStartDate, 'yyyy-MM-dd')}_${formatDate(weekEndDate, 'yyyy-MM-dd')}`;
    } else if (period === 'monthly') {
      reportTitle = t('monthly_report');
      fileName = `${t('monthly_report')}_${month}`;
    } else {
      reportTitle = t('yearly_report');
      fileName = `${t('yearly_report')}_${year}`;
    }
    
    // إنشاء workbook جديد
    const wb = XLSX.utils.book_new();
    
    // ملخص التقرير - الصفحة الأولى
    const summaryData = [
      [t('summary')],
      [t('total_sales'), reportData.summary.totalSales],
      [t('total_profit'), reportData.summary.totalProfit],
      [t('profit_margin'), `${(reportData.summary.totalProfit / reportData.summary.totalSales * 100).toFixed(1)}%`],
      [t('total_orders'), reportData.summary.salesCount],
      [t('total_damaged_items'), reportData.summary.totalDamages],
    ];
    
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, t('summary'));
    
    // بيانات الرسم البياني - الصفحة الثانية
    const chartData = reportData.chartData.map(item => ({
      [t('period')]: item.name,
      [t('revenue')]: item.revenue,
      [t('profit')]: item.profit
    }));
    
    const chartWs = XLSX.utils.json_to_sheet(chartData);
    XLSX.utils.book_append_sheet(wb, chartWs, t('chart_data'));
    
    // أفضل المنتجات - الصفحة الثالثة
    const topProductsData = reportData.topProducts.map(item => ({
      [t('product_name')]: item.name,
      [t('quantity')]: item.soldQuantity,
      [t('revenue')]: item.revenue,
      [t('profit')]: item.profit
    }));
    
    const topProductsWs = XLSX.utils.json_to_sheet(topProductsData);
    XLSX.utils.book_append_sheet(wb, topProductsWs, t('top_products'));
    
    // التقارير التفصيلية - الصفحة الرابعة
    const detailedData = reportData.detailedReports.map(item => {
      // تجاهل الملخصات في التقارير التفصيلية
      if (item.type === 'summary') return null;
      
      return {
        [t('date')]: item.date,
        [t('type')]: t(item.type),
        [t('amount')]: item.amount,
        [t('details')]: item.details,
        [t('profit')]: item.profit || '-',
        [t('customer_name')]: item.customerName || '-',
      };
    }).filter(item => item !== null);
    
    const detailedWs = XLSX.utils.json_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(wb, detailedWs, t('detailed_reports'));
    
    // تصدير الملف
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };
  
  const handlePrint = () => {
    window.print();
  };
  
  const handleRefresh = () => {
    refetch();
  };
  
  // انتقال للأسبوع السابق
  const goToPreviousWeek = () => {
    const newDate = subDays(date, 7);
    setDate(newDate);
  };
  
  // انتقال للأسبوع التالي
  const goToNextWeek = () => {
    const newDate = addDays(date, 7);
    setDate(newDate);
  };
  
  // خيارات الأشهر للتقارير الشهرية
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
  
  // خيارات السنوات (5 سنوات سابقة)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = currentYear - i;
    return { value: year.toString(), label: year.toString() };
  });
  
  // عرض نطاق تاريخ الأسبوع
  const getWeekRangeDisplay = () => {
    return `${format(weekStartDate, 'dd MMM', { locale: language === 'ar' ? arSA : enUS })} - ${format(weekEndDate, 'dd MMM', { locale: language === 'ar' ? arSA : enUS })}`;
  };
  
  // حساب الإحصائيات العامة لعرضها في بطاقة المخلص
  const calculateStats = (data?: ReportData) => {
    if (!data) return { totalSales: 0, totalProfit: 0, totalOrders: 0, profitMargin: 0 };
    
    const totalSales = data.summary.totalSales;
    const totalProfit = data.summary.totalProfit;
    const totalOrders = data.summary.salesCount;
    const profitMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100) : 0;
    
    return { totalSales, totalProfit, totalOrders, profitMargin };
  };
  
  const stats = calculateStats(reportData);
  
  return (
    <div className="space-y-6 mb-10">
      {/* عنوان الصفحة والأزرار العلوية */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('reports')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('analyze_your_business_data')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('refresh')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            {t('export')}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            {t('print')}
          </Button>
        </div>
      </div>
      
      {/* تم حذف بطاقة ملخص التقرير */}
      
      {/* التبويبات لأنواع التقارير المختلفة */}
      <Tabs 
        defaultValue="daily" 
        value={period} 
        onValueChange={(value) => setPeriod(value as 'daily' | 'weekly' | 'monthly' | 'yearly')}
        className="w-full"
      >
        <TabsList className="mb-6 p-1 rounded-lg w-full sm:w-auto">
          <TabsTrigger value="daily">{t('report_periods.daily')}</TabsTrigger>
          <TabsTrigger value="weekly">{t('report_periods.weekly')}</TabsTrigger>
          <TabsTrigger value="monthly">{t('report_periods.monthly')}</TabsTrigger>
          <TabsTrigger value="yearly">{t('report_periods.yearly')}</TabsTrigger>
        </TabsList>
        
        {/* عناصر اختيار التاريخ حسب نوع التقرير */}
        <div className="mb-6">
          {period === 'daily' && (
            <div className="relative max-w-sm">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: language === 'ar' ? arSA : enUS }) : <span>{t('pick_a_date')}</span>}
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
            </div>
          )}
          
          {period === 'weekly' && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="min-w-[200px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {getWeekRangeDisplay()}
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
              
              <Button variant="outline" size="icon" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {period === 'monthly' && (
            <div className="flex flex-wrap gap-2">
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
        
        {/* حالة الخطأ */}
        {isError && (
          <Card className="mb-6 border-destructive">
            <CardHeader className="pb-3">
              <CardTitle className="text-destructive">{t('error_loading_data')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error instanceof Error ? error.message : t('unknown_error')}</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('try_again')}
              </Button>
            </CardFooter>
          </Card>
        )}
        
        {/* محتوى التقارير لكل نوع */}
        {['daily', 'weekly', 'monthly', 'yearly'].map((periodType) => (
          <TabsContent key={periodType} value={periodType} className="m-0">
            {isLoading ? (
              // شاشة التحميل
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <Skeleton className="h-[400px] w-full" />
                  <Skeleton className="h-[300px] w-full" />
                  <Skeleton className="h-[200px] w-full" />
                </div>
              </div>
            ) : reportData && (reportData.chartData.length > 0 || reportData.detailedReports.length > 0) ? (
              // عرض بيانات التقارير
              <>
                <ReportDetails 
                  periodType={periodType as any}
                  chartData={reportData.chartData}
                  topProducts={reportData.topProducts}
                  detailedReports={reportData.detailedReports}
                  isLoading={isLoading}
                  onExport={handleExport}
                  onPrint={handlePrint}
                />
              </>
            ) : (
              // لا توجد بيانات
              <Card className="py-12 text-center border-dashed">
                <CardContent className="pt-12">
                  <FileBarChart className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('no_data_available')}</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                    {t('try_different_date_range')}
                  </p>
                  <Button variant="outline" onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('refresh')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}