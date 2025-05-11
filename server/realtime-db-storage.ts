import { database, ref, set, get, remove, update } from "./firebase-rtdb";
import type {
  User, InsertUser,
  Product, InsertProduct,
  Customer, InsertCustomer,
  Invoice, InsertInvoice,
  InvoiceItem, InsertInvoiceItem,
  DamagedItem, InsertDamagedItem,
  Employee, InsertEmployee,
  PaymentApproval, InsertPaymentApproval,
  ReportData, InsertReportData,
} from "@shared/schema";
import { IStorage } from "./storage";

export class RealtimeDBStorage implements IStorage {
  private generateId(collectionPath: string): number {
    // يستخدم الوقت الحالي كطريقة بسيطة لإنشاء معرفات فريدة
    return Date.now() + Math.floor(Math.random() * 1000);
  }

  // User Management
  async getUser(id: number): Promise<User | undefined> {
    try {
      const userRef = ref(database, `users/${id}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        return snapshot.val() as User;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        // البحث عن المستخدم بناءً على اسم المستخدم
        const foundUser = Object.values(users).find(
          (user: any) => user.username === username
        ) as User;
        
        return foundUser || undefined;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        return Object.values(snapshot.val()) as User[];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const id = this.generateId('users');
      const newUser: User = {
        id,
        ...user,
        createdAt: new Date().toISOString()
      };
      
      await set(ref(database, `users/${id}`), newUser);
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      const userRef = ref(database, `users/${id}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const currentUser = snapshot.val() as User;
        const updatedUser = {
          ...currentUser,
          ...userData,
          updatedAt: new Date().toISOString()
        };
        
        await update(ref(database, `users/${id}`), updatedUser);
        return updatedUser;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async deleteUser(id: number): Promise<void> {
    try {
      await remove(ref(database, `users/${id}`));
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async authenticateUser(email: string, password: string): Promise<User | undefined> {
    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        // البحث عن المستخدم بناءً على البريد الإلكتروني وكلمة المرور
        const foundUser = Object.values(users).find(
          (user: any) => 
            (user.email === email || user.username === email) && 
            user.password === password
        ) as User;
        
        return foundUser || undefined;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error authenticating user:', error);
      return undefined;
    }
  }

  // Product Management
  async getProduct(id: number): Promise<Product | undefined> {
    try {
      const productRef = ref(database, `products/${id}`);
      const snapshot = await get(productRef);
      
      if (snapshot.exists()) {
        return snapshot.val() as Product;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting product:', error);
      return undefined;
    }
  }

  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    try {
      const productsRef = ref(database, 'products');
      const snapshot = await get(productsRef);
      
      if (snapshot.exists()) {
        const products = snapshot.val();
        // البحث عن المنتج بناءً على الباركود
        const foundProduct = Object.values(products).find(
          (product: any) => product.barcode === barcode
        ) as Product;
        
        return foundProduct || undefined;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting product by barcode:', error);
      return undefined;
    }
  }

  async getAllProducts(): Promise<Product[]> {
    try {
      const productsRef = ref(database, 'products');
      const snapshot = await get(productsRef);
      
      if (snapshot.exists()) {
        return Object.values(snapshot.val()) as Product[];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting all products:', error);
      return [];
    }
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    try {
      const id = this.generateId('products');
      const newProduct: Product = {
        id,
        ...product,
        createdAt: new Date().toISOString()
      };
      
      await set(ref(database, `products/${id}`), newProduct);
      return newProduct;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async updateProduct(id: number, productData: Partial<Product>): Promise<Product | undefined> {
    try {
      const productRef = ref(database, `products/${id}`);
      const snapshot = await get(productRef);
      
      if (snapshot.exists()) {
        const currentProduct = snapshot.val() as Product;
        const updatedProduct = {
          ...currentProduct,
          ...productData,
          updatedAt: new Date().toISOString()
        };
        
        await update(ref(database, `products/${id}`), updatedProduct);
        return updatedProduct;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error updating product:', error);
      return undefined;
    }
  }

  async deleteProduct(id: number): Promise<void> {
    try {
      await remove(ref(database, `products/${id}`));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // Customer Management
  async getCustomer(id: number): Promise<Customer | undefined> {
    try {
      const customerRef = ref(database, `customers/${id}`);
      const snapshot = await get(customerRef);
      
      if (snapshot.exists()) {
        return snapshot.val() as Customer;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting customer:', error);
      return undefined;
    }
  }

  async getAllCustomers(): Promise<Customer[]> {
    try {
      const customersRef = ref(database, 'customers');
      const snapshot = await get(customersRef);
      
      if (snapshot.exists()) {
        return Object.values(snapshot.val()) as Customer[];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting all customers:', error);
      return [];
    }
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    try {
      const customersRef = ref(database, 'customers');
      const snapshot = await get(customersRef);
      
      if (snapshot.exists()) {
        const customers = Object.values(snapshot.val()) as Customer[];
        const normalizedQuery = query.toLowerCase();
        
        // البحث عن العملاء الذين تتطابق أسماؤهم أو أرقام هواتفهم مع معايير البحث
        return customers.filter(customer => 
          customer.name.toLowerCase().includes(normalizedQuery) || 
          customer.phone.includes(query)
        );
      }
      
      return [];
    } catch (error) {
      console.error('Error searching customers:', error);
      return [];
    }
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    try {
      const id = this.generateId('customers');
      const newCustomer: Customer = {
        id,
        ...customer,
        createdAt: new Date().toISOString()
      };
      
      await set(ref(database, `customers/${id}`), newCustomer);
      return newCustomer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  async updateCustomer(id: number, customerData: Partial<Customer>): Promise<Customer | undefined> {
    try {
      const customerRef = ref(database, `customers/${id}`);
      const snapshot = await get(customerRef);
      
      if (snapshot.exists()) {
        const currentCustomer = snapshot.val() as Customer;
        const updatedCustomer = {
          ...currentCustomer,
          ...customerData,
          updatedAt: new Date().toISOString()
        };
        
        await update(ref(database, `customers/${id}`), updatedCustomer);
        return updatedCustomer;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error updating customer:', error);
      return undefined;
    }
  }

  // Invoice Management
  async getInvoice(id: number): Promise<Invoice | undefined> {
    try {
      const invoiceRef = ref(database, `invoices/${id}`);
      const snapshot = await get(invoiceRef);
      
      if (snapshot.exists()) {
        return snapshot.val() as Invoice;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting invoice:', error);
      return undefined;
    }
  }

  async getAllInvoices(): Promise<Invoice[]> {
    try {
      const invoicesRef = ref(database, 'invoices');
      const snapshot = await get(invoicesRef);
      
      if (snapshot.exists()) {
        return Object.values(snapshot.val()) as Invoice[];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting all invoices:', error);
      return [];
    }
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    try {
      const id = this.generateId('invoices');
      const newInvoice: Invoice = {
        id,
        ...invoice,
        createdAt: new Date().toISOString()
      };
      
      await set(ref(database, `invoices/${id}`), newInvoice);
      return newInvoice;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  async updateInvoice(id: number, invoiceData: Partial<Invoice>): Promise<Invoice | undefined> {
    try {
      const invoiceRef = ref(database, `invoices/${id}`);
      const snapshot = await get(invoiceRef);
      
      if (snapshot.exists()) {
        const currentInvoice = snapshot.val() as Invoice;
        const updatedInvoice = {
          ...currentInvoice,
          ...invoiceData,
          updatedAt: new Date().toISOString()
        };
        
        await update(ref(database, `invoices/${id}`), updatedInvoice);
        return updatedInvoice;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error updating invoice:', error);
      return undefined;
    }
  }

  // Invoice Item Management
  async getInvoiceItem(id: number): Promise<InvoiceItem | undefined> {
    try {
      const invoiceItemRef = ref(database, `invoiceItems/${id}`);
      const snapshot = await get(invoiceItemRef);
      
      if (snapshot.exists()) {
        return snapshot.val() as InvoiceItem;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting invoice item:', error);
      return undefined;
    }
  }

  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    try {
      const invoiceItemsRef = ref(database, 'invoiceItems');
      const snapshot = await get(invoiceItemsRef);
      
      if (snapshot.exists()) {
        const allItems = Object.values(snapshot.val()) as InvoiceItem[];
        return allItems.filter(item => item.invoiceId === invoiceId);
      }
      
      return [];
    } catch (error) {
      console.error('Error getting invoice items:', error);
      return [];
    }
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    try {
      const id = this.generateId('invoiceItems');
      const newItem: InvoiceItem = {
        id,
        ...item,
        createdAt: new Date().toISOString()
      };
      
      await set(ref(database, `invoiceItems/${id}`), newItem);
      return newItem;
    } catch (error) {
      console.error('Error creating invoice item:', error);
      throw error;
    }
  }

  // Damaged Item Management
  async getDamagedItem(id: number): Promise<DamagedItem | undefined> {
    try {
      const damagedItemRef = ref(database, `damagedItems/${id}`);
      const snapshot = await get(damagedItemRef);
      
      if (snapshot.exists()) {
        return snapshot.val() as DamagedItem;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting damaged item:', error);
      return undefined;
    }
  }

  async getAllDamagedItems(): Promise<DamagedItem[]> {
    try {
      const damagedItemsRef = ref(database, 'damagedItems');
      const snapshot = await get(damagedItemsRef);
      
      if (snapshot.exists()) {
        return Object.values(snapshot.val()) as DamagedItem[];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting all damaged items:', error);
      return [];
    }
  }

  async createDamagedItem(item: InsertDamagedItem): Promise<DamagedItem> {
    try {
      const id = this.generateId('damagedItems');
      const newItem: DamagedItem = {
        id,
        ...item,
        createdAt: new Date().toISOString()
      };
      
      await set(ref(database, `damagedItems/${id}`), newItem);
      return newItem;
    } catch (error) {
      console.error('Error creating damaged item:', error);
      throw error;
    }
  }

  async updateDamagedItem(id: number, itemData: Partial<DamagedItem>): Promise<DamagedItem | undefined> {
    try {
      const damagedItemRef = ref(database, `damagedItems/${id}`);
      const snapshot = await get(damagedItemRef);
      
      if (snapshot.exists()) {
        const currentItem = snapshot.val() as DamagedItem;
        const updatedItem = {
          ...currentItem,
          ...itemData,
          updatedAt: new Date().toISOString()
        };
        
        await update(ref(database, `damagedItems/${id}`), updatedItem);
        return updatedItem;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error updating damaged item:', error);
      return undefined;
    }
  }

  async deleteDamagedItem(id: number): Promise<void> {
    try {
      await remove(ref(database, `damagedItems/${id}`));
    } catch (error) {
      console.error('Error deleting damaged item:', error);
      throw error;
    }
  }

  // Employee Management
  async getEmployee(id: number): Promise<Employee | undefined> {
    try {
      const employeeRef = ref(database, `employees/${id}`);
      const snapshot = await get(employeeRef);
      
      if (snapshot.exists()) {
        return snapshot.val() as Employee;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting employee:', error);
      return undefined;
    }
  }

  async getAllEmployees(): Promise<Employee[]> {
    try {
      const employeesRef = ref(database, 'employees');
      const snapshot = await get(employeesRef);
      
      if (snapshot.exists()) {
        return Object.values(snapshot.val()) as Employee[];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting all employees:', error);
      return [];
    }
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    try {
      const id = this.generateId('employees');
      const newEmployee: Employee = {
        id,
        ...employee,
        createdAt: new Date().toISOString()
      };
      
      await set(ref(database, `employees/${id}`), newEmployee);
      return newEmployee;
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  }

  async updateEmployee(id: number, employeeData: Partial<Employee>): Promise<Employee | undefined> {
    try {
      const employeeRef = ref(database, `employees/${id}`);
      const snapshot = await get(employeeRef);
      
      if (snapshot.exists()) {
        const currentEmployee = snapshot.val() as Employee;
        const updatedEmployee = {
          ...currentEmployee,
          ...employeeData,
          updatedAt: new Date().toISOString()
        };
        
        await update(ref(database, `employees/${id}`), updatedEmployee);
        return updatedEmployee;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error updating employee:', error);
      return undefined;
    }
  }

  async deleteEmployee(id: number): Promise<void> {
    try {
      await remove(ref(database, `employees/${id}`));
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  }

  // Payment Approval Management
  async getPaymentApproval(id: number): Promise<PaymentApproval | undefined> {
    try {
      const approvalRef = ref(database, `paymentApprovals/${id}`);
      const snapshot = await get(approvalRef);
      
      if (snapshot.exists()) {
        return snapshot.val() as PaymentApproval;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting payment approval:', error);
      return undefined;
    }
  }

  async getAllPaymentApprovals(): Promise<PaymentApproval[]> {
    try {
      const approvalsRef = ref(database, 'paymentApprovals');
      const snapshot = await get(approvalsRef);
      
      if (snapshot.exists()) {
        return Object.values(snapshot.val()) as PaymentApproval[];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting all payment approvals:', error);
      return [];
    }
  }

  async createPaymentApproval(approval: InsertPaymentApproval): Promise<PaymentApproval> {
    try {
      const id = this.generateId('paymentApprovals');
      const newApproval: PaymentApproval = {
        id,
        ...approval,
        createdAt: new Date().toISOString()
      };
      
      await set(ref(database, `paymentApprovals/${id}`), newApproval);
      return newApproval;
    } catch (error) {
      console.error('Error creating payment approval:', error);
      throw error;
    }
  }

  async updatePaymentApproval(id: number, approvalData: Partial<PaymentApproval>): Promise<PaymentApproval | undefined> {
    try {
      const approvalRef = ref(database, `paymentApprovals/${id}`);
      const snapshot = await get(approvalRef);
      
      if (snapshot.exists()) {
        const currentApproval = snapshot.val() as PaymentApproval;
        const updatedApproval = {
          ...currentApproval,
          ...approvalData,
          updatedAt: new Date().toISOString()
        };
        
        await update(ref(database, `paymentApprovals/${id}`), updatedApproval);
        return updatedApproval;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error updating payment approval:', error);
      return undefined;
    }
  }

  // إدارة بيانات التقارير
  async getReportData(type: string, date: string): Promise<any> {
    try {
      // جمع البيانات المطلوبة من مختلف الجداول للتقرير
      
      // البيانات من جدول الفواتير
      const invoicesRef = ref(database, 'invoices');
      const invoicesSnapshot = await get(invoicesRef);
      
      // البيانات من جدول العناصر التالفة
      const damagedItemsRef = ref(database, 'damagedItems');
      const damagedItemsSnapshot = await get(damagedItemsRef);
      
      // البيانات من جدول المنتجات
      const productsRef = ref(database, 'products');
      const productsSnapshot = await get(productsRef);
      
      let invoices: any[] = [];
      let damagedItems: any[] = [];
      let products: any[] = {};
      
      if (invoicesSnapshot.exists()) {
        invoices = Object.values(invoicesSnapshot.val() || {});
      }
      
      if (damagedItemsSnapshot.exists()) {
        damagedItems = Object.values(damagedItemsSnapshot.val() || {});
      }
      
      if (productsSnapshot.exists()) {
        const productsArray = Object.values(productsSnapshot.val() || {});
        products = productsArray.reduce((acc: any, product: any) => {
          acc[product.id] = product;
          return acc;
        }, {});
      }
      
      // تصفية البيانات حسب التاريخ
      const filteredInvoices = this.filterByDateType(invoices, type, date);
      const filteredDamagedItems = this.filterByDateType(damagedItems, type, date);
      
      // حساب البيانات الإجمالية
      const totalSales = filteredInvoices.reduce((sum, inv: any) => sum + (inv.total || 0), 0);
      const totalProfit = filteredInvoices.reduce((sum, inv: any) => {
        const profit = (inv.items || []).reduce((itemsProfit: number, item: any) => {
          const product = products[item.productId];
          const itemProfit = product ? (item.price - product.purchasePrice) * item.quantity : 0;
          return itemsProfit + itemProfit;
        }, 0);
        return sum + profit;
      }, 0);
      
      const totalDamages = filteredDamagedItems.reduce((sum, item: any) => sum + (item.valueLoss || 0), 0);
      const salesCount = filteredInvoices.length;
      
      // بيانات للمخطط البياني
      const chartData = this.generateChartData(filteredInvoices, type);
      
      // أفضل المنتجات مبيعاً
      const topProducts = this.calculateTopProducts(filteredInvoices, products);
      
      // تفاصيل التقارير اليومية
      const detailedReports = this.generateDetailedReports(filteredInvoices, filteredDamagedItems, type, date);
      
      // نحسب البيانات للفترة السابقة للمقارنة
      const prevDate = this.getPreviousPeriodDate(type, date);
      const prevFilteredInvoices = this.filterByDateType(invoices, type, prevDate);
      const prevFilteredDamagedItems = this.filterByDateType(damagedItems, type, prevDate);
      
      const previousTotalSales = prevFilteredInvoices.reduce((sum, inv: any) => sum + (inv.total || 0), 0);
      const previousTotalProfit = prevFilteredInvoices.reduce((sum, inv: any) => {
        const profit = (inv.items || []).reduce((itemsProfit: number, item: any) => {
          const product = products[item.productId];
          const itemProfit = product ? (item.price - product.purchasePrice) * item.quantity : 0;
          return itemsProfit + itemProfit;
        }, 0);
        return sum + profit;
      }, 0);
      
      const previousTotalDamages = prevFilteredDamagedItems.reduce((sum, item: any) => sum + (item.valueLoss || 0), 0);
      const previousSalesCount = prevFilteredInvoices.length;
      
      return {
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
    } catch (error) {
      console.error('Error getting report data:', error);
      // نعيد هيكل بيانات فارغ بدلاً من مصفوفة فارغة
      return {
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
      };
    }
  }
  
  // دالة مساعدة لتصفية البيانات حسب نوع التاريخ (يومي، أسبوعي، شهري، سنوي)
  private filterByDateType(items: any[], type: string, date: string): any[] {
    return items.filter((item) => {
      const itemDate = new Date(item.createdAt);
      const targetDate = new Date(date);
      
      if (type === 'daily') {
        return itemDate.toISOString().substring(0, 10) === date;
      } else if (type === 'weekly') {
        // نحتاج أن نضيف منطق الأسبوع هنا
        return true;
      } else if (type === 'monthly') {
        return itemDate.getFullYear() === targetDate.getFullYear() && 
               itemDate.getMonth() === targetDate.getMonth();
      } else if (type === 'yearly') {
        return itemDate.getFullYear() === targetDate.getFullYear();
      }
      
      return false;
    });
  }
  
  // دالة مساعدة لإنشاء بيانات المخطط البياني
  private generateChartData(invoices: any[], type: string): any[] {
    // هنا نقوم بإنشاء بيانات المخطط البياني حسب نوع التقرير
    if (type === 'daily') {
      // إنشاء بيانات لكل ساعة في اليوم
      return [
        { name: '9 AM', revenue: 0, profit: 0 },
        { name: '10 AM', revenue: 0, profit: 0 },
        { name: '11 AM', revenue: 0, profit: 0 },
        { name: '12 PM', revenue: 0, profit: 0 },
        { name: '1 PM', revenue: 0, profit: 0 },
        { name: '2 PM', revenue: 0, profit: 0 },
        { name: '3 PM', revenue: 0, profit: 0 },
      ];
    } else if (type === 'weekly') {
      // إنشاء بيانات لكل يوم في الأسبوع
      return [
        { name: 'الأحد', revenue: 0, profit: 0 },
        { name: 'الاثنين', revenue: 0, profit: 0 },
        { name: 'الثلاثاء', revenue: 0, profit: 0 },
        { name: 'الأربعاء', revenue: 0, profit: 0 },
        { name: 'الخميس', revenue: 0, profit: 0 },
        { name: 'الجمعة', revenue: 0, profit: 0 },
        { name: 'السبت', revenue: 0, profit: 0 },
      ];
    } else if (type === 'monthly') {
      // إنشاء بيانات لكل أسبوع في الشهر
      return [
        { name: 'الأسبوع 1', revenue: 0, profit: 0 },
        { name: 'الأسبوع 2', revenue: 0, profit: 0 },
        { name: 'الأسبوع 3', revenue: 0, profit: 0 },
        { name: 'الأسبوع 4', revenue: 0, profit: 0 },
      ];
    } else if (type === 'yearly') {
      // إنشاء بيانات لكل شهر في السنة
      return [
        { name: 'يناير', revenue: 0, profit: 0 },
        { name: 'فبراير', revenue: 0, profit: 0 },
        { name: 'مارس', revenue: 0, profit: 0 },
        { name: 'أبريل', revenue: 0, profit: 0 },
        { name: 'مايو', revenue: 0, profit: 0 },
        { name: 'يونيو', revenue: 0, profit: 0 },
        { name: 'يوليو', revenue: 0, profit: 0 },
        { name: 'أغسطس', revenue: 0, profit: 0 },
        { name: 'سبتمبر', revenue: 0, profit: 0 },
        { name: 'أكتوبر', revenue: 0, profit: 0 },
        { name: 'نوفمبر', revenue: 0, profit: 0 },
        { name: 'ديسمبر', revenue: 0, profit: 0 },
      ];
    }
    
    return [];
  }
  
  // دالة مساعدة لحساب أفضل المنتجات مبيعاً
  private calculateTopProducts(invoices: any[], products: any): any[] {
    // سنقوم بحساب أفضل المنتجات مبيعاً بناءً على عدد مرات البيع والإيرادات
    const productSales: Record<string, { id: number, name: string, soldQuantity: number, revenue: number, profit: number }> = {};
    
    // تجميع البيانات
    invoices.forEach((invoice: any) => {
      (invoice.items || []).forEach((item: any) => {
        const productId = item.productId;
        const product = products[productId];
        
        if (product) {
          if (!productSales[productId]) {
            productSales[productId] = {
              id: productId,
              name: product.name,
              soldQuantity: 0,
              revenue: 0,
              profit: 0
            };
          }
          
          const itemRevenue = item.price * item.quantity;
          const itemProfit = (item.price - product.purchasePrice) * item.quantity;
          
          productSales[productId].soldQuantity += item.quantity;
          productSales[productId].revenue += itemRevenue;
          productSales[productId].profit += itemProfit;
        }
      });
    });
    
    // تحويل إلى مصفوفة وترتيب حسب الإيرادات
    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5); // أعلى 5 منتجات
  }
  
  // دالة مساعدة لإنشاء تقارير مفصلة
  private generateDetailedReports(invoices: any[], damagedItems: any[], type: string, date: string): any[] {
    // إنشاء تقارير مفصلة حسب اليوم أو الأسبوع أو الشهر أو السنة
    // هذه دالة بسيطة للتوضيح
    const reports: any[] = [];
    
    // سنستخدم الفواتير والعناصر التالفة لإنشاء تقارير تفصيلية
    return reports;
  }
  
  // دالة مساعدة للحصول على تاريخ الفترة السابقة
  private getPreviousPeriodDate(type: string, date: string): string {
    const targetDate = new Date(date);
    
    if (type === 'daily') {
      // اليوم السابق
      targetDate.setDate(targetDate.getDate() - 1);
    } else if (type === 'weekly') {
      // الأسبوع السابق
      targetDate.setDate(targetDate.getDate() - 7);
    } else if (type === 'monthly') {
      // الشهر السابق
      targetDate.setMonth(targetDate.getMonth() - 1);
    } else if (type === 'yearly') {
      // السنة السابقة
      targetDate.setFullYear(targetDate.getFullYear() - 1);
    }
    
    return targetDate.toISOString().substring(0, 10);
  }

  async createReportData(reportData: InsertReportData): Promise<ReportData> {
    try {
      const id = this.generateId('reportData');
      const newReportData: ReportData = {
        id,
        ...reportData,
        createdAt: new Date().toISOString()
      };
      
      await set(ref(database, `reportData/${id}`), newReportData);
      return newReportData;
    } catch (error) {
      console.error('Error creating report data:', error);
      throw error;
    }
  }
}