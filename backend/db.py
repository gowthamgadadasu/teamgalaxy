# backend/db.py
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "campusgate.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # 1. Users table (Students, Proctors, In-Charge, Admin)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uid TEXT UNIQUE,
        roll_number TEXT UNIQUE,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL, -- 'student', 'proctor', 'incharge'
        dept TEXT,
        year TEXT,
        sec TEXT,
        semester INTEGER,
        academic_year TEXT,
        cgpa REAL,
        backlogs INTEGER DEFAULT 0,
        phone TEXT,
        proctor_id TEXT,
        proctor_uid TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
    """)

    # 2. Proctors table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS proctors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uid TEXT UNIQUE,
        linked_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'proctor',
        department TEXT NOT NULL,
        designation TEXT
    )
    """)

    # 3. Attendance records (Current active dataset)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        roll_number TEXT UNIQUE NOT NULL,
        student_name TEXT,
        department TEXT,
        year_section TEXT,
        classes_conducted REAL,
        classes_attended REAL,
        attendance_percentage REAL,
        data_as_of TEXT,
        missing_attendance INTEGER DEFAULT 0,
        is_stale INTEGER DEFAULT 0,
        eligibility_status TEXT,
        last_imported_at TEXT,
        import_batch_id TEXT
    )
    """)

    # 4. Attendance Import batches & history
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance_imports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id TEXT UNIQUE NOT NULL,
        filename TEXT NOT NULL,
        imported_by TEXT,
        total_rows INTEGER,
        valid_rows INTEGER,
        invalid_rows INTEGER,
        unmatched_rows INTEGER,
        duplicate_rows INTEGER,
        imported_at TEXT DEFAULT (datetime('now', 'localtime')),
        status TEXT DEFAULT 'SUCCESS',
        notes TEXT
    )
    """)

    # 5. Event Requests
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS event_requests (
        id TEXT PRIMARY KEY,
        reference_number TEXT UNIQUE NOT NULL,
        roll_number TEXT NOT NULL,
        event_title TEXT NOT NULL,
        organizer TEXT NOT NULL,
        category TEXT NOT NULL,
        venue TEXT NOT NULL,
        city TEXT,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        event_url TEXT,
        purpose TEXT NOT NULL,
        supporting_doc_name TEXT,
        supporting_doc_url TEXT,
        status TEXT NOT NULL, -- Draft, Submitted, Under Proctor Review, Returned for Correction, Recommended for Approval, Recommended for Rejection, Pending Final Decision, Approved, Rejected, Withdrawn
        proctor_id TEXT,
        eligibility_flag_at_submission TEXT,
        overlap_flag TEXT DEFAULT '',
        proctor_recommendation TEXT,
        proctor_remarks TEXT,
        proctor_reviewed_on TEXT,
        final_decision TEXT,
        final_remarks TEXT,
        decided_by TEXT,
        decided_on TEXT,
        approval_reference TEXT,
        override_used TEXT DEFAULT 'No',
        override_reason TEXT DEFAULT '',
        submitted_on TEXT,
        updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
    """)

    # 6. Request History & Audit Trail
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS request_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id TEXT NOT NULL,
        action TEXT NOT NULL,
        from_status TEXT,
        to_status TEXT,
        performed_by TEXT,
        performed_by_name TEXT,
        performed_by_role TEXT,
        remarks TEXT,
        timestamp TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (request_id) REFERENCES event_requests(id) ON DELETE CASCADE
    )
    """)

    # 7. System Config (e.g. attendance threshold, default 75.0%)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_by TEXT
    )
    """)

    # Insert default threshold if not present
    cursor.execute("SELECT value FROM system_config WHERE key = 'attendance_threshold'")
    if not cursor.fetchone():
        cursor.execute("INSERT INTO system_config (key, value, updated_by) VALUES ('attendance_threshold', '75.0', 'System')")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database schema initialized successfully at:", DB_PATH)
