# backend/request_service.py
import os
import random
from datetime import datetime
from backend.db import get_db
from backend.attendance_service import get_current_threshold

EVENT_CATEGORIES = [
    "Hackathon",
    "Workshop",
    "Conference",
    "Technical Competition",
    "Industrial Visit",
    "Other"
]

WORKFLOW_STATUSES = {
    "DRAFT": "Draft",
    "SUBMITTED": "Submitted",
    "UNDER_PROCTOR_REVIEW": "Under Proctor Review",
    "RETURNED_FOR_CORRECTION": "Returned for Correction",
    "RECOMMENDED_FOR_APPROVAL": "Recommended for Approval",
    "RECOMMENDED_FOR_REJECTION": "Recommended for Rejection",
    "PENDING_FINAL_DECISION": "Pending Final Decision",
    "APPROVED": "Approved",
    "REJECTED": "Rejected",
    "WITHDRAWN": "Withdrawn"
}

def generate_reference_number():
    year = datetime.now().year
    rand_id = random.randint(1000, 9999)
    return f"TEP-{year}-{rand_id}"

def detect_overlaps(roll_number, start_date, end_date, exclude_request_id=None):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, reference_number, event_title, start_date, end_date, status
    FROM event_requests
    WHERE roll_number = ? AND status NOT IN ('Withdrawn', 'Rejected')
    """, (roll_number,))
    existing = [dict(r) for r in cursor.fetchall()]
    conn.close()

    conflicts = []
    new_start = start_date
    new_end = end_date

    for req in existing:
        if exclude_request_id and req["id"] == exclude_request_id:
            continue
        ex_start = req["start_date"]
        ex_end = req["end_date"]
        # Interval overlap: existingStart <= newEnd AND existingEnd >= newStart
        if ex_start <= new_end and ex_end >= new_start:
            conflicts.append(req)

    return conflicts

def validate_request_data(data):
    errors = []
    title = (data.get("eventTitle") or data.get("title") or "").strip()
    organizer = (data.get("organizer") or "").strip()
    category = (data.get("category") or "").strip()
    venue = (data.get("venue") or "").strip()
    start_date = (data.get("startDate") or "").strip()
    end_date = (data.get("endDate") or "").strip()
    purpose = (data.get("purpose") or "").strip()

    if not title:
        errors.append("Event title is required")
    if not organizer:
        errors.append("Organizer name is required")
    if not category or category not in EVENT_CATEGORIES:
        errors.append(f"Category must be one of: {', '.join(EVENT_CATEGORIES)}")
    if not venue:
        errors.append("Venue and city are required")
    if not start_date:
        errors.append("Start date is required")
    if not end_date:
        errors.append("End date is required")
    if start_date and end_date and end_date < start_date:
        errors.append("End date cannot be earlier than start date")
    if not purpose:
        errors.append("Purpose and expected technical benefit are required")

    return errors

def get_student_eligibility_snapshot(roll_number):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM attendance_records WHERE roll_number = ?", (roll_number,))
    att = cursor.fetchone()
    conn.close()

    if not att or att["missing_attendance"] == 1 or att["classes_conducted"] is None or att["classes_conducted"] == 0:
        return "Unavailable", None

    threshold = get_current_threshold()
    pct = att["attendance_percentage"]

    if att["is_stale"] == 1:
        return "Stale - Verify", pct
    if pct is not None and pct >= threshold:
        return "Eligible", pct
    return "Ineligible", pct

def create_event_request(roll_number, data, file_attachment=None, save_as_draft=False):
    errors = validate_request_data(data)
    if errors and not save_as_draft:
        raise ValueError("; ".join(errors))

    conn = get_db()
    cursor = conn.cursor()

    # Get student info for proctor mapping
    cursor.execute("SELECT name, proctor_id FROM users WHERE roll_number = ?", (roll_number,))
    student = cursor.fetchone()
    if not student:
        conn.close()
        raise ValueError(f"Student with roll number {roll_number} not found.")

    student_name = student["name"]
    proctor_id = student["proctor_id"] or "P01"

    # Eligibility from active dataset
    eligibility_flag, current_pct = get_student_eligibility_snapshot(roll_number)

    # Overlap detection
    start_date = data.get("startDate")
    end_date = data.get("endDate")
    conflicts = detect_overlaps(roll_number, start_date, end_date)
    overlap_flag = ""
    if conflicts:
        first_c = conflicts[0]
        overlap_flag = f"Overlaps {first_c['reference_number']} ({first_c['start_date']} to {first_c['end_date']})"

    req_id = f"req_{int(datetime.now().timestamp() * 1000)}"
    ref_num = generate_reference_number()
    initial_status = "Draft" if save_as_draft else "Submitted"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Document handling
    doc_name = data.get("supportingDocName", "")
    doc_url = data.get("supportingDocUrl", data.get("eventUrl", ""))

    if file_attachment:
        # Save file securely
        filename = f"{ref_num}_{file_attachment.filename}"
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, filename)
        file_attachment.save(file_path)
        doc_name = file_attachment.filename
        doc_url = f"/uploads/{filename}"

    cursor.execute("""
    INSERT INTO event_requests (
        id, reference_number, roll_number, event_title, organizer,
        category, venue, city, start_date, end_date, event_url,
        purpose, supporting_doc_name, supporting_doc_url, status,
        proctor_id, eligibility_flag_at_submission, overlap_flag,
        proctor_recommendation, proctor_remarks, proctor_reviewed_on,
        final_decision, final_remarks, decided_by, decided_on,
        approval_reference, override_used, override_reason, submitted_on, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        req_id, ref_num, roll_number, data.get("eventTitle", ""),
        data.get("organizer", ""), data.get("category", "Workshop"),
        data.get("venue", ""), data.get("city", ""),
        start_date, end_date, data.get("eventUrl", ""),
        data.get("purpose", ""), doc_name, doc_url,
        initial_status, proctor_id, eligibility_flag, overlap_flag,
        None, "", "", None,
        "Submitted (Date overlap flagged)" if overlap_flag else "Submitted for Proctor Review" if initial_status == "Submitted" else "Saved as Draft",
        "", "", "", "No", "", now_str, now_str
    ))

    # Add audit history
    cursor.execute("""
    INSERT INTO request_history (
        request_id, action, from_status, to_status,
        performed_by, performed_by_name, performed_by_role,
        remarks, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        req_id, "DRAFT_SAVED" if save_as_draft else "SUBMITTED",
        None, initial_status, roll_number, f"{student_name} ({roll_number})", "student",
        "Request saved as draft" if save_as_draft else ("Request submitted with date overlap flag" if overlap_flag else "Request submitted for proctor review"),
        now_str
    ))

    conn.commit()
    conn.close()

    return {
        "id": req_id,
        "referenceNumber": ref_num,
        "status": initial_status,
        "hasOverlap": bool(overlap_flag),
        "overlapFlag": overlap_flag,
        "eligibilityFlag": eligibility_flag
    }

def update_event_request(req_id, roll_number, data, file_attachment=None, submit=True):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM event_requests WHERE id = ?", (req_id,))
    req = cursor.fetchone()

    if not req:
        conn.close()
        raise ValueError(f"Request {req_id} not found.")

    if req["roll_number"] != roll_number:
        conn.close()
        raise PermissionError("You can only edit your own requests.")

    # Status check: only Draft or Returned for Correction permitted
    if req["status"] not in ["Draft", "Returned for Correction"]:
        conn.close()
        raise PermissionError(f"Cannot edit request in status '{req['status']}'. Editing is only permitted for Draft or Returned for Correction.")

    errors = validate_request_data(data)
    if errors and submit:
        conn.close()
        raise ValueError("; ".join(errors))

    start_date = data.get("startDate", req["start_date"])
    end_date = data.get("endDate", req["end_date"])
    conflicts = detect_overlaps(roll_number, start_date, end_date, exclude_request_id=req_id)
    overlap_flag = ""
    if conflicts:
        first_c = conflicts[0]
        overlap_flag = f"Overlaps {first_c['reference_number']} ({first_c['start_date']} to {first_c['end_date']})"

    doc_name = req["supporting_doc_name"]
    doc_url = req["supporting_doc_url"]

    if file_attachment:
        filename = f"{req['reference_number']}_{file_attachment.filename}"
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, filename)
        file_attachment.save(file_path)
        doc_name = file_attachment.filename
        doc_url = f"/uploads/{filename}"
    elif data.get("eventUrl"):
        doc_url = data.get("eventUrl")

    new_status = "Submitted" if submit else req["status"]
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
    UPDATE event_requests SET
        event_title = ?, organizer = ?, category = ?, venue = ?, city = ?,
        start_date = ?, end_date = ?, event_url = ?, purpose = ?,
        supporting_doc_name = ?, supporting_doc_url = ?, status = ?,
        overlap_flag = ?, final_remarks = ?, updated_at = ?
    WHERE id = ?
    """, (
        data.get("eventTitle", req["event_title"]),
        data.get("organizer", req["organizer"]),
        data.get("category", req["category"]),
        data.get("venue", req["venue"]),
        data.get("city", req["city"]),
        start_date, end_date,
        data.get("eventUrl", req["event_url"]),
        data.get("purpose", req["purpose"]),
        doc_name, doc_url, new_status, overlap_flag,
        "Re-submitted after correction" if submit and req["status"] == "Returned for Correction" else req["final_remarks"],
        now_str, req_id
    ))

    cursor.execute("""
    INSERT INTO request_history (
        request_id, action, from_status, to_status,
        performed_by, performed_by_name, performed_by_role,
        remarks, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        req_id, "RESUBMITTED" if submit else "EDITED",
        req["status"], new_status, roll_number, f"Student ({roll_number})", "student",
        "Request updated and resubmitted for review" if submit else "Request updated by student",
        now_str
    ))

    conn.commit()
    conn.close()

    return {"id": req_id, "status": new_status, "overlapFlag": overlap_flag}

def withdraw_event_request(req_id, roll_number, reason="Withdrawn by student"):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM event_requests WHERE id = ?", (req_id,))
    req = cursor.fetchone()

    if not req:
        conn.close()
        raise ValueError("Request not found.")

    if req["roll_number"] != roll_number:
        conn.close()
        raise PermissionError("You can only withdraw your own requests.")

    if req["status"] in ["Approved", "Rejected", "Withdrawn"]:
        conn.close()
        raise PermissionError(f"Cannot withdraw request in finalized status '{req['status']}'.")

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
    UPDATE event_requests SET
        status = 'Withdrawn',
        final_remarks = ?,
        updated_at = ?
    WHERE id = ?
    """, (f"Withdrawn: {reason}", now_str, req_id))

    cursor.execute("""
    INSERT INTO request_history (
        request_id, action, from_status, to_status,
        performed_by, performed_by_name, performed_by_role,
        remarks, timestamp
    ) VALUES (?, 'WITHDRAWN', ?, 'Withdrawn', ?, ?, 'student', ?, ?)
    """, (
        req_id, req["status"], roll_number, f"Student ({roll_number})",
        reason, now_str
    ))

    conn.commit()
    conn.close()
    return {"id": req_id, "status": "Withdrawn"}

def proctor_review_request(req_id, proctor_user, recommendation, remarks):
    # Rule 1: Proctor cannot make final decision
    if recommendation in ["APPROVE", "REJECT"]:
        raise PermissionError("Permission Denied: A proctor cannot issue the final decision. Proctors can only recommend approval/rejection or return for correction.")

    if recommendation not in ["RECOMMEND_APPROVAL", "RECOMMEND_REJECTION", "RETURN_FOR_CORRECTION"]:
        raise ValueError(f"Invalid recommendation '{recommendation}'. Must be RECOMMEND_APPROVAL, RECOMMEND_REJECTION, or RETURN_FOR_CORRECTION.")

    if not remarks or not remarks.strip():
        raise ValueError("Proctor remarks are mandatory when submitting a recommendation.")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM event_requests WHERE id = ?", (req_id,))
    req = cursor.fetchone()

    if not req:
        conn.close()
        raise ValueError("Request not found.")

    # Rule 2: A proctor cannot review requests of students assigned to another proctor
    proctor_linked_id = proctor_user.get("linked_id") or proctor_user.get("roll_number") or proctor_user.get("uid")
    if req["proctor_id"] and req["proctor_id"] != proctor_linked_id:
        conn.close()
        raise PermissionError(f"Unauthorized: This request belongs to a student assigned to another proctor ({req['proctor_id']})")

    next_status = ""
    proctor_rec_label = ""
    if recommendation == "RECOMMEND_APPROVAL":
        next_status = "Pending Final Decision" # or "Recommended for Approval"
        proctor_rec_label = "Recommend Approval"
    elif recommendation == "RECOMMEND_REJECTION":
        next_status = "Pending Final Decision"
        proctor_rec_label = "Recommend Rejection"
    elif recommendation == "RETURN_FOR_CORRECTION":
        next_status = "Returned for Correction"
        proctor_rec_label = "Return for Clarification"

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
    UPDATE event_requests SET
        status = ?,
        proctor_recommendation = ?,
        proctor_remarks = ?,
        proctor_reviewed_on = ?,
        final_remarks = ?,
        updated_at = ?
    WHERE id = ?
    """, (
        next_status, proctor_rec_label, remarks.strip(),
        now_str, f"Proctor recommendation: {proctor_rec_label}", now_str, req_id
    ))

    cursor.execute("""
    INSERT INTO request_history (
        request_id, action, from_status, to_status,
        performed_by, performed_by_name, performed_by_role,
        remarks, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, 'proctor', ?, ?)
    """, (
        req_id, f"PROCTOR_{recommendation}", req["status"], next_status,
        proctor_user.get("email"), proctor_user.get("name", "Proctor"),
        remarks.strip(), now_str
    ))

    conn.commit()
    conn.close()
    return {"id": req_id, "status": next_status, "recommendation": proctor_rec_label}

def incharge_decide_request(req_id, incharge_user, decision, remarks, override=False, override_reason=""):
    if decision not in ["Approved", "Rejected", "Returned for Correction"]:
        raise ValueError(f"Invalid decision '{decision}'. Must be Approved, Rejected, or Returned for Correction.")

    if not remarks or not remarks.strip():
        raise ValueError("Remarks / reason are mandatory for final decision.")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM event_requests WHERE id = ?", (req_id,))
    req = cursor.fetchone()

    if not req:
        conn.close()
        raise ValueError("Request not found.")

    # Rule 3: Check attendance eligibility for normal approval
    # Fetch current attendance
    cursor.execute("SELECT * FROM attendance_records WHERE roll_number = ?", (req["roll_number"],))
    att = cursor.fetchone()

    is_eligible = (att and att["eligibility_status"] == "Eligible") if att else False

    if decision == "Approved" and not is_eligible:
        if not override:
            conn.close()
            raise PermissionError("Cannot approve request for an attendance-ineligible student without an explicit recorded override.")
        if not override_reason or not override_reason.strip():
            conn.close()
            raise ValueError("An explicit override reason is required when approving an ineligible student.")

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    apr_ref = f"APR-{datetime.now().year}-{random.randint(1000, 9999)}" if decision == "Approved" else ""

    cursor.execute("""
    UPDATE event_requests SET
        status = ?,
        final_decision = ?,
        final_remarks = ?,
        decided_by = ?,
        decided_on = ?,
        approval_reference = ?,
        override_used = ?,
        override_reason = ?,
        updated_at = ?
    WHERE id = ?
    """, (
        decision, decision, remarks.strip(),
        incharge_user.get("email"), now_str, apr_ref,
        "Yes" if override else "No",
        override_reason.strip() if override else "",
        now_str, req_id
    ))

    audit_note = remarks.strip()
    if override:
        audit_note += f" [Override: {override_reason.strip()}]"

    cursor.execute("""
    INSERT INTO request_history (
        request_id, action, from_status, to_status,
        performed_by, performed_by_name, performed_by_role,
        remarks, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, 'incharge', ?, ?)
    """, (
        req_id, f"FINAL_{decision.upper().replace(' ', '_')}", req["status"], decision,
        incharge_user.get("email"), incharge_user.get("name", "In-Charge"),
        audit_note, now_str
    ))

    conn.commit()
    conn.close()
    return {
        "id": req_id,
        "status": decision,
        "finalDecision": decision,
        "approvalReference": apr_ref,
        "overrideUsed": "Yes" if override else "No"
    }

def get_request_timeline(req_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT action, from_status, to_status, performed_by, performed_by_name, performed_by_role, remarks, timestamp
    FROM request_history
    WHERE request_id = ?
    ORDER BY id ASC
    """, (req_id,))
    timeline = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return timeline
