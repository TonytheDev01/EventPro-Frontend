// ================================================
//  EventPro — Sign Up Page Logic
//  js/signup.js
//  Depends on: js/form-input.js
//             js/services/auth-service.js
// ================================================

const form           = document.getElementById('signupForm');
const firstNameInput = document.getElementById('firstName');
const lastNameInput  = document.getElementById('lastName');
const emailInput     = document.getElementById('email');
const passwordInput  = document.getElementById('password');
const confirmInput   = document.getElementById('confirmPassword');
const submitBtn      = document.getElementById('submitBtn');

// ── Validate on blur ──────────────────────────────
firstNameInput.addEventListener('blur', () => {
  validateMinLength(firstNameInput, 2, 'First name must be at least 2 characters');
});

lastNameInput.addEventListener('blur', () => {
  validateMinLength(lastNameInput, 2, 'Last name must be at least 2 characters');
});

emailInput.addEventListener('blur', () => {
  validateEmail(emailInput);
});

passwordInput.addEventListener('blur', () => {
  validatePassword(passwordInput);
});

confirmInput.addEventListener('blur', () => {
  validateMatch(confirmInput, passwordInput.value);
});

// ── Clear state on input ──────────────────────────
[firstNameInput, lastNameInput, emailInput,
 passwordInput, confirmInput].forEach(input => {
  input.addEventListener('input', () => {
    input.classList.remove('input-error', 'input-success');
    const container  = input.closest('.form-group');
    const helperText = container?.querySelector('.helper-text');
    if (helperText) {
      helperText.classList.remove('error-text', 'success-text');
      helperText.textContent   = '';
      helperText.style.display = 'none';
    }
  });
});

// ── Form submit ───────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Run all validations
  const isFirstNameValid = validateMinLength(firstNameInput, 2, 'First name must be at least 2 characters');
  const isLastNameValid  = validateMinLength(lastNameInput,  2, 'Last name must be at least 2 characters');
  const isEmailValid     = validateEmail(emailInput);
  const isPasswordValid  = validatePassword(passwordInput);
  const isConfirmValid   = validateMatch(confirmInput, passwordInput.value);

  if (!isFirstNameValid || !isLastNameValid ||
      !isEmailValid || !isPasswordValid || !isConfirmValid) {
    return;
  }

  // Loading state
  submitBtn.textContent = 'Creating account...';
  submitBtn.disabled    = true;

  const result = await signupUser({
    firstName: firstNameInput.value.trim(),
    lastName:  lastNameInput.value.trim(),
    email:     emailInput.value.trim(),
    password:  passwordInput.value,
  });

  if (!result.success) {
    setInputState(
      emailInput,
      'error',
      result.message || 'Signup failed. Please try again.'
    );
    submitBtn.textContent = 'Create Account';
    submitBtn.disabled    = false;
    return;
  }

  // ── FIX 1: Store token + user if backend returns them on signup ──
  // Some backends return a JWT on signup — store it so the user
  // doesn't have to log in again after verifying their email.
  if (result.data?.token) {
    localStorage.setItem('eventpro_token', result.data.token);
  }
  if (result.data?.user) {
    localStorage.setItem('eventpro_user', JSON.stringify(result.data.user));
  }

  // Store email so verify-email page can display it masked
  localStorage.setItem('eventpro_pending_email', emailInput.value.trim());

  // ── FIX 2: Check if backend already verified the user ──────────
  // If isVerified is true on signup response, skip verify-email
  // and redirect straight to the right dashboard by role.
  const user = result.data?.user;

  if (user?.isVerified) {
    const role = user.role ?? 'user';
    if (role === 'admin') {
      window.location.href = '../pages/admin-dashboard.html';
    } else if (role === 'organizer') {
      window.location.href = '../pages/organizer-dashboard.html';
    } else {
      window.location.href = '../pages/attendees.html';
    }
    return;
  }

  // Not verified yet — go to verify-email page
  window.location.href = '../pages/verify-email.html';
});