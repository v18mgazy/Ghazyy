/**
 * وحدة مساعدة للتعامل مع التواريخ
 * تضمن استخدام التوقيت المحلي الصحيح لمصر (EET/EEST)
 */

/**
 * دالة للحصول على التاريخ والوقت المحلي بتنسيق ISO مع تعديل فرق التوقيت
 * @param date التاريخ المراد تحويله (اختياري)
 * @returns سلسلة نصية بتنسيق ISO تمثل التاريخ المحلي
 */
export const getLocalISOString = (date: Date = new Date()): string => {
  const tzOffset = date.getTimezoneOffset() * 60000; // إزاحة المنطقة الزمنية بالميلي ثانية
  const localISOTime = new Date(date.getTime() - tzOffset).toISOString();
  return localISOTime;
};

/**
 * دالة لتحليل التاريخ من قاعدة البيانات
 * @param dateString سلسلة نصية تمثل التاريخ
 * @returns كائن Date أو null
 */
export const parseFirebaseDate = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  return new Date(dateString);
};

/**
 * دالة لتنسيق التاريخ بالتنسيق المحلي
 * @param date التاريخ المراد تنسيقه
 * @param locale اللغة المستخدمة للتنسيق (افتراضياً العربية السعودية)
 * @param timeZone المنطقة الزمنية (افتراضياً الرياض = UTC+3)
 * @returns سلسلة نصية منسقة للتاريخ
 */
export const formatLocalDate = (date: Date, locale: string = 'ar-SA', timeZone: string = 'Asia/Riyadh'): string => {
  return date.toLocaleString(locale, {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};