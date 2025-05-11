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
  users, products, customers, invoices, invoiceItems, damagedItems, employees, paymentApprovals, reportData
} from "@shared/schema";
import { db } from './db';
import { and, eq, like, desc, sql } from 'drizzle-orm';
import { IStorage } from './storage';
import bcrypt from 'bcryptjs';

export class DatabaseStorage implements IStorage {
  // User management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async createUser(user: InsertUser): Promise<User> {
    // Hash password
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    const [newUser] = await db.insert(users)
      .values({
        ...user,
        password: hashedPassword
      })
      .returning();
    
    return newUser;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    // If password is provided, hash it
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    
    const [updatedUser] = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }
  
  async authenticateUser(email: string, password: string): Promise<User | undefined> {
    // For simplicity, assuming email is the username
    const [user] = await db.select().from(users).where(eq(users.username, email));
    if (!user) return undefined;
    
    // Check password
    const match = await bcrypt.compare(password, user.password);
    if (!match) return undefined;
    
    // Update last login
    await db.update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));
    
    return user;
  }
  
  // Product management
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }
  
  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.barcode, barcode));
    return product;
  }
  
  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }
  
  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products)
      .values(product)
      .returning();
    
    return newProduct;
  }
  
  async updateProduct(id: number, productData: Partial<Product>): Promise<Product | undefined> {
    const [updatedProduct] = await db.update(products)
      .set({
        ...productData,
        updatedAt: new Date()
      })
      .where(eq(products.id, id))
      .returning();
    
    return updatedProduct;
  }
  
  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }
  
  // Customer management
  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }
  
  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }
  
  async searchCustomers(query: string): Promise<Customer[]> {
    const likeName = like(customers.name, `%${query}%`);
    const likePhone = like(customers.phone || '', `%${query}%`);
    const likeAddress = like(customers.address || '', `%${query}%`);
    
    return await db.select().from(customers)
      .where(sql`${likeName} OR ${likePhone} OR ${likeAddress}`);
  }
  
  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers)
      .values(customer)
      .returning();
    
    return newCustomer;
  }
  
  async updateCustomer(id: number, customerData: Partial<Customer>): Promise<Customer | undefined> {
    const [updatedCustomer] = await db.update(customers)
      .set({
        ...customerData,
        updatedAt: new Date()
      })
      .where(eq(customers.id, id))
      .returning();
    
    return updatedCustomer;
  }
  
  // Invoice management
  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }
  
  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.date));
  }
  
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices)
      .values(invoice)
      .returning();
    
    return newInvoice;
  }
  
  async updateInvoice(id: number, invoiceData: Partial<Invoice>): Promise<Invoice | undefined> {
    const [updatedInvoice] = await db.update(invoices)
      .set(invoiceData)
      .where(eq(invoices.id, id))
      .returning();
    
    return updatedInvoice;
  }
  
  // Invoice item management
  async getInvoiceItem(id: number): Promise<InvoiceItem | undefined> {
    const [item] = await db.select().from(invoiceItems).where(eq(invoiceItems.id, id));
    return item;
  }
  
  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    return await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }
  
  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const [newItem] = await db.insert(invoiceItems)
      .values(item)
      .returning();
    
    return newItem;
  }
  
  // Damaged item management
  async getDamagedItem(id: number): Promise<DamagedItem | undefined> {
    const [item] = await db.select().from(damagedItems).where(eq(damagedItems.id, id));
    return item;
  }
  
  async getAllDamagedItems(): Promise<DamagedItem[]> {
    return await db.select().from(damagedItems).orderBy(desc(damagedItems.date));
  }
  
  async createDamagedItem(item: InsertDamagedItem): Promise<DamagedItem> {
    const [newItem] = await db.insert(damagedItems)
      .values(item)
      .returning();
    
    return newItem;
  }
  
  async updateDamagedItem(id: number, itemData: Partial<DamagedItem>): Promise<DamagedItem | undefined> {
    const [updatedItem] = await db.update(damagedItems)
      .set(itemData)
      .where(eq(damagedItems.id, id))
      .returning();
    
    return updatedItem;
  }
  
  async deleteDamagedItem(id: number): Promise<void> {
    await db.delete(damagedItems).where(eq(damagedItems.id, id));
  }
  
  // Employee management
  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }
  
  async getAllEmployees(): Promise<Employee[]> {
    return await db.select().from(employees);
  }
  
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db.insert(employees)
      .values(employee)
      .returning();
    
    return newEmployee;
  }
  
  async updateEmployee(id: number, employeeData: Partial<Employee>): Promise<Employee | undefined> {
    const [updatedEmployee] = await db.update(employees)
      .set(employeeData)
      .where(eq(employees.id, id))
      .returning();
    
    return updatedEmployee;
  }
  
  async deleteEmployee(id: number): Promise<void> {
    await db.delete(employees).where(eq(employees.id, id));
  }
  
  // Payment approval management
  async getPaymentApproval(id: number): Promise<PaymentApproval | undefined> {
    const [approval] = await db.select().from(paymentApprovals).where(eq(paymentApprovals.id, id));
    return approval;
  }
  
  async getAllPaymentApprovals(): Promise<PaymentApproval[]> {
    return await db.select().from(paymentApprovals).orderBy(desc(paymentApprovals.createdAt));
  }
  
  async createPaymentApproval(approval: InsertPaymentApproval): Promise<PaymentApproval> {
    const [newApproval] = await db.insert(paymentApprovals)
      .values(approval)
      .returning();
    
    return newApproval;
  }
  
  async updatePaymentApproval(id: number, approvalData: Partial<PaymentApproval>): Promise<PaymentApproval | undefined> {
    const [updatedApproval] = await db.update(paymentApprovals)
      .set({
        ...approvalData,
        updatedAt: new Date()
      })
      .where(eq(paymentApprovals.id, id))
      .returning();
    
    return updatedApproval;
  }
  
  // Report data management
  async getReportData(type: string, date: string): Promise<ReportData[]> {
    return await db.select().from(reportData)
      .where(
        and(
          eq(reportData.type, type),
          like(reportData.date.toString(), `${date}%`)
        )
      );
  }
  
  async createReportData(reportDataObj: InsertReportData): Promise<ReportData> {
    const [newReportData] = await db.insert(reportData)
      .values(reportDataObj)
      .returning();
    
    return newReportData;
  }
}