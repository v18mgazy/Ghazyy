import { Express } from "express";
import { storage } from "./storage";
import { 
  insertSupplierSchema, 
  insertSupplierInvoiceSchema, 
  insertSupplierPaymentSchema 
} from "@shared/schema";

export function registerSupplierRoutes(app: Express) {
  // === Supplier Management Routes ===
  
  // Get all suppliers
  app.get('/api/suppliers', async (req, res) => {
    try {
      const suppliers = await storage.getAllSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error('Error getting suppliers:', error);
      res.status(500).json({ error: 'Error getting suppliers' });
    }
  });
  
  // Get supplier by ID
  app.get('/api/suppliers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const supplier = await storage.getSupplier(parseInt(id));
      
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      
      res.json(supplier);
    } catch (error) {
      console.error('Error getting supplier:', error);
      res.status(500).json({ error: 'Error getting supplier' });
    }
  });
  
  // Create new supplier
  app.post('/api/suppliers', async (req, res) => {
    try {
      const supplierData = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(supplierData);
      res.status(201).json(supplier);
    } catch (error) {
      console.error('Error creating supplier:', error);
      res.status(500).json({ error: 'Error creating supplier' });
    }
  });
  
  // Update supplier
  app.put('/api/suppliers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const supplierData = insertSupplierSchema.parse(req.body);
      const supplier = await storage.updateSupplier(parseInt(id), supplierData);
      
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      
      res.json(supplier);
    } catch (error) {
      console.error('Error updating supplier:', error);
      res.status(500).json({ error: 'Error updating supplier' });
    }
  });
  
  // Delete supplier
  app.delete('/api/suppliers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSupplier(parseInt(id));
      res.status(200).json({ message: 'Supplier deleted successfully' });
    } catch (error) {
      console.error('Error deleting supplier:', error);
      res.status(500).json({ error: 'Error deleting supplier' });
    }
  });
  
  // === Supplier Invoices Routes ===
  
  // Get all supplier invoices
  app.get('/api/supplier-invoices', async (req, res) => {
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
  
  // Get supplier invoice by ID
  app.get('/api/supplier-invoices/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const invoice = await storage.getSupplierInvoice(parseInt(id));
      
      if (!invoice) {
        return res.status(404).json({ error: 'Supplier invoice not found' });
      }
      
      res.json(invoice);
    } catch (error) {
      console.error('Error getting supplier invoice:', error);
      res.status(500).json({ error: 'Error getting supplier invoice' });
    }
  });
  
  // Create new supplier invoice
  app.post('/api/supplier-invoices', async (req, res) => {
    try {
      // Add the user ID from the auth session
      const userData = req.session?.user || { id: 1 }; // Default to user ID 1 if not authenticated
      const invoiceData = {
        ...insertSupplierInvoiceSchema.parse(req.body),
        userId: userData.id
      };
      
      const invoice = await storage.createSupplierInvoice(invoiceData);
      res.status(201).json(invoice);
    } catch (error) {
      console.error('Error creating supplier invoice:', error);
      res.status(500).json({ error: 'Error creating supplier invoice' });
    }
  });
  
  // Update supplier invoice
  app.put('/api/supplier-invoices/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const invoiceData = req.body;
      const invoice = await storage.updateSupplierInvoice(parseInt(id), invoiceData);
      
      if (!invoice) {
        return res.status(404).json({ error: 'Supplier invoice not found' });
      }
      
      res.json(invoice);
    } catch (error) {
      console.error('Error updating supplier invoice:', error);
      res.status(500).json({ error: 'Error updating supplier invoice' });
    }
  });
  
  // Delete supplier invoice
  app.delete('/api/supplier-invoices/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSupplierInvoice(parseInt(id));
      res.status(200).json({ message: 'Supplier invoice deleted successfully' });
    } catch (error) {
      console.error('Error deleting supplier invoice:', error);
      res.status(500).json({ error: 'Error deleting supplier invoice' });
    }
  });
  
  // === Supplier Payments Routes ===
  
  // Get all supplier payments
  app.get('/api/supplier-payments', async (req, res) => {
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
  
  // Create new supplier payment
  app.post('/api/supplier-payments', async (req, res) => {
    try {
      // Add the user ID from the auth session
      const userData = req.session?.user || { id: 1 }; // Default to user ID 1 if not authenticated
      const paymentData = {
        ...insertSupplierPaymentSchema.parse(req.body),
        userId: userData.id
      };
      
      // Process the payment and update the invoice
      const payment = await storage.createSupplierPayment(paymentData);
      
      // Update the invoice's paid amount and status
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
}