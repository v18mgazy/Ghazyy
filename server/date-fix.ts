/**
 * ملف لإصلاح مشكلة التاريخ في قاعدة البيانات
 * يقوم بتحديث جميع التواريخ المخزنة لتتماشى مع التوقيت المحلي
 */
import { database, ref, get, update } from "./firebase-rtdb";
import { getLocalISOString, parseFirebaseDate } from "./date-utils";

/**
 * تحديث التواريخ في المستندات
 * @param path مسار المجموعة في قاعدة البيانات
 * @param fieldNames أسماء حقول التاريخ التي سيتم تحديثها
 */
export async function updateDatesInCollection(path: string, fieldNames: string[]) {
  console.log(`جاري إصلاح التواريخ في مجموعة: ${path}`);
  try {
    // الحصول على جميع المستندات في المجموعة
    const snapshot = await get(ref(database, path));
    if (!snapshot.exists()) {
      console.log(`المجموعة ${path} فارغة أو غير موجودة`);
      return;
    }

    const data = snapshot.val();
    let updatedCount = 0;
    
    // معالجة كل مستند
    for (const id in data) {
      const doc = data[id];
      const updates: Record<string, string> = {};
      let needsUpdate = false;
      
      // فحص وتحديث كل حقل تاريخ
      for (const field of fieldNames) {
        if (doc[field] && typeof doc[field] === 'string') {
          // التحقق من أن التاريخ يحتوي على حرف Z في النهاية (يشير إلى UTC)
          // أو أنه لا يحتوي على إزاحة المنطقة الزمنية
          const dateStr = doc[field];
          if (dateStr.endsWith('Z') || !dateStr.includes('+') && !dateStr.includes('-', 10)) {
            const date = parseFirebaseDate(dateStr);
            if (date) {
              const localISOString = getLocalISOString(date);
              if (localISOString !== dateStr) {
                updates[field] = localISOString;
                needsUpdate = true;
              }
            }
          }
        }
      }
      
      // تطبيق التحديثات إذا كانت هناك حاجة
      if (needsUpdate) {
        await update(ref(database, `${path}/${id}`), updates);
        updatedCount++;
      }
    }
    
    console.log(`تم تحديث ${updatedCount} مستند في مجموعة ${path}`);
  } catch (error) {
    console.error(`خطأ أثناء تحديث التواريخ في مجموعة ${path}:`, error);
  }
}

/**
 * تحديث جميع التواريخ في قاعدة البيانات
 */
export async function fixAllDates() {
  // المجموعات وحقول التاريخ التي يجب تحديثها
  const collections = [
    { path: 'invoices', fields: ['createdAt', 'updatedAt', 'date'] },
    { path: 'customers', fields: ['createdAt', 'updatedAt'] },
    { path: 'products', fields: ['createdAt', 'updatedAt'] },
    { path: 'damaged_items', fields: ['createdAt', 'date'] },
    { path: 'employees', fields: ['createdAt', 'updatedAt'] },
    { path: 'users', fields: ['createdAt', 'updatedAt', 'lastLogin'] },
    { path: 'payments', fields: ['createdAt', 'date'] },
    { path: 'notifications', fields: ['createdAt'] },
    { path: 'employee_deductions', fields: ['date'] },
    { path: 'expenses', fields: ['date'] },
    { path: 'payment_approvals', fields: ['createdAt', 'updatedAt'] },
    { path: 'reports', fields: ['createdAt', 'date'] },
    { path: 'supplier_invoices', fields: ['createdAt', 'updatedAt', 'date', 'dueDate'] },
    { path: 'supplier_payments', fields: ['createdAt', 'paymentDate'] },
    { path: 'suppliers', fields: ['createdAt', 'updatedAt'] }
  ];
  
  // تحديث كل مجموعة
  for (const collection of collections) {
    await updateDatesInCollection(collection.path, collection.fields);
  }
  
  console.log('تم إكمال عملية إصلاح التواريخ في قاعدة البيانات');
  return { success: true, message: 'تم إصلاح جميع التواريخ بنجاح' };
}