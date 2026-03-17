// ================================================
//  EventPro — Sign In Page Logic
//  js/sign-in.js
//  Depends on: js/form-input.js
//             js/services/auth-service.js
// ================================================

var form       = document.getElementById('loginForm');
var emailInput = document.getElementById('email');
var passInput  = document.getElementById('password');
var loginBtn   = document.getElementById('loginBtn');
var toggleBtn  = document.getElementById('togglePassword');

// ── Password toggle ────────────────────────────
var eyeOpen = '<svg id="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var eyeClosed = '<svg id="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

if (toggleBtn) {
  toggleBtn.addEventListener('click', function () {
    var isPassword      = passInput.type === 'password';
    passInput.type      = isPassword ? 'text' : 'password';
    toggleBtn.innerHTML = isPassword ? eyeClosed : eyeOpen;
    toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
  });
}

// ── Handle OAuth return from Appwrite ──────────
// Runs on page load — if URL has ?oauth=success,
// exchange Appwrite session for EventPro JWT
(function _checkOAuthReturn() {
  var params = new URLSearchParams(window.location.search);
  if (params.get('oauth') === 'success') {
    // TODO: wire handleAppwriteSession() once Ezekiel
    // confirms the exchange endpoint + Appwrite credentials
    // handleAppwriteSession().then(function(result) {
    //   if (result.success) _redirectByRole(getStoredUser().role);
    // });
  }
  if (params.get('oauth') === 'failed') {
    _showError('Social login failed. Please try again.');
  }
})();

// ── Social login buttons ───────────────────────
// TODO: replace with loginWithGoogle() from auth-service.js
// once Ezekiel provides Appwrite project ID + endpoint
var googleBtn   = document.getElementById('googleLoginBtn');
var facebookBtn = document.getElementById('facebookLoginBtn');
var twitterBtn  = document.getElementById('twitterLoginBtn');
var appleBtn    = document.getElementById('appleLoginBtn');

if (googleBtn) {
  googleBtn.addEventListener('click', function () {
    // loginWithGoogle(); // ← uncomment when Appwrite is configured
    _showError('Google login coming soon. Please use email and password for now.');
  });
}
if (facebookBtn) {
  facebookBtn.addEventListener('click', function () {
    _showError('Facebook login coming soon. Please use email and password for now.');
  });
}
if (twitterBtn) {
  twitterBtn.addEventListener('click', function () {
    _showError('X login coming soon. Please use email and password for now.');
  });
}
if (appleBtn) {
  appleBtn.addEventListener('click', function () {
    _showError('Apple login coming soon. Please use email and password for now.');
  });
}

// ── Validate on blur ───────────────────────────
if (emailInput) {
  emailInput.addEventListener('blur', function () {
    validateEmail(emailInput);
  });
}

if (passInput) {
  passInput.addEventListener('blur', function () {
    validateNotEmpty(passInput, 'Password is required');
  });
}

// ── Clear state on input ───────────────────────
[emailInput, passInput].forEach(function (input) {
  if (!input) return;
  input.addEventListener('input', function () {
    input.classList.remove('input-error', 'input-success');
    var container  = input.closest('.form-group');
    var helperText = container && container.querySelector('.helper-text');
    if (helperText) {
      helperText.classList.remove('error-text', 'success-text');
      helperText.textContent   = '';
      helperText.style.display = 'none';
    }
    _clearBanner();
  });
});

// ── Form submit ────────────────────────────────
if (form) {
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    _clearBanner();

    var isEmailValid = validateEmail(emailInput);
    var isPassValid  = validateNotEmpty(passInput, 'Password is required');

    if (!isEmailValid || !isPassValid) return;

    loginBtn.textContent = 'Signing in…';
    loginBtn.disabled    = true;

    var result = await loginUser(
      emailInput.value.trim(),
      passInput.value
    );

    if (!result.success) {
      setInputState(emailInput, 'error',
        result.message || 'Invalid email or password.');
      loginBtn.textContent = 'Login';
      loginBtn.disabled    = false;
      return;
    }

    var user = getStoredUser();

    // Email verification removed (March 2026)
    // No verify-email redirect — go straight to dashboard by role
    _redirectByRole(user && user.role);
  });
}

// ── Helpers ────────────────────────────────────
function _redirectByRole(role) {
  if (role === 'admin') {
    window.location.href = '../pages/admin-dashboard.html';
  } else if (role === 'organizer') {
    window.location.href = '../pages/organizer-dashboard.html';
  } else {
    // role === 'user' or anything else
    window.location.href = '../pages/attendees.html';
  }
}

function _showError(msg) {
  var banner = document.getElementById('signinError');
  if (!banner) return;
  banner.textContent = msg;
  banner.hidden      = false;
}

function _clearBanner() {
  var banner = document.getElementById('signinError');
  if (banner) banner.hidden = true;
}