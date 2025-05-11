import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "GOOGLE_API_KEY",
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
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
