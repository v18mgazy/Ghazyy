import { Router } from "express";
import { storage } from "./storage";
import { insertSupplierSchema } from "@shared/schema";

export const supplierRoutes = Router();

// الحصول على جميع الموردين
supplierRoutes.get('/', async (req, res) => {
  try {
    const suppliers = await storage.getAllSuppliers();
    res.json(suppliers);
  } catch (error) {
    console.error('Error getting suppliers:', error);
    res.status(500).json({ error: 'Error getting suppliers' });
  }
});

// الحصول على مورد محدد
supplierRoutes.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid supplier ID' });
    }
    
    const supplier = await storage.getSupplier(id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    res.json(supplier);
  } catch (error) {
    console.error('Error getting supplier:', error);
    res.status(500).json({ error: 'Error getting supplier' });
  }
});

// إنشاء مورد جديد
supplierRoutes.post('/', async (req, res) => {
  try {
    const supplierData = insertSupplierSchema.parse(req.body);
    const supplier = await storage.createSupplier(supplierData);
    res.status(201).json(supplier);
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ error: 'Error creating supplier' });
  }
});

// تحديث بيانات مورد
supplierRoutes.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid supplier ID' });
    }
    
    const supplierData = req.body;
    const updatedSupplier = await storage.updateSupplier(id, supplierData);
    if (!updatedSupplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    res.json(updatedSupplier);
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ error: 'Error updating supplier' });
  }
});

// حذف مورد
supplierRoutes.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid supplier ID' });
    }
    
    await storage.deleteSupplier(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ error: 'Error deleting supplier' });
  }
});