// ================================================
//  EventPro — Sign In Page Logic
//  js/sign-in.js
//  Depends on: js/form-input.js
//             js/services/auth-service.js
// ================================================

const form        = document.getElementById('loginForm');
const emailInput  = document.getElementById('email');
const passInput   = document.getElementById('password');
const loginBtn    = document.getElementById('loginBtn');
const toggleBtn   = document.getElementById('togglePassword');
const eyeIcon     = document.getElementById('eye-icon');

// SVG — eye open
const eyeOpen = `
  <svg id="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="12" cy="12" r="3"
      stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

// SVG — eye closed
const eyeClosed = `
  <svg id="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
      stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
      stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="1" y1="1" x2="23" y2="23"
      stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

// ── Toggle password visibility ─────────────────
toggleBtn.addEventListener('click', () => {
  const isPassword  = passInput.type === 'password';
  passInput.type    = isPassword ? 'text' : 'password';
  toggleBtn.innerHTML = isPassword ? eyeClosed : eyeOpen;
  toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
});

// ── Validate on blur ───────────────────────────
emailInput.addEventListener('blur', () => {
  validateEmail(emailInput);
});

passInput.addEventListener('blur', () => {
  validateNotEmpty(passInput, 'Password is required');
});

// ── Clear state when user starts typing ────────
[emailInput, passInput].forEach(input => {
  input.addEventListener('input', () => {
    // Remove error/success classes and hide helper text
    input.classList.remove('input-error', 'input-success', 'state-error', 'state-success');
    const container  = input.closest('.form-group');
    const helperText = container && container.querySelector('.helper-text');
    if (helperText) {
      helperText.classList.remove('error-text', 'success-text');
      helperText.textContent  = '';
      helperText.style.display = 'none';
    }
  });
});

// ── Form submit ────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const isEmailValid = validateEmail(emailInput);
  const isPassValid  = validateNotEmpty(passInput, 'Password is required');

  if (!isEmailValid || !isPassValid) return;

  // Loading state
  loginBtn.textContent = 'Signing in...';
  loginBtn.disabled    = true;

  // Call auth service
  const result = await loginUser(
    emailInput.value.trim(),
    passInput.value
  );

  if (!result.success) {
    setInputState(emailInput, 'error', result.message || 'Invalid email or password');
    loginBtn.textContent = 'Login';
    loginBtn.disabled    = false;
    return;
  }

  // ── Redirect based on verification and role ──
  const user = getStoredUser();

  // Not verified — go to verify email
  if (!user.isVerified) {
    window.location.href = '../pages/verify-email.html';
    return;
  }

  // Verified — redirect by role
  switch (user.role) {
    case 'admin':
      window.location.href = '../pages/admin-dashboard.html';
      break;
    case 'organizer':
      window.location.href = '../pages/organizer-dashboard.html';
      break;
    default:
      // role === 'user' or any other role
      window.location.href = '../pages/dashboard.html';
  }
});