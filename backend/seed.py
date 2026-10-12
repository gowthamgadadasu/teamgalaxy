# backend/seed.py
import os
import json
from datetime import datetime
from backend.db import get_db, init_db

def seed_database():
    init_db()
    conn = get_db()
    cursor = conn.cursor()

    json_path = os.path.join(os.path.dirname(__file__), "seed_data.json")
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found.")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    incharge = data.get("INCHARGE", {})
    admin = data.get("ADMIN", {})
    proctors = data.get("PROCTORS", [])
    students = data.get("STUDENTS", [])
    requests = data.get("EVENT_REQUESTS", [])

    print("Seeding incharge and admin...")
    cursor.execute("""
    INSERT OR REPLACE INTO users (uid, roll_number, name, email, password, role, dept, year, sec, semester, academic_year, cgpa, backlogs, phone, proctor_id, proctor_uid)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        incharge.get("uid"), incharge.get("linkedId"), incharge.get("name"),
        incharge.get("email"), incharge.get("passwordPlain"), incharge.get("role", "incharge"),
        incharge.get("department"), None, None, None, None, None, 0, None, None, None
    ))

    cursor.execute("""
    INSERT OR REPLACE INTO users (uid, roll_number, name, email, password, role, dept, year, sec, semester, academic_year, cgpa, backlogs, phone, proctor_id, proctor_uid)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        admin.get("uid"), admin.get("linkedId"), admin.get("name"),
        admin.get("email"), admin.get("passwordPlain"), "incharge",
        admin.get("department"), None, None, None, None, None, 0, None, None, None
    ))

    print(f"Seeding {len(proctors)} proctors...")
    for p in proctors:
        cursor.execute("""
        INSERT OR REPLACE INTO proctors (uid, linked_id, name, email, password, role, department, designation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            p.get("uid"), p.get("linkedId"), p.get("name"),
            p.get("email"), p.get("passwordPlain"), p.get("role", "proctor"),
            p.get("department"), p.get("designation")
        ))
        cursor.execute("""
        INSERT OR REPLACE INTO users (uid, roll_number, name, email, password, role, dept, year, sec, semester, academic_year, cgpa, backlogs, phone, proctor_id, proctor_uid)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            p.get("uid"), p.get("linkedId"), p.get("name"),
            p.get("email"), p.get("passwordPlain"), "proctor",
            p.get("department"), None, None, None, None, None, 0, None, None, None
        ))

    print(f"Seeding {len(students)} students and active attendance dataset...")
    for s in students:
        cursor.execute("""
        INSERT OR REPLACE INTO users (uid, roll_number, name, email, password, role, dept, year, sec, semester, academic_year, cgpa, backlogs, phone, proctor_id, proctor_uid)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            s.get("uid"), s.get("roll"), s.get("name"),
            s.get("email"), s.get("passwordPlain"), "student",
            s.get("dept"), s.get("year"), s.get("sec"),
            s.get("semester"), s.get("academicYear"),
            s.get("cgpa"), s.get("backlogs", 0), s.get("phone"),
            s.get("proctorId"), s.get("proctorUid")
        ))

        # Attendance record
        cursor.execute("""
        INSERT OR REPLACE INTO attendance_records (
            roll_number, student_name, department, year_section,
            classes_conducted, classes_attended, attendance_percentage,
            data_as_of, missing_attendance, is_stale, eligibility_status,
            last_imported_at, import_batch_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            s.get("roll"), s.get("name"), s.get("dept"),
            f"{s.get('year')}/{s.get('sec')}",
            s.get("conducted"), s.get("attended"), s.get("pct"),
            s.get("asOf"), 1 if s.get("missingAttendance") else 0,
            1 if s.get("isStale") else 0, s.get("eligStatus"),
            "2026-10-10 10:00:00", "BATCH-INITIAL"
        ))

    # Initial Import Batch Record
    cursor.execute("""
    INSERT OR REPLACE INTO attendance_imports (
        batch_id, filename, imported_by, total_rows, valid_rows, invalid_rows,
        unmatched_rows, duplicate_rows, imported_at, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "BATCH-INITIAL", "institutional_attendance_master_v1.csv", "tech.incharge@techuniv.edu.in",
        32, 30, 2, 0, 0, "2026-10-10 10:00:00", "SUCCESS", "Initial institutional attendance baseline dataset"
    ))

    print(f"Seeding {len(requests)} event requests...")
    for r in requests:
        req_id = r.get("requestId")
        cursor.execute("""
        INSERT OR REPLACE INTO event_requests (
            id, reference_number, roll_number, event_title, organizer,
            category, venue, city, start_date, end_date, event_url,
            purpose, supporting_doc_name, supporting_doc_url, status,
            proctor_id, eligibility_flag_at_submission, overlap_flag,
            proctor_recommendation, proctor_remarks, proctor_reviewed_on,
            final_decision, final_remarks, decided_by, decided_on,
            approval_reference, override_used, override_reason, submitted_on, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            req_id, req_id, r.get("rollNumber"), r.get("eventTitle"),
            r.get("organizer"), r.get("category"), r.get("venue"),
            r.get("city"), r.get("startDate"), r.get("endDate"),
            r.get("eventUrl", ""), r.get("purpose"),
            r.get("supportingDocument", ""), "",
            r.get("status"), r.get("proctorId"),
            r.get("eligibilityFlagAtSubmission"), r.get("overlapFlag", ""),
            r.get("proctorRecommendation"), r.get("proctorRemarks", ""),
            r.get("proctorReviewedOn", ""), r.get("finalDecision"),
            r.get("finalRemarks", ""), r.get("decidedBy", ""),
            r.get("decidedOn", ""), r.get("approvalReference", ""),
            r.get("overrideUsed", "No"), r.get("overrideReason", ""),
            r.get("submittedOn"), r.get("submittedOn")
        ))

        # Clear existing history for clean seed
        cursor.execute("DELETE FROM request_history WHERE request_id = ?", (req_id,))

        # Submission history
        cursor.execute("""
        INSERT INTO request_history (request_id, action, from_status, to_status, performed_by, performed_by_name, performed_by_role, remarks, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            req_id, "SUBMIT", None, "Submitted", r.get("rollNumber"),
            f"Student ({r.get('rollNumber')})", "student",
            "Event request submitted for proctor review", r.get("submittedOn")
        ))

        # Proctor history if reviewed
        if r.get("proctorRecommendation"):
            cursor.execute("""
            INSERT INTO request_history (request_id, action, from_status, to_status, performed_by, performed_by_name, performed_by_role, remarks, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                req_id, f"PROCTOR_{r.get('proctorRecommendation').upper().replace(' ', '_')}",
                "Submitted", r.get("status"), r.get("proctorId"),
                f"Proctor ({r.get('proctorId')})", "proctor",
                r.get("proctorRemarks", ""), r.get("proctorReviewedOn")
            ))

        # Decision history if decided
        if r.get("finalDecision"):
            cursor.execute("""
            INSERT INTO request_history (request_id, action, from_status, to_status, performed_by, performed_by_name, performed_by_role, remarks, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                req_id, f"FINAL_{r.get('finalDecision').upper()}",
                "Pending Final Decision", r.get("status"), r.get("decidedBy"),
                "Technical-Event In-Charge", "incharge",
                r.get("finalRemarks", "") + (f" [Override: {r.get('overrideReason')}]" if r.get("overrideUsed") == 'Yes' else ""),
                r.get("decidedOn")
            ))

    conn.commit()
    conn.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
