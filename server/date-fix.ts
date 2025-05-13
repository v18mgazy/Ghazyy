/**
 * ملف لإصلاح مشكلة التاريخ في قاعدة البيانات
 * يقوم بتحديث جميع التواريخ المخزنة لتتماشى مع التوقيت المحلي
 */

import { database, ref, get, update } from "./firebase-rtdb";
import { getLocalISOString } from "./date-utils";

/**
 * تحديث التواريخ في المستندات
 * @param path مسار المجموعة في قاعدة البيانات
 * @param fieldNames أسماء حقول التاريخ التي سيتم تحديثها
 */
export async function updateDatesInCollection(path: string, fieldNames: string[]) {
  try {
    const collectionRef = ref(database, path);
    const snapshot = await get(collectionRef);
    
    if (!snapshot.exists()) {
      console.log(`Collection ${path} does not exist or is empty.`);
      return;
    }
    
    const data = snapshot.val();
    let updatedCount = 0;
    
    // معالجة كل مستند في المجموعة
    for (const docId in data) {
      const doc = data[docId];
      const updates: Record<string, any> = {};
      let needsUpdate = false;
      
      // معالجة كل حقل تاريخ في المستند
      for (const fieldName of fieldNames) {
        if (doc[fieldName]) {
          // تحقق من أن الحقل هو تاريخ بالفعل
          const dt = new Date(doc[fieldName]);
          if (!isNaN(dt.getTime())) {
            // إضافة 3 ساعات والتحويل إلى تنسيق سلسلة
            updates[fieldName] = getLocalISOString(dt);
            needsUpdate = true;
          }
        }
      }
      
      // تحديث المستند إذا كان هناك تغييرات
      if (needsUpdate) {
        await update(ref(database, `${path}/${docId}`), updates);
        updatedCount++;
      }
    }
    
    console.log(`Updated ${updatedCount} documents in ${path}`);
  } catch (error) {
    console.error(`Error updating dates in ${path}:`, error);
  }
}

/**
 * تحديث جميع التواريخ في قاعدة البيانات
 */
export async function fixAllDates() {
  // قائمة المجموعات وحقول التاريخ
  const collections: [string, string[]][] = [
    ['users', ['createdAt', 'updatedAt', 'lastLogin']],
    ['products', ['createdAt', 'updatedAt']],
    ['customers', ['createdAt', 'updatedAt']],
    ['invoices', ['createdAt', 'updatedAt', 'date']],
    ['damaged_items', ['createdAt', 'date']],
    ['employees', ['createdAt', 'updatedAt', 'joinDate']],
    ['payment_approvals', ['createdAt', 'updatedAt']],
    ['notifications', ['createdAt']],
    ['employee_deductions', ['createdAt', 'date']],
    ['expenses', ['createdAt', 'date']],
    ['store_info', ['createdAt', 'updatedAt']],
    ['suppliers', ['createdAt', 'updatedAt']],
    ['supplier_invoices', ['createdAt', 'updatedAt', 'date', 'dueDate']],
    ['supplier_payments', ['createdAt', 'paymentDate']]
  ];
  
  for (const [collection, fields] of collections) {
    await updateDatesInCollection(collection, fields);
  }
  
  console.log('Date fix completed for all collections.');
}