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
  notes: text("notes"),
  isPotential: boolean("is_potential").default(true),
  oldDebt: real("old_debt").default(0), // المديونية القديمة
  totalDebt: real("total_debt").default(0), // إجمالي المديونية الحالية
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customers).pick({
  name: true,
  phone: true,
  address: true,
  notes: true,
  isPotential: true,
  oldDebt: true,
});

// سجلات المديونية
export const customerDebts = pgTable("customer_debts", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  amount: real("amount").notNull(), // المبلغ (موجب للمديونية، سالب للدفع)
  reason: text("reason").notNull(), // سبب المديونية أو الدفع
  date: timestamp("date").notNull().defaultNow(),
  invoiceId: integer("invoice_id").references(() => invoices.id), // مرجع للفاتورة إذا كانت المديونية متعلقة بفاتورة
  createdBy: integer("created_by").references(() => users.id).notNull(), // من قام بتسجيل المديونية
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCustomerDebtSchema = createInsertSchema(customerDebts).pick({
  customerId: true,
  amount: true,
  reason: true,
  date: true,
  invoiceId: true,
  createdBy: true,
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
  discount: real("discount").default(0), // للتوافقية مع الإصدارات القديمة
  itemsDiscount: real("items_discount").default(0), // مجموع خصومات المنتجات
  invoiceDiscount: real("invoice_discount").default(0), // قيمة خصم الفاتورة
  discountPercentage: real("discount_percentage").default(0), // نسبة خصم الفاتورة
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
  // اضافة حقول الخصم الجديدة
  itemsDiscount: true,
  invoiceDiscount: true,
  discountPercentage: true,
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

// استخدام Zod مباشرة بدلاً من Drizzle Schema
export const insertDamagedItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  description: z.string().nullable().optional(),
  valueLoss: z.number().positive(),
  date: z.date().optional()
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

// Employee Deductions
export const employeeDeductions = pgTable("employee_deductions", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  amount: real("amount").notNull(),
  reason: text("reason").notNull(),
  date: timestamp("date").notNull().defaultNow(),
});

export const insertEmployeeDeductionSchema = z.object({
  employeeId: z.string(),  // In Firebase we use string IDs
  amount: z.union([z.number().positive(), z.string().transform(val => {
    const parsed = Number(val);
    if (isNaN(parsed) || parsed <= 0) throw new Error("Amount must be a positive number");
    return parsed;
  })]),
  reason: z.string().min(3),
  date: z.date().optional()
});

export type EmployeeDeduction = typeof employeeDeductions.$inferSelect;
export type InsertEmployeeDeduction = z.infer<typeof insertEmployeeDeductionSchema>;

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

// Expenses (مصاريف ونثريات)
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull().defaultNow(),
  amount: real("amount").notNull(),
  details: text("details").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  userId: integer("user_id").references(() => users.id).notNull(),
  expenseType: text("expense_type").default("miscellaneous"),
});

export const insertExpenseSchema = z.object({
  date: z.date().or(z.string().transform(str => new Date(str))),
  amount: z.union([z.number().positive(), z.string().transform(val => {
    const parsed = Number(val);
    if (isNaN(parsed) || parsed <= 0) throw new Error("المبلغ يجب أن يكون رقمًا موجبًا");
    return parsed;
  })]),
  details: z.string().min(3, "التفاصيل يجب أن تكون 3 أحرف على الأقل"),
  userId: z.number(),
  expenseType: z.enum(["rent", "personal_expenses", "miscellaneous"]).default("miscellaneous")
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

// Store Information (معلومات المتجر)
export const storeInfo = pgTable("store_info", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertStoreInfoSchema = z.object({
  name: z.string().min(2, "اسم المتجر يجب أن يكون حرفين على الأقل"),
  address: z.string().min(3, "عنوان المتجر يجب أن يكون 3 أحرف على الأقل"),
  phone: z.string().min(5, "رقم الهاتف يجب أن يكون 5 أرقام على الأقل")
});

export type StoreInfo = typeof storeInfo.$inferSelect;
export type InsertStoreInfo = z.infer<typeof insertStoreInfoSchema>;

// الموردين (Suppliers)
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSupplierSchema = createInsertSchema(suppliers)
  .pick({
    name: true,
    phone: true,
    address: true,
    notes: true,
  })
  .extend({
    name: z.string().min(2, "اسم المورد يجب أن يكون حرفين على الأقل"),
    phone: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    notes: z.string().nullable().optional()
  });

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

// فواتير الموردين (Supplier Invoices)
export const supplierInvoices = pgTable("supplier_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  date: timestamp("date").notNull().defaultNow(),
  amount: real("amount").notNull(),
  paidAmount: real("paid_amount").default(0),
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, partially_paid, paid
  dueDate: timestamp("due_date"),
  notes: text("notes"),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSupplierInvoiceSchema = createInsertSchema(supplierInvoices)
  .pick({
    invoiceNumber: true,
    supplierId: true,
    date: true,
    amount: true,
    paidAmount: true,
    paymentStatus: true,
    dueDate: true,
    notes: true,
    userId: true,
  })
  .extend({
    date: z.date().or(z.string().transform(str => new Date(str))),
    dueDate: z.date().or(z.string().transform(str => new Date(str))).nullable(),
    amount: z.union([z.number().positive(), z.string().transform(val => {
      const parsed = Number(val);
      if (isNaN(parsed) || parsed <= 0) throw new Error("المبلغ يجب أن يكون رقمًا موجبًا");
      return parsed;
    })]),
    paidAmount: z.union([z.number().default(0), z.string().transform(val => {
      const parsed = Number(val);
      return isNaN(parsed) ? 0 : parsed;
    })]),
    supplierId: z.union([z.number(), z.string().transform(val => {
      const parsed = Number(val);
      if (isNaN(parsed)) throw new Error("معرف المورد يجب أن يكون رقمًا");
      return parsed;
    })]),
    userId: z.union([z.number(), z.string().transform(val => {
      const parsed = Number(val);
      if (isNaN(parsed)) throw new Error("معرف المستخدم يجب أن يكون رقمًا");
      return parsed;
    })]).optional(),
    paymentStatus: z.enum(["pending", "partially_paid", "paid"]).default("pending")
  });

export type SupplierInvoice = typeof supplierInvoices.$inferSelect;
export type InsertSupplierInvoice = z.infer<typeof insertSupplierInvoiceSchema>;

// مدفوعات فواتير الموردين (Supplier Payments)
export const supplierPayments = pgTable("supplier_payments", {
  id: serial("id").primaryKey(),
  supplierInvoiceId: integer("supplier_invoice_id").references(() => supplierInvoices.id).notNull(),
  amount: real("amount").notNull(),
  paymentMethod: text("payment_method").notNull(), // cash, bank_transfer, cheque
  paymentDate: timestamp("payment_date").notNull().defaultNow(),
  notes: text("notes"),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSupplierPaymentSchema = createInsertSchema(supplierPayments)
  .pick({
    supplierInvoiceId: true,
    amount: true,
    paymentMethod: true,
    paymentDate: true,
    notes: true,
    userId: true,
  })
  .extend({
    paymentDate: z.date().or(z.string().transform(str => new Date(str))),
    amount: z.union([z.number().positive(), z.string().transform(val => {
      const parsed = Number(val);
      if (isNaN(parsed) || parsed <= 0) throw new Error("المبلغ يجب أن يكون رقمًا موجبًا");
      return parsed;
    })]),
    supplierInvoiceId: z.union([z.number(), z.string().transform(val => {
      const parsed = Number(val);
      if (isNaN(parsed)) throw new Error("معرف فاتورة المورد يجب أن يكون رقمًا");
      return parsed;
    })]),
    userId: z.union([z.number(), z.string().transform(val => {
      const parsed = Number(val);
      if (isNaN(parsed)) throw new Error("معرف المستخدم يجب أن يكون رقمًا");
      return parsed;
    })]).optional(),
    paymentMethod: z.enum(["cash", "bank_transfer", "cheque"]).default("cash")
  });

export type SupplierPayment = typeof supplierPayments.$inferSelect;
export type InsertSupplierPayment = z.infer<typeof insertSupplierPaymentSchema>;

// أنواع المديونية
export type CustomerDebt = typeof customerDebts.$inferSelect;
export type InsertCustomerDebt = z.infer<typeof insertCustomerDebtSchema>;
