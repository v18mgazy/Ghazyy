import { Router } from "express";
import { storage } from "./storage";
import { insertSupplierInvoiceSchema } from "@shared/schema";

export const supplierInvoiceRoutes = Router();

// الحصول على جميع فواتير الموردين
supplierInvoiceRoutes.get('/', async (req, res) => {
  try {
    const { supplierId } = req.query;
    
    let invoices;
    if (supplierId) {
      invoices = await storage.getSupplierInvoicesBySupplierId(parseInt(supplierId as string));
    } else {
      invoices = await storage.getAllSupplierInvoices();
    }
    
    res.json(invoices);
  } catch (error) {
    console.error('Error getting supplier invoices:', error);
    res.status(500).json({ error: 'Error getting supplier invoices' });
  }
});

// الحصول على فاتورة مورد محددة
supplierInvoiceRoutes.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }
    
    const invoice = await storage.getSupplierInvoice(id);
    if (!invoice) {
      return res.status(404).json({ error: 'Supplier invoice not found' });
    }
    
    res.json(invoice);
  } catch (error) {
    console.error('Error getting supplier invoice:', error);
    res.status(500).json({ error: 'Error getting supplier invoice' });
  }
});

// إنشاء فاتورة مورد جديدة
supplierInvoiceRoutes.post('/', async (req, res) => {
  try {
    // إضافة معرف المستخدم من جلسة المصادقة
    const userData = { id: 1 }; // معرف افتراضي إذا لم يكن مصادق عليه
    
    // تجهيز بيانات الفاتورة
    const invoiceData = {
      ...insertSupplierInvoiceSchema.parse(req.body),
      userId: userData.id,
      paidAmount: 0,
      paymentStatus: 'pending'
    };
    
    const invoice = await storage.createSupplierInvoice(invoiceData);
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error creating supplier invoice:', error);
    res.status(500).json({ error: 'Error creating supplier invoice' });
  }
});

// تحديث فاتورة مورد
supplierInvoiceRoutes.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }
    
    const invoiceData = req.body;
    const updatedInvoice = await storage.updateSupplierInvoice(id, invoiceData);
    if (!updatedInvoice) {
      return res.status(404).json({ error: 'Supplier invoice not found' });
    }
    
    res.json(updatedInvoice);
  } catch (error) {
    console.error('Error updating supplier invoice:', error);
    res.status(500).json({ error: 'Error updating supplier invoice' });
  }
});

// حذف فاتورة مورد
supplierInvoiceRoutes.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }
    
    await storage.deleteSupplierInvoice(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting supplier invoice:', error);
    res.status(500).json({ error: 'Error deleting supplier invoice' });
  }
});