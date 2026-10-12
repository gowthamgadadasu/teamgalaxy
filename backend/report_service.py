# backend/report_service.py
import csv
import io
import openpyxl
from backend.db import get_db

def generate_attendance_report(file_format="csv", filters=None):
    filters = filters or {}
    conn = get_db()
    cursor = conn.cursor()

    query = """
    SELECT a.roll_number, a.student_name, a.department, a.year_section,
           a.classes_conducted, a.classes_attended, a.attendance_percentage,
           a.data_as_of, a.eligibility_status, u.proctor_id
    FROM attendance_records a
    LEFT JOIN users u ON a.roll_number = u.roll_number
    WHERE 1=1
    """
    params = []

    if filters.get("department"):
        query += " AND a.department = ?"
        params.append(filters["department"])
    if filters.get("eligibility"):
        query += " AND a.eligibility_status = ?"
        params.append(filters["eligibility"])
    if filters.get("proctorId"):
        query += " AND u.proctor_id = ?"
        params.append(filters["proctorId"])
    if filters.get("rollNumber"):
        query += " AND a.roll_number LIKE ?"
        params.append(f"%{filters['rollNumber']}%")
    if filters.get("minPct") is not None:
        query += " AND a.attendance_percentage >= ?"
        params.append(float(filters["minPct"]))
    if filters.get("maxPct") is not None:
        query += " AND a.attendance_percentage <= ?"
        params.append(float(filters["maxPct"]))

    query += " ORDER BY a.roll_number ASC"
    cursor.execute(query, params)
    records = [dict(r) for r in cursor.fetchall()]
    conn.close()

    headers = [
        "Roll Number", "Student Name", "Department", "Year / Section",
        "Classes Conducted", "Classes Attended", "Attendance Percentage",
        "Eligibility Status", "Data As Of", "Assigned Proctor"
    ]

    rows = []
    for r in records:
        pct_str = f"{r['attendance_percentage']:.2f}%" if r["attendance_percentage"] is not None else "Unavailable"
        rows.append([
            r["roll_number"], r["student_name"], r["department"], r["year_section"],
            r["classes_conducted"] if r["classes_conducted"] is not None else "N/A",
            r["classes_attended"] if r["classes_attended"] is not None else "N/A",
            pct_str, r["eligibility_status"], r["data_as_of"] or "N/A", r["proctor_id"] or "N/A"
        ])

    if file_format.lower() == "xlsx":
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Attendance Eligibility Report"
        ws.append(headers)
        for row in rows:
            ws.append(row)
        out = io.BytesIO()
        wb.save(out)
        out.seek(0)
        return out.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "attendance_eligibility_report.xlsx"
    else:
        out = io.StringIO()
        writer = csv.writer(out)
        writer.writerow(headers)
        for row in rows:
            writer.writerow(row)
        return out.getvalue().encode("utf-8"), "text/csv", "attendance_eligibility_report.csv"

def generate_requests_report(file_format="csv", filters=None):
    filters = filters or {}
    conn = get_db()
    cursor = conn.cursor()

    query = """
    SELECT r.reference_number, r.roll_number, u.name as student_name, u.dept,
           r.event_title, r.organizer, r.category, r.venue, r.city,
           r.start_date, r.end_date, r.status, r.proctor_id,
           r.proctor_recommendation, r.proctor_remarks,
           r.final_decision, r.final_remarks, r.approval_reference,
           r.override_used, r.override_reason, r.submitted_on
    FROM event_requests r
    LEFT JOIN users u ON r.roll_number = u.roll_number
    WHERE 1=1
    """
    params = []

    if filters.get("department"):
        query += " AND u.dept = ?"
        params.append(filters["department"])
    if filters.get("category"):
        query += " AND r.category = ?"
        params.append(filters["category"])
    if filters.get("status"):
        query += " AND r.status = ?"
        params.append(filters["status"])
    if filters.get("proctorId"):
        query += " AND r.proctor_id = ?"
        params.append(filters["proctorId"])
    if filters.get("finalDecision"):
        query += " AND r.final_decision = ?"
        params.append(filters["finalDecision"])
    if filters.get("startDate"):
        query += " AND r.start_date >= ?"
        params.append(filters["startDate"])
    if filters.get("endDate"):
        query += " AND r.end_date <= ?"
        params.append(filters["endDate"])

    query += " ORDER BY r.submitted_on DESC"
    cursor.execute(query, params)
    records = [dict(r) for r in cursor.fetchall()]
    conn.close()

    headers = [
        "Reference Number", "Roll Number", "Student Name", "Department",
        "Event Title", "Organizer", "Category", "Venue", "Dates",
        "Status", "Proctor ID", "Proctor Recommendation", "Proctor Remarks",
        "Final Decision", "Approval Reference", "Override Used", "Override Reason",
        "Final Remarks", "Submission Date"
    ]

    rows = []
    for r in records:
        dates = f"{r['start_date']} to {r['end_date']}"
        rows.append([
            r["reference_number"], r["roll_number"], r["student_name"] or "", r["dept"] or "",
            r["event_title"], r["organizer"], r["category"], f"{r['venue']}, {r['city'] or ''}", dates,
            r["status"], r["proctor_id"] or "", r["proctor_recommendation"] or "Pending", r["proctor_remarks"] or "",
            r["final_decision"] or "Pending", r["approval_reference"] or "N/A",
            r["override_used"], r["override_reason"] or "",
            r["final_remarks"] or "", r["submitted_on"]
        ])

    if file_format.lower() == "xlsx":
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Event Approvals Report"
        ws.append(headers)
        for row in rows:
            ws.append(row)
        out = io.BytesIO()
        wb.save(out)
        out.seek(0)
        return out.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "event_approvals_report.xlsx"
    else:
        out = io.StringIO()
        writer = csv.writer(out)
        writer.writerow(headers)
        for row in rows:
            writer.writerow(row)
        return out.getvalue().encode("utf-8"), "text/csv", "event_approvals_report.csv"
