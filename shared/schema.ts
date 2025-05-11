import { pgTable, text, serial, integer, boolean, timestamp, real, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("cashier"),
  status: text("status").notNull().default("active"),
  lastLogin: timestamp("last_login"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  role: true,
  status: true,
});

// Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  barcode: text("barcode").notNull().unique(),
  alternativeCode: text("alternative_code"),
  purchasePrice: real("purchase_price").notNull(),
  sellingPrice: real("selling_price").notNull(),
  stock: integer("stock").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).pick({
  name: true,
  barcode: true,
  alternativeCode: true,
  purchasePrice: true,
  sellingPrice: true,
  stock: true,
});

// Customers
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  isPotential: boolean("is_potential").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customers).pick({
  name: true,
  phone: true,
  address: true,
  isPotential: true,
});

// Invoices
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerAddress: text("customer_address"),
  date: timestamp("date").notNull().defaultNow(),
  subtotal: real("subtotal").notNull(),
  discount: real("discount").default(0),
  total: real("total").notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentStatus: text("payment_status").notNull(),
  notes: text("notes"),
  // 1. أولاً نحتفظ بالحقل القديم للتوافقية الخلفية
  productsData: text("products_data"), // سيتم تخزين بيانات المنتجات كنص JSON
  // 2. نضيف حقول المنتجات كحقول منفصلة
  productIds: text("product_ids"), // معرفات المنتجات كقائمة مفصولة بفواصل
  productNames: text("product_names"), // أسماء المنتجات
  productQuantities: text("product_quantities"), // كميات المنتجات
  productPrices: text("product_prices"), // أسعار البيع
  productPurchasePrices: text("product_purchase_prices"), // أسعار الشراء
  productDiscounts: text("product_discounts"), // الخصومات
  productTotals: text("product_totals"), // المجاميع
  productProfits: text("product_profits"), // الأرباح
  isDeleted: boolean("is_deleted").default(false),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertInvoiceSchema = createInsertSchema(invoices).pick({
  invoiceNumber: true,
  customerId: true,
  customerName: true,
  customerPhone: true,
  customerAddress: true,
  subtotal: true,
  discount: true,
  total: true,
  paymentMethod: true,
  paymentStatus: true,
  notes: true,
  productsData: true, // حقل البيانات القديم
  // إضافة الحقول الجديدة
  productIds: true,
  productNames: true,
  productQuantities: true,
  productPrices: true,
  productPurchasePrices: true,
  productDiscounts: true,
  productTotals: true,
  productProfits: true,
  isDeleted: true,
  userId: true,
  updatedAt: true,
});

// حذفنا جدول InvoiceItems لأننا سنستخدم حقل productsData في جدول الفواتير مباشرة

// Damaged Items
export const damagedItems = pgTable("damaged_items", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  description: text("description"),
  date: timestamp("date").notNull().defaultNow(),
  valueLoss: real("value_loss").notNull(),
});

export const insertDamagedItemSchema = createInsertSchema(damagedItems).pick({
  productId: true,
  quantity: true,
  description: true,
  valueLoss: true,
});

// Employees
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  hireDate: timestamp("hire_date").notNull(),
  salary: real("salary").notNull(),
  deductions: real("deductions").default(0),
  userId: integer("user_id").references(() => users.id),
});

// استخدام z.object مباشرة لتجاوز قيود Drizzle Zod
export const insertEmployeeSchema = z.object({
  name: z.string(),
  hireDate: z.date().or(z.string().transform(str => new Date(str))),
  salary: z.number(),
  deductions: z.number().optional().default(0),
  userId: z.number().optional().nullable(),
});

// Payment Approvals
export const paymentApprovals = pgTable("payment_approvals", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  requestedBy: integer("requested_by").references(() => users.id).notNull(),
  approvedBy: integer("approved_by").references(() => users.id),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPaymentApprovalSchema = createInsertSchema(paymentApprovals).pick({
  invoiceId: true,
  requestedBy: true,
  status: true,
});

// Reports data cache (for performance optimization)
export const reportData = pgTable("report_data", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  type: text("type").notNull(), // daily, weekly, monthly, yearly
  salesCount: integer("sales_count").notNull(),
  revenue: real("revenue").notNull(),
  cost: real("cost").notNull(),
  discounts: real("discounts").notNull(),
  damages: real("damages").notNull(),
  profit: real("profit").notNull(),
  dataJson: text("data_json"), // Additional data in JSON format
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReportDataSchema = createInsertSchema(reportData).pick({
  date: true,
  type: true,
  salesCount: true,
  revenue: true,
  cost: true,
  discounts: true,
  damages: true,
  profit: true,
  dataJson: true,
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

// إضافة نوع بيانات للمنتجات داخل الفاتورة
// بعض الحقول هنا مخصصة للتخزين في قاعدة البيانات فقط وليست للعرض في واجهة المستخدم
export type InvoiceProduct = {
  // حقول أساسية تُظهر في واجهة المستخدم
  productId: number;
  productName: string;
  barcode?: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
  
  // حقول للتخزين في قاعدة البيانات فقط (للتقارير وحساب الأرباح)
  purchasePrice?: number; // سعر الشراء (للتقارير والأرباح فقط)
  sellingPrice?: number;  // سعر البيع المرجعي (للتقارير فقط)
  profit?: number;        // الربح المحسوب مسبقًا (للتقارير فقط)
};

export type DamagedItem = typeof damagedItems.$inferSelect;
export type InsertDamagedItem = z.infer<typeof insertDamagedItemSchema>;

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type PaymentApproval = typeof paymentApprovals.$inferSelect;
export type InsertPaymentApproval = z.infer<typeof insertPaymentApprovalSchema>;

export type ReportData = typeof reportData.$inferSelect;
export type InsertReportData = z.infer<typeof insertReportDataSchema>;

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // invoice_created, deferred_payment_request, etc.
  referenceId: text("reference_id"), // ID of related entity (invoice, payment approval, etc.)
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  title: true,
  message: true,
  type: true,
  referenceId: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
