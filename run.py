# run.py
"""
CampusGate — Application Launcher
Starts the combined Flask backend + frontend server on http://127.0.0.1:5000
"""
import os
import sys

def main():
    print("=" * 65)
    print("      CAMPUSGATE ACADEMIC EVENT PERMISSION & ATTENDANCE PORTAL")
    print("=" * 65)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print("Initializing application...")

    try:
        from app import app
        from backend.db import init_db
        from backend.seed import seed_database
    except ImportError as e:
        print(f"[ERROR] Missing required dependency: {e}")
        print("Please install requirements using: py -m pip install -r requirements.txt")
        sys.exit(1)

    init_db()

    port = int(os.environ.get("PORT", 5000))
    host = "127.0.0.1"

    print("\nPORTAL ACCESS URLS:")
    print(f"   * Main Homepage:         http://{host}:{port}/")
    print(f"   * Student Portal:        http://{host}:{port}/student-login.html")
    print(f"   * Proctor Portal:        http://{host}:{port}/proctor-login.html")
    print(f"   * In-Charge Portal:      http://{host}:{port}/incharge-login.html")
    
    print("\nQUICK-TEST CREDENTIALS:")
    print("   * Student (Eligible 90%):   24AI001  or  24ai001@techuniv.edu.in   |  Stu@24AI001")
    print("   * Student (Exact 75%):      24CS002  or  24cs002@techuniv.edu.in   |  Stu@24CS002")
    print("   * Student (Ineligible 65%): 24AI004  or  24ai004@techuniv.edu.in   |  Stu@24AI004")
    print("   * Student (Unavailable):    24CS005  or  24cs005@techuniv.edu.in   |  Stu@24CS005")
    print("   * Student (Stale Data):     24CS009  or  24cs009@techuniv.edu.in   |  Stu@24CS009")
    print("   * Proctor (AI Dept):        k.ramesh@techuniv.edu.in               |  Proctor@Ramesh26")
    print("   * Technical Event In-Charge:tech.incharge@techuniv.edu.in          |  Incharge@2026")
    print("=" * 65)
    print(f"Server is listening at http://{host}:{port} (Press Ctrl+C to stop)\n")

    app.run(host=host, port=port, debug=False)

if __name__ == "__main__":
    main()
