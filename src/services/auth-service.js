// src/services/auth-service.js
import { doc, getDoc, setDoc, getDocs, collection, query, where, serverTimestamp } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { db, auth } from "../firebase-config.js";

/**
 * Roles enum
 */
export const ROLES = {
  STUDENT: "student",
  PROCTOR: "proctor",
  INCHARGE: "incharge"
};

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

/**
 * Sign in with Google Popup and resolve User Profile & Role
 */
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  // 1. Check if user document exists with user.uid
  let profile = await getUserProfile(user.uid);

  // 2. If not found by UID, search by email in the users collection
  if (!profile && user.email) {
    const q = query(collection(db, "users"), where("email", "==", user.email.toLowerCase().trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
  }

  // 3. Fallback or student auto-provisioning if domain or email belongs to a student
  if (!profile) {
    profile = {
      uid: user.uid,
      name: user.displayName || user.email.split("@")[0],
      email: user.email,
      role: ROLES.STUDENT,
      photoURL: user.photoURL,
      createdAt: serverTimestamp()
    };
    try {
      await setUserProfile(user.uid, profile);
    } catch (e) {
      console.warn("Could not write user profile directly (may need incharge permissions):", e);
    }
  }

  return { user, profile };
}

/**
 * Fetch a user profile by UID
 */
export async function getUserProfile(uid) {
  if (!uid) return null;
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Create or update a user profile
 */
export async function setUserProfile(uid, data) {
  const userRef = doc(db, "users", uid);
  const profile = {
    ...data,
    updatedAt: serverTimestamp()
  };
  await setDoc(userRef, profile, { merge: true });
  return { id: uid, ...profile };
}

/**
 * Fetch all students assigned to a specific proctor
 */
export async function getAssignedStudentsForProctor(proctorId) {
  const q = query(
    collection(db, "users"),
    where("role", "==", ROLES.STUDENT),
    where("proctorId", "==", proctorId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Fetch user profile by Roll Number
 */
export async function getUserByRollNumber(rollNumber) {
  if (!rollNumber) return null;
  const q = query(
    collection(db, "users"),
    where("rollNumber", "==", rollNumber.trim().toUpperCase())
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/**
 * List all users with a specific role
 */
export async function getUsersByRole(role) {
  const q = query(collection(db, "users"), where("role", "==", role));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

