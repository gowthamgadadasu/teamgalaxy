// src/firebase-config.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCGdyt3I9CnIjFWnXbuwxe7p00MKmcZmq4",
  authDomain: "campusgate-17420.firebaseapp.com",
  projectId: "campusgate-17420",
  storageBucket: "campusgate-17420.firebasestorage.app",
  messagingSenderId: "724796093169",
  appId: "1:724796093169:web:51b471913582e83bbf6f50"
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore & Auth
const db = getFirestore(app);
const auth = getAuth(app);

// Connect to local emulators if configured or in emulator environment
export function enableEmulators(host = "127.0.0.1") {
  try {
    connectFirestoreEmulator(db, host, 8080);
    connectAuthEmulator(auth, `http://${host}:9099`);
    console.log(`Connected to Firebase Emulators on ${host}`);
  } catch (err) {
    // Already connected or failed
    console.warn("Emulator connection warning:", err.message);
  }
}

export { app, db, auth, firebaseConfig };
export default db;
