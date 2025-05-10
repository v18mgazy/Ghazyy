import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer } from "ws";
import { 
  insertUserSchema, insertProductSchema, insertCustomerSchema, 
  insertInvoiceSchema, insertInvoiceItemSchema, insertDamagedItemSchema,
  insertEmployeeSchema, insertPaymentApprovalSchema, insertReportDataSchema
} from "@shared/schema";
import { z } from "zod";
import { type ZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Setup WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer });
  
  // Store connected admin clients for notifications
  const adminClients = new Set<any>();
  
  wss.on('connection', (ws, req) => {
    // Store client information (like user role)
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'auth' && data.role === 'admin') {
          // Add admin to special group for approval notifications
          adminClients.add(ws);
          ws.on('close', () => adminClients.delete(ws));
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });
  });

  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const loginSchema = z.object({
        email: z.string().email(),
        password: z.string().min(6)
      });
      
      const { email, password } = loginSchema.parse(req.body);
      const user = await storage.authenticateUser(email, password);
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Set session info
      if (req.session) {
        req.session.userId = user.id;
        req.session.userRole = user.role;
      }
      
      return res.json({ 
        id: user.id,
        name: user.name,
        role: user.role
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      return res.status(500).json({ message: 'Login failed' });
    }
  });
  
  app.post('/api/auth/logout', (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: 'Logout failed' });
        }
        res.json({ message: 'Logged out successfully' });
      });
    } else {
      res.json({ message: 'Logged out successfully' });
    }
  });
  
  // User routes
  app.get('/api/users', async (req, res) => {
    // Check admin permissions in session
    if (!req.session?.userRole || req.session.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });
  
  app.post('/api/users', async (req, res) => {
    // Check admin permissions in session
    if (!req.session?.userRole || req.session.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
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
    // Check admin permissions in session
    if (!req.session?.userRole || req.session.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
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
    // Check admin permissions in session
    if (!req.session?.userRole || req.session.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
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
    // Check admin permissions in session
    if (!req.session?.userRole || req.session.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
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
    // Check admin permissions in session
    if (!req.session?.userRole || req.session.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
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
    // Check admin permissions in session
    if (!req.session?.userRole || req.session.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
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
    if (!req.session?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    try {
      // Extract and validate the invoice data
      const invoiceData = insertInvoiceSchema.parse({
        ...req.body,
        userId: req.session.userId
      });
      
      // Create the invoice
      const invoice = await storage.createInvoice(invoiceData);
      
      // If payment method is 'deferred' and user is not admin, create approval request
      if (invoiceData.paymentMethod === 'deferred' && req.session.userRole !== 'admin') {
        // Create payment approval request
        const approvalData = {
          invoiceId: invoice.id,
          requestedBy: req.session.userId,
          status: 'pending'
        };
        
        const approval = await storage.createPaymentApproval(approvalData);
        
        // Send real-time notification to admin clients
        const notification = {
          type: 'approval_request',
          data: {
            approvalId: approval.id,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            requestedBy: req.session.userId,
            timestamp: new Date()
          }
        };
        
        adminClients.forEach(client => {
          if (client.readyState === 1) { // OPEN
            client.send(JSON.stringify(notification));
          }
        });
      }
      
      res.status(201).json(invoice);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(500).json({ message: 'Failed to create invoice' });
    }
  });
  
  app.post('/api/invoices/:invoiceId/items', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
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
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(500).json({ message: 'Failed to create invoice item' });
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
    // Check admin permissions in session
    if (!req.session?.userRole || req.session.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      const approval = await storage.updatePaymentApproval(parseInt(id), {
        status,
        approvedBy: req.session.userId
      });
      
      if (!approval) {
        return res.status(404).json({ message: 'Payment approval not found' });
      }
      
      // Update the invoice payment status
      await storage.updateInvoice(approval.invoiceId, {
        paymentStatus: status === 'approved' ? 'approved' : 'rejected'
      });
      
      res.json(approval);
    } catch (err) {
      res.status(500).json({ message: 'Failed to update payment approval' });
    }
  });
  
  // Employee routes
  app.get('/api/employees', async (req, res) => {
    // Check admin permissions in session
    if (!req.session?.userRole || req.session.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    try {
      const employees = await storage.getAllEmployees();
      res.json(employees);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch employees' });
    }
  });
  
  app.post('/api/employees', async (req, res) => {
    // Check admin permissions in session
    if (!req.session?.userRole || req.session.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
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
    // Check admin permissions in session
    if (!req.session?.userRole || req.session.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
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
    // Check admin permissions in session
    if (!req.session?.userRole || req.session.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    try {
      const items = await storage.getAllDamagedItems();
      res.json(items);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch damaged items' });
    }
  });
  
  app.post('/api/damaged-items', async (req, res) => {
    // Check admin permissions in session
    if (!req.session?.userRole || req.session.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
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
  
  // Report data routes
  app.get('/api/reports', async (req, res) => {
    try {
      const { type, date } = req.query;
      
      if (!type || !['daily', 'weekly', 'monthly', 'yearly'].includes(type as string)) {
        return res.status(400).json({ message: 'Invalid report type' });
      }
      
      const reportData = await storage.getReportData(type as string, date as string);
      res.json(reportData);
    } catch (err) {
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

  return httpServer;
}
