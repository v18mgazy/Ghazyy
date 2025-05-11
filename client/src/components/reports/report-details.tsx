import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart, Calendar, FileSpreadsheet, Printer, Loader2, 
  MoreVertical, Download, Clock
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  id: string;
  name: string;
  soldQuantity: number;
  revenue: number;
  profit: number;
}

interface DailyReport {
  date: string;
  salesCount: number;
  revenue: number;
  cost: number;
  discounts: number;
  damages: number;
  profit: number;
}

interface ChartData {
  name: string;
  revenue: number;
  profit: number;
}

interface ReportDetailsProps {
  periodType: 'daily' | 'weekly' | 'monthly' | 'yearly';
  chartData: ChartData[];
  topProducts: TopProduct[];
  detailedReports: DailyReport[];
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
  
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sales Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center">
                <BarChart className="mr-2 h-5 w-5" />
                {t('sales_trend')}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={onExport}>
                  <Download className="h-4 w-4 mr-1" />
                  {t('export')}
                </Button>
              </div>
            </div>
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
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      formatter={(value) => [`$${Number(value).toFixed(2)}`, '']}
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
        
        {/* Top Products */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">{t('top_products')}</CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={onExport}>
                  <Download className="h-4 w-4 mr-1" />
                  {t('export')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('product')}</TableHead>
                      <TableHead>{t('sold')}</TableHead>
                      <TableHead>{t('revenue')}</TableHead>
                      <TableHead>{t('profit')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-neutral-500">
                          {t('no_products_sold')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      topProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.soldQuantity}</TableCell>
                          <TableCell>{formatCurrency(product.revenue)}</TableCell>
                          <TableCell className="text-success-DEFAULT">
                            {formatCurrency(product.profit)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Detailed Report */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">{t('detailed_report')}</CardTitle>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                className="flex items-center" 
                onClick={onPrint}
              >
                <Printer className="mr-1 h-4 w-4" />
                {t('print')}
              </Button>
              <Button 
                variant="outline" 
                className="flex items-center" 
                onClick={onExport}
              >
                <FileSpreadsheet className="mr-1 h-4 w-4" />
                {t('export_to_excel')}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold">{t('date')}</TableHead>
                    <TableHead className="font-semibold text-center">{t('sales_count')}</TableHead>
                    <TableHead className="font-semibold">{t('total_revenue')}</TableHead>
                    <TableHead className="font-semibold">{t('cost')}</TableHead>
                    <TableHead className="font-semibold">{t('discounts')}</TableHead>
                    <TableHead className="font-semibold">{t('damages')}</TableHead>
                    <TableHead className="font-semibold">{t('profit')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailedReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {t('no_report_data')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    detailedReports.map((report, index) => (
                      <TableRow 
                        key={index}
                        className={index % 2 === 0 ? 'bg-muted/20' : ''}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                            {formatDate(report.date, 'PP', language)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {report.salesCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(report.revenue)}</TableCell>
                        <TableCell className="text-muted-foreground">{formatCurrency(report.cost)}</TableCell>
                        <TableCell>
                          <span className="text-amber-600 font-medium">
                            {formatCurrency(report.discounts)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-red-600 font-medium">
                            {formatCurrency(report.damages)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="bg-green-50 text-green-700 px-2 py-1 rounded-md font-medium inline-block">
                            {formatCurrency(report.profit)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
