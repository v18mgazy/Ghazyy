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
  
  app.post('/api/invoices', async (req, res) => {
    try {
      // Extract and validate the invoice data
      const invoiceData = insertInvoiceSchema.parse({
        ...req.body,
        userId: 1 // Default user ID for now since we're not using real authentication
      });
      
      // Create the invoice
      const invoice = await storage.createInvoice(invoiceData);
      
      // Process invoice items and update product quantities
      if (req.body.products && Array.isArray(req.body.products)) {
        for (const item of req.body.products) {
          try {
            // Create invoice item
            await storage.createInvoiceItem({
              invoiceId: invoice.id,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              discount: item.discount || 0
            });
            
            // Update product quantity in inventory
            const product = await storage.getProduct(item.productId);
            if (product) {
              const newStock = Math.max(0, (product.stock || 0) - item.quantity);
              await storage.updateProduct(item.productId, { 
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
      
      // إرسال إشعار للمدير بإنشاء فاتورة جديدة
      try {
        // الحصول على معلومات العميل
        const customer = await storage.getCustomer(invoiceData.customerId);
        const customerName = customer ? customer.name : 'عميل غير معروف';
        
        // إنشاء إشعار للمدير (نفترض أن المدير له الـ ID = 1)
        const adminUserId = 1; // يمكن تغييره إلى ID المدير الفعلي
        
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
      const items = await storage.getInvoiceItems(parseInt(invoiceId));
      
      // Enhance items with product details
      const enhancedItems = await Promise.all(items.map(async (item) => {
        const product = await storage.getProduct(item.productId);
        return {
          ...item,
          product: product || { name: 'Unknown Product', barcode: '' }
        };
      }));
      
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
      
      if (!type || !['daily', 'weekly', 'monthly', 'yearly'].includes(type as string)) {
        return res.status(400).json({ message: 'Invalid report type' });
      }
      
      const reportData = await storage.getReportData(type as string, date as string);
      // إذا لم تكن هناك بيانات، أرجع مصفوفة فارغة
      res.json(reportData || {
        summary: {
          totalSales: 0,
          totalProfit: 0,
          totalDamages: 0,
          salesCount: 0,
          previousTotalSales: 0,
          previousTotalProfit: 0,
          previousTotalDamages: 0,
          previousSalesCount: 0,
        },
        chartData: [],
        topProducts: [],
        detailedReports: [],
      });
    } catch (err) {
      console.error('Error fetching report data:', err);
      res.status(500).json({ message: 'Failed to fetch report data' });
    }
  });
  
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
