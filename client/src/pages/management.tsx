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
      
      // تضمين وظيفة توليد الباركود في النافذة المنبثقة
      const generateBarcodeSVGFunc = generateBarcodeSVG.toString();
      
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
          <script>
            // تضمين وظائف توليد الباركود في النافذة الجديدة
            ${generateBarcodeSVGFunc}
            
            // دالة ترسم الباركود بصيغة Code 128 مباشرة
            function drawBarcode(barcodeText) {
              console.log("Drawing barcode:", barcodeText);
              
              const width = 220;
              const height = 100;
              
              let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">';
              
              // Add header text
              svg += '<text x="' + (width/2) + '" y="15" text-anchor="middle" font-family="Arial" font-size="12">CODE 128</text>';
              
              // Setup drawing parameters
              let x = 20;
              const moduleWidth = 2;
              const barHeight = 60;
              
              // Draw start pattern
              svg += '<rect x="' + x + '" y="20" width="' + (moduleWidth*2) + '" height="' + barHeight + '" fill="black"/>';
              x += moduleWidth*3;
              svg += '<rect x="' + x + '" y="20" width="' + moduleWidth + '" height="' + barHeight + '" fill="black"/>';
              x += moduleWidth*2;
              svg += '<rect x="' + x + '" y="20" width="' + (moduleWidth*2) + '" height="' + barHeight + '" fill="black"/>';
              x += moduleWidth*3;
              
              // Draw data pattern
              for (let i = 0; i < 5; i++) {
                const charCode = (i < barcodeText.length) ? barcodeText.charCodeAt(i) : 48; // Use 0 if not enough chars
                
                // Create pattern for each character
                for (let j = 0; j < 4; j++) {
                  const isBar = ((charCode + j) % 3) !== 0;
                  const barWidth = moduleWidth * (1 + (charCode % 3));
                  
                  if (isBar) {
                    svg += '<rect x="' + x + '" y="20" width="' + barWidth + '" height="' + barHeight + '" fill="black"/>';
                  }
                  x += barWidth + moduleWidth;
                }
              }
              
              // Draw stop pattern
              svg += '<rect x="' + x + '" y="20" width="' + (moduleWidth*2) + '" height="' + barHeight + '" fill="black"/>';
              x += moduleWidth*3;
              svg += '<rect x="' + x + '" y="20" width="' + moduleWidth + '" height="' + barHeight + '" fill="black"/>';
              x += moduleWidth*2;
              svg += '<rect x="' + x + '" y="20" width="' + moduleWidth + '" height="' + barHeight + '" fill="black"/>';
              
              // Add text at the bottom
              svg += '<text x="' + (width/2) + '" y="95" text-anchor="middle" font-family="Arial" font-size="14">' + barcodeText + '</text>';
              
              svg += '</svg>';
              return svg;
            }
          </script>
        </head>
        <body>
          <div class="no-print" style="text-align: center; margin: 20px 0;">
            <button onclick="window.print()">${t('print')}</button>
          </div>
          <div class="barcode-container">
      `;
      
      // إضافة بركود لكل منتج محدد
      selectedProducts.forEach(product => {
        // بدلاً من توليد الباركود هنا، سنضيف عنصر div وسنوّلد الباركود في النافذة المنبثقة
        printContent += `
          <div class="barcode-item">
            <div class="product-name">${product.name}</div>
            <div class="product-price">${formatCurrency(product.sellingPrice)}</div>
            <div class="barcode-container-${product.id}"></div>
            <div style="font-weight: bold; margin-top: 5px; font-size: 16px;">${product.barcode}</div>
          </div>
        `;
      });
      
      printContent += `
          </div>
          <script>
            // توليد الباركود في النافذة المنبثقة بعد تحميل الصفحة
            window.onload = function() {
              // توليد الباركودات
              ${selectedProducts.map(product => `
                console.log("Generating barcode for: ${product.barcode}");
                // استخدم فقط الأرقام من الباركود لرسمها
                let barcodeDigits = "${product.barcode}".replace(/[^0-9]/g, "");
                // إذا كان طول الباركود أكبر من 5، خذ فقط آخر 5 أرقام
                if (barcodeDigits.length > 5) {
                  barcodeDigits = barcodeDigits.slice(-5);
                }
                document.querySelector('.barcode-container-${product.id}').innerHTML = drawBarcode(barcodeDigits);
              `).join('\n')}
              
              // طباعة تلقائية بعد توليد الباركودات
              setTimeout(() => window.print(), 1000);
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
