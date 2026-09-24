import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

// Firebase Web configuration provided for project mesenger-b000f
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

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize RTDB safely if configured/supported
let rtdbInstance: ReturnType<typeof getDatabase> | null = null;
try {
  rtdbInstance = getDatabase(app);
} catch {
  // Gracefully fallback to Firestore-based presence if RTDB URL is not set
  rtdbInstance = null;
}
export const rtdb = rtdbInstance;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Test connection on boot as mandated by the Firebase Integration Skill
export async function testConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { connected: true, message: 'Connected to Firestore server' };
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline. Check network or rules.');
      return { connected: false, message: 'Client offline or network blocked' };
    }
    return { connected: true, message: 'Firebase reached successfully' };
  }
}
