// ================================================
//  EventPro — Sign Up Page Logic
//  js/signup.js
//  Depends on: js/form-input.js
//             js/services/auth-service.js
//
//  Backend change (March 2026):
//  Email verification removed — on success redirect
//  straight to sign-in. No verify-email step.
// ================================================

var form           = document.getElementById('signupForm');
var firstNameInput = document.getElementById('firstName');
var lastNameInput  = document.getElementById('lastName');
var emailInput     = document.getElementById('email');
var passwordInput  = document.getElementById('password');
var confirmInput   = document.getElementById('confirmPassword');
var submitBtn      = document.getElementById('submitBtn');
var formError      = document.getElementById('formError');
var formSuccess    = document.getElementById('formSuccess');

// ── Validate on blur ──────────────────────────────────────
firstNameInput.addEventListener('blur', function () {
  validateMinLength(firstNameInput, 2, 'First name must be at least 2 characters');
});

lastNameInput.addEventListener('blur', function () {
  validateMinLength(lastNameInput, 2, 'Last name must be at least 2 characters');
});

emailInput.addEventListener('blur', function () {
  validateEmail(emailInput);
});

passwordInput.addEventListener('blur', function () {
  validatePassword(passwordInput);
});

confirmInput.addEventListener('blur', function () {
  validateMatch(confirmInput, passwordInput.value);
});

// ── Clear state on input ──────────────────────────────────
[firstNameInput, lastNameInput, emailInput,
 passwordInput, confirmInput].forEach(function (input) {
  input.addEventListener('input', function () {
    input.classList.remove('input-error', 'input-success');
    var container  = input.closest('.form-group');
    var helperText = container && container.querySelector('.helper-text');
    if (helperText) {
      helperText.classList.remove('error-text', 'success-text');
      helperText.textContent   = '';
      helperText.style.display = 'none';
    }
    _hideBanners();
  });
});

// ── Form submit ───────────────────────────────────────────
form.addEventListener('submit', async function (e) {
  e.preventDefault();

  _hideBanners();

  // Run all validations
  var isFirstNameValid = validateMinLength(firstNameInput, 2, 'First name must be at least 2 characters');
  var isLastNameValid  = validateMinLength(lastNameInput,  2, 'Last name must be at least 2 characters');
  var isEmailValid     = validateEmail(emailInput);
  var isPasswordValid  = validatePassword(passwordInput);
  var isConfirmValid   = validateMatch(confirmInput, passwordInput.value);

  if (!isFirstNameValid || !isLastNameValid ||
      !isEmailValid || !isPasswordValid || !isConfirmValid) {
    return;
  }

  // Loading state
  submitBtn.textContent = 'Creating account…';
  submitBtn.disabled    = true;

  var result = await signupUser({
    firstName: firstNameInput.value.trim(),
    lastName:  lastNameInput.value.trim(),
    email:     emailInput.value.trim(),
    password:  passwordInput.value,
  });

  if (!result.success) {
    _showError(result.message || 'Signup failed. Please try again.');
    submitBtn.textContent = 'Create Account';
    submitBtn.disabled    = false;
    return;
  }

  // ── Email verification is removed (March 2026 backend update) ──
  // If backend returns token + user on signup, store them so
  // sign-in is seamless. Then redirect by role.
  // If backend does NOT return a token, redirect to sign-in instead.

  var user  = result.data && result.data.user;
  var token = result.data && result.data.token;

  if (token && user) {
    // Backend returned session — store and redirect by role
    storeToken(token);
    storeUser(user);
    _redirectByRole(user.role);
    return;
  }

  // No token returned — send to sign-in with success message
  _showSuccess('Account created! Redirecting to sign in…');
  setTimeout(function () {
    window.location.href = '../pages/sign-in.html';
  }, 1500);
});

// ── Role-based redirect ───────────────────────────────────
function _redirectByRole(role) {
  if (role === 'admin') {
    window.location.href = '../pages/admin-dashboard.html';
  } else if (role === 'organizer') {
    window.location.href = '../pages/organizer-dashboard.html';
  } else {
    window.location.href = '../pages/attendees.html';
  }
}

// ── Banner helpers ────────────────────────────────────────
function _showError(msg) {
  formError.textContent = msg;
  formError.hidden      = false;
  formSuccess.hidden    = true;
}

function _showSuccess(msg) {
  formSuccess.textContent = msg;
  formSuccess.hidden      = false;
  formError.hidden        = true;
}

function _hideBanners() {
  formError.hidden   = true;
  formSuccess.hidden = true;
}