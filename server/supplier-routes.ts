import { Router } from "express";
import { storage } from "./storage";
import { insertSupplierSchema } from "@shared/schema";

// إنشاء router للموردين
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

// تحديث معلومات مورد
supplierRoutes.put('/:id', async (req, res) => {
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

// حذف مورد
supplierRoutes.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteSupplier(parseInt(id));
    res.status(200).json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ error: 'Error deleting supplier' });
  }
});