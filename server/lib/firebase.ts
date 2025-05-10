import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "demo-key",
  authDomain: `${process.env.FIREBASE_PROJECT_ID || "demo-project"}.firebaseapp.com`,
  projectId: process.env.FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: `${process.env.FIREBASE_PROJECT_ID || "demo-project"}.appspot.com`,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: process.env.FIREBASE_APP_ID || "1:000000000000:web:0000000000000000000000",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
