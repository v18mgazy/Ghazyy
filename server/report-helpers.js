// وظائف مساعدة لحساب الأرباح في التقارير
// @ts-nocheck

/**
 * حساب الربح من بيانات المنتجات في الفاتورة
 * @param {Object} invoice - الفاتورة
 * @param {string} reportType - نوع التقرير (daily, weekly, monthly, yearly)
 * @returns {number} إجمالي الربح المحسوب
 */
function calculateProfitFromProductsData(invoice, reportType = 'unknown') {
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
            const productProfit = (sellingPrice - purchasePrice) * quantity;
            calculatedProfit += productProfit;
            console.log(`Calculated profit for product '${product.productName || product.name || 'Unknown'}': (${sellingPrice} - ${purchasePrice}) * ${quantity} = ${productProfit}`);
          } else {
            // استخدام هامش ربح تقديري 30% فقط إذا لم تتوفر البيانات
            const sellingPrice = product.sellingPrice || product.price || 0;
            const quantity = Number(product.quantity) || 1;
            const productProfit = (sellingPrice * quantity) * 0.3;
            calculatedProfit += productProfit;
            console.log(`Using estimated profit (30%) for product '${product.productName || product.name || 'Unknown'}': ${sellingPrice} * ${quantity} * 0.3 = ${productProfit}`);
          }
        }
      } else {
        console.warn(`Products data is not an array for invoice ID: ${invoice.id}`);
      }
    } else {
      // استخدام هامش ربح تقديري 30% فقط إذا لم تتوفر بيانات المنتجات
      calculatedProfit = (invoice.total || 0) * 0.3;
      console.log(`No products data found for invoice ID: ${invoice.id}, using estimated profit (30%): ${invoice.total} * 0.3 = ${calculatedProfit}`);
    }
    
    console.log(`Total profit calculated for ${reportType} report, invoice ID: ${invoice.id}: ${calculatedProfit}`);
  } catch (err) {
    console.error(`Error calculating profit for ${reportType} report:`, err);
    // في حالة فشل حساب الربح، نستخدم هامش الربح التقديري
    calculatedProfit = (invoice.total || 0) * 0.3;
    console.log(`Using fallback profit calculation due to error: ${invoice.total} * 0.3 = ${calculatedProfit}`);
  }
  
  // تأكد من أن القيمة المُرجعة ليست NaN
  if (isNaN(calculatedProfit)) {
    console.warn(`Calculated profit is NaN, returning 0 instead for invoice ID: ${invoice.id || 'Unknown'}`);
    return 0;
  }
  
  return calculatedProfit;
}

/**
 * إنشاء بيانات التقرير لـ API
 * @param {Object} params - معلمات التقرير
 * @returns {Object} بيانات التقرير المنسقة
 */
async function generateReport(params) {
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
    let startDate, endDate;
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
    const filteredInvoices = invoices.filter(invoice => {
      if (!invoice.date || invoice.isDeleted) return false;
      const invoiceDate = new Date(invoice.date);
      return startDate && endDate 
        ? invoiceDate >= startDate && invoiceDate <= endDate
        : true;
    });
    
    console.log(`Found ${filteredInvoices.length} invoices in date range for ${type} report`);
    
    // فلترة العناصر التالفة
    const filteredDamagedItems = damagedItems.filter(item => {
      if (!item.date) return false;
      const itemDate = new Date(item.date);
      return startDate && endDate 
        ? itemDate >= startDate && itemDate <= endDate
        : true;
    });
    
    console.log(`Found ${filteredDamagedItems.length} damaged items in date range for ${type} report`);
    
    // فلترة المصاريف
    const filteredExpenses = expenses ? expenses.filter(expense => {
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
      summary.totalProfit += calculateProfitFromProductsData(invoice, type);
    }
    
    for (const item of filteredDamagedItems) {
      summary.totalDamages += item.valueLoss || 0;
    }
    
    // إنشاء بيانات الرسم البياني
    let chartData = [];
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
        chartData[hour].profit += calculateProfitFromProductsData(invoice, 'daily');
      }
    } else if (type === 'weekly') {
      // 7 أيام في الأسبوع
      const daysOfWeek = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      chartData = daysOfWeek.map(day => ({ name: day, revenue: 0, profit: 0 }));
      
      for (const invoice of filteredInvoices) {
        const dayIndex = new Date(invoice.date).getDay();
        chartData[dayIndex].revenue += invoice.total || 0;
        chartData[dayIndex].profit += calculateProfitFromProductsData(invoice, 'weekly');
      }
    } else if (type === 'monthly') {
      // أيام الشهر (31 أقصى)
      const daysInMonth = endDate.getDate();
      chartData = Array.from({ length: daysInMonth }, (_, i) => ({
        name: `${i + 1}`,
        revenue: 0,
        profit: 0
      }));
      
      for (const invoice of filteredInvoices) {
        const day = new Date(invoice.date).getDate();
        chartData[day - 1].revenue += invoice.total || 0;
        chartData[day - 1].profit += calculateProfitFromProductsData(invoice, 'monthly');
      }
    } else if (type === 'yearly') {
      // 12 شهر في السنة
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      chartData = months.map(month => ({ name: month, revenue: 0, profit: 0 }));
      
      for (const invoice of filteredInvoices) {
        const monthIndex = new Date(invoice.date).getMonth();
        chartData[monthIndex].revenue += invoice.total || 0;
        chartData[monthIndex].profit += calculateProfitFromProductsData(invoice, 'yearly');
      }
    }
    
    // أفضل المنتجات مبيعًا
    let topProducts = [];
    if (includeTopProducts) {
      const productSalesMap = new Map();
      
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
                  
                  // حساب الربح
                  if (product.profit !== undefined && product.profit !== null) {
                    productData.profit += Number(product.profit);
                  } else if (product.purchasePrice !== undefined && (product.sellingPrice || product.price)) {
                    const sellingPrice = product.sellingPrice || product.price || 0;
                    const purchasePrice = Number(product.purchasePrice) || 0;
                    const quantity = Number(product.quantity) || 1;
                    productData.profit += (sellingPrice - purchasePrice) * quantity;
                  } else {
                    const sellingPrice = product.sellingPrice || product.price || 0;
                    const quantity = Number(product.quantity) || 1;
                    productData.profit += (sellingPrice * quantity) * 0.3;
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
    let detailedReports = [];
    if (includeDetailedReports) {
      // إضافة الفواتير
      for (const invoice of filteredInvoices) {
        const calculatedProfit = calculateProfitFromProductsData(invoice, 'detailed');
        
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

export {
  calculateProfitFromProductsData,
  generateReport
};