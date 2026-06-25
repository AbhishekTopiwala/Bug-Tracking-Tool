import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Firebase configuration — values come from environment variables.
// Local dev uses demo2-659f2 (.env), Vercel prod uses qualia-prod-77b52.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// ── Emulator Connections ─────────────────────────────────────────────────
// Only connect to local emulators when explicitly enabled via env var.
// This prevents accidental connections to emulators that aren't running.
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';

if (useEmulator) {
  console.log('🔧 Connecting to Firebase Local Emulators...');
  // Only connect to Functions emulator for local testing to preserve live Auth/Firestore data
  // connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  // connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  // connectStorageEmulator(storage, '127.0.0.1', 9199);
  console.log('✅ Connected to Functions Emulator');
} else if (import.meta.env.DEV) {
  console.log(
    `🔥 DEV mode — connected to Firebase project: ${import.meta.env.VITE_FIREBASE_PROJECT_ID}`,
    '\n   Set VITE_USE_FIREBASE_EMULATOR=true in .env to use local emulators'
  );
}

export default app;
