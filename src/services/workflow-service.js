// src/services/workflow-service.js
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase-config.js";
import { ROLES } from "./auth-service.js";

export const WORKFLOW_STATUSES = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_PROCTOR_REVIEW: "Under Proctor Review",
  RETURNED_FOR_CORRECTION: "Returned for Correction",
  RECOMMENDED_FOR_APPROVAL: "Recommended for Approval",
  RECOMMENDED_FOR_REJECTION: "Recommended for Rejection",
  PENDING_FINAL_DECISION: "Pending Final Decision",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn"
};

/**
 * Proctor Review Action
 * Allowed recommendations:
 * - "RECOMMEND_APPROVAL" -> moves to "Recommended for Approval"
 * - "RECOMMEND_REJECTION" -> moves to "Recommended for Rejection"
 * - "RETURN_FOR_CORRECTION" -> moves to "Returned for Correction"
 */
export async function submitProctorReview({
  requestId,
  proctorUser,
  recommendation,
  remarks
}) {
  if (!proctorUser || proctorUser.role !== ROLES.PROCTOR) {
    throw new Error("Unauthorized: Only assigned proctors can review requests");
  }

  const requestRef = doc(db, "event_requests", requestId);
  const snap = await getDoc(requestRef);
  if (!snap.exists()) {
    throw new Error("Request not found");
  }

  const req = snap.data();

  // Acceptance test: A proctor cannot review requests belonging to another proctor's students
  if (req.proctorId && req.proctorId !== (proctorUser.id || proctorUser.uid)) {
    throw new Error(`Unauthorized: This request belongs to a student assigned to another proctor (${req.proctorId})`);
  }

  // Acceptance test: A proctor cannot issue the final decision
  if (recommendation === "APPROVE" || recommendation === "REJECT") {
    throw new Error("Permission Denied: A proctor cannot issue the final decision. Proctors can only recommend approval/rejection or return for correction.");
  }

  let nextStatus = "";
  if (recommendation === "RECOMMEND_APPROVAL") {
    nextStatus = WORKFLOW_STATUSES.RECOMMENDED_FOR_APPROVAL;
  } else if (recommendation === "RECOMMEND_REJECTION") {
    nextStatus = WORKFLOW_STATUSES.RECOMMENDED_FOR_REJECTION;
  } else if (recommendation === "RETURN_FOR_CORRECTION") {
    nextStatus = WORKFLOW_STATUSES.RETURNED_FOR_CORRECTION;
  } else {
    throw new Error(`Invalid recommendation '${recommendation}'. Must be RECOMMEND_APPROVAL, RECOMMEND_REJECTION, or RETURN_FOR_CORRECTION.`);
  }

  if (!remarks || remarks.trim().length === 0) {
    throw new Error("Remarks are mandatory when submitting proctor review");
  }

  const updateData = {
    status: nextStatus,
    proctorRecommendation: recommendation,
    proctorRemarks: remarks.trim(),
    proctorReviewedAt: serverTimestamp(),
    proctorReviewedBy: proctorUser.name || proctorUser.id,
    updatedAt: serverTimestamp()
  };

  await updateDoc(requestRef, updateData);

  // Record audit history
  const historyRef = doc(collection(requestRef, "history"));
  await setDoc(historyRef, {
    action: `PROCTOR_${recommendation}`,
    fromStatus: req.status,
    toStatus: nextStatus,
    performedBy: proctorUser.id || proctorUser.uid,
    performedByName: proctorUser.name,
    performedByRole: ROLES.PROCTOR,
    remarks: remarks.trim(),
    timestamp: serverTimestamp()
  });

  return { id: requestId, status: nextStatus, recommendation };
}

/**
 * Technical-Event In-Charge Final Decision
 * Actions:
 * - "APPROVE" -> moves to "Approved"
 * - "REJECT" -> moves to "Rejected"
 * - "RETURN_FOR_CORRECTION" -> moves to "Returned for Correction"
 */
export async function submitInchargeDecision({
  requestId,
  inchargeUser,
  decision, // "APPROVE" | "REJECT" | "RETURN_FOR_CORRECTION"
  remarks,
  isOverride = false,
  overrideReason = ""
}) {
  if (!inchargeUser || inchargeUser.role !== ROLES.INCHARGE) {
    throw new Error("Unauthorized: Only the Technical-Event In-Charge can make final decisions");
  }

  const requestRef = doc(db, "event_requests", requestId);
  const snap = await getDoc(requestRef);
  if (!snap.exists()) {
    throw new Error("Request not found");
  }

  const req = snap.data();

  if (!remarks || remarks.trim().length === 0) {
    throw new Error("Remarks are required for final decisions");
  }

  let nextStatus = "";
  if (decision === "APPROVE") {
    nextStatus = WORKFLOW_STATUSES.APPROVED;

    // Check attendance eligibility
    const isEligible = req.attendanceSnapshot?.eligibilityStatus === "ELIGIBLE";
    if (!isEligible && !isOverride) {
      throw new Error(
        `Cannot approve request without explicit override: Student attendance is '${req.attendanceSnapshot?.eligibilityStatus}' (${req.attendanceSnapshot?.reason})`
      );
    }
  } else if (decision === "REJECT") {
    nextStatus = WORKFLOW_STATUSES.REJECTED;
  } else if (decision === "RETURN_FOR_CORRECTION") {
    nextStatus = WORKFLOW_STATUSES.RETURNED_FOR_CORRECTION;
  } else {
    throw new Error(`Invalid decision '${decision}'. Must be APPROVE, REJECT, or RETURN_FOR_CORRECTION.`);
  }

  if (isOverride && (!overrideReason || overrideReason.trim().length === 0)) {
    throw new Error("An explicit override reason must be recorded for exceptional approvals");
  }

  const updateData = {
    status: nextStatus,
    finalDecision: decision,
    finalDecisionRemarks: remarks.trim(),
    finalDecidedBy: inchargeUser.name || inchargeUser.id || "Technical In-Charge",
    finalDecidedByUid: inchargeUser.id || inchargeUser.uid,
    finalDecidedAt: serverTimestamp(),
    hasAttendanceOverride: !!isOverride,
    overrideReason: isOverride ? overrideReason.trim() : "",
    updatedAt: serverTimestamp()
  };

  await updateDoc(requestRef, updateData);

  // Preserve audit trail in history
  const historyRef = doc(collection(requestRef, "history"));
  await setDoc(historyRef, {
    action: `FINAL_${decision}`,
    fromStatus: req.status,
    toStatus: nextStatus,
    performedBy: inchargeUser.id || inchargeUser.uid,
    performedByName: inchargeUser.name || "In-Charge",
    performedByRole: ROLES.INCHARGE,
    remarks: remarks.trim(),
    isOverride: !!isOverride,
    overrideReason: isOverride ? overrideReason.trim() : null,
    proctorRecommendationAtDecision: req.proctorRecommendation || null,
    proctorRemarksAtDecision: req.proctorRemarks || null,
    timestamp: serverTimestamp()
  });

  return { id: requestId, status: nextStatus, decision, isOverride };
}
