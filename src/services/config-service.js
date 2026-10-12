// src/services/config-service.js
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase-config.js";

export const DEFAULT_RULES = {
  minAttendanceThreshold: 75.0,
  staleThresholdDays: 15, // Updated from 30 to 15 per university policy
  evaluationDate: "2026-10-12",
  allowOverride: true,
  minDaysBeforeEvent: 3,
  maxRequestsPerSemester: 3,
  maxEventDurationDays: 5,
  minCgpa: 6.0,
  maxActiveBacklogs: 2,
  supportingDocRequiredFor: ["Hackathon", "Conference", "Technical Competition"],
  allowedEventCategories: [
    "Hackathon",
    "Workshop",
    "Conference",
    "Technical Competition",
    "Industrial Visit",
    "Other"
  ]
};

/**
 * Fetch current attendance threshold and policy rules
 */
export async function getAttendanceRules() {
  const configRef = doc(db, "system_config", "attendance_rules");
  const snap = await getDoc(configRef);
  if (!snap.exists()) {
    // If not set yet, initialize and return defaults
    await setDoc(configRef, {
      ...DEFAULT_RULES,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: "system"
    });
    return { ...DEFAULT_RULES };
  }
  return snap.data();
}

/**
 * Update attendance eligibility thresholds and approval rules (In-Charge only)
 */
export async function updateAttendanceRules(updates, userContext = {}) {
  const configRef = doc(db, "system_config", "attendance_rules");
  const payload = {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: userContext.name || userContext.uid || "incharge"
  };
  await setDoc(configRef, payload, { merge: true });
  return payload;
}
