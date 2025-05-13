/**
 * وحدة مساعدة للتعامل مع التواريخ
 * تضمن استخدام التوقيت المحلي الصحيح لمصر (EET/EEST)
 */

/**
 * دالة للحصول على التاريخ والوقت المحلي بتنسيق ISO مع تعديل فرق التوقيت
 * تضيف 3 ساعات للحصول على التوقيت المحلي في مصر (EET/EEST)
 */
export function getLocalISOString(date?: Date): string {
  const dt = date ? new Date(date) : new Date();
  // إضافة 3 ساعات للحصول على التوقيت المحلي في مصر
  dt.setHours(dt.getHours() + 3);
  return dt.toLocaleString('sv-SE').replace(' ', 'T');
}

/**
 * دالة للحصول على تاريخ محلي من سلسلة نصية
 * تقوم بتحويل التاريخ من النص إلى كائن Date مع مراعاة التوقيت المحلي
 */
export function getLocalDate(dateString: string): Date {
  // إذا كان التاريخ من قاعدة البيانات (بتنسيق ISO)
  const dt = new Date(dateString);
  return dt;
}