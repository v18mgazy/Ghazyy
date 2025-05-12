import { 
  Supplier, InsertSupplier,
  SupplierInvoice, InsertSupplierInvoice,
  SupplierPayment, InsertSupplierPayment
} from "@shared/schema";
import { LocalFirebaseStorage } from "./local-firebase-storage";

/**
 * This file extends LocalFirebaseStorage with supplier-related methods
 */

// Supplier management methods
LocalFirebaseStorage.prototype.getAllSuppliers = async function(): Promise<Supplier[]> {
  return Array.from(this.suppliers.values());
};

LocalFirebaseStorage.prototype.getSupplier = async function(id: number): Promise<Supplier | undefined> {
  return this.suppliers.get(id);
};

LocalFirebaseStorage.prototype.createSupplier = async function(supplierData: InsertSupplier): Promise<Supplier> {
  const id = this.supplierIdCounter++;
  
  const newSupplier: Supplier = {
    id,
    ...supplierData,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  this.suppliers.set(id, newSupplier);
  return newSupplier;
};

LocalFirebaseStorage.prototype.updateSupplier = async function(id: number, supplierData: Partial<Supplier>): Promise<Supplier | undefined> {
  const supplier = this.suppliers.get(id);
  
  if (!supplier) {
    return undefined;
  }
  
  const updatedSupplier: Supplier = {
    ...supplier,
    ...supplierData,
    updatedAt: new Date()
  };
  
  this.suppliers.set(id, updatedSupplier);
  return updatedSupplier;
};

LocalFirebaseStorage.prototype.deleteSupplier = async function(id: number): Promise<void> {
  this.suppliers.delete(id);
};

// Supplier invoice methods
LocalFirebaseStorage.prototype.getAllSupplierInvoices = async function(): Promise<SupplierInvoice[]> {
  return Array.from(this.supplierInvoices.values());
};

LocalFirebaseStorage.prototype.getSupplierInvoice = async function(id: number): Promise<SupplierInvoice | undefined> {
  return this.supplierInvoices.get(id);
};

LocalFirebaseStorage.prototype.getSupplierInvoicesBySupplierId = async function(supplierId: number): Promise<SupplierInvoice[]> {
  return Array.from(this.supplierInvoices.values()).filter(
    invoice => invoice.supplierId === supplierId
  );
};

LocalFirebaseStorage.prototype.createSupplierInvoice = async function(invoiceData: InsertSupplierInvoice): Promise<SupplierInvoice> {
  const id = this.supplierInvoiceIdCounter++;
  
  const newInvoice: SupplierInvoice = {
    id,
    ...invoiceData,
    paidAmount: invoiceData.paidAmount || 0,
    paymentStatus: invoiceData.paymentStatus || 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  this.supplierInvoices.set(id, newInvoice);
  return newInvoice;
};

LocalFirebaseStorage.prototype.updateSupplierInvoice = async function(id: number, invoiceData: Partial<SupplierInvoice>): Promise<SupplierInvoice | undefined> {
  const invoice = this.supplierInvoices.get(id);
  
  if (!invoice) {
    return undefined;
  }
  
  const updatedInvoice: SupplierInvoice = {
    ...invoice,
    ...invoiceData,
    updatedAt: new Date()
  };
  
  this.supplierInvoices.set(id, updatedInvoice);
  return updatedInvoice;
};

LocalFirebaseStorage.prototype.deleteSupplierInvoice = async function(id: number): Promise<void> {
  this.supplierInvoices.delete(id);
};

// Supplier payment methods
LocalFirebaseStorage.prototype.getAllSupplierPayments = async function(): Promise<SupplierPayment[]> {
  return Array.from(this.supplierPayments.values());
};

LocalFirebaseStorage.prototype.getSupplierPayment = async function(id: number): Promise<SupplierPayment | undefined> {
  return this.supplierPayments.get(id);
};

LocalFirebaseStorage.prototype.getSupplierPaymentsByInvoiceId = async function(invoiceId: number): Promise<SupplierPayment[]> {
  return Array.from(this.supplierPayments.values()).filter(
    payment => payment.supplierInvoiceId === invoiceId
  );
};

LocalFirebaseStorage.prototype.createSupplierPayment = async function(paymentData: InsertSupplierPayment): Promise<SupplierPayment> {
  const id = this.supplierPaymentIdCounter++;
  
  const newPayment: SupplierPayment = {
    id,
    ...paymentData,
    createdAt: new Date()
  };
  
  this.supplierPayments.set(id, newPayment);
  
  // Update the invoice paid amount and status
  const invoice = this.supplierInvoices.get(paymentData.supplierInvoiceId);
  if (invoice) {
    const updatedPaidAmount = invoice.paidAmount + paymentData.amount;
    const updatedStatus = updatedPaidAmount >= invoice.amount
      ? 'paid'
      : updatedPaidAmount > 0
        ? 'partially_paid'
        : 'pending';
    
    this.updateSupplierInvoice(invoice.id, {
      paidAmount: updatedPaidAmount,
      paymentStatus: updatedStatus
    });
  }
  
  return newPayment;
};