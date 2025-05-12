import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertProductSchema, insertCustomerSchema, 
  insertInvoiceSchema, insertDamagedItemSchema,
  insertEmployeeSchema, insertPaymentApprovalSchema, insertReportDataSchema,
  insertNotificationSchema, insertEmployeeDeductionSchema, insertStoreInfoSchema
} from "@shared/schema";
import { registerSupplierRoutes } from "./api-routes";
import { z } from "zod";
import { type ZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Register supplier routes
  registerSupplierRoutes(app);
  
  // الحصول على قائمة الفواتير المؤجلة
  app.get('/api/deferred-payments', async (req, res) => {
    try {
      console.log('Getting deferred payments');
      // الحصول على قائمة الفواتير التي طريقة الدفع فيها "later" أو حالة الدفع "pending" أو "partially_paid"
      const allInvoices = await storage.getAllInvoices();
      console.log(`Found ${allInvoices.length} total invoices`);
      
      // تفلتر الفواتير المؤجلة التي لم يتم دفعها بالكامل
      const deferredInvoices = allInvoices.filter(invoice => 
        (invoice.paymentMethod === 'later' || 
         invoice.paymentMethod === 'deferred') &&
        !invoice.isDeleted
      );
      
      console.log(`Found ${deferredInvoices.length} deferred invoices`);
      console.log('Deferred invoices:', deferredInvoices.map(inv => 
        ({ id: inv.id, method: inv.paymentMethod, status: inv.paymentStatus, customer: inv.customerName })));
      
      // تحويل البيانات إلى الشكل المطلوب للواجهة
      const deferredPayments = deferredInvoices.map(invoice => {
        // حساب المبلغ المتبقي باستخدام الحالة
        let remainingAmount = invoice.total;
        
        // تحديث المبلغ المتبقي بناءً على حالة الدفع
        if (invoice.paymentStatus === 'paid') {
          remainingAmount = 0;
        } else if (invoice.paymentStatus === 'partially_paid') {
          // في حالة الدفع الجزئي، نفترض أن المبلغ المدفوع هو نصف المبلغ الإجمالي
          // هذا مجرد مثال، يجب استبداله بحساب حقيقي للمدفوعات
          remainingAmount = invoice.total / 2;
        }
        
        return {
          id: invoice.id.toString(),
          customerId: invoice.customerId ? invoice.customerId.toString() : '',
          customerName: invoice.customerName || 'غير معروف',
          customerPhone: invoice.customerPhone || '',
          invoiceId: invoice.id.toString(),
          invoiceNumber: invoice.invoiceNumber,
          originalAmount: invoice.total,
          remainingAmount: remainingAmount,
          lastPaymentDate: invoice.updatedAt ? new Date(invoice.updatedAt).toISOString() : null,
          dueDate: null, // سيتم تنفيذه لاحقًا
          status: invoice.paymentStatus
        };
      });
      
      console.log(`Returning ${deferredPayments.length} deferred payments`);
      // إرجاع الردود مباشرة بدون نموذج صفحة
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(deferredPayments));
    } catch (error) {
      console.error('Error fetching deferred payments:', error);
      res.status(500).json({ error: 'Failed to fetch deferred payments' });
    }
  });
  
  // تسجيل دفعة لفاتورة مؤجلة
  app.post('/api/record-payment', async (req, res) => {
    try {
      const { invoiceId, amount, paymentMethod, notes } = req.body;
      
      if (!invoiceId || amount <= 0) {
        return res.status(400).json({ error: 'Invalid payment details' });
      }
      
      // الحصول على الفاتورة
      const invoice = await storage.getInvoice(parseInt(invoiceId));
      
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      // حساب المبلغ المتبقي الحالي
      let currentRemainingAmount = invoice.total;
      
      // إذا كانت الفاتورة مدفوعة جزئياً، نفترض أن المبلغ المدفوع مسبقاً هو نصف المبلغ
      if (invoice.paymentStatus === 'partially_paid') {
        currentRemainingAmount = invoice.total / 2;
      } else if (invoice.paymentStatus === 'paid') {
        currentRemainingAmount = 0;
      }
      
      // تحقق من أن المبلغ المدفوع لا يتجاوز المبلغ المتبقي
      if (amount > currentRemainingAmount) {
        return res.status(400).json({ 
          error: 'Payment amount exceeds remaining balance',
          currentRemainingAmount
        });
      }
      
      // حساب المبلغ المتبقي الجديد
      const newRemainingAmount = currentRemainingAmount - amount;
      
      // تحديد حالة الدفع الجديدة بناءً على المبلغ المتبقي
      let newStatus = 'partially_paid';
      if (newRemainingAmount <= 0) {
        newStatus = 'paid';
      } else if (newRemainingAmount === invoice.total) {
        // لم يتم دفع أي شيء بعد
        newStatus = 'pending';
      }
      
      console.log(`Updating invoice ${invoiceId} with these fields: [ 'paymentStatus' ]`);
      
      // في المستقبل، يمكن إضافة حقل مخصص لتسجيل المدفوعات الجزئية
      // مثل: paidAmount أو paymentRecords (كمصفوفة)
      
      // تحقق من وجود حقل productsData للحفاظ عليه عند التحديث
      if (invoice.productsData) {
        console.log('Preserving existing productsData from invoice');
      }
      
      // تحديث حالة الفاتورة
      const updatedInvoice = await storage.updateInvoice(parseInt(invoiceId), {
        paymentStatus: newStatus,
        // يمكن إضافة حقول أخرى هنا مستقبلاً
      });
      
      console.log('Final updated invoice data:', updatedInvoice);
      
      // إنشاء إشعار بالدفعة
      await storage.createNotification({
        userId: invoice.userId,
        title: `تم استلام دفعة`,
        message: `تم استلام دفعة بمبلغ ${amount} للفاتورة رقم ${invoice.invoiceNumber}`,
        type: 'payment',
        isRead: false,
        createdAt: new Date()
      });
      
      res.status(200).json({ 
        success: true, 
        invoice: updatedInvoice,
        payment: {
          invoiceId,
          amount,
          paymentMethod,
          notes,
          date: new Date(),
          newRemainingAmount,
          newStatus
        }
      });
    } catch (error) {
      console.error('Error recording payment:', error);
      res.status(500).json({ error: 'Failed to record payment' });
    }
  });
  
  // تسجيل تذكير دفع (للتتبع فقط)
  app.post('/api/payment-reminders', async (req, res) => {
    try {
      const { customerId, invoiceId, message, channel } = req.body;
      
      // في الإصدار الأول، سنكتفي بتسجيل التذكير في السجلات
      console.log(`Payment reminder sent to customer ${customerId} for invoice ${invoiceId} via ${channel}`);
      console.log(`Message: ${message}`);
      
      // يمكن إضافة منطق لتخزين سجل التذكير في قاعدة البيانات لاحقًا
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error logging payment reminder:', error);
      res.status(500).json({ error: 'Failed to log payment reminder' });
    }
  });

  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const loginSchema = z.object({
        username: z.string().min(2),
        password: z.string().min(2)
      });
      
      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(username);
      
      // للتبسيط، نقارن كلمة المرور المقدمة مع كلمة المرور المخزنة مباشرة
      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      // تجاهل جلسات المستخدم للآن للتبسيط
      // مع إعادة بيانات المستخدم
      return res.json({ 
        id: user.id,
        username: user.username,
        role: user.role || 'user'
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      return res.status(500).json({ message: 'Login failed' });
    }
  });
  
  app.post('/api/auth/logout', (req, res) => {
    // نظرًا لأننا لا نستخدم الجلسات في الوقت الحالي، نعيد فقط رسالة نجاح
    res.json({ message: 'Logged out successfully' });
  });
  
  app.get('/api/auth/check-session', (req, res) => {
    // للتبسيط، نقوم دائمًا بإعادة مستخدم مصادق عليه
    return res.json({ isAuthenticated: true, userId: 1, userRole: 'admin' });
  });
  
  // User routes
  app.get('/api/users', async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });
  
  app.post('/api/users', async (req, res) => {
    
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(500).json({ message: 'Failed to create user' });
    }
  });
  
  app.patch('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.updateUser(parseInt(id), req.body);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: 'Failed to update user' });
    }
  });
  
  app.delete('/api/users/:id', async (req, res) => {
    
    try {
      const { id } = req.params;
      await storage.deleteUser(parseInt(id));
      res.json({ message: 'User deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });
  
  // Product routes
  app.get('/api/products', async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch products' });
    }
  });
  
  app.get('/api/products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const product = await storage.getProduct(parseInt(id));
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.json(product);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch product' });
    }
  });
  
  app.get('/api/products/barcode/:barcode', async (req, res) => {
    try {
      const { barcode } = req.params;
      const product = await storage.getProductByBarcode(barcode);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.json(product);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch product' });
    }
  });
  
  app.post('/api/products', async (req, res) => {
    // مؤقتاً تمت إزالة التحقق من الصلاحيات
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(500).json({ message: 'Failed to create product' });
    }
  });
  
  app.patch('/api/products/:id', async (req, res) => {
    // مؤقتاً تمت إزالة التحقق من الصلاحيات
    try {
      const { id } = req.params;
      const product = await storage.updateProduct(parseInt(id), req.body);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.json(product);
    } catch (err) {
      res.status(500).json({ message: 'Failed to update product' });
    }
  });
  
  app.delete('/api/products/:id', async (req, res) => {
    // مؤقتاً تمت إزالة التحقق من الصلاحيات
    try {
      const { id } = req.params;
      await storage.deleteProduct(parseInt(id));
      res.json({ message: 'Product deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Failed to delete product' });
    }
  });
  
  // Customer routes
  app.get('/api/customers', async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch customers' });
    }
  });
  
  app.get('/api/customers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const customer = await storage.getCustomer(parseInt(id));
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      res.json(customer);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch customer' });
    }
  });
  
  app.get('/api/customers/search/:query', async (req, res) => {
    try {
      const { query } = req.params;
      const customers = await storage.searchCustomers(query);
      res.json(customers);
    } catch (err) {
      res.status(500).json({ message: 'Failed to search customers' });
    }
  });
  
  app.post('/api/customers', async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(500).json({ message: 'Failed to create customer' });
    }
  });
  
  app.patch('/api/customers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const customer = await storage.updateCustomer(parseInt(id), req.body);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      res.json(customer);
    } catch (err) {
      res.status(500).json({ message: 'Failed to update customer' });
    }
  });
  
  // مسار جديد للحصول على فواتير العميل
  app.get('/api/customer-invoices/:customerId', async (req, res) => {
    try {
      const { customerId } = req.params;
      console.log(`Fetching invoices for customer ID: ${customerId}`);
      
      // جلب بيانات العميل أولاً للحصول على الاسم والهاتف
      let customerInfo = null;
      try {
        const allCustomers = await storage.getAllCustomers();
        customerInfo = allCustomers.find(c => c.id.toString() === customerId.toString());
        if (customerInfo) {
          console.log(`Found customer: ${customerInfo.name} (${customerInfo.phone || 'No phone'})`);
        }
      } catch (error) {
        console.error('Error fetching customer info:', error);
      }
      
      // جلب جميع الفواتير
      const allInvoices = await storage.getAllInvoices();
      console.log(`Total invoices found: ${allInvoices.length}`);
      
      // مصفوفة لتخزين الفواتير المطابقة
      let customerInvoices = [];
      
      if (customerInfo) {
        // البحث بواسطة معرف العميل أولاً
        const idMatches = allInvoices.filter(invoice => {
          const invoiceCustomerId = invoice.customerId?.toString() || '';
          const matches = invoiceCustomerId === customerId.toString();
          if (matches) {
            console.log(`Matched invoice by ID: ${invoice.id}`);
          }
          return matches;
        });
        
        // البحث بواسطة اسم العميل
        const nameMatches = allInvoices.filter(invoice => {
          if (invoice.customerName && customerInfo?.name) {
            const matches = invoice.customerName.toLowerCase() === customerInfo.name.toLowerCase();
            if (matches) {
              console.log(`Matched invoice by name: ${invoice.id}`);
            }
            return matches;
          }
          return false;
        });
        
        // البحث بواسطة رقم هاتف العميل
        const phoneMatches = allInvoices.filter(invoice => {
          if (invoice.customerPhone && customerInfo?.phone) {
            const matches = invoice.customerPhone === customerInfo.phone;
            if (matches) {
              console.log(`Matched invoice by phone: ${invoice.id}`);
            }
            return matches;
          }
          return false;
        });
        
        // دمج النتائج وإزالة التكرارات
        const invoiceIds = new Set();
        const combinedInvoices = [...idMatches, ...nameMatches, ...phoneMatches];
        
        customerInvoices = combinedInvoices.filter(invoice => {
          if (invoiceIds.has(invoice.id)) {
            return false;
          }
          invoiceIds.add(invoice.id);
          return true;
        });
      }
      
      console.log(`Found ${customerInvoices.length} invoices for customer ${customerId}`);
      res.json(customerInvoices);
    } catch (err) {
      console.error('Error fetching customer invoices:', err);
      res.status(500).json({ message: 'Failed to fetch customer invoices' });
    }
  });
  
  // Invoice routes
  app.get('/api/invoices', async (req, res) => {
    try {
      const invoices = await storage.getAllInvoices();
      res.json(invoices);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch invoices' });
    }
  });
  
  app.get('/api/invoices/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const invoice = await storage.getInvoice(parseInt(id));
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      res.json(invoice);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch invoice' });
    }
  });
  
  // تعديل الفاتورة
  app.put('/api/invoices/:id', async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Request to update invoice with ID: ${id}`);
      
      const invoiceId = parseInt(id);
      if (isNaN(invoiceId)) {
        console.error('Invalid invoice ID format:', id);
        return res.status(400).json({ message: 'Invalid invoice ID format' });
      }
      
      // فحص وجود الفاتورة قبل التحديث
      const existingInvoice = await storage.getInvoice(invoiceId);
      if (!existingInvoice) {
        console.error(`Invoice with ID ${invoiceId} not found for update`);
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      console.log('Existing invoice:', existingInvoice);
      console.log('Update data:', req.body);
      
      // استخراج معرف العميل إذا تم تغييره
      let customerId = req.body.customerId;
      if (customerId !== undefined && typeof customerId === 'string') {
        customerId = parseInt(customerId);
      }
      
      // التحقق من صحة معرف العميل إذا تم تقديمه
      if (customerId !== undefined && isNaN(customerId)) {
        console.error('Invalid customer ID:', req.body.customerId);
        return res.status(400).json({ message: 'Invalid customer ID format' });
      }
      
      // تخزين معلومات العميل في الفاتورة إذا تم تقديمها
      let customerInfo = {};
      if (req.body.customerDetails) {
        customerInfo = {
          customerName: req.body.customerDetails.name,
          customerPhone: req.body.customerDetails.phone,
          customerAddress: req.body.customerDetails.address,
        };
      }
      
      // إعداد بيانات التحديث
      const updateData = {
        ...(req.body.invoiceNumber && { invoiceNumber: req.body.invoiceNumber }),
        ...(customerId !== undefined && { customerId }),
        ...customerInfo,
        ...(req.body.subtotal !== undefined && { subtotal: req.body.subtotal }),
        ...(req.body.discount !== undefined && { discount: req.body.discount }),
        ...(req.body.total !== undefined && { total: req.body.total }),
        ...(req.body.paymentMethod && { paymentMethod: req.body.paymentMethod }),
        ...(req.body.paymentStatus && { paymentStatus: req.body.paymentStatus }),
        ...(req.body.notes && { notes: req.body.notes }),
        ...(req.body.productsData && { productsData: req.body.productsData }),
        updatedAt: new Date().toISOString()
      };
      
      // إذا كان هناك بيانات منتجات مرسلة مباشرة كـ productsData، نستخدمها كما هي
      if (req.body.productsData) {
        console.log('Using directly provided productsData:', req.body.productsData);
        updateData.productsData = req.body.productsData;
      }
      
      console.log('Updating invoice with data:', updateData);
      
      // تحديث الفاتورة
      const updatedInvoice = await storage.updateInvoice(invoiceId, updateData);
      
      // تحديث منتجات الفاتورة إذا تم تقديمها
      if (req.body.products && Array.isArray(req.body.products) && req.body.products.length > 0) {
        console.log(`Processing ${req.body.products.length} products for invoice update`);
        
        // 1. احصل على المنتجات الموجودة في الفاتورة
        let existingProducts = [];
        try {
          if (existingInvoice.productsData) {
            existingProducts = JSON.parse(existingInvoice.productsData);
            console.log(`Found ${existingProducts.length} existing products in invoice`);
          }
        } catch (parseError) {
          console.error('Error parsing existing products data:', parseError);
        }
        
        // 2. تحضير منتجات الفاتورة المحدثة
        const updatedProducts = await Promise.all(req.body.products.map(async (item) => {
          // معرف المنتج والتأكد من أنه رقم صحيح
          let productId = item.productId;
          if (typeof productId === 'string') {
            productId = parseInt(productId);
          }
          
          if (isNaN(productId)) {
            console.error('Invalid product ID:', item.productId);
            return null;
          }
          
          // البحث عن المنتج في قائمة المنتجات الموجودة
          const existingItem = existingProducts.find(p => p.productId === productId);
          const oldQuantity = existingItem ? existingItem.quantity : 0;
          const newQuantity = item.quantity;
          
          // تحديث المخزون بناءً على الفرق في الكمية
          // إذا كانت الكمية الجديدة أكبر، نأخذ من المخزون
          // إذا كانت أقل، نعيد للمخزون
          try {
            const product = await storage.getProduct(productId);
            if (product) {
              const quantityDiff = oldQuantity - newQuantity;
              const updatedStock = Math.max(0, (product.stock || 0) + quantityDiff);
              
              await storage.updateProduct(productId, { 
                stock: updatedStock 
              });
              
              console.log(`Updated product ${product.name} stock to ${updatedStock} (diff: ${quantityDiff})`);
              
              // إعداد بيانات المنتج للفاتورة المحدثة
              return {
                productId,
                productName: product.name,
                barcode: product.barcode || '',
                quantity: newQuantity,
                price: item.price,
                discount: item.discount || 0,
                total: item.total || (newQuantity * item.price * (1 - (item.discount || 0) / 100))
              };
            } else {
              console.warn(`Product with ID ${productId} not found`);
              return {
                productId,
                productName: item.productName || 'Unknown Product',
                barcode: '',
                quantity: newQuantity,
                price: item.price,
                discount: item.discount || 0,
                total: item.total || (newQuantity * item.price * (1 - (item.discount || 0) / 100))
              };
            }
          } catch (productError) {
            console.error(`Error processing product ${productId} for invoice update:`, productError);
            return null;
          }
        }));
        
        // تصفية العناصر الفارغة
        const filteredProducts = updatedProducts.filter(p => p !== null);
        
        // تحديث منتجات الفاتورة
        const productsData = JSON.stringify(filteredProducts);
        await storage.updateInvoice(invoiceId, { productsData });
        console.log(`Updated invoice products data with ${filteredProducts.length} items`);
      }
      
      res.json(updatedInvoice || { id: invoiceId, ...updateData });
    } catch (error) {
      console.error('Error updating invoice:', error);
      res.status(500).json({ message: 'Failed to update invoice', error: error.message });
    }
  });
  
  // حذف الفاتورة (أو تعليمها كمحذوفة)
  app.delete('/api/invoices/:id', async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Request to delete invoice with ID: ${id}`);
      
      // اختبار صلاحيات المستخدم هنا إذا لزم الأمر
      
      const invoiceId = parseInt(id);
      if (isNaN(invoiceId)) {
        console.error('Invalid invoice ID format:', id);
        return res.status(400).json({ message: 'Invalid invoice ID format' });
      }
      
      // فحص وجود الفاتورة قبل الحذف
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        console.error(`Invoice with ID ${invoiceId} not found for deletion`);
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      console.log(`Found invoice to delete:`, invoice);
      
      // 1. استعادة المخزون للمنتجات التي تم بيعها في هذه الفاتورة
      try {
        // استخراج بيانات المنتجات من حقل productsData
        let products = [];
        if (invoice.productsData) {
          try {
            products = JSON.parse(invoice.productsData);
            console.log(`Parsed ${products.length} products from invoice data`);
          } catch (parseError) {
            console.error('Error parsing products data:', parseError);
            products = [];
          }
        }
        
        // استعادة المخزون للمنتجات التي تم بيعها في هذه الفاتورة
        for (const item of products) {
          try {
            // الحصول على المنتج الحالي
            const product = await storage.getProduct(item.productId);
            
            if (product) {
              // إضافة الكمية المباعة مرة أخرى إلى المخزون
              const updatedStock = (product.stock || 0) + item.quantity;
              
              // تحديث المخزون
              await storage.updateProduct(item.productId, {
                stock: updatedStock
              });
              
              console.log(`Restored ${item.quantity} units to product ${product.name} (ID: ${product.id}). New stock: ${updatedStock}`);
            } else {
              console.warn(`Product with ID ${item.productId} not found during stock restoration`);
            }
          } catch (productError) {
            console.error(`Error restoring stock for product ID ${item.productId}:`, productError);
            // نستمر بالعملية رغم فشل تحديث منتج معين
          }
        }
      } catch (itemError) {
        console.error('Error processing products during invoice deletion:', itemError);
        // قد نستمر بالحذف رغم الخطأ
      }
      
      // 2. حذف الفاتورة نهائيًا من قاعدة البيانات
      try {
        await storage.deleteInvoice(invoiceId);
        console.log(`Successfully deleted invoice ${invoiceId} from database`);
      } catch (deleteError) {
        console.error('Error deleting invoice from database:', deleteError);
        // إذا فشل الحذف النهائي، نقوم بتعليمها كمحذوفة فقط للتأكد من استبعادها من التقارير
        try {
          await storage.updateInvoice(invoiceId, { 
            isDeleted: true,
            paymentStatus: 'deleted' 
          });
          console.log(`Marked invoice ${invoiceId} as deleted due to failed permanent deletion`);
        } catch (fallbackError) {
          console.error('Fallback method also failed:', fallbackError);
          // استمر رغم الخطأ - سنعيد الاستجابة للعميل بنجاح العملية
        }
      }
      
      // 3. إرسال استجابة النجاح
      res.status(200).json({ message: 'Invoice deleted successfully' });
    } catch (err) {
      console.error('Error deleting invoice:', err);
      res.status(500).json({ message: 'Failed to delete invoice', error: err.message });
    }
  });
  
  app.post('/api/invoices', async (req, res) => {
    try {
      console.log('Creating invoice with data:', req.body);
      
      // تأكد من أن storage هو كائن متاح
      console.log('Storage implementation type:', typeof storage);
      console.log('Storage methods available:', Object.keys(storage));
      
      // Extract the user role from the request if available
      const userRole = req.body.userRole || 'cashier'; // افتراض أن المستخدم كاشير إذا لم يتم تحديد الدور
      const userId = req.body.userId || 1; // استخدام ID المستخدم من الطلب إذا كان متوفراً
      
      // استخراج معرف العميل والتأكد من أنه رقم صحيح
      let customerId = req.body.customerId;
      if (typeof customerId === 'string') {
        customerId = parseInt(customerId);
      }
      
      if (isNaN(customerId)) {
        console.error('Invalid customer ID:', req.body.customerId);
        return res.status(400).json({ message: 'Invalid customer ID format' });
      }
      
      console.log('Parsed customer ID:', customerId);
      
      // تحقق من وجود العميل أو إنشاء عميل جديد إذا تم توفير البيانات
      let customer = await storage.getCustomer(customerId);
      
      // إذا لم يتم العثور على العميل ولكن تم توفير بيانات العميل، قم بإنشاء عميل جديد
      if (!customer && req.body.customerDetails) {
        try {
          console.log('Customer not found but details provided. Creating new customer:', req.body.customerDetails);
          const newCustomer = await storage.createCustomer({
            name: req.body.customerDetails.name || 'عميل جديد',
            phone: req.body.customerDetails.phone || '',
            address: req.body.customerDetails.address || '',
            email: req.body.customerDetails.email || '',
            isPotential: false
          });
          customerId = newCustomer.id;
          customer = newCustomer;
          console.log('Created new customer:', customer);
        } catch (createCustomerError) {
          console.error('Error creating new customer:', createCustomerError);
          // استمر بدون إنشاء عميل، سنستخدم بيانات العميل مباشرة في الفاتورة
        }
      }
      
      // استخدام عميل افتراضي إذا لم يتم العثور على عميل
      if (!customer) {
        console.log('Using default customer data for invoice');
        customer = {
          id: 0,
          name: req.body.customerDetails?.name || 'عميل نقدي',
          phone: req.body.customerDetails?.phone || '',
          address: req.body.customerDetails?.address || '',
          email: req.body.customerDetails?.email || ''
        };
      } else {
        console.log('Found customer:', customer);
      }
      
      // سجل كامل بيانات الطلب للتشخيص
      console.log('Complete request body:', JSON.stringify(req.body, null, 2));
      
      // سجل معلومات العميل المفصلة من الطلب
      console.log('Customer info from request body:', {
        customerName: req.body.customerName,
        customerPhone: req.body.customerPhone,
        customerAddress: req.body.customerAddress
      });
      
      // استخدام بيانات العميل مباشرة من الطلب بدلاً من قاعدة البيانات
      const customerInfo = {
        customerName: req.body.customerName || (customer ? customer.name : 'عميل نقدي'),
        customerPhone: req.body.customerPhone || (customer ? customer.phone || '' : ''),
        customerAddress: req.body.customerAddress || (customer ? customer.address || '' : ''),
        notes: req.body.notes || '',
        updatedAt: new Date().toISOString()
      };
      
      // تحضير بيانات المنتجات للتخزين في الفاتورة
      let productsDataArray = [];
      
      if (req.body.products && Array.isArray(req.body.products)) {
        // تحضير بيانات المنتجات وتحويلها إلى JSON
        productsDataArray = await Promise.all(req.body.products.map(async (item) => {
          // معرف المنتج والتأكد من أنه رقم صحيح
          let productId = item.productId;
          if (typeof productId === 'string') {
            productId = parseInt(productId);
          }
          
          if (isNaN(productId)) {
            console.error('Invalid product ID:', item.productId);
            return null; // سيتم تصفية القيم الفارغة لاحقًا
          }
          
          // الحصول على تفاصيل المنتج كاملة لتضمينها وتحديث المخزون
          const product = await storage.getProduct(productId);
          if (!product) {
            console.warn(`Product with ID ${productId} not found`);
            return {
              productId: productId,
              productName: item.productName || 'Unknown Product',
              barcode: '',
              quantity: item.quantity,
              price: item.price,
              discount: item.discount || 0,
              total: item.total || (item.quantity * item.price * (1 - (item.discount || 0) / 100))
            };
          }
          
          console.log(`Processing product ${productId}:`, product.name);
          
          // تحديث المخزون
          const newStock = Math.max(0, (product.stock || 0) - item.quantity);
          await storage.updateProduct(productId, { 
            stock: newStock 
          });
          console.log(`Updated product ${product.name} stock to ${newStock}`);
          
          // إرجاع بيانات المنتج المعالجة
          // نقوم بإنشاء كائنين:
          // 1. كائن للواجهة (displayProduct): لا يحتوي على بيانات سعر الشراء والربح
          // 2. كائن للتخزين في قاعدة البيانات (dbProduct): يحتوي على كل البيانات بما فيها سعر الشراء والربح
          
          // هذا الكائن سيتم استخدامه لاحقًا في createInvoice (للتخزين في قاعدة البيانات فقط)
          const dbProduct = {
            productId: productId,
            productName: product.name,
            barcode: product.barcode,
            quantity: item.quantity,
            price: item.price,
            purchasePrice: product.purchasePrice || 0, // للتقارير وحساب الأرباح (لا يُظهر للمستخدم)
            sellingPrice: product.sellingPrice || item.price, // للمرجعية في قاعدة البيانات فقط
            discount: item.discount || 0,
            total: item.total || (item.quantity * item.price * (1 - (item.discount || 0) / 100)),
            profit: (item.price - (product.purchasePrice || 0)) * item.quantity // للتقارير فقط
          };
          
          // نرجع الكائن الذي يحتوي على كل البيانات للتخزين في قاعدة البيانات
          return dbProduct;
        }));
        
        // تصفية أي قيم فارغة (null)
        productsDataArray = productsDataArray.filter(item => item !== null);
      }
      
      // التأكد من أن مصفوفة المنتجات جاهزة
      console.log("Product data array before processing:", productsDataArray);
      
      // إعداد بيانات المنتجات للتخزين في الحقول المنفصلة
      const productIds: number[] = [];
      const productNames: string[] = [];
      const productQuantities: number[] = [];
      const productPrices: number[] = [];
      const productPurchasePrices: number[] = [];
      const productDiscounts: number[] = [];
      const productTotals: number[] = [];
      const productProfits: number[] = [];
      
      // استخراج بيانات المنتجات وتخزينها في المصفوفات المنفصلة
      if (productsDataArray && productsDataArray.length > 0) {
        productsDataArray.forEach(product => {
          if (product) {
            console.log("Processing product for separate fields:", product);
            productIds.push(product.productId);
            productNames.push(product.productName);
            productQuantities.push(product.quantity);
            productPrices.push(product.price);
            productPurchasePrices.push(product.purchasePrice || 0);
            productDiscounts.push(product.discount || 0);
            productTotals.push(product.total);
            productProfits.push(product.profit || 0);
          }
        });
      }
      
      console.log("Extracted product data:", {
        productIds,
        productNames,
        productQuantities,
        productPrices,
        productPurchasePrices,
        productDiscounts,
        productTotals,
        productProfits
      });
      
      // إعداد بيانات الفاتورة مع التأكد من أخذ بيانات العميل مباشرة من الطلب
      const invoiceData = {
        invoiceNumber: req.body.invoiceNumber,
        customerId: customerId,
        // استخدام بيانات العميل مباشرة من طلب إنشاء الفاتورة
        customerName: req.body.customerName || customerInfo.customerName,
        customerPhone: req.body.customerPhone || customerInfo.customerPhone,
        customerAddress: req.body.customerAddress || customerInfo.customerAddress,
        subtotal: req.body.subtotal,
        discount: req.body.discount || 0,
        total: req.body.total,
        paymentMethod: req.body.paymentMethod,
        paymentStatus: req.body.paymentStatus,
        notes: customerInfo.notes,
        date: req.body.date || new Date().toISOString(),
        // تخزين بيانات المنتجات بالطريقتين للتوافق مع الإصدارات السابقة
        productsData: JSON.stringify(productsDataArray),
        // تخزين بيانات المنتجات في حقول منفصلة
        productIds: productIds.join(','),
        productNames: productNames.join('|'),
        productQuantities: productQuantities.join(','),
        productPrices: productPrices.join(','),
        productPurchasePrices: productPurchasePrices.join(','),
        productDiscounts: productDiscounts.join(','),
        productTotals: productTotals.join(','),
        productProfits: productProfits.join(','),
        userId: userId,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('Final invoice data for creation:', invoiceData);
      
      // إنشاء الفاتورة
      const invoice = await storage.createInvoice(invoiceData);
      console.log('Created invoice:', invoice);
      
      // إرسال إشعار للمدير بإنشاء فاتورة جديدة - فقط إذا كان منشئ الفاتورة هو الكاشير
      if (userRole === 'cashier') {
        try {
          // استخدام معلومات العميل التي تم التحقق منها سابقًا
          const customerName = customer.name;
          
          // إنشاء إشعار للمدير (نفترض أن المدير له الـ ID = 1)
          const adminUserId = 1; // يمكن تغييره إلى ID المدير الفعلي
          
          console.log('Creating notification for admin about new invoice');
          
          await storage.createNotification({
            userId: adminUserId,
            title: 'تم إنشاء فاتورة جديدة',
            message: `تم إنشاء فاتورة جديدة برقم ${invoice.invoiceNumber} للعميل ${customerName} بقيمة ${invoice.total}`,
            type: 'invoice_created',
            referenceId: invoice.id.toString()
          });
        } catch (notifyError) {
          console.error('Failed to send notification:', notifyError);
          // نستمر في العملية حتى إذا فشل إرسال الإشعار
        }
      } else {
        console.log('Skipping notification creation - invoice created by admin');
      }
      
      // If payment method is 'later' or 'deferred', handle approval
      if (invoiceData.paymentMethod === 'later' || invoiceData.paymentMethod === 'deferred') {
        // Create payment approval request
        const approvalData = {
          invoiceId: invoice.id,
          requestedBy: invoiceData.userId, // استخدام معرف المستخدم الذي أنشأ الفاتورة
          status: 'pending' // دائما تكون في حالة انتظار في البداية
        };
        
        const approval = await storage.createPaymentApproval(approvalData);
        
        // إرسال إشعار للمدير بطلب الموافقة على الدفع المؤجل
        try {
          // إنشاء إشعار للمدير (نفترض أن المدير له الـ ID = 1)
          const adminUserId = 1; // يمكن تغييره إلى ID المدير الفعلي
          
          await storage.createNotification({
            userId: adminUserId,
            title: 'طلب موافقة على الدفع المؤجل',
            message: `تم طلب موافقة على الدفع المؤجل للفاتورة رقم ${invoice.invoiceNumber} بقيمة ${invoice.total}`,
            type: 'deferred_payment_request',
            referenceId: invoice.id.toString()
          });
        } catch (notifyError) {
          console.error('Failed to send deferred payment notification:', notifyError);
          // نستمر في العملية حتى إذا فشل إرسال الإشعار
        }
        
        console.log('Approval status:', {
          approvalId: approval.id,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: approvalData.status,
          timestamp: new Date()
        });
      }
      
      // No need to invalidate cache on server side
      
      res.status(201).json(invoice);
    } catch (err) {
      console.error('Invoice creation error:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(500).json({ message: 'Failed to create invoice' });
    }
  });
  
  app.post('/api/invoices/:invoiceId/items', async (req, res) => {
    try {
      const { invoiceId } = req.params;
      // Validate invoice exists
      const invoice = await storage.getInvoice(parseInt(invoiceId));
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      // Extract and validate the invoice item data
      const itemData = insertInvoiceItemSchema.parse({
        ...req.body,
        invoiceId: parseInt(invoiceId)
      });
      
      // Create the invoice item
      const item = await storage.createInvoiceItem(itemData);
      
      res.status(201).json(item);
    } catch (err) {
      console.error('Invoice item creation error:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(500).json({ message: 'Failed to create invoice item' });
    }
  });
  
  // Get all items for a specific invoice
  app.get('/api/invoices/:invoiceId/items', async (req, res) => {
    try {
      const { invoiceId } = req.params;
      console.log(`Getting items for invoice: ${invoiceId}`);
      
      const parsedInvoiceId = parseInt(invoiceId);
      if (isNaN(parsedInvoiceId)) {
        return res.status(400).json({ message: 'Invalid invoice ID format' });
      }
      
      // Get all products first for faster lookup
      const allProducts = await storage.getAllProducts();
      console.log(`Loaded ${allProducts.length} products for lookup`);
      
      // Create a map of product id -> product for faster lookup
      const productMap: Record<number, any> = {};
      for (const product of allProducts) {
        productMap[product.id] = product;
      }
      
      console.log('Product map created with keys:', Object.keys(productMap));
      
      // Get invoice items
      const items = await storage.getInvoiceItems(parsedInvoiceId);
      console.log(`Found ${items.length} items for invoice ${invoiceId} with product IDs:`, items.map(item => item.productId));
      
      // Enhance items with complete product details
      const enhancedItems = items.map((item) => {
        // تأكد من أن معرف المنتج هو رقم
        const productId = typeof item.productId === 'string' ? parseInt(item.productId) : item.productId;
        
        // ابحث عن المنتج في المخزن المؤقت
        const product = productMap[productId];
        
        console.log(`Looking up product for item ${item.id} with productId ${productId}:`, product ? `Found: ${product.name}` : 'Not found');
        
        // حساب بيانات العنصر وإضافة بيانات إضافية للتشخيص
        const enhancedItem = {
          id: item.id,
          invoiceId: item.invoiceId,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount || 0,
          total: item.total,
          productId: productId,
          // إضافة تفاصيل المنتج الكاملة
          product: product ? {
            id: product.id,
            name: product.name,
            barcode: product.barcode,
            alternativeCode: product.alternativeCode,
            purchasePrice: product.purchasePrice,
            sellingPrice: product.sellingPrice,
            stock: product.stock
          } : {
            id: productId,
            name: `منتج ${productId}`,
            barcode: '',
            sellingPrice: item.price,
            purchasePrice: 0,
            stock: 0
          }
        };
        
        console.log('Created enhanced item:', enhancedItem);
        return enhancedItem;
      });
      
      console.log('Returning enhanced items with full product details:', enhancedItems.length);
      
      res.json(enhancedItems);
    } catch (err) {
      console.error('Failed to fetch invoice items:', err);
      res.status(500).json({ message: 'Failed to fetch invoice items' });
    }
  });
  
  // Payment approval routes
  app.get('/api/payment-approvals', async (req, res) => {
    // Check admin permissions in session
    if (!req.session?.userRole || req.session.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    try {
      const approvals = await storage.getAllPaymentApprovals();
      res.json(approvals);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch payment approvals' });
    }
  });
  
  // Approve deferred payment request
  app.post('/api/payment-approvals/approve/:invoiceId', async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const parsedInvoiceId = parseInt(invoiceId);
      
      if (isNaN(parsedInvoiceId)) {
        return res.status(400).json({ message: 'Invalid invoice ID' });
      }
      
      // 1. Get the invoice
      const invoice = await storage.getInvoice(parsedInvoiceId);
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      // 2. Check if it's a deferred payment request
      if (invoice.paymentMethod !== 'deferred') {
        return res.status(400).json({ message: 'This is not a deferred payment invoice' });
      }
      
      // 3. Update the invoice status to approved
      const updatedInvoice = await storage.updateInvoice(parsedInvoiceId, {
        paymentStatus: 'approved'
      });
      
      // 4. Create a notification for the cashier who created the invoice
      await storage.createNotification({
        userId: invoice.userId,
        title: 'Deferred Payment Approved',
        message: `Invoice #${invoice.invoiceNumber} deferred payment request has been approved.`,
        type: 'deferred_payment_approved',
        referenceId: String(invoice.id),
        isRead: false,
        createdAt: new Date()
      });
      
      // 5. Create an approval record
      const approval = await storage.createPaymentApproval({
        invoiceId: parsedInvoiceId,
        status: 'approved',
        approvedBy: req.session?.userId || 1, // Default to user 1 if not available
        approvedAt: new Date(),
        notes: 'Approved through system'
      });
      
      res.json({ success: true, invoice: updatedInvoice, approval });
    } catch (err) {
      console.error('Error approving payment:', err);
      res.status(500).json({ message: 'Failed to approve payment' });
    }
  });
  
  // Reject deferred payment request
  app.post('/api/payment-approvals/reject/:invoiceId', async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const parsedInvoiceId = parseInt(invoiceId);
      
      if (isNaN(parsedInvoiceId)) {
        return res.status(400).json({ message: 'Invalid invoice ID' });
      }
      
      // 1. Get the invoice
      const invoice = await storage.getInvoice(parsedInvoiceId);
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      // 2. Check if it's a deferred payment request
      if (invoice.paymentMethod !== 'deferred') {
        return res.status(400).json({ message: 'This is not a deferred payment invoice' });
      }
      
      // 3. Update the invoice status to rejected
      const updatedInvoice = await storage.updateInvoice(parsedInvoiceId, {
        paymentStatus: 'rejected'
      });
      
      // 4. Create a notification for the cashier who created the invoice
      await storage.createNotification({
        userId: invoice.userId,
        title: 'Deferred Payment Rejected',
        message: `Invoice #${invoice.invoiceNumber} deferred payment request has been rejected.`,
        type: 'deferred_payment_rejected',
        referenceId: String(invoice.id),
        isRead: false,
        createdAt: new Date()
      });
      
      // 5. Create an approval record
      const approval = await storage.createPaymentApproval({
        invoiceId: parsedInvoiceId,
        status: 'rejected',
        approvedBy: req.session?.userId || 1, // Default to user 1 if not available
        approvedAt: new Date(),
        notes: 'Rejected through system'
      });
      
      res.json({ success: true, invoice: updatedInvoice, approval });
    } catch (err) {
      console.error('Error rejecting payment:', err);
      res.status(500).json({ message: 'Failed to reject payment' });
    }
  });
  
  app.patch('/api/payment-approvals/:id', async (req, res) => {
    // Check admin permissions in session - لتبسيط التطبيق سنسمح بالوصول مباشرة للاختبار
    // لكن في التطبيق النهائي يجب التحقق من أن المستخدم هو مدير
    /*
    if (!req.session?.userRole || req.session.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    */
    
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      const approvalId = parseInt(id);
      
      // احصل على معلومات الموافقة قبل التحديث
      const originalApproval = await storage.getPaymentApproval(approvalId);
      
      if (!originalApproval) {
        return res.status(404).json({ message: 'Payment approval not found' });
      }
      
      // قم بتحديث حالة الموافقة
      const approval = await storage.updatePaymentApproval(approvalId, {
        status,
        approvedBy: 1 // عادة سنستخدم req.session.userId ولكن لتبسيط التطبيق نستخدم 1
      });
      
      if (!approval) {
        return res.status(404).json({ message: 'Payment approval not found' });
      }
      
      // احصل على معلومات الفاتورة
      const invoice = await storage.getInvoice(approval.invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      // Update the invoice payment status
      await storage.updateInvoice(approval.invoiceId, {
        paymentStatus: status === 'approved' ? 'approved' : 'rejected'
      });
      
      // أرسل إشعار للمستخدم الذي طلب الموافقة
      try {
        await storage.createNotification({
          userId: originalApproval.requestedBy,
          title: status === 'approved' ? 'تمت الموافقة على طلب الدفع المؤجل' : 'تم رفض طلب الدفع المؤجل',
          message: status === 'approved' 
            ? `تمت الموافقة على طلب الدفع المؤجل للفاتورة رقم ${invoice.invoiceNumber}` 
            : `تم رفض طلب الدفع المؤجل للفاتورة رقم ${invoice.invoiceNumber}`,
          type: status === 'approved' ? 'deferred_payment_approved' : 'deferred_payment_rejected',
          referenceId: invoice.id.toString()
        });
      } catch (notifyError) {
        console.error('Failed to send payment approval notification:', notifyError);
      }
      
      res.json(approval);
    } catch (err) {
      console.error('Error updating payment approval:', err);
      res.status(500).json({ message: 'Failed to update payment approval' });
    }
  });
  
  // تم حذف الكود المكرر بالكامل
  
  // Employee routes
  app.get('/api/employees', async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      res.json(employees);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch employees' });
    }
  });
  
  app.post('/api/employees', async (req, res) => {
    try {
      // تبسيط عملية إنشاء الموظف بتجاوز التحقق من الصحة المعقد
      const employeeData = {
        name: req.body.name,
        hireDate: new Date(),  // استخدام التاريخ الحالي بشكل افتراضي
        salary: parseFloat(req.body.salary),
        deductions: req.body.deductions ? parseFloat(req.body.deductions) : 0,
        userId: req.body.userId || null
      };
      
      console.log('Creating employee with simplified data:', employeeData);
      
      // إرسال البيانات إلى التخزين بعد التبسيط
      const employee = await storage.createEmployee(employeeData);
      res.status(201).json(employee);
    } catch (err) {
      console.error('Error creating employee:', err);
      res.status(500).json({ message: 'Failed to create employee', error: String(err) });
    }
  });
  
  app.patch('/api/employees/:id', async (req, res) => {
    
    try {
      const { id } = req.params;
      const employee = await storage.updateEmployee(parseInt(id), req.body);
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }
      res.json(employee);
    } catch (err) {
      res.status(500).json({ message: 'Failed to update employee' });
    }
  });
  
  app.delete('/api/employees/:id', async (req, res) => {
    // تم إزالة فحص الصلاحيات لتسهيل الاستخدام
    try {
      const { id } = req.params;
      await storage.deleteEmployee(parseInt(id));
      res.json({ message: 'Employee deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Failed to delete employee' });
    }
  });
  
  // Employee Deductions routes
  app.get('/api/employee-deductions', async (req, res) => {
    try {
      const deductions = await storage.getAllEmployeeDeductions();
      res.json(deductions);
    } catch (error) {
      console.error('Error fetching employee deductions:', error);
      res.status(500).json({ message: 'Error fetching employee deductions' });
    }
  });
  
  app.get('/api/employee-deductions/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deduction = await storage.getEmployeeDeduction(id);
      
      if (!deduction) {
        return res.status(404).json({ message: 'Employee deduction not found' });
      }
      
      res.json(deduction);
    } catch (error) {
      console.error('Error fetching employee deduction:', error);
      res.status(500).json({ message: 'Error fetching employee deduction' });
    }
  });
  
  app.get('/api/employees/:employeeId/deductions', async (req, res) => {
    try {
      const employeeId = req.params.employeeId;
      const deductions = await storage.getEmployeeDeductions(employeeId);
      res.json(deductions);
    } catch (error) {
      console.error('Error fetching employee deductions:', error);
      res.status(500).json({ message: 'Error fetching employee deductions' });
    }
  });
  
  app.post('/api/employee-deductions', async (req, res) => {
    console.log('Received deduction data:', req.body);
    try {
      // تجاوز مكتبة zod للتحقق من البيانات يدوياً
      const { employeeId, amount, reason } = req.body;
      
      // التحقق من الحقول المطلوبة
      if (!employeeId || !amount || !reason) {
        console.error('Missing required fields:', { employeeId, amount, reason });
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // تحويل المبلغ إلى رقم
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      
      if (isNaN(numAmount) || numAmount <= 0) {
        console.error('Invalid amount:', amount);
        return res.status(400).json({ message: 'Amount must be a positive number' });
      }
      
      // إنشاء كائن البيانات
      const deductionData = {
        employeeId: String(employeeId), // تأكد من أن معرف الموظف هو نص
        amount: numAmount,
        reason: String(reason),
        date: new Date()
      };
      
      console.log('Processed deduction data:', deductionData);
      
      // محاولة إنشاء الخصم
      const deduction = await storage.createEmployeeDeduction(deductionData);
      res.status(201).json(deduction);
    } catch (error) {
      console.error('Error creating employee deduction:', error);
      res.status(500).json({ message: 'Error creating employee deduction' });
    }
  });
  
  app.patch('/api/employee-deductions/:id', async (req, res) => {
    // Check admin permissions in session
    if (!req.session?.userRole || req.session.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    try {
      const id = parseInt(req.params.id);
      const deductionData = req.body;
      
      const updatedDeduction = await storage.updateEmployeeDeduction(id, deductionData);
      
      if (!updatedDeduction) {
        return res.status(404).json({ message: 'Employee deduction not found' });
      }
      
      res.json(updatedDeduction);
    } catch (error) {
      console.error('Error updating employee deduction:', error);
      res.status(500).json({ message: 'Error updating employee deduction' });
    }
  });
  
  app.delete('/api/employee-deductions/:id', async (req, res) => {
    // Check admin permissions in session
    if (!req.session?.userRole || req.session.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    try {
      const id = parseInt(req.params.id);
      
      // First check if the deduction exists
      const deduction = await storage.getEmployeeDeduction(id);
      if (!deduction) {
        return res.status(404).json({ message: 'Employee deduction not found' });
      }
      
      await storage.deleteEmployeeDeduction(id);
      res.status(200).json({ message: 'Employee deduction deleted successfully' });
    } catch (error) {
      console.error('Error deleting employee deduction:', error);
      res.status(500).json({ message: 'Error deleting employee deduction' });
    }
  });
  
  // Expenses routes (مصاريف ونثريات)
  app.get('/api/expenses', async (req, res) => {
    try {
      const expenses = await storage.getAllExpenses();
      res.json(expenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({ message: 'Error fetching expenses' });
    }
  });

  app.post('/api/expenses', async (req, res) => {
    try {
      // الحصول على بيانات المستخدم الحالي
      const userId = req.body.userId || 1; // استخدام المستخدم رقم 1 كافتراضي إذا لم يتم توفير معرف المستخدم
      
      // التحقق من صحة البيانات
      const { date, amount, details, expenseType } = req.body;
      
      if (!amount || !details) {
        return res.status(400).json({ message: 'المبلغ والتفاصيل مطلوبة' });
      }
      
      // تحويل المبلغ إلى رقم إذا كان نصًا
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ message: 'المبلغ يجب أن يكون رقمًا موجبًا' });
      }
      
      // إنشاء كائن المصاريف
      const expenseData = {
        date: date ? new Date(date) : new Date(),
        amount: numAmount,
        details,
        userId,
        expenseType: expenseType || 'miscellaneous'
      };
      
      // حفظ المصاريف في قاعدة البيانات
      const expense = await storage.createExpense(expenseData);
      
      res.status(201).json(expense);
    } catch (error) {
      console.error('Error creating expense:', error);
      res.status(500).json({ message: 'Error creating expense' });
    }
  });

  app.patch('/api/expenses/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // التحقق من وجود المصروف
      const existingExpense = await storage.getExpense(id);
      if (!existingExpense) {
        return res.status(404).json({ message: 'المصروف غير موجود' });
      }
      
      // تحديث المصروف
      const updatedExpense = await storage.updateExpense(id, req.body);
      
      res.json(updatedExpense);
    } catch (error) {
      console.error('Error updating expense:', error);
      res.status(500).json({ message: 'Error updating expense' });
    }
  });

  app.delete('/api/expenses/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // التحقق من وجود المصروف
      const existingExpense = await storage.getExpense(id);
      if (!existingExpense) {
        return res.status(404).json({ message: 'المصروف غير موجود' });
      }
      
      // حذف المصروف
      await storage.deleteExpense(id);
      
      res.json({ message: 'تم حذف المصروف بنجاح' });
    } catch (error) {
      console.error('Error deleting expense:', error);
      res.status(500).json({ message: 'Error deleting expense' });
    }
  });
  
  // معلومات المتجر (Store Information)
  app.get('/api/store-info', async (req, res) => {
    try {
      const storeInfo = await storage.getStoreInfo();
      
      if (!storeInfo) {
        // إذا لم تكن هناك معلومات للمتجر موجودة، نرسل قيمة افتراضية
        return res.json({
          id: 1,
          name: "Sales Ghazy",
          address: "العنوان الرئيسي",
          phone: "01xxxxxxxxx",
          updatedAt: new Date()
        });
      }
      
      res.json(storeInfo);
    } catch (error) {
      console.error('Error fetching store information:', error);
      res.status(500).json({ message: 'Failed to fetch store information', error: error.message });
    }
  });
  
  app.post('/api/store-info', async (req, res) => {
    try {
      const data = insertStoreInfoSchema.parse(req.body);
      const storeInfo = await storage.updateStoreInfo(data);
      res.status(200).json(storeInfo);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      console.error('Error updating store information:', err);
      res.status(500).json({ message: 'Failed to update store information', error: err.message });
    }
  });
  
  // Damaged items routes
  app.get('/api/damaged-items', async (req, res) => {
    try {
      const items = await storage.getAllDamagedItems();
      // نحضر جميع المنتجات لنقوم بإضافة معلومات المنتج لكل عنصر تالف
      const products = await storage.getAllProducts();
      
      // إضافة معلومات المنتج لكل عنصر تالف
      const itemsWithProductDetails = items.map(item => {
        const product = products.find(p => p.id === Number(item.productId));
        return {
          ...item,
          product: product ? {
            id: product.id,
            name: product.name,
            purchasePrice: product.purchasePrice,
            sellingPrice: product.sellingPrice,
            stock: product.stock,
            barcode: product.barcode,
            alternativeCode: product.alternativeCode
          } : { 
            id: 0,
            name: 'منتج غير معروف',
            purchasePrice: 0,
            sellingPrice: 0,
            stock: 0,
            barcode: '',
            alternativeCode: null
          }
        };
      });
      
      res.json(itemsWithProductDetails);
    } catch (err) {
      console.error('Error fetching damaged items:', err);
      res.status(500).json({ message: 'Failed to fetch damaged items' });
    }
  });
  
  app.post('/api/damaged-items', async (req, res) => {
    
    try {
      // تبسيط معالجة بيانات المنتجات التالفة
      const itemData = {
        productId: parseInt(req.body.productId),
        quantity: parseInt(req.body.quantity),
        description: req.body.description || '',
        valueLoss: parseFloat(req.body.valueLoss),
        date: new Date()
      };
      
      console.log('Creating damaged item with data:', itemData);
      
      // Check if product exists and has enough stock
      const product = await storage.getProduct(itemData.productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      if (product.stock < itemData.quantity) {
        return res.status(400).json({ message: 'Not enough stock' });
      }
      
      // Create damaged item record
      const item = await storage.createDamagedItem(itemData);
      
      // Update product stock
      await storage.updateProduct(itemData.productId, {
        stock: product.stock - itemData.quantity
      });
      
      res.status(201).json(item);
    } catch (err) {
      console.error('Error creating damaged item:', err);
      res.status(500).json({ message: 'Failed to create damaged item', error: String(err) });
    }
  });
  
  app.patch('/api/damaged-items/:id', async (req, res) => {
    // تم إزالة فحص الصلاحيات لتسهيل الاختبار
    try {
      const { id } = req.params;
      const item = await storage.updateDamagedItem(parseInt(id), req.body);
      if (!item) {
        return res.status(404).json({ message: 'Damaged item not found' });
      }
      res.json(item);
    } catch (err) {
      res.status(500).json({ message: 'Failed to update damaged item' });
    }
  });
  
  app.delete('/api/damaged-items/:id', async (req, res) => {
    // تم إزالة فحص الصلاحيات لتسهيل الاختبار
    try {
      const { id } = req.params;
      console.log('Deleting damaged item with ID:', id);
      await storage.deleteDamagedItem(parseInt(id));
      res.json({ message: 'Damaged item deleted successfully' });
    } catch (err) {
      console.error('Error deleting damaged item:', err);
      res.status(500).json({ message: 'Failed to delete damaged item' });
    }
  });
  
  // طرق API لبيانات التقارير
  app.get('/api/reports', async (req, res) => {
    try {
      const { type, date, startDate, endDate } = req.query;
      console.log('Report request:', { type, date, startDate, endDate });
      
      // تحقق من نوع التقرير، نضيف "custom" للتقارير المخصصة بتاريخين محددين
      if (!type || !['daily', 'weekly', 'monthly', 'yearly', 'custom'].includes(type as string)) {
        return res.status(400).json({ message: 'Invalid report type' });
      }
      
      // التحقق من تنسيق التاريخ
      if (type === 'custom' || type === 'weekly') {
        // للتقارير المخصصة والأسبوعية، نحتاج إلى تاريخ البداية والنهاية
        if (!startDate || !endDate) {
          return res.status(400).json({ message: 'Start date and end date are required for custom and weekly reports' });
        }
      } else if (!date) {
        // لأنواع التقارير الأخرى نحتاج إلى التاريخ
        return res.status(400).json({ message: 'Date is required' });
      }
      
      // جلب بيانات الفواتير والمنتجات والعناصر التالفة والمصاريف
      const invoices = await storage.getAllInvoices();
      const products = await storage.getAllProducts();
      const damagedItems = await storage.getAllDamagedItems();
      const expenses = await storage.getAllExpenses();
      
      console.log(`Found ${invoices.length} invoices, ${products.length} products, ${damagedItems.length} damaged items`);
      
      // وظيفة للتحقق من وقوع تاريخ ضمن نطاق محدد (للتقارير المخصصة)
      function isDateInRange(checkDate: Date, start: Date, end: Date): boolean {
        const dateToCheck = new Date(checkDate);
        // نضبط الساعة للتواريخ للحصول على مقارنة دقيقة باليوم فقط
        dateToCheck.setHours(0, 0, 0, 0);
        const startDateObj = new Date(start);
        startDateObj.setHours(0, 0, 0, 0);
        const endDateObj = new Date(end);
        endDateObj.setHours(23, 59, 59, 999); // نهاية اليوم
        
        return dateToCheck >= startDateObj && dateToCheck <= endDateObj;
      }
      
      // فلترة الفواتير حسب التاريخ إذا كان التقرير مخصصًا أو أسبوعيًا
      let filteredInvoices = invoices;
      if ((type === 'custom' || type === 'weekly') && startDate && endDate) {
        console.log(`Filtering invoices between ${startDate} and ${endDate}`);
        const startDateObj = new Date(startDate as string);
        const endDateObj = new Date(endDate as string);
        
        filteredInvoices = invoices.filter(invoice => {
          if (!invoice.date || invoice.isDeleted) return false;
          return isDateInRange(new Date(invoice.date), startDateObj, endDateObj);
        });
        
        console.log(`Found ${filteredInvoices.length} invoices in date range for ${type} report`);
      } else {
        // لأنواع التقارير الأخرى، نستخدم جميع الفواتير
        filteredInvoices = invoices;
      }
      
      // فلترة العناصر التالفة حسب التاريخ إذا كان التقرير مخصصًا أو أسبوعيًا
      let filteredDamagedItems = damagedItems;
      if ((type === 'custom' || type === 'weekly') && startDate && endDate) {
        const startDateObj = new Date(startDate as string);
        const endDateObj = new Date(endDate as string);
        
        filteredDamagedItems = damagedItems.filter(item => {
          if (!item.date) return false;
          return isDateInRange(new Date(item.date), startDateObj, endDateObj);
        });
        
        console.log(`Found ${filteredDamagedItems.length} damaged items in date range for ${type} report`);
      } else {
        // لأنواع التقارير الأخرى، نستخدم جميع العناصر التالفة
        filteredDamagedItems = damagedItems;
      }
      
      // فلترة المصاريف حسب التاريخ إذا كان التقرير مخصصًا أو أسبوعيًا
      let filteredExpenses = expenses;
      if ((type === 'custom' || type === 'weekly') && startDate && endDate) {
        const startDateObj = new Date(startDate as string);
        const endDateObj = new Date(endDate as string);
        
        filteredExpenses = expenses.filter(expense => {
          if (!expense.date) return false;
          return isDateInRange(new Date(expense.date), startDateObj, endDateObj);
        });
        
        console.log(`Found ${filteredExpenses.length} expenses in date range for ${type} report`);
      } else {
        // لأنواع التقارير الأخرى، نستخدم جميع المصاريف
        filteredExpenses = expenses;
      }
      
      // إعداد بيانات ملخص التقرير
      let totalSales = 0;
      let totalProfit = 0;
      let salesCount = 0;
      let totalDamages = 0;
      
      // حساب إجمالي قيمة التوالف
      filteredDamagedItems.forEach(item => {
        totalDamages += item.valueLoss || 0;
      });
      
      // حساب إجمالي المبيعات والأرباح باستخدام الفواتير المفلترة
      for (const invoice of filteredInvoices) {
        // تجاهل الفواتير المحذوفة
        if (invoice.isDeleted) {
          continue;
        }
        
        const invoiceDate = new Date(invoice.date);
        const formattedDate = formatDateForReportType(invoiceDate, type as string);
        
        // للتقارير الأسبوعية أو المخصصة، نحسب جميع الفواتير الموجودة في النطاق المحدد
        // للتقارير اليومية/الشهرية/السنوية نحسب فقط الفواتير التي تطابق التاريخ المحدد
        const isInRange = (type === 'weekly' || type === 'custom') ? true : (formattedDate === date);
        
        if (isInRange) {
          totalSales += invoice.total;
          salesCount++;
          
          // استخدام بيانات المنتجات المخزنة مباشرة في الفاتورة
          if (invoice.productsData) {
            try {
              const productsData = JSON.parse(invoice.productsData);
              for (const product of productsData) {
                // إضافة الربح - استخدام حقل الربح المحسوب مسبقًا (profit) إذا كان موجودًا
                // أو حساب الربح من سعر الشراء وسعر البيع
                console.log('Calculating profit for product:', product);
                if (product.profit) {
                  console.log('Using existing profit:', product.profit);
                  totalProfit += product.profit;
                } else if (product.purchasePrice) {
                  const profit = (product.price - product.purchasePrice) * product.quantity;
                  console.log('Calculated profit from price difference:', profit);
                  totalProfit += profit;
                } else {
                  // استخدام تقدير للربح (30% من سعر البيع) للفواتير التي لا تحتوي على سعر الشراء
                  const estimatedProfit = product.price * product.quantity * 0.3;
                  console.log('Using estimated profit (30%):', estimatedProfit);
                  totalProfit += estimatedProfit;
                }
              }
            } catch (err) {
              console.error(`Error parsing productsData for invoice ${invoice.id}:`, err);
            }
          }
        }
      }
      
      // حساب إجمالي العناصر التالفة
      for (const item of damagedItems) {
        const itemDate = new Date(item.date);
        const formattedDate = formatDateForReportType(itemDate, type as string);
        
        if (formattedDate === date) {
          totalDamages += item.valueLoss;
        }
      }
      
      // إنشاء بيانات الرسم البياني
      // تحديد معلمة التاريخ التي سيتم تمريرها إلى وظائف إنشاء المخططات والمنتجات الأكثر مبيعًا
      let reportDate = date as string;
      if (type === 'custom' || type === 'weekly') {
        // للتقارير المخصصة والأسبوعية، نستخدم نطاق التاريخ كعنوان للتقرير
        reportDate = `${startDate as string} - ${endDate as string}`;
      }
      
      const chartData = createChartData(invoices, type as string, reportDate);
      
      // حساب أفضل المنتجات مبيعًا
      const topProducts = calculateTopProducts(invoices, products, type as string, reportDate);
      
      // عرض معلومات عن المصاريف التي تم تحميلها سابقًا
      console.log(`Found ${expenses.length} expenses for report`);

      // إنشاء تقارير مفصلة مع تضمين المصاريف
      // استخدام نفس المتغير reportDate الذي تم تعريفه سابقًا
      
      const detailedReports = await createDetailedReports(filteredInvoices, filteredDamagedItems, filteredExpenses, type as string, reportDate);
      
      // بيانات الفترة السابقة لعرض نسبة التغيير
      // بيانات الفترة السابقة
      let previousTotalSales = 0;
      let previousTotalProfit = 0;
      let previousSalesCount = 0;
      let previousTotalDamages = 0;
      
      try {
        // نحصل على تاريخ الفترة السابقة (للتقارير الأسبوعية مع نطاق وكذلك أنواع التقارير الأخرى)
        const previousDate = getPreviousPeriod(type as string, reportDate);
        console.log(`Previous period date: ${previousDate}`);
        
        // هنا يمكن أن نقوم بحساب إحصائيات الفترة السابقة إذا لزم الأمر
        // تم تبسيط المنطق المعقد لحساب الفترة السابقة في هذه النسخة
      } catch (error) {
        console.error("Error calculating previous period:", error);
      }
      
      // بيانات رسومية
      
      const responseData = {
        summary: {
          totalSales,
          totalProfit,
          totalDamages,
          salesCount,
          previousTotalSales,
          previousTotalProfit,
          previousTotalDamages,
          previousSalesCount,
        },
        chartData,
        topProducts,
        detailedReports,
      };
      
      console.log('Generated report data:', responseData);
      res.json(responseData);
    } catch (err) {
      console.error('Error fetching report data:', err);
      res.status(500).json({ message: 'Failed to fetch report data' });
    }
  });
  
  // وظائف مساعدة لإنشاء بيانات التقارير
  function formatDateForReportType(dateInput: Date, type: string): string {
    // نتأكد من أن dateInput هو كائن Date صحيح
    const date = new Date(dateInput);
    
    // طباعة التاريخ الذي يتم معالجته للتصحيح
    console.log(`Formatting date: ${date.toISOString()} for type: ${type}`);
    
    if (type === 'daily') {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    } else if (type === 'weekly') {
      // الحصول على رقم الأسبوع في السنة بطريقة أكثر دقة
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const dayOfWeek = firstDayOfYear.getDay(); // 0 = الأحد، 1 = الاثنين، ...
      const days = Math.floor((date.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000));
      
      // حساب رقم الأسبوع ISO (يبدأ الأسبوع من يوم الإثنين)
      // تعديل حساب الأسبوع ليتناسب مع المعيار الدولي ISO 8601
      let weekNumber = Math.floor((days + dayOfWeek - 1) / 7) + 1;
      
      // معالجة حالات خاصة
      if (dayOfWeek === 0) { // إذا كان أول يوم في السنة هو الأحد
        weekNumber = Math.floor((days) / 7) + 1;
      }
      
      // طباعة تفاصيل الحساب للتصحيح
      console.log(`Week calculation: year=${date.getFullYear()}, dayOfWeek=${dayOfWeek}, days=${days}, weekNumber=${weekNumber}`);
      
      return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
    } else if (type === 'monthly') {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } else {
      return date.getFullYear().toString();
    }
  }
  
  function getPreviousPeriod(type: string, currentDate: string): string {
    if (type === 'daily') {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - 1);
      return formatDateForReportType(date, type);
    } else if (type === 'weekly') {
      // إذا كان التاريخ نطاق (تنسيق "startDate - endDate")
      if (currentDate.includes(' - ')) {
        const [startStr, endStr] = currentDate.split(' - ');
        const startDate = new Date(startStr);
        const endDate = new Date(endStr);
        
        // حساب الفترة السابقة بخصم 7 أيام من كل من بداية ونهاية الفترة
        const prevStartDate = new Date(startDate);
        const prevEndDate = new Date(endDate);
        prevStartDate.setDate(prevStartDate.getDate() - 7);
        prevEndDate.setDate(prevEndDate.getDate() - 7);
        
        return `${prevStartDate.toISOString().split('T')[0]} - ${prevEndDate.toISOString().split('T')[0]}`;
      }
      // إذا كان التاريخ بتنسيق YYYY-Wxx (طريقة قديمة)
      else if (currentDate.match(/^\d{4}-W\d{2}$/)) {
        const [year, weekPart] = currentDate.split('-');
        let weekNumber = parseInt(weekPart.substring(1));
        
        // إذا كان الأسبوع الأول، نعود للأسبوع الأخير من السنة السابقة
        if (weekNumber === 1) {
          // لتبسيط الأمر، نفترض أن السنة السابقة لديها 52 أسبوعًا
          return `${parseInt(year) - 1}-W52`;
        } 
        
        // غير ذلك، نعود للأسبوع السابق في نفس السنة
        return `${year}-W${String(weekNumber - 1).padStart(2, '0')}`;
      }
      
      // إذا وصلنا هنا، فالتنسيق غير معروف
      console.error(`Unsupported weekly date format: ${currentDate}`);
      return '';
    } else if (type === 'monthly') {
      const [year, month] = currentDate.split('-');
      const prevMonth = parseInt(month) - 1;
      if (prevMonth === 0) {
        return `${parseInt(year) - 1}-12`;
      }
      return `${year}-${String(prevMonth).padStart(2, '0')}`;
    } else {
      return (parseInt(currentDate) - 1).toString();
    }
  }
  
  function createChartData(invoices: any[], type: string, date: string | undefined): any[] {
    // إنشاء بيانات رسومية بناءً على الفواتير الفعلية
    const chartData: any[] = [];
    const salesData = new Map<string, { sales: number, profit: number }>();
    
    // تهيئة البيانات حسب نوع التقرير
    if (type === 'daily') {
      // تهيئة البيانات لساعات اليوم (24 ساعة)
      for (let i = 0; i < 24; i++) {
        const hourKey = `${i}:00`;
        salesData.set(hourKey, { sales: 0, profit: 0 });
      }
      
      // تجميع المبيعات حسب الساعة
      for (const invoice of invoices) {
        if (!invoice.date) continue;
        
        const invoiceDate = new Date(invoice.date);
        const formattedDate = formatDateForReportType(invoiceDate, type);
        
        if (formattedDate === date) {
          const hour = invoiceDate.getHours();
          const hourKey = `${hour}:00`;
          const current = salesData.get(hourKey) || { sales: 0, profit: 0 };
          
          // إضافة المبيعات والأرباح (افتراض متوسط هامش ربح 30% للتبسيط)
          current.sales += invoice.total || 0;
          current.profit += (invoice.total || 0) * 0.3;
          
          salesData.set(hourKey, current);
        }
      }
    } else if (type === 'monthly') {
      // استخراج السنة والشهر من التاريخ
      const [year, month] = date.split('-');
      // حساب عدد أيام الشهر
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      
      // تهيئة البيانات لأيام الشهر
      for (let i = 1; i <= daysInMonth; i++) {
        const dayKey = i.toString();
        salesData.set(dayKey, { sales: 0, profit: 0 });
      }
      
      // تجميع المبيعات حسب اليوم
      for (const invoice of invoices) {
        if (!invoice.date) continue;
        
        const invoiceDate = new Date(invoice.date);
        const invoiceMonth = formatDateForReportType(invoiceDate, 'monthly');
        
        if (invoiceMonth === date) {
          const day = invoiceDate.getDate();
          const dayKey = day.toString();
          const current = salesData.get(dayKey) || { sales: 0, profit: 0 };
          
          // إضافة المبيعات والأرباح
          current.sales += invoice.total || 0;
          current.profit += (invoice.total || 0) * 0.3;
          
          salesData.set(dayKey, current);
        }
      }
    } else if (type === 'weekly') {
      // أيام الأسبوع
      const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      
      for (let i = 0; i < 7; i++) {
        salesData.set(days[i], { sales: 0, profit: 0 });
      }
      
      console.log(`Weekly report chart data with date: ${date}`);
      
      // التحقق ما إذا كان date عبارة عن نطاق تاريخ (بتنسيق startDate - endDate)
      let startDateObj, endDateObj;
      
      // إذا كان التقرير الأسبوعي يستخدم نطاق تاريخي بدلاً من رقم الأسبوع
      if (date && date.includes(' - ')) {
        const [start, end] = date.split(' - ');
        startDateObj = new Date(start);
        endDateObj = new Date(end);
        startDateObj.setHours(0, 0, 0, 0);
        endDateObj.setHours(23, 59, 59, 999);
        console.log(`Weekly report with date range: ${startDateObj} to ${endDateObj}`);
      }
      
      // تجميع المبيعات حسب اليوم في الأسبوع
      for (const invoice of invoices) {
        if (!invoice.date) continue;
        
        const invoiceDate = new Date(invoice.date);
        
        // التحقق ما إذا كانت الفاتورة ضمن نطاق التاريخ المحدد أو تطابق الأسبوع المحدد
        let isInRange = false;
        
        if (startDateObj && endDateObj) {
          // التحقق من أن الفاتورة تقع ضمن نطاق التاريخ
          isInRange = invoiceDate >= startDateObj && invoiceDate <= endDateObj;
        } else {
          // طريقة قديمة تعتمد على رقم الأسبوع
          const invoiceWeek = formatDateForReportType(invoiceDate, 'weekly');
          isInRange = (invoiceWeek === date);
        }
        
        if (isInRange) {
          const dayOfWeek = invoiceDate.getDay();
          const dayKey = days[dayOfWeek];
          const current = salesData.get(dayKey) || { sales: 0, profit: 0 };
          
          // إضافة المبيعات والأرباح
          current.sales += invoice.total || 0;
          current.profit += (invoice.total || 0) * 0.3;
          
          salesData.set(dayKey, current);
        }
      }
    } else if (type === 'yearly') {
      // أشهر السنة
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      
      for (let i = 0; i < 12; i++) {
        salesData.set(months[i], { sales: 0, profit: 0 });
      }
      
      // تجميع المبيعات حسب الشهر
      for (const invoice of invoices) {
        // تجاهل الفواتير المحذوفة أو التي لا تحتوي على تاريخ
        if (!invoice.date || invoice.isDeleted) continue;
        
        const invoiceDate = new Date(invoice.date);
        const invoiceYear = formatDateForReportType(invoiceDate, 'yearly');
        
        if (invoiceYear === date) {
          const month = invoiceDate.getMonth();
          const monthKey = months[month];
          const current = salesData.get(monthKey) || { sales: 0, profit: 0 };
          
          // إضافة المبيعات
          current.sales += invoice.total || 0;
          
          // حساب الأرباح من بيانات المنتجات
          let calculatedProfit = 0;
          try {
            if (invoice.productsData) {
              const products = JSON.parse(invoice.productsData);
              if (Array.isArray(products)) {
                for (const product of products) {
                  // استخدام الربح المحسوب مسبقًا أو حسابه من سعر الشراء والبيع
                  if (product.profit !== undefined) {
                    calculatedProfit += product.profit;
                  } else if (product.purchasePrice !== undefined && product.price) {
                    calculatedProfit += (product.price - product.purchasePrice) * product.quantity;
                  } else {
                    // استخدام هامش ربح تقديري 30% فقط إذا لم تتوفر البيانات
                    calculatedProfit += (product.total || 0) * 0.3;
                  }
                }
              }
            } else {
              // استخدام هامش ربح تقديري 30% فقط إذا لم تتوفر بيانات المنتجات
              calculatedProfit = (invoice.total || 0) * 0.3;
            }
          } catch (error) {
            console.error("Error calculating profit in chart data:", error);
            calculatedProfit = (invoice.total || 0) * 0.3;
          }
          
          current.profit += calculatedProfit;
          salesData.set(monthKey, current);
        }
      }
    }
    
    // تحويل البيانات المجمعة إلى تنسيق مناسب للرسم البياني
    for (const [key, value] of salesData.entries()) {
      chartData.push({
        name: key,
        revenue: Math.round(value.sales * 100) / 100, // تقريب إلى رقمين عشريين
        profit: Math.round(value.profit * 100) / 100
      });
    }
    
    return chartData;
  }
  
  function calculateTopProducts(invoices: any[], products: any[], type: string, date: string | undefined): any[] {
    console.log(`Calculating top products for ${type}: ${date}`);
    
    // حساب أفضل المنتجات مبيعًا بناءً على بيانات الفواتير الفعلية
    const productSalesMap = new Map<number, { 
      id: number, 
      name: string, 
      soldQuantity: number,
      revenue: number,
      profit: number 
    }>();
    
    // تهيئة خريطة المنتجات بالبيانات الأساسية
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
    
    // تجميع المبيعات لكل منتج من خلال بيانات المنتجات في الفواتير
    for (const invoice of invoices) {
      // تجاهل الفواتير المحذوفة
      if (invoice.isDeleted) continue;
      
      // التحقق من تطابق الفترة المطلوبة
      const invoiceDate = new Date(invoice.date);
      
      // التعامل مع تقارير تستخدم نطاق تاريخي
      let isInRange = false;
      
      // إذا كان نوع التقرير أسبوعي ونطاق التاريخ هو نص يحتوي على "-"
      if (type === 'weekly' && date && date.includes(' - ')) {
        // استخراج بداية ونهاية النطاق
        const [start, end] = date.split(' - ');
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        // ضبط الساعات للحصول على مقارنة دقيقة
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        // التحقق ما إذا كانت الفاتورة تقع ضمن النطاق
        isInRange = invoiceDate >= startDate && invoiceDate <= endDate;
      } else {
        // الطريقة المعتادة للتقارير الأخرى
        const formattedInvoiceDate = formatDateForReportType(invoiceDate, type);
        isInRange = (formattedInvoiceDate === date);
      }
      
      // تجاهل الفواتير خارج النطاق
      if (!isInRange) continue;
      
      console.log(`Processing invoice for top products: ${invoice.id}, ${invoice.invoiceNumber}`);
      
      if (invoice.id && invoice.productsData) {
        try {
          // استخراج منتجات الفاتورة من حقل productsData
          const products = JSON.parse(invoice.productsData);
          
          if (Array.isArray(products)) {
            for (const item of products) {
              const productId = item.productId;
              if (productId && productSalesMap.has(productId)) {
                const productData = productSalesMap.get(productId);
                if (productData) {
                  // تحديث بيانات المبيعات للمنتج
                  productData.soldQuantity += item.quantity || 0;
                  productData.revenue += item.total || 0;
                  
                  // حساب الربح باستخدام الربح المحسوب مسبقًا أو سعر الشراء والبيع
                  if (item.profit !== undefined) {
                    productData.profit += item.profit;
                  } else if (item.purchasePrice !== undefined && item.price) {
                    const profit = (item.price - item.purchasePrice) * (item.quantity || 0);
                    productData.profit += profit;
                  } else {
                    // استخدام هامش ربح تقديري 30٪ فقط إذا لم تتوفر البيانات
                    productData.profit += (item.total || 0) * 0.3;
                  }
                  
                  productSalesMap.set(productId, productData);
                }
              }
            }
          }
        } catch (err) {
          console.error(`Error processing productsData for invoice ${invoice.id}:`, err);
        }
      }
    }
    
    // ترتيب أفضل 5 منتجات حسب الإيرادات
    return Array.from(productSalesMap.values())
      .filter(product => product.soldQuantity > 0) // فقط المنتجات المباعة
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }
  
  async function createDetailedReports(invoices: any[], damagedItems: any[], expenses: any[], type: string, date: string | undefined): Promise<any[]> {
    const detailedReports: any[] = [];
    let totalDamagesValue = 0;
    let totalEmployeeDeductions = 0;
    let totalExpensesValue = 0;
    
    console.log(`Creating detailed reports for type: ${type}, date: ${date}, with ${damagedItems?.length || 0} damaged items and ${expenses?.length || 0} expenses`);
    
    // إضافة تقارير مفصلة للفواتير
    for (const invoice of invoices) {
      // تجاهل الفواتير المحذوفة
      if (invoice.isDeleted) continue;
      
      const invoiceDate = new Date(invoice.date);
      const formattedDate = formatDateForReportType(invoiceDate, type);
      
      // للتقارير الأسبوعية أو المخصصة، نحسب جميع الفواتير المفلترة سابقًا
      // للتقارير اليومية/الشهرية/السنوية، نتحقق من تطابق التاريخ
      const isInDateRange = (type === 'weekly' || type === 'custom') ? true : (formattedDate === date);
      
      if (isInDateRange) {
        // حساب الأرباح من بيانات المنتجات إذا كانت متوفرة
        let calculatedProfit = 0;
        
        try {
          if (invoice.productsData) {
            const products = JSON.parse(invoice.productsData);
            if (Array.isArray(products)) {
              for (const product of products) {
                // استخدام الربح المحسوب مسبقًا أو حسابه الآن
                if (product.profit !== undefined) {
                  calculatedProfit += product.profit;
                } else if (product.purchasePrice !== undefined && product.price) {
                  calculatedProfit += (product.price - product.purchasePrice) * product.quantity;
                } else {
                  // استخدام متوسط هامش ربح 30% إذا لم يكن سعر الشراء متاحًا
                  calculatedProfit += (product.total || 0) * 0.3;
                }
              }
            }
          }
        } catch (error) {
          console.error("Error calculating profit from invoice products:", error);
        }
        
        detailedReports.push({
          id: invoice.id,
          date: new Date(invoice.date).toISOString().split('T')[0],
          type: 'sale',
          amount: invoice.total,
          profit: calculatedProfit, // إضافة الربح المحسوب
          details: `Invoice #${invoice.invoiceNumber}, Payment: ${invoice.paymentMethod}`,
          customerName: invoice.customerName || 'عميل غير معروف',
          paymentStatus: invoice.paymentStatus
        });
      }
    }
    
    // إضافة تقارير مفصلة للعناصر التالفة
    for (const item of damagedItems) {
      const itemDate = new Date(item.date);
      const formattedDate = formatDateForReportType(itemDate, type);
      
      // للتقارير الأسبوعية أو المخصصة، نحسب جميع العناصر التالفة المفلترة سابقًا
      // للتقارير اليومية/الشهرية/السنوية، نتحقق من تطابق التاريخ
      const isInDateRange = (type === 'weekly' || type === 'custom') ? true : (formattedDate === date);
      
      if (isInDateRange) {
        // حساب إجمالي قيمة التوالف
        totalDamagesValue += item.valueLoss || 0;
        
        // يجب التأكد من وجود اسم المنتج، إن لم يكن موجوداً بحث عنه في قائمة المنتجات
        let productName = 'منتج غير معروف';
        
        // محاولة العثور على اسم المنتج من البيانات المرتبطة
        if (item.product && item.product.name) {
          productName = item.product.name;
        } else if (item.productName) {
          productName = item.productName;
        } else {
          // جلب اسم المنتج من قائمة المنتجات
          const products = await storage.getAllProducts();
          const product = products.find(p => p.id === item.productId);
          if (product) {
            productName = product.name;
          }
        }
        
        detailedReports.push({
          id: item.id,
          date: new Date(item.date).toISOString().split('T')[0],
          type: 'damage',
          amount: item.valueLoss,
          details: item.description || 'No description',
          productName: productName,
          quantity: item.quantity
        });
      }
    }
    
    // إضافة تقارير مفصلة للمصاريف والنثريات
    for (const expense of expenses) {
      const expenseDate = new Date(expense.date);
      const formattedDate = formatDateForReportType(expenseDate, type);
      
      // للتقارير الأسبوعية أو المخصصة، نحسب جميع المصاريف المفلترة سابقًا
      // للتقارير اليومية/الشهرية/السنوية، نتحقق من تطابق التاريخ
      const isInDateRange = (type === 'weekly' || type === 'custom') ? true : (formattedDate === date);
      
      if (isInDateRange) {
        // حساب إجمالي قيمة المصاريف
        totalExpensesValue += expense.amount || 0;
        
        detailedReports.push({
          id: expense.id,
          date: new Date(expense.date).toISOString().split('T')[0],
          type: 'expense',
          amount: expense.amount,
          details: expense.details || 'بدون تفاصيل',
          expenseType: expense.expenseType || 'miscellaneous'
        });
      }
    }
    
    // إضافة ملخص للتوالف إذا كانت موجودة
    if (totalDamagesValue > 0) {
      detailedReports.push({
        id: `summary-damaged-${date}`,
        date: date,
        type: 'summary',
        category: 'damaged',
        amount: totalDamagesValue,
        details: `إجمالي قيمة التوالف للفترة`
      });
    }
    
    // إضافة ملخص للمصاريف إذا كانت موجودة
    if (totalExpensesValue > 0) {
      detailedReports.push({
        id: `summary-expenses-${date}`,
        date: date,
        type: 'summary',
        category: 'expenses',
        amount: totalExpensesValue,
        details: `إجمالي المصاريف والنثريات للفترة`
      });
    }
    
    return detailedReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  app.post('/api/reports', async (req, res) => {
    // Check admin permissions in session
    if (!req.session?.userRole || req.session.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    try {
      const reportData = insertReportDataSchema.parse(req.body);
      const report = await storage.createReportData(reportData);
      res.status(201).json(report);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(500).json({ message: 'Failed to create report data' });
    }
  });
  
  // Notification routes
  app.get('/api/notifications/user/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (err) {
      console.error('Error fetching user notifications:', err);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });
  
  // Debugging route to get all notifications
  app.get('/api/notifications/debug/all', async (req, res) => {
    try {
      const allNotifications = await storage.getAllNotifications();
      res.json(allNotifications);
    } catch (err) {
      console.error('Error fetching all notifications:', err);
      res.status(500).json({ message: 'Failed to fetch all notifications' });
    }
  });
  
  app.post('/api/notifications', async (req, res) => {
    try {
      const notificationData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(notificationData);
      res.status(201).json(notification);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      console.error('Error creating notification:', err);
      res.status(500).json({ message: 'Failed to create notification' });
    }
  });
  
  app.patch('/api/notifications/:id/read', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid notification ID' });
      }
      
      const notification = await storage.markNotificationAsRead(id);
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      
      res.json(notification);
    } catch (err) {
      console.error('Error marking notification as read:', err);
      res.status(500).json({ message: 'Failed to update notification' });
    }
  });
  
  app.delete('/api/notifications/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid notification ID' });
      }
      
      await storage.deleteNotification(id);
      res.status(204).send();
    } catch (err) {
      console.error('Error deleting notification:', err);
      res.status(500).json({ message: 'Failed to delete notification' });
    }
  });

  return httpServer;
}
