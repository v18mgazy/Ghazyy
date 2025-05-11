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
  type Notification, type InsertNotification
} from "@shared/schema";
import { db } from './lib/firebase';
import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, Timestamp, FieldValue, serverTimestamp
} from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import { LocalFirebaseStorage } from './local-firebase-storage';

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;
  authenticateUser(email: string, password: string): Promise<User | undefined>;
  
  // Product management
  getProduct(id: number): Promise<Product | undefined>;
  getProductByBarcode(barcode: string): Promise<Product | undefined>;
  getAllProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, productData: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;
  
  // Customer management
  getCustomer(id: number): Promise<Customer | undefined>;
  getAllCustomers(): Promise<Customer[]>;
  searchCustomers(query: string): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customerData: Partial<Customer>): Promise<Customer | undefined>;
  
  // Invoice management
  getInvoice(id: number): Promise<Invoice | undefined>;
  getAllInvoices(): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoiceData: Partial<Invoice>): Promise<Invoice | undefined>;
  
  // Invoice item management
  getInvoiceItem(id: number): Promise<InvoiceItem | undefined>;
  getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  
  // Damaged item management
  getDamagedItem(id: number): Promise<DamagedItem | undefined>;
  getAllDamagedItems(): Promise<DamagedItem[]>;
  createDamagedItem(item: InsertDamagedItem): Promise<DamagedItem>;
  updateDamagedItem(id: number, itemData: Partial<DamagedItem>): Promise<DamagedItem | undefined>;
  deleteDamagedItem(id: number): Promise<void>;
  
  // Employee management
  getEmployee(id: number): Promise<Employee | undefined>;
  getAllEmployees(): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employeeData: Partial<Employee>): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<void>;
  
  // Payment approval management
  getPaymentApproval(id: number): Promise<PaymentApproval | undefined>;
  getAllPaymentApprovals(): Promise<PaymentApproval[]>;
  createPaymentApproval(approval: InsertPaymentApproval): Promise<PaymentApproval>;
  updatePaymentApproval(id: number, approvalData: Partial<PaymentApproval>): Promise<PaymentApproval | undefined>;
  
  // Report data management
  getReportData(type: string, date: string): Promise<ReportData[]>;
  createReportData(reportData: InsertReportData): Promise<ReportData>;
  
  // Notification management
  getNotification(id: number): Promise<Notification | undefined>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  getAllNotifications(): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  deleteNotification(id: number): Promise<void>;
}

export class FirebaseStorage implements IStorage {
  // User management
  async getUser(id: number): Promise<User | undefined> {
    try {
      const userDoc = await getDoc(doc(db, 'users', id.toString()));
      if (!userDoc.exists()) return undefined;
      
      const userData = userDoc.data();
      return {
        id,
        username: userData.username,
        password: userData.password,
        name: userData.name,
        role: userData.role,
        status: userData.status,
        lastLogin: userData.lastLogin?.toDate()
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) return undefined;
      
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      return {
        id: parseInt(userDoc.id),
        username: userData.username,
        password: userData.password,
        name: userData.name,
        role: userData.role,
        status: userData.status,
        lastLogin: userData.lastLogin?.toDate()
      };
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }
  
  async getAllUsers(): Promise<User[]> {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      return querySnapshot.docs.map(doc => {
        const userData = doc.data();
        return {
          id: parseInt(doc.id),
          username: userData.username,
          password: userData.password,
          name: userData.name,
          role: userData.role,
          status: userData.status,
          lastLogin: userData.lastLogin?.toDate()
        };
      });
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }
  
  async createUser(user: InsertUser): Promise<User> {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // Generate a new ID
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      const newId = querySnapshot.size + 1;
      
      // Create user document
      const userData = {
        ...user,
        password: hashedPassword
      };
      
      await setDoc(doc(db, 'users', newId.toString()), userData);
      
      return {
        ...userData,
        id: newId
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      const userDoc = await getDoc(doc(db, 'users', id.toString()));
      if (!userDoc.exists()) return undefined;
      
      // If password is provided, hash it
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
      }
      
      await updateDoc(doc(db, 'users', id.toString()), userData);
      
      // Get updated user
      const updatedUserDoc = await getDoc(doc(db, 'users', id.toString()));
      const updatedUserData = updatedUserDoc.data();
      
      return {
        id,
        username: updatedUserData.username,
        password: updatedUserData.password,
        name: updatedUserData.name,
        role: updatedUserData.role,
        status: updatedUserData.status,
        lastLogin: updatedUserData.lastLogin?.toDate()
      };
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }
  
  async deleteUser(id: number): Promise<void> {
    try {
      await deleteDoc(doc(db, 'users', id.toString()));
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
  
  async authenticateUser(email: string, password: string): Promise<User | undefined> {
    try {
      // For simplicity, assuming email is the username
      const user = await this.getUserByUsername(email);
      if (!user) return undefined;
      
      // Check password
      const match = await bcrypt.compare(password, user.password);
      if (!match) return undefined;
      
      // Update last login
      await updateDoc(doc(db, 'users', user.id.toString()), {
        lastLogin: serverTimestamp()
      });
      
      return user;
    } catch (error) {
      console.error('Error authenticating user:', error);
      return undefined;
    }
  }
  
  // Product management
  async getProduct(id: number): Promise<Product | undefined> {
    try {
      const productDoc = await getDoc(doc(db, 'products', id.toString()));
      if (!productDoc.exists()) return undefined;
      
      const productData = productDoc.data();
      return {
        id,
        name: productData.name,
        barcode: productData.barcode,
        alternativeCode: productData.alternativeCode,
        purchasePrice: productData.purchasePrice,
        sellingPrice: productData.sellingPrice,
        stock: productData.stock,
        createdAt: productData.createdAt?.toDate(),
        updatedAt: productData.updatedAt?.toDate()
      };
    } catch (error) {
      console.error('Error getting product:', error);
      return undefined;
    }
  }
  
  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    try {
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('barcode', '==', barcode));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) return undefined;
      
      const productDoc = querySnapshot.docs[0];
      const productData = productDoc.data();
      
      return {
        id: parseInt(productDoc.id),
        name: productData.name,
        barcode: productData.barcode,
        alternativeCode: productData.alternativeCode,
        purchasePrice: productData.purchasePrice,
        sellingPrice: productData.sellingPrice,
        stock: productData.stock,
        createdAt: productData.createdAt?.toDate(),
        updatedAt: productData.updatedAt?.toDate()
      };
    } catch (error) {
      console.error('Error getting product by barcode:', error);
      return undefined;
    }
  }
  
  async getAllProducts(): Promise<Product[]> {
    try {
      const productsRef = collection(db, 'products');
      const querySnapshot = await getDocs(productsRef);
      
      return querySnapshot.docs.map(doc => {
        const productData = doc.data();
        return {
          id: parseInt(doc.id),
          name: productData.name,
          barcode: productData.barcode,
          alternativeCode: productData.alternativeCode,
          purchasePrice: productData.purchasePrice,
          sellingPrice: productData.sellingPrice,
          stock: productData.stock,
          createdAt: productData.createdAt?.toDate(),
          updatedAt: productData.updatedAt?.toDate()
        };
      });
    } catch (error) {
      console.error('Error getting all products:', error);
      return [];
    }
  }
  
  async createProduct(product: InsertProduct): Promise<Product> {
    try {
      // Generate a new ID
      const productsRef = collection(db, 'products');
      const querySnapshot = await getDocs(productsRef);
      const newId = querySnapshot.size + 1;
      
      // Create product document
      const now = serverTimestamp();
      const productData = {
        ...product,
        createdAt: now,
        updatedAt: now
      };
      
      await setDoc(doc(db, 'products', newId.toString()), productData);
      
      return {
        ...productData,
        id: newId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }
  
  async updateProduct(id: number, productData: Partial<Product>): Promise<Product | undefined> {
    try {
      const productDoc = await getDoc(doc(db, 'products', id.toString()));
      if (!productDoc.exists()) return undefined;
      
      // Update product document
      await updateDoc(doc(db, 'products', id.toString()), {
        ...productData,
        updatedAt: serverTimestamp()
      });
      
      // Get updated product
      const updatedProductDoc = await getDoc(doc(db, 'products', id.toString()));
      const updatedProductData = updatedProductDoc.data();
      
      return {
        id,
        name: updatedProductData.name,
        barcode: updatedProductData.barcode,
        alternativeCode: updatedProductData.alternativeCode,
        purchasePrice: updatedProductData.purchasePrice,
        sellingPrice: updatedProductData.sellingPrice,
        stock: updatedProductData.stock,
        createdAt: updatedProductData.createdAt?.toDate(),
        updatedAt: updatedProductData.updatedAt?.toDate()
      };
    } catch (error) {
      console.error('Error updating product:', error);
      return undefined;
    }
  }
  
  async deleteProduct(id: number): Promise<void> {
    try {
      await deleteDoc(doc(db, 'products', id.toString()));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }
  
  // Customer management
  async getCustomer(id: number): Promise<Customer | undefined> {
    try {
      const customerDoc = await getDoc(doc(db, 'customers', id.toString()));
      if (!customerDoc.exists()) return undefined;
      
      const customerData = customerDoc.data();
      return {
        id,
        name: customerData.name,
        phone: customerData.phone,
        address: customerData.address,
        isPotential: customerData.isPotential,
        createdAt: customerData.createdAt?.toDate(),
        updatedAt: customerData.updatedAt?.toDate()
      };
    } catch (error) {
      console.error('Error getting customer:', error);
      return undefined;
    }
  }
  
  async getAllCustomers(): Promise<Customer[]> {
    try {
      const customersRef = collection(db, 'customers');
      const querySnapshot = await getDocs(customersRef);
      
      return querySnapshot.docs.map(doc => {
        const customerData = doc.data();
        return {
          id: parseInt(doc.id),
          name: customerData.name,
          phone: customerData.phone,
          address: customerData.address,
          isPotential: customerData.isPotential,
          createdAt: customerData.createdAt?.toDate(),
          updatedAt: customerData.updatedAt?.toDate()
        };
      });
    } catch (error) {
      console.error('Error getting all customers:', error);
      return [];
    }
  }
  
  async searchCustomers(query: string): Promise<Customer[]> {
    try {
      // For simplicity, fetch all customers and filter in memory
      // In a real app, you would use Firestore's search capabilities or Algolia
      const customers = await this.getAllCustomers();
      
      // Filter customers by name, phone, or address containing the query
      return customers.filter(customer => 
        customer.name.toLowerCase().includes(query.toLowerCase()) ||
        (customer.phone && customer.phone.includes(query)) ||
        (customer.address && customer.address.toLowerCase().includes(query.toLowerCase()))
      );
    } catch (error) {
      console.error('Error searching customers:', error);
      return [];
    }
  }
  
  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    try {
      // Generate a new ID
      const customersRef = collection(db, 'customers');
      const querySnapshot = await getDocs(customersRef);
      const newId = querySnapshot.size + 1;
      
      // Create customer document
      const now = serverTimestamp();
      const customerData = {
        ...customer,
        createdAt: now,
        updatedAt: now
      };
      
      await setDoc(doc(db, 'customers', newId.toString()), customerData);
      
      return {
        ...customerData,
        id: newId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }
  
  async updateCustomer(id: number, customerData: Partial<Customer>): Promise<Customer | undefined> {
    try {
      const customerDoc = await getDoc(doc(db, 'customers', id.toString()));
      if (!customerDoc.exists()) return undefined;
      
      // Update customer document
      await updateDoc(doc(db, 'customers', id.toString()), {
        ...customerData,
        updatedAt: serverTimestamp()
      });
      
      // Get updated customer
      const updatedCustomerDoc = await getDoc(doc(db, 'customers', id.toString()));
      const updatedCustomerData = updatedCustomerDoc.data();
      
      return {
        id,
        name: updatedCustomerData.name,
        phone: updatedCustomerData.phone,
        address: updatedCustomerData.address,
        isPotential: updatedCustomerData.isPotential,
        createdAt: updatedCustomerData.createdAt?.toDate(),
        updatedAt: updatedCustomerData.updatedAt?.toDate()
      };
    } catch (error) {
      console.error('Error updating customer:', error);
      return undefined;
    }
  }
  
  // Invoice management
  async getInvoice(id: number): Promise<Invoice | undefined> {
    try {
      const invoiceDoc = await getDoc(doc(db, 'invoices', id.toString()));
      if (!invoiceDoc.exists()) return undefined;
      
      const invoiceData = invoiceDoc.data();
      return {
        id,
        invoiceNumber: invoiceData.invoiceNumber,
        customerId: invoiceData.customerId,
        date: invoiceData.date?.toDate(),
        subtotal: invoiceData.subtotal,
        discount: invoiceData.discount,
        total: invoiceData.total,
        paymentMethod: invoiceData.paymentMethod,
        paymentStatus: invoiceData.paymentStatus,
        userId: invoiceData.userId,
        createdAt: invoiceData.createdAt?.toDate()
      };
    } catch (error) {
      console.error('Error getting invoice:', error);
      return undefined;
    }
  }
  
  async getAllInvoices(): Promise<Invoice[]> {
    try {
      const invoicesRef = collection(db, 'invoices');
      const querySnapshot = await getDocs(invoicesRef);
      
      return querySnapshot.docs.map(doc => {
        const invoiceData = doc.data();
        return {
          id: parseInt(doc.id),
          invoiceNumber: invoiceData.invoiceNumber,
          customerId: invoiceData.customerId,
          date: invoiceData.date?.toDate(),
          subtotal: invoiceData.subtotal,
          discount: invoiceData.discount,
          total: invoiceData.total,
          paymentMethod: invoiceData.paymentMethod,
          paymentStatus: invoiceData.paymentStatus,
          userId: invoiceData.userId,
          createdAt: invoiceData.createdAt?.toDate()
        };
      });
    } catch (error) {
      console.error('Error getting all invoices:', error);
      return [];
    }
  }
  
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    try {
      // Generate a new ID
      const invoicesRef = collection(db, 'invoices');
      const querySnapshot = await getDocs(invoicesRef);
      const newId = querySnapshot.size + 1;
      
      // Create invoice document
      const now = serverTimestamp();
      const invoiceDate = invoice.date ? Timestamp.fromDate(new Date(invoice.date)) : now;
      const invoiceData = {
        ...invoice,
        date: invoiceDate,
        createdAt: now
      };
      
      await setDoc(doc(db, 'invoices', newId.toString()), invoiceData);
      
      return {
        ...invoiceData,
        id: newId,
        date: invoiceDate instanceof Timestamp ? invoiceDate.toDate() : new Date(),
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }
  
  async updateInvoice(id: number, invoiceData: Partial<Invoice>): Promise<Invoice | undefined> {
    try {
      const invoiceDoc = await getDoc(doc(db, 'invoices', id.toString()));
      if (!invoiceDoc.exists()) return undefined;
      
      // Update invoice document
      await updateDoc(doc(db, 'invoices', id.toString()), invoiceData);
      
      // Get updated invoice
      const updatedInvoiceDoc = await getDoc(doc(db, 'invoices', id.toString()));
      const updatedInvoiceData = updatedInvoiceDoc.data();
      
      return {
        id,
        invoiceNumber: updatedInvoiceData.invoiceNumber,
        customerId: updatedInvoiceData.customerId,
        date: updatedInvoiceData.date?.toDate(),
        subtotal: updatedInvoiceData.subtotal,
        discount: updatedInvoiceData.discount,
        total: updatedInvoiceData.total,
        paymentMethod: updatedInvoiceData.paymentMethod,
        paymentStatus: updatedInvoiceData.paymentStatus,
        userId: updatedInvoiceData.userId,
        createdAt: updatedInvoiceData.createdAt?.toDate()
      };
    } catch (error) {
      console.error('Error updating invoice:', error);
      return undefined;
    }
  }
  
  // Invoice item management
  async getInvoiceItem(id: number): Promise<InvoiceItem | undefined> {
    try {
      const itemDoc = await getDoc(doc(db, 'invoice_items', id.toString()));
      if (!itemDoc.exists()) return undefined;
      
      const itemData = itemDoc.data();
      return {
        id,
        invoiceId: itemData.invoiceId,
        productId: itemData.productId,
        quantity: itemData.quantity,
        price: itemData.price,
        total: itemData.total
      };
    } catch (error) {
      console.error('Error getting invoice item:', error);
      return undefined;
    }
  }
  
  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    try {
      const itemsRef = collection(db, 'invoice_items');
      const q = query(itemsRef, where('invoiceId', '==', invoiceId));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const itemData = doc.data();
        return {
          id: parseInt(doc.id),
          invoiceId: itemData.invoiceId,
          productId: itemData.productId,
          quantity: itemData.quantity,
          price: itemData.price,
          total: itemData.total
        };
      });
    } catch (error) {
      console.error('Error getting invoice items:', error);
      return [];
    }
  }
  
  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    try {
      // Generate a new ID
      const itemsRef = collection(db, 'invoice_items');
      const querySnapshot = await getDocs(itemsRef);
      const newId = querySnapshot.size + 1;
      
      // Create invoice item document
      await setDoc(doc(db, 'invoice_items', newId.toString()), item);
      
      // Update product stock
      const product = await this.getProduct(item.productId);
      if (product) {
        await this.updateProduct(item.productId, {
          stock: product.stock - item.quantity
        });
      }
      
      return {
        ...item,
        id: newId
      };
    } catch (error) {
      console.error('Error creating invoice item:', error);
      throw error;
    }
  }
  
  // Damaged item management
  async getDamagedItem(id: number): Promise<DamagedItem | undefined> {
    try {
      const itemDoc = await getDoc(doc(db, 'damaged_items', id.toString()));
      if (!itemDoc.exists()) return undefined;
      
      const itemData = itemDoc.data();
      return {
        id,
        productId: itemData.productId,
        quantity: itemData.quantity,
        description: itemData.description,
        date: itemData.date?.toDate(),
        valueLoss: itemData.valueLoss
      };
    } catch (error) {
      console.error('Error getting damaged item:', error);
      return undefined;
    }
  }
  
  async getAllDamagedItems(): Promise<DamagedItem[]> {
    try {
      const itemsRef = collection(db, 'damaged_items');
      const querySnapshot = await getDocs(itemsRef);
      
      return querySnapshot.docs.map(doc => {
        const itemData = doc.data();
        return {
          id: parseInt(doc.id),
          productId: itemData.productId,
          quantity: itemData.quantity,
          description: itemData.description,
          date: itemData.date?.toDate(),
          valueLoss: itemData.valueLoss
        };
      });
    } catch (error) {
      console.error('Error getting all damaged items:', error);
      return [];
    }
  }
  
  async createDamagedItem(item: InsertDamagedItem): Promise<DamagedItem> {
    try {
      // Generate a new ID
      const itemsRef = collection(db, 'damaged_items');
      const querySnapshot = await getDocs(itemsRef);
      const newId = querySnapshot.size + 1;
      
      // Create damaged item document
      const itemDate = item.date ? Timestamp.fromDate(new Date(item.date)) : serverTimestamp();
      const itemData = {
        ...item,
        date: itemDate
      };
      
      await setDoc(doc(db, 'damaged_items', newId.toString()), itemData);
      
      return {
        ...itemData,
        id: newId,
        date: itemDate instanceof Timestamp ? itemDate.toDate() : new Date()
      };
    } catch (error) {
      console.error('Error creating damaged item:', error);
      throw error;
    }
  }
  
  async updateDamagedItem(id: number, itemData: Partial<DamagedItem>): Promise<DamagedItem | undefined> {
    try {
      const itemDoc = await getDoc(doc(db, 'damaged_items', id.toString()));
      if (!itemDoc.exists()) return undefined;
      
      // Update damaged item document
      if (itemData.date) {
        itemData.date = Timestamp.fromDate(new Date(itemData.date));
      }
      
      await updateDoc(doc(db, 'damaged_items', id.toString()), itemData);
      
      // Get updated damaged item
      const updatedItemDoc = await getDoc(doc(db, 'damaged_items', id.toString()));
      const updatedItemData = updatedItemDoc.data();
      
      return {
        id,
        productId: updatedItemData.productId,
        quantity: updatedItemData.quantity,
        description: updatedItemData.description,
        date: updatedItemData.date?.toDate(),
        valueLoss: updatedItemData.valueLoss
      };
    } catch (error) {
      console.error('Error updating damaged item:', error);
      return undefined;
    }
  }
  
  async deleteDamagedItem(id: number): Promise<void> {
    try {
      await deleteDoc(doc(db, 'damaged_items', id.toString()));
    } catch (error) {
      console.error('Error deleting damaged item:', error);
      throw error;
    }
  }
  
  // Employee management
  async getEmployee(id: number): Promise<Employee | undefined> {
    try {
      const employeeDoc = await getDoc(doc(db, 'employees', id.toString()));
      if (!employeeDoc.exists()) return undefined;
      
      const employeeData = employeeDoc.data();
      return {
        id,
        name: employeeData.name,
        hireDate: employeeData.hireDate?.toDate(),
        salary: employeeData.salary,
        deductions: employeeData.deductions,
        userId: employeeData.userId
      };
    } catch (error) {
      console.error('Error getting employee:', error);
      return undefined;
    }
  }
  
  async getAllEmployees(): Promise<Employee[]> {
    try {
      const employeesRef = collection(db, 'employees');
      const querySnapshot = await getDocs(employeesRef);
      
      return querySnapshot.docs.map(doc => {
        const employeeData = doc.data();
        return {
          id: parseInt(doc.id),
          name: employeeData.name,
          hireDate: employeeData.hireDate?.toDate(),
          salary: employeeData.salary,
          deductions: employeeData.deductions,
          userId: employeeData.userId
        };
      });
    } catch (error) {
      console.error('Error getting all employees:', error);
      return [];
    }
  }
  
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    try {
      // Generate a new ID
      const employeesRef = collection(db, 'employees');
      const querySnapshot = await getDocs(employeesRef);
      const newId = querySnapshot.size + 1;
      
      // Create employee document
      const hireDate = employee.hireDate ? Timestamp.fromDate(new Date(employee.hireDate)) : serverTimestamp();
      const employeeData = {
        ...employee,
        hireDate
      };
      
      await setDoc(doc(db, 'employees', newId.toString()), employeeData);
      
      return {
        ...employeeData,
        id: newId,
        hireDate: hireDate instanceof Timestamp ? hireDate.toDate() : new Date()
      };
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  }
  
  async updateEmployee(id: number, employeeData: Partial<Employee>): Promise<Employee | undefined> {
    try {
      const employeeDoc = await getDoc(doc(db, 'employees', id.toString()));
      if (!employeeDoc.exists()) return undefined;
      
      // Update employee document
      if (employeeData.hireDate) {
        employeeData.hireDate = Timestamp.fromDate(new Date(employeeData.hireDate));
      }
      
      await updateDoc(doc(db, 'employees', id.toString()), employeeData);
      
      // Get updated employee
      const updatedEmployeeDoc = await getDoc(doc(db, 'employees', id.toString()));
      const updatedEmployeeData = updatedEmployeeDoc.data();
      
      return {
        id,
        name: updatedEmployeeData.name,
        hireDate: updatedEmployeeData.hireDate?.toDate(),
        salary: updatedEmployeeData.salary,
        deductions: updatedEmployeeData.deductions,
        userId: updatedEmployeeData.userId
      };
    } catch (error) {
      console.error('Error updating employee:', error);
      return undefined;
    }
  }
  
  async deleteEmployee(id: number): Promise<void> {
    try {
      await deleteDoc(doc(db, 'employees', id.toString()));
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  }
  
  // Payment approval management
  async getPaymentApproval(id: number): Promise<PaymentApproval | undefined> {
    try {
      const approvalDoc = await getDoc(doc(db, 'payment_approvals', id.toString()));
      if (!approvalDoc.exists()) return undefined;
      
      const approvalData = approvalDoc.data();
      return {
        id,
        invoiceId: approvalData.invoiceId,
        requestedBy: approvalData.requestedBy,
        approvedBy: approvalData.approvedBy,
        status: approvalData.status,
        createdAt: approvalData.createdAt?.toDate(),
        updatedAt: approvalData.updatedAt?.toDate()
      };
    } catch (error) {
      console.error('Error getting payment approval:', error);
      return undefined;
    }
  }
  
  async getAllPaymentApprovals(): Promise<PaymentApproval[]> {
    try {
      const approvalsRef = collection(db, 'payment_approvals');
      const querySnapshot = await getDocs(approvalsRef);
      
      return querySnapshot.docs.map(doc => {
        const approvalData = doc.data();
        return {
          id: parseInt(doc.id),
          invoiceId: approvalData.invoiceId,
          requestedBy: approvalData.requestedBy,
          approvedBy: approvalData.approvedBy,
          status: approvalData.status,
          createdAt: approvalData.createdAt?.toDate(),
          updatedAt: approvalData.updatedAt?.toDate()
        };
      });
    } catch (error) {
      console.error('Error getting all payment approvals:', error);
      return [];
    }
  }
  
  async createPaymentApproval(approval: InsertPaymentApproval): Promise<PaymentApproval> {
    try {
      // Generate a new ID
      const approvalsRef = collection(db, 'payment_approvals');
      const querySnapshot = await getDocs(approvalsRef);
      const newId = querySnapshot.size + 1;
      
      // Create payment approval document
      const now = serverTimestamp();
      const approvalData = {
        ...approval,
        createdAt: now,
        updatedAt: now
      };
      
      await setDoc(doc(db, 'payment_approvals', newId.toString()), approvalData);
      
      return {
        ...approvalData,
        id: newId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error creating payment approval:', error);
      throw error;
    }
  }
  
  async updatePaymentApproval(id: number, approvalData: Partial<PaymentApproval>): Promise<PaymentApproval | undefined> {
    try {
      const approvalDoc = await getDoc(doc(db, 'payment_approvals', id.toString()));
      if (!approvalDoc.exists()) return undefined;
      
      // Update payment approval document
      await updateDoc(doc(db, 'payment_approvals', id.toString()), {
        ...approvalData,
        updatedAt: serverTimestamp()
      });
      
      // Get updated payment approval
      const updatedApprovalDoc = await getDoc(doc(db, 'payment_approvals', id.toString()));
      const updatedApprovalData = updatedApprovalDoc.data();
      
      return {
        id,
        invoiceId: updatedApprovalData.invoiceId,
        requestedBy: updatedApprovalData.requestedBy,
        approvedBy: updatedApprovalData.approvedBy,
        status: updatedApprovalData.status,
        createdAt: updatedApprovalData.createdAt?.toDate(),
        updatedAt: updatedApprovalData.updatedAt?.toDate()
      };
    } catch (error) {
      console.error('Error updating payment approval:', error);
      return undefined;
    }
  }
  
  // Report data management
  async getReportData(type: string, date: string): Promise<ReportData[]> {
    try {
      const reportsRef = collection(db, 'report_data');
      let q;
      
      if (type === 'daily' && date) {
        // Convert date string to Date object for daily report
        const reportDate = new Date(date);
        // Set time to midnight
        reportDate.setHours(0, 0, 0, 0);
        
        const startDate = Timestamp.fromDate(reportDate);
        const endDate = Timestamp.fromDate(new Date(reportDate.getTime() + 24 * 60 * 60 * 1000));
        
        q = query(
          reportsRef,
          where('type', '==', type),
          where('date', '>=', startDate),
          where('date', '<', endDate),
          orderBy('date', 'desc')
        );
      } else if (type === 'monthly' && date) {
        // Extract year and month from date string (format: YYYY-MM)
        const [year, month] = date.split('-');
        
        // Create start date (first day of the month)
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        // Create end date (first day of the next month)
        const endDate = new Date(parseInt(year), parseInt(month), 1);
        
        q = query(
          reportsRef,
          where('type', '==', type),
          where('date', '>=', Timestamp.fromDate(startDate)),
          where('date', '<', Timestamp.fromDate(endDate)),
          orderBy('date', 'desc')
        );
      } else if (type === 'yearly' && date) {
        // Extract year from date string
        const year = parseInt(date);
        
        // Create start date (first day of the year)
        const startDate = new Date(year, 0, 1);
        // Create end date (first day of the next year)
        const endDate = new Date(year + 1, 0, 1);
        
        q = query(
          reportsRef,
          where('type', '==', type),
          where('date', '>=', Timestamp.fromDate(startDate)),
          where('date', '<', Timestamp.fromDate(endDate)),
          orderBy('date', 'desc')
        );
      } else {
        // Default query for weekly or if date is not provided
        q = query(
          reportsRef,
          where('type', '==', type),
          orderBy('date', 'desc'),
          limit(7)
        );
      }
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const reportData = doc.data();
        return {
          id: parseInt(doc.id),
          date: reportData.date?.toDate(),
          type: reportData.type,
          salesCount: reportData.salesCount,
          revenue: reportData.revenue,
          cost: reportData.cost,
          discounts: reportData.discounts,
          damages: reportData.damages,
          profit: reportData.profit,
          dataJson: reportData.dataJson,
          createdAt: reportData.createdAt?.toDate()
        };
      });
    } catch (error) {
      console.error('Error getting report data:', error);
      return [];
    }
  }
  
  async createReportData(reportData: InsertReportData): Promise<ReportData> {
    try {
      // Generate a new ID
      const reportsRef = collection(db, 'report_data');
      const querySnapshot = await getDocs(reportsRef);
      const newId = querySnapshot.size + 1;
      
      // Create report data document
      const now = serverTimestamp();
      const reportDate = reportData.date ? Timestamp.fromDate(new Date(reportData.date)) : now;
      const data = {
        ...reportData,
        date: reportDate,
        createdAt: now
      };
      
      await setDoc(doc(db, 'report_data', newId.toString()), data);
      
      return {
        ...data,
        id: newId,
        date: reportDate instanceof Timestamp ? reportDate.toDate() : new Date(),
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error creating report data:', error);
      throw error;
    }
  }
}

export class MemStorage implements IStorage {
  private users = new Map<number, User>();
  private products = new Map<number, Product>();
  private customers = new Map<number, Customer>();
  private invoices = new Map<number, Invoice>();
  private invoiceItems = new Map<number, InvoiceItem>();
  private damagedItems = new Map<number, DamagedItem>();
  private employees = new Map<number, Employee>();
  private paymentApprovals = new Map<number, PaymentApproval>();
  private reportData = new Map<number, ReportData>();
  
  private userIdCounter = 1;
  private productIdCounter = 1;
  private customerIdCounter = 1;
  private invoiceIdCounter = 1;
  private invoiceItemIdCounter = 1;
  private damagedItemIdCounter = 1;
  private employeeIdCounter = 1;
  private paymentApprovalIdCounter = 1;
  private reportDataIdCounter = 1;
  
  constructor() {
    // Initialize with some default data
    this.initializeDefaultData();
  }
  
  private initializeDefaultData() {
    // Create admin user
    this.createUser({
      username: 'admin',
      password: 'admin123',
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
      sellingPrice: 899.99,
      stock: 10
    });
    
    this.createProduct({
      name: 'Lenovo ThinkPad X1',
      barcode: '8590123456789',
      alternativeCode: 'LTX1',
      purchasePrice: 800,
      sellingPrice: 1199.99,
      stock: 15
    });
    
    this.createProduct({
      name: 'Apple iPhone 13',
      barcode: '6429815307452',
      alternativeCode: 'IP13',
      purchasePrice: 700,
      sellingPrice: 999.99,
      stock: 8
    });
    
    // Create some customers
    this.createCustomer({
      name: 'Ahmed Mohamed',
      phone: '+20 123 456 7890',
      address: '123 El-Nasr St., Cairo',
      isPotential: false
    });
    
    this.createCustomer({
      name: 'Sara Ali',
      phone: '+20 111 222 3333',
      address: '45 El-Haram St., Giza',
      isPotential: true
    });
  }
  
  // User management
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = {
      ...user,
      id,
      lastLogin: undefined
    };
    this.users.set(id, newUser);
    return newUser;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      ...userData
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<void> {
    this.users.delete(id);
  }
  
  async authenticateUser(email: string, password: string): Promise<User | undefined> {
    // For simplicity in this example, we'll just compare the username/password directly
    // In a real application, you'd use proper password hashing
    const user = await this.getUserByUsername(email);
    if (!user || user.password !== password) return undefined;
    
    // Update last login
    await this.updateUser(user.id, {
      lastLogin: new Date()
    });
    
    return user;
  }
  
  // Product management
  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }
  
  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    for (const product of this.products.values()) {
      if (product.barcode === barcode) {
        return product;
      }
    }
    return undefined;
  }
  
  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }
  
  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.productIdCounter++;
    const now = new Date();
    const newProduct: Product = {
      ...product,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.products.set(id, newProduct);
    return newProduct;
  }
  
  async updateProduct(id: number, productData: Partial<Product>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;
    
    const updatedProduct: Product = {
      ...product,
      ...productData,
      updatedAt: new Date()
    };
    
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }
  
  async deleteProduct(id: number): Promise<void> {
    this.products.delete(id);
  }
  
  // Customer management
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }
  
  async getAllCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }
  
  async searchCustomers(query: string): Promise<Customer[]> {
    const customers = await this.getAllCustomers();
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(query.toLowerCase()) ||
      (customer.phone && customer.phone.includes(query)) ||
      (customer.address && customer.address.toLowerCase().includes(query.toLowerCase()))
    );
  }
  
  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = this.customerIdCounter++;
    const now = new Date();
    const newCustomer: Customer = {
      ...customer,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.customers.set(id, newCustomer);
    return newCustomer;
  }
  
  async updateCustomer(id: number, customerData: Partial<Customer>): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (!customer) return undefined;
    
    const updatedCustomer: Customer = {
      ...customer,
      ...customerData,
      updatedAt: new Date()
    };
    
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }
  
  // Invoice management
  async getInvoice(id: number): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }
  
  async getAllInvoices(): Promise<Invoice[]> {
    return Array.from(this.invoices.values());
  }
  
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const id = this.invoiceIdCounter++;
    const newInvoice: Invoice = {
      ...invoice,
      id,
      date: invoice.date ? new Date(invoice.date) : new Date(),
      createdAt: new Date()
    };
    this.invoices.set(id, newInvoice);
    return newInvoice;
  }
  
  async updateInvoice(id: number, invoiceData: Partial<Invoice>): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    
    const updatedInvoice: Invoice = {
      ...invoice,
      ...invoiceData
    };
    
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }
  
  // Invoice item management
  async getInvoiceItem(id: number): Promise<InvoiceItem | undefined> {
    return this.invoiceItems.get(id);
  }
  
  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    const items: InvoiceItem[] = [];
    for (const item of this.invoiceItems.values()) {
      if (item.invoiceId === invoiceId) {
        items.push(item);
      }
    }
    return items;
  }
  
  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const id = this.invoiceItemIdCounter++;
    const newItem: InvoiceItem = {
      ...item,
      id
    };
    this.invoiceItems.set(id, newItem);
    
    // Update product stock
    const product = await this.getProduct(item.productId);
    if (product) {
      await this.updateProduct(item.productId, {
        stock: product.stock - item.quantity
      });
    }
    
    return newItem;
  }
  
  // Damaged item management
  async getDamagedItem(id: number): Promise<DamagedItem | undefined> {
    return this.damagedItems.get(id);
  }
  
  async getAllDamagedItems(): Promise<DamagedItem[]> {
    return Array.from(this.damagedItems.values());
  }
  
  async createDamagedItem(item: InsertDamagedItem): Promise<DamagedItem> {
    const id = this.damagedItemIdCounter++;
    const newItem: DamagedItem = {
      ...item,
      id,
      date: item.date ? new Date(item.date) : new Date()
    };
    this.damagedItems.set(id, newItem);
    return newItem;
  }
  
  async updateDamagedItem(id: number, itemData: Partial<DamagedItem>): Promise<DamagedItem | undefined> {
    const item = this.damagedItems.get(id);
    if (!item) return undefined;
    
    const updatedItem: DamagedItem = {
      ...item,
      ...itemData,
      date: itemData.date ? new Date(itemData.date) : item.date
    };
    
    this.damagedItems.set(id, updatedItem);
    return updatedItem;
  }
  
  async deleteDamagedItem(id: number): Promise<void> {
    this.damagedItems.delete(id);
  }
  
  // Employee management
  async getEmployee(id: number): Promise<Employee | undefined> {
    return this.employees.get(id);
  }
  
  async getAllEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values());
  }
  
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const id = this.employeeIdCounter++;
    const newEmployee: Employee = {
      ...employee,
      id,
      hireDate: employee.hireDate ? new Date(employee.hireDate) : new Date()
    };
    this.employees.set(id, newEmployee);
    return newEmployee;
  }
  
  async updateEmployee(id: number, employeeData: Partial<Employee>): Promise<Employee | undefined> {
    const employee = this.employees.get(id);
    if (!employee) return undefined;
    
    const updatedEmployee: Employee = {
      ...employee,
      ...employeeData,
      hireDate: employeeData.hireDate ? new Date(employeeData.hireDate) : employee.hireDate
    };
    
    this.employees.set(id, updatedEmployee);
    return updatedEmployee;
  }
  
  async deleteEmployee(id: number): Promise<void> {
    this.employees.delete(id);
  }
  
  // Payment approval management
  async getPaymentApproval(id: number): Promise<PaymentApproval | undefined> {
    return this.paymentApprovals.get(id);
  }
  
  async getAllPaymentApprovals(): Promise<PaymentApproval[]> {
    return Array.from(this.paymentApprovals.values());
  }
  
  async createPaymentApproval(approval: InsertPaymentApproval): Promise<PaymentApproval> {
    const id = this.paymentApprovalIdCounter++;
    const now = new Date();
    const newApproval: PaymentApproval = {
      ...approval,
      id,
      approvedBy: undefined,
      createdAt: now,
      updatedAt: now
    };
    this.paymentApprovals.set(id, newApproval);
    return newApproval;
  }
  
  async updatePaymentApproval(id: number, approvalData: Partial<PaymentApproval>): Promise<PaymentApproval | undefined> {
    const approval = this.paymentApprovals.get(id);
    if (!approval) return undefined;
    
    const updatedApproval: PaymentApproval = {
      ...approval,
      ...approvalData,
      updatedAt: new Date()
    };
    
    this.paymentApprovals.set(id, updatedApproval);
    return updatedApproval;
  }
  
  // Report data management
  async getReportData(type: string, date: string): Promise<ReportData[]> {
    const reports: ReportData[] = [];
    
    for (const report of this.reportData.values()) {
      if (report.type === type) {
        if (type === 'daily' && date) {
          // Compare date (YYYY-MM-DD)
          const reportDate = new Date(report.date);
          const targetDate = new Date(date);
          
          if (
            reportDate.getFullYear() === targetDate.getFullYear() &&
            reportDate.getMonth() === targetDate.getMonth() &&
            reportDate.getDate() === targetDate.getDate()
          ) {
            reports.push(report);
          }
        } else if (type === 'monthly' && date) {
          // Compare year and month (YYYY-MM)
          const reportDate = new Date(report.date);
          const [year, month] = date.split('-');
          
          if (
            reportDate.getFullYear() === parseInt(year) &&
            reportDate.getMonth() === parseInt(month) - 1
          ) {
            reports.push(report);
          }
        } else if (type === 'yearly' && date) {
          // Compare year
          const reportDate = new Date(report.date);
          
          if (reportDate.getFullYear() === parseInt(date)) {
            reports.push(report);
          }
        } else {
          // If no date provided or weekly, return all reports of this type
          reports.push(report);
        }
      }
    }
    
    // Sort by date in descending order
    return reports.sort((a, b) => b.date.getTime() - a.date.getTime());
  }
  
  async createReportData(reportData: InsertReportData): Promise<ReportData> {
    const id = this.reportDataIdCounter++;
    const newReportData: ReportData = {
      ...reportData,
      id,
      date: reportData.date ? new Date(reportData.date) : new Date(),
      createdAt: new Date()
    };
    this.reportData.set(id, newReportData);
    return newReportData;
  }
}

import { RealtimeDBStorage } from "./realtime-db-storage";

// Choose which storage implementation to use
// Using RealtimeDBStorage as requested for persistent data storage
export const storage = new RealtimeDBStorage(); // Using Firebase Realtime Database for data storage
