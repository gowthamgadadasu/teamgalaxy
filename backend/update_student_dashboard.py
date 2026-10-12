# backend/update_student_dashboard.py
import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html_path = os.path.join(BASE_DIR, "student-dashboard.html")

students_data = json.load(open(os.path.join(BASE_DIR, "backend", "generated_accounts.json"), encoding="utf-8"))
students_only = [s for s in students_data if s["role"] == "student"]
requests_data = json.load(open(os.path.join(BASE_DIR, "backend", "generated_requests.json"), encoding="utf-8"))

students_json = json.dumps(students_only, indent=2)
requests_json = json.dumps(requests_data, indent=2)

with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

# Locate <script> tag before </body>
script_start = html.find("  <script>")
if script_start == -1:
    script_start = html.find("<script>")

script_end = html.rfind("</script>") + len("</script>")

new_script = f"""  <script>
    // Offline Seed Data for Zero-Failure Operation
    const FALLBACK_STUDENTS = {students_json};
    const FALLBACK_REQUESTS = {requests_json};

    // State
    let currentStudentRoll = "24AI001";
    let currentRequests = [];

    // DOM Elements
    const headerUserAvatar = document.getElementById("headerUserAvatar");
    const headerUserName = document.getElementById("headerUserName");
    const avatarLetter = document.getElementById("avatarLetter");
    const studentDisplayName = document.getElementById("studentDisplayName");
    const eligibilityPill = document.getElementById("eligibilityPill");
    const studentMeta = document.getElementById("studentMeta");
    const attendanceVal = document.getElementById("attendanceVal");
    const attendanceDetail = document.getElementById("attendanceDetail");
    const freshnessDetail = document.getElementById("freshnessDetail");
    const totalRequestsVal = document.getElementById("totalRequestsVal");
    const approvedVal = document.getElementById("approvedVal");
    const tableBody = document.getElementById("studentRequestsTableBody");

    const requestModal = document.getElementById("requestModal");
    const modalHeading = document.getElementById("modalHeading");
    const openSubmitModalBtn = document.getElementById("openSubmitModalBtn");
    const closeSubmitModalBtn = document.getElementById("closeSubmitModalBtn");
    const timelineModal = document.getElementById("timelineModal");
    const closeTimelineBtn = document.getElementById("closeTimelineBtn");
    const timelineContainer = document.getElementById("timelineContainer");

    const eventSubmitForm = document.getElementById("eventSubmitForm");
    const editingRequestId = document.getElementById("editingRequestId");
    const submitFormBtn = document.getElementById("submitFormBtn");
    const saveDraftBtn = document.getElementById("saveDraftBtn");
    const startDateInput = document.getElementById("formStartDate");
    const endDateInput = document.getElementById("formEndDate");
    const overlapBanner = document.getElementById("overlapWarningBanner");

    // Initialize session and fetch data
    async function initDashboard() {{
      const authUserStr = localStorage.getItem("campusgate_auth_user");
      if (authUserStr) {{
        try {{
          const authUser = JSON.parse(authUserStr);
          if (authUser.rollNumber) {{
            currentStudentRoll = authUser.rollNumber.toUpperCase();
          }}
        }} catch (e) {{}}
      }}

      await loadDashboardData();
    }}

    async function loadDashboardData() {{
      let backendData = null;

      // 1. Try relative backend path
      try {{
        const resp = await fetch(`/api/student/dashboard?roll=${{encodeURIComponent(currentStudentRoll)}}`);
        if (resp.ok) backendData = await resp.json();
      }} catch (e) {{}}

      // 2. Try port 5000 if opened on static preview server
      if (!backendData) {{
        try {{
          const resp = await fetch(`http://127.0.0.1:5000/api/student/dashboard?roll=${{encodeURIComponent(currentStudentRoll)}}`);
          if (resp.ok) backendData = await resp.json();
        }} catch (e) {{}}
      }}

      // 3. Live Backend Response
      if (backendData && backendData.profile) {{
        renderProfile(backendData.profile, backendData.attendance);
        renderMetrics(backendData.metrics);
        currentRequests = backendData.requests || [];
        renderTable(currentRequests);
        return;
      }}

      // 4. Client-side catalog fallback (offline / static mode)
      renderOfflineDashboard();
    }}

    function renderOfflineDashboard() {{
      const student = FALLBACK_STUDENTS.find(s => s.roll.toUpperCase() === currentStudentRoll.toUpperCase()) || FALLBACK_STUDENTS[0];
      
      const profile = {{
        roll_number: student.roll,
        name: student.name,
        dept: student.dept,
        year: student.year || "II",
        sec: student.sec || "A",
        proctor_name: student.proctorName || (student.proctorId === "P02" ? "Dr. S. Lakshmi" : student.proctorId === "P03" ? "Prof. M. Venkat Rao" : "Dr. K. Ramesh")
      }};

      const conducted = student.conducted;
      const attended = student.attended;
      const pct = (student.pct !== null && student.pct !== undefined) 
        ? student.pct 
        : (conducted ? (attended / conducted) * 100 : null);

      let eligStatus = "Eligible";
      if (student.status) {{
        eligStatus = student.status;
      }} else if (conducted === null || conducted === 0) {{
        eligStatus = "Unavailable";
      }} else if (pct < 75) {{
        eligStatus = "Ineligible";
      }}

      const attendance = {{
        classes_conducted: conducted,
        classes_attended: attended,
        attendance_percentage: pct,
        eligibility_status: eligStatus,
        is_stale: student.asOf && student.asOf.startsWith("2026-07") ? 1 : 0,
        missing_attendance: conducted === null ? 1 : 0,
        threshold: 75,
        data_as_of: student.asOf || "2026-10-10"
      }};

      renderProfile(profile, attendance);

      // Load local requests
      let storedReqs = JSON.parse(localStorage.getItem("campusgate_event_requests_v2") || "null");
      if (!storedReqs) {{
        storedReqs = FALLBACK_REQUESTS;
        localStorage.setItem("campusgate_event_requests_v2", JSON.stringify(storedReqs));
      }}

      currentRequests = storedReqs.filter(r => (r.roll_number || r.studentRoll || "").toUpperCase() === currentStudentRoll.toUpperCase());
      const approvedCount = currentRequests.filter(r => r.status === "Approved").length;

      renderMetrics({{ total: currentRequests.length, approved: approvedCount }});
      renderTable(currentRequests);
    }}

    function renderProfile(profile, attendance) {{
      if (!profile) return;
      const initial = (profile.name || "S")[0].toUpperCase();
      if (headerUserAvatar) headerUserAvatar.textContent = initial;
      if (headerUserName) headerUserName.textContent = `${{profile.name}} (${{profile.roll_number}})`;
      if (avatarLetter) avatarLetter.textContent = initial;
      if (studentDisplayName) studentDisplayName.textContent = profile.name;

      if (studentMeta) {{
        studentMeta.innerHTML = `Roll No: <strong>${{profile.roll_number}}</strong> &bull; Dept: <strong>${{profile.dept || 'Engineering'}}</strong> &bull; Sec: <strong>${{profile.sec || 'A'}}</strong> &bull; Proctor: <strong>${{profile.proctor_name || 'Dr. K. Ramesh'}}</strong>`;
      }}

      // Attendance Metrics
      let pctStr = "Unavailable";
      let badgeClass = "status-unavailable";
      let badgeText = "UNAVAILABLE";

      if (attendance) {{
        if (attendance.missing_attendance === 1 || attendance.classes_conducted === null || attendance.classes_conducted === 0 || attendance.attendance_percentage === null) {{
          pctStr = "Unavailable";
          badgeClass = "status-unavailable";
          badgeText = "UNAVAILABLE";
          attendanceDetail.textContent = "Missing from Department Master File";
        }} else {{
          pctStr = `${{Number(attendance.attendance_percentage).toFixed(1)}}%`;
          attendanceDetail.textContent = `${{attendance.classes_attended || 0}} Attended / ${{attendance.classes_conducted || 0}} Conducted`;

          if (attendance.is_stale === 1 || attendance.eligibility_status === "Stale - Verify") {{
            badgeClass = "status-stale";
            badgeText = "STALE (Needs Verification)";
          }} else if (attendance.eligibility_status === "Eligible" || Number(attendance.attendance_percentage) >= 75) {{
            badgeClass = "status-eligible";
            badgeText = `ELIGIBLE (≥${{attendance.threshold || 75}}%)`;
          }} else {{
            badgeClass = "status-ineligible";
            badgeText = `INELIGIBLE (<${{attendance.threshold || 75}}%)`;
          }}
        }}

        freshnessDetail.textContent = `Data as of: ${{attendance.data_as_of || 'N/A'}}`;
      }}

      attendanceVal.textContent = pctStr;
      eligibilityPill.className = `cg-status-pill ${{badgeClass}}`;
      eligibilityPill.textContent = badgeText;
    }}

    function renderMetrics(metrics) {{
      if (!metrics) return;
      if (totalRequestsVal) totalRequestsVal.textContent = metrics.total;
      if (approvedVal) approvedVal.textContent = metrics.approved;
    }}

    function renderTable(requests) {{
      if (!tableBody) return;
      if (!requests || requests.length === 0) {{
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--color-slate-400); padding: 2rem;">No event requests submitted yet. Click '+ Submit Event Request' to begin.</td></tr>`;
        return;
      }}

      tableBody.innerHTML = requests.map(r => {{
        let pillClass = "status-submitted";
        if (r.status === "Approved") pillClass = "status-approved";
        else if (r.status === "Rejected") pillClass = "status-rejected";
        else if (r.status === "Returned for Correction") pillClass = "status-returned";
        else if (r.status === "Draft") pillClass = "status-draft";
        else if (r.status === "Withdrawn") pillClass = "status-withdrawn";
        else if (r.status === "Pending Final Decision" || r.status === "Recommended for Approval") pillClass = "status-pending";

        const hasOverlap = !!r.overlap_flag;
        const canEdit = r.status === "Returned for Correction" || r.status === "Draft";
        const canWithdraw = !["Approved", "Rejected", "Withdrawn"].includes(r.status);

        return `
          <tr>
            <td><strong>${{r.reference_number || r.id}}</strong></td>
            <td>
              <div style="font-weight: 600;">${{r.event_title || r.title}}</div>
              <small style="color: var(--color-slate-500);">${{r.organizer || ''}}</small>
              ${{hasOverlap ? '<div class="cg-status-pill status-warning" style="font-size: 0.7rem; margin-top: 3px;">⚠️ ' + r.overlap_flag + '</div>' : ''}}
            </td>
            <td>${{r.category}}</td>
            <td><small>${{r.start_date || r.startDate}} to ${{r.end_date || r.endDate}}</small></td>
            <td><span class="cg-status-pill ${{pillClass}}">${{r.status}}</span></td>
            <td>${{r.proctor_recommendation ? '<strong>' + r.proctor_recommendation + '</strong><br><small style="color:#64748b;">' + (r.proctor_remarks || '') + '</small>' : '<span style="color:#94a3b8;">Pending</span>'}}</td>
            <td>
              <small>${{r.final_remarks || 'In Progress'}}</small>
              ${{r.override_used === 'Yes' ? '<div style="color: #b45309; font-size: 0.75rem; font-weight: 600;">[Approved via Override]</div>' : ''}}
              ${{r.approval_reference ? '<div style="color: #15803d; font-size: 0.75rem; font-weight: 600;">Ref: ' + r.approval_reference + '</div>' : ''}}
            </td>
            <td>
              <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                <button class="cg-btn-sm cg-btn-outline view-timeline-btn" data-id="${{r.id}}">Timeline</button>
                ${{canEdit ? `<button class="cg-btn-sm cg-btn-warning edit-request-btn" data-id="${{r.id}}">Edit</button>` : ''}}
                ${{canWithdraw ? `<button class="cg-btn-sm cg-btn-danger withdraw-btn" data-id="${{r.id}}">Withdraw</button>` : ''}}
              </div>
            </td>
          </tr>
        `;
      }}).join("");

      // Wire Timeline Buttons
      document.querySelectorAll(".view-timeline-btn").forEach(b => {{
        b.addEventListener("click", () => showTimeline(b.getAttribute("data-id")));
      }});

      // Wire Edit Buttons
      document.querySelectorAll(".edit-request-btn").forEach(b => {{
        b.addEventListener("click", () => openEditModal(b.getAttribute("data-id")));
      }});

      // Wire Withdraw Buttons
      document.querySelectorAll(".withdraw-btn").forEach(b => {{
        b.addEventListener("click", () => handleWithdraw(b.getAttribute("data-id")));
      }});
    }}

    // Live Overlap Checker
    async function checkDateOverlap() {{
      const s = startDateInput.value;
      const e = endDateInput.value;
      if (!s || !e) return;

      const editId = editingRequestId.value;

      // 1. Try Backend
      try {{
        const resp = await fetch("/api/student/requests/check-overlaps", {{
          method: "POST",
          headers: {{ "Content-Type": "application/json" }},
          body: JSON.stringify({{ rollNumber: currentStudentRoll, startDate: s, endDate: e, excludeId: editId }})
        }});
        if (resp.ok) {{
          const res = await resp.json();
          if (res.has_overlaps) {{
            overlapBanner.style.display = "block";
            overlapBanner.innerHTML = `⚠️ <strong>Warning: Date overlap detected!</strong> You have ${{res.conflicting_requests.length}} existing request(s) on overlapping dates. Both proctor and in-charge will see this overlap flag.`;
            return;
          }} else {{
            overlapBanner.style.display = "none";
            return;
          }}
        }}
      }} catch (err) {{}}

      // 2. Client-side overlap checker
      const conflict = currentRequests.find(r => 
        r.id !== editId &&
        r.status !== "Rejected" &&
        r.status !== "Withdrawn" &&
        (s <= (r.end_date || r.endDate)) &&
        (e >= (r.start_date || r.startDate))
      );

      if (conflict) {{
        overlapBanner.style.display = "block";
        overlapBanner.innerHTML = `⚠️ <strong>Warning: Date overlap detected!</strong> Conflicting with <code>${{conflict.reference_number || conflict.id}}</code> (${{conflict.event_title || conflict.title}}). Both proctor and in-charge will see this overlap flag.`;
      }} else {{
        overlapBanner.style.display = "none";
      }}
    }}

    startDateInput.addEventListener("change", checkDateOverlap);
    endDateInput.addEventListener("change", checkDateOverlap);

    // Modal Opening & Editing
    openSubmitModalBtn.addEventListener("click", () => {{
      editingRequestId.value = "";
      eventSubmitForm.reset();
      overlapBanner.style.display = "none";
      modalHeading.textContent = "Submit Technical Event Request";
      submitFormBtn.textContent = "Submit for Proctor Review";
      saveDraftBtn.style.display = "inline-block";
      requestModal.classList.add("active");
    }});

    closeSubmitModalBtn.addEventListener("click", () => requestModal.classList.remove("active"));
    closeTimelineBtn.addEventListener("click", () => timelineModal.classList.remove("active"));

    function openEditModal(id) {{
      const req = currentRequests.find(r => r.id === id);
      if (!req) return;

      editingRequestId.value = req.id;
      modalHeading.textContent = `Edit Request — ${{req.reference_number || req.id}}`;
      document.getElementById("formTitle").value = req.event_title || req.title || "";
      document.getElementById("formOrganizer").value = req.organizer || "";
      document.getElementById("formCategory").value = req.category || "Hackathon";
      document.getElementById("formVenue").value = req.venue || "";
      document.getElementById("formStartDate").value = req.start_date || req.startDate || "";
      document.getElementById("formEndDate").value = req.end_date || req.endDate || "";
      document.getElementById("formUrl").value = req.event_url || req.eventUrl || "";
      document.getElementById("formPurpose").value = req.purpose || "";
      document.getElementById("formDoc").value = req.supporting_doc_url || req.supportingDocument || "";

      submitFormBtn.textContent = "Save & Resubmit";
      saveDraftBtn.style.display = "none";
      checkDateOverlap();
      requestModal.classList.add("active");
    }}

    // Submit Request (New or Update)
    async function submitRequest(isDraft = false) {{
      const s = startDateInput.value;
      const end = endDateInput.value;
      if (!isDraft && new Date(end) < new Date(s)) {{
        alert("End date cannot be earlier than start date!");
        return;
      }}

      const editId = editingRequestId.value;
      const formData = new FormData(eventSubmitForm);
      formData.set("rollNumber", currentStudentRoll);
      if (isDraft) formData.set("saveDraft", "true");

      submitFormBtn.disabled = true;

      // 1. Try Backend
      let backendSuccess = false;
      const urls = [
        editId ? `/api/student/requests/${{editId}}` : "/api/student/requests",
        editId ? `http://127.0.0.1:5000/api/student/requests/${{editId}}` : "http://127.0.0.1:5000/api/student/requests"
      ];

      for (const url of urls) {{
        try {{
          const resp = await fetch(url, {{ method: "POST", body: formData }});
          if (resp.ok) {{
            const res = await resp.json();
            if (res.success) {{
              backendSuccess = true;
              break;
            }}
          }}
        }} catch (e) {{}}
      }}

      submitFormBtn.disabled = false;

      if (backendSuccess) {{
        requestModal.classList.remove("active");
        eventSubmitForm.reset();
        overlapBanner.style.display = "none";
        alert(editId ? "Request updated successfully!" : "Event Request submitted successfully!");
        await loadDashboardData();
        return;
      }}

      // 2. Client-side LocalStorage Fallback
      const hasOverlaps = overlapBanner.style.display === "block";
      const newId = editId || ("req_" + Date.now());
      const newRef = editId 
        ? (currentRequests.find(r => r.id === editId)?.reference_number || editId)
        : ("TEP-2026-" + Math.floor(1000 + Math.random() * 9000));
      const newStatus = isDraft ? "Draft" : "Submitted";

      const localObj = {{
        id: newId,
        reference_number: newRef,
        roll_number: currentStudentRoll,
        studentRoll: currentStudentRoll,
        event_title: document.getElementById("formTitle").value,
        title: document.getElementById("formTitle").value,
        organizer: document.getElementById("formOrganizer").value,
        category: document.getElementById("formCategory").value,
        venue: document.getElementById("formVenue").value,
        start_date: s,
        startDate: s,
        end_date: end,
        endDate: end,
        event_url: document.getElementById("formUrl").value,
        purpose: document.getElementById("formPurpose").value,
        supporting_doc_url: document.getElementById("formDoc").value,
        status: newStatus,
        overlap_flag: hasOverlaps ? "Dates conflict with existing request" : "",
        proctor_recommendation: null,
        proctor_remarks: null,
        final_remarks: hasOverlaps ? "Date overlap flagged" : "In Progress",
        created_at: new Date().toISOString().slice(0, 10),
        history: [
          {{
            action: isDraft ? "Saved as Draft" : "Submitted for Proctor Review",
            performed_by: currentStudentRoll,
            performed_by_name: (headerUserName ? headerUserName.textContent.split(" (")[0] : "Student"),
            performed_by_role: "Student",
            remarks: isDraft ? "Draft saved by student" : "Event request submitted with supporting documents",
            to_status: newStatus,
            timestamp: new Date().toLocaleString()
          }}
        ]
      }};

      let allStored = JSON.parse(localStorage.getItem("campusgate_event_requests_v2") || "[]");
      if (editId) {{
        allStored = allStored.map(r => r.id === editId ? {{ ...r, ...localObj }} : r);
      }} else {{
        allStored.unshift(localObj);
      }}
      localStorage.setItem("campusgate_event_requests_v2", JSON.stringify(allStored));

      requestModal.classList.remove("active");
      eventSubmitForm.reset();
      overlapBanner.style.display = "none";
      alert(editId ? "Request updated successfully!" : "Event Request submitted successfully!");
      await loadDashboardData();
    }}

    eventSubmitForm.addEventListener("submit", (e) => {{
      e.preventDefault();
      submitRequest(false);
    }});

    saveDraftBtn.addEventListener("click", () => {{
      submitRequest(true);
    }});

    // Withdraw Request
    async function handleWithdraw(id) {{
      const reason = prompt("Please provide a brief reason for withdrawing this request:");
      if (reason === null) return;

      // 1. Try Backend
      let done = false;
      const urls = [
        `/api/student/requests/${{id}}/withdraw`,
        `http://127.0.0.1:5000/api/student/requests/${{id}}/withdraw`
      ];

      for (const url of urls) {{
        try {{
          const resp = await fetch(url, {{
            method: "POST",
            headers: {{ "Content-Type": "application/json" }},
            body: JSON.stringify({{ rollNumber: currentStudentRoll, reason: reason || "Withdrawn by student" }})
          }});
          if (resp.ok) {{
            const res = await resp.json();
            if (res.success) {{ done = true; break; }}
          }}
        }} catch (e) {{}}
      }}

      // 2. Client-side fallback
      if (!done) {{
        let allStored = JSON.parse(localStorage.getItem("campusgate_event_requests_v2") || "[]");
        allStored = allStored.map(r => {{
          if (r.id === id) {{
            r.status = "Withdrawn";
            r.history = r.history || [];
            r.history.push({{
              action: "Request Withdrawn",
              performed_by: currentStudentRoll,
              performed_by_name: "Student",
              performed_by_role: "Student",
              remarks: reason || "Withdrawn by student",
              to_status: "Withdrawn",
              timestamp: new Date().toLocaleString()
            }});
          }}
          return r;
        }});
        localStorage.setItem("campusgate_event_requests_v2", JSON.stringify(allStored));
      }}

      alert("Request has been withdrawn.");
      await loadDashboardData();
    }}

    // View Timeline Audit History
    async function showTimeline(id) {{
      const req = currentRequests.find(r => r.id === id);
      const title = document.getElementById("timelineModalTitle");
      if (title && req) {{
        title.textContent = `Audit Trail — ${{req.reference_number || req.id}}`;
      }}

      timelineContainer.innerHTML = `<div style="text-align: center; padding: 1.5rem; color: #94a3b8;">Loading audit history...</div>`;
      timelineModal.classList.add("active");

      // 1. Try Backend
      let items = null;
      const urls = [
        `/api/student/requests/${{id}}/timeline`,
        `http://127.0.0.1:5000/api/student/requests/${{id}}/timeline`
      ];

      for (const url of urls) {{
        try {{
          const resp = await fetch(url);
          if (resp.ok) {{
            const res = await resp.json();
            if (res.timeline) {{ items = res.timeline; break; }}
          }}
        }} catch (e) {{}}
      }}

      // 2. Client-side history fallback
      if (!items) {{
        items = (req && req.history) ? req.history : [
          {{
            action: "Submitted for Review",
            performed_by_name: "Student",
            performed_by_role: "Student",
            remarks: "Event request filed with institutional documents",
            timestamp: req ? (req.created_at || req.submittedOn) : "2026-10-01"
          }}
        ];
      }}

      if (items.length === 0) {{
        timelineContainer.innerHTML = `<div style="text-align: center; padding: 1.5rem; color: #94a3b8;">No audit entries found.</div>`;
        return;
      }}

      timelineContainer.innerHTML = items.map(h => `
        <div class="cg-timeline-item">
          <div class="cg-timeline-dot"></div>
          <div class="cg-timeline-content">
            <div class="cg-timeline-header">
              <strong>${{h.action || h.title || 'Event'}}</strong>
              <span class="cg-timeline-meta">${{h.timestamp || h.time || ''}}</span>
            </div>
            <div style="color: var(--color-blue-700); font-weight: 500; font-size: 0.85rem;">
              ${{h.performed_by_name || h.performed_by || h.by || 'User'}} (${{h.performed_by_role || 'User'}})
            </div>
            <div style="margin-top: 0.35rem; color: var(--color-slate-700); font-size: 0.875rem;">
              ${{h.remarks || h.note || 'No remarks provided.'}}
            </div>
            ${{h.to_status ? `<div style="margin-top: 0.25rem; font-size: 0.75rem; color: #64748b;">Status changed to: <strong>${{h.to_status}}</strong></div>` : ''}}
          </div>
        </div>
      `).join("");
    }}

    // Sign Out
    document.getElementById("signOutLink").addEventListener("click", async (e) => {{
      e.preventDefault();
      try {{
        await fetch("/api/auth/logout", {{ method: "POST" }});
      }} catch (e) {{}}
      localStorage.removeItem("campusgate_auth_user");
      window.location.href = "student-login.html";
    }});

    // Run on load
    initDashboard();
  </script>"""

updated_html = html[:script_start] + new_script + html[script_end:]

with open(html_path, "w", encoding="utf-8") as f:
    f.write(updated_html)

print("Successfully updated student-dashboard.html with resilient dual-mode architecture!")
