// ============================================================
//  forgot-password.js
//  Page: Forgot Password (standalone auth screen)
//  Requires: auth-service.js → forgotPassword(email)
//
//  Flow:
//  1. User enters email address
//  2. Submit → forgotPassword(email) from auth-service.js
//  3. Success → show inline success message, stay on page
//  4. Error   → show inline error banner
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

  // ── DOM refs ───────────────────────────────────────────
  var form          = document.getElementById('forgotPasswordForm');
  var emailInput    = document.getElementById('email');
  var emailError    = document.getElementById('emailError');
  var submitBtn     = document.getElementById('submitBtn');
  var errorBanner   = document.getElementById('fpError');
  var successBanner = document.getElementById('fpSuccess');

  // ── Email validation ───────────────────────────────────
  function _isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function _showFieldError(msg) {
    emailInput.classList.add('is-error');
    emailError.textContent = msg;
  }

  function _clearFieldError() {
    emailInput.classList.remove('is-error');
    emailError.textContent = '';
  }

  function _validateForm() {
    var email = emailInput.value.trim();

    if (!email) {
      _showFieldError('Email address is required.');
      return false;
    }

    if (!_isValidEmail(email)) {
      _showFieldError('Please enter a valid email address.');
      return false;
    }

    _clearFieldError();
    return true;
  }

  // ── Banner helpers ─────────────────────────────────────
  function _showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.hidden      = false;
    successBanner.hidden    = true;
  }

  function _showSuccess(msg) {
    successBanner.textContent = msg;
    successBanner.hidden      = false;
    errorBanner.hidden        = true;
  }

  function _clearBanners() {
    errorBanner.hidden   = true;
    successBanner.hidden = true;
  }

  // ── Loading state ──────────────────────────────────────
  function _setLoading(on) {
    submitBtn.disabled    = on;
    submitBtn.textContent = on ? 'Sending…' : 'Send Reset Link';
  }

  // ── Form submit ────────────────────────────────────────
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    _clearBanners();

    if (!_validateForm()) return;

    var email = emailInput.value.trim();
    _setLoading(true);

    // Uses forgotPassword() from auth-service.js
    // auth-service handles the correct base URL — no hardcoded /api/...
    forgotPassword(email)
      .then(function (result) {
        _setLoading(false);

        if (result.success) {
          form.reset();
          _clearFieldError();
          _showSuccess(
            'Reset link sent! Check your inbox at ' + email + '.'
          );
          return;
        }

        var msg = result.message || 'Failed to send reset link. Please try again.';
        _showError(msg);
      })
      .catch(function () {
        _setLoading(false);
        _showError('Network error. Please check your connection and try again.');
      });
  });

  // ── Live validation — clear error as user types ────────
  emailInput.addEventListener('input', function () {
    if (emailInput.value.trim()) {
      _clearFieldError();
      _clearBanners();
    }
  });

});