import { FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions & { projectId: string } = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'placeholder-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'placeholder.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'placeholder-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'placeholder.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:000000000000:web:placeholder',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

if (!import.meta.env.VITE_FIREBASE_API_KEY || !import.meta.env.VITE_FIREBASE_PROJECT_ID) {
  console.warn('Firebase configuration is incomplete. Using placeholder config; auth/firestore calls will fail until VITE_FIREBASE_* vars are set.');
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID
  ? getFirestore(app, import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID)
  : getFirestore(app);

export const auth = getAuth(app);
