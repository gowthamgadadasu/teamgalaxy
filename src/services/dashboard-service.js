// src/services/dashboard-service.js
import {
  collection,
  query,
  where,
  getDocs,
  orderBy
} from "firebase/firestore";
import { db } from "../firebase-config.js";
import { evaluateAttendanceEligibility, getLatestAttendanceImport } from "./attendance-service.js";
import { getAssignedStudentsForProctor } from "./auth-service.js";

/**
 * Student Dashboard Data
 */
export async function getStudentDashboardData(rollNumber, studentUid) {
  // 1. Current attendance metrics
  const attendance = await evaluateAttendanceEligibility(rollNumber);

  // 2. Fetch student requests
  const q = query(
    collection(db, "event_requests"),
    where("studentRollNumber", "==", rollNumber)
  );
  const snap = await getDocs(q);
  const requests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const pendingProctor = requests.filter(r => r.status === "Submitted" || r.status === "Under Proctor Review");
  const pendingFinal = requests.filter(r => r.status === "Recommended for Approval" || r.status === "Recommended for Rejection" || r.status === "Pending Final Decision");
  const approved = requests.filter(r => r.status === "Approved");
  const rejected = requests.filter(r => r.status === "Rejected");
  const returned = requests.filter(r => r.status === "Returned for Correction");

  return {
    rollNumber,
    attendance,
    totalRequests: requests.length,
    requests,
    pendingProctor,
    pendingFinal,
    approved,
    rejected,
    returned
  };
}

/**
 * Proctor Dashboard Data
 */
export async function getProctorDashboardData(proctorId, filters = {}) {
  // 1. Assigned students
  const assignedStudents = await getAssignedStudentsForProctor(proctorId);
  const studentRolls = assignedStudents.map(s => s.rollNumber).filter(Boolean);

  // 2. Event requests for this proctor
  const q = query(
    collection(db, "event_requests"),
    where("proctorId", "==", proctorId)
  );
  const snap = await getDocs(q);
  let requests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Apply filters if provided
  if (filters.department) {
    requests = requests.filter(r => r.department === filters.department);
  }
  if (filters.section) {
    requests = requests.filter(r => r.yearSection === filters.section);
  }
  if (filters.status) {
    requests = requests.filter(r => r.status === filters.status);
  }
  if (filters.studentRollNumber) {
    requests = requests.filter(r => r.studentRollNumber === filters.studentRollNumber);
  }

  const pendingReviews = requests.filter(r => r.status === "Submitted" || r.status === "Under Proctor Review");
  const awaitingClarification = requests.filter(r => r.status === "Returned for Correction");
  const attendanceIneligible = requests.filter(r => r.attendanceSnapshot?.eligibilityStatus !== "ELIGIBLE");
  const recentlyReviewed = requests.filter(r => r.proctorReviewedAt !== null);

  return {
    proctorId,
    totalAssignedStudents: assignedStudents.length,
    assignedStudents,
    totalRequests: requests.length,
    pendingReviews,
    awaitingClarification,
    attendanceIneligible,
    recentlyReviewed,
    allRequests: requests
  };
}

/**
 * Technical-Event In-Charge Dashboard Data
 */
export async function getInchargeDashboardData(filters = {}) {
  // 1. All requests
  const snap = await getDocs(collection(db, "event_requests"));
  let requests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // 2. All attendance records
  const attSnap = await getDocs(collection(db, "student_attendance"));
  const attendanceList = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // 3. Latest import info
  const latestImport = await getLatestAttendanceImport();

  // Compute eligibility distribution
  const eligibilityCounts = {
    ELIGIBLE: 0,
    INELIGIBLE: 0,
    STALE: 0,
    UNAVAILABLE: 0
  };

  attendanceList.forEach(a => {
    if (a.isUnavailable || a.classesConducted === 0 || a.attendancePercentage === null) {
      eligibilityCounts.UNAVAILABLE++;
    } else if (a.isDataStale) {
      eligibilityCounts.STALE++;
    } else if (a.attendancePercentage >= 75) {
      eligibilityCounts.ELIGIBLE++;
    } else {
      eligibilityCounts.INELIGIBLE++;
    }
  });

  // Department-wise stats
  const departmentStats = {};
  requests.forEach(r => {
    const dept = r.department || "Other";
    if (!departmentStats[dept]) {
      departmentStats[dept] = { total: 0, approved: 0, rejected: 0, pending: 0 };
    }
    departmentStats[dept].total++;
    if (r.status === "Approved") departmentStats[dept].approved++;
    else if (r.status === "Rejected") departmentStats[dept].rejected++;
    else departmentStats[dept].pending++;
  });

  // Apply filters
  let filteredRequests = [...requests];
  if (filters.department) {
    filteredRequests = filteredRequests.filter(r => r.department === filters.department);
  }
  if (filters.yearSection) {
    filteredRequests = filteredRequests.filter(r => r.yearSection === filters.yearSection);
  }
  if (filters.rollNumber) {
    filteredRequests = filteredRequests.filter(r => r.studentRollNumber === filters.rollNumber.toUpperCase());
  }
  if (filters.status) {
    filteredRequests = filteredRequests.filter(r => r.status === filters.status);
  }
  if (filters.category) {
    filteredRequests = filteredRequests.filter(r => r.category === filters.category);
  }
  if (filters.proctorId) {
    filteredRequests = filteredRequests.filter(r => r.proctorId === filters.proctorId);
  }
  if (filters.minAttendance !== undefined && filters.maxAttendance !== undefined) {
    filteredRequests = filteredRequests.filter(r => {
      const pct = r.attendanceSnapshot?.attendancePercentage;
      return pct !== null && pct >= filters.minAttendance && pct <= filters.maxAttendance;
    });
  }

  const pendingProctor = requests.filter(r => r.status === "Submitted" || r.status === "Under Proctor Review");
  const pendingFinal = requests.filter(r => r.status === "Recommended for Approval" || r.status === "Recommended for Rejection" || r.status === "Pending Final Decision");
  const approved = requests.filter(r => r.status === "Approved");
  const rejected = requests.filter(r => r.status === "Rejected");
  const flaggedAttendance = requests.filter(r => r.attendanceSnapshot?.eligibilityStatus !== "ELIGIBLE");

  return {
    totalRequests: requests.length,
    pendingProctorCount: pendingProctor.length,
    pendingFinalCount: pendingFinal.length,
    approvedCount: approved.length,
    rejectedCount: rejected.length,
    flaggedAttendanceCount: flaggedAttendance.length,
    latestImport,
    eligibilityDistribution: eligibilityCounts,
    departmentStats,
    filteredRequests,
    requests
  };
}

/**
 * Module 6: Export Attendance Eligibility CSV Report
 */
export async function exportAttendanceReportCSV() {
  const snap = await getDocs(collection(db, "student_attendance"));
  const records = snap.docs.map(d => d.data());

  const headers = ["Roll Number", "Student Name", "Department", "Year / Section", "Conducted", "Attended", "Attendance %", "Eligibility", "Data As Of"];
  const rows = records.map(r => [
    `"${r.rollNumber || ""}"`,
    `"${r.studentName || ""}"`,
    `"${r.department || ""}"`,
    `"${r.yearSection || ""}"`,
    r.classesConducted ?? "N/A",
    r.classesAttended ?? "N/A",
    r.attendancePercentage !== null ? `${r.attendancePercentage}%` : "Unavailable",
    r.attendancePercentage >= 75 ? "ELIGIBLE" : (r.attendancePercentage === null ? "UNAVAILABLE" : "INELIGIBLE"),
    `"${r.dataAsOf || ""}"`
  ]);

  return [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
}

/**
 * Module 6: Export Event Approvals CSV Report
 */
export async function exportRequestsReportCSV() {
  const snap = await getDocs(collection(db, "event_requests"));
  const records = snap.docs.map(d => d.data());

  const headers = [
    "Reference Number",
    "Roll Number",
    "Student Name",
    "Department",
    "Event Title",
    "Organizer",
    "Category",
    "Start Date",
    "End Date",
    "Attendance %",
    "Status",
    "Proctor Recommendation",
    "Final Decision",
    "Remarks",
    "Override"
  ];

  const rows = records.map(r => [
    `"${r.referenceNumber || ""}"`,
    `"${r.studentRollNumber || ""}"`,
    `"${r.studentName || ""}"`,
    `"${r.department || ""}"`,
    `"${r.eventTitle || ""}"`,
    `"${r.organizer || ""}"`,
    `"${r.category || ""}"`,
    `"${r.startDate || ""}"`,
    `"${r.endDate || ""}"`,
    r.attendanceSnapshot?.attendancePercentage !== null ? `${r.attendanceSnapshot?.attendancePercentage}%` : "Unavailable",
    `"${r.status || ""}"`,
    `"${r.proctorRecommendation || ""}"`,
    `"${r.finalDecision || ""}"`,
    `"${(r.finalDecisionRemarks || r.proctorRemarks || "").replace(/"/g, '""')}"`,
    r.hasAttendanceOverride ? "YES" : "NO"
  ]);

  return [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
}
