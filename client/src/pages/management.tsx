import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductList from '@/components/products/product-list';
import EmployeeList from '@/components/employees/employee-list';
import DamagedItemList from '@/components/damaged-items/damaged-item-list';
import UserList from '@/components/users/user-list';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency, generateBarcodeSVG } from '@/lib/utils';

export default function ManagementPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('products');
  
  // Products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      // Mock data for demo
      return [
        {
          id: '1',
          name: 'Samsung Galaxy S21',
          barcode: '7531598524567',
          alternativeCode: 'SG21',
          purchasePrice: 650,
          sellingPrice: 899.99,
          stock: 8
        },
        {
          id: '2',
          name: 'Lenovo ThinkPad X1',
          barcode: '8590123456789',
          alternativeCode: 'LTX1',
          purchasePrice: 800,
          sellingPrice: 1199.99,
          stock: 15
        },
        {
          id: '3',
          name: 'Apple iPhone 13',
          barcode: '6429815307452',
          alternativeCode: 'IP13',
          purchasePrice: 700,
          sellingPrice: 999.99,
          stock: 5
        }
      ];
    }
  });
  
  // Employees
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['/api/employees'],
    queryFn: async () => {
      // Mock data for demo
      return [
        {
          id: '1',
          name: 'Mohamed Ahmed',
          hireDate: '2023-05-15',
          salary: 800,
          deductions: 50
        },
        {
          id: '2',
          name: 'Sara Hassan',
          hireDate: '2023-01-10',
          salary: 950,
          deductions: 25
        }
      ];
    }
  });
  
  // Damaged Items
  const { data: damagedItems = [], isLoading: isLoadingDamagedItems } = useQuery({
    queryKey: ['/api/damaged-items'],
    queryFn: async () => {
      // Mock data for demo
      return [
        {
          id: '1',
          productId: '3',
          product: { name: 'Apple iPhone 13' },
          quantity: 1,
          date: '2023-08-10',
          description: 'Screen cracked during unpacking',
          valueLoss: 700
        }
      ];
    }
  });
  
  // Users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      // Mock data for demo
      return [
        {
          id: '1',
          username: 'admin',
          name: 'Ahmed Mahmoud',
          role: 'admin',
          status: 'active',
          lastLogin: new Date('2023-08-23T14:35:00')
        },
        {
          id: '2',
          username: 'sara_h',
          name: 'Sara Hassan',
          role: 'cashier',
          status: 'active',
          lastLogin: new Date('2023-08-24T09:12:00')
        }
      ];
    }
  });
  
  // Add mock mutations
  const addProductMutation = useMutation({
    mutationFn: (product: any) => Promise.resolve(product),
    onSuccess: () => {
      // In a real app, invalidate products query
    }
  });
  
  const editProductMutation = useMutation({
    mutationFn: (product: any) => Promise.resolve(product),
    onSuccess: () => {
      // In a real app, invalidate products query
    }
  });
  
  const deleteProductMutation = useMutation({
    mutationFn: (productId: string) => Promise.resolve(productId),
    onSuccess: () => {
      // In a real app, invalidate products query
    }
  });
  
  const printBarcodesMutation = useMutation({
    mutationFn: (productIds: string[]) => {
      // استرجاع المنتجات المحددة
      const selectedProducts = products.filter(p => productIds.includes(p.id));
      
      // إنشاء صفحة طباعة جديدة
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error(t('popup_blocked'));
      }
      
      // إنشاء محتوى HTML للطباعة
      let printContent = `
        <html>
        <head>
          <title>${t('product_barcodes')}</title>
          <style>
            body { font-family: Arial, sans-serif; }
            .barcode-container { 
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              justify-content: center;
            }
            .barcode-item {
              border: 1px solid #ccc;
              padding: 10px;
              text-align: center;
              width: 220px;
              margin-bottom: 20px;
            }
            .product-name {
              font-weight: bold;
              margin-bottom: 5px;
            }
            .product-price {
              font-size: 14px;
              margin-bottom: 10px;
            }
            @media print {
              @page { margin: 0.5cm; }
              .barcode-item { break-inside: avoid; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align: center; margin: 20px 0;">
            <button onclick="window.print()">${t('print')}</button>
          </div>
          <div class="barcode-container">
      `;
      
      // إضافة بركود لكل منتج محدد
      selectedProducts.forEach(product => {
        const barcodeSvg = generateBarcodeSVG(product.barcode);
        
        printContent += `
          <div class="barcode-item">
            <div class="product-name">${product.name}</div>
            <div class="product-price">${formatCurrency(product.sellingPrice)}</div>
            ${barcodeSvg}
            <div>${product.barcode}</div>
          </div>
        `;
      });
      
      printContent += `
          </div>
          <script>
            // طباعة تلقائية بعد تحميل الصفحة
            window.onload = function() {
              setTimeout(() => window.print(), 500);
            }
          </script>
        </body>
        </html>
      `;
      
      // كتابة المحتوى إلى نافذة الطباعة
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      return Promise.resolve(productIds);
    },
    onSuccess: () => {
      console.log('Barcodes printed successfully');
    },
    onError: (error) => {
      console.error('Error printing barcodes:', error);
      alert(error instanceof Error ? error.message : t('print_error'));
    }
  });
  
  const addEmployeeMutation = useMutation({
    mutationFn: (employee: any) => Promise.resolve(employee),
    onSuccess: () => {
      // In a real app, invalidate employees query
    }
  });
  
  const editEmployeeMutation = useMutation({
    mutationFn: (employee: any) => Promise.resolve(employee),
    onSuccess: () => {
      // In a real app, invalidate employees query
    }
  });
  
  const deleteEmployeeMutation = useMutation({
    mutationFn: (employeeId: string) => Promise.resolve(employeeId),
    onSuccess: () => {
      // In a real app, invalidate employees query
    }
  });
  
  const addDamagedItemMutation = useMutation({
    mutationFn: (item: any) => Promise.resolve(item),
    onSuccess: () => {
      // In a real app, invalidate damaged items query
    }
  });
  
  const editDamagedItemMutation = useMutation({
    mutationFn: (item: any) => Promise.resolve(item),
    onSuccess: () => {
      // In a real app, invalidate damaged items query
    }
  });
  
  const deleteDamagedItemMutation = useMutation({
    mutationFn: (itemId: string) => Promise.resolve(itemId),
    onSuccess: () => {
      // In a real app, invalidate damaged items query
    }
  });
  
  const addUserMutation = useMutation({
    mutationFn: (user: any) => Promise.resolve(user),
    onSuccess: () => {
      // In a real app, invalidate users query
    }
  });
  
  const editUserMutation = useMutation({
    mutationFn: (user: any) => Promise.resolve(user),
    onSuccess: () => {
      // In a real app, invalidate users query
    }
  });
  
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => Promise.resolve(userId),
    onSuccess: () => {
      // In a real app, invalidate users query
    }
  });
  
  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => Promise.resolve(userId),
    onSuccess: () => {
      // In a real app, send reset password email
      console.log('Reset password');
    }
  });
  
  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 bg-white dark:bg-neutral-800 p-1 rounded-lg">
          <TabsTrigger value="products">{t('products_inventory')}</TabsTrigger>
          <TabsTrigger value="employees">{t('employees_management')}</TabsTrigger>
          <TabsTrigger value="damaged">{t('damaged_items')}</TabsTrigger>
          <TabsTrigger value="users">{t('users_management')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="products">
          <ProductList 
            products={products} 
            isLoading={isLoadingProducts}
            onAddProduct={(product) => addProductMutation.mutate(product)}
            onEditProduct={(product) => editProductMutation.mutate(product)}
            onDeleteProduct={(id) => deleteProductMutation.mutate(id)}
            onPrintBarcodes={(ids) => printBarcodesMutation.mutate(ids)}
          />
        </TabsContent>
        
        <TabsContent value="employees">
          <EmployeeList 
            employees={employees}
            isLoading={isLoadingEmployees}
            onAddEmployee={(employee) => addEmployeeMutation.mutate(employee)}
            onEditEmployee={(employee) => editEmployeeMutation.mutate(employee)}
            onDeleteEmployee={(id) => deleteEmployeeMutation.mutate(id)}
          />
        </TabsContent>
        
        <TabsContent value="damaged">
          <DamagedItemList 
            items={damagedItems}
            products={products}
            isLoading={isLoadingDamagedItems}
            onAddItem={(item) => addDamagedItemMutation.mutate(item)}
            onEditItem={(item) => editDamagedItemMutation.mutate(item)}
            onDeleteItem={(id) => deleteDamagedItemMutation.mutate(id)}
          />
        </TabsContent>
        
        <TabsContent value="users">
          <UserList 
            users={users}
            isLoading={isLoadingUsers}
            onAddUser={(user) => addUserMutation.mutate(user)}
            onEditUser={(user) => editUserMutation.mutate(user)}
            onDeleteUser={(id) => deleteUserMutation.mutate(id)}
            onResetPassword={(id) => resetPasswordMutation.mutate(id)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
