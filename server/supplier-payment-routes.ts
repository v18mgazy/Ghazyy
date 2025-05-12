import { Router } from "express";
import { storage } from "./storage";
import { insertSupplierPaymentSchema } from "@shared/schema";

// إنشاء router لمدفوعات الموردين
export const supplierPaymentRoutes = Router();

// الحصول على جميع مدفوعات الموردين
supplierPaymentRoutes.get('/', async (req, res) => {
  try {
    const { invoiceId } = req.query;
    
    let payments;
    if (invoiceId) {
      payments = await storage.getSupplierPaymentsByInvoiceId(parseInt(invoiceId as string));
    } else {
      payments = await storage.getAllSupplierPayments();
    }
    
    res.json(payments);
  } catch (error) {
    console.error('Error getting supplier payments:', error);
    res.status(500).json({ error: 'Error getting supplier payments' });
  }
});

// إنشاء دفعة جديدة
supplierPaymentRoutes.post('/', async (req, res) => {
  try {
    // إضافة معرف المستخدم من جلسة المصادقة
    const userData = { id: 1 }; // معرف افتراضي إذا لم يكن مصادق عليه
    
    // تجهيز بيانات الدفعة
    const paymentData = {
      ...insertSupplierPaymentSchema.parse(req.body),
      userId: userData.id
    };
    
    // معالجة الدفعة وتحديث الفاتورة
    const payment = await storage.createSupplierPayment(paymentData);
    
    // تحديث المبلغ المدفوع وحالة الفاتورة
    const invoice = await storage.getSupplierInvoice(paymentData.supplierInvoiceId);
    if (invoice) {
      const updatedPaidAmount = invoice.paidAmount + paymentData.amount;
      const updatedStatus = updatedPaidAmount >= invoice.amount
        ? 'paid'
        : updatedPaidAmount > 0
          ? 'partially_paid'
          : 'pending';
      
      await storage.updateSupplierInvoice(invoice.id, {
        paidAmount: updatedPaidAmount,
        paymentStatus: updatedStatus
      });
    }
    
    res.status(201).json(payment);
  } catch (error) {
    console.error('Error creating supplier payment:', error);
    res.status(500).json({ error: 'Error creating supplier payment' });
  }
});