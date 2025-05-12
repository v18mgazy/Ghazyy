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
    <div className="space-y-6 print:space-y-12">
      {/* الرسم البياني للمبيعات */}
      <Card className="print:shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{chartLayout.title}</CardTitle>
        </CardHeader>
        <CardContent>
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
                    tickFormatter={(value) => formatCurrency(value, true)}
                  />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(Number(value)), '']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#1976D2" 
                    name={t('revenue')}
                    activeDot={{ r: 8 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#4CAF50" 
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
      <Card className="print:shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t('top_products')}</CardTitle>
        </CardHeader>
        <CardContent>
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
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-medium">{t('rank')}</TableHead>
                    <TableHead className="font-medium">{t('product_name')}</TableHead>
                    <TableHead className="font-medium text-right">{t('quantity_sold')}</TableHead>
                    <TableHead className="font-medium text-right">{t('revenue')}</TableHead>
                    <TableHead className="font-medium text-right">{t('profit')}</TableHead>
                    <TableHead className="font-medium text-right">{t('profit_margin')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((product, index) => (
                    <TableRow key={product.id} className={index % 2 === 0 ? 'bg-muted/20' : ''}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell className="text-right">{product.soldQuantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(product.revenue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(product.profit)}</TableCell>
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
      <Card className="print:shadow-none">
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
            <CardTitle className="text-lg">{t('detailed_report')}</CardTitle>
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
        
        <CardContent>
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
            <div className="space-y-6">
              {/* ملخص المجموعات */}
              {summaryGroups.summaries.length > 0 && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-semibold mb-2">{t('report_summary')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {summaryGroups.summaries.map(summary => (
                      <div 
                        key={summary.id}
                        className={`p-3 rounded-md ${
                          summary.category === 'damaged' 
                            ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300' 
                            : summary.category === 'expenses'
                              ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
                              : 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                        }`}
                      >
                        <div className="text-sm">{summary.details}</div>
                        <div className="font-bold mt-1">{formatCurrency(summary.amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* جدول المبيعات */}
              {summaryGroups.sales.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Badge variant="secondary" className="mr-2">{summaryGroups.sales.length}</Badge>
                    {t('sales')}
                  </h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
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
                          <TableRow key={report.id} className={index % 2 === 0 ? 'bg-muted/20' : ''}>
                            <TableCell>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                {formatDate(report.date, 'PP', language)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {report.customerName || t('unknown_customer')}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {report.details}
                            </TableCell>
                            <TableCell className="font-medium text-right">
                              {formatCurrency(report.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                report.paymentStatus === 'paid' 
                                  ? 'success' 
                                  : report.paymentStatus === 'pending'
                                    ? 'warning'
                                    : 'secondary'
                              }>
                                {t(report.paymentStatus || 'unknown')}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-right">
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
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Badge variant="destructive" className="mr-2">{summaryGroups.damages.length}</Badge>
                    {t('damaged_items')}
                  </h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-medium">{t('date')}</TableHead>
                          <TableHead className="font-medium">{t('product')}</TableHead>
                          <TableHead className="font-medium">{t('quantity')}</TableHead>
                          <TableHead className="font-medium">{t('details')}</TableHead>
                          <TableHead className="font-medium text-right">{t('value_loss')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summaryGroups.damages.map((report, index) => (
                          <TableRow key={report.id} className={index % 2 === 0 ? 'bg-muted/20' : ''}>
                            <TableCell>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                {formatDate(report.date, 'PP', language)}
                              </div>
                            </TableCell>
                            <TableCell>{report.productName || t('unknown_product')}</TableCell>
                            <TableCell>{report.quantity || 1}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {report.details}
                            </TableCell>
                            <TableCell className="font-medium text-right text-destructive">
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
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Badge variant="warning" className="mr-2">{summaryGroups.expenses.length}</Badge>
                    {t('expenses')}
                  </h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-medium">{t('date')}</TableHead>
                          <TableHead className="font-medium">{t('expense_type')}</TableHead>
                          <TableHead className="font-medium">{t('details')}</TableHead>
                          <TableHead className="font-medium text-right">{t('amount')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summaryGroups.expenses.map((report, index) => (
                          <TableRow key={report.id} className={index % 2 === 0 ? 'bg-muted/20' : ''}>
                            <TableCell>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                {formatDate(report.date, 'PP', language)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {t(report.expenseType || 'miscellaneous')}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {report.details}
                            </TableCell>
                            <TableCell className="font-medium text-right">
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