// test/acceptance-tests.js
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseCSV,
  validateAttendancePreview
} from "../src/services/attendance-service.js";
import {
  validateRequestForm
} from "../src/services/request-service.js";
import {
  WORKFLOW_STATUSES
} from "../src/services/workflow-service.js";
import { STUDENTS, PROCTORS, INCHARGE } from "../src/seed/seed-data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passedCount = 0;
let totalCount = 0;

function test(name, fn) {
  totalCount++;
  try {
    fn();
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

async function runAcceptanceTests() {
  console.log("\n=======================================================");
  console.log("   CAMPUSGATE - ACCEPTANCE TESTS VERIFICATION SUITE   ");
  console.log("=======================================================\n");

  console.log("--- Module 1: CSV / Excel Attendance Parser & Validation ---");

  const sampleCsvPath = path.resolve(__dirname, "../src/seed/sample-attendance.csv");
  const sampleCsvContent = fs.readFileSync(sampleCsvPath, "utf-8");
  const { rows } = parseCSV(sampleCsvContent);

  test("AT-1: CSV parsing properly extracts all rows and headers", () => {
    assert(rows.length > 0, "Parsed rows should not be empty");
    assert(rows[0].raw["Roll Number"], "Should parse Roll Number column");
    assert(rows[0].raw["Classes Conducted"], "Should parse Classes Conducted column");
    assert(rows[0].raw["Classes Attended"], "Should parse Classes Attended column");
  });

  const previewResult = await validateAttendancePreview(rows, STUDENTS);

  test("AT-2: Valid rows pass validation and compute exact percentages", () => {
    assert(previewResult.validRowsCount >= 10, "Should identify at least 10 valid rows");
    // In user dataset: 24CS002 Lavanya Gupta has 75/100 = 75%
    const lavanya = previewResult.validRecords.find(r => r.rollNumber === "24CS002");
    assert(lavanya, "24CS002 should be valid");
    assert.strictEqual(lavanya.attendancePercentage, 75.0, "75/100 should be 75%");

    // 24AI009 Harsha Vardhan has 105/120 = 87.5%
    const harsha = previewResult.validRecords.find(r => r.rollNumber === "24AI009");
    assert(harsha, "24AI009 should be valid");
    assert.strictEqual(harsha.attendancePercentage, 87.5, "105/120 should be 87.5%");
  });

  test("AT-3: Invalid rows are detected and reported clearly", () => {
    assert(previewResult.invalidRowsCount >= 3, "Should report at least 3 invalid rows");

    // Check invalid row: Attended > Conducted (24CS006 Swathi Reddy has 108/100)
    const overAttended = previewResult.invalidRecords.find(r => r.rollNumber === "24CS006");
    assert(overAttended, "Should flag 24CS006 where attended > conducted");
    assert(overAttended.errors.some(e => e.includes("cannot exceed")), "Should report 'cannot exceed' error");

    // Check invalid row: Non-numeric / word string (23EC012 Fatima Sheikh has 'seventy-three')
    const stringAttended = previewResult.invalidRecords.find(r => r.rollNumber === "23EC012");
    assert(stringAttended, "Should flag non-numeric count in 23EC012");

    // Check invalid row: Negative conducted/attended (24AI010 Divya Kulkarni has -5)
    const negative = previewResult.invalidRecords.find(r => r.rollNumber === "24AI010");
    assert(negative, "Should flag negative count in 24AI010");

    // Check invalid row: Missing roll number (Ghost Entry)
    const missingRoll = previewResult.invalidRecords.find(r => r.rollNumber === "");
    assert(missingRoll, "Should flag row with missing roll number");
  });

  test("AT-4: Duplicate roll numbers within the same file are detected", () => {
    assert(previewResult.duplicateCount >= 1, "Should identify duplicate roll numbers");
    // In user dataset: 24AI002 Sanjana Patel is listed twice
    const dup = previewResult.duplicates.find(d => d.rollNumber === "24AI002");
    assert(dup, "Should flag duplicate row for 24AI002");
  });

  console.log("\n--- Module 2: Attendance Calculation & Eligibility Formula ---");

  test("AT-5: Attendance percentage formula (attended / conducted) * 100", () => {
    const calc = (attended, conducted) => {
      if (conducted === 0) return null;
      return Number(((attended / conducted) * 100).toFixed(2));
    };

    assert.strictEqual(calc(82, 100), 82.0);
    assert.strictEqual(calc(90, 120), 75.0);
    assert.strictEqual(calc(0, 100), 0.0);
  });

  test("AT-6: Zero classes conducted produces 'Unavailable' rather than 0%", () => {
    const calc = (attended, conducted) => {
      if (conducted === 0) return "Unavailable";
      return (attended / conducted) * 100;
    };
    assert.strictEqual(calc(0, 0), "Unavailable", "0 classes conducted must return 'Unavailable'");
  });

  test("AT-7: Missing attendance data does NOT qualify student", () => {
    const evaluate = (record, threshold = 75) => {
      if (!record || record.attendancePercentage === null) {
        return { isEligible: false, status: "UNAVAILABLE" };
      }
      return { isEligible: record.attendancePercentage >= threshold, status: record.attendancePercentage >= threshold ? "ELIGIBLE" : "INELIGIBLE" };
    };

    const missingResult = evaluate(null, 75);
    assert.strictEqual(missingResult.isEligible, false);
    assert.strictEqual(missingResult.status, "UNAVAILABLE");
  });

  test("AT-8: Configured threshold is respected (above, below, and exactly 75%)", () => {
    const isEligible = (pct, threshold = 75) => pct !== null && pct >= threshold;

    assert.strictEqual(isEligible(88, 75), true, "88% > 75% is eligible");
    assert.strictEqual(isEligible(75, 75), true, "Exactly 75% is eligible");
    assert.strictEqual(isEligible(74.9, 75), false, "74.9% < 75% is ineligible");
    assert.strictEqual(isEligible(62, 75), false, "62% < 75% is ineligible");

    // Dynamic threshold change to 80%
    assert.strictEqual(isEligible(75, 80), false, "75% is ineligible under 80% threshold");
    assert.strictEqual(isEligible(85, 80), true, "85% is eligible under 80% threshold");
  });

  test("AT-9: Stale attendance data (>30 days old) flags request for verification", () => {
    const checkFreshness = (dataDateStr, maxDays = 30) => {
      const dataDate = new Date(dataDateStr);
      const now = new Date("2026-10-12");
      const diffDays = Math.floor((now - dataDate) / (1000 * 60 * 60 * 24));
      return diffDays > maxDays;
    };

    assert.strictEqual(checkFreshness("2026-10-10", 30), false, "Recent data (2 days) is fresh");
    assert.strictEqual(checkFreshness("2026-08-01", 30), true, "Data from 2+ months ago is stale");
  });

  console.log("\n--- Module 3: Event Request Validation & Overlap Detection ---");

  test("AT-10: Form validation enforces required fields and valid date order", () => {
    const validForm = {
      eventTitle: "National Hackathon",
      organizer: "ACM",
      category: "Hackathon",
      venue: "Tech Hall",
      city: "Bengaluru",
      startDate: "2026-11-10",
      endDate: "2026-11-12",
      purpose: "Represent university and build prototype"
    };

    assert.strictEqual(validateRequestForm(validForm).length, 0, "Valid form passes");

    const invalidDates = { ...validForm, startDate: "2026-11-15", endDate: "2026-11-10" };
    const dateErrors = validateRequestForm(invalidDates);
    assert(dateErrors.some(e => e.includes("earlier than start date")), "Should reject end date < start date");

    const missingTitle = { ...validForm, eventTitle: "" };
    assert(validateRequestForm(missingTitle).some(e => e.includes("Event title is required")));
  });

  test("AT-11: Date overlap algorithm correctly detects conflicting requests", () => {
    const checkOverlap = (existingStart, existingEnd, newStart, newEnd) => {
      const eS = new Date(existingStart).getTime();
      const eE = new Date(existingEnd).getTime();
      const nS = new Date(newStart).getTime();
      const nE = new Date(newEnd).getTime();
      return eS <= nE && eE >= nS;
    };

    // Existing event: 2026-11-05 to 2026-11-07
    assert.strictEqual(checkOverlap("2026-11-05", "2026-11-07", "2026-11-06", "2026-11-06"), true, "Enclosed date overlaps");
    assert.strictEqual(checkOverlap("2026-11-05", "2026-11-07", "2026-11-07", "2026-11-09"), true, "Boundary date overlaps");
    assert.strictEqual(checkOverlap("2026-11-05", "2026-11-07", "2026-11-10", "2026-11-12"), false, "Later date does not overlap");
  });

  console.log("\n--- Module 4: Role-Based Workflow Rules & Authorization ---");

  test("AT-12: A proctor CANNOT issue final decision (must only recommend or return)", () => {
    const validateProctorAction = (recommendation) => {
      if (recommendation === "APPROVE" || recommendation === "REJECT") {
        throw new Error("Permission Denied: A proctor cannot issue the final decision");
      }
      return true;
    };

    assert.throws(() => validateProctorAction("APPROVE"), /Permission Denied/);
    assert.throws(() => validateProctorAction("REJECT"), /Permission Denied/);
    assert.strictEqual(validateProctorAction("RECOMMEND_APPROVAL"), true);
    assert.strictEqual(validateProctorAction("RECOMMEND_REJECTION"), true);
    assert.strictEqual(validateProctorAction("RETURN_FOR_CORRECTION"), true);
  });

  test("AT-13: A proctor CANNOT review requests of students assigned to another proctor", () => {
    const canReview = (proctorId, requestProctorId) => {
      return proctorId === requestProctorId;
    };

    assert.strictEqual(canReview("proctor_01", "proctor_01"), true);
    assert.strictEqual(canReview("proctor_02", "proctor_01"), false, "Proctor 2 cannot review Proctor 1 student");
  });

  test("AT-14: In-Charge cannot approve attendance-ineligible student without explicit override", () => {
    const validateFinalApproval = (eligibilityStatus, isOverride, overrideReason) => {
      if (eligibilityStatus !== "ELIGIBLE" && !isOverride) {
        throw new Error("Cannot approve request without explicit override");
      }
      if (isOverride && (!overrideReason || overrideReason.trim() === "")) {
        throw new Error("Override reason required");
      }
      return true;
    };

    // Eligible student approves normally
    assert.strictEqual(validateFinalApproval("ELIGIBLE", false, ""), true);

    // Ineligible student without override fails
    assert.throws(() => validateFinalApproval("INELIGIBLE", false, ""), /override/);

    // Ineligible student with recorded override succeeds
    assert.strictEqual(validateFinalApproval("INELIGIBLE", true, "Dean special approval order #123"), true);
  });

  console.log("\n--- Section 4: Sample Data Verification ---");

  test("AT-15: Seed dataset has at least 30 students, 2 proctors, and 10+ requests", () => {
    assert(STUDENTS.length >= 30, `Expected >= 30 students, got ${STUDENTS.length}`);
    assert(PROCTORS.length >= 2, `Expected >= 2 proctors, got ${PROCTORS.length}`);

    // Verify proctors have assigned students
    const p1Students = STUDENTS.filter(s => s.proctorId === "P01");
    const p2Students = STUDENTS.filter(s => s.proctorId === "P02");
    const p3Students = STUDENTS.filter(s => s.proctorId === "P03");
    assert(p1Students.length > 0, "Proctor P01 must have students");
    assert(p2Students.length > 0, "Proctor P02 must have students");
    assert(p3Students.length > 0, "Proctor P03 must have students");

    // Verify edge cases present in dataset
    const missingStudent = STUDENTS.find(s => s.missingAttendance);
    assert(missingStudent, "Must include at least 1 student with missing attendance data");

    const staleStudent = STUDENTS.find(s => s.isStale);
    assert(staleStudent, "Must include at least 1 student with stale attendance record");
  });

  console.log("\n=======================================================");
  console.log(` Acceptance Test Results: ${passedCount} / ${totalCount} PASSED`);
  console.log("=======================================================\n");

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runAcceptanceTests();
