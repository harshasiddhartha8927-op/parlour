import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForViteDevBuildSuccess",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dhanvika-beauty-parlour.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dhanvika-beauty-parlour",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dhanvika-beauty-parlour.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

export const isFirebaseConfigured = 
  !!import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_API_KEY !== "AIzaSyDummyKeyForViteDevBuildSuccess";

