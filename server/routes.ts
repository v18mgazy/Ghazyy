import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertProductSchema, insertCustomerSchema, 
  insertInvoiceSchema, insertInvoiceItemSchema, insertDamagedItemSchema,
  insertEmployeeSchema, insertPaymentApprovalSchema, insertReportDataSchema,
  insertNotificationSchema
} from "@shared/schema";
import { z } from "zod";
import { type ZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

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
      // جلب جميع الفواتير
      const allInvoices = await storage.getAllInvoices();
      
      // تصفية الفواتير حسب معرّف العميل
      const customerInvoices = allInvoices.filter(invoice => 
        invoice.customerId === parseInt(customerId)
      );
      
      res.json(customerInvoices);
    } catch (err) {
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
        updatedAt: new Date().toISOString()
      };
      
      console.log('Updating invoice with data:', updateData);
      
      // تحديث الفاتورة
      const updatedInvoice = await storage.updateInvoice(invoiceId, updateData);
      
      // تحديث عناصر الفاتورة إذا تم تقديمها
      if (req.body.products && Array.isArray(req.body.products) && req.body.products.length > 0) {
        console.log(`Processing ${req.body.products.length} products for invoice update`);
        
        // 1. احصل على العناصر الحالية للفاتورة
        const existingItems = await storage.getInvoiceItems(invoiceId);
        console.log(`Found ${existingItems.length} existing items`);
        
        // 2. في نسخة مستقبلية، يمكننا إضافة منطق لمقارنة الكميات القديمة والجديدة
        // وتحديث مخزون المنتجات وفقًا لذلك

        // 3. في هذه النسخة المبسطة، سنحدث فقط عناصر الفاتورة دون التأثير على المخزون
        for (const item of req.body.products) {
          // العثور على العنصر الموجود (إذا كان موجودًا)
          const existingItem = existingItems.find(i => i.productId === item.productId);
          
          try {
            if (existingItem) {
              // تحديث العنصر الموجود
              const updatedItem = {
                quantity: item.quantity,
                price: item.price,
                discount: item.discount || 0,
                total: item.total
              };
              
              await storage.updateInvoiceItem(existingItem.id, updatedItem);
              console.log(`Updated invoice item ${existingItem.id}`);
            } else {
              // إنشاء عنصر جديد
              const newItem = {
                invoiceId,
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                discount: item.discount || 0,
                total: item.total
              };
              
              await storage.createInvoiceItem(newItem);
              console.log(`Created new invoice item for product ${item.productId}`);
            }
          } catch (itemError) {
            console.error('Error updating invoice item:', itemError);
            // استمر بالتحديث رغم وجود خطأ في عنصر واحد
          }
        }
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
      
      // 1. حذف عناصر الفاتورة أو استعادة المخزون إذا لزم الأمر
      try {
        // الحصول على جميع عناصر الفاتورة
        const invoiceItems = await storage.getInvoiceItems(invoiceId);
        console.log(`Found ${invoiceItems.length} items for invoice ${invoiceId}`);
        
        // يمكن استعادة المخزون للمنتجات هنا إذا كان ذلك مطلوبًا
        // لكن في هذا المثال سنكتفي بتعليم الفاتورة كمحذوفة
      } catch (itemError) {
        console.error('Error processing invoice items during deletion:', itemError);
        // قد نستمر بالحذف رغم الخطأ
      }
      
      // 2. تعليم الفاتورة كمحذوفة (نحن لا نحذف البيانات فعليًا للاحتفاظ بسجل المبيعات)
      await storage.updateInvoice(invoiceId, { isDeleted: true });
      console.log(`Successfully marked invoice ${invoiceId} as deleted`);
      
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
      
      // تحقق من وجود العميل
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        console.error('Customer not found:', customerId);
        return res.status(404).json({ message: 'Customer not found' });
      }
      
      console.log('Found customer:', customer);
      
      // سجل معلومات العميل المفصلة إذا كانت متوفرة في الطلب
      console.log('Customer details from request:', req.body.customerDetails);
      
      // تخزين معلومات العميل المفصلة في الفاتورة إذا كانت متوفرة
      let customerInfo = {};
      if (req.body.customerDetails) {
        customerInfo = {
          customerName: req.body.customerDetails.name || customer.name,
          customerPhone: req.body.customerDetails.phone || customer.phone,
          customerAddress: req.body.customerDetails.address || customer.address,
          // تم إبعاد حقل البريد الإلكتروني مؤقتًا حيث أنه ليس ضمن نموذج العميل الحالي
          // customerEmail: req.body.customerDetails.email || '',
        };
      }
      
      // إعداد بيانات الفاتورة مع التحقق من صحة البيانات
      const invoiceData = insertInvoiceSchema.parse({
        ...req.body,
        ...customerInfo, // إضافة معلومات العميل المفصلة
        customerId: customerId, // استخدام معرف العميل المحول
        userId: userId
      });
      
      // إنشاء الفاتورة
      const invoice = await storage.createInvoice(invoiceData);
      console.log('Created invoice:', invoice);
      
      // معالجة عناصر الفاتورة وتحديث كميات المنتجات
      if (req.body.products && Array.isArray(req.body.products)) {
        for (const item of req.body.products) {
          try {
            // حساب إجمالي العنصر
            const itemTotal = item.quantity * item.price * (1 - (item.discount || 0) / 100);
            
            // معرف المنتج والتأكد من أنه رقم صحيح
            let productId = item.productId;
            if (typeof productId === 'string') {
              productId = parseInt(productId);
            }
            
            if (isNaN(productId)) {
              console.error('Invalid product ID:', item.productId);
              continue; // تخطي هذا العنصر والانتقال إلى العنصر التالي
            }
            
            // الحصول على تفاصيل المنتج كاملة لتحديث المخزون
            const product = await storage.getProduct(productId);
            if (!product) {
              console.warn(`Product with ID ${productId} not found when creating invoice item`);
            } else {
              console.log(`Creating invoice item for product ${productId}:`, product.name);
            }
            
            // إنشاء عنصر الفاتورة
            await storage.createInvoiceItem({
              invoiceId: invoice.id,
              productId: productId,
              quantity: item.quantity,
              price: item.price,
              discount: item.discount || 0,
              total: itemTotal
            });
            
            // تحديث المخزون إذا كان المنتج موجودًا
            if (product) {
              const newStock = Math.max(0, (product.stock || 0) - item.quantity);
              await storage.updateProduct(productId, { 
                stock: newStock 
              });
              console.log(`Updated product ${product.name} stock to ${newStock}`);
            }
          } catch (itemError) {
            console.error('Error processing invoice item:', itemError);
            // Continue processing other items even if one fails
          }
        }
      }
      
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
      
      // If payment method is 'later', handle approval
      if (invoiceData.paymentMethod === 'later') {
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
            referenceId: approval.id.toString()
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
      const employeeData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(employeeData);
      res.status(201).json(employee);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(500).json({ message: 'Failed to create employee' });
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
    // Check admin permissions in session
    if (!req.session?.userRole || req.session.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    try {
      const { id } = req.params;
      await storage.deleteEmployee(parseInt(id));
      res.json({ message: 'Employee deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Failed to delete employee' });
    }
  });
  
  // Damaged items routes
  app.get('/api/damaged-items', async (req, res) => {
    try {
      const items = await storage.getAllDamagedItems();
      res.json(items);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch damaged items' });
    }
  });
  
  app.post('/api/damaged-items', async (req, res) => {
    
    try {
      const itemData = insertDamagedItemSchema.parse(req.body);
      
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
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(500).json({ message: 'Failed to create damaged item' });
    }
  });
  
  app.patch('/api/damaged-items/:id', async (req, res) => {
    // Check admin permissions in session
    if (!req.session?.userRole || req.session.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
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
    // Check admin permissions in session
    if (!req.session?.userRole || req.session.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    try {
      const { id } = req.params;
      await storage.deleteDamagedItem(parseInt(id));
      res.json({ message: 'Damaged item deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Failed to delete damaged item' });
    }
  });
  
  // طرق API لبيانات التقارير
  app.get('/api/reports', async (req, res) => {
    try {
      const { type, date } = req.query;
      console.log('Report request:', { type, date });
      
      if (!type || !['daily', 'weekly', 'monthly', 'yearly'].includes(type as string)) {
        return res.status(400).json({ message: 'Invalid report type' });
      }
      
      // جلب بيانات الفواتير والمنتجات والعناصر التالفة
      const invoices = await storage.getAllInvoices();
      const products = await storage.getAllProducts();
      const damagedItems = await storage.getAllDamagedItems();
      
      console.log(`Found ${invoices.length} invoices, ${products.length} products, ${damagedItems.length} damaged items`);
      
      // إعداد بيانات ملخص التقرير
      let totalSales = 0;
      let totalProfit = 0;
      let salesCount = 0;
      let totalDamages = 0;
      
      // حساب إجمالي المبيعات والأرباح
      for (const invoice of invoices) {
        const invoiceDate = new Date(invoice.date);
        const formattedDate = formatDateForReportType(invoiceDate, type as string);
        
        if (formattedDate === date) {
          totalSales += invoice.total;
          salesCount++;
          
          // جلب عناصر الفاتورة لحساب الربح
          const items = await storage.getInvoiceItems(invoice.id);
          for (const item of items) {
            const product = await storage.getProduct(item.productId);
            if (product) {
              const profit = (item.price - product.purchasePrice) * item.quantity;
              totalProfit += profit;
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
      const chartData = createChartData(invoices, type as string, date as string);
      
      // حساب أفضل المنتجات مبيعًا
      const topProducts = calculateTopProducts(invoices, products);
      
      // إنشاء تقارير مفصلة
      const detailedReports = createDetailedReports(invoices, damagedItems, type as string, date as string);
      
      // بيانات الفترة السابقة لعرض نسبة التغيير
      const previousDate = getPreviousPeriod(type as string, date as string);
      let previousTotalSales = 0;
      let previousTotalProfit = 0;
      let previousSalesCount = 0;
      let previousTotalDamages = 0;
      
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
  function formatDateForReportType(date: Date, type: string): string {
    if (type === 'daily') {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    } else if (type === 'weekly') {
      // الحصول على رقم الأسبوع في السنة
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
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
      // يرجى التنفيذ الكامل عند الحاجة
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
  
  function createChartData(invoices: any[], type: string, date: string): any[] {
    // تنفيذ بسيط - يمكن توسيعه حسب احتياجات العميل
    const chartData: any[] = [];
    
    // إضافة بيانات مثال للاختبار
    if (type === 'daily') {
      // بيانات لساعات اليوم
      for (let i = 0; i < 24; i++) {
        chartData.push({
          date: `${i}:00`,
          sales: Math.floor(Math.random() * 1000),
          profit: Math.floor(Math.random() * 500)
        });
      }
    } else if (type === 'monthly') {
      // بيانات لأيام الشهر
      const daysInMonth = new Date(parseInt(date.split('-')[0]), parseInt(date.split('-')[1]), 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        chartData.push({
          date: i.toString(),
          sales: Math.floor(Math.random() * 5000),
          profit: Math.floor(Math.random() * 2500)
        });
      }
    }
    
    return chartData;
  }
  
  function calculateTopProducts(invoices: any[], products: any[]): any[] {
    // تنفيذ بسيط - يمكن توسيعه حسب احتياجات العميل
    const productMap = new Map();
    
    // تصنيف المنتجات حسب الكمية والإيرادات
    for (const product of products) {
      if (product.id) {
        productMap.set(product.id, {
          id: product.id,
          name: product.name,
          quantity: 0,
          revenue: 0
        });
      }
    }
    
    // ترتيب أفضل 5 منتجات
    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }
  
  function createDetailedReports(invoices: any[], damagedItems: any[], type: string, date: string): any[] {
    const detailedReports: any[] = [];
    
    // إضافة تقارير مفصلة للفواتير
    for (const invoice of invoices) {
      const invoiceDate = new Date(invoice.date);
      const formattedDate = formatDateForReportType(invoiceDate, type);
      
      if (formattedDate === date) {
        detailedReports.push({
          id: invoice.id,
          date: new Date(invoice.date).toISOString().split('T')[0],
          type: 'sale',
          amount: invoice.total,
          details: `Invoice #${invoice.invoiceNumber}, Payment: ${invoice.paymentMethod}`
        });
      }
    }
    
    // إضافة تقارير مفصلة للعناصر التالفة
    for (const item of damagedItems) {
      const itemDate = new Date(item.date);
      const formattedDate = formatDateForReportType(itemDate, type);
      
      if (formattedDate === date) {
        detailedReports.push({
          id: item.id,
          date: new Date(item.date).toISOString().split('T')[0],
          type: 'damage',
          amount: item.valueLoss,
          details: item.description || 'No description'
        });
      }
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
