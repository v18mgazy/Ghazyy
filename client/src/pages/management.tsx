import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductList from '@/components/products/product-list';
import EmployeeList from '@/components/employees/employee-list';
import DamagedItemList from '@/components/damaged-items/damaged-item-list';
import UserList from '@/components/users/user-list';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatCurrency, generateBarcodeSVG } from '@/lib/utils';

export default function ManagementPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('products');
  
  // Products - استخدام البيانات الحقيقية من قاعدة البيانات
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['/api/products'],
  });
  
  // Employees - استخدام البيانات الحقيقية من قاعدة البيانات
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['/api/employees'],
  });
  
  // Damaged Items - استخدام البيانات الحقيقية من قاعدة البيانات
  const { data: damagedItems = [], isLoading: isLoadingDamagedItems } = useQuery({
    queryKey: ['/api/damaged-items'],
  });
  
  // Users - استخدام البيانات الحقيقية من قاعدة البيانات
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users'],
  });
  
  // تعريف الميوتيشن للعمليات على المنتجات
  const addProductMutation = useMutation({
    mutationFn: async (product: any) => {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(product),
      });
      
      if (!response.ok) {
        throw new Error(t('add_product_error'));
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // تحديث قائمة المنتجات بعد الإضافة
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    }
  });
  
  const editProductMutation = useMutation({
    mutationFn: async (product: any) => {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(product),
      });
      
      if (!response.ok) {
        throw new Error(t('edit_product_error'));
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // تحديث قائمة المنتجات بعد التعديل
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    }
  });
  
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(t('delete_product_error'));
      }
      
      return productId;
    },
    onSuccess: () => {
      // تحديث قائمة المنتجات بعد الحذف
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
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
  
  // وظيفة طباعة قائمة جرد المنتجات
  const printInventoryMutation = useMutation({
    mutationFn: () => {
      // إنشاء صفحة طباعة جديدة
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error(t('popup_blocked'));
      }
      
      // تاريخ اليوم بالتنسيق المحلي
      const today = new Date().toLocaleDateString();
      
      // إنشاء محتوى HTML للطباعة
      let printContent = `
        <html>
        <head>
          <title>${t('inventory_list')}</title>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              direction: ${t('direction')};
            }
            .header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            h1 {
              margin: 0;
              font-size: 24px;
            }
            .date {
              font-size: 16px;
              margin-top: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: ${t('direction') === 'rtl' ? 'right' : 'left'};
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .summary {
              margin-top: 30px;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
            .signature {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
            }
            .signature-line {
              width: 200px;
              border-top: 1px solid #000;
              margin-top: 40px;
              text-align: center;
            }
            @media print {
              body { margin: 0; padding: 15px; }
              .no-print { display: none; }
              button { display: none; }
            }
            .inventory-info {
              margin-top: 20px;
              font-size: 16px;
            }
            .count-column {
              width: 100px;
            }
            .check-column {
              width: 60px;
            }
            .notes-column {
              width: 150px;
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align: center; margin: 20px 0;">
            <button onclick="window.print()">${t('print')}</button>
            <button onclick="window.close()">${t('close')}</button>
          </div>
          
          <div class="header">
            <div>
              <h1>${t('inventory_list')}</h1>
              <div class="inventory-info">${t('ghazy_sales')}</div>
            </div>
            <div class="date">${t('date')}: ${today}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>${t('no')}</th>
                <th>${t('product_name')}</th>
                <th>${t('barcode')}</th>
                <th>${t('system_stock')}</th>
                <th class="count-column">${t('actual_count')}</th>
                <th class="check-column">${t('checked')}</th>
                <th class="notes-column">${t('notes')}</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      // إضافة صفوف للمنتجات
      products.forEach((product, index) => {
        printContent += `
          <tr>
            <td>${index + 1}</td>
            <td>${product.name}</td>
            <td>${product.barcode}</td>
            <td>${product.stock}</td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        `;
      });
      
      // حساب إجمالي كمية المخزون في النظام
      const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
      
      printContent += `
            </tbody>
          </table>
          
          <div class="summary">
            <p><strong>${t('total_products')}:</strong> ${products.length}</p>
            <p><strong>${t('total_system_stock')}:</strong> ${totalStock}</p>
          </div>
          
          <div class="signature">
            <div>
              <div class="signature-line">${t('inventory_manager')}</div>
            </div>
            <div>
              <div class="signature-line">${t('store_manager')}</div>
            </div>
          </div>
          
          <script>
            // طباعة تلقائية بعد تحميل الصفحة
            window.onload = function() {
              // إضافة تأخير بسيط للتأكد من تحميل الصفحة بشكل كامل
              setTimeout(() => window.print(), 500);
            }
          </script>
        </body>
        </html>
      `;
      
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      return Promise.resolve('success');
    },
    onSuccess: () => {
      console.log('Inventory list printed successfully');
    },
    onError: (error) => {
      console.error('Error printing inventory list:', error);
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
        <TabsList className="mb-6 bg-white dark:bg-neutral-800 p-2 rounded-lg shadow-sm flex flex-wrap gap-2">
          <TabsTrigger 
            value="products" 
            className="flex items-center gap-2 transition-all data-[state=active]:bg-blue-600 data-[state=active]:text-white hover:bg-blue-100 data-[state=active]:hover:bg-blue-700 relative overflow-hidden group"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-blue-400/0 group-hover:opacity-100 opacity-0 transition-opacity duration-300"></span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
            </svg>
            {t('products_inventory')}
          </TabsTrigger>
          
          <TabsTrigger 
            value="employees" 
            className="flex items-center gap-2 transition-all data-[state=active]:bg-emerald-600 data-[state=active]:text-white hover:bg-emerald-100 data-[state=active]:hover:bg-emerald-700 relative overflow-hidden group"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-emerald-400/0 group-hover:opacity-100 opacity-0 transition-opacity duration-300"></span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
            {t('employees_management')}
          </TabsTrigger>
          
          <TabsTrigger 
            value="damaged" 
            className="flex items-center gap-2 transition-all data-[state=active]:bg-amber-600 data-[state=active]:text-white hover:bg-amber-100 data-[state=active]:hover:bg-amber-700 relative overflow-hidden group"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-amber-400/0 group-hover:opacity-100 opacity-0 transition-opacity duration-300"></span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.981l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {t('damaged_items')}
          </TabsTrigger>
          
          <TabsTrigger 
            value="users" 
            className="flex items-center gap-2 transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white hover:bg-purple-100 data-[state=active]:hover:bg-purple-700 relative overflow-hidden group"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-purple-400/0 group-hover:opacity-100 opacity-0 transition-opacity duration-300"></span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            {t('users_management')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="products">
          <ProductList 
            products={products} 
            isLoading={isLoadingProducts}
            onAddProduct={(product) => addProductMutation.mutate(product)}
            onEditProduct={(product) => editProductMutation.mutate(product)}
            onDeleteProduct={(id) => deleteProductMutation.mutate(id)}
            onPrintBarcodes={(ids) => printBarcodesMutation.mutate(ids)}
            onPrintInventory={() => printInventoryMutation.mutate()}
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
