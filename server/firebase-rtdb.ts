import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, remove, update, child, onValue, query, equalTo, orderByChild } from "firebase/database";

// Firebase configuration with the correct credentials
const firebaseConfig = {
  apiKey: "AIzaSyAzY3A4NMJH9wYQQULiZPoR0AuXBmvz1q0",
  authDomain: "sales-ghazy.firebaseapp.com",
  databaseURL: "https://sales-ghazy-default-rtdb.firebaseio.com",
  projectId: "sales-ghazy",
  storageBucket: "sales-ghazy.firebasestorage.app",
  messagingSenderId: "172409339688",
  appId: "1:172409339688:web:0ae4e6c22bc9ea65719a1d",
  measurementId: "G-JGPJ8LC6GC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

/**
 * Test connection to Realtime Database
 */
export async function testRealtimeDBConnection() {
  try {
    console.log('Testing Realtime Database connection...');
    
    // اختبار الاتصال من خلال محاولة قراءة بيانات
    const testRef = ref(database, 'test');
    const snapshot = await get(testRef);
    
    if (snapshot.exists()) {
      console.log('Realtime Database connection successful! Retrieved data:', snapshot.val());
    } else {
      console.log('Realtime Database connection successful! No data available at test location.');
    }
    
    return true;
  } catch (error) {
    console.error('Realtime Database connection error:', error);
    return false;
  }
}

export { database, ref, set, get, remove, update, child, onValue, query, equalTo, orderByChild };