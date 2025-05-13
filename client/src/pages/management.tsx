import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductList from '@/components/products/product-list';
import EmployeeList from '@/components/employees/employee-list';
import DamagedItemList from '@/components/damaged-items/damaged-item-list';
import UserList from '@/components/users/user-list';
import ExpenseList from '@/components/expenses/expense-list';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatCurrency, generateBarcodeSVG } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function ManagementPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('products');
  
  // Products - استخدام البيانات الحقيقية من قاعدة البيانات
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['/api/products'],
    refetchInterval: 30 * 1000,     // تحديث البيانات كل 30 ثانية
    refetchOnWindowFocus: true,     // تحديث البيانات عند العودة للصفحة
    staleTime: 20 * 1000,           // اعتبار البيانات قديمة بعد 20 ثانية
  });
  
  // Employees - استخدام البيانات الحقيقية من قاعدة البيانات
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['/api/employees'],
    refetchInterval: 30 * 1000,     // تحديث البيانات كل 30 ثانية
    refetchOnWindowFocus: true,     // تحديث البيانات عند العودة للصفحة
    staleTime: 20 * 1000,           // اعتبار البيانات قديمة بعد 20 ثانية
  });
  
  // Employee Deductions
  const { data: employeeDeductions = [], isLoading: isLoadingDeductions } = useQuery({
    queryKey: ['/api/employee-deductions'],
    refetchInterval: 30 * 1000,     // تحديث البيانات كل 30 ثانية
    refetchOnWindowFocus: true,     // تحديث البيانات عند العودة للصفحة
    staleTime: 20 * 1000,           // اعتبار البيانات قديمة بعد 20 ثانية
  });
  
  // Employee deduction mutation
  const addDeductionMutation = useMutation({
    mutationFn: async ({employeeId, deduction}: {employeeId: string, deduction: {amount: number, reason: string}}) => {
      console.log('Sending deduction:', { employeeId, amount: Number(deduction.amount), reason: deduction.reason });
      const response = await apiRequest('POST', '/api/employee-deductions', {
        employeeId,
        amount: Number(deduction.amount),
        reason: deduction.reason,
        date: new Date()
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee-deductions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: t('success'),
        description: t('deduction_added_successfully'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: t('error_adding_deduction'),
        variant: 'destructive',
      });
    }
  });
  
  // Damaged Items - استخدام البيانات الحقيقية من قاعدة البيانات
  const { data: damagedItems = [], isLoading: isLoadingDamagedItems } = useQuery({
    queryKey: ['/api/damaged-items'],
    refetchInterval: 30 * 1000,     // تحديث البيانات كل 30 ثانية
    refetchOnWindowFocus: true,     // تحديث البيانات عند العودة للصفحة
    staleTime: 20 * 1000,           // اعتبار البيانات قديمة بعد 20 ثانية
  });
  
  // Users - استخدام البيانات الحقيقية من قاعدة البيانات
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users'],
    refetchInterval: 60 * 1000,     // تحديث البيانات كل دقيقة
    refetchOnWindowFocus: true,     // تحديث البيانات عند العودة للصفحة
    staleTime: 30 * 1000,           // اعتبار البيانات قديمة بعد 30 ثانية
  });
  
  // Expenses (مصاريف ونثريات) - استخدام البيانات الحقيقية من قاعدة البيانات
  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery({
    queryKey: ['/api/expenses'],
    refetchInterval: 30 * 1000,     // تحديث البيانات كل 30 ثانية
    refetchOnWindowFocus: true,     // تحديث البيانات عند العودة للصفحة
    staleTime: 20 * 1000,           // اعتبار البيانات قديمة بعد 20 ثانية
  });
  
  // تعريف الميوتيشن للعمليات على المنتجات
  const addProductMutation = useMutation({
    mutationFn: async (product: any) => {
      const response = await apiRequest('POST', '/api/products', product);
      return await response.json();
    },
    onSuccess: () => {
      // تحديث قائمة المنتجات بعد الإضافة
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: t('success'),
        description: t('product_added_successfully'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('add_product_error'),
        variant: 'destructive',
      });
    }
  });
  
  const editProductMutation = useMutation({
    mutationFn: async (product: any) => {
      const response = await apiRequest('PATCH', `/api/products/${product.id}`, product);
      return await response.json();
    },
    onSuccess: () => {
      // تحديث قائمة المنتجات بعد التعديل
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: t('success'),
        description: t('product_updated_successfully'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('edit_product_error'),
        variant: 'destructive',
      });
    }
  });
  
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await apiRequest('DELETE', `/api/products/${productId}`);
      return productId;
    },
    onSuccess: () => {
      // تحديث قائمة المنتجات بعد الحذف
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: t('success'),
        description: t('product_deleted_successfully'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('delete_product_error'),
        variant: 'destructive',
      });
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
      
      // نسخ وظيفة كاملة من utils.ts (وسيتم تضمينها في النافذة المنبثقة)
      const completeCode = `
      // كود توليد الباركود الكامل
      function generateBarcodeSVG(barcodeValue) {
        // Determine if we should use Code 128 or EAN-13
        const useCode128 = !/^\\d+$/.test(barcodeValue) || barcodeValue.length !== 13;
        
        if (useCode128) {
          return generateCode128SVG(barcodeValue);
        } else {
          return generateEAN13SVG(barcodeValue);
        }
      }

      // Generate a Code 128 barcode
      function generateCode128SVG(barcodeValue) {
        // Code 128 patterns for all characters (subset B - contains ASCII 32-127)
        const code128Patterns = [
          "11011001100", "11001101100", "11001100110", "10010011000", "10010001100", // 0-4
          "10001001100", "10011001000", "10011000100", "10001100100", "11001001000", // 5-9
          "11001000100", "11000100100", "10110011100", "10011011100", "10011001110", // 10-14
          "10111001100", "10011101100", "10011100110", "11001110010", "11001011100", // 15-19
          "11001001110", "11011100100", "11001110100", "11101101110", "11101001100", // 20-24
          "11100101100", "11100100110", "11101100100", "11100110100", "11100110010", // 25-29
          "11011011000", "11011000110", "11000110110", "10100011000", "10001011000", // 30-34
          "10001000110", "10110001000", "10001101000", "10001100010", "11010001000", // 35-39
          "11000101000", "11000100010", "10110111000", "10110001110", "10001101110", // 40-44
          "10111011000", "10111000110", "10001110110", "11101110110", "11010001110", // 45-49
          "11000101110", "11011101000", "11011100010", "11011101110", "11101011000", // 50-54
          "11101000110", "11100010110", "11101101000", "11101100010", "11100011010", // 55-59
          "11101111010", "11001000010", "11110001010", "10100110000", "10100001100", // 60-64
          "10010110000", "10010000110", "10000101100", "10000100110", "10110010000", // 65-69
          "10110000100", "10011010000", "10011000010", "10000110100", "10000110010", // 70-74
          "11000010010", "11001010000", "11110111010", "11000010100", "10001111010", // 75-79
          "10100111100", "10010111100", "10010011110", "10111100100", "10011110100", // 80-84
          "10011110010", "11110100100", "11110010100", "11110010010", "11011011110", // 85-89
          "11011110110", "11110110110", "10101111000", "10100011110", "10001011110", // 90-94
          "10111101000", "10111100010", "11110101000", "11110100010", "10111011110", // 95-99
          "10111101110", "11101011110", "11110101110", "11010000100", "11010010000", // 100-104
          "11010011100" // 105 (START C)
        ];
        
        // Code 128 Start Code B (ASCII 32-127)
        const startPattern = "11010010000"; // START B (Code 104)
        
        // Constants for the barcode (تم تصغير الحجم لتناسب الطباعة)
        const height = 60;
        const moduleWidth = 1.5; // Width of the thinnest bar
        const fontSize = 11;
        const padding = { top: 5, left: 10, bottom: 12, right: 10 };
        const barHeight = height - padding.top - padding.bottom;
        
        // Calculate total width based on barcode content
        let totalModules = startPattern.length; // Start with width of START B pattern
        
        // Add width for each character
        for (let i = 0; i < barcodeValue.length; i++) {
          totalModules += 11; // Each character is 11 modules wide in Code 128
        }
        
        // Add width for checksum and stop character
        totalModules += 11 + 13; // Checksum (11) + STOP (13)
        
        const width = totalModules * moduleWidth + padding.left + padding.right;
        
        // Generate SVG for the Code 128 barcode
        let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">';
        
        // Add white background
        svg += '<rect x="0" y="0" width="' + width + '" height="' + height + '" fill="white" />';
        
        // Start building the actual barcode
        let x = padding.left;
        
        // Calculate checksum
        let checksum = 104; // START B value
        for (let i = 0; i < barcodeValue.length; i++) {
          const charCode = barcodeValue.charCodeAt(i);
          // Code 128B uses ASCII values directly, but needs adjustment for values < 32
          const valueIndex = charCode - 32; // Adjust for ASCII table offset (32 is space)
          checksum += (i + 1) * valueIndex;
        }
        checksum %= 103; // Mod 103 gives the checksum index
        
        // Add START B pattern
        addPatternToSVG(startPattern, x, padding.top, moduleWidth, barHeight);
        x += startPattern.length * moduleWidth;
        
        // Add patterns for each character
        for (let i = 0; i < barcodeValue.length; i++) {
          const charCode = barcodeValue.charCodeAt(i);
          const valueIndex = charCode - 32; // Adjust for ASCII table offset
          const pattern = code128Patterns[valueIndex];
          
          addPatternToSVG(pattern, x, padding.top, moduleWidth, barHeight);
          x += pattern.length * moduleWidth;
        }
        
        // Add checksum pattern
        const checksumPattern = code128Patterns[checksum];
        addPatternToSVG(checksumPattern, x, padding.top, moduleWidth, barHeight);
        x += checksumPattern.length * moduleWidth;
        
        // Add STOP pattern (106)
        const stopPattern = "1100011101011";
        addPatternToSVG(stopPattern, x, padding.top, moduleWidth, barHeight);
        
        // Add text for the barcode value
        svg += '<text x="' + width/2 + '" y="' + (height - 5) + '" text-anchor="middle" font-family="Arial" font-size="' + fontSize + '">' + barcodeValue + '</text>';
        
        // Close the SVG
        svg += '</svg>';
        
        return svg;
        
        // Helper function to add a pattern to the SVG
        function addPatternToSVG(pattern, xPos, yPos, modWidth, height) {
          for (let i = 0; i < pattern.length; i++) {
            if (pattern[i] === '1') {
              svg += '<rect x="' + xPos + '" y="' + yPos + '" width="' + modWidth + '" height="' + height + '" fill="black" />';
            }
            xPos += modWidth;
          }
        }
      }
      
      // Generate an EAN-13 barcode SVG
      function generateEAN13SVG(barcodeValue) {
        // EAN-13 requires exactly 13 digits
        if (!/^\\d{13}$/.test(barcodeValue)) {
          // Pad to 13 digits if needed or generate a valid EAN-13
          barcodeValue = barcodeValue.padEnd(12, '0');
          
          // Calculate check digit (13th digit)
          const digits = barcodeValue.split('').map(Number);
          let sum = 0;
          for (let i = 0; i < 12; i++) {
            sum += digits[i] * (i % 2 === 0 ? 1 : 3);
          }
          const checkDigit = (10 - (sum % 10)) % 10;
          barcodeValue = barcodeValue + checkDigit;
        }
        
        // EAN-13 encoding patterns
        const leftOddPatterns = [
          "0001101", "0011001", "0010011", "0111101", "0100011", 
          "0110001", "0101111", "0111011", "0110111", "0001011"
        ];
        
        const leftEvenPatterns = [
          "0100111", "0110011", "0011011", "0100001", "0011101", 
          "0111001", "0000101", "0010001", "0001001", "0010111"
        ];
        
        const rightPatterns = [
          "1110010", "1100110", "1101100", "1000010", "1011100", 
          "1001110", "1010000", "1000100", "1001000", "1110100"
        ];
        
        // First digit encoding patterns for the left side (which determines odd/even pattern)
        const firstDigitEncoding = [
          "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", 
          "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"
        ];
        
        // Constants for the barcode (تم تصغير الحجم لتناسب الطباعة)
        const height = 60;
        const width = 170;
        const moduleWidth = 1.5; // Width of the thinnest bar
        const fontSize = 11;
        const padding = { top: 5, left: 10, bottom: 12, right: 10 };
        const guardBarHeight = height - padding.top - (padding.bottom / 2); // Guard bars are taller
        const normalBarHeight = height - padding.top - padding.bottom;
        
        // Generate SVG for the EAN-13 barcode
        let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">';
        
        // Add white background
        svg += '<rect x="0" y="0" width="' + width + '" height="' + height + '" fill="white" />';
        
        // Start building the actual barcode
        let x = padding.left;
        
        // First digit of EAN-13 (encoded in the parity pattern of the left side)
        const firstDigit = parseInt(barcodeValue[0], 10);
        const parityPattern = firstDigitEncoding[firstDigit];
        
        // Add text for first digit
        svg += '<text x="' + x + '" y="' + (height - 5) + '" font-family="Arial" font-size="' + fontSize + '">' + firstDigit + '</text>';
        x += moduleWidth * 10; // Space for first digit text
        
        // Left guard bars (101)
        svg += '<rect x="' + x + '" y="' + padding.top + '" width="' + moduleWidth + '" height="' + guardBarHeight + '" fill="black" />';
        x += moduleWidth * 2; // Skip the white space
        svg += '<rect x="' + x + '" y="' + padding.top + '" width="' + moduleWidth + '" height="' + guardBarHeight + '" fill="black" />';
        x += moduleWidth * 2; // Space after guard
        
        // Left side of the barcode (6 digits, each 7 modules wide)
        for (let i = 1; i <= 6; i++) {
          const digit = parseInt(barcodeValue[i], 10);
          const pattern = parityPattern[i-1] === 'L' ? leftOddPatterns[digit] : leftEvenPatterns[digit];
          
          // Add text for digit below the barcode
          const digitX = x + (moduleWidth * 3); // Center digit under its barcode pattern
          svg += '<text x="' + digitX + '" y="' + (height - 5) + '" text-anchor="middle" font-family="Arial" font-size="' + fontSize + '">' + digit + '</text>';
          
          // Add barcode pattern for digit
          for (let j = 0; j < pattern.length; j++) {
            if (pattern[j] === '1') {
              svg += '<rect x="' + x + '" y="' + padding.top + '" width="' + moduleWidth + '" height="' + normalBarHeight + '" fill="black" />';
            }
            x += moduleWidth;
          }
        }
        
        // Middle guard bars (01010)
        svg += '<rect x="' + x + '" y="' + padding.top + '" width="' + moduleWidth + '" height="' + guardBarHeight + '" fill="black" />';
        x += moduleWidth * 2;
        svg += '<rect x="' + x + '" y="' + padding.top + '" width="' + moduleWidth + '" height="' + guardBarHeight + '" fill="black" />';
        x += moduleWidth * 2;
        svg += '<rect x="' + x + '" y="' + padding.top + '" width="' + moduleWidth + '" height="' + guardBarHeight + '" fill="black" />';
        x += moduleWidth * 2;
        
        // Right side of the barcode (6 digits, each 7 modules wide)
        for (let i = 7; i < 13; i++) {
          const digit = parseInt(barcodeValue[i], 10);
          const pattern = rightPatterns[digit];
          
          // Add text for digit below the barcode
          const digitX = x + (moduleWidth * 3); // Center digit under its barcode pattern
          svg += '<text x="' + digitX + '" y="' + (height - 5) + '" text-anchor="middle" font-family="Arial" font-size="' + fontSize + '">' + digit + '</text>';
          
          // Add barcode pattern for digit
          for (let j = 0; j < pattern.length; j++) {
            if (pattern[j] === '1') {
              svg += '<rect x="' + x + '" y="' + padding.top + '" width="' + moduleWidth + '" height="' + normalBarHeight + '" fill="black" />';
            }
            x += moduleWidth;
          }
        }
        
        // Right guard bars (101)
        svg += '<rect x="' + x + '" y="' + padding.top + '" width="' + moduleWidth + '" height="' + guardBarHeight + '" fill="black" />';
        x += moduleWidth * 2; // Skip the white space
        svg += '<rect x="' + x + '" y="' + padding.top + '" width="' + moduleWidth + '" height="' + guardBarHeight + '" fill="black" />';
        
        // Close the SVG
        svg += '</svg>';
        
        return svg;
      }
      `;
      
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
              gap: 5px;
              justify-content: center;
            }
            .barcode-item {
              border: 1px solid #ccc;
              padding: 5px;
              text-align: center;
              width: 180px;
              margin-bottom: 5px;
              box-shadow: 0 1px 2px rgba(0,0,0,0.1);
              border-radius: 3px;
            }
            .product-name {
              font-weight: bold;
              margin-bottom: 2px;
              font-size: 12px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .product-price {
              font-size: 11px;
              margin-bottom: 3px;
            }
            @media print {
              @page { 
                margin: 0.3cm; 
                size: A4;
              }
              body { 
                margin: 0; 
                padding: 2px; 
              }
              .barcode-container {
                gap: 2px;
              }
              .barcode-item { 
                break-inside: avoid; 
                margin: 2px;
                padding: 3px;
                border-width: 1px;
                box-shadow: none;
              }
              .no-print { display: none; }
            }
          </style>
          <script>
            // تضمين كود توليد الباركود المكتمل
            ${completeCode}
          </script>
        </head>
        <body>
          <div class="no-print" style="text-align: center; margin: 20px 0;">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background: #4F46E5; color: white; border: none; border-radius: 4px;">${t('print')}</button>
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
            <div class="barcode-container-${product.id}" style="margin-bottom: 2px; transform: scale(0.8); transform-origin: top center;"></div>
            <div style="font-weight: bold; font-size: 11px; color: #444;">${product.barcode}</div>
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
                document.querySelector('.barcode-container-${product.id}').innerHTML = generateBarcodeSVG("${product.barcode}");
              `).join('\n')}
              
              // إضافة إشعار تم التحميل بنجاح
              const loadingMessage = document.createElement('div');
              loadingMessage.style.textAlign = 'center';
              loadingMessage.style.margin = '20px 0';
              loadingMessage.style.padding = '10px';
              loadingMessage.style.backgroundColor = '#e6ffe6';
              loadingMessage.style.color = '#008000';
              loadingMessage.style.borderRadius = '4px';
              loadingMessage.classList.add('no-print');
              loadingMessage.innerHTML = '<b>تم تحميل الباركود بنجاح!</b> جاهز للطباعة.';
              document.body.insertBefore(loadingMessage, document.querySelector('.barcode-container'));

              // طباعة تلقائية بعد توليد الباركودات إذا رغبت (تم تعطيلها حاليًا)
              // setTimeout(() => window.print(), 1000);
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
    mutationFn: async (employee: any) => {
      const response = await apiRequest('POST', '/api/employees', employee);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: t('success'),
        description: t('employee_added_successfully'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('add_employee_error'),
        variant: 'destructive',
      });
    }
  });
  
  const editEmployeeMutation = useMutation({
    mutationFn: async (employee: any) => {
      const response = await apiRequest('PATCH', `/api/employees/${employee.id}`, employee);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: t('success'),
        description: t('employee_updated_successfully'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('update_employee_error'),
        variant: 'destructive',
      });
    }
  });
  
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const response = await apiRequest('DELETE', `/api/employees/${employeeId}`);
      return employeeId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: t('success'),
        description: t('employee_deleted_successfully'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('delete_employee_error'),
        variant: 'destructive',
      });
    }
  });
  
  const addDamagedItemMutation = useMutation({
    mutationFn: async (item: any) => {
      const response = await apiRequest('POST', '/api/damaged-items', item);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/damaged-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] }); // Refresh products as inventory might change
      toast({
        title: t('success'),
        description: t('damaged_item_added_successfully'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('add_damaged_item_error'),
        variant: 'destructive',
      });
    }
  });
  
  const editDamagedItemMutation = useMutation({
    mutationFn: async (item: any) => {
      const response = await apiRequest('PATCH', `/api/damaged-items/${item.id}`, item);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/damaged-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] }); // Refresh products as inventory might change
      toast({
        title: t('success'),
        description: t('damaged_item_updated_successfully'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('update_damaged_item_error'),
        variant: 'destructive',
      });
    }
  });
  
  const deleteDamagedItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await apiRequest('DELETE', `/api/damaged-items/${itemId}`);
      return itemId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/damaged-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] }); // Refresh products as inventory might change
      toast({
        title: t('success'),
        description: t('damaged_item_deleted_successfully'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('delete_damaged_item_error'),
        variant: 'destructive',
      });
    }
  });
  
  const addUserMutation = useMutation({
    mutationFn: async (user: any) => {
      const response = await apiRequest('POST', '/api/users', user);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: t('success'),
        description: t('user_added_successfully'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('add_user_error'),
        variant: 'destructive',
      });
    }
  });
  
  const editUserMutation = useMutation({
    mutationFn: async (user: any) => {
      const response = await apiRequest('PATCH', `/api/users/${user.id}`, user);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: t('success'),
        description: t('user_updated_successfully'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('update_user_error'),
        variant: 'destructive',
      });
    }
  });
  
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('DELETE', `/api/users/${userId}`);
      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: t('success'),
        description: t('user_deleted_successfully'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('delete_user_error'),
        variant: 'destructive',
      });
    }
  });
  
  // Expense mutations
  const addExpenseMutation = useMutation({
    mutationFn: async (expense: any) => {
      const response = await apiRequest('POST', '/api/expenses', expense);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      toast({
        title: t('success'),
        description: t('expense_added_successfully'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('add_expense_error'),
        variant: 'destructive',
      });
    }
  });
  
  const editExpenseMutation = useMutation({
    mutationFn: async (expense: any) => {
      const response = await apiRequest('PATCH', `/api/expenses/${expense.id}`, expense);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      toast({
        title: t('success'),
        description: t('expense_updated_successfully'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('edit_expense_error'),
        variant: 'destructive',
      });
    }
  });
  
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/expenses/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      toast({
        title: t('success'),
        description: t('expense_deleted_successfully'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('delete_expense_error'),
        variant: 'destructive',
      });
    }
  });
  
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('POST', `/api/users/${userId}/reset-password`);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: t('success'),
        description: t('password_reset_success') + `: ${data.newPassword || ''}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('password_reset_error'),
        variant: 'destructive',
      });
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
            value="expenses" 
            className="flex items-center gap-2 transition-all data-[state=active]:bg-indigo-600 data-[state=active]:text-white hover:bg-indigo-100 data-[state=active]:hover:bg-indigo-700 relative overflow-hidden group"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-indigo-400/0 group-hover:opacity-100 opacity-0 transition-opacity duration-300"></span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {t('expenses_management')}
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

          <TabsTrigger 
            value="settings" 
            className="flex items-center gap-2 transition-all data-[state=active]:bg-gray-600 data-[state=active]:text-white hover:bg-gray-100 data-[state=active]:hover:bg-gray-700 relative overflow-hidden group"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-gray-400/20 to-gray-400/0 group-hover:opacity-100 opacity-0 transition-opacity duration-300"></span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            {t('system_settings')}
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
            onAddDeduction={(employeeId, deduction) => addDeductionMutation.mutate({employeeId, deduction})}
            deductionHistory={employeeDeductions}
            isLoadingDeductions={isLoadingDeductions}
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
        
        <TabsContent value="expenses">
          <ExpenseList 
            expenses={expenses}
            isLoading={isLoadingExpenses}
            onAddExpense={(expense) => addExpenseMutation.mutate(expense)}
            onEditExpense={(expense) => editExpenseMutation.mutate(expense)}
            onDeleteExpense={(id) => deleteExpenseMutation.mutate(id)}
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

        <TabsContent value="settings">
          <div className="p-4 space-y-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800">{t('system_settings')}</h2>
            
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-medium text-gray-800 mb-2">{t('date_time_settings')}</h3>
              <p className="text-gray-600 mb-4">
                لوحظ وجود مشكلة في تخزين التواريخ في قاعدة البيانات، حيث أن هناك فرق 3 ساعات بين الوقت الفعلي والوقت المخزن. استخدم هذه الأداة لإصلاح جميع التواريخ في قاعدة البيانات.
              </p>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.981l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="mr-3">
                    <p className="text-sm text-yellow-700">
                      تنبيه: ستقوم هذه العملية بتحديث جميع التواريخ في قاعدة البيانات. تأكد من عدم استخدام النظام من قبل مستخدمين آخرين خلال هذه العملية.
                    </p>
                  </div>
                </div>
              </div>
              
              <FixDatesButton />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// زر إصلاح التواريخ
function FixDatesButton() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isFixing, setIsFixing] = useState(false);
  
  const fixDatesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/fix-dates');
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم بنجاح",
        description: "تم إصلاح جميع التواريخ في قاعدة البيانات بنجاح",
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء إصلاح التواريخ",
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsFixing(false);
    }
  });
  
  const handleFixDates = () => {
    if (window.confirm("هل أنت متأكد من أنك تريد إصلاح جميع التواريخ في قاعدة البيانات؟")) {
      setIsFixing(true);
      fixDatesMutation.mutate();
    }
  };
  
  return (
    <button
      onClick={handleFixDates}
      disabled={isFixing}
      className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
    >
      {isFixing ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          جاري إصلاح التواريخ...
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          إصلاح التواريخ
        </>
      )}
    </button>
  );
}
