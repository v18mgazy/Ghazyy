// وظائف مساعدة لحساب الأرباح في التقارير
// @ts-nocheck

/**
 * حساب الربح من بيانات المنتجات في الفاتورة
 * @param invoice - الفاتورة التي نحسب ربحها
 * @param reportType - نوع التقرير (daily, weekly, monthly, yearly)
 * @returns إجمالي الربح المحسوب
 */
export async function calculateProfitFromProductsData(invoice: any, reportType = 'unknown'): Promise<number> {
  let calculatedProfit = 0;
  
  try {
    if (invoice.productsData) {
      const products = JSON.parse(invoice.productsData);
      if (Array.isArray(products)) {
        console.log(`Calculating profit for ${reportType} report, invoice ID: ${invoice.id}, with ${products.length} products`);
        
        for (const product of products) {
          // استخدام الربح المحسوب مسبقًا أو حسابه من سعر الشراء والبيع
          if (product.profit !== undefined && product.profit !== null) {
            const productProfit = Number(product.profit);
            calculatedProfit += productProfit;
            console.log(`Using pre-calculated profit for product '${product.productName || product.name || 'Unknown'}': ${productProfit}`);
          } else if (product.purchasePrice !== undefined && (product.sellingPrice || product.price)) {
            const sellingPrice = product.sellingPrice || product.price || 0;
            const purchasePrice = Number(product.purchasePrice) || 0;
            const quantity = Number(product.quantity) || 1;
            const discount = Number(product.discount) || 0;
            
            // حساب الربح مع الأخذ في الاعتبار نسبة الخصم
            // الخصم يؤثر على المبيعات والأرباح معاً
            
            // أولاً - خصم المنتج نفسه
            const productDiscountedPrice = sellingPrice * (1 - (discount / 100));
            
            // ثانياً - نطبق خصم الفاتورة إذا وجد
            // إذا كان لدينا خصم للفاتورة كاملة نحسب تأثيره على هذا المنتج
            let invoiceDiscountRate = 0;
            if (product.invoiceDiscountShare !== undefined) {
                // إذا كان لدينا قيمة من حصة المنتج من خصم الفاتورة
                invoiceDiscountRate = product.invoiceDiscountShare / (productDiscountedPrice * quantity);
            } else if (invoice.discountPercentage && invoice.discountPercentage > 0) {
                // استخدام نسبة الخصم من الفاتورة إذا كانت متوفرة
                invoiceDiscountRate = invoice.discountPercentage / 100;
            } else if (invoice.invoiceDiscount && invoice.subtotal && invoice.subtotal > 0) {
                // حساب نسبة الخصم من قيمة الخصم والإجمالي قبل الخصم
                invoiceDiscountRate = invoice.invoiceDiscount / invoice.subtotal;
            }
            
            // التأكد من أن نسبة الخصم منطقية
            invoiceDiscountRate = Math.min(invoiceDiscountRate, 0.99); // الحد الأقصى 99%
            
            // حساب السعر النهائي بعد جميع الخصومات
            const finalSellingPrice = productDiscountedPrice * (1 - invoiceDiscountRate);
            
            // حساب الربح النهائي بعد تأثير جميع الخصومات
            const productProfit = (finalSellingPrice - purchasePrice) * quantity;
            
            // تأكيد أن الخصم أثر على الربح بشكل واضح
            console.log(`[${reportType}] خصم المنتج ${discount}% وخصم الفاتورة ${(invoiceDiscountRate*100).toFixed(1)}% أدى إلى تقليل الربح من ${((sellingPrice - purchasePrice) * quantity).toFixed(2)} إلى ${productProfit.toFixed(2)}`);
            
            console.log(`[${reportType}] [تفاصيل تأثير الخصم] سعر المنتج: ${sellingPrice}، بعد خصم المنتج (${discount}%): ${productDiscountedPrice}، بعد خصم الفاتورة (${(invoiceDiscountRate*100).toFixed(1)}%): ${finalSellingPrice}، الربح النهائي: ${productProfit}`);
            calculatedProfit += productProfit;
            
            console.log(`[${reportType}] بيانات المنتج الأصلية:`, JSON.stringify(product));
            console.log(`[${reportType}] معالجة منتج "${product.productName || product.name || 'Unknown'}": سعر البيع=${sellingPrice}, سعر الشراء=${purchasePrice}, كمية=${quantity}${discount > 0 ? `, خصم=${discount}%` : ''}`);
            console.log(`[${reportType}] حساب ربح المنتج بعد كل الخصومات: (${finalSellingPrice} - ${purchasePrice}) × ${quantity} = ${productProfit}`);
          } else {
            // إذا لم تتوفر بيانات سعر الشراء، نسجل ملاحظة ونستخدم صفر للربح
            const sellingPrice = product.sellingPrice || product.price || 0;
            const quantity = Number(product.quantity) || 1;
            console.warn(`No purchase price found for product '${product.productName || product.name || 'Unknown'}' - using zero profit`);
            console.log(`Product '${product.productName || product.name || 'Unknown'}' has selling price: ${sellingPrice}, quantity: ${quantity}, but no purchase price`);
          }
        }
      } else {
        console.warn(`Products data is not an array for invoice ID: ${invoice.id}`);
      }
    } else {
      // في حالة عدم وجود بيانات للمنتجات، نستخدم صفر للربح
      calculatedProfit = 0;
      console.warn(`No products data found for invoice ID: ${invoice.id}, unable to calculate profit - using zero`);
    }
    
    // خصم نسبة من الربح إذا كان هناك خصم إجمالي على الفاتورة
    if (invoice.discountPercentage && Number(invoice.discountPercentage) > 0) {
      const invoiceDiscountPercentage = Number(invoice.discountPercentage);
      const originalProfit = calculatedProfit;
      
      // تطبيق خصم الفاتورة الإجمالي على الربح
      calculatedProfit = calculatedProfit * (1 - (invoiceDiscountPercentage / 100));
      
      console.log(`Applied invoice discount ${invoiceDiscountPercentage}% to profit: ${originalProfit} → ${calculatedProfit}`);
    }
    
    console.log(`Total profit calculated for ${reportType} report, invoice ID: ${invoice.id}: ${calculatedProfit}`);
  } catch (err) {
    console.error(`Error calculating profit for ${reportType} report:`, err);
    // في حالة فشل حساب الربح، نعيد صفراً
    calculatedProfit = 0;
    console.warn(`Error calculating profit for invoice ID: ${invoice.id}, using zero profit`);
  }
  
  // تأكد من أن القيمة المُرجعة ليست NaN
  if (isNaN(calculatedProfit)) {
    console.warn(`Calculated profit is NaN, returning 0 instead for invoice ID: ${invoice.id || 'Unknown'}`);
    return 0;
  }
  
  return calculatedProfit;
}

// تعريف نوع معلمات التقرير
interface ReportParams {
  storage: any;
  type?: string;
  date?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  } | null;
  includeDetailedReports?: boolean;
  includeTopProducts?: boolean;
  includeDamagedItems?: boolean;
  includeExpenses?: boolean;
}

/**
 * إنشاء بيانات التقرير لـ API
 * @param params - معلمات التقرير
 * @returns بيانات التقرير المنسقة
 */
export async function generateReport(params: ReportParams): Promise<any> {
  const { 
    storage, 
    type = 'daily', 
    date, 
    dateRange = null,
    includeDetailedReports = true,
    includeTopProducts = true,
    includeDamagedItems = true,
    includeExpenses = true
  } = params;
  
  try {
    // جلب البيانات
    const [invoices, products, damagedItems, expenses] = await Promise.all([
      storage.getAllInvoices(),
      storage.getAllProducts(),
      includeDamagedItems ? storage.getAllDamagedItems() : Promise.resolve([]),
      includeExpenses ? storage.getAllExpenses ? storage.getAllExpenses() : Promise.resolve([]) : Promise.resolve([])
    ]);
    
    console.log(`Found ${invoices.length} invoices, ${products.length} products, ${damagedItems.length} damaged items, ${expenses?.length || 0} expenses`);
    
    // فلترة الفواتير حسب التاريخ
    let startDate: Date | undefined, endDate: Date | undefined;
    if (dateRange && dateRange.startDate && dateRange.endDate) {
      startDate = new Date(dateRange.startDate);
      endDate = new Date(dateRange.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      console.log(`Filtering invoices between ${startDate.toISOString()} and ${endDate.toISOString()}`);
    } else if (date) {
      if (type === 'daily') {
        startDate = new Date(date);
        endDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (type === 'monthly') {
        const [year, month] = date.split('-');
        startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        endDate = new Date(parseInt(year), parseInt(month), 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (type === 'yearly') {
        const year = parseInt(date);
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31);
        endDate.setHours(23, 59, 59, 999);
      }
      console.log(`Date range for ${type} report: ${startDate?.toISOString()} to ${endDate?.toISOString()}`);
    }
    
    // فلترة الفواتير
    const filteredInvoices = invoices.filter((invoice: any) => {
      if (!invoice.date || invoice.isDeleted) return false;
      const invoiceDate = new Date(invoice.date);
      return startDate && endDate 
        ? invoiceDate >= startDate && invoiceDate <= endDate
        : true;
    });
    
    console.log(`Found ${filteredInvoices.length} invoices in date range for ${type} report`);
    
    // فلترة العناصر التالفة
    const filteredDamagedItems = damagedItems.filter((item: any) => {
      if (!item.date) return false;
      const itemDate = new Date(item.date);
      return startDate && endDate 
        ? itemDate >= startDate && itemDate <= endDate
        : true;
    });
    
    console.log(`Found ${filteredDamagedItems.length} damaged items in date range for ${type} report`);
    
    // فلترة المصاريف
    const filteredExpenses = expenses ? expenses.filter((expense: any) => {
      if (!expense.date) return false;
      const expenseDate = new Date(expense.date);
      return startDate && endDate 
        ? expenseDate >= startDate && expenseDate <= endDate
        : true;
    }) : [];
    
    console.log(`Found ${filteredExpenses.length} expenses in date range for ${type} report`);
    
    // حساب ملخص البيانات
    const summary = {
      totalSales: 0,
      totalProfit: 0,
      totalDamages: 0,
      salesCount: filteredInvoices.length,
      previousTotalSales: 0,
      previousTotalProfit: 0,
      previousTotalDamages: 0,
      previousSalesCount: 0
    };
    
    // حساب الإجماليات
    for (const invoice of filteredInvoices) {
      summary.totalSales += invoice.total || 0;
      summary.totalProfit += await calculateProfitFromProductsData(invoice, type);
    }
    
    for (const item of filteredDamagedItems) {
      summary.totalDamages += item.valueLoss || 0;
    }
    
    // إنشاء بيانات الرسم البياني
    let chartData: { name: string, revenue: number, profit: number }[] = [];
    if (type === 'daily') {
      // 24 ساعة في اليوم
      chartData = Array.from({ length: 24 }, (_, i) => ({
        name: `${i}:00`,
        revenue: 0,
        profit: 0
      }));
      
      for (const invoice of filteredInvoices) {
        const hour = new Date(invoice.date).getHours();
        chartData[hour].revenue += invoice.total || 0;
        chartData[hour].profit += await calculateProfitFromProductsData(invoice, 'daily');
      }
    } else if (type === 'weekly') {
      // 7 أيام في الأسبوع
      const daysOfWeek = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      chartData = daysOfWeek.map(day => ({ name: day, revenue: 0, profit: 0 }));
      
      for (const invoice of filteredInvoices) {
        const dayIndex = new Date(invoice.date).getDay();
        chartData[dayIndex].revenue += invoice.total || 0;
        chartData[dayIndex].profit += await calculateProfitFromProductsData(invoice, 'weekly');
      }
    } else if (type === 'monthly') {
      // أيام الشهر (31 أقصى)
      const daysInMonth = endDate?.getDate() || 31;
      chartData = Array.from({ length: daysInMonth }, (_, i) => ({
        name: `${i + 1}`,
        revenue: 0,
        profit: 0
      }));
      
      for (const invoice of filteredInvoices) {
        const day = new Date(invoice.date).getDate();
        if (day >= 1 && day <= daysInMonth) {
          chartData[day - 1].revenue += invoice.total || 0;
          chartData[day - 1].profit += await calculateProfitFromProductsData(invoice, 'monthly');
        }
      }
    } else if (type === 'yearly') {
      // 12 شهر في السنة
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      chartData = months.map(month => ({ name: month, revenue: 0, profit: 0 }));
      
      for (const invoice of filteredInvoices) {
        const monthIndex = new Date(invoice.date).getMonth();
        chartData[monthIndex].revenue += invoice.total || 0;
        chartData[monthIndex].profit += await calculateProfitFromProductsData(invoice, 'yearly');
      }
    }
    
    // أفضل المنتجات مبيعًا
    let topProducts = [];
    if (includeTopProducts) {
      const productSalesMap = new Map<string | number, any>();
      
      // تهيئة خريطة المنتجات
      for (const product of products) {
        if (product.id) {
          productSalesMap.set(product.id, {
            id: product.id,
            name: product.name || 'منتج غير معروف',
            soldQuantity: 0,
            revenue: 0,
            profit: 0
          });
        }
      }
      
      // تجميع البيانات
      for (const invoice of filteredInvoices) {
        try {
          if (invoice.productsData) {
            const products = JSON.parse(invoice.productsData);
            if (Array.isArray(products)) {
              for (const product of products) {
                const productId = product.productId;
                if (productId && productSalesMap.has(productId)) {
                  const productData = productSalesMap.get(productId);
                  
                  // تحديث البيانات
                  productData.soldQuantity += Number(product.quantity) || 0;
                  productData.revenue += (product.sellingPrice || product.price || 0) * (Number(product.quantity) || 0);
                  
                  // حساب الربح باستخدام سعر الشراء الفعلي فقط
                  if (product.profit !== undefined && product.profit !== null) {
                    // استخدام الربح المحسوب مسبقاً إذا كان متوفراً
                    productData.profit += Number(product.profit);
                  } else if (product.purchasePrice !== undefined && (product.sellingPrice || product.price)) {
                    // حساب الربح من سعر الشراء والبيع
                    const sellingPrice = product.sellingPrice || product.price || 0;
                    const purchasePrice = Number(product.purchasePrice) || 0;
                    const quantity = Number(product.quantity) || 1;
                    productData.profit += (sellingPrice - purchasePrice) * quantity;
                  } else {
                    // إذا لم يتوفر سعر الشراء، نبحث عنه في بيانات المنتج الأصلية
                    const sellingPrice = product.sellingPrice || product.price || 0;
                    const quantity = Number(product.quantity) || 1;
                    
                    // البحث عن المنتج في قائمة المنتجات بواسطة رقم التعريف أو الباركود
                    const originalProduct = products.find(p => p.id == productId || p.barcode === product.barcode);
                    if (originalProduct && originalProduct.purchasePrice && Number(originalProduct.purchasePrice) > 0) {
                      const purchasePrice = Number(originalProduct.purchasePrice);
                      const itemProfit = (sellingPrice - purchasePrice) * quantity;
                      productData.profit += itemProfit;
                      console.log(`Found purchase price ${purchasePrice} in product catalog for product ID: ${productId}, profit: ${itemProfit}`);
                    } else {
                      console.warn(`No purchase price found for product ID: ${productId} in invoice or catalog - using zero for profit calculation`);
                    }
                  }
                  
                  productSalesMap.set(productId, productData);
                }
              }
            }
          }
        } catch (err) {
          console.error(`Error processing products data for invoice ${invoice.id}:`, err);
        }
      }
      
      // ترتيب وتصفية أفضل المنتجات
      topProducts = Array.from(productSalesMap.values())
        .filter(product => product.soldQuantity > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    }
    
    // تقارير مفصلة
    let detailedReports: any[] = [];
    if (includeDetailedReports) {
      // إضافة الفواتير
      for (const invoice of filteredInvoices) {
        const calculatedProfit = await calculateProfitFromProductsData(invoice, 'detailed');
        
        detailedReports.push({
          id: invoice.id,
          date: new Date(invoice.date).toISOString().split('T')[0],
          type: 'sale',
          amount: invoice.total,
          profit: calculatedProfit,
          details: `Invoice #${invoice.invoiceNumber}, Payment: ${invoice.paymentMethod}`,
          customerName: invoice.customerName || 'عميل غير معروف',
          paymentStatus: invoice.paymentStatus
        });
      }
      
      // إضافة العناصر التالفة
      for (const item of filteredDamagedItems) {
        detailedReports.push({
          id: item.id,
          date: new Date(item.date).toISOString().split('T')[0],
          type: 'damage',
          amount: item.valueLoss,
          details: item.description || 'No description',
          productName: item.productName || 'منتج غير معروف',
          quantity: item.quantity
        });
      }
      
      // إضافة المصاريف
      for (const expense of filteredExpenses) {
        detailedReports.push({
          id: expense.id,
          date: new Date(expense.date).toISOString().split('T')[0],
          type: 'expense',
          amount: expense.amount,
          details: expense.details || 'No description',
          expenseType: expense.expenseType || 'مصاريف أخرى'
        });
      }
      
      // ترتيب حسب التاريخ
      detailedReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    
    // إعداد البيانات النهائية
    const reportData = {
      summary,
      chartData,
      topProducts,
      detailedReports
    };
    
    return reportData;
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}