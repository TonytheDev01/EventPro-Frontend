/* ============================================================
   auth-reset-password.js
   Page: Reset Password (standalone auth screen)
   Requires: auth-service.js → resetPassword(token, newPassword)

   Flow:
   1. User lands on auth-reset-password.html?token=XXXXXX
   2. Page extracts token from URL
   3. User clicks Send Code → triggers SMS/email verification
   4. User enters new password + confirm + verification code
   5. Submit → resetPassword(token, newPassword)
   6. Success → redirect to sign-in.html
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs ─────────────────────────────────────────── */
  var form              = document.getElementById('resetPasswordForm');
  var newPassInput      = document.getElementById('newPassword');
  var confirmInput      = document.getElementById('confirmPassword');
  var codeInput         = document.getElementById('verificationCode');
  var submitBtn         = document.getElementById('submitBtn');
  var sendCodeBtn       = document.getElementById('sendCodeBtn');
  var errorBanner       = document.getElementById('rpError');
  var successBanner     = document.getElementById('rpSuccess');

  /* ── Extract token from URL ───────────────────────────── */
  var _token = new URLSearchParams(window.location.search).get('token');

  if (!_token) {
    _showError('Invalid or expired reset link. Please request a new one.');
    _disableForm();
    return;
  }

  /* ── Password visibility toggles ─────────────────────── */
  document.querySelectorAll('.rp-eye').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = document.getElementById(btn.dataset.target);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.setAttribute('aria-label',
        input.type === 'password' ? 'Show password' : 'Hide password'
      );
    });
  });

  /* ── Send Code button ─────────────────────────────────── */
  var _cooldown = 0;
  var _cooldownTimer = null;

  sendCodeBtn.addEventListener('click', function () {
    if (_cooldown > 0) return;

    sendCodeBtn.disabled = true;
    sendCodeBtn.textContent = 'Sending…';

    /*
     * TODO: wire to backend SMS/email verification endpoint
     * once Swagger confirms the endpoint.
     * Expected: POST /auth/send-reset-code { token }
     * For now — simulate success feedback.
     */
    setTimeout(function () {
      _showSuccess('Verification code sent! Check your email or phone.');
      _startCooldown(60);
    }, 1000);
  });

  function _startCooldown(seconds) {
    _cooldown = seconds;
    _updateSendBtn();
    _cooldownTimer = setInterval(function () {
      _cooldown -= 1;
      _updateSendBtn();
      if (_cooldown <= 0) {
        clearInterval(_cooldownTimer);
        _cooldown = 0;
        sendCodeBtn.disabled = false;
        sendCodeBtn.textContent = 'Send code';
      }
    }, 1000);
  }

  function _updateSendBtn() {
    sendCodeBtn.textContent = _cooldown > 0 ? ('Resend (' + _cooldown + 's)') : 'Send code';
  }

  /* ── Form submit ──────────────────────────────────────── */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    _clearMessages();

    var newPassword     = newPassInput.value.trim();
    var confirmPassword = confirmInput.value.trim();
    var code            = codeInput.value.trim();
    var valid           = true;

    /* Validate new password */
    if (!newPassword) {
      _setFieldError('newPasswordErr', 'Password is required.');
      _markError(newPassInput);
      valid = false;
    } else if (newPassword.length < 8) {
      _setFieldError('newPasswordErr', 'Password must be at least 8 characters.');
      _markError(newPassInput);
      valid = false;
    }

    /* Validate confirm password */
    if (!confirmPassword) {
      _setFieldError('confirmPasswordErr', 'Please confirm your password.');
      _markError(confirmInput);
      valid = false;
    } else if (newPassword && newPassword !== confirmPassword) {
      _setFieldError('confirmPasswordErr', 'Passwords do not match.');
      _markError(confirmInput);
      valid = false;
    }

    /* Validate verification code */
    if (!code) {
      _setFieldError('verificationCodeErr', 'Verification code is required.');
      _markError(codeInput);
      valid = false;
    }

    if (!valid) return;

    _setLoading(true);

    resetPassword(_token, newPassword)
      .then(function (result) {
        _setLoading(false);

        if (result.success) {
          _showSuccess('Password reset successfully! Redirecting to sign in…');
          setTimeout(function () {
            window.location.href = '../pages/sign-in.html';
          }, 2000);
          return;
        }

        var msg = result.message || 'Reset failed. The link may have expired.';
        if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
          _showError('This reset link has expired or is invalid. Please request a new one.');
        } else {
          _showError(msg);
        }
      })
      .catch(function (err) {
        _setLoading(false);
        _showError('Network error. Please check your connection and try again.');
      });
  });

  /* ── Clear field error on input ───────────────────────── */
  [newPassInput, confirmInput, codeInput].forEach(function (input) {
    input.addEventListener('input', function () {
      _clearField(input);
    });
  });

  /* ── Helpers ──────────────────────────────────────────── */
  function _setLoading(on) {
    submitBtn.disabled    = on;
    submitBtn.textContent = on ? 'Submitting…' : 'Submit';
  }

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

  function _clearMessages() {
    errorBanner.hidden   = true;
    successBanner.hidden = true;
  }

  function _setFieldError(id, msg) {
    var el = document.getElementById(id);
    if (el) el.textContent = msg;
  }

  function _markError(input) {
    input.classList.add('is-error');
  }

  function _clearField(input) {
    input.classList.remove('is-error');
    var errId = input.id + 'Err';
    var el    = document.getElementById(errId);
    if (el) el.textContent = '';
    _clearMessages();
  }

  function _disableForm() {
    submitBtn.disabled  = true;
    newPassInput.disabled = true;
    confirmInput.disabled = true;
    codeInput.disabled  = true;
    sendCodeBtn.disabled = true;
  }

});