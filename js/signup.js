// ================================================
//  EventPro — Sign Up Page Logic
//  js/signup.js
//  Depends on: js/form-input.js
//             js/services/auth-service.js
//
//  Backend change (March 2026):
//  Email verification removed — on success redirect
//  to role-selection so user picks their role.
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

// ── Password visibility toggles ───────────────────────────
var togglePassword        = document.getElementById('togglePassword');
var toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

if (togglePassword) {
  togglePassword.addEventListener('click', function () {
    var isPassword       = passwordInput.type === 'password';
    passwordInput.type   = isPassword ? 'text' : 'password';
    togglePassword.setAttribute('aria-label',
      isPassword ? 'Hide password' : 'Show password'
    );
  });
}

if (toggleConfirmPassword) {
  toggleConfirmPassword.addEventListener('click', function () {
    var isPassword      = confirmInput.type === 'password';
    confirmInput.type   = isPassword ? 'text' : 'password';
    toggleConfirmPassword.setAttribute('aria-label',
      isPassword ? 'Hide password' : 'Show password'
    );
  });
}

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
form.addEventListener('submit', function (e) {
  e.preventDefault();

  _hideBanners();

  var isFirstNameValid = validateMinLength(firstNameInput, 2, 'First name must be at least 2 characters');
  var isLastNameValid  = validateMinLength(lastNameInput,  2, 'Last name must be at least 2 characters');
  var isEmailValid     = validateEmail(emailInput);
  var isPasswordValid  = validatePassword(passwordInput);
  var isConfirmValid   = validateMatch(confirmInput, passwordInput.value);

  if (!isFirstNameValid || !isLastNameValid ||
      !isEmailValid || !isPasswordValid || !isConfirmValid) {
    return;
  }

  submitBtn.textContent = 'Creating account…';
  submitBtn.disabled    = true;

  signupUser({
    firstName: firstNameInput.value.trim(),
    lastName:  lastNameInput.value.trim(),
    email:     emailInput.value.trim(),
    password:  passwordInput.value,
  })
    .then(function (result) {
      if (!result.success) {
        _showError(result.message || 'Signup failed. Please try again.');
        submitBtn.textContent = 'Create Account';
        submitBtn.disabled    = false;
        return;
      }

      // Store token + user if backend returns them
      var user  = result.data && result.data.user;
      var token = result.data && result.data.token;

      if (token) storeToken(token);
      if (user)  storeUser(user);

      // Always send new users to role selection — never skip it
      _showSuccess('Account created! Setting up your profile…');
      setTimeout(function () {
        window.location.href = '../pages/role-selection.html';
      }, 1200);
    })
    .catch(function () {
      _showError('Network error. Please check your connection and try again.');
      submitBtn.textContent = 'Create Account';
      submitBtn.disabled    = false;
    });
});

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