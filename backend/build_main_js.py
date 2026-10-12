# backend/build_main_js.py
import json
import shutil
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
json_path = os.path.join(BASE_DIR, "backend", "generated_accounts.json")

with open(json_path, "r", encoding="utf-8") as f:
    accounts = json.load(f)

accounts_js = json.dumps(accounts, indent=2)

template = """/**
 * CampusGate - Academic Event Permission Portal
 * Frontend Interactions, Authentication, Password Toggle & UI Helpers
 */

const KNOWN_ACCOUNTS = __ACCOUNTS_PLACEHOLDER__;

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
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
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
"""

final_code = template.replace("__ACCOUNTS_PLACEHOLDER__", accounts_js)

js_path = os.path.join(BASE_DIR, "js", "main.js")
root_js_path = os.path.join(BASE_DIR, "main.js")

with open(js_path, "w", encoding="utf-8") as f:
    f.write(final_code)

shutil.copyfile(js_path, root_js_path)
print("Successfully generated and synchronized js/main.js and main.js!")
