import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase configuration - using same values as client
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "GOOGLE_API_KEY",
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID || "sales-ghazy"}.firebaseapp.com`,
  databaseURL: "https://sales-ghazy-default-rtdb.firebaseio.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "sales-ghazy",
  storageBucket: `${process.env.VITE_FIREBASE_PROJECT_ID || "sales-ghazy"}.appspot.com`,
  messagingSenderId: "172409339688",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:172409339688:web:0ae4e6c22bc9ea65719a1d",
  measurementId: "G-JGPJ8LC6GC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
