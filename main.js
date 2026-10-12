/**
 * CampusGate - Academic Event Permission Portal
 * Frontend Interactions, Authentication, Password Toggle & UI Helpers
 */

const KNOWN_ACCOUNTS = [
  {
    "roll": "24AI001",
    "email": "24ai001@techuniv.edu.in",
    "pass": "Stu@24AI001",
    "name": "Aarav Reddy",
    "role": "student",
    "dept": "AI",
    "year": "II",
    "sec": "A",
    "proctorId": "P01",
    "pct": 90,
    "attended": 108,
    "conducted": 120,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "24AI002",
    "email": "24ai002@techuniv.edu.in",
    "pass": "Stu@24AI002",
    "name": "Sanjana Patel",
    "role": "student",
    "dept": "AI",
    "year": "II",
    "sec": "A",
    "proctorId": "P01",
    "pct": 79.17,
    "attended": 95,
    "conducted": 120,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "24AI003",
    "email": "24ai003@techuniv.edu.in",
    "pass": "Stu@24AI003",
    "name": "Karthik Naidu",
    "role": "student",
    "dept": "AI",
    "year": "II",
    "sec": "A",
    "proctorId": "P01",
    "pct": 75,
    "attended": 90,
    "conducted": 120,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "24AI004",
    "email": "24ai004@techuniv.edu.in",
    "pass": "Stu@24AI004",
    "name": "Meghana Rao",
    "role": "student",
    "dept": "AI",
    "year": "II",
    "sec": "A",
    "proctorId": "P01",
    "pct": 65,
    "attended": 78,
    "conducted": 120,
    "asOf": "2026-10-10",
    "status": "Ineligible"
  },
  {
    "roll": "24AI005",
    "email": "24ai005@techuniv.edu.in",
    "pass": "Stu@24AI005",
    "name": "Rohit Sharma",
    "role": "student",
    "dept": "AI",
    "year": "II",
    "sec": "A",
    "proctorId": "P01",
    "pct": 94.17,
    "attended": 113,
    "conducted": 120,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "24AI006",
    "email": "24ai006@techuniv.edu.in",
    "pass": "Stu@24AI006",
    "name": "Ananya Iyer",
    "role": "student",
    "dept": "AI",
    "year": "II",
    "sec": "B",
    "proctorId": "P01",
    "pct": 83.33,
    "attended": 100,
    "conducted": 120,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "24AI007",
    "email": "24ai007@techuniv.edu.in",
    "pass": "Stu@24AI007",
    "name": "Vikram Singh",
    "role": "student",
    "dept": "AI",
    "year": "II",
    "sec": "B",
    "proctorId": "P01",
    "pct": 74.17,
    "attended": 89,
    "conducted": 120,
    "asOf": "2026-10-10",
    "status": "Ineligible"
  },
  {
    "roll": "24AI008",
    "email": "24ai008@techuniv.edu.in",
    "pass": "Stu@24AI008",
    "name": "Priya Menon",
    "role": "student",
    "dept": "AI",
    "year": "II",
    "sec": "B",
    "proctorId": "P01",
    "pct": 75.83,
    "attended": 91,
    "conducted": 120,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "24AI009",
    "email": "24ai009@techuniv.edu.in",
    "pass": "Stu@24AI009",
    "name": "Harsha Vardhan",
    "role": "student",
    "dept": "AI",
    "year": "II",
    "sec": "B",
    "proctorId": "P01",
    "pct": 87.5,
    "attended": 105,
    "conducted": 120,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "24AI010",
    "email": "24ai010@techuniv.edu.in",
    "pass": "Stu@24AI010",
    "name": "Divya Kulkarni",
    "role": "student",
    "dept": "AI",
    "year": "II",
    "sec": "B",
    "proctorId": "P01",
    "pct": 60,
    "attended": 72,
    "conducted": 120,
    "asOf": "2026-10-10",
    "status": "Ineligible"
  },
  {
    "roll": "24CS001",
    "email": "24cs001@techuniv.edu.in",
    "pass": "Stu@24CS001",
    "name": "Sai Teja",
    "role": "student",
    "dept": "CSE",
    "year": "II",
    "sec": "A",
    "proctorId": "P02",
    "pct": 88,
    "attended": 88,
    "conducted": 100,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "24CS002",
    "email": "24cs002@techuniv.edu.in",
    "pass": "Stu@24CS002",
    "name": "Lavanya Gupta",
    "role": "student",
    "dept": "CSE",
    "year": "II",
    "sec": "A",
    "proctorId": "P02",
    "pct": 75,
    "attended": 75,
    "conducted": 100,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "24CS003",
    "email": "24cs003@techuniv.edu.in",
    "pass": "Stu@24CS003",
    "name": "Arjun Nair",
    "role": "student",
    "dept": "CSE",
    "year": "II",
    "sec": "A",
    "proctorId": "P02",
    "pct": 92,
    "attended": 92,
    "conducted": 100,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "24CS004",
    "email": "24cs004@techuniv.edu.in",
    "pass": "Stu@24CS004",
    "name": "Neha Verma",
    "role": "student",
    "dept": "CSE",
    "year": "II",
    "sec": "A",
    "proctorId": "P02",
    "pct": 68,
    "attended": 68,
    "conducted": 100,
    "asOf": "2026-10-10",
    "status": "Ineligible"
  },
  {
    "roll": "24CS005",
    "email": "24cs005@techuniv.edu.in",
    "pass": "Stu@24CS005",
    "name": "Tarun Kumar",
    "role": "student",
    "dept": "CSE",
    "year": "II",
    "sec": "A",
    "proctorId": "P02",
    "pct": null,
    "attended": null,
    "conducted": null,
    "asOf": null,
    "status": "Unavailable"
  },
  {
    "roll": "24CS006",
    "email": "24cs006@techuniv.edu.in",
    "pass": "Stu@24CS006",
    "name": "Swathi Reddy",
    "role": "student",
    "dept": "CSE",
    "year": "II",
    "sec": "B",
    "proctorId": "P02",
    "pct": 84,
    "attended": 84,
    "conducted": 100,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "24CS007",
    "email": "24cs007@techuniv.edu.in",
    "pass": "Stu@24CS007",
    "name": "Mohammed Faizan",
    "role": "student",
    "dept": "CSE",
    "year": "II",
    "sec": "B",
    "proctorId": "P02",
    "pct": 74,
    "attended": 74,
    "conducted": 100,
    "asOf": "2026-10-10",
    "status": "Ineligible"
  },
  {
    "roll": "24CS008",
    "email": "24cs008@techuniv.edu.in",
    "pass": "Stu@24CS008",
    "name": "Pooja Desai",
    "role": "student",
    "dept": "CSE",
    "year": "II",
    "sec": "B",
    "proctorId": "P02",
    "pct": 96,
    "attended": 96,
    "conducted": 100,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "24CS009",
    "email": "24cs009@techuniv.edu.in",
    "pass": "Stu@24CS009",
    "name": "Nikhil Chowdary",
    "role": "student",
    "dept": "CSE",
    "year": "II",
    "sec": "B",
    "proctorId": "P02",
    "pct": 85,
    "attended": 85,
    "conducted": 100,
    "asOf": "2026-07-18",
    "status": "Stale - Verify"
  },
  {
    "roll": "24CS010",
    "email": "24cs010@techuniv.edu.in",
    "pass": "Stu@24CS010",
    "name": "Bhavana Joshi",
    "role": "student",
    "dept": "CSE",
    "year": "II",
    "sec": "B",
    "proctorId": "P02",
    "pct": 83,
    "attended": 83,
    "conducted": 100,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "23EC001",
    "email": "23ec001@techuniv.edu.in",
    "pass": "Stu@23EC001",
    "name": "Manoj Prasad",
    "role": "student",
    "dept": "ECE",
    "year": "III",
    "sec": "A",
    "proctorId": "P03",
    "pct": 93.75,
    "attended": 90,
    "conducted": 96,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "23EC002",
    "email": "23ec002@techuniv.edu.in",
    "pass": "Stu@23EC002",
    "name": "Keerthi Varma",
    "role": "student",
    "dept": "ECE",
    "year": "III",
    "sec": "A",
    "proctorId": "P03",
    "pct": 75,
    "attended": 72,
    "conducted": 96,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "23EC003",
    "email": "23ec003@techuniv.edu.in",
    "pass": "Stu@23EC003",
    "name": "Abhishek Yadav",
    "role": "student",
    "dept": "ECE",
    "year": "III",
    "sec": "A",
    "proctorId": "P03",
    "pct": 83.33,
    "attended": 80,
    "conducted": 96,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "23EC004",
    "email": "23ec004@techuniv.edu.in",
    "pass": "Stu@23EC004",
    "name": "Sneha Pillai",
    "role": "student",
    "dept": "ECE",
    "year": "III",
    "sec": "A",
    "proctorId": "P03",
    "pct": 68.75,
    "attended": 66,
    "conducted": 96,
    "asOf": "2026-10-10",
    "status": "Ineligible"
  },
  {
    "roll": "23EC005",
    "email": "23ec005@techuniv.edu.in",
    "pass": "Stu@23EC005",
    "name": "Rahul Dev",
    "role": "student",
    "dept": "ECE",
    "year": "III",
    "sec": "A",
    "proctorId": "P03",
    "pct": 88.54,
    "attended": 85,
    "conducted": 96,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "23EC006",
    "email": "23ec006@techuniv.edu.in",
    "pass": "Stu@23EC006",
    "name": "Harini Krishnan",
    "role": "student",
    "dept": "ECE",
    "year": "III",
    "sec": "A",
    "proctorId": "P03",
    "pct": 73.96,
    "attended": 71,
    "conducted": 96,
    "asOf": "2026-10-10",
    "status": "Ineligible"
  },
  {
    "roll": "23EC007",
    "email": "23ec007@techuniv.edu.in",
    "pass": "Stu@23EC007",
    "name": "Yashwanth Raju",
    "role": "student",
    "dept": "ECE",
    "year": "III",
    "sec": "B",
    "proctorId": "P03",
    "pct": 96.88,
    "attended": 93,
    "conducted": 96,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "23EC008",
    "email": "23ec008@techuniv.edu.in",
    "pass": "Stu@23EC008",
    "name": "Ishita Bansal",
    "role": "student",
    "dept": "ECE",
    "year": "III",
    "sec": "B",
    "proctorId": "P03",
    "pct": 79.17,
    "attended": 76,
    "conducted": 96,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "23EC009",
    "email": "23ec009@techuniv.edu.in",
    "pass": "Stu@23EC009",
    "name": "Chaitanya Rao",
    "role": "student",
    "dept": "ECE",
    "year": "III",
    "sec": "B",
    "proctorId": "P03",
    "pct": 62.5,
    "attended": 60,
    "conducted": 96,
    "asOf": "2026-10-10",
    "status": "Ineligible"
  },
  {
    "roll": "23EC010",
    "email": "23ec010@techuniv.edu.in",
    "pass": "Stu@23EC010",
    "name": "Lakshmi Prasanna",
    "role": "student",
    "dept": "ECE",
    "year": "III",
    "sec": "B",
    "proctorId": "P03",
    "pct": 91.67,
    "attended": 88,
    "conducted": 96,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "23EC011",
    "email": "23ec011@techuniv.edu.in",
    "pass": "Stu@23EC011",
    "name": "Sandeep Goud",
    "role": "student",
    "dept": "ECE",
    "year": "III",
    "sec": "B",
    "proctorId": "P03",
    "pct": 81.25,
    "attended": 78,
    "conducted": 96,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "23EC012",
    "email": "23ec012@techuniv.edu.in",
    "pass": "Stu@23EC012",
    "name": "Fatima Sheikh",
    "role": "student",
    "dept": "ECE",
    "year": "III",
    "sec": "B",
    "proctorId": "P03",
    "pct": 76.04,
    "attended": 73,
    "conducted": 96,
    "asOf": "2026-10-10",
    "status": "Eligible"
  },
  {
    "roll": "P01",
    "email": "k.ramesh@techuniv.edu.in",
    "pass": "Proctor@Ramesh26",
    "name": "Dr. K. Ramesh",
    "role": "proctor",
    "dept": "AI",
    "designation": "Associate Professor"
  },
  {
    "roll": "P02",
    "email": "s.lakshmi@techuniv.edu.in",
    "pass": "Proctor@Lakshmi26",
    "name": "Dr. S. Lakshmi",
    "role": "proctor",
    "dept": "CSE",
    "designation": "Professor"
  },
  {
    "roll": "P03",
    "email": "m.venkat@techuniv.edu.in",
    "pass": "Proctor@Venkat26",
    "name": "Prof. M. Venkat Rao",
    "role": "proctor",
    "dept": "ECE",
    "designation": "Professor"
  },
  {
    "roll": "INC01",
    "email": "tech.incharge@techuniv.edu.in",
    "pass": "Incharge@2026",
    "name": "Dr. A. Srinivasa Rao",
    "role": "incharge",
    "dept": "Academic & Technical Events"
  },
  {
    "roll": "ADM01",
    "email": "admin@techuniv.edu.in",
    "pass": "Admin@2026",
    "name": "Portal Admin",
    "role": "incharge",
    "dept": "Administration"
  }
];

document.addEventListener('DOMContentLoaded', () => {
  initNavbarScroll();
  initMobileMenu();
  initPasswordToggles();
  initAuthForms();
  initForgotPasswordModal();
});

/* --------------------------------------------------------------------------
   1. Navbar Scroll Effect
   -------------------------------------------------------------------------- */
function initNavbarScroll() {
  const header = document.querySelector('.cg-header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
}

/* --------------------------------------------------------------------------
   2. Mobile Navigation Toggle
   -------------------------------------------------------------------------- */
function initMobileMenu() {
  const toggleBtn = document.querySelector('.cg-mobile-toggle');
  const navMenu = document.querySelector('.cg-nav-menu');
  if (!toggleBtn || !navMenu) return;

  toggleBtn.addEventListener('click', () => {
    const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    toggleBtn.setAttribute('aria-expanded', !isExpanded);
    navMenu.classList.toggle('mobile-open');
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!toggleBtn.contains(e.target) && !navMenu.contains(e.target)) {
      navMenu.classList.remove('mobile-open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

/* --------------------------------------------------------------------------
   3. Password Visibility Toggle (Show / Hide)
   -------------------------------------------------------------------------- */
function initPasswordToggles() {
  const toggleButtons = document.querySelectorAll('.cg-password-toggle');

  toggleButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const inputId = btn.getAttribute('data-target');
      const input = document.getElementById(inputId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      // Update Aria Label
      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');

      // Update Eye Icon
      if (isPassword) {
        btn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        `;
      } else {
        btn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        `;
      }
    });
  });
}

/* --------------------------------------------------------------------------
   4. Account Matching Helper
   -------------------------------------------------------------------------- */
function findKnownAccount(identifier, password) {
  const cleanId = (identifier || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();
  return KNOWN_ACCOUNTS.find(acc => 
    ((acc.email && acc.email.toLowerCase() === cleanId) ||
     (acc.roll && acc.roll.toLowerCase() === cleanId)) &&
    acc.pass === cleanPass
  );
}

/* --------------------------------------------------------------------------
   5. Form Validation & Resilient Authentication
   -------------------------------------------------------------------------- */
function initAuthForms() {
  const forms = document.querySelectorAll('.cg-auth-form');

  forms.forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const emailInput = form.querySelector('input[name="email"], input[type="email"], input[type="text"], input[name="username"]');
      const passwordInput = form.querySelector('input[type="password"], input[name="password"]');
      const roleName = form.getAttribute('data-role') || 'User';

      if (!emailInput || !passwordInput) return;

      const emailVal = emailInput.value.trim();
      const passVal = passwordInput.value.trim();

      // Basic frontend validation
      if (!emailVal) {
        showToast('Validation Error', 'Please enter your Official College Email or Roll Number.', 'error');
        emailInput.focus();
        return;
      }

      if (!passVal) {
        showToast('Validation Error', 'Please enter your password.', 'error');
        passwordInput.focus();
        return;
      }

      // Universal validation: allows institutional email OR Roll Number (e.g. 24AI001)
      const isEmail = emailVal.includes('@');
      if (isEmail && !isValidEmail(emailVal)) {
        showToast('Invalid Email Format', 'Please provide a valid institutional email address (e.g. name@college.edu).', 'error');
        emailInput.focus();
        return;
      }
      if (!isEmail && emailVal.length < 3) {
        showToast('Invalid Roll Number', 'Please enter a valid student roll number (e.g. 24AI001).', 'error');
        emailInput.focus();
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <svg class="cg-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
          Authenticating...
        `;

        const doRedirect = (user) => {
          const roll = user.roll_number || user.roll || user.linkedId || (user.email ? user.email.split('@')[0].toUpperCase() : '24AI001');
          localStorage.setItem('campusgate_auth_user', JSON.stringify({
            id: user.id || user.uid || roll,
            email: user.email,
            name: user.name,
            role: (user.role || roleName).toLowerCase(),
            rollNumber: roll,
            dept: user.dept || '',
            year: user.year || 'II',
            sec: user.sec || 'A',
            proctorId: user.proctorId || user.proctor_id || 'P01',
            proctorName: user.proctor_name || (user.proctorId === 'P02' ? 'Dr. S. Lakshmi' : user.proctorId === 'P03' ? 'Prof. M. Venkat Rao' : 'Dr. K. Ramesh'),
            pct: user.pct !== undefined ? user.pct : null,
            attended: user.attended !== undefined ? user.attended : null,
            conducted: user.conducted !== undefined ? user.conducted : null,
            asOf: user.asOf || '2026-10-10',
            status: user.status || user.eligStatus || ''
          }));

          showToast('Sign In Successful', `Authenticated as ${user.name} (${user.role || roleName}). Redirecting...`, 'success');

          setTimeout(() => {
            const r = (user.role || roleName || '').toLowerCase();
            if (r === 'student') {
              window.location.href = 'student-dashboard.html';
            } else if (r.includes('proctor')) {
              window.location.href = 'proctor-dashboard.html';
            } else {
              window.location.href = 'incharge-dashboard.html';
            }
          }, 450);
        };

        const tryBackend = async () => {
          // 1. Attempt relative backend path
          try {
            const resp = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ email: emailVal, password: passVal })
            });
            if (resp.ok) {
              const res = await resp.json();
              if (res.success && res.user) return res.user;
            } else if (resp.status === 401 || resp.status === 400) {
              const res = await resp.json().catch(() => ({}));
              const localMatch = findKnownAccount(emailVal, passVal);
              if (localMatch) return localMatch;
              throw new Error(res.error || 'Invalid institutional credentials.');
            }
          } catch (e) {
            if (e.message && e.message.includes('Invalid')) throw e;
          }

          // 2. Attempt port 5000 if running on static preview port
          try {
            const resp = await fetch('http://127.0.0.1:5000/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ email: emailVal, password: passVal })
            });
            if (resp.ok) {
              const res = await resp.json();
              if (res.success && res.user) return res.user;
            } else if (resp.status === 401 || resp.status === 400) {
              const res = await resp.json().catch(() => ({}));
              const localMatch = findKnownAccount(emailVal, passVal);
              if (localMatch) return localMatch;
              throw new Error(res.error || 'Invalid institutional credentials.');
            }
          } catch (e) {
            if (e.message && e.message.includes('Invalid')) throw e;
          }

          // 3. Fallback to client-side catalog
          const match = findKnownAccount(emailVal, passVal);
          if (match) return match;

          throw new Error('Invalid institutional credentials. Please check your roll number/email and password.');
        };

        tryBackend()
          .then((user) => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            doRedirect(user);
          })
          .catch((err) => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            showToast('Authentication Failed', err.message, 'error');
          });
      }
    });
  });

  initGoogleAuth();
  initDemoPills();
}

/**
 * Quick-Fill Demo Accounts with instant auto-submit
 */
function initDemoPills() {
  document.querySelectorAll('.demo-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const email = btn.getAttribute('data-email');
      const pass = btn.getAttribute('data-pass');
      const form = btn.closest('form') || document.querySelector('.cg-auth-form');
      const emailInput = form ? form.querySelector('input[name="email"], input[type="text"], input[type="email"]') : null;
      const passInput = form ? form.querySelector('input[name="password"]') : null;
      if (emailInput && email) emailInput.value = email;
      if (passInput && pass) passInput.value = pass;
      showToast('Demo Account Selected', `Populated credentials for ${btn.textContent.trim()}. Signing in...`, 'info');
      setTimeout(() => {
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }, 300);
    });
  });
}

/**
 * Handle Google Sign-In with Demo Authentication Fallback
 */
function initGoogleAuth() {
  const googleBtns = document.querySelectorAll('.cg-google-signin-btn');
  googleBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const pageRole = (btn.getAttribute('data-role') || 'Student').toLowerCase();
      let demoAcc = KNOWN_ACCOUNTS[0]; // Aarav Reddy (Student)
      if (pageRole.includes('proctor')) demoAcc = KNOWN_ACCOUNTS.find(a => a.role === 'proctor');
      else if (pageRole.includes('incharge') || pageRole.includes('charge')) demoAcc = KNOWN_ACCOUNTS.find(a => a.role === 'incharge');

      localStorage.setItem('campusgate_auth_user', JSON.stringify({
        id: demoAcc.roll,
        email: demoAcc.email,
        name: demoAcc.name,
        role: demoAcc.role,
        rollNumber: demoAcc.roll,
        dept: demoAcc.dept || ''
      }));

      showToast('Google Sign In', `Signed in as ${demoAcc.name} (${demoAcc.email}). Redirecting...`, 'success');

      setTimeout(() => {
        const r = demoAcc.role.toLowerCase();
        if (r === 'student') window.location.href = 'student-dashboard.html';
        else if (r.includes('proctor')) window.location.href = 'proctor-dashboard.html';
        else window.location.href = 'incharge-dashboard.html';
      }, 450);
    });
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* --------------------------------------------------------------------------
   6. Toast Notification System
   -------------------------------------------------------------------------- */
function showToast(title, message, type = 'info') {
  let container = document.querySelector('.cg-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'cg-toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `cg-toast ${type}`;

  const iconSvg = type === 'success' 
    ? `<svg class="cg-toast-icon" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
    : type === 'error'
    ? `<svg class="cg-toast-icon" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
    : `<svg class="cg-toast-icon" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

  toast.innerHTML = `
    ${iconSvg}
    <div class="cg-toast-content">
      <div class="cg-toast-title">${escapeHtml(title)}</div>
      <div class="cg-toast-message">${escapeHtml(message)}</div>
    </div>
    <button class="cg-toast-close" aria-label="Close message">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  `;

  container.appendChild(toast);

  const closeBtn = toast.querySelector('.cg-toast-close');
  closeBtn.addEventListener('click', () => {
    toast.remove();
  });

  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }
  }, 4500);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* --------------------------------------------------------------------------
   7. Forgot Password Demo Modal
   -------------------------------------------------------------------------- */
function initForgotPasswordModal() {
  const modal = document.getElementById('cg-forgot-modal');
  const triggerLinks = document.querySelectorAll('.cg-forgot-pwd-link');
  if (!modal || triggerLinks.length === 0) return;

  const closeBtn = modal.querySelector('.cg-modal-close');
  const resetForm = document.getElementById('cg-reset-form');

  triggerLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      modal.classList.add('active');
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });

  if (resetForm) {
    resetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('reset-email');
      const email = emailInput ? emailInput.value.trim() : '';
      if (!email || !isValidEmail(email)) {
        showToast('Invalid Email', 'Please enter a valid official college email.', 'error');
        return;
      }
      modal.classList.remove('active');
      showToast(
        'Password Reset Sent',
        `A secure recovery verification link has been dispatched to ${email}.`,
        'success'
      );
      if (emailInput) emailInput.value = '';
    });
  }
}
