# CampusGate — Team Integration & Backend API Guide

Welcome! This guide is written for our frontend and module developers to effortlessly connect their user interfaces (Student Portal, Proctor Review Portal, In-Charge Dashboard) to the Firebase Firestore database services.

---

## 📁 Project Architecture & File Map

```
Campusgate/
├── firebase.json                   # Firebase emulator and hosting configuration
├── firestore.rules                 # Role-based security rules
├── firestore.indexes.json          # Compound indexes
├── package.json                    # Project scripts & dependencies
│
├── src/
│   ├── firebase-config.js          # Initialized Firebase db and auth exports
│   │
│   ├── services/
│   │   ├── auth-service.js         # User profiles, roles, and proctor assignments
│   │   ├── config-service.js       # Dynamic attendance threshold & category rules
│   │   ├── attendance-service.js   # Excel/CSV parser, validator, eligibility math, import audit
│   │   ├── request-service.js      # Event request submission, form validation, date overlap detection
│   │   ├── workflow-service.js     # State transitions (Proctor review, In-charge final decision, overrides)
│   │   └── dashboard-service.js    # Data aggregators & CSV report exporters
│   │
│   └── seed/
│       ├── seed-data.js            # Pre-seeded database with 32 students, 2 proctors, 12 event requests
│       └── sample-attendance.csv   # Sample CSV template containing valid & invalid test rows
│
├── test/
│   └── acceptance-tests.js         # 15 automated acceptance tests verifying all core criteria
└── docs/
    └── TEAM_INTEGRATION_GUIDE.md   # This documentation guide
```

---

## 🚀 1. Setup & Getting Started

### Install Dependencies
Run in your terminal:
```bash
npm install
```

### Run Automated Acceptance Tests
```bash
npm test
```

### Seed Evaluation Data (32 Students, 2 Proctors, 12 Requests)
```bash
npm run seed
```

---

## 👨‍🎓 2. Integration Guide: Student Portal (Friend 1)

### A. Display Student Profile & Current Attendance
Fetch the student's authoritative attendance percentage and eligibility status:
```javascript
import { evaluateAttendanceEligibility } from "./src/services/attendance-service.js";

const studentRollNumber = "24AI001";
const eligibility = await evaluateAttendanceEligibility(studentRollNumber);

console.log(eligibility);
/*
Output:
{
  rollNumber: "24AI001",
  classesConducted: 100,
  classesAttended: 88,
  attendancePercentage: 88.0,
  requiredThreshold: 75.0,
  eligibilityStatus: "ELIGIBLE",      // "ELIGIBLE" | "INELIGIBLE" | "UNAVAILABLE" | "STALE"
  isEligible: true,
  isDataStale: false,
  dataAsOf: "2026-10-10",
  reason: "Attendance (88%) meets requirement of ≥75%."
}
*/
```

> **UI Tip:** If `eligibilityStatus === "UNAVAILABLE"`, display *"Attendance Unavailable"* instead of 0%.

---

### B. Submit a New Technical Event Request
The service validates date order, detects overlapping requests with other submitted events, and captures an authoritative attendance snapshot:
```javascript
import { createEventRequest } from "./src/services/request-service.js";

const studentProfile = {
  id: "user_24ai001",
  name: "Aarav Sharma",
  rollNumber: "24AI001",
  department: "AI",
  yearSection: "II / A",
  proctorId: "proctor_01"
};

const formData = {
  eventTitle: "National AI Hackathon 2026",
  organizer: "IIT Madras",
  category: "Hackathon", // Hackathon, Workshop, Conference, Technical Competition, Industrial Visit, Other
  venue: "IIT Madras Research Park",
  city: "Chennai",
  startDate: "2026-11-20",
  endDate: "2026-11-22",
  eventUrl: "https://hackathon.iitm.ac.in",
  purpose: "Present deep learning research and build prototype",
  supportingDocumentUrl: "https://drive.google.com/...",
  isDraft: false // set true to save as draft
};

try {
  const result = await createEventRequest(formData, studentProfile);
  console.log(`Created request ${result.referenceNumber} with status ${result.status}`);
  if (result.overlaps.length > 0) {
    alert("Warning: This event overlaps with another event request you submitted!");
  }
} catch (err) {
  console.error("Submission failed:", err.message);
}
```

---

### C. Track My Requests & Audit Trail
```javascript
import { getStudentDashboardData } from "./src/services/dashboard-service.js";
import { getRequestWithHistory } from "./src/services/request-service.js";

// 1. Fetch dashboard overview
const dashData = await getStudentDashboardData("24AI001", "user_24ai001");
console.log(dashData.pendingProctor);
console.log(dashData.approved);
console.log(dashData.rejected);

// 2. Fetch full timeline / history of a single request
const requestDetails = await getRequestWithHistory("req_01");
console.log("Timeline history:", requestDetails.history);
```

---

### D. Resubmit a Request Returned for Correction
```javascript
import { updateEventRequest } from "./src/services/request-service.js";

// Student can update fields and resubmit
await updateEventRequest("req_06", {
  supportingDocumentUrl: "https://updated-link.com/receipt.pdf",
  submitAgain: true // transitions status back to 'Submitted'
}, studentProfile);
```

---

## 👨‍🏫 3. Integration Guide: Proctor Portal (Friend 2)

### A. Load Proctor Dashboard (Assigned Students Only)
Acceptance Test Guarantee: A proctor will only see requests belonging to their assigned students.
```javascript
import { getProctorDashboardData } from "./src/services/dashboard-service.js";

const proctorId = "proctor_01"; // Dr. Rajesh Kumar
const proctorData = await getProctorDashboardData(proctorId, {
  department: "AI",      // optional filter
  status: "Submitted"    // optional filter
});

console.log(`Assigned Students: ${proctorData.totalAssignedStudents}`);
console.log(`Pending Reviews: ${proctorData.pendingReviews.length}`);
console.log(`Ineligible Requests: ${proctorData.attendanceIneligible.length}`);
```

---

### B. Submit Proctor Review & Recommendation
The proctor can recommend approval/rejection or return for correction.
*(Note: Proctors cannot grant final approval or rejection — enforcing University policy!)*
```javascript
import { submitProctorReview } from "./src/services/workflow-service.js";

const proctorUser = {
  id: "proctor_01",
  name: "Dr. Rajesh Kumar",
  role: "proctor"
};

// Option 1: Recommend Approval
await submitProctorReview({
  requestId: "req_04",
  proctorUser,
  recommendation: "RECOMMEND_APPROVAL",
  remarks: "Verified registration and attendance. Strongly recommend participation."
});

// Option 2: Recommend Rejection
await submitProctorReview({
  requestId: "req_04",
  proctorUser,
  recommendation: "RECOMMEND_REJECTION",
  remarks: "Student has important midterm exam scheduled during these dates."
});

// Option 3: Return for Clarification
await submitProctorReview({
  requestId: "req_04",
  proctorUser,
  recommendation: "RETURN_FOR_CORRECTION",
  remarks: "Please attach formal registration confirmation document."
});
```

---

## 🏛️ 4. Integration Guide: Technical-Event In-Charge Portal

### A. Excel / CSV Attendance Import with Validation
Upload and preview attendance data before committing to the live database:
```javascript
import { parseCSV, validateAttendancePreview, commitAttendanceImport } from "./src/services/attendance-service.js";

// 1. Read file as string
const fileContent = "..."; // from <input type="file"> reader

// 2. Parse CSV
const { rows } = parseCSV(fileContent);

// 3. Generate Preview & Validate Rows
const preview = await validateAttendancePreview(rows);

console.log(`Total: ${preview.totalRows}`);
console.log(`Valid: ${preview.validRowsCount}`);
console.log(`Invalid: ${preview.invalidRowsCount}`);
console.log(`Duplicates: ${preview.duplicateCount}`);

if (preview.invalidRowsCount > 0) {
  // Display error list in UI
  preview.invalidRecords.forEach(inv => {
    console.warn(`Row ${inv.rowIndex} (${inv.rollNumber}): ${inv.errors.join(", ")}`);
  });
}

// 4. Commit to database if valid
if (preview.canCommit) {
  await commitAttendanceImport({
    fileName: "October_Attendance.xlsx",
    validRecords: preview.validRecords,
    importedByUid: "incharge_01",
    importedByName: "Prof. Vikram Seth",
    dataAsOf: "2026-10-10"
  });
  alert("Attendance successfully imported!");
}
```

---

### B. Configure Minimum Attendance Threshold
```javascript
import { updateAttendanceRules, getAttendanceRules } from "./src/services/config-service.js";

// Update threshold to 80%
await updateAttendanceRules({
  minAttendanceThreshold: 80.0,
  staleThresholdDays: 30
}, { uid: "incharge_01", name: "Prof. Vikram Seth" });
```

---

### C. Issue Final Decision (Approve / Reject / Return)
```javascript
import { submitInchargeDecision } from "./src/services/workflow-service.js";

const inchargeUser = {
  id: "incharge_01",
  name: "Prof. Vikram Seth",
  role: "incharge"
};

// Case 1: Standard Approval
await submitInchargeDecision({
  requestId: "req_03",
  inchargeUser,
  decision: "APPROVE",
  remarks: "On-Duty attendance approved for 3 days."
});

// Case 2: Final Rejection
await submitInchargeDecision({
  requestId: "req_09",
  inchargeUser,
  decision: "REJECT",
  remarks: "Rejected due to attendance falling below university requirement."
});

// Case 3: Exceptional Override Approval (Attendance below threshold)
await submitInchargeDecision({
  requestId: "req_02",
  inchargeUser,
  decision: "APPROVE",
  remarks: "Approved under exceptional circumstances.",
  isOverride: true,
  overrideReason: "Dean special dispensation order #DEAN-2026-44 for national competition."
});
```

---

### D. Download CSV Reports
```javascript
import { exportAttendanceReportCSV, exportRequestsReportCSV } from "./src/services/dashboard-service.js";

// Download Attendance Eligibility Report
const attendanceCsv = await exportAttendanceReportCSV();
// trigger file download in browser with data:text/csv;charset=utf-8

// Download Event Approval Report
const requestsCsv = await exportRequestsReportCSV();
```

---

## 📊 5. Summary of Firestore Collections

| Collection | Document Key | Purpose |
|---|---|---|
| `users` | `uid` | User profiles with `role`, `department`, `rollNumber`, `assignedStudents` |
| `system_config` | `attendance_rules` | Dynamic attendance threshold (`75.0%`), stale threshold (`30 days`), categories |
| `student_attendance` | `rollNumber` | Most recent attendance snapshot (`conducted`, `attended`, `percentage`, `dataAsOf`, `isUnavailable`) |
| `attendance_imports` | Auto-ID | Import audit log (`totalRows`, `validRows`, `invalidRows`, `importedAt`, `importedBy`) |
| `event_requests` | Auto-ID | Event requests (`referenceNumber`, `status`, `dates`, `attendanceSnapshot`, `proctorRecommendation`, `finalDecision`, `hasOverlappingEvents`) |
| `event_requests/{id}/history` | Auto-ID | Immutable audit trail for every status transition and override |

---

All services are fully implemented and verified against all 15 acceptance criteria. Let's build a fantastic portal together! 🚀
