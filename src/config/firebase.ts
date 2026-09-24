import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Your web app's Firebase configuration
// Environment variables are prioritized, defaulting to your mesenger-b000f configuration
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBLHf31NsE8X3d5NX9ZYb3VQqXzK97kS4E",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mesenger-b000f.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mesenger-b000f",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mesenger-b000f.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "644557151828",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:644557151828:web:6c7747e98d28ebf3cfd7c1",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-ZYXS2SNW2W",
};

// Initialize Firebase only once
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firebase Authentication
export const auth = getAuth(app);

// Firestore Database
export const db = getFirestore(app);

// Firebase Storage
export const storage = getStorage(app);

// Safe Analytics initialization
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {});
}

// Realtime Database (with fallback if RTDB is not provisioned)
let rtdbInstance: ReturnType<typeof getDatabase> | null = null;
try {
  rtdbInstance = getDatabase(app);
} catch {
  rtdbInstance = null;
}
export const rtdb = rtdbInstance;

// Google Authentication Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Test connection on boot
export async function testConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { connected: true, message: 'Connected to Firestore server' };
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      return { connected: false, message: 'Client offline or network blocked' };
    }
    return { connected: true, message: 'Firebase reached successfully' };
  }
}
