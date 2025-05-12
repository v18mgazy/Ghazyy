import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart, Calendar, FileSpreadsheet, Printer, Loader2, 
  MoreVertical, Download, Clock, ArrowUpDown, Search
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
    
    filteredReports.forEach(report => {
      if (report.type === 'sale') {
        groups.sales.push(report);
      } else if (report.type === 'damage') {
        groups.damages.push(report);
      } else if (report.type === 'expense') {
        groups.expenses.push(report);
      } else if (report.type === 'summary') {
        groups.summaries.push(report);
      }
    });
    
    return groups;
  };
  
  const summaryGroups = getSummaryGroups();
  
  return (
    <div className="space-y-8 print:space-y-12">
      {/* بطاقات الملخص في أعلى الصفحة للتقارير المفصلة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* بطاقة إجمالي المبيعات والأرباح */}
        <Card className="shadow-sm border-primary/40 bg-gradient-to-br from-white to-primary/5 dark:from-gray-900 dark:to-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-primary">{t('sales_summary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('total_sales')}</p>
                <p className="text-2xl font-bold">{formatCurrency(summaryGroups.sales.reduce((sum, sale) => sum + sale.amount, 0))}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('total_profit')}</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(summaryGroups.sales.reduce((sum, sale) => sum + (sale.profit || 0), 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* بطاقة التوالف والمصروفات */}
        <Card className="shadow-sm border-amber-400/40 bg-gradient-to-br from-white to-amber-50 dark:from-gray-900 dark:to-amber-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-amber-600 dark:text-amber-400">{t('expenses_and_damages')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('total_expenses')}</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(summaryGroups.expenses.reduce((sum, expense) => sum + expense.amount, 0))}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('total_damages')}</p>
                <p className="text-2xl font-bold text-red-500 dark:text-red-400">
                  {formatCurrency(summaryGroups.damages.reduce((sum, damage) => sum + damage.amount, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* بطاقة الملخص العام */}
        <Card className="shadow-sm border-blue-400/40 bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-blue-600 dark:text-blue-400">{t('performance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('total_orders')}</p>
                <p className="text-2xl font-bold">{summaryGroups.sales.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('profit_margin')}</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {(() => {
                    const totalSales = summaryGroups.sales.reduce((sum, sale) => sum + sale.amount, 0);
                    const totalProfit = summaryGroups.sales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
                    return totalSales > 0 ? `${((totalProfit / totalSales) * 100).toFixed(1)}%` : '0%';
                  })()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الرسم البياني للمبيعات */}
      <Card className="print:shadow-none shadow-sm">
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-lg flex items-center">
            <BarChart className="h-5 w-5 mr-2 text-primary" />
            {chartLayout.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="h-64 w-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-64 w-full flex items-center justify-center border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
              <p className="text-neutral-500 dark:text-neutral-400 text-center">
                <BarChart className="mx-auto mb-2 h-10 w-10 opacity-50" />
                {t('no_sales_data')}
              </p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => formatCurrency(value, "short")}
                  />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(Number(value)), '']}
                    labelFormatter={(label: string) => `${label}`}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#1976D2" 
                    strokeWidth={2}
                    name={t('revenue')}
                    activeDot={{ r: 8 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#4CAF50" 
                    strokeWidth={2}
                    name={t('profit')}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* المنتجات الأكثر مبيعًا */}
      <Card className="print:shadow-none shadow-sm">
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-lg flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-amber-500"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            {t('top_products')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : topProducts.length === 0 ? (
            <div className="py-12 text-center border border-dashed rounded-lg">
              <p className="text-neutral-500 dark:text-neutral-400">
                {t('no_product_data')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-amber-50 dark:bg-amber-950/20">
                  <TableRow>
                    <TableHead className="font-medium text-amber-700 dark:text-amber-400">{t('rank')}</TableHead>
                    <TableHead className="font-medium text-amber-700 dark:text-amber-400">{t('product_name')}</TableHead>
                    <TableHead className="font-medium text-right text-amber-700 dark:text-amber-400">{t('quantity_sold')}</TableHead>
                    <TableHead className="font-medium text-right text-amber-700 dark:text-amber-400">{t('revenue')}</TableHead>
                    <TableHead className="font-medium text-right text-amber-700 dark:text-amber-400">{t('profit')}</TableHead>
                    <TableHead className="font-medium text-right text-amber-700 dark:text-amber-400">{t('profit_margin')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((product, index) => (
                    <TableRow key={product.id} className={index % 2 === 0 ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}>
                      <TableCell className="font-bold text-amber-600 dark:text-amber-500">{index + 1}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right">{product.soldQuantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(product.revenue)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(product.profit)}</TableCell>
                      <TableCell className="text-right">
                        {product.revenue > 0 ? `${((product.profit / product.revenue) * 100).toFixed(1)}%` : '0%'}
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
      <Card className="print:shadow-none shadow-sm">
        <CardHeader className="pb-2 border-b">
          <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
            <CardTitle className="text-lg flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              {t('detailed_report')}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder={t('search_report')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-[200px]"
                startIcon={<Search className="h-4 w-4 text-muted-foreground" />}
              />
              <Button 
                variant="outline"
                size="sm" 
                className="flex items-center" 
                onClick={onPrint}
              >
                <Printer className="mr-1 h-4 w-4" />
                {t('print')}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center" 
                onClick={onExport}
              >
                <FileSpreadsheet className="mr-1 h-4 w-4" />
                {t('export')}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-12 text-center border border-dashed rounded-lg">
              <p className="text-neutral-500 dark:text-neutral-400">
                {t('no_report_data')}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* ملخص المجموعات */}
              {summaryGroups.summaries.length > 0 && (
                <div className="p-5 bg-muted/20 rounded-xl border border-muted/40">
                  <h3 className="font-semibold mb-3 text-lg flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>
                    {t('report_summary')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {summaryGroups.summaries.map(summary => (
                      <div 
                        key={summary.id}
                        className={`p-4 rounded-lg shadow-sm ${
                          summary.category === 'damaged' 
                            ? 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/30' 
                            : summary.category === 'expenses'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/30'
                              : 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30'
                        }`}
                      >
                        <div className="text-sm font-medium">{summary.details}</div>
                        <div className="font-bold mt-2 text-xl">{formatCurrency(summary.amount)}</div>
                      </div>
                    ))}
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
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader className="bg-primary/5">
                        <TableRow>
                          <TableHead className="font-medium">{t('date')}</TableHead>
                          <TableHead className="font-medium">{t('customer')}</TableHead>
                          <TableHead className="font-medium">{t('details')}</TableHead>
                          <TableHead className="font-medium text-right">{t('amount')}</TableHead>
                          <TableHead className="font-medium">{t('status')}</TableHead>
                          <TableHead className="font-medium text-right">{t('profit')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summaryGroups.sales.map((report, index) => (
                          <TableRow key={report.id} className={index % 2 === 0 ? 'bg-muted/5' : ''}>
                            <TableCell>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-blue-500 opacity-70" />
                                {formatDate(report.date, 'PP', language)}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {report.customerName || t('unknown_customer')}
                            </TableCell>
                            <TableCell className="max-w-xs truncate font-medium text-slate-600 dark:text-slate-300">
                              {report.details}
                            </TableCell>
                            <TableCell className="font-bold text-right text-slate-700 dark:text-slate-200">
                              {formatCurrency(report.amount)}
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
                              {formatCurrency(report.profit || 0)}
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
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader className="bg-red-50 dark:bg-red-950/20">
                        <TableRow>
                          <TableHead className="font-medium text-red-700 dark:text-red-400">{t('date')}</TableHead>
                          <TableHead className="font-medium text-red-700 dark:text-red-400">{t('product')}</TableHead>
                          <TableHead className="font-medium text-red-700 dark:text-red-400">{t('quantity')}</TableHead>
                          <TableHead className="font-medium text-red-700 dark:text-red-400">{t('details')}</TableHead>
                          <TableHead className="font-medium text-right text-red-700 dark:text-red-400">{t('value_loss')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summaryGroups.damages.map((report, index) => (
                          <TableRow key={report.id} className={index % 2 === 0 ? 'bg-red-50/30 dark:bg-red-950/10' : ''}>
                            <TableCell>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-red-500 opacity-70" />
                                {formatDate(report.date, 'PP', language)}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {report.productName || t('unknown_product')}
                            </TableCell>
                            <TableCell>
                              {report.quantity || 1}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {report.details || t('no_description')}
                            </TableCell>
                            <TableCell className="font-medium text-right text-red-600 dark:text-red-400">
                              {formatCurrency(report.amount)}
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
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader className="bg-amber-50 dark:bg-amber-950/20">
                        <TableRow>
                          <TableHead className="font-medium text-amber-700 dark:text-amber-400">{t('date')}</TableHead>
                          <TableHead className="font-medium text-amber-700 dark:text-amber-400">{t('expense_type')}</TableHead>
                          <TableHead className="font-medium text-amber-700 dark:text-amber-400">{t('details')}</TableHead>
                          <TableHead className="font-medium text-right text-amber-700 dark:text-amber-400">{t('amount')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summaryGroups.expenses.map((report, index) => (
                          <TableRow key={report.id} className={index % 2 === 0 ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}>
                            <TableCell>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-amber-500 opacity-70" />
                                {formatDate(report.date, 'PP', language)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/10 dark:border-amber-800/30 dark:text-amber-400">
                                {t(report.expenseType || 'miscellaneous')}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate font-medium">
                              {report.details || t('no_description')}
                            </TableCell>
                            <TableCell className="font-bold text-right text-amber-600 dark:text-amber-400">
                              {formatCurrency(report.amount)}
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