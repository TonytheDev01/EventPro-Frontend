/* ============================================================
   auth-reset-password.js
   Page: Reset Password (standalone auth screen)
   Requires: auth-service.js

   Flow:
   1. User lands here from forget-password.html (direct link)
      OR from sms-verification.html with ?token=... in URL
   2. Phone is read from localStorage eventpro_pending_phone
      (stored by forget-password.js before redirecting here)
   3. "Send Code" → POST /auth/resend-otp { phone }
      Triggers Twilio SMS — works on smartphones AND basic phones
   4. User enters new password + confirm + 6-digit OTP
   5. Submit → POST /auth/reset-password { newPassword, otp, token }
   6. Success → clears localStorage and redirects to sign-in.html

   Endpoints (Swagger confirmed — March 2026):
   POST /auth/resend-otp      { phone }                   ← send OTP via Twilio
   POST /auth/reset-password  { newPassword, otp, token } ← reset password
   ============================================================ */

var _RP_API = 'https://eventpro-fxfv.onrender.com/api';

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs ─────────────────────────────────────────── */
  var form          = document.getElementById('resetPasswordForm');
  var newPassInput  = document.getElementById('newPassword');
  var confirmInput  = document.getElementById('confirmPassword');
  var codeInput     = document.getElementById('verificationCode');
  var submitBtn     = document.getElementById('submitBtn');
  var sendCodeBtn   = document.getElementById('sendCodeBtn');
  var errorBanner   = document.getElementById('rpError');
  var successBanner = document.getElementById('rpSuccess');

  /* ── Read token from URL ──────────────────────────────── */
  /* Token is set by sms-verification.js after OTP verify   */
  /* Page still works without token — sent in payload if present */
  var _token = new URLSearchParams(window.location.search).get('token') || null;

  /* ── Read phone from localStorage ────────────────────── */
  /* forget-password.js stores this before redirecting here */
  var _phone = localStorage.getItem('eventpro_pending_phone') || null;

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

  /* ── Clear field errors on input ─────────────────────── */
  [newPassInput, confirmInput, codeInput].forEach(function (input) {
    input.addEventListener('input', function () {
      _clearField(input);
      _clearMessages();
    });
  });

  /* Only allow digits in OTP field */
  codeInput.addEventListener('input', function () {
    codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6);
  });

  /* ── Send Code button ─────────────────────────────────── */
  var _cooldown      = 0;
  var _cooldownTimer = null;

  sendCodeBtn.addEventListener('click', function () {
    if (_cooldown > 0) return;
    _clearMessages();

    /* Phone is required to send SMS via Twilio */
    if (!_phone) {
      _showError('Phone number not found. Please go back and request a reset link again.');
      return;
    }

    sendCodeBtn.disabled    = true;
    sendCodeBtn.textContent = 'Sending…';

    /* POST /auth/resend-otp { phone }
       Twilio sends a 6-digit SMS to the user's phone.
       Works on smartphones AND basic/feature phones — plain SMS, no app needed. */
    fetch(_RP_API + '/auth/resend-otp', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ phone: _phone }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok) {
          _showSuccess('Code sent! Check your SMS messages.');
          _startCooldown(60);
        } else {
          sendCodeBtn.disabled    = false;
          sendCodeBtn.textContent = 'Send code';
          _showError(
            (result.data && result.data.message)
            || 'Failed to send code. Please try again.'
          );
        }
      })
      .catch(function () {
        sendCodeBtn.disabled    = false;
        sendCodeBtn.textContent = 'Send code';
        _showError('Network error. Check your connection and try again.');
      });
  });

  function _startCooldown(seconds) {
    _cooldown = seconds;
    _updateSendBtn();
    clearInterval(_cooldownTimer);
    _cooldownTimer = setInterval(function () {
      _cooldown -= 1;
      _updateSendBtn();
      if (_cooldown <= 0) {
        clearInterval(_cooldownTimer);
        _cooldown               = 0;
        sendCodeBtn.disabled    = false;
        sendCodeBtn.textContent = 'Resend code';
      }
    }, 1000);
  }

  function _updateSendBtn() {
    sendCodeBtn.textContent = _cooldown > 0
      ? 'Resend (' + _cooldown + 's)'
      : 'Send code';
  }

  /* ── Form submit ──────────────────────────────────────── */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    _clearMessages();

    var newPassword = newPassInput.value.trim();
    var confirmPass = confirmInput.value.trim();
    var otp         = codeInput.value.trim();
    var valid       = true;

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
    if (!confirmPass) {
      _setFieldError('confirmPasswordErr', 'Please confirm your password.');
      _markError(confirmInput);
      valid = false;
    } else if (newPassword && newPassword !== confirmPass) {
      _setFieldError('confirmPasswordErr', 'Passwords do not match.');
      _markError(confirmInput);
      valid = false;
    }

    /* Validate OTP */
    if (!otp) {
      _setFieldError('verificationCodeErr', 'Verification code is required.');
      _markError(codeInput);
      valid = false;
    } else if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      _setFieldError('verificationCodeErr', 'Please enter the full 6-digit code.');
      _markError(codeInput);
      valid = false;
    }

    if (!valid) return;

    _setLoading(true);

    /* Build payload
       FIX: otp is now included — was completely missing in the old version
       token from URL ?token= if present, otherwise omitted */
    var payload = {
      newPassword: newPassword,
      otp:         otp,
    };
    if (_token) payload.token = _token;

    /* POST /auth/reset-password { newPassword, otp, token } */
    fetch(_RP_API + '/auth/reset-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function (result) {
        _setLoading(false);

        if (result.ok) {
          /* Clean up — remove pending phone from storage */
          localStorage.removeItem('eventpro_pending_phone');

          _showSuccess('Password reset successfully! Redirecting to sign in…');
          _disableForm();

          setTimeout(function () {
            window.location.href = '../pages/sign-in.html?reset=success';
          }, 2000);
          return;
        }

        /* Handle specific error cases from backend */
        if (result.status === 400) {
          var msg = (result.data && result.data.message) || 'Invalid or expired code.';
          if (msg.toLowerCase().indexOf('otp')     !== -1 ||
              msg.toLowerCase().indexOf('code')    !== -1 ||
              msg.toLowerCase().indexOf('invalid') !== -1) {
            _setFieldError('verificationCodeErr', msg);
            _markError(codeInput);
            codeInput.value = '';
            codeInput.focus();
          } else {
            _showError(msg);
          }
          return;
        }

        /* Expired or invalid token — send back to forgot password */
        if (result.status === 401 || result.status === 403) {
          _showError('Your reset session has expired. Please request a new reset link.');
          setTimeout(function () {
            window.location.href = '../pages/forget-password.html';
          }, 2500);
          return;
        }

        _showError(
          (result.data && result.data.message)
          || 'Reset failed. Please try again.'
        );
      })
      .catch(function () {
        _setLoading(false);
        _showError('Network error. Check your connection and try again.');
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
    errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
  }

  function _disableForm() {
    submitBtn.disabled    = true;
    newPassInput.disabled = true;
    confirmInput.disabled = true;
    codeInput.disabled    = true;
    sendCodeBtn.disabled  = true;
  }

});