import { db } from './lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

/**
 * التحقق من اتصال Firebase - يستخدم فقط للاختبار
 */
export async function testFirebaseConnection() {
  try {
    console.log('Testing Firebase connection...');
    
    // محاولة إنشاء مجموعة وجلب الوثائق
    const testCollection = collection(db, 'test_collection');
    const snapshot = await getDocs(testCollection);
    
    console.log(`Firebase connection successful! Read ${snapshot.size} documents from test_collection`);
    return true;
  } catch (error) {
    console.error('Firebase connection error:', error);
    return false;
  }
}