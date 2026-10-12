# backend/dashboard_service.py
from datetime import datetime
from backend.db import get_db
from backend.attendance_service import get_current_threshold

def get_student_dashboard_data(roll_number):
    conn = get_db()
    cursor = conn.cursor()

    # User profile
    cursor.execute("""
    SELECT u.roll_number, u.name, u.email, u.dept, u.year, u.sec, u.semester,
           u.academic_year, u.cgpa, u.backlogs, u.phone, u.proctor_id,
           p.name as proctor_name, p.email as proctor_email
    FROM users u
    LEFT JOIN proctors p ON u.proctor_id = p.linked_id
    WHERE u.roll_number = ?
    """, (roll_number,))
    profile = cursor.fetchone()
    if not profile:
        conn.close()
        raise ValueError(f"Student {roll_number} not found.")
    profile_dict = dict(profile)

    # Attendance
    cursor.execute("SELECT * FROM attendance_records WHERE roll_number = ?", (roll_number,))
    att = cursor.fetchone()
    threshold = get_current_threshold()

    att_dict = {}
    if att:
        att_dict = dict(att)
        att_dict["threshold"] = threshold
    else:
        att_dict = {
            "roll_number": roll_number,
            "classes_conducted": 0,
            "classes_attended": 0,
            "attendance_percentage": None,
            "data_as_of": "N/A",
            "missing_attendance": 1,
            "is_stale": 0,
            "eligibility_status": "Unavailable",
            "threshold": threshold
        }

    # Student Requests
    cursor.execute("""
    SELECT r.*, u.name as student_name, u.dept as student_dept
    FROM event_requests r
    JOIN users u ON r.roll_number = u.roll_number
    WHERE r.roll_number = ?
    ORDER BY r.submitted_on DESC
    """, (roll_number,))
    requests = [dict(r) for r in cursor.fetchall()]
    conn.close()

    total_reqs = len(requests)
    pending_proctor = sum(1 for r in requests if r["status"] in ["Submitted", "Under Proctor Review"])
    pending_incharge = sum(1 for r in requests if r["status"] in ["Pending Final Decision", "Recommended for Approval", "Recommended for Rejection"])
    approved_count = sum(1 for r in requests if r["status"] == "Approved")
    rejected_count = sum(1 for r in requests if r["status"] == "Rejected")
    returned_count = sum(1 for r in requests if r["status"] == "Returned for Correction")

    return {
        "profile": profile_dict,
        "attendance": att_dict,
        "metrics": {
            "total": total_reqs,
            "pendingProctor": pending_proctor,
            "pendingFinalDecision": pending_incharge,
            "approved": approved_count,
            "rejected": rejected_count,
            "returned": returned_count
        },
        "requests": requests
    }

def get_proctor_dashboard_data(proctor_linked_id, filters=None):
    filters = filters or {}
    conn = get_db()
    cursor = conn.cursor()

    # Proctor profile
    cursor.execute("SELECT * FROM proctors WHERE linked_id = ? OR email = ?", (proctor_linked_id, proctor_linked_id))
    proc = cursor.fetchone()
    proc_dict = dict(proc) if proc else {}

    # Assigned students
    cursor.execute("""
    SELECT u.roll_number, u.name, u.email, u.dept, u.year, u.sec,
           a.classes_conducted, a.classes_attended, a.attendance_percentage,
           a.eligibility_status, a.is_stale, a.missing_attendance
    FROM users u
    LEFT JOIN attendance_records a ON u.roll_number = a.roll_number
    WHERE u.proctor_id = ?
    ORDER BY u.roll_number ASC
    """, (proctor_linked_id,))
    students = [dict(s) for s in cursor.fetchall()]

    # Requests assigned to this proctor
    query = """
    SELECT r.*, u.name as student_name, u.dept, u.year, u.sec,
           a.attendance_percentage, a.eligibility_status as current_eligibility
    FROM event_requests r
    JOIN users u ON r.roll_number = u.roll_number
    LEFT JOIN attendance_records a ON r.roll_number = a.roll_number
    WHERE r.proctor_id = ?
    """
    params = [proctor_linked_id]

    if filters.get("status"):
        query += " AND r.status = ?"
        params.append(filters["status"])
    if filters.get("dept"):
        query += " AND u.dept = ?"
        params.append(filters["dept"])
    if filters.get("sec"):
        query += " AND u.sec = ?"
        params.append(filters["sec"])
    if filters.get("roll"):
        query += " AND r.roll_number LIKE ?"
        params.append(f"%{filters['roll']}%")

    query += " ORDER BY r.submitted_on DESC"
    cursor.execute(query, params)
    requests = [dict(r) for r in cursor.fetchall()]
    conn.close()

    pending_reviews = sum(1 for r in requests if r["status"] in ["Submitted", "Under Proctor Review"])
    awaiting_clarification = sum(1 for r in requests if r["status"] == "Returned for Correction")
    ineligible_reqs = sum(1 for r in requests if r.get("current_eligibility") in ["Ineligible", "Unavailable"])
    reviewed_reqs = sum(1 for r in requests if r.get("proctor_recommendation") is not None and r["proctor_recommendation"] != "")

    return {
        "proctor": proc_dict,
        "metrics": {
            "assignedStudents": len(students),
            "pendingReviews": pending_reviews,
            "awaitingClarification": awaiting_clarification,
            "ineligibleRequests": ineligible_reqs,
            "recentlyReviewed": reviewed_reqs
        },
        "assignedStudents": students,
        "requests": requests
    }

def get_incharge_dashboard_data(filters=None):
    filters = filters or {}
    conn = get_db()
    cursor = conn.cursor()

    threshold = get_current_threshold()

    # All requests with student details
    query = """
    SELECT r.*, u.name as student_name, u.dept as department, u.year, u.sec,
           a.attendance_percentage, a.eligibility_status as current_eligibility,
           a.is_stale, a.missing_attendance
    FROM event_requests r
    JOIN users u ON r.roll_number = u.roll_number
    LEFT JOIN attendance_records a ON r.roll_number = a.roll_number
    WHERE 1=1
    """
    params = []

    if filters.get("status"):
        query += " AND r.status = ?"
        params.append(filters["status"])
    if filters.get("dept"):
        query += " AND u.dept = ?"
        params.append(filters["dept"])
    if filters.get("category"):
        query += " AND r.category = ?"
        params.append(filters["category"])
    if filters.get("eligibility"):
        query += " AND a.eligibility_status = ?"
        params.append(filters["eligibility"])

    query += " ORDER BY r.submitted_on DESC"
    cursor.execute(query, params)
    all_requests = [dict(r) for r in cursor.fetchall()]

    # Stats
    cursor.execute("SELECT COUNT(*) as count FROM event_requests")
    total_requests = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM event_requests WHERE status IN ('Submitted', 'Under Proctor Review')")
    pending_proctor = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM event_requests WHERE status IN ('Pending Final Decision', 'Recommended for Approval', 'Recommended for Rejection')")
    pending_final = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM event_requests WHERE status = 'Approved'")
    approved = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM event_requests WHERE status = 'Rejected'")
    rejected = cursor.fetchone()["count"]

    # Flagged for attendance issues (ineligible or stale or unavailable)
    cursor.execute("""
    SELECT COUNT(DISTINCT r.id) as count
    FROM event_requests r
    JOIN attendance_records a ON r.roll_number = a.roll_number
    WHERE a.eligibility_status != 'Eligible' AND r.status NOT IN ('Rejected', 'Withdrawn')
    """)
    flagged_attendance = cursor.fetchone()["count"]

    # Department statistics
    cursor.execute("""
    SELECT u.dept,
           COUNT(r.id) as total_requests,
           SUM(CASE WHEN r.status = 'Approved' THEN 1 ELSE 0 END) as approved_count,
           SUM(CASE WHEN r.status = 'Rejected' THEN 1 ELSE 0 END) as rejected_count,
           SUM(CASE WHEN r.status IN ('Pending Final Decision', 'Recommended for Approval', 'Recommended for Rejection') THEN 1 ELSE 0 END) as pending_count
    FROM users u
    LEFT JOIN event_requests r ON u.roll_number = r.roll_number
    WHERE u.role = 'student' AND u.dept IS NOT NULL
    GROUP BY u.dept
    """)
    dept_stats = [dict(row) for row in cursor.fetchall()]

    # Attendance eligibility distribution
    cursor.execute("""
    SELECT eligibility_status, COUNT(*) as count
    FROM attendance_records
    GROUP BY eligibility_status
    """)
    eligibility_distribution = {row["eligibility_status"]: row["count"] for row in cursor.fetchall()}

    # Latest import stats
    cursor.execute("""
    SELECT batch_id, filename, imported_by, valid_rows, imported_at, status
    FROM attendance_imports
    ORDER BY id DESC LIMIT 1
    """)
    latest_import = cursor.fetchone()
    latest_import_dict = dict(latest_import) if latest_import else None

    # Upcoming approved events
    cursor.execute("""
    SELECT r.reference_number, r.event_title, r.roll_number, u.name as student_name,
           u.dept, r.category, r.start_date, r.end_date, r.venue, r.approval_reference
    FROM event_requests r
    JOIN users u ON r.roll_number = u.roll_number
    WHERE r.status = 'Approved'
    ORDER BY r.start_date ASC
    LIMIT 10
    """)
    upcoming_events = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return {
        "metrics": {
            "totalRequests": total_requests,
            "pendingProctor": pending_proctor,
            "pendingFinalDecision": pending_final,
            "approved": approved,
            "rejected": rejected,
            "flaggedAttendance": flagged_attendance,
            "threshold": threshold
        },
        "departmentStats": dept_stats,
        "eligibilityDistribution": eligibility_distribution,
        "latestImport": latest_import_dict,
        "upcomingApprovedEvents": upcoming_events,
        "requests": all_requests
    }
