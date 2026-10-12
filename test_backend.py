# test_backend.py
import pytest
import os
import io
import json
from app import app
from backend.db import get_db, init_db
from backend.seed import seed_database
from backend.attendance_service import (
    get_current_threshold, set_threshold,
    validate_attendance_preview, commit_attendance_import
)
from backend.request_service import (
    create_event_request, update_event_request,
    withdraw_event_request, proctor_review_request,
    incharge_decide_request, detect_overlaps
)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_db()
    seed_database()

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

# =============================================================================
# MODULE 1 TESTS: Excel/CSV Import & Validation
# =============================================================================
def test_module1_template_download(client):
    res_csv = client.get("/api/incharge/attendance-template?format=csv")
    assert res_csv.status_code == 200
    assert "Roll Number" in res_csv.data.decode("utf-8")

    res_xlsx = client.get("/api/incharge/attendance-template?format=xlsx")
    assert res_xlsx.status_code == 200
    assert len(res_xlsx.data) > 0

def test_module1_preview_validation():
    sample_rows = [
        {"row_number": 2, "raw": {"Roll Number": "24AI001", "Classes Conducted": "100", "Classes Attended": "88", "Data As Of": "2026-10-10"}},
        {"row_number": 3, "raw": {"Roll Number": "24CS002", "Classes Conducted": "100", "Classes Attended": "75", "Data As Of": "2026-10-10"}},
        # Invalid: Attended > Conducted
        {"row_number": 4, "raw": {"Roll Number": "24CS006", "Classes Conducted": "100", "Classes Attended": "108", "Data As Of": "2026-10-10"}},
        # Invalid: Unmatched student
        {"row_number": 5, "raw": {"Roll Number": "99XX999", "Classes Conducted": "100", "Classes Attended": "80", "Data As Of": "2026-10-10"}},
        # Invalid: Duplicate roll number in file
        {"row_number": 6, "raw": {"Roll Number": "24AI001", "Classes Conducted": "100", "Classes Attended": "90", "Data As Of": "2026-10-10"}}
    ]

    preview = validate_attendance_preview(sample_rows)
    assert preview["validRowsCount"] == 2
    assert preview["invalidRowsCount"] == 3
    assert preview["unmatchedCount"] == 1
    assert preview["duplicateCount"] == 1

def test_module1_atomic_import(client):
    valid_batch = [
        {
            "row": 2, "rollNumber": "24AI001", "studentName": "Aarav Reddy",
            "department": "AI", "classesConducted": 120.0, "classesAttended": 110.0,
            "attendancePercentage": 91.67, "dataAsOf": "2026-10-12",
            "eligibilityStatus": "Eligible"
        }
    ]

    res = client.post("/api/incharge/attendance-import", json={
        "validRecords": valid_batch,
        "filename": "test_upload.csv",
        "notes": "Automated test import"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "batchId" in data["result"]

    # Verify history
    hist = client.get("/api/incharge/attendance-history")
    assert hist.status_code == 200
    batches = hist.get_json()["history"]
    assert any(b["filename"] == "test_upload.csv" for b in batches)

# =============================================================================
# MODULE 2 TESTS: Attendance Formula & Eligibility
# =============================================================================
def test_module2_formula_and_threshold(client):
    # Default threshold is 75%
    th = get_current_threshold()
    assert th == 75.0

    # Test student 24AI001 attendance
    res = client.get("/api/student/profile?roll=24AI001")
    assert res.status_code == 200
    att = res.get_json()["attendance"]
    assert att["attendance_percentage"] >= 75.0
    assert att["eligibility_status"] == "Eligible"

    # Test student 24CS005 with missing attendance -> Unavailable
    res_missing = client.get("/api/student/profile?roll=24CS005")
    att_missing = res_missing.get_json()["attendance"]
    assert att_missing["eligibility_status"] == "Unavailable"

    # Test student 24CS009 with stale attendance (>30 days)
    res_stale = client.get("/api/student/profile?roll=24CS009")
    att_stale = res_stale.get_json()["attendance"]
    assert att_stale["is_stale"] == 1
    assert att_stale["eligibility_status"] == "Stale - Verify"

    # Test updating threshold to 80%
    res_th = client.post("/api/config/threshold", json={"threshold": 80.0})
    assert res_th.status_code == 200
    assert get_current_threshold() == 80.0

    # Reset back to 75%
    client.post("/api/config/threshold", json={"threshold": 75.0})
    assert get_current_threshold() == 75.0

# =============================================================================
# MODULE 3 TESTS: Event Request Submission & Overlap Detection
# =============================================================================
def test_module3_validation_and_overlap(client):
    # Invalid date order: end date < start date
    bad_req = {
        "eventTitle": "Test Hackathon",
        "organizer": "Test Org",
        "category": "Hackathon",
        "venue": "Campus Hall",
        "startDate": "2026-11-15",
        "endDate": "2026-11-10",
        "purpose": "Learning"
    }
    res = client.post("/api/student/requests", data=bad_req)
    assert res.status_code == 400
    assert "earlier than start date" in res.get_json()["error"]

    # Detect existing overlap for 24AI001 (already has TEP-2026-0001 on 2026-11-05 to 2026-11-07)
    overlaps = detect_overlaps("24AI001", "2026-11-06", "2026-11-08")
    assert len(overlaps) > 0
    assert any("TEP-2026-0001" in o["reference_number"] for o in overlaps)

    # Valid submission
    valid_req = {
        "rollNumber": "24AI001",
        "eventTitle": "Deep Learning Symposium 2026",
        "organizer": "IEEE AI Society",
        "category": "Conference",
        "venue": "Convention Centre",
        "city": "Hyderabad",
        "startDate": "2026-12-10",
        "endDate": "2026-12-12",
        "purpose": "Present paper on neural architecture search.",
        "eventUrl": "https://ieee-ai.example.org"
    }
    res_ok = client.post("/api/student/requests", data=valid_req)
    assert res_ok.status_code == 201
    result = res_ok.get_json()["result"]
    assert result["status"] == "Submitted"
    assert "referenceNumber" in result

# =============================================================================
# MODULE 4 TESTS: Workflow Rules & Decisions
# =============================================================================
def test_module4_workflow_and_security(client):
    # Create a fresh test request
    new_req = create_event_request("24AI001", {
        "eventTitle": "Workflow Test Event",
        "organizer": "Tech Org",
        "category": "Workshop",
        "venue": "Seminar Hall",
        "startDate": "2026-12-20",
        "endDate": "2026-12-21",
        "purpose": "Testing workflow engine"
    })
    req_id = new_req["id"]

    # 1. Proctor cannot issue final APPROVE or REJECT
    proctor_user = {"linked_id": "P01", "name": "Dr. K. Ramesh", "email": "k.ramesh@techuniv.edu.in", "role": "proctor"}
    with pytest.raises(PermissionError, match="A proctor cannot issue the final decision"):
        proctor_review_request(req_id, proctor_user, "APPROVE", "Looks good")

    # 2. Proctor of another department cannot review
    wrong_proctor = {"linked_id": "P02", "name": "Dr. S. Lakshmi", "email": "s.lakshmi@techuniv.edu.in", "role": "proctor"}
    with pytest.raises(PermissionError, match="assigned to another proctor"):
        proctor_review_request(req_id, wrong_proctor, "RECOMMEND_APPROVAL", "Recommend")

    # 3. Assigned proctor can recommend
    rev = proctor_review_request(req_id, proctor_user, "RECOMMEND_APPROVAL", "Student eligible, event relevant.")
    assert rev["status"] == "Pending Final Decision"

    # 4. In-charge final approval
    incharge_user = {"email": "tech.incharge@techuniv.edu.in", "name": "Dr. A. Srinivasa Rao", "role": "incharge"}
    dec = incharge_decide_request(req_id, incharge_user, "Approved", "Granted academic OD.")
    assert dec["status"] == "Approved"
    assert "APR-" in dec["approvalReference"]

    # 5. Student cannot edit or withdraw an approved request
    with pytest.raises(PermissionError, match="Cannot edit request"):
        update_event_request(req_id, "24AI001", {"eventTitle": "Hacked Title"})

    with pytest.raises(PermissionError, match="Cannot withdraw request in finalized status"):
        withdraw_event_request(req_id, "24AI001")

def test_module4_ineligible_override_enforcement():
    # Student 24AI004 has 65% attendance (Ineligible)
    ineligible_req = create_event_request("24AI004", {
        "eventTitle": "Ineligible Student Test",
        "organizer": "Org",
        "category": "Workshop",
        "venue": "Hall",
        "startDate": "2026-12-25",
        "endDate": "2026-12-26",
        "purpose": "Test override"
    })
    req_id = ineligible_req["id"]
    incharge_user = {"email": "tech.incharge@techuniv.edu.in", "name": "Dr. A. Srinivasa Rao", "role": "incharge"}

    # Attempting normal approval on ineligible student must FAIL
    with pytest.raises(PermissionError, match="without an explicit recorded override"):
        incharge_decide_request(req_id, incharge_user, "Approved", "Normal approval attempt", override=False)

    # Attempting override without reason must FAIL
    with pytest.raises(ValueError, match="override reason is required"):
        incharge_decide_request(req_id, incharge_user, "Approved", "Override attempt", override=True, override_reason="")

    # Providing explicit override succeeds
    dec = incharge_decide_request(
        req_id, incharge_user, "Approved", "Approved per Dean special order",
        override=True, override_reason="Special national competition representation order #44"
    )
    assert dec["status"] == "Approved"
    assert dec["overrideUsed"] == "Yes"

# =============================================================================
# MODULE 5 & 6 TESTS: Dashboards & Exports
# =============================================================================
def test_module5_dashboards(client):
    # Student dashboard
    s_dash = client.get("/api/student/dashboard?roll=24AI001").get_json()
    assert s_dash["profile"]["roll_number"] == "24AI001"
    assert len(s_dash["requests"]) > 0

    # Proctor dashboard
    p_dash = client.get("/api/proctor/dashboard?proctorId=P01").get_json()
    assert p_dash["metrics"]["assignedStudents"] > 0
    assert len(p_dash["requests"]) > 0

    # In-charge dashboard
    i_dash = client.get("/api/incharge/dashboard").get_json()
    assert i_dash["metrics"]["totalRequests"] > 0
    assert len(i_dash["departmentStats"]) > 0
    assert "Eligible" in i_dash["eligibilityDistribution"]

def test_module6_exports(client):
    # Attendance CSV export
    att_csv = client.get("/api/export/attendance?format=csv")
    assert att_csv.status_code == 200
    assert "Attendance Percentage" in att_csv.data.decode("utf-8")

    # Attendance XLSX export
    att_xlsx = client.get("/api/export/attendance?format=xlsx")
    assert att_xlsx.status_code == 200

    # Requests CSV export
    req_csv = client.get("/api/export/requests?format=csv")
    assert req_csv.status_code == 200
    assert "Reference Number" in req_csv.data.decode("utf-8")
