import { Router } from 'express';
import { storage } from './storage';
import { insertSupplierInvoiceSchema } from '@shared/schema';

export const supplierInvoiceRoutes = Router();

// Get all supplier invoices
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

// Get supplier invoice by ID
supplierInvoiceRoutes.get('/:id', async (req, res) => {
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
supplierInvoiceRoutes.post('/', async (req, res) => {
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
supplierInvoiceRoutes.put('/:id', async (req, res) => {
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
supplierInvoiceRoutes.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteSupplierInvoice(parseInt(id));
    res.status(200).json({ message: 'Supplier invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier invoice:', error);
    res.status(500).json({ error: 'Error deleting supplier invoice' });
  }
});