import { Router } from "express";
import { storage } from "./storage";
import { insertSupplierPaymentSchema } from "@shared/schema";

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

// الحصول على مدفوعة مورد محددة
supplierPaymentRoutes.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid payment ID' });
    }
    
    const payment = await storage.getSupplierPayment(id);
    if (!payment) {
      return res.status(404).json({ error: 'Supplier payment not found' });
    }
    
    res.json(payment);
  } catch (error) {
    console.error('Error getting supplier payment:', error);
    res.status(500).json({ error: 'Error getting supplier payment' });
  }
});

// إنشاء مدفوعة مورد جديدة
supplierPaymentRoutes.post('/', async (req, res) => {
  try {
    // تجهيز بيانات المدفوعة
    const paymentData = insertSupplierPaymentSchema.parse(req.body);
    
    // معالجة المدفوعة والتحديث التلقائي لحالة الفاتورة
    const payment = await storage.createSupplierPayment(paymentData);
    res.status(201).json(payment);
  } catch (error) {
    console.error('Error creating supplier payment:', error);
    res.status(500).json({ error: 'Error creating supplier payment' });
  }
});