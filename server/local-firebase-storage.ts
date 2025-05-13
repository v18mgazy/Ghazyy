import { 
  type User, type InsertUser, 
  type Product, type InsertProduct,
  type Customer, type InsertCustomer,
  type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem,
  type DamagedItem, type InsertDamagedItem,
  type Employee, type InsertEmployee,
  type PaymentApproval, type InsertPaymentApproval,
  type ReportData, type InsertReportData,
  type Supplier, type InsertSupplier,
  type SupplierInvoice, type InsertSupplierInvoice,
  type SupplierPayment, type InsertSupplierPayment,
  type StoreInfo, type InsertStoreInfo
} from "@shared/schema";
import bcrypt from 'bcryptjs';
import { IStorage } from './storage';

/**
 * LocalFirebaseStorage - تخزين محلي يحاكي عمل Firebase حتى يتم تفعيل Firestore
 * يعمل مثل MemStorage لكن بنفس واجهة FirebaseStorage
 */
export class LocalFirebaseStorage implements IStorage {
  private users = new Map<number, User>();
  private products = new Map<number, Product>();
  private customers = new Map<number, Customer>();
  private invoices = new Map<number, Invoice>();
  private invoiceItems = new Map<number, InvoiceItem>();
  private damagedItems = new Map<number, DamagedItem>();
  private employees = new Map<number, Employee>();
  private paymentApprovals = new Map<number, PaymentApproval>();
  private reportData = new Map<number, ReportData>();
  private suppliers = new Map<number, Supplier>();
  private supplierInvoices = new Map<number, SupplierInvoice>();
  private supplierPayments = new Map<number, SupplierPayment>();
  private storeInfo: StoreInfo | undefined;
  
  private userIdCounter = 1;
  private productIdCounter = 1;
  private customerIdCounter = 1;
  private invoiceIdCounter = 1;
  private invoiceItemIdCounter = 1;
  private damagedItemIdCounter = 1;
  private employeeIdCounter = 1;
  private paymentApprovalIdCounter = 1;
  private reportDataIdCounter = 1;
  private supplierIdCounter = 1;
  private supplierInvoiceIdCounter = 1;
  private supplierPaymentIdCounter = 1;
  
  constructor() {
    // Initialize with some default data
    this.initializeDefaultData();
  }
  
  private initializeDefaultData() {
    // Create admin user
    this.createUser({
      username: 'admin',
      password: '503050',
      name: 'Admin User',
      role: 'admin',
      status: 'active'
    });
    
    // Create cashier user
    this.createUser({
      username: 'cashier',
      password: 'cashier123',
      name: 'Cashier User',
      role: 'cashier',
      status: 'active'
    });
    
    // Create some products
    this.createProduct({
      name: 'Samsung Galaxy S21',
      barcode: '7531598524567',
      alternativeCode: 'SG21',
      purchasePrice: 650,
      salesPrice: 799.99,
      quantity: 15,
      category: 'Smartphones'
    });
    
    this.createProduct({
      name: 'iPhone 13 Pro',
      barcode: '9876543210123',
      alternativeCode: 'IP13P',
      purchasePrice: 899,
      salesPrice: 1099.99,
      quantity: 10,
      category: 'Smartphones'
    });
    
    this.createProduct({
      name: 'Sony PlayStation 5',
      barcode: '5647382910111',
      alternativeCode: 'PS5',
      purchasePrice: 450,
      salesPrice: 499.99,
      quantity: 5,
      category: 'Gaming'
    });
    
    // Create some customers
    this.createCustomer({
      name: 'محمد أحمد',
      phone: '0123456789',
      address: 'القاهرة، مصر',
      isPotential: false
    });
    
    this.createCustomer({
      name: 'سارة محمود',
      phone: '0198765432',
      address: 'الإسكندرية، مصر',
      isPotential: false
    });
    
    this.createCustomer({
      name: 'عمر خالد',
      phone: '0111234567',
      address: 'القاهرة، مصر',
      isPotential: true
    });
    
    // Create some employees
    this.createEmployee({
      name: 'أحمد علي',
      userId: 1,
      hireDate: new Date('2022-01-15'),
      salary: 4500,
      deductions: 0
    });
    
    this.createEmployee({
      name: 'خالد محمد',
      userId: 2,
      hireDate: new Date('2022-03-01'),
      salary: 3800,
      deductions: 0
    });
    
    // Create an invoice with items
    const invoice = this.createInvoice({
      customerId: 1,
      date: new Date(),
      paymentMethod: 'cash',
      status: 'completed',
      discount: 50,
      total: 1049.98,
      tax: 0,
      subtotal: 1099.98
    });
    
    this.createInvoiceItem({
      invoiceId: invoice.id,
      productId: 1,
      quantity: 1,
      price: 799.99,
      discount: 0,
      total: 799.99
    });
    
    this.createInvoiceItem({
      invoiceId: invoice.id,
      productId: 3,
      quantity: 1,
      price: 499.99,
      discount: 50,
      total: 449.99
    });
    
    // Create a damaged item
    this.createDamagedItem({
      productId: 2,
      quantity: 1,
      valueLoss: 899,
      description: 'تلف في الشاشة'
    });
    
    // Create a payment approval
    this.createPaymentApproval({
      invoiceId: invoice.id,
      status: 'approved',
      requestedBy: 'سارة محمود',
      requestDate: new Date(),
      approvedBy: 'أحمد علي',
      approvalDate: new Date(),
      notes: 'تمت الموافقة على الدفع المؤجل'
    });
    
    // Create report data
    this.createReportData({
      type: 'daily',
      date: new Date(),
      salesCount: 1,
      revenue: 1049.98,
      cost: 950,
      discounts: 50,
      damages: 0,
      profit: 99.98,
      dataJson: JSON.stringify({
        topProducts: [
          { id: 1, name: 'Samsung Galaxy S21', count: 1, revenue: 799.99 },
          { id: 3, name: 'Sony PlayStation 5', count: 1, revenue: 449.99 }
        ]
      })
    });
  }
  
  // User management
  async getUser(id: number): Promise<User | undefined> {
    console.log(`LocalFirebaseStorage: Getting user with ID ${id}`);
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log(`LocalFirebaseStorage: Getting user with username ${username}`);
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }
  
  async getAllUsers(): Promise<User[]> {
    console.log("LocalFirebaseStorage: Getting all users");
    return Array.from(this.users.values());
  }
  
  async createUser(user: InsertUser): Promise<User> {
    console.log("LocalFirebaseStorage: Creating new user", user);
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    const newUser: User = {
      id: this.userIdCounter++,
      ...user,
      password: hashedPassword,
      lastLogin: new Date()
    };
    
    this.users.set(newUser.id, newUser);
    return newUser;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    console.log(`LocalFirebaseStorage: Updating user with ID ${id}`, userData);
    const user = this.users.get(id);
    if (!user) return undefined;
    
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    
    const updatedUser: User = {
      ...user,
      ...userData
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<void> {
    console.log(`LocalFirebaseStorage: Deleting user with ID ${id}`);
    this.users.delete(id);
  }
  
  async authenticateUser(email: string, password: string): Promise<User | undefined> {
    console.log(`LocalFirebaseStorage: Authenticating user ${email}`);
    // For simplicity, assuming email is username
    const user = await this.getUserByUsername(email);
    if (!user) return undefined;
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    return isPasswordValid ? user : undefined;
  }
  
  // Product management
  async getProduct(id: number): Promise<Product | undefined> {
    console.log(`LocalFirebaseStorage: Getting product with ID ${id}`);
    return this.products.get(id);
  }
  
  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    console.log(`LocalFirebaseStorage: Getting product with barcode ${barcode}`);
    for (const product of this.products.values()) {
      if (product.barcode === barcode) {
        return product;
      }
    }
    return undefined;
  }
  
  async getAllProducts(): Promise<Product[]> {
    console.log("LocalFirebaseStorage: Getting all products");
    return Array.from(this.products.values());
  }
  
  async createProduct(product: InsertProduct): Promise<Product> {
    console.log("LocalFirebaseStorage: Creating new product", product);
    const newProduct: Product = {
      id: this.productIdCounter++,
      ...product,
      createdAt: new Date()
    };
    
    this.products.set(newProduct.id, newProduct);
    return newProduct;
  }
  
  async updateProduct(id: number, productData: Partial<Product>): Promise<Product | undefined> {
    console.log(`LocalFirebaseStorage: Updating product with ID ${id}`, productData);
    const product = this.products.get(id);
    if (!product) return undefined;
    
    const updatedProduct: Product = {
      ...product,
      ...productData
    };
    
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }
  
  async deleteProduct(id: number): Promise<void> {
    console.log(`LocalFirebaseStorage: Deleting product with ID ${id}`);
    this.products.delete(id);
  }
  
  // Customer management
  async getCustomer(id: number): Promise<Customer | undefined> {
    console.log(`LocalFirebaseStorage: Getting customer with ID ${id}`);
    return this.customers.get(id);
  }
  
  async getAllCustomers(): Promise<Customer[]> {
    console.log("LocalFirebaseStorage: Getting all customers");
    return Array.from(this.customers.values());
  }
  
  async searchCustomers(query: string): Promise<Customer[]> {
    console.log(`LocalFirebaseStorage: Searching customers with query ${query}`);
    const lowercaseQuery = query.toLowerCase();
    
    return Array.from(this.customers.values()).filter(customer => 
      customer.name.toLowerCase().includes(lowercaseQuery) ||
      customer.phone.includes(query) ||
      (customer.address && customer.address.toLowerCase().includes(lowercaseQuery))
    );
  }
  
  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    console.log("LocalFirebaseStorage: Creating new customer", customer);
    const newCustomer: Customer = {
      id: this.customerIdCounter++,
      ...customer,
      createdAt: new Date()
    };
    
    this.customers.set(newCustomer.id, newCustomer);
    return newCustomer;
  }
  
  async updateCustomer(id: number, customerData: Partial<Customer>): Promise<Customer | undefined> {
    console.log(`LocalFirebaseStorage: Updating customer with ID ${id}`, customerData);
    const customer = this.customers.get(id);
    if (!customer) return undefined;
    
    const updatedCustomer: Customer = {
      ...customer,
      ...customerData
    };
    
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }
  
  // Invoice management
  async getInvoice(id: number): Promise<Invoice | undefined> {
    console.log(`LocalFirebaseStorage: Getting invoice with ID ${id}`);
    return this.invoices.get(id);
  }
  
  async getAllInvoices(): Promise<Invoice[]> {
    console.log("LocalFirebaseStorage: Getting all invoices");
    return Array.from(this.invoices.values());
  }
  
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    console.log("LocalFirebaseStorage: Creating new invoice", invoice);
    
    // إذا كان هناك معرف محدد مسبقاً، استخدمه بدلاً من زيادة العداد
    let invoiceId = invoice.id || this.invoiceIdCounter++;
    
    const newInvoice: Invoice = {
      id: invoiceId,
      ...invoice,
      // استخدام التاريخ المقدم أو إنشاء تاريخ جديد بصيغة ISO ولكن بدون حرف Z في النهاية
      createdAt: invoice.createdAt || new Date().toISOString().replace('Z', '')
    };
    
    this.invoices.set(newInvoice.id, newInvoice);
    return newInvoice;
  }
  
  /**
   * إنشاء فاتورة جديدة بمعرف محدد للاستخدام في تحديث الفواتير عن طريق إعادة إنشائها
   * 
   * @param id معرف الفاتورة المراد إنشاؤها
   * @param invoiceData بيانات الفاتورة بالكامل
   * @returns الفاتورة الجديدة
   */
  async createInvoiceWithId(id: number, invoiceData: any): Promise<Invoice> {
    console.log(`LocalFirebaseStorage: Creating invoice with specific ID ${id}`);
    
    // تأكد من أن المعرف صحيح
    if (isNaN(id) || id <= 0) {
      throw new Error(`Invalid invoice ID: ${id}`);
    }
    
    // حفظ الفاتورة بالمعرف المحدد
    const newInvoice: Invoice = {
      id,
      ...invoiceData,
      // استخدام التاريخ المقدم أو إنشاء تاريخ جديد بصيغة ISO ولكن بدون حرف Z في النهاية
      createdAt: invoiceData.createdAt || new Date().toISOString().replace('Z', ''),
      date: invoiceData.date || invoiceData.createdAt || new Date().toISOString().replace('Z', '')
    };
    
    this.invoices.set(newInvoice.id, newInvoice);
    
    // تحديث العداد إذا كان المعرف أكبر من العداد الحالي
    this.invoiceIdCounter = Math.max(this.invoiceIdCounter, id + 1);
    
    return newInvoice;
  }
  
  async updateInvoice(id: number, invoiceData: Partial<Invoice>): Promise<Invoice | undefined> {
    console.log(`LocalFirebaseStorage: Updating invoice with ID ${id}`, invoiceData);
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    
    // حذف الفاتورة القديمة
    this.invoices.delete(id);
    
    // إنشاء فاتورة جديدة بنفس المعرف والوقت الأصلي
    const originalCreatedAt = invoice.createdAt;
    
    const updatedInvoice: Invoice = {
      ...invoice,
      ...invoiceData,
      createdAt: originalCreatedAt // الحفاظ على تاريخ الإنشاء الأصلي
    };
    
    this.invoices.set(id, updatedInvoice);
    console.log(`LocalFirebaseStorage: Invoice ${id} deleted and recreated with same ID and timestamp`);
    return updatedInvoice;
  }
  
  async deleteInvoice(id: number): Promise<void> {
    console.log(`LocalFirebaseStorage: Deleting invoice with ID ${id}`);
    // حذف الفاتورة مباشرة من قاعدة البيانات
    this.invoices.delete(id);
    console.log(`Invoice ${id} completely removed from database`);
  }
  
  // Invoice item management
  async getInvoiceItem(id: number): Promise<InvoiceItem | undefined> {
    console.log(`LocalFirebaseStorage: Getting invoice item with ID ${id}`);
    return this.invoiceItems.get(id);
  }
  
  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    console.log(`LocalFirebaseStorage: Getting items for invoice ID ${invoiceId}`);
    return Array.from(this.invoiceItems.values()).filter(item => item.invoiceId === invoiceId);
  }
  
  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    console.log("LocalFirebaseStorage: Creating new invoice item", item);
    const newItem: InvoiceItem = {
      id: this.invoiceItemIdCounter++,
      ...item
    };
    
    this.invoiceItems.set(newItem.id, newItem);
    return newItem;
  }
  
  // Damaged item management
  async getDamagedItem(id: number): Promise<DamagedItem | undefined> {
    console.log(`LocalFirebaseStorage: Getting damaged item with ID ${id}`);
    return this.damagedItems.get(id);
  }
  
  async getAllDamagedItems(): Promise<DamagedItem[]> {
    console.log("LocalFirebaseStorage: Getting all damaged items");
    return Array.from(this.damagedItems.values());
  }
  
  async createDamagedItem(item: InsertDamagedItem): Promise<DamagedItem> {
    console.log("LocalFirebaseStorage: Creating new damaged item", item);
    const newItem: DamagedItem = {
      id: this.damagedItemIdCounter++,
      ...item,
      date: new Date()
    };
    
    this.damagedItems.set(newItem.id, newItem);
    
    // Update product quantity
    const product = this.products.get(item.productId);
    if (product) {
      this.updateProduct(product.id, {
        quantity: Math.max(0, product.quantity - item.quantity)
      });
    }
    
    return newItem;
  }
  
  async updateDamagedItem(id: number, itemData: Partial<DamagedItem>): Promise<DamagedItem | undefined> {
    console.log(`LocalFirebaseStorage: Updating damaged item with ID ${id}`, itemData);
    const item = this.damagedItems.get(id);
    if (!item) return undefined;
    
    // If quantity changed, update product
    if (itemData.quantity !== undefined && itemData.quantity !== item.quantity) {
      const product = this.products.get(item.productId);
      if (product) {
        const quantityDiff = itemData.quantity - item.quantity;
        this.updateProduct(product.id, {
          quantity: Math.max(0, product.quantity - quantityDiff)
        });
      }
    }
    
    const updatedItem: DamagedItem = {
      ...item,
      ...itemData
    };
    
    this.damagedItems.set(id, updatedItem);
    return updatedItem;
  }
  
  async deleteDamagedItem(id: number): Promise<void> {
    console.log(`LocalFirebaseStorage: Deleting damaged item with ID ${id}`);
    const item = this.damagedItems.get(id);
    if (item) {
      // Restore product quantity
      const product = this.products.get(item.productId);
      if (product) {
        this.updateProduct(product.id, {
          quantity: product.quantity + item.quantity
        });
      }
      
      this.damagedItems.delete(id);
    }
  }
  
  // Employee management
  async getEmployee(id: number): Promise<Employee | undefined> {
    console.log(`LocalFirebaseStorage: Getting employee with ID ${id}`);
    return this.employees.get(id);
  }
  
  async getAllEmployees(): Promise<Employee[]> {
    console.log("LocalFirebaseStorage: Getting all employees");
    return Array.from(this.employees.values());
  }
  
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    console.log("LocalFirebaseStorage: Creating new employee", employee);
    const newEmployee: Employee = {
      id: this.employeeIdCounter++,
      ...employee
    };
    
    this.employees.set(newEmployee.id, newEmployee);
    return newEmployee;
  }
  
  async updateEmployee(id: number, employeeData: Partial<Employee>): Promise<Employee | undefined> {
    console.log(`LocalFirebaseStorage: Updating employee with ID ${id}`, employeeData);
    const employee = this.employees.get(id);
    if (!employee) return undefined;
    
    const updatedEmployee: Employee = {
      ...employee,
      ...employeeData
    };
    
    this.employees.set(id, updatedEmployee);
    return updatedEmployee;
  }
  
  async deleteEmployee(id: number): Promise<void> {
    console.log(`LocalFirebaseStorage: Deleting employee with ID ${id}`);
    this.employees.delete(id);
  }
  
  // Payment approval management
  async getPaymentApproval(id: number): Promise<PaymentApproval | undefined> {
    console.log(`LocalFirebaseStorage: Getting payment approval with ID ${id}`);
    return this.paymentApprovals.get(id);
  }
  
  async getAllPaymentApprovals(): Promise<PaymentApproval[]> {
    console.log("LocalFirebaseStorage: Getting all payment approvals");
    return Array.from(this.paymentApprovals.values());
  }
  
  async createPaymentApproval(approval: InsertPaymentApproval): Promise<PaymentApproval> {
    console.log("LocalFirebaseStorage: Creating new payment approval", approval);
    const newApproval: PaymentApproval = {
      id: this.paymentApprovalIdCounter++,
      ...approval
    };
    
    this.paymentApprovals.set(newApproval.id, newApproval);
    return newApproval;
  }
  
  async updatePaymentApproval(id: number, approvalData: Partial<PaymentApproval>): Promise<PaymentApproval | undefined> {
    console.log(`LocalFirebaseStorage: Updating payment approval with ID ${id}`, approvalData);
    const approval = this.paymentApprovals.get(id);
    if (!approval) return undefined;
    
    const updatedApproval: PaymentApproval = {
      ...approval,
      ...approvalData
    };
    
    this.paymentApprovals.set(id, updatedApproval);
    return updatedApproval;
  }
  
  // Report data management
  async getReportData(type: string, date: string): Promise<ReportData[]> {
    console.log(`LocalFirebaseStorage: Getting report data for type ${type} and date ${date}`);
    const reports = Array.from(this.reportData.values());
    const searchDate = new Date(date);
    
    return reports.filter(report => {
      const reportDate = report.date;
      
      if (type === 'daily') {
        return reportDate.getFullYear() === searchDate.getFullYear() &&
               reportDate.getMonth() === searchDate.getMonth() &&
               reportDate.getDate() === searchDate.getDate();
      } else if (type === 'monthly') {
        return reportDate.getFullYear() === searchDate.getFullYear() &&
               reportDate.getMonth() === searchDate.getMonth();
      } else if (type === 'yearly') {
        return reportDate.getFullYear() === searchDate.getFullYear();
      }
      
      return false;
    });
  }
  
  async deleteReportData(id: number): Promise<void> {
    console.log(`LocalFirebaseStorage: Deleting report data with ID ${id}`);
    if (this.reportData.has(id)) {
      this.reportData.delete(id);
      console.log(`Report data with ID ${id} successfully deleted`);
    } else {
      console.warn(`Report data with ID ${id} not found for deletion`);
    }
  }
  
  async createReportData(reportData: InsertReportData): Promise<ReportData> {
    console.log("LocalFirebaseStorage: Creating new report data", reportData);
    const newReportData: ReportData = {
      id: this.reportDataIdCounter++,
      ...reportData,
      createdAt: new Date()
    };
    
    this.reportData.set(newReportData.id, newReportData);
    return newReportData;
  }
  
  // Function implemented above - remove duplicate

  // وظائف إدارة الموردين
  async getSupplier(id: number): Promise<Supplier | undefined> {
    return this.suppliers.get(id);
  }

  async getAllSuppliers(): Promise<Supplier[]> {
    return Array.from(this.suppliers.values());
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    console.log("LocalFirebaseStorage: Creating new supplier", supplier);
    const id = this.supplierIdCounter++;
    
    const now = new Date();
    const localDateString = now.toISOString().replace('Z', '');
    
    const newSupplier: Supplier = {
      id,
      ...supplier,
      createdAt: new Date(localDateString),
      updatedAt: new Date(localDateString)
    };
    
    this.suppliers.set(id, newSupplier);
    return newSupplier;
  }

  async updateSupplier(id: number, supplierData: Partial<Supplier>): Promise<Supplier | undefined> {
    const supplier = this.suppliers.get(id);
    
    if (!supplier) {
      return undefined;
    }
    
    const now = new Date();
    const localDateString = now.toISOString().replace('Z', '');
    
    const updatedSupplier: Supplier = {
      ...supplier,
      ...supplierData,
      updatedAt: new Date(localDateString)
    };
    
    this.suppliers.set(id, updatedSupplier);
    return updatedSupplier;
  }

  async deleteSupplier(id: number): Promise<void> {
    this.suppliers.delete(id);
  }

  // وظائف إدارة فواتير الموردين
  async getSupplierInvoice(id: number): Promise<SupplierInvoice | undefined> {
    return this.supplierInvoices.get(id);
  }

  async getAllSupplierInvoices(): Promise<SupplierInvoice[]> {
    return Array.from(this.supplierInvoices.values());
  }

  async getSupplierInvoicesBySupplierId(supplierId: number): Promise<SupplierInvoice[]> {
    return Array.from(this.supplierInvoices.values()).filter(
      invoice => invoice.supplierId === supplierId
    );
  }

  async createSupplierInvoice(invoice: InsertSupplierInvoice): Promise<SupplierInvoice> {
    const id = this.supplierInvoiceIdCounter++;
    
    const now = new Date();
    const localDateString = now.toISOString().replace('Z', '');
    
    const newInvoice: SupplierInvoice = {
      id,
      ...invoice,
      paidAmount: invoice.paidAmount || 0,
      paymentStatus: invoice.paymentStatus || 'pending',
      createdAt: new Date(localDateString),
      updatedAt: new Date(localDateString)
    };
    
    this.supplierInvoices.set(id, newInvoice);
    return newInvoice;
  }

  async updateSupplierInvoice(id: number, invoiceData: Partial<SupplierInvoice>): Promise<SupplierInvoice | undefined> {
    const invoice = this.supplierInvoices.get(id);
    
    if (!invoice) {
      return undefined;
    }
    
    const now = new Date();
    const localDateString = now.toISOString().replace('Z', '');
    
    const updatedInvoice: SupplierInvoice = {
      ...invoice,
      ...invoiceData,
      updatedAt: new Date(localDateString)
    };
    
    this.supplierInvoices.set(id, updatedInvoice);
    return updatedInvoice;
  }

  async deleteSupplierInvoice(id: number): Promise<void> {
    this.supplierInvoices.delete(id);
  }

  // وظائف إدارة مدفوعات الموردين
  async getSupplierPayment(id: number): Promise<SupplierPayment | undefined> {
    return this.supplierPayments.get(id);
  }

  async getAllSupplierPayments(): Promise<SupplierPayment[]> {
    return Array.from(this.supplierPayments.values());
  }

  async getSupplierPaymentsByInvoiceId(invoiceId: number): Promise<SupplierPayment[]> {
    return Array.from(this.supplierPayments.values()).filter(
      payment => payment.supplierInvoiceId === invoiceId
    );
  }

  async createSupplierPayment(payment: InsertSupplierPayment): Promise<SupplierPayment> {
    const id = this.supplierPaymentIdCounter++;
    
    const newPayment: SupplierPayment = {
      id,
      ...payment,
      createdAt: new Date()
    };
    
    this.supplierPayments.set(id, newPayment);
    
    // تحديث المبلغ المدفوع وحالة الفاتورة
    const invoice = this.supplierInvoices.get(payment.supplierInvoiceId);
    if (invoice) {
      const updatedPaidAmount = invoice.paidAmount + payment.amount;
      const updatedStatus = updatedPaidAmount >= invoice.amount
        ? 'paid'
        : updatedPaidAmount > 0
          ? 'partially_paid'
          : 'pending';
      
      this.updateSupplierInvoice(invoice.id, {
        paidAmount: updatedPaidAmount,
        paymentStatus: updatedStatus
      });
    }
    
    return newPayment;
  }
}