// src/services/attendance-service.js
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "../firebase-config.js";
import { getAttendanceRules } from "./config-service.js";
import { getUsersByRole, ROLES } from "./auth-service.js";

/**
 * Expected columns in CSV/Excel attendance file
 */
export const REQUIRED_COLUMNS = [
  "Roll Number",
  "Student Name",
  "Department",
  "Year / Section",
  "Classes Conducted",
  "Classes Attended"
];

/**
 * Parses raw CSV text into array of object rows
 */
export function parseCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    // Handle basic comma separation with potential quotes
    const values = [];
    let current = "";
    let insideQuotes = false;

    for (let char of lines[i]) {
      if (char === '"' || char === "'") {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        values.push(current.trim().replace(/^["']|["']$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^["']|["']$/g, ""));

    const rowObj = {};
    headers.forEach((header, idx) => {
      rowObj[header] = values[idx] !== undefined ? values[idx] : "";
    });
    rows.push({ rowIndex: i + 1, raw: rowObj });
  }

  return { headers, rows };
}

/**
 * Module 1: Validate rows and generate preview summary before committing import
 */
export async function validateAttendancePreview(parsedRows, existingStudents = null) {
  if (!existingStudents) {
    existingStudents = await getUsersByRole(ROLES.STUDENT);
  }

  const studentMap = new Map();
  existingStudents.forEach(s => {
    if (s.rollNumber) {
      studentMap.set(s.rollNumber.trim().toUpperCase(), s);
    }
  });

  const seenRollNumbers = new Set();
  const validRecords = [];
  const invalidRecords = [];
  const duplicates = [];
  const unmatched = [];

  for (const item of parsedRows) {
    const row = item.raw;
    const rowIndex = item.rowIndex;
    const rollNumber = (row["Roll Number"] || row["RollNo"] || row["rollNumber"] || "").trim().toUpperCase();
    const studentName = (row["Student Name"] || row["Name"] || "").trim();
    const department = (row["Department"] || row["Dept"] || "").trim();
    const yearSection = (row["Year / Section"] || row["Section"] || "").trim();
    const conductedRaw = row["Classes Conducted"] || row["conducted"];
    const attendedRaw = row["Classes Attended"] || row["attended"];
    const providedPercentRaw = row["Attendance Percentage"] || row["percentage"];
    const dataAsOfRaw = row["Data As Of"] || row["dataAsOf"] || new Date().toISOString().split("T")[0];

    const errors = [];

    if (!rollNumber) {
      errors.push("Missing Roll Number");
    }

    const conducted = Number(conductedRaw);
    const attended = Number(attendedRaw);

    if (isNaN(conducted) || conducted < 0) {
      errors.push(`Invalid Classes Conducted count: '${conductedRaw}'`);
    }

    if (isNaN(attended) || attended < 0) {
      errors.push(`Invalid Classes Attended count: '${attendedRaw}'`);
    }

    if (!isNaN(conducted) && !isNaN(attended) && attended > conducted) {
      errors.push(`Classes Attended (${attended}) cannot exceed Classes Conducted (${conducted})`);
    }

    // Duplicate check in same upload file
    if (rollNumber) {
      if (seenRollNumbers.has(rollNumber)) {
        errors.push(`Duplicate roll number '${rollNumber}' in uploaded dataset`);
        duplicates.push({ rowIndex, rollNumber });
      } else {
        seenRollNumbers.add(rollNumber);
      }
    }

    // Match with registered students
    const matchedStudent = rollNumber ? studentMap.get(rollNumber) : null;
    if (rollNumber && !matchedStudent) {
      unmatched.push({ rowIndex, rollNumber, studentName });
      // We can allow or flag unmatched. The spec requires: "Show number of valid rows, invalid rows, unmatched students, and duplicate records"
    }

    // Percentage calculation
    let calculatedPercentage = null;
    if (!isNaN(conducted) && !isNaN(attended)) {
      if (conducted === 0) {
        calculatedPercentage = null; // Unavailable
      } else {
        calculatedPercentage = Number(((attended / conducted) * 100).toFixed(2));
      }
    }

    // Consistency check if supplied percentage is provided
    if (providedPercentRaw && calculatedPercentage !== null) {
      const cleanedPercent = parseFloat(providedPercentRaw.toString().replace("%", ""));
      if (!isNaN(cleanedPercent) && Math.abs(cleanedPercent - calculatedPercentage) > 0.5) {
        errors.push(`Supplied percentage (${cleanedPercent}%) does not match calculated percentage (${calculatedPercentage}%)`);
      }
    }

    if (errors.length > 0) {
      invalidRecords.push({
        rowIndex,
        rollNumber,
        studentName,
        errors,
        raw: row
      });
    } else {
      validRecords.push({
        rowIndex,
        rollNumber,
        studentName: matchedStudent?.name || studentName,
        studentUid: matchedStudent?.id || null,
        department: matchedStudent?.department || department,
        yearSection: matchedStudent?.yearSection || yearSection,
        classesConducted: conducted,
        classesAttended: attended,
        attendancePercentage: calculatedPercentage,
        dataAsOf: dataAsOfRaw,
        matched: !!matchedStudent
      });
    }
  }

  return {
    totalRows: parsedRows.length,
    validRowsCount: validRecords.length,
    invalidRowsCount: invalidRecords.length,
    unmatchedCount: unmatched.length,
    duplicateCount: duplicates.length,
    validRecords,
    invalidRecords,
    unmatched,
    duplicates,
    canCommit: invalidRecords.length === 0
  };
}

/**
 * Module 1: Commit validated attendance records atomically to Firestore
 */
export async function commitAttendanceImport({
  fileName,
  validRecords,
  importedByUid,
  importedByName,
  dataAsOf
}) {
  const batch = writeBatch(db);

  // 1. Create attendance import record
  const importRef = doc(collection(db, "attendance_imports"));
  const importData = {
    importId: importRef.id,
    fileName: fileName || "attendance_upload.csv",
    importedBy: importedByName || importedByUid || "Technical In-Charge",
    importedByUid: importedByUid || "incharge",
    importedAt: serverTimestamp(),
    dataAsOf: dataAsOf || new Date().toISOString(),
    totalRows: validRecords.length,
    validRows: validRecords.length,
    invalidRows: 0,
    status: "COMPLETED"
  };
  batch.set(importRef, importData);

  // 2. Write each student's current attendance record
  const now = new Date();
  for (const record of validRecords) {
    const studentAttendanceRef = doc(db, "student_attendance", record.rollNumber);
    const attendancePayload = {
      rollNumber: record.rollNumber,
      studentUid: record.studentUid,
      studentName: record.studentName,
      department: record.department,
      yearSection: record.yearSection,
      classesConducted: record.classesConducted,
      classesAttended: record.classesAttended,
      attendancePercentage: record.attendancePercentage,
      dataAsOf: record.dataAsOf,
      importId: importRef.id,
      isUnavailable: record.classesConducted === 0 || record.attendancePercentage === null,
      updatedAt: serverTimestamp()
    };
    batch.set(studentAttendanceRef, attendancePayload);
  }

  // Atomic commit ensures that a failed upload does not corrupt the previously valid dataset
  await batch.commit();

  return {
    importId: importRef.id,
    importedCount: validRecords.length,
    status: "SUCCESS"
  };
}

/**
 * Module 1: Get most recent successful import metadata
 */
export async function getLatestAttendanceImport() {
  const q = query(
    collection(db, "attendance_imports"),
    where("status", "==", "COMPLETED"),
    orderBy("importedAt", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/**
 * Module 1: Get import history audit trail
 */
export async function getAttendanceImportHistory(maxCount = 20) {
  const q = query(
    collection(db, "attendance_imports"),
    orderBy("importedAt", "desc"),
    limit(maxCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Module 2: Fetch student attendance by roll number
 */
export async function getStudentAttendance(rollNumber) {
  if (!rollNumber) return null;
  const normalized = rollNumber.trim().toUpperCase();
  const docRef = doc(db, "student_attendance", normalized);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snap.data();
}

/**
 * Module 2: Calculate Attendance Eligibility based on most recent accepted dataset
 */
export async function evaluateAttendanceEligibility(rollNumber, customThreshold = null) {
  const rules = await getAttendanceRules();
  const threshold = customThreshold !== null ? customThreshold : rules.minAttendanceThreshold;
  const staleDaysLimit = rules.staleThresholdDays || 30;

  const attendance = await getStudentAttendance(rollNumber);

  // If missing attendance record
  if (!attendance) {
    return {
      rollNumber,
      attendancePercentage: null,
      requiredThreshold: threshold,
      eligibilityStatus: "UNAVAILABLE",
      isEligible: false,
      isDataStale: false,
      dataAsOf: null,
      reason: "Attendance record is missing from system dataset"
    };
  }

  // If classes conducted is zero
  if (attendance.classesConducted === 0 || attendance.attendancePercentage === null) {
    return {
      rollNumber,
      classesConducted: 0,
      classesAttended: 0,
      attendancePercentage: null,
      requiredThreshold: threshold,
      eligibilityStatus: "UNAVAILABLE",
      isEligible: false,
      isDataStale: false,
      dataAsOf: attendance.dataAsOf,
      reason: "No classes conducted yet (Attendance is Unavailable)"
    };
  }

  // Check freshness
  let isDataStale = false;
  if (attendance.dataAsOf) {
    const dataDate = new Date(attendance.dataAsOf);
    const currentDate = new Date();
    const diffDays = Math.floor((currentDate - dataDate) / (1000 * 60 * 60 * 24));
    if (diffDays > staleDaysLimit) {
      isDataStale = true;
    }
  }

  const percentage = attendance.attendancePercentage;
  const meetsThreshold = percentage >= threshold;

  let eligibilityStatus = meetsThreshold ? "ELIGIBLE" : "INELIGIBLE";
  let reason = "";

  if (isDataStale) {
    eligibilityStatus = "STALE";
    reason = `Attendance data is older than ${staleDaysLimit} days. Verification required.`;
  } else if (!meetsThreshold) {
    reason = `Attendance (${percentage}%) is below university threshold of ${threshold}%.`;
  } else {
    reason = `Attendance (${percentage}%) meets requirement of ≥${threshold}%.`;
  }

  return {
    rollNumber,
    classesConducted: attendance.classesConducted,
    classesAttended: attendance.classesAttended,
    attendancePercentage: percentage,
    requiredThreshold: threshold,
    eligibilityStatus,
    isEligible: meetsThreshold && !isDataStale,
    isDataStale,
    dataAsOf: attendance.dataAsOf,
    reason
  };
}
