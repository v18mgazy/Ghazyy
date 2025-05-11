import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
