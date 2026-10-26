import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  getDoc,
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  updateDoc,
  addDoc,
  serverTimestamp,
  increment,
  onSnapshot,
  where,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

export const FIRESTORE_DATABASE_ID = 'ai-studio-website-95ff7c9a-7503-4800-846a-3605e43775ad';

// Initialize Firebase once
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore with explicit database ID
export const db = getFirestore(app, FIRESTORE_DATABASE_ID);

// Initialize Firebase Storage
export const storage = getStorage(app);

// Test connection on boot
async function testConnection() {
  if (typeof window === 'undefined') return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is currently offline or connecting to Firestore.');
    }
  }
}

testConnection();

export {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  updateDoc,
  addDoc,
  serverTimestamp,
  increment,
  onSnapshot,
  where,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
};

export type { FirebaseUser };
export default db;
