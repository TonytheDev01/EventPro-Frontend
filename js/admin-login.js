// ================================================
//  EventPro — Admin Login
//  js/admin-login.js
//  Requires: auth-service.js
//
//  Endpoint (Swagger confirmed):
//  POST /auth/login/admin
//  Body: { email, password }
//  Response: { token, user, message }
//
//  On success → admin-dashboard.html
//  On fail    → show error banner
// ================================================

var _ADMIN_API = 'https://eventpro-fxfv.onrender.com/api';

document.addEventListener('DOMContentLoaded', function () {

  // If already logged in as admin — skip straight to dashboard
  var existingUser = getStoredUser();
  if (existingUser && existingUser.role === 'admin' && getStoredToken()) {
    window.location.href = '../pages/admin-dashboard.html';
    return;
  }

  var emailInput  = document.getElementById('email');
  var passInput   = document.getElementById('password');
  var loginBtn    = document.getElementById('adminLoginBtn');
  var toggleBtn   = document.getElementById('togglePassword');
  var errorBanner = document.getElementById('adminLoginError');

  // ── Password toggle ───────────────────────────
  if (toggleBtn && passInput) {
    toggleBtn.addEventListener('click', function () {
      var isPassword  = passInput.type === 'password';
      passInput.type  = isPassword ? 'text' : 'password';
      toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
  }

  // ── Clear error on input ──────────────────────
  if (emailInput) {
    emailInput.addEventListener('input', function () {
      errorBanner.hidden = true;
    });
  }
  if (passInput) {
    passInput.addEventListener('input', function () {
      errorBanner.hidden = true;
    });
  }

  // ── Submit on Enter ───────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') _handleSubmit();
  });

  // ── Login button ──────────────────────────────
  // Wire both form submit and button click
  var form = document.getElementById('adminLoginForm');
  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); _handleSubmit(); });
  if (loginBtn) loginBtn.addEventListener('click', _handleSubmit);

  function _handleSubmit() {
    var email    = emailInput ? emailInput.value.trim()  : '';
    var password = passInput  ? passInput.value          : '';

    // Basic validation
    if (!email) {
      _showError('Email address is required.');
      if (emailInput) emailInput.focus();
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      _showError('Please enter a valid email address.');
      if (emailInput) emailInput.focus();
      return;
    }

    if (!password) {
      _showError('Password is required.');
      if (passInput) passInput.focus();
      return;
    }

    // Set loading state
    loginBtn.disabled    = true;
    loginBtn.textContent = 'Signing in…';

    // POST /auth/login/admin
    fetch(_ADMIN_API + '/auth/login/admin', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: email, password: password }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function (result) {
        loginBtn.disabled    = false;
        loginBtn.textContent = 'Sign In as Admin';

        if (!result.ok) {
          _showError(
            result.data.message ||
            result.data.error   ||
            'Invalid email or password.'
          );
          return;
        }

        var token = result.data.token;
        var user  = result.data.user;

        if (!token || !user) {
          _showError('Unexpected response from server. Please try again.');
          return;
        }

        // Store credentials
        storeToken(token);
        storeUser(user);

        // Go straight to admin dashboard — no role selection needed
        window.location.href = '../pages/admin-dashboard.html';
      })
      .catch(function () {
        loginBtn.disabled    = false;
        loginBtn.textContent = 'Sign In as Admin';
        _showError('Network error. Please check your connection and try again.');
      });
  }

  function _showError(msg) {
    if (!errorBanner) return;
    errorBanner.textContent = msg;
    errorBanner.hidden      = false;
  }

});