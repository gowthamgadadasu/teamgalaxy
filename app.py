# app.py
import os
import sys
import secrets
from datetime import datetime
from flask import (
    Flask, request, jsonify, session, send_from_directory,
    send_file, Response, redirect, url_for
)
from flask_cors import CORS

from backend.db import get_db, init_db
from backend.seed import seed_database
from backend.attendance_service import (
    get_current_threshold, set_threshold,
    generate_csv_template, generate_xlsx_template,
    parse_file_to_rows, validate_attendance_preview,
    commit_attendance_import, get_import_history
)
from backend.request_service import (
    create_event_request, update_event_request,
    withdraw_event_request, proctor_review_request,
    incharge_decide_request, get_request_timeline,
    detect_overlaps, EVENT_CATEGORIES, WORKFLOW_STATUSES
)
from backend.dashboard_service import (
    get_student_dashboard_data,
    get_proctor_dashboard_data,
    get_incharge_dashboard_data
)
from backend.report_service import (
    generate_attendance_report,
    generate_requests_report
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

app = Flask(__name__, static_folder=BASE_DIR, static_url_path="")
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(24))
CORS(app, supports_credentials=True)

# Ensure DB initialized & seeded on startup if empty
init_db()
conn = get_db()
c = conn.cursor()
c.execute("SELECT COUNT(*) as count FROM users")
if c.fetchone()["count"] == 0:
    conn.close()
    seed_database()
else:
    conn.close()

# Helper: Get current session user
def get_current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, uid, roll_number, name, email, role, dept, year, sec, proctor_id FROM users WHERE id = ?", (user_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

# -----------------------------------------------------------------------------
# Static & Page Routes
# -----------------------------------------------------------------------------
@app.route("/")
def index_page():
    return send_from_directory(BASE_DIR, "index.html")

@app.route("/<path:path>")
def serve_static(path):
    # Security: avoid escaping directory
    safe_path = os.path.normpath(path)
    full_path = os.path.join(BASE_DIR, safe_path)
    if os.path.exists(full_path) and os.path.isfile(full_path):
        return send_from_directory(BASE_DIR, safe_path)
    if not safe_path.endswith(".html"):
        html_safe = safe_path + ".html"
        html_full = os.path.join(BASE_DIR, html_safe)
        if os.path.exists(html_full) and os.path.isfile(html_full):
            return send_from_directory(BASE_DIR, html_safe)
    return jsonify({"error": "File not found"}), 404

@app.errorhandler(404)
def handle_404(e):
    path = request.path.lstrip("/")
    safe_path = os.path.normpath(path)
    html_safe = safe_path + ".html"
    html_full = os.path.join(BASE_DIR, html_safe)
    if os.path.exists(html_full) and os.path.isfile(html_full):
        return send_from_directory(BASE_DIR, html_safe)
    return jsonify({"error": "File not found"}), 404

@app.route("/uploads/<filename>")
def serve_upload(filename):
    return send_from_directory(UPLOADS_DIR, filename)

# -----------------------------------------------------------------------------
# Authentication Endpoints
# -----------------------------------------------------------------------------
@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    identifier = (data.get("email") or data.get("username") or data.get("rollNumber") or data.get("roll") or "").strip()
    password = (data.get("password") or "").strip()

    if not identifier or not password:
        return jsonify({"success": False, "error": "Email/Roll Number and password are required"}), 400

    conn = get_db()
    c = conn.cursor()
    # Match email, roll_number, or uid case-insensitively
    c.execute("""
    SELECT * FROM users 
    WHERE LOWER(email) = LOWER(?) 
       OR LOWER(roll_number) = LOWER(?)
       OR LOWER(uid) = LOWER(?)
    """, (identifier, identifier, identifier))
    user = c.fetchone()
    conn.close()

    if not user or user["password"] != password:
        return jsonify({"success": False, "error": "Invalid institutional credentials. Please check your official email and password."}), 401

    user_dict = dict(user)
    session["user_id"] = user_dict["id"]
    session["role"] = user_dict["role"]
    session["roll_number"] = user_dict["roll_number"]
    session["email"] = user_dict["email"]

    # remove sensitive plain password
    del user_dict["password"]

    return jsonify({
        "success": True,
        "message": f"Welcome back, {user_dict['name']}!",
        "user": user_dict
    })

@app.route("/api/auth/logout", methods=["POST", "GET"])
def auth_logout():
    session.clear()
    return jsonify({"success": True, "message": "Signed out successfully."})

@app.route("/api/auth/me", methods=["GET"])
def auth_me():
    user = get_current_user()
    if not user:
        return jsonify({"authenticated": False}), 401
    return jsonify({"authenticated": True, "user": user})

# -----------------------------------------------------------------------------
# Student Endpoints (Modules 2, 3, 4, 5)
# -----------------------------------------------------------------------------
@app.route("/api/student/dashboard", methods=["GET"])
def student_dashboard():
    roll = request.args.get("roll") or session.get("roll_number")
    if not roll:
        # Default to first student if direct visit
        roll = "24AI001"
    try:
        data = get_student_dashboard_data(roll)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/student/profile", methods=["GET"])
def student_profile():
    roll = request.args.get("roll") or session.get("roll_number") or "24AI001"
    try:
        data = get_student_dashboard_data(roll)
        return jsonify({
            "profile": data["profile"],
            "attendance": data["attendance"],
            "metrics": data["metrics"]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/student/requests", methods=["GET"])
def student_get_requests():
    roll = request.args.get("roll") or session.get("roll_number") or "24AI001"
    try:
        data = get_student_dashboard_data(roll)
        return jsonify({"requests": data["requests"]})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/student/requests", methods=["POST"])
def student_submit_request():
    roll = request.form.get("rollNumber") or session.get("roll_number") or "24AI001"
    file = request.files.get("supportingDocument") or request.files.get("supportingDoc")
    save_draft = request.form.get("saveDraft") in ["true", "True", "1"]

    form_data = {
        "eventTitle": request.form.get("eventTitle") or request.form.get("title"),
        "organizer": request.form.get("organizer"),
        "category": request.form.get("category"),
        "venue": request.form.get("venue"),
        "city": request.form.get("city") or "",
        "startDate": request.form.get("startDate"),
        "endDate": request.form.get("endDate"),
        "eventUrl": request.form.get("eventUrl") or "",
        "purpose": request.form.get("purpose"),
        "supportingDocUrl": request.form.get("supportingDocUrl") or ""
    }

    # If submitted as JSON
    if not form_data["eventTitle"] and request.is_json:
        json_data = request.get_json()
        roll = json_data.get("rollNumber") or roll
        save_draft = json_data.get("saveDraft", False)
        form_data = json_data

    try:
        res = create_event_request(roll, form_data, file_attachment=file, save_as_draft=save_draft)
        return jsonify({"success": True, "result": res}), 201
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/student/requests/<req_id>", methods=["PUT", "POST"])
def student_edit_request(req_id):
    roll = request.form.get("rollNumber") or session.get("roll_number") or "24AI001"
    file = request.files.get("supportingDocument") or request.files.get("supportingDoc")
    submit = request.form.get("submit", "true") in ["true", "True", "1"]

    form_data = request.form.to_dict() if request.form else (request.get_json(silent=True) or {})
    if "rollNumber" in form_data:
        roll = form_data["rollNumber"]

    try:
        res = update_event_request(req_id, roll, form_data, file_attachment=file, submit=submit)
        return jsonify({"success": True, "result": res})
    except PermissionError as pe:
        return jsonify({"success": False, "error": str(pe)}), 403
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/student/requests/<req_id>/withdraw", methods=["POST"])
def student_withdraw_request(req_id):
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    roll = data.get("rollNumber") or session.get("roll_number") or "24AI001"
    reason = data.get("reason", "Withdrawn by student")

    try:
        res = withdraw_event_request(req_id, roll, reason=reason)
        return jsonify({"success": True, "result": res})
    except PermissionError as pe:
        return jsonify({"success": False, "error": str(pe)}), 403
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/student/requests/<req_id>/timeline", methods=["GET"])
def student_request_timeline(req_id):
    try:
        timeline = get_request_timeline(req_id)
        return jsonify({"timeline": timeline})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/student/check-overlap", methods=["GET", "POST"])
def student_check_overlap():
    if request.method == "POST":
        data = request.get_json(silent=True) or request.form.to_dict()
    else:
        data = request.args.to_dict()

    roll = data.get("rollNumber") or session.get("roll_number") or "24AI001"
    s_date = data.get("startDate")
    e_date = data.get("endDate")
    exclude_id = data.get("excludeRequestId")

    if not s_date or not e_date:
        return jsonify({"hasOverlap": False, "conflicts": []})

    conflicts = detect_overlaps(roll, s_date, e_date, exclude_request_id=exclude_id)
    return jsonify({
        "hasOverlap": len(conflicts) > 0,
        "conflicts": conflicts
    })

# -----------------------------------------------------------------------------
# Proctor Endpoints (Module 4, 5)
# -----------------------------------------------------------------------------
@app.route("/api/proctor/dashboard", methods=["GET"])
def proctor_dashboard():
    proctor_id = request.args.get("proctorId") or session.get("roll_number") or "P01"
    filters = {
        "status": request.args.get("status"),
        "dept": request.args.get("dept"),
        "sec": request.args.get("sec"),
        "roll": request.args.get("roll")
    }
    try:
        data = get_proctor_dashboard_data(proctor_id, filters=filters)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/proctor/requests/<req_id>/review", methods=["POST"])
def proctor_review(req_id):
    data = request.get_json(silent=True) or request.form.to_dict()
    rec = data.get("recommendation")
    remarks = data.get("remarks")

    user = get_current_user() or {
        "linked_id": data.get("proctorId", "P01"),
        "name": data.get("proctorName", "Dr. K. Ramesh"),
        "email": data.get("proctorEmail", "k.ramesh@techuniv.edu.in"),
        "role": "proctor"
    }

    try:
        res = proctor_review_request(req_id, user, rec, remarks)
        return jsonify({"success": True, "result": res})
    except PermissionError as pe:
        return jsonify({"success": False, "error": str(pe)}), 403
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# -----------------------------------------------------------------------------
# In-Charge Endpoints (Module 1, 2, 4, 5, 6)
# -----------------------------------------------------------------------------
@app.route("/api/incharge/dashboard", methods=["GET"])
def incharge_dashboard():
    filters = {
        "status": request.args.get("status"),
        "dept": request.args.get("dept"),
        "category": request.args.get("category"),
        "eligibility": request.args.get("eligibility")
    }
    try:
        data = get_incharge_dashboard_data(filters=filters)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/incharge/requests/<req_id>/decide", methods=["POST"])
def incharge_decide(req_id):
    data = request.get_json(silent=True) or request.form.to_dict()
    decision = data.get("decision")
    remarks = data.get("remarks")
    override = data.get("override") in [True, "true", "True", "Yes", 1]
    override_reason = data.get("overrideReason", "")

    user = get_current_user() or {
        "email": "tech.incharge@techuniv.edu.in",
        "name": "Dr. A. Srinivasa Rao",
        "role": "incharge"
    }

    try:
        res = incharge_decide_request(req_id, user, decision, remarks, override=override, override_reason=override_reason)
        return jsonify({"success": True, "result": res})
    except PermissionError as pe:
        return jsonify({"success": False, "error": str(pe)}), 403
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Threshold Configuration (Module 2)
@app.route("/api/config/threshold", methods=["GET", "POST"])
def config_threshold():
    if request.method == "POST":
        data = request.get_json(silent=True) or request.form.to_dict()
        try:
            val = float(data.get("threshold"))
            if val < 0 or val > 100:
                return jsonify({"error": "Threshold must be between 0 and 100"}), 400
            new_val = set_threshold(val, updated_by=session.get("email", "In-Charge"))
            return jsonify({"success": True, "threshold": new_val})
        except (ValueError, TypeError) as e:
            return jsonify({"error": f"Invalid threshold value: {str(e)}"}), 400
    else:
        return jsonify({"threshold": get_current_threshold()})

# Attendance Templates (Module 1)
@app.route("/api/incharge/attendance-template", methods=["GET"])
def incharge_attendance_template():
    fmt = request.args.get("format", "csv").lower()
    if fmt == "xlsx":
        data = generate_xlsx_template()
        return Response(
            data,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=attendance_template.xlsx"}
        )
    else:
        data = generate_csv_template()
        return Response(
            data,
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment; filename=attendance_template.csv"}
        )

# Attendance Preview (Module 1)
@app.route("/api/incharge/attendance-preview", methods=["POST"])
def incharge_attendance_preview():
    file = request.files.get("attendanceFile") or request.files.get("file")
    if not file or not file.filename:
        return jsonify({"error": "No attendance file provided"}), 400

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".csv", ".xlsx", ".xls"]:
        return jsonify({"error": "Only .csv and .xlsx files are supported"}), 400

    try:
        rows = parse_file_to_rows(file, file.filename)
        if not rows:
            return jsonify({"error": "The uploaded file is empty or contains no data rows"}), 400
        preview = validate_attendance_preview(rows)
        return jsonify({"success": True, "preview": preview, "filename": file.filename})
    except Exception as e:
        return jsonify({"error": f"Failed to parse file: {str(e)}"}), 400

# Attendance Import Commit (Module 1)
@app.route("/api/incharge/attendance-import", methods=["POST"])
def incharge_attendance_import():
    data = request.get_json(silent=True) or {}
    valid_records = data.get("validRecords", [])
    filename = data.get("filename", "uploaded_attendance.csv")
    notes = data.get("notes", "")
    imported_by = session.get("email", "tech.incharge@techuniv.edu.in")

    if not valid_records:
        return jsonify({"error": "No valid records provided to import"}), 400

    try:
        res = commit_attendance_import(valid_records, filename, imported_by=imported_by, notes=notes)
        return jsonify({"success": True, "result": res})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Attendance Import History (Module 1)
@app.route("/api/incharge/attendance-history", methods=["GET"])
def incharge_attendance_history():
    try:
        history = get_import_history()
        return jsonify({"history": history})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# -----------------------------------------------------------------------------
# Reports & Exports (Module 6)
# -----------------------------------------------------------------------------
@app.route("/api/export/attendance", methods=["GET"])
def export_attendance():
    fmt = request.args.get("format", "csv").lower()
    filters = {
        "department": request.args.get("department"),
        "eligibility": request.args.get("eligibility"),
        "proctorId": request.args.get("proctorId"),
        "rollNumber": request.args.get("rollNumber"),
        "minPct": request.args.get("minPct"),
        "maxPct": request.args.get("maxPct")
    }
    data, mimetype, filename = generate_attendance_report(file_format=fmt, filters=filters)
    return Response(
        data,
        mimetype=mimetype,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.route("/api/export/requests", methods=["GET"])
def export_requests():
    fmt = request.args.get("format", "csv").lower()
    filters = {
        "department": request.args.get("department"),
        "category": request.args.get("category"),
        "status": request.args.get("status"),
        "proctorId": request.args.get("proctorId"),
        "finalDecision": request.args.get("finalDecision"),
        "startDate": request.args.get("startDate"),
        "endDate": request.args.get("endDate")
    }
    data, mimetype, filename = generate_requests_report(file_format=fmt, filters=filters)
    return Response(
        data,
        mimetype=mimetype,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    port = int(os.environ.get("PORT", 5000))
    print(f"* CampusGate Backend running on http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=False)
