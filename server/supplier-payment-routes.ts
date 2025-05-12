import { Router } from 'express';
import { storage } from './storage';
import { insertSupplierPaymentSchema } from '@shared/schema';

export const supplierPaymentRoutes = Router();

// Get all supplier payments
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

// Create new supplier payment
supplierPaymentRoutes.post('/', async (req, res) => {
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