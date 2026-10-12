// src/services/request-service.js
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase-config.js";
import { evaluateAttendanceEligibility } from "./attendance-service.js";
import { getUserProfile, getUserByRollNumber } from "./auth-service.js";

/**
 * Valid event categories
 */
export const EVENT_CATEGORIES = [
  "Hackathon",
  "Workshop",
  "Conference",
  "Technical Competition",
  "Industrial Visit",
  "Other"
];

/**
 * Generate a unique reference number
 */
export function generateReferenceNumber() {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `EVT-${year}-${randomSuffix}`;
}

/**
 * Detect overlapping event requests for a student
 * Overlap formula: (existingStart <= newEnd) && (existingEnd >= newStart)
 */
export async function detectDateOverlaps(studentRollNumber, newStartDate, newEndDate, excludeRequestId = null) {
  const q = query(
    collection(db, "event_requests"),
    where("studentRollNumber", "==", studentRollNumber)
  );

  const snap = await getDocs(q);
  const overlapping = [];

  const nStart = new Date(newStartDate).getTime();
  const nEnd = new Date(newEndDate).getTime();

  snap.forEach(docSnap => {
    if (excludeRequestId && docSnap.id === excludeRequestId) return;
    const req = docSnap.data();

    // Ignore withdrawn or rejected requests
    if (req.status === "Withdrawn" || req.status === "Rejected") return;

    const exStart = new Date(req.startDate).getTime();
    const exEnd = new Date(req.endDate).getTime();

    // Check interval overlap
    if (exStart <= nEnd && exEnd >= nStart) {
      overlapping.push({
        id: docSnap.id,
        referenceNumber: req.referenceNumber,
        eventTitle: req.eventTitle,
        startDate: req.startDate,
        endDate: req.endDate,
        status: req.status
      });
    }
  });

  return overlapping;
}

/**
 * Validate event request form payload
 */
export function validateRequestForm(data) {
  const errors = [];

  if (!data.eventTitle || data.eventTitle.trim().length === 0) {
    errors.push("Event title is required");
  }

  if (!data.organizer || data.organizer.trim().length === 0) {
    errors.push("Organizer name is required");
  }

  if (!data.category || !EVENT_CATEGORIES.includes(data.category)) {
    errors.push(`Invalid category. Must be one of: ${EVENT_CATEGORIES.join(", ")}`);
  }

  if (!data.venue || data.venue.trim().length === 0) {
    errors.push("Venue is required");
  }

  if (!data.city || data.city.trim().length === 0) {
    errors.push("City is required");
  }

  if (!data.startDate) {
    errors.push("Start date is required");
  }

  if (!data.endDate) {
    errors.push("End date is required");
  }

  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end < start) {
      errors.push("End date cannot be earlier than start date");
    }
  }

  if (!data.purpose || data.purpose.trim().length === 0) {
    errors.push("Purpose and expected academic or technical benefit are required");
  }

  return errors;
}

/**
 * Module 3: Create & Submit an Event Request
 */
export async function createEventRequest(formData, studentProfile) {
  const validationErrors = validateRequestForm(formData);
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join("; ")}`);
  }

  const rollNumber = studentProfile.rollNumber;
  if (!rollNumber) {
    throw new Error("Student profile is missing roll number");
  }

  // 1. Evaluate Attendance Snapshot directly from authoritative attendance dataset
  const attendanceEvaluation = await evaluateAttendanceEligibility(rollNumber);

  // 2. Check for date overlaps
  const overlaps = await detectDateOverlaps(rollNumber, formData.startDate, formData.endDate);
  const hasOverlaps = overlaps.length > 0;

  // 3. Generate Request Doc
  const requestRef = doc(collection(db, "event_requests"));
  const referenceNumber = generateReferenceNumber();

  const isDraft = formData.isDraft === true;
  const initialStatus = isDraft ? "Draft" : "Submitted";

  const requestPayload = {
    id: requestRef.id,
    referenceNumber,
    studentUid: studentProfile.id || studentProfile.uid,
    studentRollNumber: rollNumber,
    studentName: studentProfile.name,
    proctorId: studentProfile.proctorId || null,
    department: studentProfile.department || "",
    yearSection: studentProfile.yearSection || "",

    // Event Details
    eventTitle: formData.eventTitle.trim(),
    organizer: formData.organizer.trim(),
    category: formData.category,
    venue: formData.venue.trim(),
    city: formData.city.trim(),
    startDate: formData.startDate,
    endDate: formData.endDate,
    eventUrl: formData.eventUrl || "",
    purpose: formData.purpose.trim(),
    supportingDocumentUrl: formData.supportingDocumentUrl || "",

    // Attendance Snapshot from dataset
    attendanceSnapshot: {
      classesConducted: attendanceEvaluation.classesConducted ?? null,
      classesAttended: attendanceEvaluation.classesAttended ?? null,
      attendancePercentage: attendanceEvaluation.attendancePercentage,
      requiredThreshold: attendanceEvaluation.requiredThreshold,
      eligibilityStatus: attendanceEvaluation.eligibilityStatus,
      isDataStale: attendanceEvaluation.isDataStale,
      dataAsOf: attendanceEvaluation.dataAsOf,
      reason: attendanceEvaluation.reason
    },

    // Date Overlaps
    hasOverlappingEvents: hasOverlaps,
    overlappingEventIds: overlaps.map(o => o.referenceNumber),
    overlapDetails: overlaps,

    // Status & Workflow
    status: initialStatus,
    proctorRemarks: "",
    proctorRecommendation: null,
    proctorReviewedAt: null,
    finalDecisionRemarks: "",
    finalDecidedBy: null,
    finalDecidedAt: null,
    hasAttendanceOverride: false,
    overrideReason: "",

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(requestRef, requestPayload);

  // Add initial history entry in subcollection
  const historyRef = doc(collection(requestRef, "history"));
  await setDoc(historyRef, {
    action: isDraft ? "SAVED_DRAFT" : "SUBMITTED",
    fromStatus: null,
    toStatus: initialStatus,
    performedBy: studentProfile.id || studentProfile.uid,
    performedByName: studentProfile.name,
    performedByRole: "student",
    remarks: isDraft ? "Draft saved by student" : "Request submitted for review",
    timestamp: serverTimestamp()
  });

  return {
    id: requestRef.id,
    referenceNumber,
    status: initialStatus,
    overlaps
  };
}

/**
 * Edit / Resubmit a request (only allowed if status is Draft or Returned for Correction)
 */
export async function updateEventRequest(requestId, updates, userProfile) {
  const requestRef = doc(db, "event_requests", requestId);
  const snap = await getDoc(requestRef);
  if (!snap.exists()) {
    throw new Error("Request not found");
  }

  const current = snap.data();

  // Verification: student can only edit Draft or Returned for Correction
  if (current.status !== "Draft" && current.status !== "Returned for Correction") {
    throw new Error(`Cannot edit request with status '${current.status}'. Only 'Draft' or 'Returned for Correction' requests can be edited.`);
  }

  if (current.studentRollNumber !== userProfile.rollNumber) {
    throw new Error("Unauthorized: You can only edit your own request");
  }

  const errors = validateRequestForm({ ...current, ...updates });
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join("; ")}`);
  }

  // Re-check overlaps if dates changed
  const sDate = updates.startDate || current.startDate;
  const eDate = updates.endDate || current.endDate;
  const overlaps = await detectDateOverlaps(current.studentRollNumber, sDate, eDate, requestId);

  const newStatus = updates.submitAgain ? "Submitted" : current.status;

  const payload = {
    ...updates,
    startDate: sDate,
    endDate: eDate,
    hasOverlappingEvents: overlaps.length > 0,
    overlappingEventIds: overlaps.map(o => o.referenceNumber),
    overlapDetails: overlaps,
    status: newStatus,
    updatedAt: serverTimestamp()
  };

  delete payload.submitAgain;

  await updateDoc(requestRef, payload);

  // History entry
  const historyRef = doc(collection(requestRef, "history"));
  await setDoc(historyRef, {
    action: updates.submitAgain ? "RESUBMITTED" : "EDITED",
    fromStatus: current.status,
    toStatus: newStatus,
    performedBy: userProfile.id || userProfile.uid,
    performedByName: userProfile.name,
    performedByRole: "student",
    remarks: updates.submitAgain ? "Resubmitted after correction" : "Request updated by student",
    timestamp: serverTimestamp()
  });

  return { id: requestId, status: newStatus };
}

/**
 * Student withdraws request
 */
export async function withdrawEventRequest(requestId, userProfile, remarks = "Withdrawn by student") {
  const requestRef = doc(db, "event_requests", requestId);
  const snap = await getDoc(requestRef);
  if (!snap.exists()) throw new Error("Request not found");

  const current = snap.data();
  if (current.studentRollNumber !== userProfile.rollNumber) {
    throw new Error("Unauthorized to withdraw this request");
  }

  if (["Approved", "Rejected", "Withdrawn"].includes(current.status)) {
    throw new Error(`Cannot withdraw request that is already ${current.status}`);
  }

  await updateDoc(requestRef, {
    status: "Withdrawn",
    updatedAt: serverTimestamp()
  });

  const historyRef = doc(collection(requestRef, "history"));
  await setDoc(historyRef, {
    action: "WITHDRAWN",
    fromStatus: current.status,
    toStatus: "Withdrawn",
    performedBy: userProfile.id || userProfile.uid,
    performedByName: userProfile.name,
    performedByRole: "student",
    remarks,
    timestamp: serverTimestamp()
  });

  return { id: requestId, status: "Withdrawn" };
}

/**
 * Fetch a single request with its full audit trail history
 */
export async function getRequestWithHistory(requestId) {
  const requestRef = doc(db, "event_requests", requestId);
  const snap = await getDoc(requestRef);
  if (!snap.exists()) return null;

  const reqData = { id: snap.id, ...snap.data() };

  // Fetch history subcollection
  const histSnap = await getDocs(
    query(collection(requestRef, "history"), orderBy("timestamp", "asc"))
  );
  reqData.history = histSnap.docs.map(h => ({ id: h.id, ...h.data() }));

  return reqData;
}
