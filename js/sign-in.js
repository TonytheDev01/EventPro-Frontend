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
var eyeOpen   = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var eyeClosed = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

if (toggleBtn) {
  toggleBtn.addEventListener('click', function () {
    var isPassword      = passInput.type === 'password';
    passInput.type      = isPassword ? 'text' : 'password';
    toggleBtn.innerHTML = isPassword ? eyeClosed : eyeOpen;
    toggleBtn.setAttribute('aria-label',
      isPassword ? 'Hide password' : 'Show password'
    );
  });
}

// ── Handle OAuth return from Appwrite ──────────
(function _checkOAuthReturn() {
  var params = new URLSearchParams(window.location.search);

  if (params.get('oauth') === 'failed') {
    _showError('Social login failed. Please try again or use email and password.');
    return;
  }

  if (params.get('oauth') === 'success') {
    _showBanner('Completing sign in…', 'info');

    handleAppwriteSession()
      .then(function (result) {
        if (!result.success) {
          _showError(result.message || 'Social login failed. Please try again.');
          return;
        }
        var user = getStoredUser();
        var role  = user && user.role;
        // Only show role-selection for brand new users with no role
        var knownRoles = ['admin', 'organizer', 'user'];
        if (!role || knownRoles.indexOf(role) === -1) {
          window.location.href = '../pages/role-selection.html';
        } else {
          _redirectByRole(role);
        }
      })
      .catch(function () {
        _showError('Social login failed. Please try again.');
      });
  }
})();

// ── Social login buttons ───────────────────────
var googleBtn    = document.getElementById('googleLoginBtn');
var facebookBtn  = document.getElementById('facebookLoginBtn');
var microsoftBtn = document.getElementById('microsoftLoginBtn');
var githubBtn    = document.getElementById('githubLoginBtn');

if (googleBtn)    googleBtn.addEventListener('click',    function () { loginWithGoogle();    });
if (facebookBtn)  facebookBtn.addEventListener('click',  function () { loginWithFacebook();  });
if (microsoftBtn) microsoftBtn.addEventListener('click', function () { loginWithMicrosoft(); });
if (githubBtn)    githubBtn.addEventListener('click',    function () { loginWithGithub();    });

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
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    _clearBanner();

    var isEmailValid = validateEmail(emailInput);
    var isPassValid  = validateNotEmpty(passInput, 'Password is required');

    if (!isEmailValid || !isPassValid) return;

    loginBtn.textContent = 'Signing in…';
    loginBtn.disabled    = true;

    loginUser(emailInput.value.trim(), passInput.value)
      .then(function (result) {
        if (!result.success) {
          setInputState(emailInput, 'error',
            result.message || 'Invalid email or password.');
          loginBtn.textContent = 'Login';
          loginBtn.disabled    = false;
          return;
        }

        var user = getStoredUser();
        var role = user && user.role;

        // Existing users with a known role go straight to their dashboard
        // Only brand new users with no role see role-selection
        var knownRoles = ['admin', 'organizer', 'user'];
        if (!role || knownRoles.indexOf(role) === -1) {
          window.location.href = '../pages/role-selection.html';
        } else {
          _redirectByRole(role);
        }
      })
      .catch(function () {
        _showError('Network error. Please check your connection and try again.');
        loginBtn.textContent = 'Login';
        loginBtn.disabled    = false;
      });
  });
}

// ── Role redirect ──────────────────────────────
function _redirectByRole(role) {
  if (role === 'admin') {
    window.location.href = '../pages/admin-dashboard.html';
  } else if (role === 'organizer') {
    window.location.href = '../pages/organizer-dashboard.html';
  } else {
    window.location.href = '../pages/attendees.html';
  }
}

// ── Helpers ────────────────────────────────────
function _showError(msg) {
  var banner = document.getElementById('signinError');
  if (!banner) return;
  banner.textContent = msg;
  banner.className   = 'form-banner form-banner--error';
  banner.hidden      = false;
}

function _showBanner(msg, type) {
  var banner = document.getElementById('signinError');
  if (!banner) return;
  banner.textContent = msg;
  banner.className   = 'form-banner form-banner--' + (type || 'error');
  banner.hidden      = false;
}

function _clearBanner() {
  var banner = document.getElementById('signinError');
  if (banner) banner.hidden = true;
}