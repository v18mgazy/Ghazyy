import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart, Calendar, FileSpreadsheet, Printer, Loader2, 
  MoreVertical, Download, Clock, ArrowUpDown, Search,
  DollarSign, TrendingUp, Receipt, CreditCard, AlertTriangle,
  LineChart as LucideLineChart
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLocale } from '@/hooks/use-locale';
import {
  LineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface TopProduct {
  id: number;
  name: string;
  soldQuantity: number;
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

interface ChartDataPoint {
  name: string;
  revenue: number;
  profit: number;
}

interface ReportDetailsProps {
  periodType: 'daily' | 'weekly' | 'monthly' | 'yearly';
  chartData: ChartDataPoint[];
  topProducts: TopProduct[];
  detailedReports: DetailedReport[];
  isLoading?: boolean;
  onExport: () => void;
  onPrint: () => void;
}

export default function ReportDetails({
  periodType,
  chartData,
  topProducts,
  detailedReports,
  isLoading = false,
  onExport,
  onPrint
}: ReportDetailsProps) {
  const { t } = useTranslation();
  const { language } = useLocale();
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // تصفية البيانات حسب كلمة البحث
  const filteredReports = searchTerm
    ? detailedReports.filter(report => 
        report.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.date.includes(searchTerm)
      )
    : detailedReports;
  
  // تحديد عرض الرسم البياني بناءً على نوع الفترة
  const getChartLayout = () => {
    switch (periodType) {
      case 'daily':
        return { 
          xAxisLabel: t('hour'),
          title: t('hourly_sales'),
          yAxisLabel: t('amount')
        };
      case 'weekly':
        return { 
          xAxisLabel: t('day'),
          title: t('daily_sales'),
          yAxisLabel: t('amount')
        };
      case 'monthly':
        return { 
          xAxisLabel: t('day'),
          title: t('daily_sales'),
          yAxisLabel: t('amount')
        };
      case 'yearly':
        return { 
          xAxisLabel: t('month'),
          title: t('monthly_sales'),
          yAxisLabel: t('amount')
        };
      default:
        return { 
          xAxisLabel: t('time'),
          title: t('sales_over_time'),
          yAxisLabel: t('amount')
        };
    }
  };
  
  const chartLayout = getChartLayout();
  
  // تصنيف أنواع التقارير إلى مجموعات لعرضها بشكل أفضل
  const getSummaryGroups = () => {
    const groups: {[key: string]: DetailedReport[]} = {
      sales: [],
      damages: [],
      expenses: [],
      summaries: []
    };
    
    // التحقق من وجود بيانات filteredReports وأنها مصفوفة صالحة
    if (!Array.isArray(filteredReports) || filteredReports.length === 0) {
      console.log('📊 لا توجد بيانات تقارير مفصلة للتصنيف');
      return groups;
    }
    
    // تسجيل معلومات التصحيح
    console.log(`📊 تصنيف ${filteredReports.length} تقارير مفصلة`);
    
    filteredReports.forEach(report => {
      if (!report) return; // تخطي أي تقارير فارغة أو غير متوقعة
      
      if (report.type === 'sale') {
        groups.sales.push(report);
      } else if (report.type === 'damage') {
        groups.damages.push(report);
      } else if (report.type === 'expense') {
        groups.expenses.push(report);
      } else if (report.type === 'summary') {
        groups.summaries.push(report);
      } else {
        console.warn(`📊 نوع تقرير غير معروف: ${report.type || 'غير محدد'}`);
      }
    });
    
    // سجل معلومات عن كل مجموعة
    console.log(`📊 نتائج التصنيف: مبيعات=${groups.sales.length}, أضرار=${groups.damages.length}, مصاريف=${groups.expenses.length}`);
    
    return groups;
  };
  
  const summaryGroups = getSummaryGroups();
  
  return (
    <div className="space-y-8 print:space-y-12">
      {/* ملاحظة توضيحية حول حساب الأرباح */}
      <div className="mb-4 p-3 border border-amber-200 rounded-md bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 print:hidden">
        <p className="text-amber-700 dark:text-amber-400 text-sm flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          {t('profit_calculation_note', 'ملاحظة: في حالة عدم توفر بيانات كاملة للأرباح، يتم عرض تقدير للأرباح على أساس نسبة 30% من إجمالي المبيعات. هذا فقط للمنتجات التي تم إنشاؤها قبل إضافة ميزة حساب الأرباح.')}
        </p>
      </div>
      
      {/* بطاقات الملخص في أعلى الصفحة للتقارير المفصلة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* بطاقة إجمالي المبيعات والأرباح */}
        <Card className="shadow-md border-primary/40 overflow-hidden bg-gradient-to-br from-white to-primary/5 dark:from-gray-900 dark:to-primary/10">
          <div className="absolute inset-0 bg-primary/5 border-b-4 border-primary/30 opacity-50 pointer-events-none"></div>
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-lg text-primary flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary/80" />
              {t('sales_summary')}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-primary/70" />
                  {t('total_sales')}
                </p>
                <p className="text-2xl font-extrabold bg-gradient-to-r from-primary/90 to-primary/70 bg-clip-text text-transparent">
                  {formatCurrency(summaryGroups.sales.reduce((sum, sale) => sum + sale.amount, 0))}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <LineChart className="h-4 w-4 text-emerald-500/70" />
                  {t('total_profit')}
                </p>
                <p className="text-2xl font-extrabold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                  {(() => {
                    // حساب إجمالي الأرباح بشكل محسن
                    const totalProfit = summaryGroups.sales.reduce((sum, sale) => {
                      if (sale.profit === undefined || sale.profit === null || sale.profit === 0) {
                        // إذا كان الربح غير موجود، نحسبه تقديريًا كنسبة 30% من قيمة البيع
                        const estimatedProfit = sale.amount * 0.3;
                        console.log(`Using estimated profit (30%) for sale ${sale.id}: ${estimatedProfit}`);
                        return sum + estimatedProfit;
                      }
                      console.log(`Using actual profit for sale ${sale.id}: ${sale.profit}`);
                      return sum + sale.profit;
                    }, 0);
                    console.log(`Final calculated profit: ${totalProfit}`);
                    return formatCurrency(totalProfit);
                  })()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* بطاقة التوالف والمصروفات */}
        <Card className="shadow-md border-amber-400/40 overflow-hidden bg-gradient-to-br from-white to-amber-50/50 dark:from-gray-900 dark:to-amber-900/10">
          <div className="absolute inset-0 bg-amber-500/5 border-b-4 border-amber-400/30 opacity-50 pointer-events-none"></div>
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-lg text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-amber-500/80" />
              {t('expenses_and_damages')}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <CreditCard className="h-4 w-4 text-amber-500/70" />
                  {t('total_expenses')}
                </p>
                <p className="text-2xl font-extrabold bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">
                  {formatCurrency(summaryGroups.expenses.reduce((sum, expense) => sum + expense.amount, 0))}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-red-500/70" />
                  {t('total_damages')}
                </p>
                <p className="text-2xl font-extrabold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                  {formatCurrency(summaryGroups.damages.reduce((sum, damage) => sum + damage.amount, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* بطاقة الملخص العام */}
        <Card className="shadow-md border-blue-400/40 overflow-hidden bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-900/10">
          <div className="absolute inset-0 bg-blue-500/5 border-b-4 border-blue-400/30 opacity-50 pointer-events-none"></div>
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-lg text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <BarChart className="h-5 w-5 text-blue-500/80" />
              {t('performance')}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <ArrowUpDown className="h-4 w-4 text-blue-500/70" />
                  {t('total_orders')}
                </p>
                <p className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  {summaryGroups.sales.length}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <LucideLineChart className="h-4 w-4 text-blue-500/70" />
                  {t('profit_margin')}
                </p>
                <p className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  {(() => {
                    const totalSales = summaryGroups.sales.reduce((sum, sale) => sum + sale.amount, 0);
                    // حساب إجمالي الربح بنفس الطريقة المستخدمة في إجمالي الربح
                    const totalProfit = summaryGroups.sales.reduce((sum, sale) => {
                      if (sale.profit === undefined || sale.profit === null || sale.profit === 0) {
                        // إذا كان الربح غير موجود، نحسبه تقديريًا كنسبة 30% من قيمة البيع
                        const estimatedProfit = sale.amount * 0.3;
                        return sum + estimatedProfit;
                      }
                      return sum + sale.profit;
                    }, 0);
                    
                    // تجنب القسمة على صفر وتنسيق النسبة المئوية
                    const profitMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100) : 0;
                    return `${profitMargin.toFixed(1)}%`;
                  })()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الرسم البياني للمبيعات */}
      <Card className="print:shadow-none shadow-md overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 opacity-30 pointer-events-none"></div>
        <CardHeader className="pb-2 border-b relative">
          <CardTitle className="text-lg flex items-center">
            <BarChart className="h-5 w-5 mr-2 text-primary" />
            {chartLayout.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 relative">
          {isLoading ? (
            <div className="h-72 w-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !Array.isArray(chartData) || chartData.length === 0 ? (
            <div className="h-72 w-full flex items-center justify-center border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg bg-neutral-50/50 dark:bg-neutral-900/20">
              <div className="text-neutral-500 dark:text-neutral-400 text-center px-4">
                <BarChart className="mx-auto mb-2 h-10 w-10 opacity-50" />
                <p className="mb-2">{t('no_sales_data')}</p>
                <p className="text-xs opacity-70">{t('try_different_date_range')}</p>
              </div>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1976D2" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#1976D2" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#4CAF50" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12, fill: '#718096' }}
                    tickLine={{ stroke: '#cfd8dc' }}
                    axisLine={{ stroke: '#cfd8dc' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#718096' }}
                    tickLine={{ stroke: '#cfd8dc' }}
                    axisLine={{ stroke: '#cfd8dc' }}
                    tickFormatter={(value) => formatCurrency(value, "short")}
                  />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(Number(value)), '']}
                    labelFormatter={(label: string) => `${label}`}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                      padding: '10px'
                    }}
                    itemStyle={{ padding: '4px 0' }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px', fontWeight: 500 }}
                    iconSize={10}
                    iconType="circle"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#1976D2" 
                    strokeWidth={3}
                    name={t('revenue')}
                    activeDot={{ r: 8, fill: '#1976D2', stroke: 'white', strokeWidth: 2 }}
                    dot={{ r: 3, fill: '#1976D2', stroke: 'white', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#4CAF50" 
                    strokeWidth={3}
                    name={t('profit')}
                    activeDot={{ r: 6, fill: '#4CAF50', stroke: 'white', strokeWidth: 2 }}
                    dot={{ r: 3, fill: '#4CAF50', stroke: 'white', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* المنتجات الأكثر مبيعًا */}
      <Card className="print:shadow-none shadow-md overflow-hidden">
        <div className="absolute inset-0 bg-amber-500/5 opacity-30 pointer-events-none"></div>
        <CardHeader className="pb-2 border-b relative">
          <CardTitle className="text-lg flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-amber-500"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            {t('top_products')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 relative">
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !Array.isArray(topProducts) || topProducts.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg bg-neutral-50/50 dark:bg-neutral-900/20">
              <div className="text-neutral-500 dark:text-neutral-400 text-center px-4">
                <TrendingUp className="mx-auto mb-2 h-10 w-10 opacity-50" />
                <p className="mb-2 font-semibold">{t('no_product_data', 'لا توجد بيانات منتجات')}</p>
                <p className="text-xs opacity-70">{t('try_different_date_range', 'حاول اختيار فترة زمنية أخرى تحتوي على مبيعات')}</p>
                <p className="text-xs mt-3 text-amber-600 dark:text-amber-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  {t('data_will_appear_after_sales', 'ستظهر هنا البيانات تلقائياً عند إجراء مبيعات')}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/10">
                  <TableRow>
                    <TableHead className="font-semibold text-amber-700 dark:text-amber-400 py-3">{t('rank')}</TableHead>
                    <TableHead className="font-semibold text-amber-700 dark:text-amber-400 py-3">{t('product_name')}</TableHead>
                    <TableHead className="font-semibold text-right text-amber-700 dark:text-amber-400 py-3">{t('quantity_sold')}</TableHead>
                    <TableHead className="font-semibold text-right text-amber-700 dark:text-amber-400 py-3">{t('revenue')}</TableHead>
                    <TableHead className="font-semibold text-right text-amber-700 dark:text-amber-400 py-3">{t('profit')}</TableHead>
                    <TableHead className="font-semibold text-right text-amber-700 dark:text-amber-400 py-3">{t('profit_margin')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((product, index) => (
                    <TableRow 
                      key={product.id} 
                      className={`${index === 0 ? 'bg-amber-50/80 dark:bg-amber-900/20' : index % 2 === 0 ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''} hover:bg-amber-100/50 dark:hover:bg-amber-800/20 transition-colors`}
                    >
                      <TableCell className="font-bold">
                        {index < 3 ? (
                          <div className={`flex items-center justify-center w-7 h-7 rounded-full 
                            ${index === 0 ? 'bg-amber-400 text-white' : 
                              index === 1 ? 'bg-amber-300 text-amber-900' : 
                              'bg-amber-200 text-amber-900'}`}>
                            {index + 1}
                          </div>
                        ) : (
                          <div className="text-amber-600 dark:text-amber-500 text-center">{index + 1}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
                          {product.soldQuantity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(product.revenue)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {(() => {
                          // معالجة قيم الربح المفقودة أو الصفرية
                          if (product.profit === undefined || product.profit === null || product.profit === 0) {
                            // استخدام تقدير بنسبة 30% من الإيراد
                            const estimatedProfit = product.revenue * 0.3;
                            return formatCurrency(estimatedProfit);
                          }
                          return formatCurrency(product.profit);
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800">
                          {(() => {
                            if (product.revenue <= 0) return '0%';
                            
                            // استخدام نفس منطق تقدير الربح للحفاظ على الاتساق
                            let profit = product.profit;
                            if (profit === undefined || profit === null || profit === 0) {
                              profit = product.revenue * 0.3;
                            }
                            
                            return `${((profit / product.revenue) * 100).toFixed(1)}%`;
                          })()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* تقرير تفصيلي */}
      <Card className="print:shadow-none shadow-md overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 opacity-30 pointer-events-none"></div>
        <CardHeader className="pb-2 border-b relative">
          <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
            <CardTitle className="text-lg flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              {t('detailed_report')}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative max-w-[200px]">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70" />
                <Input
                  placeholder={t('search_report')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 max-w-[200px] border-primary/30 focus:border-primary/60 focus-visible:ring-primary/20"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  size="sm" 
                  className="flex items-center bg-white dark:bg-gray-800 border-primary/30 hover:bg-primary/5 text-primary hover:text-primary-dark transition-colors" 
                  onClick={onPrint}
                >
                  <Printer className="mr-1.5 h-4 w-4" />
                  {t('print')}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center bg-white dark:bg-gray-800 border-emerald-400/50 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-colors" 
                  onClick={onExport}
                >
                  <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                  {t('export')}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6 relative">
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !Array.isArray(filteredReports) || filteredReports.length === 0 ? (
            <div className="h-40 flex items-center justify-center border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg bg-neutral-50/50 dark:bg-neutral-900/20">
              <div className="text-neutral-500 dark:text-neutral-400 text-center px-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-50"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <p className="mb-2 font-medium">{t('no_report_data')}</p>
                <p className="text-xs opacity-70">{t('try_different_date_range')}</p>
                <p className="text-xs opacity-70 mt-2">
                  {searchTerm ? t('try_different_search') : t('check_data_available')}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* ملخص المجموعات */}
              {summaryGroups.summaries.length > 0 && (
                <div className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 shadow-sm">
                  <h3 className="font-semibold mb-4 text-lg flex items-center text-primary-dark dark:text-primary-light">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>
                    {t('report_summary')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {summaryGroups.summaries.map(summary => (
                      <div 
                        key={summary.id}
                        className={`p-4 rounded-lg shadow-md transition-all hover:shadow-lg ${
                          summary.category === 'damaged' 
                            ? 'bg-gradient-to-br from-red-50 to-red-100/50 text-red-800 border border-red-200 dark:from-red-900/30 dark:to-red-900/10 dark:text-red-300 dark:border-red-800/30' 
                            : summary.category === 'expenses'
                              ? 'bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-800 border border-amber-200 dark:from-amber-900/30 dark:to-amber-900/10 dark:text-amber-300 dark:border-amber-800/30'
                              : 'bg-gradient-to-br from-blue-50 to-blue-100/50 text-blue-800 border border-blue-200 dark:from-blue-900/30 dark:to-blue-900/10 dark:text-blue-300 dark:border-blue-800/30'
                        }`}
                      >
                        <div className="text-sm font-medium">{summary.details}</div>
                        <div className="font-bold mt-2 text-xl">{formatCurrency(summary.amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* رسالة عندما لا تكون هناك تقارير مفصلة */}
              {summaryGroups.sales.length === 0 && summaryGroups.damages.length === 0 && summaryGroups.expenses.length === 0 && (
                <div className="py-12 mb-6 mt-2 text-center border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg bg-neutral-50/50 dark:bg-neutral-900/20">
                  <div className="text-neutral-500 dark:text-neutral-400 text-center px-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 opacity-50">
                      <rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect>
                      <line x1="9" y1="3" x2="9" y2="21"></line>
                      <path d="M13 8l4 8"></path>
                      <line x1="18" y1="12" x2="13" y2="12"></line>
                    </svg>
                    <p className="mb-2 font-semibold">{t('no_detailed_reports', 'لا توجد تقارير مفصلة')}</p>
                    <p className="text-xs opacity-70">{t('try_different_date_range', 'حاول اختيار فترة زمنية أخرى تحتوي على بيانات')}</p>
                    <p className="text-xs mt-3 text-amber-600 dark:text-amber-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                      {t('data_will_appear_after_operations', 'ستظهر هنا البيانات تلقائياً عند إجراء عمليات')}
                    </p>
                  </div>
                </div>
              )}
              
              {/* جدول المبيعات */}
              {summaryGroups.sales.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-4 flex items-center text-primary">
                    <Badge variant="outline" className="mr-2 bg-primary/10 border-primary/30 text-primary font-bold">{summaryGroups.sales.length}</Badge>
                    {t('sales')}
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-primary/20 shadow-sm">
                    <Table>
                      <TableHeader className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10">
                        <TableRow>
                          <TableHead className="font-medium text-primary-dark dark:text-primary-light py-3">{t('date')}</TableHead>
                          <TableHead className="font-medium text-primary-dark dark:text-primary-light py-3">{t('customer')}</TableHead>
                          <TableHead className="font-medium text-primary-dark dark:text-primary-light py-3">{t('details')}</TableHead>
                          <TableHead className="font-medium text-right text-primary-dark dark:text-primary-light py-3">{t('amount')}</TableHead>
                          <TableHead className="font-medium text-right text-primary-dark dark:text-primary-light py-3">{t('discount')}</TableHead>
                          <TableHead className="font-medium text-primary-dark dark:text-primary-light py-3">{t('status')}</TableHead>
                          <TableHead className="font-medium text-right text-primary-dark dark:text-primary-light py-3">{t('profit')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summaryGroups.sales.map((report, index) => (
                          <TableRow 
                            key={report.id} 
                            className={`${index % 2 === 0 ? 'bg-primary/5 dark:bg-primary/10' : 'bg-white dark:bg-gray-950'} hover:bg-primary/10 dark:hover:bg-primary/15 transition-colors`}
                          >
                            <TableCell>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-primary/70" />
                                {formatDate(report.date, 'PP', language)}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70 mr-1.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                {report.customerName || t('unknown_customer')}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate font-medium text-slate-600 dark:text-slate-300">
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 mr-1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
                                {report.details}
                              </div>
                            </TableCell>
                            <TableCell className="font-bold text-right text-slate-700 dark:text-slate-200">
                              <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/5 py-1 px-2 rounded-md inline-block">
                                {report.subtotal && report.subtotal !== report.amount ? (
                                  <div className="flex flex-col">
                                    <span className="line-through text-muted-foreground text-xs">
                                      {formatCurrency(report.subtotal)}
                                    </span>
                                    <span>{formatCurrency(report.amount)}</span>
                                  </div>
                                ) : (
                                  formatCurrency(report.amount)
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {report.discount && report.discount > 0 ? (
                                <span className="text-primary bg-primary/10 px-2 py-1 rounded-md inline-flex justify-center items-center">
                                  <span className="text-primary font-medium mr-1">
                                    {formatCurrency(report.discount)}
                                  </span>
                                  {report.discountPercentage && (
                                    <span className="text-xs text-muted-foreground">
                                      ({report.discountPercentage}%)
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={`px-2 py-1 font-semibold ${
                                  report.paymentStatus === 'paid' 
                                    ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-950/20 dark:border-green-900/30 dark:text-green-400' 
                                    : report.paymentStatus === 'pending'
                                      ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400'
                                      : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-900/20 dark:border-gray-800/30 dark:text-gray-400'
                                }`}
                              >
                                {t(report.paymentStatus || 'unknown')}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-right text-emerald-600 dark:text-emerald-400">
                              <div className="flex items-center justify-end">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 mr-1.5"><polyline points="18 15 12 9 6 15"></polyline></svg>
                                {(() => {
                                  // إذا كان الربح غير موجود أو 0، نحسبه تقديريًا كنسبة 30% من المبيعات
                                  const rawProfit = report.profit;
                                  if (rawProfit === undefined || rawProfit === null || rawProfit === 0) {
                                    const estimatedProfit = report.amount * 0.3;
                                    return formatCurrency(estimatedProfit);
                                  }
                                  return formatCurrency(rawProfit);
                                })()}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              
              {/* جدول العناصر التالفة */}
              {summaryGroups.damages.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-4 flex items-center text-red-600 dark:text-red-400">
                    <Badge variant="destructive" className="mr-2 border-0">{summaryGroups.damages.length}</Badge>
                    {t('damaged_items')}
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-red-200 dark:border-red-800/30 shadow-sm">
                    <Table>
                      <TableHeader className="bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-900/30 dark:to-red-900/10">
                        <TableRow>
                          <TableHead className="font-medium text-red-700 dark:text-red-400 py-3">{t('date')}</TableHead>
                          <TableHead className="font-medium text-red-700 dark:text-red-400 py-3">{t('product')}</TableHead>
                          <TableHead className="font-medium text-red-700 dark:text-red-400 py-3">{t('quantity')}</TableHead>
                          <TableHead className="font-medium text-red-700 dark:text-red-400 py-3">{t('details')}</TableHead>
                          <TableHead className="font-medium text-right text-red-700 dark:text-red-400 py-3">{t('value_loss')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summaryGroups.damages.map((report, index) => (
                          <TableRow 
                            key={report.id} 
                            className={`${index % 2 === 0 ? 'bg-red-50/30 dark:bg-red-950/10' : 'bg-white dark:bg-gray-950'} hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors`}
                          >
                            <TableCell>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-red-500" />
                                {formatDate(report.date, 'PP', language)}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500/70 mr-1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                                {report.productName || t('unknown_product')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500/70 mr-1.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                                {report.quantity || 1}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500/70 mr-1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                {report.details || t('no_description')}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-right text-red-600 dark:text-red-400">
                              <div className="bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-900/30 dark:to-red-900/10 py-1 px-2 rounded-md inline-block">
                                {formatCurrency(report.amount)}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              
              {/* جدول المصاريف */}
              {summaryGroups.expenses.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-4 flex items-center text-amber-600 dark:text-amber-400">
                    <Badge variant="outline" className="mr-2 bg-amber-100 border-amber-300 text-amber-700 font-bold dark:bg-amber-900/20 dark:border-amber-800/40 dark:text-amber-400">{summaryGroups.expenses.length}</Badge>
                    {t('expenses')}
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-amber-200 dark:border-amber-800/30 shadow-sm">
                    <Table>
                      <TableHeader className="bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/30 dark:to-amber-900/10">
                        <TableRow>
                          <TableHead className="font-medium text-amber-700 dark:text-amber-400 py-3">{t('date')}</TableHead>
                          <TableHead className="font-medium text-amber-700 dark:text-amber-400 py-3">{t('expense_type')}</TableHead>
                          <TableHead className="font-medium text-amber-700 dark:text-amber-400 py-3">{t('details')}</TableHead>
                          <TableHead className="font-medium text-right text-amber-700 dark:text-amber-400 py-3">{t('amount')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summaryGroups.expenses.map((report, index) => (
                          <TableRow 
                            key={report.id} 
                            className={`${index % 2 === 0 ? 'bg-amber-50/30 dark:bg-amber-950/10' : 'bg-white dark:bg-gray-950'} hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors`}
                          >
                            <TableCell>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-amber-500" />
                                {formatDate(report.date, 'PP', language)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500/70 mr-1.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                                <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/10 dark:border-amber-800/30 dark:text-amber-400">
                                  {t(report.expenseType || 'miscellaneous')}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate font-medium">
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500/70 mr-1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
                                {report.details || t('no_description')}
                              </div>
                            </TableCell>
                            <TableCell className="font-bold text-right text-amber-600 dark:text-amber-400">
                              <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/30 dark:to-amber-900/10 py-1 px-2 rounded-md inline-block">
                                {formatCurrency(report.amount)}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}