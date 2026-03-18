// ============================================================
//  sms-verification.js
//  Page: SMS Verification (standalone screen)
//  Requires: auth-service.js
//
//  Flow:
//  1. User arrives here from forget-password.html
//     after requesting a reset link
//  2. Phone number is read from localStorage
//     (stored by forget-password.js before redirecting here)
//  3. User enters 6-digit OTP code
//  4. Submit → POST /auth/verify-otp (stubbed — pending Swagger)
//  5. Success → redirect to auth-reset-password.html?token=...
//  6. Resend → POST /auth/resend-otp (stubbed — pending Swagger)
//
//  TODO: Replace stubbed endpoints once Ezekiel confirms
//        OTP endpoints in Swagger docs.
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

  // ── DOM refs ───────────────────────────────────────────
  var inputs        = document.querySelectorAll('.otp-input');
  var form          = document.getElementById('verificationForm');
  var verifyBtn     = document.getElementById('verifyBtn');
  var resendBtn     = document.getElementById('resendBtn');
  var countdownEl   = document.getElementById('countdown');
  var maskedPhoneEl = document.getElementById('maskedPhone');
  var errorBanner   = document.getElementById('smsError');
  var successBanner = document.getElementById('smsSuccess');

  // ── Read phone from localStorage ──────────────────────
  // forget-password.js stores this before redirecting here
  var _userPhone = localStorage.getItem('eventpro_pending_phone');

  if (_userPhone) {
    maskedPhoneEl.textContent = _maskPhone(_userPhone);
  } else {
    maskedPhoneEl.textContent = 'Phone not available';
  }

  // ── Mask phone number ──────────────────────────────────
  function _maskPhone(phone) {
    if (!phone) return '';
    var visibleStart   = phone.slice(0, 4);
    var visibleEnd     = phone.slice(-2);
    var maskedSection  = new Array(phone.length - 5).join('*');
    return visibleStart + maskedSection + visibleEnd;
  }

  // ── OTP input — auto advance and backspace ─────────────
  inputs.forEach(function (input, index) {
    input.addEventListener('input', function (e) {
      var value = e.target.value;
      // Only allow single digit
      if (!/^\d$/.test(value)) {
        e.target.value = '';
        return;
      }
      // Move to next input
      if (index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });

    input.addEventListener('keydown', function (e) {
      // On backspace with empty input — go back
      if (e.key === 'Backspace' && !input.value && index > 0) {
        inputs[index - 1].focus();
      }
    });

    // Handle paste on first input — distribute digits
    if (index === 0) {
      input.addEventListener('paste', function (e) {
        e.preventDefault();
        var pasted = (e.clipboardData || window.clipboardData)
          .getData('text')
          .replace(/\D/g, '')
          .slice(0, 6);
        pasted.split('').forEach(function (digit, i) {
          if (inputs[i]) inputs[i].value = digit;
        });
        var lastFilled = Math.min(pasted.length, inputs.length - 1);
        inputs[lastFilled].focus();
      });
    }
  });

  // ── Get full OTP string ────────────────────────────────
  function _getOTP() {
    return Array.from(inputs).map(function (input) {
      return input.value;
    }).join('');
  }

  // ── Clear OTP inputs ───────────────────────────────────
  function _clearOTP() {
    inputs.forEach(function (input) {
      input.value = '';
    });
    inputs[0].focus();
  }

  // ── Countdown timer ────────────────────────────────────
  var _countdown = 30;
  var _timer     = null;

  function _startTimer() {
    clearInterval(_timer);
    _countdown = 30;
    _updateCountdown();

    _timer = setInterval(function () {
      _countdown -= 1;
      _updateCountdown();

      if (_countdown <= 0) {
        clearInterval(_timer);
        resendBtn.disabled = false;
      }
    }, 1000);
  }

  function _updateCountdown() {
    var secs = _countdown.toString().padStart(2, '0');
    countdownEl.textContent = '00:' + secs;
  }

  _startTimer();

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

  // ── Form submit — verify OTP ───────────────────────────
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    _clearBanners();

    var otp = _getOTP();

    if (otp.length !== 6) {
      _showError('Please enter the complete 6-digit code.');
      return;
    }

    _setLoading(true);

    /*
     * TODO: Replace with real endpoint once Ezekiel confirms in Swagger.
     * Expected: POST /auth/verify-otp { otp, phone }
     * On success: backend returns { token } for use in reset-password flow
     * Pattern already in auth-service.js — use request() directly if needed.
     */
    fetch('https://eventpro-fxfv.onrender.com/api/auth/verify-otp', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ otp: otp, phone: _userPhone }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        _setLoading(false);

        if (result.ok) {
          _showSuccess('Verified! Redirecting…');
          // Store token if returned, then go to reset password
          var token = result.data && result.data.token;
          setTimeout(function () {
            var dest = '../pages/auth-reset-password.html';
            if (token) dest += '?token=' + encodeURIComponent(token);
            window.location.href = dest;
          }, 1200);
          return;
        }

        _showError(
          result.data.message || 'Invalid code. Please try again.'
        );
        _clearOTP();
      })
      .catch(function () {
        _setLoading(false);
        _showError('Network error. Please check your connection and try again.');
      });
  });

  // ── Resend OTP ─────────────────────────────────────────
  resendBtn.addEventListener('click', function () {
    resendBtn.disabled = true;
    _clearBanners();
    _clearOTP();

    /*
     * TODO: Replace with real endpoint once confirmed in Swagger.
     * Expected: POST /auth/resend-otp { phone }
     */
    fetch('https://eventpro-fxfv.onrender.com/api/auth/resend-otp', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ phone: _userPhone }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok) {
          _showSuccess('New code sent! Check your phone.');
          _startTimer();
          return;
        }
        _showError(
          result.data.message || 'Failed to resend code. Please try again.'
        );
        resendBtn.disabled = false;
      })
      .catch(function () {
        _showError('Network error. Please check your connection and try again.');
        resendBtn.disabled = false;
      });
  });

  // ── Loading state ──────────────────────────────────────
  function _setLoading(on) {
    verifyBtn.disabled    = on;
    verifyBtn.textContent = on ? 'Verifying…' : 'Verify Code';
  }

});