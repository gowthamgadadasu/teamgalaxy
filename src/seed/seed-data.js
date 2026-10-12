// src/seed/seed-data.js
import { doc, setDoc, writeBatch, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase-config.js";
import { DEFAULT_RULES } from "../services/config-service.js";

// ============================================================================
// 1. INCHARGE & ADMIN PROFILES
// ============================================================================
export const INCHARGE = {
  uid: "U001",
  linkedId: "INC01",
  name: "Dr. A. Srinivasa Rao",
  email: "tech.incharge@techuniv.edu.in",
  passwordPlain: "Incharge@2026",
  role: "incharge",
  department: "Academic & Technical Events",
  designation: "Technical Event In-Charge"
};

export const ADMIN = {
  uid: "U002",
  linkedId: "ADM01",
  name: "Portal Admin",
  email: "admin@techuniv.edu.in",
  passwordPlain: "Admin@2026",
  role: "incharge",
  department: "Administration",
  designation: "Portal Administrator"
};

// ============================================================================
// 2. PROCTORS (3 Proctors matching user dataset)
// ============================================================================
export const PROCTORS = [
  {
    uid: "U003",
    linkedId: "P01",
    name: "Dr. K. Ramesh",
    email: "k.ramesh@techuniv.edu.in",
    passwordPlain: "Proctor@Ramesh26",
    role: "proctor",
    department: "AI",
    designation: "Associate Professor"
  },
  {
    uid: "U004",
    linkedId: "P02",
    name: "Dr. S. Lakshmi",
    email: "s.lakshmi@techuniv.edu.in",
    passwordPlain: "Proctor@Lakshmi26",
    role: "proctor",
    department: "CSE",
    designation: "Professor"
  },
  {
    uid: "U005",
    linkedId: "P03",
    name: "Prof. M. Venkat Rao",
    email: "m.venkat@techuniv.edu.in",
    passwordPlain: "Proctor@Venkat26",
    role: "proctor",
    department: "ECE",
    designation: "Professor"
  }
];

// ============================================================================
// 3. 32 STUDENTS WITH LOGIN CREDENTIALS, ATTENDANCE & PROCTOR MAPPINGS
// ============================================================================
export const STUDENTS = [
  // --- AI Students (Assigned to P01: Dr. K. Ramesh) ---
  { uid: "U006", roll: "24AI001", name: "Aarav Reddy", email: "24ai001@techuniv.edu.in", passwordPlain: "Stu@24AI001", dept: "AI", year: "II", sec: "A", semester: 3, academicYear: "2026-27", cgpa: 6.58, backlogs: 0, phone: "+91 9813998698", proctorId: "P01", proctorUid: "U003", conducted: 120.0, attended: 108.0, pct: 90.0, asOf: "2026-10-10", eligStatus: "Eligible" },
  { uid: "U007", roll: "24AI002", name: "Sanjana Patel", email: "24ai002@techuniv.edu.in", passwordPlain: "Stu@24AI002", dept: "AI", year: "II", sec: "A", semester: 3, academicYear: "2026-27", cgpa: 8.90, backlogs: 0, phone: "+91 9973091141", proctorId: "P01", proctorUid: "U003", conducted: 120.0, attended: 95.0, pct: 79.17, asOf: "2026-10-10", eligStatus: "Eligible" },
  { uid: "U008", roll: "24AI003", name: "Karthik Naidu", email: "24ai003@techuniv.edu.in", passwordPlain: "Stu@24AI003", dept: "AI", year: "II", sec: "A", semester: 3, academicYear: "2026-27", cgpa: 7.64, backlogs: 1, phone: "+91 9753645568", proctorId: "P01", proctorUid: "U003", conducted: 120.0, attended: 90.0, pct: 75.0, asOf: "2026-10-10", eligStatus: "Eligible" }, // EXACTLY 75%
  { uid: "U009", roll: "24AI004", name: "Meghana Rao", email: "24ai004@techuniv.edu.in", passwordPlain: "Stu@24AI004", dept: "AI", year: "II", sec: "A", semester: 3, academicYear: "2026-27", cgpa: 8.24, backlogs: 1, phone: "+91 9518844729", proctorId: "P01", proctorUid: "U003", conducted: 120.0, attended: 78.0, pct: 65.0, asOf: "2026-10-10", eligStatus: "Ineligible" }, // BELOW 75%
  { uid: "U010", roll: "24AI005", name: "Rohit Sharma", email: "24ai005@techuniv.edu.in", passwordPlain: "Stu@24AI005", dept: "AI", year: "II", sec: "A", semester: 3, academicYear: "2026-27", cgpa: 7.19, backlogs: 1, phone: "+91 9557616987", proctorId: "P01", proctorUid: "U003", conducted: 120.0, attended: 113.0, pct: 94.17, asOf: "2026-10-10", eligStatus: "Eligible" },
  { uid: "U011", roll: "24AI006", name: "Ananya Iyer", email: "24ai006@techuniv.edu.in", passwordPlain: "Stu@24AI006", dept: "AI", year: "II", sec: "B", semester: 3, academicYear: "2026-27", cgpa: 8.98, backlogs: 0, phone: "+91 9897684697", proctorId: "P01", proctorUid: "U003", conducted: 120.0, attended: 100.0, pct: 83.33, asOf: "2026-10-10", eligStatus: "Eligible" },
  { uid: "U012", roll: "24AI007", name: "Vikram Singh", email: "24ai007@techuniv.edu.in", passwordPlain: "Stu@24AI007", dept: "AI", year: "II", sec: "B", semester: 3, academicYear: "2026-27", cgpa: 7.84, backlogs: 0, phone: "+91 9932081967", proctorId: "P01", proctorUid: "U003", conducted: 120.0, attended: 89.0, pct: 74.17, asOf: "2026-10-10", eligStatus: "Ineligible" }, // 74.17% (just short of 75%)
  { uid: "U013", roll: "24AI008", name: "Priya Menon", email: "24ai008@techuniv.edu.in", passwordPlain: "Stu@24AI008", dept: "AI", year: "II", sec: "B", semester: 3, academicYear: "2026-27", cgpa: 6.66, backlogs: 0, phone: "+91 9177848648", proctorId: "P01", proctorUid: "U003", conducted: 120.0, attended: 91.0, pct: 75.83, asOf: "2026-10-10", eligStatus: "Eligible" },
  { uid: "U014", roll: "24AI009", name: "Harsha Vardhan", email: "24ai009@techuniv.edu.in", passwordPlain: "Stu@24AI009", dept: "AI", year: "II", sec: "B", semester: 3, academicYear: "2026-27", cgpa: 8.76, backlogs: 0, phone: "+91 9766344002", proctorId: "P01", proctorUid: "U003", conducted: 120.0, attended: 105.0, pct: 87.5, asOf: "2026-10-10", eligStatus: "Eligible" },
  { uid: "U015", roll: "24AI010", name: "Divya Kulkarni", email: "24ai010@techuniv.edu.in", passwordPlain: "Stu@24AI010", dept: "AI", year: "II", sec: "B", semester: 3, academicYear: "2026-27", cgpa: 8.30, backlogs: 0, phone: "+91 9787534778", proctorId: "P01", proctorUid: "U003", conducted: 120.0, attended: 72.0, pct: 60.0, asOf: "2026-10-10", eligStatus: "Ineligible" },

  // --- CSE Students (Assigned to P02: Dr. S. Lakshmi) ---
  { uid: "U016", roll: "24CS001", name: "Sai Teja", email: "24cs001@techuniv.edu.in", passwordPlain: "Stu@24CS001", dept: "CSE", year: "II", sec: "A", semester: 3, academicYear: "2026-27", cgpa: 8.65, backlogs: 0, phone: "+91 9680457178", proctorId: "P02", proctorUid: "U004", conducted: 100.0, attended: 88.0, pct: 88.0, asOf: "2026-10-10", eligStatus: "Eligible" },
  { uid: "U017", roll: "24CS002", name: "Lavanya Gupta", email: "24cs002@techuniv.edu.in", passwordPlain: "Stu@24CS002", dept: "CSE", year: "II", sec: "A", semester: 3, academicYear: "2026-27", cgpa: 7.03, backlogs: 0, phone: "+91 9671475136", proctorId: "P02", proctorUid: "U004", conducted: 100.0, attended: 75.0, pct: 75.0, asOf: "2026-10-10", eligStatus: "Eligible" }, // EXACTLY 75%
  { uid: "U018", roll: "24CS003", name: "Arjun Nair", email: "24cs003@techuniv.edu.in", passwordPlain: "Stu@24CS003", dept: "CSE", year: "II", sec: "A", semester: 3, academicYear: "2026-27", cgpa: 6.67, backlogs: 0, phone: "+91 9107981933", proctorId: "P02", proctorUid: "U004", conducted: 100.0, attended: 92.0, pct: 92.0, asOf: "2026-10-10", eligStatus: "Eligible" },
  { uid: "U019", roll: "24CS004", name: "Neha Verma", email: "24cs004@techuniv.edu.in", passwordPlain: "Stu@24CS004", dept: "CSE", year: "II", sec: "A", semester: 3, academicYear: "2026-27", cgpa: 6.59, backlogs: 0, phone: "+91 9845205997", proctorId: "P02", proctorUid: "U004", conducted: 100.0, attended: 68.0, pct: 68.0, asOf: "2026-10-10", eligStatus: "Ineligible" }, // 68% (Granted override for industrial visit)
  { uid: "U020", roll: "24CS005", name: "Tarun Kumar", email: "24cs005@techuniv.edu.in", passwordPlain: "Stu@24CS005", dept: "CSE", year: "II", sec: "A", semester: 3, academicYear: "2026-27", cgpa: 8.41, backlogs: 0, phone: "+91 9837929841", proctorId: "P02", proctorUid: "U004", missingAttendance: true, conducted: null, attended: null, pct: null, asOf: null, eligStatus: "Unavailable" }, // MISSING ATTENDANCE
  { uid: "U021", roll: "24CS006", name: "Swathi Reddy", email: "24cs006@techuniv.edu.in", passwordPlain: "Stu@24CS006", dept: "CSE", year: "II", sec: "B", semester: 3, academicYear: "2026-27", cgpa: 7.54, backlogs: 0, phone: "+91 9294866283", proctorId: "P02", proctorUid: "U004", conducted: 100.0, attended: 84.0, pct: 84.0, asOf: "2026-10-10", eligStatus: "Eligible" },
  { uid: "U022", roll: "24CS007", name: "Mohammed Faizan", email: "24cs007@techuniv.edu.in", passwordPlain: "Stu@24CS007", dept: "CSE", year: "II", sec: "B", semester: 3, academicYear: "2026-27", cgpa: 7.40, backlogs: 0, phone: "+91 9610550087", proctorId: "P02", proctorUid: "U004", conducted: 100.0, attended: 74.0, pct: 74.0, asOf: "2026-10-10", eligStatus: "Ineligible" }, // 74% (Returned for correction)
  { uid: "U023", roll: "24CS008", name: "Pooja Desai", email: "24cs008@techuniv.edu.in", passwordPlain: "Stu@24CS008", dept: "CSE", year: "II", sec: "B", semester: 3, academicYear: "2026-27", cgpa: 7.25, backlogs: 0, phone: "+91 9751779922", proctorId: "P02", proctorUid: "U004", conducted: 100.0, attended: 96.0, pct: 96.0, asOf: "2026-10-10", eligStatus: "Eligible" },
  { uid: "U024", roll: "24CS009", name: "Nikhil Chowdary", email: "24cs009@techuniv.edu.in", passwordPlain: "Stu@24CS009", dept: "CSE", year: "II", sec: "B", semester: 3, academicYear: "2026-27", cgpa: 8.09, backlogs: 0, phone: "+91 9695793186", proctorId: "P02", proctorUid: "U004", conducted: 100.0, attended: 85.0, pct: 85.0, asOf: "2026-07-18", isStale: true, eligStatus: "Stale - Verify" }, // STALE ATTENDANCE (>80 days old)
  { uid: "U025", roll: "24CS010", name: "Bhavana Joshi", email: "24cs010@techuniv.edu.in", passwordPlain: "Stu@24CS010", dept: "CSE", year: "II", sec: "B", semester: 3, academicYear: "2026-27", cgpa: 6.31, backlogs: 1, phone: "+91 9208073702", proctorId: "P02", proctorUid: "U004", conducted: 100.0, attended: 83.0, pct: 83.0, asOf: "2026-10-10", eligStatus: "Eligible" },

  // --- ECE Students (Assigned to P03: Prof. M. Venkat Rao) ---
  { uid: "U026", roll: "23EC001", name: "Manoj Prasad", email: "23ec001@techuniv.edu.in", passwordPlain: "Stu@23EC001", dept: "ECE", year: "III", sec: "A", semester: 5, academicYear: "2026-27", cgpa: 8.27, backlogs: 0, phone: "+91 9822264686", proctorId: "P03", proctorUid: "U005", conducted: 96.0, attended: 90.0, pct: 93.75, asOf: "2026-10-10", eligStatus: "Eligible" },
  { uid: "U027", roll: "23EC002", name: "Keerthi Varma", email: "23ec002@techuniv.edu.in", passwordPlain: "Stu@23EC002", dept: "ECE", year: "III", sec: "A", semester: 5, academicYear: "2026-27", cgpa: 8.98, backlogs: 0, phone: "+91 9425247764", proctorId: "P03", proctorUid: "U005", conducted: 96.0, attended: 72.0, pct: 75.0, asOf: "2026-10-10", eligStatus: "Eligible" }, // EXACTLY 75%
  { uid: "U028", roll: "23EC003", name: "Abhishek Yadav", email: "23ec003@techuniv.edu.in", passwordPlain: "Stu@23EC003", dept: "ECE", year: "III", sec: "A", semester: 5, academicYear: "2026-27", cgpa: 7.70, backlogs: 0, phone: "+91 9877188413", proctorId: "P03", proctorUid: "U005", conducted: 96.0, attended: 80.0, pct: 83.33, asOf: "2026-10-10", eligStatus: "Eligible" },
  { uid: "U029", roll: "23EC004", name: "Sneha Pillai", email: "23ec004@techuniv.edu.in", passwordPlain: "Stu@23EC004", dept: "ECE", year: "III", sec: "A", semester: 5, academicYear: "2026-27", cgpa: 6.94, backlogs: 0, phone: "+91 9756820525", proctorId: "P03", proctorUid: "U005", conducted: 96.0, attended: 66.0, pct: 68.75, asOf: "2026-10-10", eligStatus: "Ineligible" }, // Rejected (<75%)
  { uid: "U030", roll: "23EC005", name: "Rahul Dev", email: "23ec005@techuniv.edu.in", passwordPlain: "Stu@23EC005", dept: "ECE", year: "III", sec: "A", semester: 5, academicYear: "2026-27", cgpa: 8.00, backlogs: 0, phone: "+91 9831948939", proctorId: "P03", proctorUid: "U005", conducted: 96.0, attended: 85.0, pct: 88.54, asOf: "2026-10-10", eligStatus: "Eligible" },
  { uid: "U031", roll: "23EC006", name: "Harini Krishnan", email: "23ec006@techuniv.edu.in", passwordPlain: "Stu@23EC006", dept: "ECE", year: "III", sec: "A", semester: 5, academicYear: "2026-27", cgpa: 7.14, backlogs: 0, phone: "+91 9821416210", proctorId: "P03", proctorUid: "U005", conducted: 96.0, attended: 71.0, pct: 73.96, asOf: "2026-10-10", eligStatus: "Ineligible" },
  { uid: "U032", roll: "23EC007", name: "Yashwanth Raju", email: "23ec007@techuniv.edu.in", passwordPlain: "Stu@23EC007", dept: "ECE", year: "III", sec: "B", semester: 5, academicYear: "2026-27", cgpa: 8.63, backlogs: 1, phone: "+91 9218549145", proctorId: "P03", proctorUid: "U005", conducted: 96.0, attended: 93.0, pct: 96.88, asOf: "2026-10-10", eligStatus: "Eligible" },
  { uid: "U033", roll: "23EC008", name: "Ishita Bansal", email: "23ec008@techuniv.edu.in", passwordPlain: "Stu@23EC008", dept: "ECE", year: "III", sec: "B", semester: 5, academicYear: "2026-27", cgpa: 6.72, backlogs: 0, phone: "+91 9106460013", proctorId: "P03", proctorUid: "U005", conducted: 96.0, attended: 76.0, pct: 79.17, asOf: "2026-10-10", eligStatus: "Eligible" },
  { uid: "U034", roll: "23EC009", name: "Chaitanya Rao", email: "23ec009@techuniv.edu.in", passwordPlain: "Stu@23EC009", dept: "ECE", year: "III", sec: "B", semester: 5, academicYear: "2026-27", cgpa: 6.27, backlogs: 0, phone: "+91 9189557990", proctorId: "P03", proctorUid: "U005", conducted: 96.0, attended: 60.0, pct: 62.5, asOf: "2026-10-10", eligStatus: "Ineligible" },
  { uid: "U035", roll: "23EC010", name: "Lakshmi Prasanna", email: "23ec010@techuniv.edu.in", passwordPlain: "Stu@23EC010", dept: "ECE", year: "III", sec: "B", semester: 5, academicYear: "2026-27", cgpa: 9.16, backlogs: 0, phone: "+91 9939761584", proctorId: "P03", proctorUid: "U005", conducted: 96.0, attended: 88.0, pct: 91.67, asOf: "2026-10-10", eligStatus: "Eligible" },
  { uid: "U036", roll: "23EC011", name: "Sandeep Goud", email: "23ec011@techuniv.edu.in", passwordPlain: "Stu@23EC011", dept: "ECE", year: "III", sec: "B", semester: 5, academicYear: "2026-27", cgpa: 7.44, backlogs: 0, phone: "+91 9060454146", proctorId: "P03", proctorUid: "U005", conducted: 96.0, attended: 78.0, pct: 81.25, asOf: "2026-10-10", eligStatus: "Eligible" },
  { uid: "U037", roll: "23EC012", name: "Fatima Sheikh", email: "23ec012@techuniv.edu.in", passwordPlain: "Stu@23EC012", dept: "ECE", year: "III", sec: "B", semester: 5, academicYear: "2026-27", cgpa: 7.22, backlogs: 0, phone: "+91 9853801291", proctorId: "P03", proctorUid: "U005", conducted: 96.0, attended: 73.0, pct: 76.04, asOf: "2026-10-10", eligStatus: "Eligible" }
];

// ============================================================================
// 4. 17 EVENT REQUESTS (Complete life-cycle covering all test cases)
// ============================================================================
export const EVENT_REQUESTS = [
  {
    requestId: "TEP-2026-0001",
    rollNumber: "24AI001",
    eventTitle: "Smart India Hackathon 2026 - Grand Finale",
    organizer: "Innovation Cell, Ministry of Education",
    category: "Hackathon",
    venue: "NIT Warangal",
    city: "Warangal",
    startDate: "2026-11-05",
    endDate: "2026-11-07",
    eventUrl: "https://sih.example.org/2026",
    purpose: "Team qualified for grand finale; build and present an AI-based public-service solution.",
    supportingDocument: "SIH_Selection_Letter.pdf",
    submittedOn: "2026-10-01",
    status: "Approved",
    proctorId: "P01",
    eligibilityFlagAtSubmission: "Eligible",
    overlapFlag: "",
    proctorRecommendation: "Recommend Approval",
    proctorRemarks: "Attendance 90.00%, eligible. Finalist letter verified.",
    proctorReviewedOn: "2026-10-02",
    finalDecision: "Approved",
    finalRemarks: "Approved. Student to submit participation certificate after the event.",
    decidedBy: "tech.incharge@techuniv.edu.in",
    decidedOn: "2026-10-04",
    approvalReference: "APR-2026-0001",
    overrideUsed: "No",
    overrideReason: "",
    currentAttendancePct: 90.0,
    currentEligibility: "Eligible"
  },
  {
    requestId: "TEP-2026-0002",
    rollNumber: "24AI005",
    eventTitle: "Generative AI & LLM Workshop",
    organizer: "Deccan Institute of AI",
    category: "Workshop",
    venue: "Deccan Institute Campus",
    city: "Hyderabad",
    startDate: "2026-10-24",
    endDate: "2026-10-25",
    eventUrl: "https://dia.example.org/genai-workshop",
    purpose: "Hands-on training on fine-tuning and deploying LLMs; relevant to AI electives.",
    supportingDocument: "Registration_Confirmation.pdf",
    submittedOn: "2026-10-06",
    status: "Pending Final Decision",
    proctorId: "P01",
    eligibilityFlagAtSubmission: "Eligible",
    overlapFlag: "",
    proctorRecommendation: "Recommend Approval",
    proctorRemarks: "Attendance 94.17%. Event relevant to curriculum.",
    proctorReviewedOn: "2026-10-09",
    finalDecision: null,
    finalRemarks: "",
    decidedBy: "",
    decidedOn: "",
    approvalReference: "",
    overrideUsed: "No",
    overrideReason: "",
    currentAttendancePct: 94.17,
    currentEligibility: "Eligible"
  },
  {
    requestId: "TEP-2026-0003",
    rollNumber: "24AI003",
    eventTitle: "National Conference on ML Applications (NCMLA 2026)",
    organizer: "Coastal Institute of Technology",
    category: "Conference",
    venue: "CIT Auditorium",
    city: "Visakhapatnam",
    startDate: "2026-11-12",
    endDate: "2026-11-13",
    eventUrl: "https://ncmla.example.org",
    purpose: "Present paper on crop-disease detection; paper accepted for oral presentation.",
    supportingDocument: "Paper_Acceptance_Letter.pdf",
    submittedOn: "2026-10-09",
    status: "Under Proctor Review",
    proctorId: "P01",
    eligibilityFlagAtSubmission: "Eligible",
    overlapFlag: "",
    proctorRecommendation: null,
    proctorRemarks: "",
    proctorReviewedOn: "",
    finalDecision: null,
    finalRemarks: "",
    decidedBy: "",
    decidedOn: "",
    approvalReference: "",
    overrideUsed: "No",
    overrideReason: "",
    currentAttendancePct: 75.0,
    currentEligibility: "Eligible"
  },
  {
    requestId: "TEP-2026-0004",
    rollNumber: "24AI004",
    eventTitle: "CodeSprint 48-Hour Hackathon",
    organizer: "Bharat Tech Forum",
    category: "Hackathon",
    venue: "Convention Centre",
    city: "Bengaluru",
    startDate: "2026-10-30",
    endDate: "2026-11-01",
    eventUrl: "https://codesprint.example.org",
    purpose: "Build a prototype with a team of four; networking with industry mentors.",
    supportingDocument: "",
    submittedOn: "2026-10-03",
    status: "Rejected",
    proctorId: "P01",
    eligibilityFlagAtSubmission: "Ineligible",
    overlapFlag: "",
    proctorRecommendation: "Recommend Rejection",
    proctorRemarks: "Attendance 65.00% is below the 75% threshold.",
    proctorReviewedOn: "2026-10-05",
    finalDecision: "Rejected",
    finalRemarks: "Attendance below the required 75% and no exceptional justification provided.",
    decidedBy: "tech.incharge@techuniv.edu.in",
    decidedOn: "2026-10-07",
    approvalReference: "",
    overrideUsed: "No",
    overrideReason: "",
    currentAttendancePct: 65.0,
    currentEligibility: "Ineligible"
  },
  {
    requestId: "TEP-2026-0005",
    rollNumber: "24AI007",
    eventTitle: "Inter-College Coding Championship",
    organizer: "Southern Coders Guild",
    category: "Technical Competition",
    venue: "Anna Tech Park",
    city: "Chennai",
    startDate: "2026-11-20",
    endDate: "2026-11-21",
    eventUrl: "https://scg.example.org/icc",
    purpose: "Compete in individual algorithmic rounds.",
    supportingDocument: "Invitation_Mail.pdf",
    submittedOn: "2026-10-08",
    status: "Recommended for Rejection",
    proctorId: "P01",
    eligibilityFlagAtSubmission: "Ineligible",
    overlapFlag: "",
    proctorRecommendation: "Recommend Rejection",
    proctorRemarks: "Attendance 74.17%, short of 75% by 0.83 points. Advise reapplying once attendance improves.",
    proctorReviewedOn: "2026-10-10",
    finalDecision: null,
    finalRemarks: "",
    decidedBy: "",
    decidedOn: "",
    approvalReference: "",
    overrideUsed: "No",
    overrideReason: "",
    currentAttendancePct: 74.17,
    currentEligibility: "Ineligible"
  },
  {
    requestId: "TEP-2026-0006",
    rollNumber: "24CS005",
    eventTitle: "Cloud Native Workshop",
    organizer: "CNCF Hyderabad Community",
    category: "Workshop",
    venue: "T-Hub",
    city: "Hyderabad",
    startDate: "2026-10-28",
    endDate: "2026-10-28",
    eventUrl: "https://cncf-hyd.example.org",
    purpose: "Learn Kubernetes fundamentals.",
    supportingDocument: "",
    submittedOn: "2026-10-10",
    status: "Under Proctor Review",
    proctorId: "P02",
    eligibilityFlagAtSubmission: "Unavailable",
    overlapFlag: "",
    proctorRecommendation: null,
    proctorRemarks: "",
    proctorReviewedOn: "",
    finalDecision: null,
    finalRemarks: "",
    decidedBy: "",
    decidedOn: "",
    approvalReference: "",
    overrideUsed: "No",
    overrideReason: "",
    currentAttendancePct: null,
    currentEligibility: "Unavailable"
  },
  {
    requestId: "TEP-2026-0007",
    rollNumber: "24CS009",
    eventTitle: "Cybersecurity Summit 2026",
    organizer: "SecureIndia Council",
    category: "Conference",
    venue: "Hall 3, Expo Centre",
    city: "Pune",
    startDate: "2026-11-06",
    endDate: "2026-11-08",
    eventUrl: "https://secsummit.example.org",
    purpose: "Attend security tracks and CTF village.",
    supportingDocument: "Registration_Confirmation.pdf",
    submittedOn: "2026-10-05",
    status: "Pending Final Decision",
    proctorId: "P02",
    eligibilityFlagAtSubmission: "Stale - Verify",
    overlapFlag: "",
    proctorRecommendation: "Recommend Approval",
    proctorRemarks: "Attendance data is from 18-07-2026 (stale). Recommend approval subject to fresh attendance verification.",
    proctorReviewedOn: "2026-10-08",
    finalDecision: null,
    finalRemarks: "",
    decidedBy: "",
    decidedOn: "",
    approvalReference: "",
    overrideUsed: "No",
    overrideReason: "",
    currentAttendancePct: 85.0,
    currentEligibility: "Stale - Verify"
  },
  {
    requestId: "TEP-2026-0008",
    rollNumber: "24CS002",
    eventTitle: "Full Stack Web Development Bootcamp",
    organizer: "TechNova Academy",
    category: "Workshop",
    venue: "TechNova Campus",
    city: "Hyderabad",
    startDate: "2026-10-26",
    endDate: "2026-10-27",
    eventUrl: "https://technova.example.org/bootcamp",
    purpose: "Two-day bootcamp on MERN stack to support mini-project.",
    supportingDocument: "Registration_Confirmation.pdf",
    submittedOn: "2026-10-02",
    status: "Approved",
    proctorId: "P02",
    eligibilityFlagAtSubmission: "Eligible",
    overlapFlag: "",
    proctorRecommendation: "Recommend Approval",
    proctorRemarks: "Attendance exactly 75.00% - meets threshold.",
    proctorReviewedOn: "2026-10-04",
    finalDecision: "Approved",
    finalRemarks: "Approved; attendance meets minimum requirement.",
    decidedBy: "tech.incharge@techuniv.edu.in",
    decidedOn: "2026-10-06",
    approvalReference: "APR-2026-0008",
    overrideUsed: "No",
    overrideReason: "",
    currentAttendancePct: 75.0,
    currentEligibility: "Eligible"
  },
  {
    requestId: "TEP-2026-0009",
    rollNumber: "24CS004",
    eventTitle: "Industrial Visit - Data Centre & Cloud Operations",
    organizer: "Infra Systems Pvt Ltd",
    category: "Industrial Visit",
    venue: "Infra Systems Data Centre",
    city: "Hyderabad",
    startDate: "2026-10-29",
    endDate: "2026-10-29",
    eventUrl: "https://infrasys.example.org/visit",
    purpose: "Curriculum-linked visit for Cloud Computing course.",
    supportingDocument: "HOD_Permission_Letter.pdf",
    submittedOn: "2026-10-04",
    status: "Approved",
    proctorId: "P02",
    eligibilityFlagAtSubmission: "Ineligible",
    overlapFlag: "",
    proctorRecommendation: "Recommend Rejection",
    proctorRemarks: "Attendance 68.00% is below threshold; visit is curriculum-linked per HOD letter.",
    proctorReviewedOn: "2026-10-06",
    finalDecision: "Approved",
    finalRemarks: "Approved via override: curriculum-linked visit with HOD recommendation.",
    decidedBy: "tech.incharge@techuniv.edu.in",
    decidedOn: "2026-10-08",
    approvalReference: "APR-2026-0009",
    overrideUsed: "Yes",
    overrideReason: "Course-mandated industrial visit; HOD letter attached. Original eligibility result retained.",
    currentAttendancePct: 68.0,
    currentEligibility: "Ineligible"
  },
  {
    requestId: "TEP-2026-0010",
    rollNumber: "24CS007",
    eventTitle: "AI for Social Good Hackathon",
    organizer: "Impact Labs",
    category: "Hackathon",
    venue: "Impact Labs HQ",
    city: "Mumbai",
    startDate: "2026-11-14",
    endDate: "2026-11-15",
    eventUrl: "https://impactlabs.example.org/hack",
    purpose: "Build solutions for accessibility challenges.",
    supportingDocument: "",
    submittedOn: "2026-10-07",
    status: "Returned for Correction",
    proctorId: "P02",
    eligibilityFlagAtSubmission: "Ineligible",
    overlapFlag: "",
    proctorRecommendation: "Return for Clarification",
    proctorRemarks: "Registration confirmation missing; invitation shows 14-16 Nov but form says 14-15 Nov. Attendance 74.00%.",
    proctorReviewedOn: "2026-10-09",
    finalDecision: null,
    finalRemarks: "",
    decidedBy: "",
    decidedOn: "",
    approvalReference: "",
    overrideUsed: "No",
    overrideReason: "",
    currentAttendancePct: 74.0,
    currentEligibility: "Ineligible"
  },
  {
    requestId: "TEP-2026-0011",
    rollNumber: "23EC004",
    eventTitle: "International Conference on VLSI & Embedded Systems",
    organizer: "IEEE Student Chapter",
    category: "Conference",
    venue: "Bengaluru Intl. Centre",
    city: "Bengaluru",
    startDate: "2026-11-02",
    endDate: "2026-11-04",
    eventUrl: "https://vlsiconf.example.org",
    purpose: "Attend sessions on low-power VLSI design.",
    supportingDocument: "Registration_Confirmation.pdf",
    submittedOn: "2026-10-02",
    status: "Rejected",
    proctorId: "P03",
    eligibilityFlagAtSubmission: "Ineligible",
    overlapFlag: "",
    proctorRecommendation: "Recommend Rejection",
    proctorRemarks: "Attendance 68.75% is below threshold.",
    proctorReviewedOn: "2026-10-04",
    finalDecision: "Rejected",
    finalRemarks: "Attendance below 75%; dates also clash with internal lab examinations.",
    decidedBy: "tech.incharge@techuniv.edu.in",
    decidedOn: "2026-10-06",
    approvalReference: "",
    overrideUsed: "No",
    overrideReason: "",
    currentAttendancePct: 68.75,
    currentEligibility: "Ineligible"
  },
  {
    requestId: "TEP-2026-0012",
    rollNumber: "23EC002",
    eventTitle: "IoT Hack Day",
    organizer: "Smart Devices Society",
    category: "Hackathon",
    venue: "Maker Space",
    city: "Chennai",
    startDate: "2026-11-08",
    endDate: "2026-11-09",
    eventUrl: "https://iotday.example.org",
    purpose: "Prototype a sensor-based monitoring system.",
    supportingDocument: "",
    submittedOn: "2026-10-11",
    status: "Submitted",
    proctorId: "P03",
    eligibilityFlagAtSubmission: "Eligible",
    overlapFlag: "",
    proctorRecommendation: null,
    proctorRemarks: "",
    proctorReviewedOn: "",
    finalDecision: null,
    finalRemarks: "",
    decidedBy: "",
    decidedOn: "",
    approvalReference: "",
    overrideUsed: "No",
    overrideReason: "",
    currentAttendancePct: 75.0,
    currentEligibility: "Eligible"
  },
  {
    requestId: "TEP-2026-0013",
    rollNumber: "23EC007",
    eventTitle: "Embedded Systems Coding Challenge",
    organizer: "EmbedCon",
    category: "Technical Competition",
    venue: "Hitech Auditorium",
    city: "Hyderabad",
    startDate: "2026-10-22",
    endDate: "2026-10-22",
    eventUrl: "https://embedcon.example.org",
    purpose: "One-day firmware coding contest.",
    supportingDocument: "Invitation_Mail.pdf",
    submittedOn: "2026-10-05",
    status: "Withdrawn",
    proctorId: "P03",
    eligibilityFlagAtSubmission: "Eligible",
    overlapFlag: "",
    proctorRecommendation: null,
    proctorRemarks: "",
    proctorReviewedOn: "",
    finalDecision: null,
    finalRemarks: "Withdrawn by student - event no longer attended",
    decidedBy: "",
    decidedOn: "",
    approvalReference: "",
    overrideUsed: "No",
    overrideReason: "",
    currentAttendancePct: 96.88,
    currentEligibility: "Eligible"
  },
  {
    requestId: "TEP-2026-0014",
    rollNumber: "23EC009",
    eventTitle: "5G & Wireless Communication Workshop",
    organizer: "Kerala Technical Forum",
    category: "Workshop",
    venue: "Tech Hall",
    city: "Kochi",
    startDate: "2026-12-03",
    endDate: "2026-12-04",
    eventUrl: "",
    purpose: "Understand 5G NR physical layer.",
    supportingDocument: "",
    submittedOn: "2026-10-11",
    status: "Draft",
    proctorId: "P03",
    eligibilityFlagAtSubmission: "Ineligible",
    overlapFlag: "",
    proctorRecommendation: null,
    proctorRemarks: "",
    proctorReviewedOn: "",
    finalDecision: null,
    finalRemarks: "",
    decidedBy: "",
    decidedOn: "",
    approvalReference: "",
    overrideUsed: "No",
    overrideReason: "",
    currentAttendancePct: 62.5,
    currentEligibility: "Ineligible"
  },
  {
    requestId: "TEP-2026-0015",
    rollNumber: "24AI001",
    eventTitle: "Prompt Engineering Workshop",
    organizer: "PromptCraft Academy",
    category: "Workshop",
    venue: "PromptCraft Studio",
    city: "Hyderabad",
    startDate: "2026-11-06",
    endDate: "2026-11-06",
    eventUrl: "https://promptcraft.example.org",
    purpose: "Single-day workshop on prompt design.",
    supportingDocument: "Registration_Confirmation.pdf",
    submittedOn: "2026-10-11",
    status: "Under Proctor Review",
    proctorId: "P01",
    eligibilityFlagAtSubmission: "Eligible",
    overlapFlag: "Overlaps TEP-2026-0001 (05-07 Nov)",
    proctorRecommendation: null,
    proctorRemarks: "",
    proctorReviewedOn: "",
    finalDecision: null,
    finalRemarks: "",
    decidedBy: "",
    decidedOn: "",
    approvalReference: "",
    overrideUsed: "No",
    overrideReason: "",
    currentAttendancePct: 90.0,
    currentEligibility: "Eligible"
  },
  {
    requestId: "TEP-2026-0016",
    rollNumber: "23EC010",
    eventTitle: "Industrial Visit - Satellite Communication Centre",
    organizer: "Space Applications Division",
    category: "Industrial Visit",
    venue: "Satellite Centre",
    city: "Bengaluru",
    startDate: "2026-11-18",
    endDate: "2026-11-18",
    eventUrl: "https://sac.example.org/visits",
    purpose: "Curriculum-linked visit for Satellite Communications elective.",
    supportingDocument: "HOD_Permission_Letter.pdf",
    submittedOn: "2026-10-07",
    status: "Recommended for Approval",
    proctorId: "P03",
    eligibilityFlagAtSubmission: "Eligible",
    overlapFlag: "",
    proctorRecommendation: "Recommend Approval",
    proctorRemarks: "Attendance 91.67%. Curriculum-linked.",
    proctorReviewedOn: "2026-10-10",
    finalDecision: null,
    finalRemarks: "",
    decidedBy: "",
    decidedOn: "",
    approvalReference: "",
    overrideUsed: "No",
    overrideReason: "",
    currentAttendancePct: 91.67,
    currentEligibility: "Eligible"
  },
  {
    requestId: "TEP-2026-0017",
    rollNumber: "24CS003",
    eventTitle: "HackVerse 2026",
    organizer: "DevConnect",
    category: "Hackathon",
    venue: "Hitex Exhibition Centre",
    city: "Hyderabad",
    startDate: "2026-12-05",
    endDate: "2026-12-06",
    eventUrl: "https://hackverse.example.org",
    purpose: "Team entry in the open-innovation track.",
    supportingDocument: "Registration_Confirmation.pdf",
    submittedOn: "2026-10-08",
    status: "Pending Final Decision",
    proctorId: "P02",
    eligibilityFlagAtSubmission: "Eligible",
    overlapFlag: "",
    proctorRecommendation: "Recommend Approval",
    proctorRemarks: "Attendance 92.00%. Good academic record.",
    proctorReviewedOn: "2026-10-10",
    finalDecision: null,
    finalRemarks: "",
    decidedBy: "",
    decidedOn: "",
    approvalReference: "",
    overrideUsed: "No",
    overrideReason: "",
    currentAttendancePct: 92.0,
    currentEligibility: "Eligible"
  }
];

// ============================================================================
// 5. SEED FUNCTION FOR FIRESTORE
// ============================================================================
export async function seedAll() {
  console.log("--- Starting Database Seeding with Verified Academic Dataset ---");

  // 1. Seed System Configuration
  console.log("Seeding system configuration...");
  await setDoc(doc(db, "system_config", "attendance_rules"), {
    ...DEFAULT_RULES,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: "seed_script"
  });

  // 2. Seed In-Charge & Proctors
  console.log("Seeding staff accounts...");
  await setDoc(doc(db, "users", INCHARGE.uid), {
    ...INCHARGE,
    createdAt: serverTimestamp()
  });

  for (const p of PROCTORS) {
    const assignedRolls = STUDENTS.filter(s => s.proctorId === p.linkedId).map(s => s.roll);
    await setDoc(doc(db, "users", p.uid), {
      ...p,
      assignedStudents: assignedRolls,
      createdAt: serverTimestamp()
    });
  }

  // 3. Seed Students & Attendance
  console.log("Seeding 32 students and attendance records...");
  const batch = writeBatch(db);
  const importDocRef = doc(collection(db, "attendance_imports"));

  for (const s of STUDENTS) {
    const userRef = doc(db, "users", s.uid);
    batch.set(userRef, {
      uid: s.uid,
      role: "student",
      rollNumber: s.roll,
      name: s.name,
      department: s.dept,
      yearSection: s.sec,
      email: s.email,
      proctorId: s.proctorId,
      createdAt: serverTimestamp()
    });

    if (!s.missingAttendance) {
      const attRef = doc(db, "student_attendance", s.roll);
      batch.set(attRef, {
        rollNumber: s.roll,
        studentUid: s.uid,
        studentName: s.name,
        department: s.dept,
        yearSection: s.sec,
        classesConducted: s.conducted,
        classesAttended: s.attended,
        attendancePercentage: s.pct,
        dataAsOf: s.asOf,
        importId: "IMP-2026-003",
        isDataStale: !!s.isStale,
        isUnavailable: s.conducted === 0 || s.pct === null,
        eligibilityStatus: s.eligStatus,
        updatedAt: serverTimestamp()
      });
    }
  }

  // Initial Import Audit Record
  batch.set(importDocRef, {
    importId: "IMP-2026-003",
    fileName: "IMP-2026-003-semester_attendance.csv",
    importedBy: INCHARGE.name,
    importedByUid: INCHARGE.uid,
    importedAt: serverTimestamp(),
    dataAsOf: "2026-10-10",
    totalRows: STUDENTS.length,
    validRows: STUDENTS.filter(s => !s.missingAttendance).length,
    invalidRows: 0,
    status: "COMPLETED"
  });

  await batch.commit();

  // 4. Seed 17 Event Requests
  console.log("Seeding 17 event requests with full workflow and overrides...");
  for (const req of EVENT_REQUESTS) {
    const reqRef = doc(db, "event_requests", req.requestId);
    const docPayload = {
      id: req.requestId,
      referenceNumber: req.requestId,
      studentRollNumber: req.rollNumber,
      eventTitle: req.eventTitle,
      organizer: req.organizer,
      category: req.category,
      venue: req.venue,
      city: req.city,
      startDate: req.startDate,
      endDate: req.endDate,
      eventUrl: req.eventUrl,
      purpose: req.purpose,
      supportingDocumentUrl: req.supportingDocument,
      submittedOn: req.submittedOn,
      status: req.status,
      proctorId: req.proctorId,
      eligibilityAtSubmission: req.eligibilityFlagAtSubmission,
      hasOverlappingEvents: !!req.overlapFlag,
      overlapDetails: req.overlapFlag,
      proctorRecommendation: req.proctorRecommendation,
      proctorRemarks: req.proctorRemarks,
      proctorReviewedOn: req.proctorReviewedOn,
      finalDecision: req.finalDecision,
      finalDecisionRemarks: req.finalRemarks,
      finalDecidedBy: req.decidedBy,
      finalDecidedAt: req.decidedOn,
      approvalReference: req.approvalReference,
      hasAttendanceOverride: req.overrideUsed === "Yes",
      overrideReason: req.overrideReason,
      attendanceSnapshot: {
        attendancePercentage: req.currentAttendancePct,
        eligibilityStatus: req.currentEligibility
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(reqRef, docPayload);

    // Initial History Record
    await setDoc(doc(collection(reqRef, "history")), {
      action: "SUBMITTED",
      status: "Submitted",
      fromStatus: "Draft",
      toStatus: req.status === "Draft" ? "Draft" : "Submitted",
      performedBy: req.rollNumber,
      remarks: "Request submitted by student",
      timestamp: serverTimestamp()
    });

    if (req.proctorRecommendation) {
      await setDoc(doc(collection(reqRef, "history")), {
        action: `PROCTOR_${req.proctorRecommendation}`,
        status: req.status,
        performedBy: req.proctorId,
        remarks: req.proctorRemarks,
        timestamp: serverTimestamp()
      });
    }

    if (req.finalDecision) {
      await setDoc(doc(collection(reqRef, "history")), {
        action: `FINAL_${req.finalDecision}`,
        status: req.status,
        performedBy: req.decidedBy,
        remarks: req.finalRemarks,
        isOverride: req.overrideUsed === "Yes",
        overrideReason: req.overrideReason,
        timestamp: serverTimestamp()
      });
    }
  }

  console.log("--- Database Seeding Completed Successfully! ---");
}

if (process.argv[1]?.endsWith("seed-data.js")) {
  seedAll().catch(err => {
    console.error("Seeding error:", err);
    process.exit(1);
  });
}
