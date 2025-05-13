import { database, ref, set, get, remove, update, query, orderByChild, equalTo } from "./firebase-rtdb";
import * as admin from "./firebase-rtdb"; // استخدم هذا المتغير للوصول إلى Firebase Admin
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
  EmployeeDeduction, InsertEmployeeDeduction,
  Notification, InsertNotification,
  Expense, InsertExpense,
  StoreInfo, InsertStoreInfo,
  Supplier, InsertSupplier,
  SupplierInvoice, InsertSupplierInvoice,
  SupplierPayment, InsertSupplierPayment
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
      
      // إضافة طباعة لمعرفة الحقول الواردة
      console.log('Creating invoice with these fields:', Object.keys(invoice));
      
      const newInvoice: Invoice = {
        id,
        ...invoice,
        createdAt: new Date().toISOString().replace('Z', ''),
        // التأكد من تضمين حقول المنتجات المنفصلة
        productIds: invoice.productIds || '',
        productNames: invoice.productNames || '',
        productQuantities: invoice.productQuantities || '',
        productPrices: invoice.productPrices || '',
        productPurchasePrices: invoice.productPurchasePrices || '',
        productDiscounts: invoice.productDiscounts || '',
        productTotals: invoice.productTotals || '',
        productProfits: invoice.productProfits || ''
      };
      
      // طباعة الكائن النهائي قبل الحفظ
      console.log('Final invoice object to save:', newInvoice);
      
      await set(ref(database, `invoices/${id}`), newInvoice);
      return newInvoice;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }
  
  /**
   * إنشاء فاتورة جديدة بمعرف محدد للاستخدام في تحديث الفواتير عن طريق إعادة إنشائها
   * 
   * @param id معرف الفاتورة المراد إنشاؤها
   * @param invoiceData بيانات الفاتورة بالكامل
   * @returns الفاتورة الجديدة
   */
  async createInvoiceWithId(id: number, invoiceData: any): Promise<Invoice> {
    try {
      console.log(`RealtimeDBStorage: Creating invoice with specific ID ${id}`);
      
      // تأكد من أن المعرف صحيح
      if (isNaN(id) || id <= 0) {
        throw new Error(`Invalid invoice ID: ${id}`);
      }
      
      // تجهيز البيانات
      const newInvoice: Invoice = {
        id, // استخدام المعرف المحدد
        ...invoiceData,
        // استخدام تواريخ محددة إذا تم تقديمها، وإلا استخدام الوقت الحالي
        createdAt: invoiceData.createdAt || new Date().toISOString(),
        date: invoiceData.date || invoiceData.createdAt || new Date().toISOString(),
        // التأكد من تضمين حقول المنتجات المنفصلة إذا لم تكن موجودة
        productIds: invoiceData.productIds || '',
        productNames: invoiceData.productNames || '',
        productQuantities: invoiceData.productQuantities || '',
        productPrices: invoiceData.productPrices || '',
        productPurchasePrices: invoiceData.productPurchasePrices || '',
        productDiscounts: invoiceData.productDiscounts || '',
        productTotals: invoiceData.productTotals || '',
        productProfits: invoiceData.productProfits || ''
      };
      
      console.log(`RealtimeDBStorage: Saving invoice with ID ${id} to database`);
      
      // حفظ الفاتورة في قاعدة البيانات مع المعرف المحدد
      await set(ref(database, `invoices/${id}`), newInvoice);
      
      return newInvoice;
    } catch (error) {
      console.error(`RealtimeDBStorage: Error creating invoice with ID ${id}:`, error);
      throw error;
    }
  }

  async updateInvoice(id: number, invoiceData: Partial<Invoice>): Promise<Invoice | undefined> {
    try {
      const invoiceRef = ref(database, `invoices/${id}`);
      const snapshot = await get(invoiceRef);
      
      if (snapshot.exists()) {
        const currentInvoice = snapshot.val() as Invoice;
        
        // طباعة المعلومات للتصحيح
        console.log(`Updating invoice ${id} with these fields:`, Object.keys(invoiceData));
        
        // معالجة بيانات المنتجات عند تحديث الفاتورة
        if (invoiceData.productsData) {
          try {
            const products = JSON.parse(invoiceData.productsData);
            console.log(`Found ${products.length} products in updated invoice data`);
            
            // استخراج بيانات المنتجات وتخزينها في المصفوفات المنفصلة
            const productIds: number[] = [];
            const productNames: string[] = [];
            const productQuantities: number[] = [];
            const productPrices: number[] = [];
            const productPurchasePrices: number[] = [];
            const productDiscounts: number[] = [];
            const productTotals: number[] = [];
            const productProfits: number[] = [];
            
            if (products && products.length > 0) {
              products.forEach((product: any) => {
                if (product) {
                  console.log('Processing product for invoice:', product);
                  productIds.push(product.id || product.productId);
                  productNames.push(product.name || product.productName || '');
                  productQuantities.push(product.quantity || 0);
                  productPrices.push(product.price || 0);
                  productPurchasePrices.push(product.purchasePrice || 0);
                  productDiscounts.push(product.discount || 0);
                  productTotals.push(product.total || 0);
                  productProfits.push(product.profit || 0);
                }
              });
              
              // إضافة الحقول المنفصلة إلى بيانات التحديث
              invoiceData.productIds = productIds.join(',');
              invoiceData.productNames = productNames.join('|');
              invoiceData.productQuantities = productQuantities.join(',');
              invoiceData.productPrices = productPrices.join(',');
              invoiceData.productPurchasePrices = productPurchasePrices.join(',');
              invoiceData.productDiscounts = productDiscounts.join(',');
              invoiceData.productTotals = productTotals.join(',');
              invoiceData.productProfits = productProfits.join(',');
            }
          } catch (error) {
            console.error('Error processing products data in updateInvoice:', error);
          }
        }
        
        // إذا لم يتم تحديد productsData في طلب التحديث، استخدم القيمة الحالية
        if (!invoiceData.productsData && currentInvoice.productsData) {
          console.log('Preserving existing productsData from invoice');
          invoiceData.productsData = currentInvoice.productsData;
        }
        
        const updatedInvoice = {
          ...currentInvoice,
          ...invoiceData,
          updatedAt: new Date().toISOString()
        };
        
        console.log('Final updated invoice data:', updatedInvoice);
        
        await update(ref(database, `invoices/${id}`), updatedInvoice);
        return updatedInvoice;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error updating invoice:', error);
      return undefined;
    }
  }
  
  async deleteInvoice(id: number): Promise<void> {
    try {
      console.log(`Permanently deleting invoice with ID: ${id} from Realtime Database`);
      
      // حذف الفاتورة نهائيًا من قاعدة البيانات
      const invoiceRef = ref(database, `invoices/${id}`);
      await remove(invoiceRef);
      
      console.log(`Successfully deleted invoice ${id} from Realtime Database`);
    } catch (error) {
      console.error(`Error deleting invoice ${id} from Realtime Database:`, error);
      throw new Error(`Failed to delete invoice: ${error.message}`);
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
        const items = Object.values(snapshot.val()) as any[];
        console.log('Found damaged items:', items.length);
        
        // تحويل حقل التاريخ من سلسلة نصية إلى كائن Date
        return items.map(item => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          description: item.description || null,
          valueLoss: item.valueLoss,
          date: item.date ? new Date(item.date) : new Date()
        }));
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
      
      // تبسيط معالجة البيانات للتخزين في Firebase
      const firebaseItem = {
        id,
        productId: item.productId,
        quantity: item.quantity,
        description: item.description || '',
        valueLoss: item.valueLoss,
        date: item.date ? item.date.toISOString() : new Date().toISOString()
      };
      
      console.log('Saving damaged item to Firebase:', firebaseItem);
      
      await set(ref(database, `damagedItems/${id}`), firebaseItem);
      
      // إنشاء وإرجاع كائن DamagedItem مع حقل التاريخ كـ Date
      const newItem: DamagedItem = {
        id,
        productId: item.productId,
        quantity: item.quantity,
        description: item.description || null,
        valueLoss: item.valueLoss,
        date: item.date || new Date()
      };
      
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
      
      // تبسيط عملية تخزين البيانات في Firebase
      const firebaseEmployee = {
        id,
        name: employee.name,
        hireDate: new Date().toISOString(), // تخزين التاريخ كنص بتنسيق ISO
        salary: employee.salary,
        deductions: employee.deductions || 0,
        userId: employee.userId || null
      };
      
      console.log('Saving employee to Firebase (simplified):', firebaseEmployee);
      
      await set(ref(database, `employees/${id}`), firebaseEmployee);
      
      // تكوين كائن Employee للإرجاع في API
      const newEmployee: Employee = {
        id,
        name: employee.name,
        hireDate: new Date(), // تخزين التاريخ ككائن Date في الكائن المرجع
        salary: employee.salary,
        deductions: employee.deductions || 0,
        userId: employee.userId || null
      };
      
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
  async getReportData(type: string, date: string, expenses: any[] = []): Promise<any> {
    try {
      console.log('Report request:', { type, date });
      
      // معالجة خاصة للتقارير الأسبوعية
      if (type === 'weekly') {
        // إذا كان التاريخ يحتوي على العام فقط
        if (date.length === 4) {
          const today = new Date().toISOString().substring(0, 10);
          console.log(`Converting year-only date ${date} to today's date: ${today} for weekly report`);
          date = today;
        }
        // إذا كان التاريخ بتنسيق YYYY-Wxx (تنسيق الأسبوع)
        else if (date.match(/^\d{4}-W\d{2}$/)) {
          console.log(`Weekly date format detected: ${date}`);
          const year = parseInt(date.substring(0, 4));
          const week = parseInt(date.substring(6, 8));
          
          // حساب التاريخ المقابل للأسبوع
          const jan1 = new Date(year, 0, 1);
          const dayOffset = jan1.getDay(); // عدد الأيام من بداية الأسبوع
          const dayNum = 1 + (week - 1) * 7; // اليوم التقريبي في السنة
          const targetDate = new Date(year, 0, dayNum);
          
          if (dayOffset > 0) {
            targetDate.setDate(targetDate.getDate() - dayOffset + 1);
          }
          
          date = targetDate.toISOString().substring(0, 10);
          console.log(`Converted week format to date: ${date}`);
        }
      }
      
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
      
      // البيانات من جدول المصاريف
      const expensesRef = ref(database, 'expenses');
      const expensesSnapshot = await get(expensesRef);
      
      let invoices: any[] = [];
      let damagedItems: any[] = [];
      let expenses: any[] = [];
      let products: any[] = {};
      
      if (invoicesSnapshot.exists()) {
        invoices = Object.values(invoicesSnapshot.val() || {});
        // استبعاد الفواتير المحذوفة
        invoices = invoices.filter(inv => !inv.isDeleted);
        console.log(`Found ${invoices.length} invoices`);
      }
      
      if (damagedItemsSnapshot.exists()) {
        damagedItems = Object.values(damagedItemsSnapshot.val() || {});
        console.log(`Found ${damagedItems.length} damaged items`);
      }
      
      if (expensesSnapshot.exists()) {
        expenses = Object.values(expensesSnapshot.val() || {});
        console.log(`Found ${expenses.length} expenses`);
      }
      
      if (productsSnapshot.exists()) {
        const productsArray = Object.values(productsSnapshot.val() || {});
        products = productsArray.reduce((acc: any, product: any) => {
          acc[product.id] = product;
          return acc;
        }, {});
      }
      
      // تصفية البيانات حسب التاريخ
      console.log(`Filtering data for ${type} report, date: ${date}`);
      const filteredInvoices = this.filterByDateType(invoices, type, date);
      const filteredDamagedItems = this.filterByDateType(damagedItems, type, date);
      const filteredExpenses = this.filterByDateType(expenses, type, date);
      
      console.log(`After filtering: ${filteredInvoices.length} invoices, ${filteredDamagedItems.length} damaged items, ${filteredExpenses.length} expenses`);
      
      // حساب البيانات الإجمالية
      const totalSales = filteredInvoices.reduce((sum, inv: any) => sum + (inv.total || 0), 0);
      const totalProfit = filteredInvoices.reduce((sum, inv: any) => {
        // إذا كانت الفاتورة تحتوي على productProfits (النموذج الجديد)، نستخدمه
        if (inv.productProfits) {
          try {
            // نحاول قراءة النص كمصفوفة أو كقائمة مفصولة بفواصل
            let profitsArray = Array.isArray(inv.productProfits) 
              ? inv.productProfits 
              : inv.productProfits.split(',');
              
            // نحول جميع القيم إلى أرقام ونجمعها
            return sum + profitsArray.reduce((total: number, profit: any) => total + Number(profit), 0);
          } catch (error) {
            console.error('خطأ أثناء معالجة الأرباح:', error);
            return sum;
          }
        } 
        
        // محاولة قراءة البيانات من productsData إذا كانت موجودة (نموذج الكائن JSON)
        else if (inv.productsData) {
          try {
            const productsData = JSON.parse(inv.productsData);
            const invoiceProfit = productsData.reduce((total: number, product: any) => {
              return total + (product.profit || 0);
            }, 0);
            return sum + invoiceProfit;
          } catch (error) {
            console.error('خطأ أثناء تحليل productsData:', error);
            return sum;
          }
        }
        
        // إذا لم نجد أي طريقة لحساب الربح، نعيد القيمة الحالية
        return sum;
      }, 0);
      
      const totalDamages = filteredDamagedItems.reduce((sum, item: any) => sum + (item.valueLoss || 0), 0);
      const salesCount = filteredInvoices.length;
      
      // بيانات للمخطط البياني
      const chartData = this.generateChartData(filteredInvoices, type);
      
      // أفضل المنتجات مبيعاً
      console.log("Calculating top products for " + type + ": " + date);
      const topProducts = this.calculateTopProducts(filteredInvoices, products);
      
      // تفاصيل التقارير اليومية
      const detailedReports = this.generateDetailedReports(filteredInvoices, filteredDamagedItems, filteredExpenses, type, date);
      
      // نحسب البيانات للفترة السابقة للمقارنة
      const prevDate = this.getPreviousPeriodDate(type, date);
      const prevFilteredInvoices = this.filterByDateType(invoices, type, prevDate);
      const prevFilteredDamagedItems = this.filterByDateType(damagedItems, type, prevDate);
      
      const previousTotalSales = prevFilteredInvoices.reduce((sum, inv: any) => sum + (inv.total || 0), 0);
      const previousTotalProfit = prevFilteredInvoices.reduce((sum, inv: any) => {
        // إذا كانت الفاتورة تحتوي على productProfits (النموذج الجديد)، نستخدمه
        if (inv.productProfits) {
          try {
            // نحاول قراءة النص كمصفوفة أو كقائمة مفصولة بفواصل
            let profitsArray = Array.isArray(inv.productProfits) 
              ? inv.productProfits 
              : inv.productProfits.split(',');
              
            // نحول جميع القيم إلى أرقام ونجمعها
            return sum + profitsArray.reduce((total: number, profit: any) => total + Number(profit), 0);
          } catch (error) {
            console.error('خطأ أثناء معالجة الأرباح للفترة السابقة:', error);
            return sum;
          }
        } 
        
        // محاولة قراءة البيانات من productsData إذا كانت موجودة (نموذج الكائن JSON)
        else if (inv.productsData) {
          try {
            const productsData = JSON.parse(inv.productsData);
            const invoiceProfit = productsData.reduce((total: number, product: any) => {
              return total + (product.profit || 0);
            }, 0);
            return sum + invoiceProfit;
          } catch (error) {
            console.error('خطأ أثناء تحليل productsData للفترة السابقة:', error);
            return sum;
          }
        }
        
        // إذا لم نجد أي طريقة لحساب الربح، نعيد القيمة الحالية
        return sum;
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
    console.log(`Filtering ${items.length} items by date type: ${type}, date: ${date}`);
    
    // معالجة خاصة للتقارير الأسبوعية
    if (type === 'weekly') {
      // إذا كان التاريخ يحتوي على العام فقط، نستخدم تاريخ اليوم
      if (date.length === 4) {
        const today = new Date().toISOString().substring(0, 10);
        console.log(`Converting year-only date (${date}) to today's date: ${today} for weekly filter`);
        date = today;
      }
      // إذا كان التاريخ بتنسيق YYYY-Wxx (تنسيق الأسبوع)
      else if (date.match(/^\d{4}-W\d{2}$/)) {
        console.log(`Weekly date format detected: ${date}`);
        const year = parseInt(date.substring(0, 4));
        const week = parseInt(date.substring(6, 8));
        
        // حساب التاريخ المقابل للأسبوع
        const jan1 = new Date(year, 0, 1);
        const dayOffset = jan1.getDay(); // عدد الأيام من بداية الأسبوع
        const dayNum = 1 + (week - 1) * 7; // اليوم التقريبي في السنة
        const targetDate = new Date(year, 0, dayNum);
        
        if (dayOffset > 0) {
          targetDate.setDate(targetDate.getDate() - dayOffset + 1);
        }
        
        date = targetDate.toISOString().substring(0, 10);
        console.log(`Converted week format to date: ${date}`);
      }
    }
    
    // طباعة جميع العناصر للتصحيح
    if (items.length > 0 && type === 'weekly') {
      console.log(`DEBUG: All items before filtering:`);
      items.forEach(item => {
        console.log(`  Item ID: ${item.id}, Date: ${item.date}, CreatedAt: ${item.createdAt}`);
      });
    }
    
    return items.filter((item) => {
      // نستخدم حقل date إذا كان موجودًا، وإلا نستخدم createdAt
      const itemDateStr = item.date || (item.createdAt ? new Date(item.createdAt).toISOString().substring(0, 10) : null);
      
      if (!itemDateStr) {
        console.log(`Item has no valid date:`, item);
        return false;
      }
      
      const itemDate = new Date(itemDateStr);
      const targetDate = new Date(date);
      
      console.log(`Item date: ${itemDateStr}, Target date: ${date}, Type: ${type}`);
      
      if (type === 'daily') {
        const result = itemDateStr === date;
        console.log(`Daily comparison: ${itemDateStr} === ${date}: ${result}`);
        return result;
      } else if (type === 'weekly') {
        console.log(`Weekly filtering for item ID: ${item.id}`);
        
        try {
          // الحصول على التاريخ الفعلي لعنصر البيانات
          const actualItemDate = new Date(itemDateStr);
          console.log(`Parsed item date: ${actualItemDate}`);
          
          // تحديد بداية ونهاية الأسبوع
          const weekStart = new Date(targetDate);
          weekStart.setDate(targetDate.getDate() - targetDate.getDay());
          
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          
          // تنسيق التواريخ للسجلات
          const weekStartStr = weekStart.toISOString().substring(0, 10);
          const weekEndStr = weekEnd.toISOString().substring(0, 10);
          
          console.log(`Week range: ${weekStartStr} to ${weekEndStr}`);
          
          // مقارنات مفصلة للتصحيح
          const isAfterStart = actualItemDate >= weekStart;
          const isBeforeEnd = actualItemDate <= weekEnd;
          console.log(`isAfterStart: ${isAfterStart}, isBeforeEnd: ${isBeforeEnd}`);
          
          const inRange = isAfterStart && isBeforeEnd;
          console.log(`Item ${item.id} (${itemDateStr}) in weekly range: ${inRange}`);
          
          return inRange;
        } catch (error) {
          console.error(`Error in weekly date filtering for item ${item.id}:`, error);
          return false;
        }
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
      console.log("Processing invoice for top products:", invoice.id, invoice.invoiceNumber);
      
      // نحاول استخراج بيانات المنتجات من productsData (JSON string)
      if (invoice.productsData) {
        try {
          const productsData = JSON.parse(invoice.productsData);
          
          // هذا الشكل الجديد للبيانات - مصفوفة من الكائنات
          productsData.forEach((item: any) => {
            const productId = item.productId;
            
            if (!productSales[productId]) {
              productSales[productId] = {
                id: productId,
                name: item.productName || (products[productId] ? products[productId].name : "منتج غير معروف"),
                soldQuantity: 0,
                revenue: 0,
                profit: 0
              };
            }
            
            productSales[productId].soldQuantity += item.quantity;
            productSales[productId].revenue += item.total;
            productSales[productId].profit += item.profit;
          });
        } catch (error) {
          console.error("خطأ في تحليل productsData:", error);
        }
      }
      // إذا لم نجد productsData، نحاول استخدام الحقول المنفصلة
      else if (invoice.productIds) {
        try {
          const productIds = invoice.productIds.split(',');
          const productQuantities = invoice.productQuantities ? invoice.productQuantities.split(',') : [];
          const productPrices = invoice.productPrices ? invoice.productPrices.split(',') : [];
          const productProfits = invoice.productProfits ? invoice.productProfits.split(',') : [];
          const productNames = invoice.productNames ? invoice.productNames.split(',') : [];
          
          productIds.forEach((productId: string, index: number) => {
            const id = Number(productId);
            const quantity = Number(productQuantities[index] || 0);
            const price = Number(productPrices[index] || 0);
            const profit = Number(productProfits[index] || 0);
            const name = productNames[index] || (products[id] ? products[id].name : "منتج غير معروف");
            
            if (!productSales[id]) {
              productSales[id] = {
                id: id,
                name: name,
                soldQuantity: 0,
                revenue: 0,
                profit: 0
              };
            }
            
            productSales[id].soldQuantity += quantity;
            productSales[id].revenue += price * quantity;
            productSales[id].profit += profit;
          });
        } catch (error) {
          console.error("خطأ في معالجة حقول المنتج المنفصلة:", error);
        }
      } 
      // الطريقة القديمة (للتوافق) - غير مستخدمة حالياً
      else if (invoice.items && Array.isArray(invoice.items)) {
        invoice.items.forEach((item: any) => {
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
      }
    
    });
    
    // تحويل إلى مصفوفة وترتيب حسب الإيرادات
    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5); // أعلى 5 منتجات
  }
  
  // دالة مساعدة لإنشاء تقارير مفصلة
  private generateDetailedReports(invoices: any[], damagedItems: any[], expenses: any[], type: string, date: string): any[] {
    // إنشاء تقارير مفصلة حسب اليوم أو الأسبوع أو الشهر أو السنة
    const reports: any[] = [];
    
    // إضافة تقارير المبيعات
    invoices.forEach(invoice => {
      if (!invoice.isDeleted) {
        let profit = 0;
        
        // محاولة حساب الربح من productProfits
        if (invoice.productProfits) {
          try {
            let profitsArray = Array.isArray(invoice.productProfits) 
              ? invoice.productProfits 
              : invoice.productProfits.split(',');
              
            profit = profitsArray.reduce((total: number, p: any) => total + Number(p), 0);
          } catch (error) {
            console.error('خطأ في حساب الربح من productProfits:', error);
          }
        }
        // محاولة حساب الربح من productsData
        else if (invoice.productsData) {
          try {
            const productsData = JSON.parse(invoice.productsData);
            profit = productsData.reduce((total: number, product: any) => {
              return total + (product.profit || 0);
            }, 0);
          } catch (error) {
            console.error('خطأ في تحليل productsData لحساب الربح:', error);
          }
        }
        
        // إضافة البيانات إلى التقرير التفصيلي
        reports.push({
          id: invoice.id,
          date: invoice.date,
          type: 'sale',
          amount: invoice.total,
          profit: profit,
          details: `Invoice #${invoice.invoiceNumber}, Payment: ${invoice.paymentMethod}`,
          customerName: invoice.customerName,
          paymentStatus: invoice.paymentStatus
        });
      }
    });
    
    // إضافة تقارير العناصر التالفة
    damagedItems.forEach(item => {
      reports.push({
        id: item.id,
        date: new Date(item.createdAt).toISOString().substring(0, 10),
        type: 'damage',
        amount: item.valueLoss,
        details: item.description || 'No description',
        productName: 'منتج غير معروف', // ينبغي الحصول على اسم المنتج من قاعدة البيانات
        quantity: item.quantity
      });
    });
    
    // إضافة إحصائية إجمالية للتوالف حسب الفترة
    if (damagedItems.length > 0) {
      const totalDamages = damagedItems.reduce((sum, item) => sum + (item.valueLoss || 0), 0);
      reports.push({
        id: `summary-damaged-${date}`,
        date: date,
        type: 'summary',
        category: 'damaged',
        amount: totalDamages,
        details: 'إجمالي قيمة التوالف للفترة'
      });
    }
    
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

  // تنفيذ وظائف إدارة الإشعارات

  async getNotification(id: number): Promise<Notification | undefined> {
    try {
      const snapshot = await get(ref(database, `notifications/${id}`));
      if (!snapshot.exists()) {
        return undefined;
      }
      return snapshot.val() as Notification;
    } catch (error) {
      console.error('Error getting notification:', error);
      return undefined;
    }
  }

  async getAllNotifications(): Promise<Notification[]> {
    try {
      const notificationsRef = ref(database, 'notifications');
      const snapshot = await get(notificationsRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const notifications: Notification[] = [];
      snapshot.forEach((childSnapshot) => {
        notifications.push(childSnapshot.val() as Notification);
      });
      
      // ترتيب الإشعارات من الأحدث إلى الأقدم
      return notifications.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } catch (error) {
      console.error('Error getting all notifications:', error);
      return [];
    }
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    try {
      // نحصل على جميع الإشعارات ثم نقوم بتصفيتها يدويا حسب معرف المستخدم
      // هذا أبطأ ولكنه لا يتطلب تعديل قواعد الأمان في Firebase
      const notifications = await this.getAllNotifications();
      
      // فلترة الإشعارات حسب معرف المستخدم
      return notifications.filter(notification => notification.userId === userId);
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const id = this.generateId('notifications');
      const newNotification: Notification = {
        id,
        ...notification,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      
      await set(ref(database, `notifications/${id}`), newNotification);
      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    try {
      const notificationRef = ref(database, `notifications/${id}`);
      const snapshot = await get(notificationRef);
      
      if (!snapshot.exists()) {
        return undefined;
      }
      
      const notification = snapshot.val() as Notification;
      notification.isRead = true;
      
      await update(notificationRef, { isRead: true });
      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return undefined;
    }
  }

  async deleteNotification(id: number): Promise<void> {
    try {
      await remove(ref(database, `notifications/${id}`));
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Employee Deduction Management
  async getEmployeeDeduction(id: number): Promise<EmployeeDeduction | undefined> {
    try {
      const deductionRef = ref(database, `employee_deductions/${id}`);
      const snapshot = await get(deductionRef);
      
      if (snapshot.exists()) {
        const deductionData = snapshot.val();
        // Convert date string to Date object if available
        if (deductionData.date) {
          deductionData.date = new Date(deductionData.date);
        }
        return deductionData as EmployeeDeduction;
      }
      return undefined;
    } catch (error) {
      console.error('Error getting employee deduction:', error);
      return undefined;
    }
  }

  async getEmployeeDeductions(employeeId: string): Promise<EmployeeDeduction[]> {
    try {
      const deductionsRef = ref(database, 'employee_deductions');
      const snapshot = await get(deductionsRef);
      
      if (snapshot.exists()) {
        const deductions: EmployeeDeduction[] = [];
        const deductionsData = snapshot.val();
        
        // Loop through all deductions
        Object.keys(deductionsData).forEach(key => {
          const deduction = deductionsData[key];
          // Check if this deduction belongs to the specified employee
          if (deduction.employeeId === employeeId) {
            // Convert date string to Date object if available
            if (deduction.date) {
              deduction.date = new Date(deduction.date);
            }
            deductions.push({
              ...deduction,
              id: parseInt(key)
            });
          }
        });
        
        // Sort by date, newest first
        return deductions.sort((a, b) => {
          if (!a.date || !b.date) return 0;
          return b.date.getTime() - a.date.getTime();
        });
      }
      
      return [];
    } catch (error) {
      console.error('Error getting employee deductions:', error);
      return [];
    }
  }

  async getAllEmployeeDeductions(): Promise<EmployeeDeduction[]> {
    try {
      const deductionsRef = ref(database, 'employee_deductions');
      const snapshot = await get(deductionsRef);
      
      if (snapshot.exists()) {
        const deductions: EmployeeDeduction[] = [];
        const deductionsData = snapshot.val();
        
        // Loop through all deductions
        Object.keys(deductionsData).forEach(key => {
          const deduction = deductionsData[key];
          // Convert date string to Date object if available
          if (deduction.date) {
            deduction.date = new Date(deduction.date);
          }
          deductions.push({
            ...deduction,
            id: parseInt(key)
          });
        });
        
        // Sort by date, newest first
        return deductions.sort((a, b) => {
          if (!a.date || !b.date) return 0;
          return b.date.getTime() - a.date.getTime();
        });
      }
      
      return [];
    } catch (error) {
      console.error('Error getting all employee deductions:', error);
      return [];
    }
  }

  async createEmployeeDeduction(deduction: InsertEmployeeDeduction): Promise<EmployeeDeduction> {
    try {
      // Generate ID for the new deduction
      const id = this.generateId('employee_deductions');
      
      // Ensure date is set
      if (!deduction.date) {
        deduction.date = new Date();
      }
      
      // Save to database
      const deductionData = {
        ...deduction,
        id,
        date: deduction.date.toISOString() // Convert Date to string for storage
      };
      
      const deductionRef = ref(database, `employee_deductions/${id}`);
      await set(deductionRef, deductionData);
      
      // Update employee's total deductions
      try {
        const employeeRef = ref(database, `employees/${deduction.employeeId}`);
        const employeeSnapshot = await get(employeeRef);
        
        if (employeeSnapshot.exists()) {
          const employee = employeeSnapshot.val();
          const currentDeductions = employee.deductions || 0;
          const newDeductions = currentDeductions + deduction.amount;
          
          // Update employee record
          await update(employeeRef, { deductions: newDeductions });
        }
      } catch (error) {
        console.error('Error updating employee deductions:', error);
        // Continue even if updating the employee record fails
      }
      
      // Return with date as Date object
      return {
        ...deductionData,
        date: new Date(deductionData.date)
      };
    } catch (error) {
      console.error('Error creating employee deduction:', error);
      throw error;
    }
  }

  async updateEmployeeDeduction(id: number, deductionData: Partial<EmployeeDeduction>): Promise<EmployeeDeduction | undefined> {
    try {
      // Get current deduction
      const currentDeduction = await this.getEmployeeDeduction(id);
      if (!currentDeduction) {
        return undefined;
      }
      
      // Handle date conversion if provided
      if (deductionData.date) {
        deductionData.date = deductionData.date.toISOString();
      }
      
      // Update record
      const deductionRef = ref(database, `employee_deductions/${id}`);
      await update(deductionRef, deductionData);
      
      // If amount changed, update employee's total deductions
      if (deductionData.amount !== undefined && deductionData.amount !== currentDeduction.amount) {
        try {
          const employeeId = currentDeduction.employeeId;
          const amountDifference = deductionData.amount - currentDeduction.amount;
          
          const employeeRef = ref(database, `employees/${employeeId}`);
          const employeeSnapshot = await get(employeeRef);
          
          if (employeeSnapshot.exists()) {
            const employee = employeeSnapshot.val();
            const currentDeductions = employee.deductions || 0;
            const newDeductions = currentDeductions + amountDifference;
            
            // Update employee record
            await update(employeeRef, { deductions: newDeductions });
          }
        } catch (error) {
          console.error('Error updating employee deductions after deduction update:', error);
          // Continue even if updating the employee record fails
        }
      }
      
      // Retrieve updated record
      return await this.getEmployeeDeduction(id);
    } catch (error) {
      console.error('Error updating employee deduction:', error);
      return undefined;
    }
  }

  async deleteEmployeeDeduction(id: number): Promise<void> {
    try {
      // Get current deduction before deleting
      const deduction = await this.getEmployeeDeduction(id);
      if (!deduction) {
        return;
      }
      
      // Delete the deduction
      const deductionRef = ref(database, `employee_deductions/${id}`);
      await remove(deductionRef);
      
      // Update employee's total deductions
      try {
        const employeeId = deduction.employeeId;
        const deductionAmount = deduction.amount;
        
        const employeeRef = ref(database, `employees/${employeeId}`);
        const employeeSnapshot = await get(employeeRef);
        
        if (employeeSnapshot.exists()) {
          const employee = employeeSnapshot.val();
          const currentDeductions = employee.deductions || 0;
          const newDeductions = Math.max(0, currentDeductions - deductionAmount);
          
          // Update employee record
          await update(employeeRef, { deductions: newDeductions });
        }
      } catch (error) {
        console.error('Error updating employee deductions after deduction deletion:', error);
        // Continue even if updating the employee record fails
      }
    } catch (error) {
      console.error('Error deleting employee deduction:', error);
      throw error;
    }
  }
  
  // Expenses management (مصاريف ونثريات)
  async getExpense(id: number): Promise<Expense | undefined> {
    try {
      const expenseRef = ref(database, `expenses/${id}`);
      const snapshot = await get(expenseRef);
      
      if (!snapshot.exists()) return undefined;
      
      const data = snapshot.val();
      return {
        id,
        date: new Date(data.date),
        amount: data.amount,
        details: data.details,
        createdAt: new Date(data.createdAt),
        userId: data.userId,
        expenseType: data.expenseType || 'miscellaneous'
      };
    } catch (error) {
      console.error('Error getting expense:', error);
      return undefined;
    }
  }

  async getAllExpenses(): Promise<Expense[]> {
    try {
      const expensesRef = ref(database, 'expenses');
      const snapshot = await get(expensesRef);
      
      if (!snapshot.exists()) return [];
      
      const expenses: Expense[] = [];
      snapshot.forEach((childSnapshot) => {
        const id = Number(childSnapshot.key);
        const data = childSnapshot.val();
        
        expenses.push({
          id,
          date: new Date(data.date),
          amount: data.amount,
          details: data.details,
          createdAt: new Date(data.createdAt),
          userId: data.userId,
          expenseType: data.expenseType || 'miscellaneous'
        });
      });
      
      return expenses;
    } catch (error) {
      console.error('Error getting all expenses:', error);
      return [];
    }
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    try {
      const id = this.generateId('expenses');
      const now = new Date().toISOString();
      
      const newExpense = {
        date: expense.date instanceof Date ? expense.date.toISOString() : expense.date,
        amount: expense.amount,
        details: expense.details,
        createdAt: now,
        userId: expense.userId,
        expenseType: expense.expenseType || 'miscellaneous'
      };
      
      await set(ref(database, `expenses/${id}`), newExpense);
      
      return {
        id,
        date: expense.date instanceof Date ? expense.date : new Date(expense.date),
        amount: expense.amount,
        details: expense.details,
        createdAt: new Date(now),
        userId: expense.userId,
        expenseType: expense.expenseType || 'miscellaneous'
      };
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  async updateExpense(id: number, expenseData: Partial<Expense>): Promise<Expense | undefined> {
    try {
      const expenseRef = ref(database, `expenses/${id}`);
      const snapshot = await get(expenseRef);
      
      if (!snapshot.exists()) return undefined;
      
      const data = snapshot.val();
      const updatedData: any = { ...data };
      
      if (expenseData.date) {
        updatedData.date = expenseData.date instanceof Date 
          ? expenseData.date.toISOString() 
          : expenseData.date;
      }
      
      if (expenseData.amount !== undefined) {
        updatedData.amount = expenseData.amount;
      }
      
      if (expenseData.details !== undefined) {
        updatedData.details = expenseData.details;
      }
      
      if (expenseData.expenseType !== undefined) {
        updatedData.expenseType = expenseData.expenseType;
      }
      
      await update(expenseRef, updatedData);
      
      return {
        id,
        date: new Date(updatedData.date),
        amount: updatedData.amount,
        details: updatedData.details,
        createdAt: new Date(updatedData.createdAt),
        expenseType: updatedData.expenseType || 'miscellaneous',
        userId: updatedData.userId
      };
    } catch (error) {
      console.error('Error updating expense:', error);
      return undefined;
    }
  }

  async deleteExpense(id: number): Promise<void> {
    try {
      const expenseRef = ref(database, `expenses/${id}`);
      await remove(expenseRef);
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }

  // Store Information Management
  async getStoreInfo(): Promise<StoreInfo | undefined> {
    try {
      const storeInfoRef = ref(database, 'store_info/1'); // نستخدم معرف ثابت '1' لأن المتجر واحد فقط
      const snapshot = await get(storeInfoRef);
      
      if (!snapshot.exists()) {
        return undefined;
      }
      
      const storeData = snapshot.val();
      return {
        id: 1,
        name: storeData.name,
        address: storeData.address,
        phone: storeData.phone,
        updatedAt: storeData.updatedAt ? new Date(storeData.updatedAt) : new Date()
      };
    } catch (error) {
      console.error('Error getting store information:', error);
      return undefined;
    }
  }

  async updateStoreInfo(storeData: InsertStoreInfo): Promise<StoreInfo> {
    try {
      const storeInfoRef = ref(database, 'store_info/1'); // نستخدم معرف ثابت '1' لأن المتجر واحد فقط
      const now = new Date().toISOString();
      
      const storeInfoToSave = {
        ...storeData,
        updatedAt: now
      };
      
      await set(storeInfoRef, storeInfoToSave);
      
      return {
        id: 1,
        ...storeData,
        updatedAt: new Date(now)
      };
    } catch (error) {
      console.error('Error updating store information:', error);
      throw error;
    }
  }

  // وظائف إدارة الموردين (Supplier Management)
  async getSupplier(id: number): Promise<Supplier | undefined> {
    try {
      const supplierRef = ref(database, `suppliers/${id}`);
      const snapshot = await get(supplierRef);
      
      if (!snapshot.exists()) {
        return undefined;
      }
      
      const data = snapshot.val();
      return {
        id,
        name: data.name,
        phone: data.phone || null,
        address: data.address || null,
        notes: data.notes || null,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
      };
    } catch (error) {
      console.error('Error getting supplier:', error);
      return undefined;
    }
  }

  async getAllSuppliers(): Promise<Supplier[]> {
    try {
      const suppliersRef = ref(database, 'suppliers');
      const snapshot = await get(suppliersRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const suppliers: Supplier[] = [];
      snapshot.forEach((childSnapshot) => {
        const id = parseInt(childSnapshot.key || '0');
        const data = childSnapshot.val();
        
        suppliers.push({
          id,
          name: data.name,
          phone: data.phone || null,
          address: data.address || null,
          notes: data.notes || null,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt)
        });
      });
      
      return suppliers;
    } catch (error) {
      console.error('Error getting all suppliers:', error);
      return [];
    }
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    try {
      console.log("RealtimeDBStorage: Creating supplier", supplier);
      const id = this.generateId('suppliers');
      const now = new Date().toISOString();
      
      const newSupplier = {
        ...supplier,
        createdAt: now,
        updatedAt: now
      };
      
      const supplierRef = ref(database, `suppliers/${id}`);
      await set(supplierRef, newSupplier);
      
      return {
        id,
        ...supplier,
        createdAt: new Date(now),
        updatedAt: new Date(now)
      };
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  }

  async updateSupplier(id: number, supplierData: Partial<Supplier>): Promise<Supplier | undefined> {
    try {
      const supplierRef = ref(database, `suppliers/${id}`);
      const snapshot = await get(supplierRef);
      
      if (!snapshot.exists()) {
        return undefined;
      }
      
      const now = new Date().toISOString();
      const updates = {
        ...supplierData,
        updatedAt: now
      };
      
      await update(supplierRef, updates);
      
      // Get updated supplier
      const updatedSnapshot = await get(supplierRef);
      const updatedData = updatedSnapshot.val();
      
      return {
        id,
        name: updatedData.name,
        phone: updatedData.phone || null,
        address: updatedData.address || null,
        notes: updatedData.notes || null,
        createdAt: new Date(updatedData.createdAt),
        updatedAt: new Date(updatedData.updatedAt)
      };
    } catch (error) {
      console.error('Error updating supplier:', error);
      return undefined;
    }
  }

  async deleteSupplier(id: number): Promise<void> {
    try {
      const supplierRef = ref(database, `suppliers/${id}`);
      await remove(supplierRef);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  }

  // وظائف إدارة فواتير الموردين (Supplier Invoice Management)
  async getSupplierInvoice(id: number): Promise<SupplierInvoice | undefined> {
    try {
      const invoiceRef = ref(database, `supplier_invoices/${id}`);
      const snapshot = await get(invoiceRef);
      
      if (!snapshot.exists()) {
        return undefined;
      }
      
      const data = snapshot.val();
      return {
        id,
        invoiceNumber: data.invoiceNumber,
        supplierId: data.supplierId,
        date: new Date(data.date),
        amount: data.amount,
        paidAmount: data.paidAmount || 0,
        paymentStatus: data.paymentStatus,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes || null,
        userId: data.userId,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
      };
    } catch (error) {
      console.error('Error getting supplier invoice:', error);
      return undefined;
    }
  }

  async getAllSupplierInvoices(): Promise<SupplierInvoice[]> {
    try {
      const invoicesRef = ref(database, 'supplier_invoices');
      const snapshot = await get(invoicesRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const invoices: SupplierInvoice[] = [];
      snapshot.forEach((childSnapshot) => {
        const id = parseInt(childSnapshot.key || '0');
        const data = childSnapshot.val();
        
        invoices.push({
          id,
          invoiceNumber: data.invoiceNumber,
          supplierId: data.supplierId,
          date: new Date(data.date),
          amount: data.amount,
          paidAmount: data.paidAmount || 0,
          paymentStatus: data.paymentStatus,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          notes: data.notes || null,
          userId: data.userId,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt)
        });
      });
      
      return invoices;
    } catch (error) {
      console.error('Error getting all supplier invoices:', error);
      return [];
    }
  }

  async getSupplierInvoicesBySupplierId(supplierId: number): Promise<SupplierInvoice[]> {
    try {
      const invoicesRef = ref(database, 'supplier_invoices');
      const snapshot = await get(invoicesRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const invoices: SupplierInvoice[] = [];
      snapshot.forEach((childSnapshot) => {
        const id = parseInt(childSnapshot.key || '0');
        const data = childSnapshot.val();
        
        if (data.supplierId === supplierId) {
          invoices.push({
            id,
            invoiceNumber: data.invoiceNumber,
            supplierId: data.supplierId,
            date: new Date(data.date),
            amount: data.amount,
            paidAmount: data.paidAmount || 0,
            paymentStatus: data.paymentStatus,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            notes: data.notes || null,
            userId: data.userId,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt)
          });
        }
      });
      
      return invoices;
    } catch (error) {
      console.error('Error getting supplier invoices by supplier ID:', error);
      return [];
    }
  }

  async createSupplierInvoice(invoice: InsertSupplierInvoice): Promise<SupplierInvoice> {
    try {
      const id = this.generateId('supplier_invoices');
      const now = new Date().toISOString();
      
      const newInvoice = {
        ...invoice,
        paidAmount: invoice.paidAmount || 0,
        paymentStatus: invoice.paymentStatus || 'pending',
        createdAt: now,
        updatedAt: now
      };
      
      const invoiceRef = ref(database, `supplier_invoices/${id}`);
      await set(invoiceRef, newInvoice);
      
      return {
        id,
        ...invoice,
        paidAmount: invoice.paidAmount || 0,
        paymentStatus: invoice.paymentStatus || 'pending',
        date: new Date(invoice.date),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
        createdAt: new Date(now),
        updatedAt: new Date(now)
      };
    } catch (error) {
      console.error('Error creating supplier invoice:', error);
      throw error;
    }
  }

  async updateSupplierInvoice(id: number, invoiceData: Partial<SupplierInvoice>): Promise<SupplierInvoice | undefined> {
    try {
      const invoiceRef = ref(database, `supplier_invoices/${id}`);
      const snapshot = await get(invoiceRef);
      
      if (!snapshot.exists()) {
        return undefined;
      }
      
      const now = new Date().toISOString();
      const updates = {
        ...invoiceData,
        updatedAt: now
      };
      
      // Convert Date objects to ISO strings for Firebase
      if (invoiceData.date) {
        updates.date = invoiceData.date.toISOString();
      }
      if (invoiceData.dueDate) {
        updates.dueDate = invoiceData.dueDate.toISOString();
      }
      
      await update(invoiceRef, updates);
      
      // Get updated invoice
      const updatedSnapshot = await get(invoiceRef);
      const data = updatedSnapshot.val();
      
      return {
        id,
        invoiceNumber: data.invoiceNumber,
        supplierId: data.supplierId,
        date: new Date(data.date),
        amount: data.amount,
        paidAmount: data.paidAmount || 0,
        paymentStatus: data.paymentStatus,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes || null,
        userId: data.userId,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
      };
    } catch (error) {
      console.error('Error updating supplier invoice:', error);
      return undefined;
    }
  }

  async deleteSupplierInvoice(id: number): Promise<void> {
    try {
      const invoiceRef = ref(database, `supplier_invoices/${id}`);
      await remove(invoiceRef);
    } catch (error) {
      console.error('Error deleting supplier invoice:', error);
      throw error;
    }
  }

  // وظائف إدارة مدفوعات الموردين (Supplier Payment Management)
  async getSupplierPayment(id: number): Promise<SupplierPayment | undefined> {
    try {
      const paymentRef = ref(database, `supplier_payments/${id}`);
      const snapshot = await get(paymentRef);
      
      if (!snapshot.exists()) {
        return undefined;
      }
      
      const data = snapshot.val();
      return {
        id,
        supplierInvoiceId: data.supplierInvoiceId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paymentDate: new Date(data.paymentDate),
        notes: data.notes || null,
        userId: data.userId,
        createdAt: new Date(data.createdAt)
      };
    } catch (error) {
      console.error('Error getting supplier payment:', error);
      return undefined;
    }
  }

  async getAllSupplierPayments(): Promise<SupplierPayment[]> {
    try {
      const paymentsRef = ref(database, 'supplier_payments');
      const snapshot = await get(paymentsRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const payments: SupplierPayment[] = [];
      snapshot.forEach((childSnapshot) => {
        const id = parseInt(childSnapshot.key || '0');
        const data = childSnapshot.val();
        
        payments.push({
          id,
          supplierInvoiceId: data.supplierInvoiceId,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          paymentDate: new Date(data.paymentDate),
          notes: data.notes || null,
          userId: data.userId,
          createdAt: new Date(data.createdAt)
        });
      });
      
      return payments;
    } catch (error) {
      console.error('Error getting all supplier payments:', error);
      return [];
    }
  }

  async getSupplierPaymentsByInvoiceId(invoiceId: number): Promise<SupplierPayment[]> {
    try {
      const paymentsRef = ref(database, 'supplier_payments');
      const snapshot = await get(paymentsRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const payments: SupplierPayment[] = [];
      snapshot.forEach((childSnapshot) => {
        const id = parseInt(childSnapshot.key || '0');
        const data = childSnapshot.val();
        
        if (data.supplierInvoiceId === invoiceId) {
          payments.push({
            id,
            supplierInvoiceId: data.supplierInvoiceId,
            amount: data.amount,
            paymentMethod: data.paymentMethod,
            paymentDate: new Date(data.paymentDate),
            notes: data.notes || null,
            userId: data.userId,
            createdAt: new Date(data.createdAt)
          });
        }
      });
      
      return payments;
    } catch (error) {
      console.error('Error getting supplier payments by invoice ID:', error);
      return [];
    }
  }

  async createSupplierPayment(payment: InsertSupplierPayment): Promise<SupplierPayment> {
    try {
      const id = this.generateId('supplier_payments');
      const now = new Date().toISOString();
      
      const newPayment = {
        ...payment,
        createdAt: now
      };
      
      // Convert Date objects to ISO strings for Firebase
      if (payment.paymentDate) {
        newPayment.paymentDate = payment.paymentDate.toISOString();
      }
      
      const paymentRef = ref(database, `supplier_payments/${id}`);
      await set(paymentRef, newPayment);
      
      // Update the invoice's paidAmount and status
      try {
        const invoiceRef = ref(database, `supplier_invoices/${payment.supplierInvoiceId}`);
        const invoiceSnapshot = await get(invoiceRef);
        
        if (invoiceSnapshot.exists()) {
          const invoiceData = invoiceSnapshot.val();
          const newPaidAmount = (invoiceData.paidAmount || 0) + payment.amount;
          let newStatus = 'pending';
          
          if (newPaidAmount >= invoiceData.amount) {
            newStatus = 'paid';
          } else if (newPaidAmount > 0) {
            newStatus = 'partially_paid';
          }
          
          await update(invoiceRef, {
            paidAmount: newPaidAmount,
            paymentStatus: newStatus,
            updatedAt: now
          });
        }
      } catch (error) {
        console.error('Error updating invoice after payment:', error);
        // Continue even if updating the invoice fails
      }
      
      return {
        id,
        ...payment,
        paymentDate: new Date(payment.paymentDate),
        createdAt: new Date(now)
      };
    } catch (error) {
      console.error('Error creating supplier payment:', error);
      throw error;
    }
  }
  
  // Report Data Management
  async getReportData(type: string, date: string): Promise<ReportData[]> {
    try {
      console.log(`RealtimeDBStorage: Getting report data for type ${type} and date ${date}`);
      const reportsRef = ref(database, 'report_data');
      const snapshot = await get(reportsRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const reports: ReportData[] = [];
      const searchDate = new Date(date);
      
      // تحويل بيانات التقارير وتصفيتها
      snapshot.forEach((childSnapshot) => {
        const id = parseInt(childSnapshot.key || '0');
        const data = childSnapshot.val();
        const reportDate = new Date(data.date);
        
        // التصفية حسب نوع التقرير والتاريخ
        if (type === 'daily') {
          if (reportDate.getFullYear() === searchDate.getFullYear() &&
              reportDate.getMonth() === searchDate.getMonth() &&
              reportDate.getDate() === searchDate.getDate()) {
            reports.push({
              id,
              date: reportDate,
              type: data.type,
              salesCount: data.salesCount,
              revenue: data.revenue,
              cost: data.cost,
              discounts: data.discounts,
              damages: data.damages,
              profit: data.profit,
              dataJson: data.dataJson || null,
              createdAt: new Date(data.createdAt),
            });
          }
        } else if (type === 'monthly') {
          if (reportDate.getFullYear() === searchDate.getFullYear() &&
              reportDate.getMonth() === searchDate.getMonth()) {
            reports.push({
              id,
              date: reportDate,
              type: data.type,
              salesCount: data.salesCount,
              revenue: data.revenue,
              cost: data.cost,
              discounts: data.discounts,
              damages: data.damages,
              profit: data.profit,
              dataJson: data.dataJson || null,
              createdAt: new Date(data.createdAt),
            });
          }
        } else if (type === 'yearly') {
          if (reportDate.getFullYear() === searchDate.getFullYear()) {
            reports.push({
              id,
              date: reportDate,
              type: data.type,
              salesCount: data.salesCount,
              revenue: data.revenue,
              cost: data.cost,
              discounts: data.discounts,
              damages: data.damages,
              profit: data.profit,
              dataJson: data.dataJson || null,
              createdAt: new Date(data.createdAt),
            });
          }
        }
      });
      
      return reports;
    } catch (error) {
      console.error('Error getting report data:', error);
      return [];
    }
  }

  async createReportData(reportData: InsertReportData): Promise<ReportData> {
    try {
      const id = this.generateId('report_data');
      const now = new Date().toISOString();
      
      // تحويل التاريخ إلى سلسلة نصية للتخزين في Firebase
      const newReportData = {
        ...reportData,
        id,
        createdAt: now,
        date: reportData.date ? reportData.date.toISOString() : now,
      };
      
      const reportRef = ref(database, `report_data/${id}`);
      await set(reportRef, newReportData);
      
      return {
        ...newReportData,
        id,
        date: new Date(newReportData.date),
        createdAt: new Date(now),
        dataJson: reportData.dataJson || null,
      };
    } catch (error) {
      console.error('Error creating report data:', error);
      throw error;
    }
  }
  
  /**
   * حذف بيانات التقرير بواسطة المعرف
   * مهم لتحديث التقارير عند تعديل أو حذف الفواتير
   * 
   * @param id معرف التقرير المراد حذفه
   */
  async deleteReportData(id: number): Promise<void> {
    try {
      console.log(`RealtimeDBStorage: Deleting report data with ID ${id}`);
      const reportRef = ref(database, `report_data/${id}`);
      
      // التحقق من وجود التقرير قبل الحذف
      const snapshot = await get(reportRef);
      if (!snapshot.exists()) {
        console.warn(`RealtimeDBStorage: Report data with ID ${id} does not exist`);
        return;
      }
      
      // حذف التقرير
      await remove(reportRef);
      console.log(`RealtimeDBStorage: Successfully deleted report data with ID ${id}`);
    } catch (error) {
      console.error(`RealtimeDBStorage: Error deleting report data with ID ${id}:`, error);
      throw error;
    }
  }
}